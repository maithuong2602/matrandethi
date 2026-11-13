import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileSignature, 
  Info, 
  ListChecks, 
  PenTool, 
  ChartBar, 
  FileOutput, 
  FileInput, 
  Layers, 
  Plus, 
  Trash2, 
  Trash,
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Wand2, 
  Image as ImageIcon, 
  BookOpenCheck, 
  AlertTriangle, 
  FileUp, 
  FileText, 
  CheckCircle2,
  CheckSquare,
  Pencil,
  Copy
} from 'lucide-react';
import { ExerciseQuestion, BankScope, UserProfile } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { parseQuestionsWithAI, parseStructuredTextQuestions, generateBulkQuestions, generateEssayRubric } from '../services/geminiService';
import { generateOfflineQuestions } from '../services/offlineQuestionGenerator';
import { 
  loadQuestionBank, 
  saveQuestionBank, 
  computeQuestionContentHash, 
  approveQuestionsToSharedBank 
} from '../services/storage/questionBankStorage';
import { getCurrentUser, canApproveExam, subscribeUserChange, SUPER_ADMIN_EMAIL } from '../services/authService';
import { CurriculumMappingReview } from '../components/CurriculumMappingReview';
import { isQuestionForHskt } from '../utils';
import { 
  getMergedCriteria, 
  addCustomCriterion, 
  updateCustomCriterion,
  deleteCustomCriterion,
  loadCustomCriteriaStore, 
  CUSTOM_CRITERIA_STORAGE_KEY 
} from '../services/criteriaService';


// Helper tự động gắn nhãn Khối & Bài cho dữ liệu cũ (legacy data) chưa có trường grade/lesson
export const autoTagQuestion = (q: ExerciseQuestion): ExerciseQuestion => {
  if (q.grade && q.lesson) return q;

  let assignedGrade = q.grade;
  let assignedLesson = q.lesson;

  // 1. Phục hồi từ liên kết chương trình nếu có sourceLessonId
  if (q.curriculum?.sourceLessonId) {
    const src = q.curriculum.sourceLessonId;
    for (const [g, lessons] of Object.entries(CURRICULUM.lessonData)) {
      const matchedLesson = lessons.find(l => l.includes(src) || src.includes(l));
      if (matchedLesson) {
        assignedGrade = assignedGrade || g;
        assignedLesson = assignedLesson || matchedLesson;
        break;
      }
    }
  }

  // 2. Nhận diện từ khóa nội dung cho Bài 1 Tin 8 (Lược sử công cụ tính toán: Pascal, Babbage, v.v.)
  const fullText = `${q.content || ''} ${q.criteria || ''} ${q.originalNumber || ''}`.toLowerCase();
  if (!assignedLesson) {
    const isGrade8Lesson1 = 
      fullText.includes('pascal') || 
      fullText.includes('babbage') || 
      fullText.includes('lovelace') || 
      fullText.includes('jacquard') || 
      fullText.includes('công cụ tính toán') || 
      fullText.includes('máy tính cơ học') || 
      fullText.includes('napier') ||
      fullText.includes('bàn tính') ||
      fullText.includes('eniac') || 
      fullText.includes('edvac') || 
      fullText.includes('univac') || 
      fullText.includes('thế hệ máy tính') ||
      fullText.includes('đèn điện tử') ||
      fullText.includes('chân không') ||
      fullText.includes('bóng bán dẫn') ||
      fullText.includes('transistor') ||
      fullText.includes('vi mạch') ||
      fullText.includes('mạch tích hợp') ||
      fullText.includes('vi xử lý') ||
      fullText.includes('microprocessor') ||
      fullText.includes('lược sử') ||
      fullText.includes('lịch sử máy tính') ||
      fullText.includes('lập trình viên đầu tiên') ||
      fullText.includes('thời kì tiền cơ học') ||
      fullText.includes('thời kì cơ học') ||
      fullText.includes('thời kì điện cơ') ||
      fullText.includes('thời kì điện tử');

    if (isGrade8Lesson1) {
      assignedGrade = assignedGrade || '8';
      assignedLesson = 'Bài 1: Lược sử công cụ tính toán';
    }
  }

  // 3. Nhận diện theo mã tiêu chí từ CURRICULUM
  if (!assignedLesson && q.criteria) {
    for (const [g, lessons] of Object.entries(CURRICULUM.criteriaData)) {
      for (const [lesName, levels] of Object.entries(lessons)) {
        for (const critList of Object.values(levels)) {
          if (critList.some(c => c.startsWith(q.criteria) || c.includes(q.criteria))) {
            assignedGrade = assignedGrade || g;
            assignedLesson = assignedLesson || lesName;
            break;
          }
        }
        if (assignedLesson) break;
      }
      if (assignedLesson) break;
    }
  }

  if (!assignedLesson && !assignedGrade) return q;

  return {
    ...q,
    grade: assignedGrade || q.grade,
    lesson: assignedLesson || q.lesson
  };
};

export const splitLegacyTrueFalseQuestions = (questions: ExerciseQuestion[]): ExerciseQuestion[] => {
  return questions.map(q => {
    if (
      q.questionType === 'true-false' &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.some(opt => ['a', 'b', 'c', 'd'].includes(opt.id?.toLowerCase() || ''))
    ) {
      const subIds = ['a', 'b', 'c', 'd'];
      const normalizedOptions = subIds.map((id, idx) => ({
        id,
        text: q.options?.[idx]?.text || '',
        isCorrect: Boolean(q.options?.[idx]?.isCorrect)
      }));
      const answerSummary = normalizedOptions.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
      return {
        ...q,
        options: normalizedOptions,
        answer: answerSummary,
        points: q.points === 1.0 ? 0.25 : (q.points || 0.25)
      };
    }
    return q;
  });
};

const QuestionManager: React.FC = () => {
  const [grade, setGrade] = useState('');
  const [lesson, setLesson] = useState('');
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  const isLoadedRef = useRef(false);
  const canAutoSaveRef = useRef(true);

  // TASK 002 & 003: Nạp ngân hàng câu hỏi bền vững từ Storage và kiểm soát cách ly an toàn
  useEffect(() => {
    const result = loadQuestionBank();
    if (result.success) {
      const taggedData = splitLegacyTrueFalseQuestions(result.data.map(autoTagQuestion));
      setQuestions(taggedData);
      canAutoSaveRef.current = true;
    } else {
      canAutoSaveRef.current = result.canAutoSave ?? false;
      if (result.error) {
        setAlertMessage(result.error);
      }
    }
    isLoadedRef.current = true;
  }, []);

  // TASK 002 & 003: Tự động lưu bền vững khi danh sách câu hỏi thay đổi (được bảo vệ chống ghi đè khi cách ly)
  useEffect(() => {
    if (!isLoadedRef.current || !canAutoSaveRef.current) return;
    const saveRes = saveQuestionBank(questions);
    if (!saveRes.success && saveRes.error) {
      setAlertMessage(saveRes.error);
    }
  }, [questions]);
  
  // Modal & UI States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<ExerciseQuestion[][]>([]);
  const [pendingAction, setPendingAction] = useState<'export_json' | null>(null); // Track action after duplicate check

  const [activeSection, setActiveSection] = useState<'mc' | 'essay'>('mc');
  const [viewMode, setViewMode] = useState<'edit' | 'review'>('edit');
  const [hsktChecked, setHsktChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hsktChecked');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('hsktChecked', JSON.stringify(hsktChecked));
  }, [hsktChecked]);

  const handleSaveManualMapping = (qId: string, reqId: string | null, status: 'verified' | 'needs_review' | 'unmapped') => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        curriculum: {
          ...(q.curriculum || {}),
          mappingStatus: status,
          mappingMethod: status === 'verified' ? 'manual' : (q.curriculum?.mappingMethod || 'none'),
          requirementId: reqId || undefined
        }
      };
    }));
  };

  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'ai' | 'syntax'>('syntax');
  const [bulkTab, setBulkTab] = useState<'text' | 'pdf'>('text');
  const [bulkPdf, setBulkPdf] = useState<{ name: string; size: string; base64: string } | null>(null);

  const syntaxDetectedQuestions = useMemo(() => {
    if (!bulkText.trim()) return [];
    return parseStructuredTextQuestions(bulkText);
  }, [bulkText]);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingRubricId, setLoadingRubricId] = useState<string | null>(null);

  // Generation Modal State
  const [genLevel, setGenLevel] = useState('NB');
  const [genCriteriaCode, setGenCriteriaCode] = useState('');
  const [genQuantity, setGenQuantity] = useState(8);
  const [genType, setGenType] = useState('multiple-choice');
  const [genPdf, setGenPdf] = useState<{ name: string; size: string; base64: string } | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [copiedPromptSuccess, setCopiedPromptSuccess] = useState(false);

  // Custom criteria store synced with Matrix & Specification tables
  const [customCriteriaStore, setCustomCriteriaStore] = useState(() => loadCustomCriteriaStore());
  const [isAddingCustomCriterion, setIsAddingCustomCriterion] = useState(false);
  const [newCriterionLevel, setNewCriterionLevel] = useState('NB');
  const [newCriterionText, setNewCriterionText] = useState('');

  // Editing existing criterion state: { level: string; originalText: string } | null
  const [editingCriterion, setEditingCriterion] = useState<{ level: string; originalText: string } | null>(null);
  const [editingCriterionText, setEditingCriterionText] = useState('');

  // Hierarchical Bank Scope & User Permission State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getCurrentUser());
  const [bankScopeFilter, setBankScopeFilter] = useState<'all' | BankScope>('all');

  useEffect(() => {
    const unsub = subscribeUserChange((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // Reload custom criteria whenever grade or lesson changes
  useEffect(() => {
    setCustomCriteriaStore(loadCustomCriteriaStore());
  }, [grade, lesson]);

  // Listen to storage events and window events for criteria synchronization across Matrix & QuestionManager
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CUSTOM_CRITERIA_STORAGE_KEY || e.key === 'matrixFileSystem') {
        setCustomCriteriaStore(loadCustomCriteriaStore());
      }
    };
    const handleLocalSync = () => {
      setCustomCriteriaStore(loadCustomCriteriaStore());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('matrix_filesystem_updated', handleLocalSync);
    window.addEventListener('criteria_updated', handleLocalSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('matrix_filesystem_updated', handleLocalSync);
      window.removeEventListener('criteria_updated', handleLocalSync);
    };
  }, []);

  // Derived state for available lessons and merged criteria (curriculum + matrix custom levels)
  const availableLessons = grade ? CURRICULUM.lessonData[grade] : [];
  const currentCriteriaData = useMemo(() => {
    if (!grade || !lesson) return null;
    return getMergedCriteria(grade, lesson, customCriteriaStore);
  }, [grade, lesson, customCriteriaStore]);

  // Lấy danh sách Tiêu chí (YCCĐ) theo mức độ; nếu bài học chỉ có YCCĐ ở mức độ khác (VD/VDC), tự động hiển thị toàn bộ YCCĐ của bài để không bị trống dropdown
  const getCriteriaOptionsForLevel = (targetLevel: string): string[] => {
    if (!currentCriteriaData) return [];
    const exactList = currentCriteriaData[targetLevel];
    if (Array.isArray(exactList) && exactList.length > 0) {
      return exactList;
    }
    const allItems: string[] = [];
    ['NB', 'TH', 'VD', 'VDC'].forEach(lvl => {
      const arr = currentCriteriaData[lvl];
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          if (!allItems.includes(item)) allItems.push(item);
        });
      }
    });
    Object.entries(currentCriteriaData).forEach(([k, arr]) => {
      if (k !== '__deleted' && Array.isArray(arr)) {
        arr.forEach(item => {
          if (!allItems.includes(item)) allItems.push(item);
        });
      }
    });
    return allItems;
  };

  const handleAddCustomCriterion = () => {
    if (!grade || !lesson) {
      setAlertMessage("Vui lòng chọn Khối và Bài học trước khi bổ sung YCCĐ.");
      return;
    }
    if (!newCriterionText.trim()) {
      setAlertMessage("Vui lòng nhập nội dung yêu cầu cần đạt.");
      return;
    }
    addCustomCriterion(grade, lesson, newCriterionLevel, newCriterionText);
    setCustomCriteriaStore(loadCustomCriteriaStore());
    setNewCriterionText('');
    setIsAddingCustomCriterion(false);
    setAlertMessage(`Đã bổ sung YCCĐ cho mức độ ${newCriterionLevel === 'NB' ? 'Nhận biết' : newCriterionLevel === 'TH' ? 'Thông hiểu' : newCriterionLevel === 'VD' ? 'Vận dụng' : 'Vận dụng cao'} và đồng bộ qua Bảng đặc tả.`);
  };

  const handleStartEditCriterion = (level: string, rawText: string) => {
    const clean = rawText.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
    setEditingCriterion({ level, originalText: rawText });
    setEditingCriterionText(clean);
  };

  const handleCancelEditCriterion = () => {
    setEditingCriterion(null);
    setEditingCriterionText('');
  };

  const handleSaveEditCriterion = () => {
    if (!editingCriterion || !grade || !lesson) return;
    const trimmed = editingCriterionText.trim();
    if (!trimmed) {
      setAlertMessage("Nội dung yêu cầu cần đạt không được để trống.");
      return;
    }

    try {
      updateCustomCriterion(
        grade,
        lesson,
        editingCriterion.level,
        editingCriterion.originalText,
        trimmed
      );
      setCustomCriteriaStore(loadCustomCriteriaStore());

      // Update hsktChecked if the old criterion was selected
      setHsktChecked(prev => {
        const updated = { ...prev };
        const oldKey = editingCriterion.originalText;
        if (updated[oldKey]) {
          delete updated[oldKey];
        }
        return updated;
      });

      setEditingCriterion(null);
      setEditingCriterionText('');
      setAlertMessage("Đã cập nhật yêu cầu cần đạt và đồng bộ qua Bảng đặc tả thành công!");
    } catch (err: any) {
      setAlertMessage(err?.message || "Lỗi khi cập nhật yêu cầu cần đạt.");
    }
  };

  const handleDeleteCriterion = (level: string, rawText: string) => {
    if (!grade || !lesson) return;
    const cleanDisplay = rawText.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa yêu cầu cần đạt này?\n"${cleanDisplay}"\nThao tác này cũng sẽ xóa và đồng bộ khỏi Bảng đặc tả.`)) {
      return;
    }

    try {
      deleteCustomCriterion(grade, lesson, level, rawText);
      setCustomCriteriaStore(loadCustomCriteriaStore());

      // Clean up hsktChecked
      setHsktChecked(prev => {
        const updated = { ...prev };
        delete updated[rawText];
        const code = rawText.split(' ')[0].trim();
        if (lesson) {
          delete updated[`${lesson}:::${rawText}`];
          delete updated[`${lesson}:::${code}`];
        }
        return updated;
      });

      if (editingCriterion?.originalText === rawText) {
        setEditingCriterion(null);
        setEditingCriterionText('');
      }

      setAlertMessage("Đã xóa yêu cầu cần đạt và đồng bộ khỏi Bảng đặc tả thành công!");
    } catch (err: any) {
      setAlertMessage(err?.message || "Lỗi khi xóa yêu cầu cần đạt.");
    }
  };

  // --- FUZZY MATCHING HELPERS ---

  // Helper: Normalize text for comparison (remove extra spaces, lowercase, remove punctuation)
  const normalizeText = (text: string) => {
      return text ? text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/[\s\r\n]+/g, ' ') : '';
  };

  // Levenshtein Distance Algorithm
  const levenshteinDistance = (s1: string, s2: string) => {
      const len1 = s1.length;
      const len2 = s2.length;
      const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

      for (let i = 0; i <= len1; i++) matrix[0][i] = i;
      for (let j = 0; j <= len2; j++) matrix[j][0] = j;

      for (let j = 1; j <= len2; j++) {
          for (let i = 1; i <= len1; i++) {
              const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
              matrix[j][i] = Math.min(
                  matrix[j][i - 1] + 1, // deletion
                  matrix[j - 1][i] + 1, // insertion
                  matrix[j - 1][i - 1] + indicator // substitution
              );
          }
      }
      return matrix[len2][len1];
  };

  // Calculate Similarity Percentage (0.0 to 1.0)
  const calculateSimilarity = (s1: string, s2: string) => {
      const norm1 = normalizeText(s1);
      const norm2 = normalizeText(s2);
      
      if (!norm1 && !norm2) return 1.0;
      if (!norm1 || !norm2) return 0.0;
      if (norm1 === norm2) return 1.0;

      const longer = norm1.length > norm2.length ? norm1 : norm2;
      const distance = levenshteinDistance(norm1, norm2);
      return (longer.length - distance) / longer.length;
  };

  // Lọc câu hỏi hiển thị theo Khối, Bài học và Phân tầng Ngân hàng (Chung / Chờ duyệt / Cá nhân)
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (grade && q.grade && q.grade !== grade) return false;
      if (lesson && q.lesson !== lesson) return false;
      if (bankScopeFilter !== 'all') {
        const qScope = q.bankScope || 'shared';
        if (qScope !== bankScopeFilter) return false;
      }
      return true;
    });
  }, [questions, grade, lesson, bankScopeFilter]);

  // Thống kê theo phân tầng Ngân hàng
  const scopeCounts = useMemo(() => {
    const base = questions.filter(q => {
      if (grade && q.grade && q.grade !== grade) return false;
      if (lesson && q.lesson !== lesson) return false;
      return true;
    });
    return {
      total: base.length,
      shared: base.filter(q => (q.bankScope || 'shared') === 'shared').length,
      pending: base.filter(q => q.bankScope === 'pending').length,
      personal: base.filter(q => q.bankScope === 'personal').length
    };
  }, [questions, grade, lesson]);

  // Stats
  const questionSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const selectedLessonMatch = lesson.match(/Bài (\d+)|(\d+\w)/);
    const selectedLessonNumber = selectedLessonMatch ? (selectedLessonMatch[1] || selectedLessonMatch[2]) : null;
    
    filteredQuestions.forEach(q => {
      const qLessonMatch = (q.lesson || '').match(/Bài (\d+)|(\d+\w)/);
      const lNum = selectedLessonNumber || (qLessonMatch ? (qLessonMatch[1] || qLessonMatch[2]) : null);
      if (q.criteria && lNum) {
        const key = `${!lesson && q.grade ? `K${q.grade}-` : ''}B${lNum}-${q.level}-${q.criteria}`;
        summary[key] = (summary[key] || 0) + 1;
      } else if (q.level) {
        const fallbackKey = `${q.grade ? `Khối ${q.grade} - ` : ''}Mức ${q.level}${q.criteria ? ` (${q.criteria})` : ''}`;
        summary[fallbackKey] = (summary[fallbackKey] || 0) + 1;
      }
    });
    return summary;
  }, [filteredQuestions, lesson]);

  // Handlers
  const handleAddQuestion = (type: 'mc' | 'essay') => {
    const userCanApprove = canApproveExam(currentUser);
    let defaultLevel = 'NB';
    let defaultCriteria = '';
    if (currentCriteriaData) {
      const firstAvailLvl = ['NB', 'TH', 'VD', 'VDC'].find(
        lvl => Array.isArray(currentCriteriaData[lvl]) && currentCriteriaData[lvl].length > 0
      );
      if (firstAvailLvl) {
        defaultLevel = firstAvailLvl;
        const firstCrit = currentCriteriaData[firstAvailLvl]?.[0] || '';
        defaultCriteria = firstCrit.split(' ')[0] || '';
      }
    }

    // Kế thừa Mức độ nhận thức, Tiêu chí (YCCĐ) và Loại câu hỏi từ câu hỏi liền trước cùng phân mục
    const lastSameCategoryQ = [...filteredQuestions].reverse().find(q => q.category === type);
    const inheritedLevel = lastSameCategoryQ?.level || defaultLevel;
    let inheritedCriteria = lastSameCategoryQ?.criteria || defaultCriteria;

    if (!inheritedCriteria && currentCriteriaData && Array.isArray(currentCriteriaData[inheritedLevel])) {
      const firstCritOfLevel = currentCriteriaData[inheritedLevel]?.[0] || '';
      inheritedCriteria = firstCritOfLevel.split(' ')[0] || '';
    }

    const inheritedQuestionType =
      type === 'essay'
        ? 'essay'
        : (lastSameCategoryQ?.questionType ||
          (lastSameCategoryQ?.mcType === 'fill-blank'
            ? 'fill-blank'
            : lastSameCategoryQ?.mcType === 'multiple-answer'
            ? 'multiple-answer'
            : lastSameCategoryQ?.mcType === 'true-false'
            ? 'true-false'
            : 'multiple-choice'));

    const inheritedMcType: ExerciseQuestion['mcType'] =
      inheritedQuestionType === 'true-false'
        ? 'true-false'
        : inheritedQuestionType === 'multiple-answer'
        ? 'multiple-answer'
        : inheritedQuestionType === 'fill-blank' || inheritedQuestionType === 'short-answer'
        ? 'fill-blank'
        : 'multiple-choice';

    const defaultOptions =
      type === 'essay' || inheritedQuestionType === 'short-answer' || inheritedQuestionType === 'fill-blank'
        ? []
        : inheritedQuestionType === 'true-false'
        ? [
            { id: 'a', text: '', isCorrect: true },
            { id: 'b', text: '', isCorrect: false },
            { id: 'c', text: '', isCorrect: true },
            { id: 'd', text: '', isCorrect: false },
          ]
        : [
            { id: 'A', text: '', isCorrect: false },
            { id: 'B', text: '', isCorrect: false },
            { id: 'C', text: '', isCorrect: false },
            { id: 'D', text: '', isCorrect: false },
          ];

    const defaultAnswer =
      inheritedQuestionType === 'true-false'
        ? 'a-Đ, b-S, c-Đ, d-S'
        : '';

    const newQuestion: ExerciseQuestion = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      category: type,
      level: inheritedLevel,
      criteria: inheritedCriteria,
      content: '',
      grade: grade || '',
      lesson: lesson || '',
      bankScope: userCanApprove ? 'shared' : 'personal',
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      version: 1,
      updatedAt: new Date().toISOString(),
      questionType: inheritedQuestionType as any,
      mcType: inheritedMcType,
      options: defaultOptions,
      answer: defaultAnswer,
      essayType: lastSameCategoryQ?.essayType || 'explanation'
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  // Gửi câu hỏi cá nhân lên chờ duyệt vào Ngân hàng dùng chung
  const handleSubmitFilteredToSharedBank = () => {
    const targetIds = new Set(
      filteredQuestions
        .filter(q => q.bankScope === 'personal')
        .map(q => q.id)
    );
    if (targetIds.size === 0) {
      setAlertMessage('Không có câu hỏi nào ở Kho cá nhân cần gửi duyệt.');
      return;
    }
    const now = new Date().toISOString();
    setQuestions(prev =>
      prev.map(q =>
        targetIds.has(q.id)
          ? { ...q, bankScope: 'pending', updatedAt: now, contentHash: computeQuestionContentHash(q) }
          : q
      )
    );
    setAlertMessage(`Đã gửi ${targetIds.size} câu hỏi lên danh sách Chờ duyệt vào Ngân hàng dùng chung.`);
  };

  // Duyệt câu hỏi vào Ngân hàng chuẩn dùng chung (chỉ Admin lethimaithuong@gmail.com hoặc GV có quyền canApprove)
  const handleApprovePendingQuestions = () => {
    const targetIds = filteredQuestions
      .filter(q => q.bankScope === 'pending' || q.bankScope === 'personal')
      .map(q => q.id);
    if (targetIds.length === 0) {
      setAlertMessage('Tất cả câu hỏi trong danh sách hiện tại đã nằm trong Ngân hàng chuẩn dùng chung.');
      return;
    }
    try {
      const res = approveQuestionsToSharedBank(
        questions,
        targetIds,
        currentUser.email || SUPER_ADMIN_EMAIL,
        canApproveExam(currentUser)
      );
      setQuestions(res.updatedQuestions);
      const dedupNote = res.deduplicatedCount > 0 ? ` (Đã tự động gộp ${res.deduplicatedCount} câu trùng lặp để chống phình dữ liệu)` : '';
      setAlertMessage(`Đã phê duyệt ${res.approvedCount} câu hỏi vào Ngân hàng chuẩn dùng chung!${dedupNote}`);
    } catch (err: any) {
      setAlertMessage(err.message || 'Không có quyền duyệt.');
    }
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof ExerciseQuestion, value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const updated: ExerciseQuestion = {
        ...q,
        [field]: value,
        grade: q.grade || grade || '',
        lesson: q.lesson || lesson || ''
      };
      if (field === 'level') {
        const levelOpts = getCriteriaOptionsForLevel(value);
        const validCodes = levelOpts.map(c => c.split(' ')[0]);
        if (validCodes.length > 0 && (!q.criteria || !validCodes.includes(q.criteria))) {
          updated.criteria = validCodes[0];
        }
      }
      return updated;
    }));
  };

  const handleUpdateOption = (qId: string, optId: string, field: 'text' | 'isCorrect', value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const newOptions = q.options?.map(opt => opt.id === optId ? { ...opt, [field]: value } : opt);
      let updatedAnswer = q.answer;
      if (field === 'isCorrect') {
        if (q.questionType === 'true-false' && newOptions && newOptions.some(o => ['a', 'b', 'c', 'd'].includes(o.id.toLowerCase()))) {
          updatedAnswer = newOptions.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
        } else {
          const correctIds = newOptions?.filter(o => o.isCorrect).map(o => o.id) || [];
          if (q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer') {
            updatedAnswer = correctIds.join(', ');
          } else if (q.questionType === 'multiple-choice' || !q.questionType) {
            updatedAnswer = correctIds[0] || '';
          }
        }
      }
      return { ...q, options: newOptions, answer: updatedAnswer };
    }));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        setAlertMessage("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        handleUpdateQuestion(id, 'image', reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
      handleUpdateQuestion(id, 'image', undefined);
  };

  const handleContentChange = (id: string, value: string) => {
    const lines = value.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length >= 2) {
        const restLines = lines.slice(1);
        const optionLines = restLines.filter(line => /^\s*\*?[A-Da-d][.)]/.test(line.trim()));
        const explicitAnsLine = restLines.find(line => /^(?:Đáp\s*án|ĐA)\s*[:=]\s*([A-Da-d,\s]+)$/i.test(line.trim()));
        const explicitLetters = explicitAnsLine
            ? explicitAnsLine.replace(/^(?:Đáp\s*án|ĐA)\s*[:=]\s*/i, '').toUpperCase().split(/[,;\s]+/).filter(Boolean)
            : [];

        if (optionLines.length >= 2) {
            const targetQ = questions.find(q => q.id === id);
            const isTFContext =
                targetQ?.questionType === 'true-false' ||
                /Tình\s*huống/i.test(value) ||
                /Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai/i.test(value) ||
                optionLines.some(l => /(?:\[\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\))/i.test(l)) ||
                optionLines.every(l => /^\s*\*?[a-d]\)/.test(l));

            const nonOptStemLines = lines
                .filter(l => !/^\s*\*?[A-Da-d][.)]/.test(l.trim()) && !/^(?:Đáp\s*án|ĐA)\s*[:=]/i.test(l.trim()) && !/^(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai/i.test(l.trim()))
                .map(l => l.replace(/^(?:Tình\s*huống\s*\d*|Câu\s*\d+|Bài\s*\d+|\d+)\s*[.):\-]?\s*/i, '').trim())
                .filter(Boolean);
            const questionText = nonOptStemLines.join(' ').trim() || lines[0];

            if (isTFContext) {
                const subIds = ['a', 'b', 'c', 'd'];
                const parsedTfOptions = subIds.map((subId, idx) => {
                    const trimmed = (optionLines[idx] || '').trim();
                    const hasStar = trimmed.startsWith('*') || /^[A-Da-d][.)]\s*\*/.test(trimmed);
                    const inlineTf = trimmed.match(/(?:\[\s*(\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(\*?Đúng|\*?Sai|Đ|S)\s*\)|[-–:]\s*(Đúng|Sai)\s*$)\s*$/i);
                    let isCorrect = hasStar;
                    if (inlineTf) {
                        const tok = (inlineTf[1] || inlineTf[2] || inlineTf[3] || '').replace('*', '').trim().toLowerCase();
                        isCorrect = tok.startsWith('đ');
                    }
                    const cleanText = trimmed
                        .replace(/^\*\s*/, '')
                        .replace(/^[A-Da-d][.)]\s*\*?\s*/, '')
                        .replace(/(?:\[\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\)|[-–:]\s*(?:Đúng|Sai)\s*$)\s*$/i, '')
                        .trim();
                    return { id: subId, text: cleanText, isCorrect };
                });
                const answerSummary = parsedTfOptions.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
                setQuestions(prev => prev.map(q => q.id === id ? {
                    ...q,
                    content: questionText,
                    options: parsedTfOptions,
                    mcType: 'true-false',
                    questionType: 'true-false',
                    answer: answerSummary
                } : q));
                return;
            }

            const parsedOptions = [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false },
            ];
            
            optionLines.forEach((line, idx) => {
                if (idx < 4) {
                    const trimmed = line.trim();
                    const hasStar = trimmed.startsWith('*') || /^[A-Da-d][.)]\s*\*/.test(trimmed);
                    const cleanText = trimmed
                        .replace(/^\*\s*/, '')
                        .replace(/^[A-Da-d][.)]\s*\*?\s*/, '')
                        .trim();
                    const optId = parsedOptions[idx].id;
                    parsedOptions[idx].text = cleanText;
                    parsedOptions[idx].isCorrect = hasStar || explicitLetters.includes(optId);
                }
            });

            const correctCount = parsedOptions.filter(o => o.isCorrect).length;
            const mcType =
                correctCount > 1
                    ? 'multiple-answer'
                    : (correctCount === 0 && targetQ?.questionType === 'multiple-answer')
                    ? 'multiple-answer'
                    : 'multiple-choice';
            const correctAnswers = parsedOptions.filter(o => o.isCorrect).map(o => o.id).join(', ');

            setQuestions(prev => prev.map(q => q.id === id ? { 
                ...q, 
                content: questionText, 
                options: parsedOptions,
                mcType,
                questionType: mcType,
                answer: correctAnswers || (parsedOptions.find(o => o.isCorrect)?.id ?? '')
            } : q));
            return;
        }
    }

    handleUpdateQuestion(id, 'content', value);
  };

  const openGenModal = (section: 'mc' | 'essay') => {
      if (!grade || !lesson) {
          setAlertMessage("Vui lòng chọn Khối và Bài học trước khi tạo câu hỏi bằng AI.");
          return;
      }
      setActiveSection(section);
      const lastSameCategoryQ = [...filteredQuestions].reverse().find(q => q.category === section);
      if (section === 'essay') {
          setGenType('essay');
      } else if (lastSameCategoryQ?.questionType && lastSameCategoryQ.questionType !== 'essay') {
          setGenType(lastSameCategoryQ.questionType);
      } else if (genType === 'essay') {
          setGenType('multiple-choice');
      }

      if (lastSameCategoryQ?.level && currentCriteriaData && Array.isArray(currentCriteriaData[lastSameCategoryQ.level]) && currentCriteriaData[lastSameCategoryQ.level].length > 0) {
          setGenLevel(lastSameCategoryQ.level);
          if (lastSameCategoryQ.criteria) {
              const matchedFullCrit = currentCriteriaData[lastSameCategoryQ.level].find(
                  (c: string) => c.split(' ')[0] === lastSameCategoryQ.criteria || c === lastSameCategoryQ.criteria
              );
              if (matchedFullCrit) {
                  setGenCriteriaCode(matchedFullCrit.split(' ')[0]);
              }
          }
      } else if (currentCriteriaData) {
          const hasCurrentLevel = Array.isArray(currentCriteriaData[genLevel]) && currentCriteriaData[genLevel].length > 0;
          if (!hasCurrentLevel) {
              const firstAvailableLevel = ['NB', 'TH', 'VD', 'VDC'].find(
                  lvl => Array.isArray(currentCriteriaData[lvl]) && currentCriteriaData[lvl].length > 0
              );
              if (firstAvailableLevel) {
                  setGenLevel(firstAvailableLevel);
              }
          }
      }
      setIsGenModalOpen(true);
  };

  const handleGenerateRubric = async (q: ExerciseQuestion) => {
      if (!q.content.trim()) {
          setAlertMessage("Vui lòng nhập nội dung câu hỏi trước.");
          return;
      }
      
      setLoadingRubricId(q.id);
      try {
          const rubric = await generateEssayRubric(q.content, q.points || 1.0);
          handleUpdateQuestion(q.id, 'answer', rubric);
      } catch (error) {
          setAlertMessage("Lỗi khi tạo hướng dẫn chấm.");
      } finally {
          setLoadingRubricId(null);
      }
  };

  // --- DUPLICATE MANAGEMENT LOGIC ---

  const findDuplicates = (currentQuestions: ExerciseQuestion[]) => {
      const duplicates: ExerciseQuestion[][] = [];
      const visited = new Set<string>();

      for (let i = 0; i < currentQuestions.length; i++) {
          if (visited.has(currentQuestions[i].id)) continue;
          
          const group = [currentQuestions[i]];
          
          for (let j = i + 1; j < currentQuestions.length; j++) {
              if (visited.has(currentQuestions[j].id)) continue;

              const similarity = calculateSimilarity(currentQuestions[i].content, currentQuestions[j].content);
              if (similarity >= 0.85) {
                  group.push(currentQuestions[j]);
                  visited.add(currentQuestions[j].id);
              }
          }

          if (group.length > 1) {
              duplicates.push(group);
              visited.add(currentQuestions[i].id);
          }
      }
      return duplicates;
  };

  const handleFixDuplicateGroup = (group: ExerciseQuestion[]) => {
      const keepId = group[0].id;
      const removeIds = group.slice(1).map(q => q.id);
      setQuestions(prev => prev.filter(q => !removeIds.includes(q.id)));
      
      setDuplicateGroups(prev => {
          const newGroups = prev.map(g => {
              if (g[0].id === group[0].id) return null;
              return g;
          }).filter(Boolean) as ExerciseQuestion[][];
          
          if (newGroups.length === 0) setIsDuplicateModalOpen(false);
          return newGroups;
      });
  };

  const handleAutoFixAllDuplicates = () => {
      const allRemoveIds = new Set<string>();
      duplicateGroups.forEach(group => {
          group.slice(1).forEach(q => allRemoveIds.add(q.id));
      });
      
      // Calculate new list
      const cleanQuestions = questions.filter(q => !allRemoveIds.has(q.id));
      setQuestions(cleanQuestions);
      
      setDuplicateGroups([]);
      setIsDuplicateModalOpen(false);
      setAlertMessage("Đã tự động xóa các câu trùng lặp, giữ lại 1 bản duy nhất cho mỗi câu.");

      // Check pending action
      if (pendingAction === 'export_json') {
          performJsonExport(cleanQuestions);
          setPendingAction(null);
      }
  };

  const handleContinueAnyway = () => {
      setIsDuplicateModalOpen(false);
      // Execute pending action with current questions (duplicates included)
      if (pendingAction === 'export_json') {
          performJsonExport(questions);
          setPendingAction(null);
      }
  };

  // --- ADDING DATA LOGIC ---

  const checkDuplicateBeforeAdd = (existingQuestions: ExerciseQuestion[], newQuestionContent: string) => {
      return existingQuestions.some(eq => calculateSimilarity(eq.content, newQuestionContent) >= 0.90);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'gen' | 'bulk') => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          setAlertMessage("Vui lòng chỉ chọn tệp định dạng PDF (.pdf).");
          return;
      }

      if (file.size > 25 * 1024 * 1024) {
          setAlertMessage("Kích thước file PDF không được vượt quá 25MB.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          const fileInfo = {
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              base64
          };
          if (target === 'gen') {
              setGenPdf(fileInfo);
          } else {
              setBulkPdf(fileInfo);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const commitRawQuestionsToBank = (rawQuestions: any[]) => {
    const userCanApprove = canApproveExam(currentUser);
    const targetScope: BankScope = (bankScopeFilter === 'shared' || bankScopeFilter === 'all') && userCanApprove ? 'shared' : 'personal';

    const newQuestions: ExerciseQuestion[] = rawQuestions.map((q: any) => {
        const isMulti = q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer';
        const isTF = q.questionType === 'true-false';
        const isShort = q.questionType === 'short-answer' || q.mcType === 'fill-blank';
        const isEssay = q.category === 'essay' || q.questionType === 'essay';

        let options: { id: string; text: string; isCorrect: boolean }[] = [];
        if (isTF) {
            const isFourSub = Array.isArray(q.options) && q.options.length >= 2 && !q.options.some((o: any) => o.id === 'Đúng' || o.id === 'Sai');
            if (isFourSub) {
                const subIds = ['a', 'b', 'c', 'd'];
                options = subIds.map((id, idx) => ({
                    id,
                    text: q.options[idx]?.text || '',
                    isCorrect: Boolean(q.options[idx]?.isCorrect)
                }));
            } else {
                const isTrue = Array.isArray(q.options) && q.options.length > 0
                    ? Boolean(q.options[0]?.isCorrect)
                    : String(q.answer || '').trim().toLowerCase().startsWith('đ');
                options = [
                    { id: 'Đúng', text: 'Đúng', isCorrect: isTrue },
                    { id: 'Sai', text: 'Sai', isCorrect: !isTrue }
                ];
            }
        } else if (!isShort && !isEssay) {
            options = Array.isArray(q.options) && q.options.length > 0 ? q.options.map((opt: any, idx: number) => ({
                id: ['A', 'B', 'C', 'D'][idx] || idx.toString(),
                text: opt.text || '',
                isCorrect: opt.isCorrect || false
            })) : [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false },
            ];
        }

        const correctAnswers = isTF && options.some(o => ['a', 'b', 'c', 'd'].includes(o.id))
            ? options.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ')
            : options.filter(o => o.isCorrect).map(o => o.id).join(', ');
        const resolvedLevel = (['NB', 'TH', 'VD', 'VDC'].includes(String(q.level || '').toUpperCase())
            ? String(q.level).toUpperCase()
            : 'NB') as 'NB' | 'TH' | 'VD' | 'VDC';

        const levelCriteriaOpts = getCriteriaOptionsForLevel(resolvedLevel);
        const defaultCriterionCode = levelCriteriaOpts.length > 0 ? levelCriteriaOpts[0].split(' ')[0] : '';
        const resolvedCriteria = q.criteria && levelCriteriaOpts.some(c => c.startsWith(q.criteria))
            ? q.criteria
            : (q.criteria || defaultCriterionCode);

        const resolvedCategory: 'mc' | 'essay' = isEssay ? 'essay' : (q.category || 'mc');

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: resolvedCategory,
            questionType: q.questionType || (isMulti ? 'multiple-answer' : (isEssay ? 'essay' : 'multiple-choice')),
            level: resolvedLevel,
            criteria: resolvedCriteria,
            content: q.content || '',
            grade: grade || '',
            lesson: lesson || '',
            mcType: isMulti ? 'multiple-answer' : (isShort ? 'fill-blank' : (q.mcType || 'multiple-choice')),
            options: options,
            answer: q.answer || correctAnswers || '',
            essayType: 'explanation',
            originalNumber: resolvedCriteria ? `${resolvedCriteria}` : undefined,
            bankScope: targetScope,
            ownerEmail: currentUser.email,
            ownerName: currentUser.name,
            version: 1,
            updatedAt: new Date().toISOString(),
            contentHash: computeQuestionContentHash({
                content: q.content || '',
                grade: grade || '',
                category: resolvedCategory,
                options
            })
        };
    });

    let skippedCount = 0;
    const uniqueQuestions = newQuestions.filter(nq => {
        const isDup = checkDuplicateBeforeAdd(filteredQuestions, nq.content);
        if (isDup) skippedCount++;
        return !isDup;
    });

    if (uniqueQuestions.length === 0 && skippedCount > 0) {
         setAlertMessage(`Cảnh báo: Tất cả ${skippedCount} câu hỏi đều trùng hoặc gần giống với dữ liệu hiện có.`);
    } else {
         setQuestions(prev => [...prev, ...uniqueQuestions]);
         const successMsg = `Đã nhập: ${uniqueQuestions.length} câu hỏi thuộc bài "${lesson}".`;
         const skipMsg = skippedCount > 0 ? ` Đã tự động bỏ qua ${skippedCount} câu trùng lặp (giống >90%).` : '';
         setAlertMessage(successMsg + skipMsg);
    }

    setIsBulkModalOpen(false);
    setBulkText('');
    setBulkPdf(null);
  };

  const handleSyntaxDirectImport = () => {
    if (!grade || !lesson) {
        setAlertMessage("Vui lòng chọn Khối và Bài học trước khi nhập câu hỏi.");
        return;
    }
    if (syntaxDetectedQuestions.length === 0) {
        setAlertMessage("Chưa nhận diện được câu hỏi nào theo cú pháp chuẩn. Vui lòng kiểm tra lại định dạng hoặc chuyển sang Chức năng 1 (Dùng AI phân tích).");
        return;
    }
    commitRawQuestionsToBank(syntaxDetectedQuestions);
  };

  const handleAIImport = async () => {
    if (bulkTab === 'text' && !bulkText.trim()) {
        setAlertMessage("Vui lòng nhập nội dung để phân tích.");
        return;
    }
    if (bulkTab === 'pdf' && !bulkPdf) {
        setAlertMessage("Vui lòng tải lên file PDF đề thi / bài tập để phân tích.");
        return;
    }
    
    if (!grade || !lesson) {
        setAlertMessage("Vui lòng chọn Khối và Bài học trước khi phân tích AI để đảm bảo lọc đúng nội dung bài.");
        return;
    }
    
    setIsAnalyzing(true);
    try {
        const aiQuestions = await parseQuestionsWithAI(
            bulkTab === 'text' ? bulkText : '', 
            grade, 
            lesson, 
            bulkTab === 'pdf' ? bulkPdf?.base64 : undefined
        );
        
        if (aiQuestions.length === 0) {
            setAlertMessage("Không tìm thấy câu hỏi phù hợp với bài học đã chọn hoặc file PDF không có câu hỏi hợp lệ.");
            return;
        }

        commitRawQuestionsToBank(aiQuestions);
    } catch (error) {
        setAlertMessage("Đã xảy ra lỗi khi phân tích AI. Vui lòng thử lại.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const buildExternalAIPrompt = () => {
      const levelNames: Record<string, string> = {
          NB: 'Nhận biết [NB]',
          TH: 'Thông hiểu [TH]',
          VD: 'Vận dụng [VD]',
          VDC: 'Vận dụng cao [VDC]',
          ALL: 'Phân bổ đều các mức độ Nhận biết [NB], Thông hiểu [TH], Vận dụng [VD]'
      };
      const typeNames: Record<string, string> = {
          'multiple-choice': 'Trắc nghiệm nhiều lựa chọn (4 phương án A, B, C, D - chỉ 1 phương án đúng)',
          'multiple-answer': 'Trắc nghiệm nhiều đáp án (4 phương án A, B, C, D - có từ 2 phương án đúng trở lên)',
          'true-false': 'Trắc nghiệm Đúng / Sai theo Tình huống (Mỗi câu gồm 1 Tình huống cụ thể và 4 phát biểu a, b, c, d)',
          'short-answer': 'Trắc nghiệm Trả lời ngắn',
          'fill-blank': 'Trắc nghiệm Điền khuyết / Trả lời ngắn',
          'essay': 'Tự luận (kèm Hướng dẫn chấm chi tiết)'
      };

      const targetLevels = genLevel === 'ALL' ? ['NB', 'TH', 'VD', 'VDC'] : [genLevel];
      let criteriaBlock = '';
      if (genCriteriaCode) {
          const list = getCriteriaOptionsForLevel(genLevel === 'ALL' ? 'NB' : genLevel);
          const found = list.find(c => c.startsWith(genCriteriaCode)) || genCriteriaCode;
          criteriaBlock = `- Tiêu chí (Yêu cầu cần đạt) trọng tâm cần bám sát: [${genLevel === 'ALL' ? 'NB' : genLevel} - ${genCriteriaCode}] ${found}`;
      } else {
          const lines: string[] = [];
          targetLevels.forEach(lvl => {
              const opts = getCriteriaOptionsForLevel(lvl);
              opts.forEach(c => {
                  const code = c.split(' ')[0];
                  lines.push(`  + [${lvl} - ${code}] ${c}`);
              });
          });
          if (lines.length > 0) {
              criteriaBlock = `- Danh sách Yêu cầu cần đạt (Tiêu chí) của bài học (hãy gắn đúng mã này vào đầu mỗi câu hỏi):\n${lines.join('\n')}`;
          }
      }

      let formatExample = '';
      const tagSample = genCriteriaCode
          ? `[${genLevel === 'ALL' ? 'NB' : genLevel} - ${genCriteriaCode}]`
          : `[${genLevel === 'ALL' ? 'NB' : genLevel} - 1.1]`;

      if (genType === 'true-false') {
          formatExample = `Tình huống 1: ${tagSample} [Mô tả tình huống cụ thể khai thác trực tiếp từ tài liệu nguồn đính kèm, đủ thông tin để học sinh phân tích.]
Câu 1. Xác định tính đúng hoặc sai của các phát biểu sau:
a) [Phát biểu thứ nhất bám sát tình huống và nguồn tài liệu] [Đúng]
b) [Phát biểu thứ hai bám sát tình huống và nguồn tài liệu] [Sai]
c) [Phát biểu thứ ba bám sát tình huống và nguồn tài liệu] [Đúng]
d) [Phát biểu thứ tư bám sát tình huống và nguồn tài liệu] [Sai]`;
      } else if (genType === 'short-answer' || genType === 'fill-blank') {
          formatExample = `Câu 1: ${tagSample} [Nội dung câu hỏi trả lời ngắn / điền khuyết bám sát nguồn tài liệu?]\nĐáp án: [Nội dung đáp án ngắn gọn]`;
      } else if (genType === 'essay') {
          formatExample = `Câu 1: [TL]${tagSample} [Nội dung câu hỏi tự luận bám sát nguồn tài liệu?]\nHướng dẫn chấm: [Nội dung đáp án và biểu điểm tóm tắt]`;
      } else {
          formatExample = `Câu 1: ${tagSample} [Nội dung câu hỏi trắc nghiệm bám sát nguồn tài liệu?]\nA. [Phương án nhiễu 1.]\n*B. [Phương án đúng (có dấu * ngay trước chữ cái đầu dòng).]\nC. [Phương án nhiễu 2.]\nD. [Phương án nhiễu 3.]`;
      }

      return `Hãy đóng vai chuyên gia biên soạn đề kiểm tra môn Tin học theo Công văn 7991/BGDĐT (Chương trình GDPT 2018).
Dựa sát 100% vào nội dung nguồn tài liệu/file đính kèm${genPdf ? ` ("${genPdf.name}")` : ''} của bài học "${lesson || 'Tin học'}" (Khối ${grade || 'THCS'}), hãy tạo đúng ${genQuantity} câu hỏi với thông số sau:
- Số lượng: ${genQuantity} câu hỏi
- Mức độ nhận thức: ${levelNames[genLevel] || genLevel}
- Dạng câu hỏi: ${typeNames[genType] || genType}
${criteriaBlock}

YÊU CẦU CỐT LÕI VỀ NỘI DUNG TÌNH HUỐNG & CÂU HỎI:
- Toàn bộ nội dung Tình huống và các phát biểu/lựa chọn BẮT BUỘC phải trích xuất, khai thác trực tiếp từ kiến thức, dữ kiện, ví dụ thực tế có trong TÀI LIỆU NGUỒN ĐÍNH KÈM và Yêu cầu cần đạt của bài học.
- Mỗi Tình huống phải là một bối cảnh cụ thể, riêng biệt gắn với nội dung tài liệu nguồn để học sinh phân tích. Tuyệt đối KHÔNG lấy kiến thức ngoài phạm vi bài học và KHÔNG lặp lại mô-típ giữa các tình huống.

QUY TẮC ĐỊNH DẠNG ĐẦU RA BẮT BUỘC ĐỂ PHẦN MỀM "NHẬP HÀNG LOẠT (AI SCAN)" TỰ ĐỘNG NHẬN DIỆN 100%:
1. Tuyệt đối KHÔNG xuất dạng bảng (Table), KHÔNG dùng dấu in đậm/in nghiêng Markdown (** hoặc * quanh chữ). Chỉ xuất văn bản thuần.
2. Đầu mỗi câu hỏi (hoặc ngay sau chữ "Tình huống X:") BẮT BUỘC gắn nhãn mức độ nhận thức và mã tiêu chí trong ngoặc vuông, ví dụ: [NB - 1.1], [TH - 2.1], [VD - 3.1].
3. Cách trình bày và đánh dấu đáp án đúng:
   - Nếu là Trắc nghiệm 4 lựa chọn: Đặt dấu sao (*) ngay trước chữ cái của phương án đúng (ví dụ: *A. hoặc *B. hoặc *C. hoặc *D.).
   - Nếu là Trắc nghiệm Đúng/Sai: Trình bày đúng cấu trúc gồm "Tình huống X: [Mức độ - Mã tiêu chí] <Mô tả tình huống cụ thể từ tài liệu nguồn>", dòng tiếp theo "Câu X. Xác định tính đúng hoặc sai của các phát biểu sau:", tiếp theo là 4 ý a), b), c), d) và ghi [Đúng] hoặc [Sai] ở cuối mỗi phát biểu a, b, c, d.
   - Nếu là Trả lời ngắn / Điền khuyết: Xuống dòng ghi "Đáp án: <câu trả lời>".
   - Nếu là Tự luận: Đầu câu có nhãn [TL], xuống dòng ghi "Hướng dẫn chấm: <nội dung đáp án>".

KHUNG CÚ PHÁP TRÌNH BÀY MẪU (CHỈ MINH HỌA CẤU TRÚC, HÃY THAY THẾ PHẦN TRONG NGOẶC VUÔNG BẰNG NỘI DUNG TỪ TÀI LIỆU NGUỒN):

${formatExample}`;
  };

  const handleCopyExternalPrompt = (openBulkAfterCopy = false) => {
      const promptText = buildExternalAIPrompt();
      navigator.clipboard.writeText(promptText);
      setCopiedPromptSuccess(true);
      setTimeout(() => setCopiedPromptSuccess(false), 3000);
      if (openBulkAfterCopy) {
          setIsGenModalOpen(false);
          setBulkMode('syntax');
          setBulkTab('text');
          setIsBulkModalOpen(true);
          setAlertMessage("Đã sao chép Prompt chuẩn vào bộ nhớ tạm! Hãy dán (Ctrl+V) vào ChatGPT/Gemini kèm file đính kèm, sau đó dán kết quả AI trả về vào Chức năng 2 để tự động nhận hàng loạt.");
      } else {
          setAlertMessage("Đã sao chép Prompt! Bạn hãy dán (Ctrl+V) vào ChatGPT/Gemini kèm file đính kèm, rồi copy kết quả đưa vào 'Nhập hàng loạt -> Chức năng 2: Dán theo cú pháp chuẩn'.");
      }
  };

  const handleGenerateQuestion = async () => {
      if (!grade || !lesson) {
          setAlertMessage("Vui lòng chọn Khối và Bài học trước.");
          return;
      }
      
      const effectiveLevel = genLevel === 'ALL' ? 'NB' : genLevel;
      let criteriaText = lesson;
      if (currentCriteriaData && genCriteriaCode) {
          const list = getCriteriaOptionsForLevel(effectiveLevel);
          const found = list?.find(c => c.startsWith(genCriteriaCode));
          if (found) criteriaText = found;
      }

      setIsGenerating(true);
      try {
          const results = await generateBulkQuestions(
              grade, 
              lesson, 
              effectiveLevel, 
              criteriaText, 
              genQuantity, 
              genType,
              genPdf?.base64
          );
          
          if (results && results.length > 0) {
              const newQuestions: ExerciseQuestion[] = results.map((q: any) => {
                  const category = (q.category === 'essay' || genType === 'essay') ? 'essay' : 'mc';
                  let mcType: any = 'multiple-choice';
                  if (genType === 'fill-blank') mcType = 'fill-blank';
                  else if (genType === 'multiple-answer') mcType = 'multiple-answer';
                  else if (genType === 'true-false') mcType = 'true-false';
                  
                  let options = q.options;
                  if (genType === 'true-false') {
                      const subIds = ['a', 'b', 'c', 'd'];
                      if (Array.isArray(options) && options.length >= 2 && !options.some((o: any) => o.id === 'Đúng' || o.id === 'Sai')) {
                          options = subIds.map((id, idx) => ({
                              id,
                              text: options[idx]?.text || '',
                              isCorrect: Boolean(options[idx]?.isCorrect)
                          }));
                      } else {
                          options = subIds.map((id, idx) => ({
                              id,
                              text: `Phát biểu ${id}`,
                              isCorrect: idx % 2 === 0
                          }));
                      }
                  } else if (category === 'mc' && (!options || options.length === 0)) {
                       options = [
                        { id: 'A', text: '', isCorrect: false },
                        { id: 'B', text: '', isCorrect: false },
                        { id: 'C', text: '', isCorrect: false },
                        { id: 'D', text: '', isCorrect: false },
                      ];
                  } else if (category === 'mc' && options.length > 0) {
                      options = options.map((o: any, idx: number) => ({
                          ...o,
                          id: ['A','B','C','D'][idx] || o.id
                      }));
                  }

                  const correctAnswers = genType === 'true-false'
                      ? options.map((o: any) => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ')
                      : options?.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ');

                  const defaultCrit = getCriteriaOptionsForLevel(effectiveLevel)[0]?.split(' ')[0] || '';
                  const userCanApprove = canApproveExam(currentUser);
                  const targetScope: BankScope = (bankScopeFilter === 'shared' || bankScopeFilter === 'all') && userCanApprove ? 'shared' : 'personal';
                  return {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    category: category,
                    level: effectiveLevel as any,
                    criteria: genCriteriaCode || defaultCrit,
                    content: q.content || 'Câu hỏi tự động',
                    grade: grade || '',
                    lesson: lesson || '',
                    questionType: genType === 'essay' ? 'essay' : genType as any,
                    mcType: mcType,
                    options: options,
                    answer: correctAnswers || q.answer || '',
                    essayType: 'explanation',
                    points: (genType === 'essay' || genType === 'true-false') ? 1.0 : 0.25,
                    bankScope: targetScope,
                    ownerEmail: currentUser.email,
                    ownerName: currentUser.name,
                    version: 1,
                    updatedAt: new Date().toISOString(),
                    contentHash: computeQuestionContentHash({
                        content: q.content || 'Câu hỏi tự động',
                        grade: grade || '',
                        category,
                        options
                    })
                  };
              });

              let skippedCount = 0;
              const uniqueQuestions = newQuestions.filter(nq => {
                  const isDup = checkDuplicateBeforeAdd(filteredQuestions, nq.content);
                  if (isDup) skippedCount++;
                  return !isDup;
              });

              if (uniqueQuestions.length === 0 && skippedCount > 0) {
                  setAlertMessage(`AI đã tạo ${skippedCount} câu hỏi nhưng tất cả đều trùng hoặc gần giống (>90%) với câu hỏi hiện có.`);
              } else {
                  setQuestions(prev => [...prev, ...uniqueQuestions]);
                  const msg = `Đã tạo: ${uniqueQuestions.length} câu hỏi.`;
                  const skipMsg = skippedCount > 0 ? ` (Bỏ qua ${skippedCount} câu trùng).` : '';
                  setAlertMessage(msg + skipMsg);
                  setIsGenModalOpen(false);
              }
          } else {
              const fallbackResults = generateOfflineQuestions(grade || '7', lesson || 'Tin học', effectiveLevel, criteriaText, genQuantity, genType);
              setQuestions(prev => [...prev, ...fallbackResults]);
              setAlertMessage(`Đã tạo thành công ${fallbackResults.length} câu hỏi chuẩn xác (Kích hoạt Bộ sinh Dự phòng GDPT 2018).`);
              setIsGenModalOpen(false);
          }
      } catch (error) {
          try {
              const fallbackResults = generateOfflineQuestions(grade || '7', lesson || 'Tin học', effectiveLevel, criteriaText, genQuantity, genType);
              setQuestions(prev => [...prev, ...fallbackResults]);
              setAlertMessage(`Đã tạo thành công ${fallbackResults.length} câu hỏi chuẩn xác (Kích hoạt Bộ sinh Dự phòng GDPT 2018).`);
              setIsGenModalOpen(false);
          } catch (e) {
              setAlertMessage("Lỗi xử lý câu hỏi: " + (error as Error).message);
          }
      } finally {
          setIsGenerating(false);
      }
  };

  // --- EXPORT LOGIC ---

  const performJsonExport = (questionsToExport: ExerciseQuestion[]) => {
     const formattedQuestions = questionsToExport.map(q => {
         let finalAnswer = q.answer;
         if (q.category === 'mc' && q.mcType !== 'fill-blank' && !finalAnswer) {
             const correctOption = q.options?.find(o => o.isCorrect);
             if (correctOption) finalAnswer = correctOption.id;
         }

         return {
             ...q,
             answer: finalAnswer,
             image: q.image, 
             options: q.options?.map(o => ({
                 id: o.id, 
                 isCorrect: o.isCorrect,
                 text: o.text
             }))
         };
     });

     const data = {
         info: { grade, lesson },
         questions: formattedQuestions
     };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     
     let fileName = 'bai_tap.json';
     if (grade && lesson) {
         const lessonMatch = lesson.match(/(?:Bài|Lesson)\s*(\d+)/i);
         const lessonNum = lessonMatch ? lessonMatch[1] : '';
         fileName = `L${grade}B${lessonNum}.json`;
     }

     const a = document.createElement('a');
     a.href = url;
     a.download = fileName;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     setAlertMessage("Đã xuất file JSON thành công.");
  };

  const handleJsonExportClick = () => {
     if (filteredQuestions.length === 0) {
         setAlertMessage("Không có câu hỏi nào để xuất file JSON.");
         return;
     }

     // 1. Validate Criteria (Existing logic)
     const questionsMissingCriteria = filteredQuestions.filter(q => !q.criteria);
     if (questionsMissingCriteria.length > 0) {
         const confirmExport = window.confirm(
             `Cảnh báo: Có ${questionsMissingCriteria.length} câu hỏi chưa được gán "Tiêu chí".\n\n` +
             `Dữ liệu thiếu tiêu chí sẽ không thể sử dụng để xây dựng ma trận đề thi chính xác sau này.\n\n` +
             `Bạn có chắc chắn muốn tiếp tục xuất file không?`
         );
         if (!confirmExport) return;
     }

     // 2. Check Duplicates (Fuzzy Match) - NEW LOGIC
     const duplicates = findDuplicates(filteredQuestions);
     if (duplicates.length > 0) {
         setDuplicateGroups(duplicates);
         setPendingAction('export_json'); // Set intent
         setIsDuplicateModalOpen(true);
     } else {
         performJsonExport(filteredQuestions);
     }
  };

  const handleExportFullQuestionBank = () => {
      if (questions.length === 0) {
          setAlertMessage("Ngân hàng câu hỏi hiện đang trống.");
          return;
      }
      const data = {
          schemaVersion: 2,
          updatedAt: new Date().toISOString(),
          questions
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NganHangCauHoi_DayDu_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAlertMessage(`Đã sao lưu toàn bộ ${questions.length} câu hỏi ra file JSON.`);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (data.info) {
                  if (!grade && data.info.grade) setGrade(data.info.grade);
                  if (!lesson && data.info.lesson) setLesson(data.info.lesson);
              }
              const rawQuestions = Array.isArray(data.questions)
                  ? data.questions
                  : (Array.isArray(data?.data?.questions) ? data.data.questions : null);
              if (rawQuestions) {
                  const incomingQuestions = rawQuestions as ExerciseQuestion[];
                  
                  const newUnique: ExerciseQuestion[] = [];
                  const newDuplicate: ExerciseQuestion[] = [];

                  incomingQuestions.forEach(newQ => {
                      if (checkDuplicateBeforeAdd(filteredQuestions, newQ.content)) {
                          newDuplicate.push(newQ);
                      } else {
                          newUnique.push(newQ);
                      }
                  });

                  let finalToAdd = [...newUnique];
                  let skippedCount = 0;

                  if (newDuplicate.length > 0) {
                      const userWantsDuplicates = window.confirm(
                          `Phát hiện ${newDuplicate.length} câu hỏi trùng lặp hoặc gần giống với dữ liệu hiện có trong file nhập.\n\n` +
                          `• Nhấn OK để NHẬP TẤT CẢ (bao gồm cả câu trùng).\n` +
                          `• Nhấn Cancel để CHỈ NHẬP CÂU MỚI (bỏ qua câu trùng).`
                      );

                      if (userWantsDuplicates) {
                          finalToAdd = [...finalToAdd, ...newDuplicate];
                      } else {
                          skippedCount = newDuplicate.length;
                      }
                  }

                  if (finalToAdd.length > 0) {
                      const targetGrade = data.info?.grade || grade || '';
                      const targetLesson = data.info?.lesson || lesson || '';
                      const processedQuestions = finalToAdd.map(q => ({
                          ...q,
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                          grade: q.grade || targetGrade,
                          lesson: q.lesson || targetLesson,
                          options: q.options?.map((o, idx) => ({
                              ...o,
                              id: o.id || ['A','B','C','D'][idx]
                          }))
                      }));
                      
                      setQuestions(prev => [...prev, ...processedQuestions]);
                      setAlertMessage(`Đã thêm: ${processedQuestions.length} câu hỏi. (Bỏ qua: ${skippedCount})`);
                  } else {
                      setAlertMessage(`Không có câu hỏi mới nào được thêm. (Trùng lặp: ${skippedCount})`);
                  }
              }
          } catch (err) {
              setAlertMessage("Lỗi đọc file JSON.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // TASK: Xóa danh sách câu hỏi theo phần hoặc xóa tất cả (theo bài hiện tại)
  const handleClearMcQuestions = () => {
    const mcQuestions = filteredQuestions.filter(q => q.category === 'mc');
    const mcCount = mcQuestions.length;
    if (mcCount === 0) return;
    const lessonLabel = lesson ? `của "${lesson}"` : '';
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${mcCount} câu hỏi trắc nghiệm ${lessonLabel}?`);
    if (confirmed) {
      const idsToRemove = new Set(mcQuestions.map(q => q.id));
      setQuestions(prev => prev.filter(q => !idsToRemove.has(q.id)));
      setAlertMessage(`Đã xóa ${mcCount} câu hỏi trắc nghiệm.`);
    }
  };

  const handleClearEssayQuestions = () => {
    const essayQuestions = filteredQuestions.filter(q => q.category === 'essay');
    const essayCount = essayQuestions.length;
    if (essayCount === 0) return;
    const lessonLabel = lesson ? `của "${lesson}"` : '';
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${essayCount} câu hỏi tự luận ${lessonLabel}?`);
    if (confirmed) {
      const idsToRemove = new Set(essayQuestions.map(q => q.id));
      setQuestions(prev => prev.filter(q => !idsToRemove.has(q.id)));
      setAlertMessage(`Đã xóa ${essayCount} câu hỏi tự luận.`);
    }
  };

  const handleClearAllQuestions = () => {
    const count = filteredQuestions.length;
    if (count === 0) {
      setAlertMessage("Không có câu hỏi nào để xóa.");
      return;
    }
    const targetLabel = lesson ? `thuộc bài "${lesson}"` : 'hiện có';
    const confirmed = window.confirm(
      `XÁC NHẬN XÓA CÂU HỎI:\n\n` +
      `Bạn có chắc chắn muốn xóa TOÀN BỘ ${count} câu hỏi ${targetLabel} không?\n\n` +
      `Thao tác này sẽ xóa sạch danh sách câu hỏi của bài này để bạn có thể soạn mới từ đầu.`
    );
    if (confirmed) {
      const idsToRemove = new Set(filteredQuestions.map(q => q.id));
      setQuestions(prev => prev.filter(q => !idsToRemove.has(q.id)));
      setAlertMessage(`Đã xóa sạch ${count} câu hỏi ${targetLabel}.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="text-center mb-10 relative">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
          <FileSignature size={36} />
          Tạo Bài Tập / Quản Lý Câu Hỏi
        </h1>
        <p className="text-gray-500 mt-2">Hệ thống tạo file Word hoàn chỉnh với mã nhận thức và tiêu chí cụ thể.</p>
        
        <div className="mt-4 flex justify-center">
          <div className="inline-flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'edit' ? 'bg-white text-primary shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Chế độ soạn thảo
            </button>
            <button
              onClick={() => setViewMode('review')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${viewMode === 'review' ? 'bg-white text-primary shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <CheckCircle2 size={16} /> Rà soát YCCĐ
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'review' ? (
        <CurriculumMappingReview questions={questions} onSaveMapping={handleSaveManualMapping} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* General Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <Info size={20} /> THÔNG TIN CHUNG
                        {questions.length > 0 && lesson && (
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                Bài này: {filteredQuestions.length} / Tổng ngân hàng: {questions.length} câu
                            </span>
                        )}
                    </h2>
                    {filteredQuestions.length > 0 && (
                        <button 
                            type="button"
                            onClick={handleClearAllQuestions}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5 font-medium"
                            title={lesson ? `Xóa sạch toàn bộ câu hỏi của bài "${lesson}"` : "Xóa toàn bộ câu hỏi hiện có trong danh sách"}
                        >
                            <Trash size={14} /> Xóa sạch câu hỏi ({filteredQuestions.length})
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="grade-select" className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                        <select 
                            id="grade-select"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={grade}
                            onChange={(e) => { setGrade(e.target.value); setLesson(''); }}
                        >
                            <option value="">-- Chọn khối --</option>
                            <option value="6">Khối 6</option>
                            <option value="7">Khối 7</option>
                            <option value="8">Khối 8</option>
                            <option value="9">Khối 9</option>
                        </select>
                    </div>
                    <div>
                         <label htmlFor="lesson-select" className="block text-sm font-medium text-gray-700 mb-1">Bài</label>
                        <select 
                            id="lesson-select"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100"
                            value={lesson}
                            onChange={(e) => setLesson(e.target.value)}
                            disabled={!grade}
                        >
                            <option value="">-- Chọn bài --</option>
                            {availableLessons?.map((l, idx) => (
                                <option key={idx} value={l} disabled={l.startsWith('a.') || l.startsWith('b.')} className={l.startsWith('a.') || l.startsWith('b.') ? 'bg-gray-100 font-bold' : ''}>
                                     {l}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Thanh Phân tầng Ngân hàng Câu hỏi & Phê duyệt dùng chung */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-600 mr-1">Phân cấp Ngân hàng:</span>
                        <button
                            type="button"
                            onClick={() => setBankScopeFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                bankScopeFilter === 'all'
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Tất cả ({scopeCounts.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setBankScopeFilter('shared')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                bankScopeFilter === 'shared'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            Ngân hàng chung đã duyệt ({scopeCounts.shared})
                        </button>
                        <button
                            type="button"
                            onClick={() => setBankScopeFilter('pending')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                bankScopeFilter === 'pending'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                        >
                            Chờ duyệt ({scopeCounts.pending})
                        </button>
                        <button
                            type="button"
                            onClick={() => setBankScopeFilter('personal')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                bankScopeFilter === 'personal'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            }`}
                        >
                            Kho cá nhân ({scopeCounts.personal})
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopeCounts.personal > 0 && !canApproveExam(currentUser) && (
                            <button
                                type="button"
                                onClick={handleSubmitFilteredToSharedBank}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                            >
                                Gửi duyệt ({scopeCounts.personal} câu)
                            </button>
                        )}
                        {(scopeCounts.pending > 0 || scopeCounts.personal > 0) && canApproveExam(currentUser) && (
                            <button
                                type="button"
                                onClick={handleApprovePendingQuestions}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Duyệt đưa vào Ngân hàng chuẩn dùng chung và tự động lọc trùng lặp"
                            >
                                <CheckCircle2 size={14} />
                                Duyệt vào Ngân hàng chung ({scopeCounts.pending + scopeCounts.personal} câu)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Multiple Choice Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <ListChecks size={20} /> PHẦN 1: TRẮC NGHIỆM
                        <span className="text-xs font-normal text-gray-500">
                            ({filteredQuestions.filter(q => q.category === 'mc').length} câu)
                        </span>
                    </h2>
                    {filteredQuestions.some(q => q.category === 'mc') && (
                        <button 
                            type="button"
                            onClick={handleClearMcQuestions}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5 font-medium"
                            title="Xóa tất cả câu hỏi trắc nghiệm của bài này"
                        >
                            <Trash size={14} /> Xóa tất cả trắc nghiệm
                        </button>
                    )}
                </div>
                
                <div className="space-y-6">
                    {filteredQuestions.filter(q => q.category === 'mc').length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <p className="text-sm font-medium text-gray-500">Chưa có câu hỏi trắc nghiệm nào cho bài học này.</p>
                            <p className="text-xs text-gray-400 mt-1">Bấm "Thêm câu hỏi", "Tạo câu hỏi AI" hoặc "Nhập hàng loạt" bên dưới để thêm câu hỏi.</p>
                        </div>
                    ) : (
                        filteredQuestions.filter(q => q.category === 'mc').map((q, idx) => (
                        <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative group">
                            <button 
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="font-medium text-gray-800 text-sm">Câu hỏi {idx + 1}</h3>
                                {isQuestionForHskt(q, hsktChecked, grade) && (
                                    <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold" title="Câu hỏi này thuộc YCCĐ dành cho HSKT">
                                        HSKT
                                    </span>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <select 
                                    className="p-2 text-sm border rounded"
                                    value={q.level}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'level', e.target.value)}
                                >
                                    <option value="NB">NB - Nhận biết</option>
                                    <option value="TH">TH - Thông hiểu</option>
                                    <option value="VD">VD - Vận dụng</option>
                                    <option value="VDC">VDC - Vận dụng cao</option>
                                </select>
                                <div className="relative">
                                    {!q.criteria && (
                                        <div className="absolute right-8 top-2.5 text-red-500 animate-pulse pointer-events-none" title="Vui lòng chọn tiêu chí">
                                            <AlertCircle size={16} />
                                        </div>
                                    )}
                                    <select 
                                        className={`p-2 text-sm border rounded w-full ${!q.criteria ? 'border-red-500 bg-red-50 focus:ring-red-500' : ''}`}
                                        value={q.criteria}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'criteria', e.target.value)}
                                    >
                                        <option value="">-- Chọn tiêu chí --</option>
                                        {getCriteriaOptionsForLevel(q.level).map((c, i) => {
                                            const code = c.split(' ')[0];
                                            return <option key={i} value={code}>{c}</option>
                                        })}
                                    </select>
                                    {!q.criteria && <p className="text-[10px] text-red-500 mt-1">Bắt buộc</p>}
                                </div>
                                <select 
                                    className="p-2 text-sm border rounded font-medium text-gray-700 bg-white"
                                    value={q.questionType || (q.mcType === 'fill-blank' ? 'fill-blank' : (q.mcType === 'multiple-answer' ? 'multiple-answer' : 'multiple-choice'))}
                                    onChange={(e) => {
                                        const newType = e.target.value as any;
                                        handleUpdateQuestion(q.id, 'questionType', newType);
                                        if (newType === 'multiple-answer') {
                                            handleUpdateQuestion(q.id, 'mcType', 'multiple-answer');
                                            const subIds = ['A', 'B', 'C', 'D'];
                                            const currentOpts = q.options || [];
                                            const hasMultiple = currentOpts.filter(o => o.isCorrect).length >= 2;
                                            const newOpts = subIds.map((id, i) => ({
                                                id,
                                                text: currentOpts[i]?.text || '',
                                                isCorrect: hasMultiple ? (currentOpts[i]?.isCorrect ?? false) : (i === 0 || i === 1)
                                            }));
                                            handleUpdateQuestion(q.id, 'options', newOpts);
                                            const correctAnswers = newOpts.filter(o => o.isCorrect).map(o => o.id).join(', ');
                                            handleUpdateQuestion(q.id, 'answer', correctAnswers);
                                        } else if (newType === 'true-false') {
                                            handleUpdateQuestion(q.id, 'mcType', 'true-false');
                                            const subIds = ['a', 'b', 'c', 'd'];
                                            const currentOpts = q.options || [];
                                            const isExistingSub = currentOpts.length >= 2 && !currentOpts.some(o => o.id === 'Đúng' || o.id === 'Sai');
                                            const newOpts = subIds.map((id, i) => ({
                                                id,
                                                text: isExistingSub ? (currentOpts[i]?.text || '') : '',
                                                isCorrect: isExistingSub ? Boolean(currentOpts[i]?.isCorrect) : (i % 2 === 0)
                                            }));
                                            handleUpdateQuestion(q.id, 'options', newOpts);
                                            const ansSummary = newOpts.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
                                            handleUpdateQuestion(q.id, 'answer', ansSummary);
                                        } else if (newType === 'multiple-choice') {
                                            handleUpdateQuestion(q.id, 'mcType', 'multiple-choice');
                                            const subIds = ['A', 'B', 'C', 'D'];
                                            const currentOpts = q.options || [];
                                            const firstCorrectIndex = currentOpts.findIndex(o => o.isCorrect);
                                            const targetIndex = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;
                                            const newOpts = subIds.map((id, i) => ({
                                                id,
                                                text: currentOpts[i]?.text || '',
                                                isCorrect: i === targetIndex
                                            }));
                                            handleUpdateQuestion(q.id, 'options', newOpts);
                                            handleUpdateQuestion(q.id, 'answer', subIds[targetIndex]);
                                        } else if (newType === 'fill-blank') {
                                            handleUpdateQuestion(q.id, 'mcType', 'fill-blank');
                                        } else {
                                            handleUpdateQuestion(q.id, 'mcType', 'multiple-choice');
                                        }
                                    }}
                                >
                                    <option value="multiple-choice">Trắc nghiệm 4 chọn 1 (Phần I)</option>
                                    <option value="multiple-answer">Trắc nghiệm nhiều đáp án</option>
                                    <option value="true-false">Trắc nghiệm Đúng / Sai (Tình huống + 4 ý a, b, c, d)</option>
                                    <option value="short-answer">Trắc nghiệm Trả lời ngắn (Phần III - 2025)</option>
                                    <option value="fill-blank">Điền khuyết từ</option>
                                </select>
                            </div>

                            <div className="mb-3">
                                {q.questionType === 'true-false' && (
                                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                                        Tình huống (Mô tả tình huống cụ thể, đủ thông tin để học sinh phân tích):
                                    </label>
                                )}
                                <textarea 
                                    className="w-full p-3 border rounded-lg text-sm mb-2 focus:border-primary outline-none"
                                    rows={2}
                                    placeholder={q.questionType === 'true-false' ? "Nhập mô tả tình huống cụ thể (hoặc dán nguyên khối Tình huống + Câu hỏi + a, b, c, d vào đây)..." : "Nhập nội dung câu hỏi..."}
                                    value={q.content}
                                    onChange={(e) => handleContentChange(q.id, e.target.value)}
                                />
                                
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                        <ImageIcon size={16} />
                                        {q.image ? 'Thay đổi ảnh' : 'Thêm hình ảnh'}
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(q.id, e)}
                                        />
                                    </label>
                                </div>
                                
                                {q.image && (
                                    <div className="mt-3 relative inline-block group/image">
                                        <img src={q.image} alt="Question illustration" className="h-32 w-auto object-contain rounded border border-gray-200" />
                                        <button 
                                            onClick={() => handleRemoveImage(q.id)}
                                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md text-gray-400 hover:text-red-500 border border-gray-200"
                                            title="Xóa ảnh"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Question Options / Inputs based on format */}
                            {q.questionType === 'true-false' ? (
                                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2.5">
                                    {q.options && q.options.some(o => ['a', 'b', 'c', 'd'].includes(o.id.toLowerCase())) ? (
                                        <>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-xs font-bold text-blue-950">
                                                    Câu {idx + 1}. Xác định tính đúng hoặc sai của các phát biểu sau:
                                                </div>
                                                <span className="text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-blue-200 text-blue-800 font-bold">
                                                    Đáp án: {q.options.map(o => `${o.id}) ${o.isCorrect ? 'Đúng' : 'Sai'}`).join(' • ')}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {(['a', 'b', 'c', 'd'] as const).map((subId, sIdx) => {
                                                    const opt = q.options?.find(o => o.id.toLowerCase() === subId) || { id: subId, text: '', isCorrect: false };
                                                    const placeholders = ['Phát biểu thứ nhất...', 'Phát biểu thứ hai...', 'Phát biểu thứ ba...', 'Phát biểu thứ tư...'];
                                                    return (
                                                        <div key={subId} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-blue-100 shadow-2xs">
                                                            <span className="w-7 h-7 rounded-md bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0">
                                                                {subId})
                                                            </span>
                                                            <input
                                                                type="text"
                                                                className="flex-1 p-1.5 text-sm border border-transparent focus:border-blue-300 rounded outline-none"
                                                                placeholder={placeholders[sIdx]}
                                                                value={opt.text}
                                                                onChange={(e) => handleUpdateOption(q.id, opt.id, 'text', e.target.value)}
                                                            />
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateOption(q.id, opt.id, 'isCorrect', true)}
                                                                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                                                        opt.isCorrect
                                                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    ✓ Đúng
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateOption(q.id, opt.id, 'isCorrect', false)}
                                                                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                                                        !opt.isCorrect
                                                                            ? 'bg-rose-600 text-white shadow-2xs'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    ✗ Sai
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <label className="block text-xs font-bold text-blue-900">
                                                    Xác định đáp án cho nhận định trên:
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newOpts = [
                                                            { id: 'a', text: q.content || '', isCorrect: q.answer !== 'Sai' },
                                                            { id: 'b', text: '', isCorrect: false },
                                                            { id: 'c', text: '', isCorrect: true },
                                                            { id: 'd', text: '', isCorrect: false }
                                                        ];
                                                        handleUpdateQuestion(q.id, 'options', newOpts);
                                                        handleUpdateQuestion(q.id, 'answer', newOpts.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', '));
                                                    }}
                                                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded border border-indigo-200 cursor-pointer"
                                                >
                                                    + Chuyển sang mẫu Tình huống & 4 ý a), b), c), d)
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleUpdateQuestion(q.id, 'answer', 'Đúng');
                                                        handleUpdateQuestion(q.id, 'options', [
                                                            { id: 'Đúng', text: 'Đúng', isCorrect: true },
                                                            { id: 'Sai', text: 'Sai', isCorrect: false }
                                                        ]);
                                                    }}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                                                        q.answer !== 'Sai'
                                                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    ✓ ĐÚNG
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleUpdateQuestion(q.id, 'answer', 'Sai');
                                                        handleUpdateQuestion(q.id, 'options', [
                                                            { id: 'Đúng', text: 'Đúng', isCorrect: false },
                                                            { id: 'Sai', text: 'Sai', isCorrect: true }
                                                        ]);
                                                    }}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                                                        q.answer === 'Sai'
                                                            ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    ✗ SAI
                                                </button>
                                                <span className="text-xs text-blue-700 font-medium">
                                                    (Đáp án: <strong>{q.answer === 'Sai' ? 'Sai' : 'Đúng'}</strong>)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : q.questionType === 'short-answer' ? (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    <label className="block text-xs font-bold text-amber-800 mb-1">Đáp án trả lời ngắn chính xác (Học sinh điền):</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-amber-300 rounded text-sm bg-white font-medium text-amber-900"
                                        placeholder="Ví dụ: 1024, RAM, Số 15, v.v..."
                                        value={q.answer || ''}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'answer', e.target.value)}
                                    />
                                </div>
                            ) : q.mcType !== 'fill-blank' && q.questionType !== 'fill-blank' ? (
                                <div className="space-y-2">
                                    {(q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer') && (
                                        <div className="flex items-center justify-between text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg mb-2">
                                            <span className="font-semibold flex items-center gap-1.5">
                                                <CheckSquare size={14} /> Dạng nhiều đáp án đúng (Đánh dấu các đáp án đúng bằng ô checkbox)
                                            </span>
                                            <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                                Đã chọn: {q.options?.filter(o => o.isCorrect).map(o => o.id).join(', ') || 'Chưa chọn'}
                                            </span>
                                        </div>
                                    )}
                                    {q.options?.map((opt) => {
                                        const isMulti = q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer';
                                        return (
                                            <div key={opt.id} className="flex items-center gap-2">
                                                {isMulti ? (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!opt.isCorrect}
                                                        onChange={() => {
                                                            const updated = q.options?.map(o => o.id === opt.id ? { ...o, isCorrect: !o.isCorrect } : o);
                                                            const correctAnswers = updated?.filter(o => o.isCorrect).map(o => o.id).join(', ') || '';
                                                            handleUpdateQuestion(q.id, 'options', updated);
                                                            handleUpdateQuestion(q.id, 'answer', correctAnswers);
                                                        }}
                                                        className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded cursor-pointer"
                                                        title="Chọn làm một trong các đáp án đúng"
                                                    />
                                                ) : (
                                                    <input 
                                                        type="radio" 
                                                        name={`correct_${q.id}`}
                                                        checked={!!opt.isCorrect}
                                                        onChange={() => {
                                                            // Set only this option to true
                                                            const updated = q.options?.map(o => ({
                                                                ...o,
                                                                isCorrect: o.id === opt.id
                                                            }));
                                                            handleUpdateQuestion(q.id, 'options', updated);
                                                            handleUpdateQuestion(q.id, 'answer', opt.id);
                                                        }}
                                                        className="w-4 h-4 text-primary accent-primary cursor-pointer"
                                                        title="Đánh dấu đáp án đúng duy nhất"
                                                    />
                                                )}
                                                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                                                    opt.isCorrect ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {opt.id}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className={`flex-1 p-2 border rounded text-sm ${opt.isCorrect ? 'border-indigo-300 bg-indigo-50/20' : ''}`}
                                                    placeholder={`Lựa chọn ${opt.id}`}
                                                    value={opt.text}
                                                    onChange={(e) => handleUpdateOption(q.id, opt.id, 'text', e.target.value)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border rounded text-sm"
                                        placeholder="Nhập đáp án điền khuyết..."
                                        value={q.answer || ''}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'answer', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )))}
                </div>

                <div className="flex gap-3 mt-4">
                    <button 
                        onClick={() => handleAddQuestion('mc')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Thêm câu hỏi
                    </button>
                    <button 
                        onClick={() => openGenModal('mc')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm shadow-sm shadow-purple-200"
                    >
                        <Wand2 size={16} /> Tạo câu hỏi AI
                    </button>
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm ml-auto"
                    >
                        <Layers size={16} /> Nhập hàng loạt
                    </button>
                </div>
            </div>

            {/* Essay Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <PenTool size={20} /> PHẦN 2: TỰ LUẬN
                        <span className="text-xs font-normal text-gray-500">
                            ({filteredQuestions.filter(q => q.category === 'essay').length} câu)
                        </span>
                    </h2>
                    {filteredQuestions.some(q => q.category === 'essay') && (
                        <button 
                            type="button"
                            onClick={handleClearEssayQuestions}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5 font-medium"
                            title="Xóa tất cả câu hỏi tự luận của bài này"
                        >
                            <Trash size={14} /> Xóa tất cả tự luận
                        </button>
                    )}
                </div>
                 <div className="space-y-6">
                    {filteredQuestions.filter(q => q.category === 'essay').length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <p className="text-sm font-medium text-gray-500">Chưa có câu hỏi tự luận nào cho bài học này.</p>
                            <p className="text-xs text-gray-400 mt-1">Bấm "Thêm câu tự luận" hoặc "Tạo câu hỏi AI" bên dưới để thêm câu hỏi.</p>
                        </div>
                    ) : (
                        filteredQuestions.filter(q => q.category === 'essay').map((q, idx) => (
                        <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                             <button 
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                             <div className="flex items-center gap-2 mb-3">
                                 <h3 className="font-medium text-gray-800 text-sm">Câu tự luận {idx + 1}</h3>
                                 {isQuestionForHskt(q, hsktChecked, grade) && (
                                     <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold" title="Câu hỏi này thuộc YCCĐ dành cho HSKT">
                                         HSKT
                                     </span>
                                 )}
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <select 
                                    className="p-2 text-sm border rounded"
                                    value={q.level}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'level', e.target.value)}
                                >
                                    <option value="NB">NB - Nhận biết</option>
                                    <option value="TH">TH - Thông hiểu</option>
                                    <option value="VD">VD - Vận dụng</option>
                                    <option value="VDC">VDC - Vận dụng cao</option>
                                </select>
                                <div className="relative">
                                    {!q.criteria && (
                                        <div className="absolute right-8 top-2.5 text-red-500 animate-pulse pointer-events-none" title="Vui lòng chọn tiêu chí">
                                            <AlertCircle size={16} />
                                        </div>
                                    )}
                                    <select 
                                        className={`p-2 text-sm border rounded w-full ${!q.criteria ? 'border-red-500 bg-red-50 focus:ring-red-500' : ''}`}
                                        value={q.criteria}
                                        onChange={(e) => handleUpdateQuestion(q.id, 'criteria', e.target.value)}
                                    >
                                        <option value="">-- Chọn tiêu chí --</option>
                                        {getCriteriaOptionsForLevel(q.level).map((c, i) => {
                                            const code = c.split(' ')[0];
                                            return <option key={i} value={code}>{c}</option>
                                        })}
                                    </select>
                                    {!q.criteria && <p className="text-[10px] text-red-500 mt-1">Bắt buộc</p>}
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <textarea 
                                    className="w-full p-3 border rounded-lg text-sm focus:border-primary outline-none"
                                    rows={3}
                                    placeholder="Nhập nội dung câu hỏi tự luận..."
                                    value={q.content}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                                />
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                        <ImageIcon size={16} />
                                        {q.image ? 'Thay đổi ảnh' : 'Thêm hình ảnh'}
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(q.id, e)}
                                        />
                                    </label>
                                </div>
                                {q.image && (
                                    <div className="mt-3 relative inline-block group/image">
                                        <img src={q.image} alt="Question illustration" className="h-32 w-auto object-contain rounded border border-gray-200" />
                                        <button 
                                            onClick={() => handleRemoveImage(q.id)}
                                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md text-gray-400 hover:text-red-500 border border-gray-200"
                                            title="Xóa ảnh"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-2">
                                 <div className="flex justify-between items-end mb-1">
                                     <p className="text-xs font-semibold text-gray-500 flex items-center gap-1"><BookOpenCheck size={14}/> Hướng dẫn chấm & Đáp án:</p>
                                     <button 
                                        onClick={() => handleGenerateRubric(q)}
                                        disabled={loadingRubricId === q.id || !q.content}
                                        className="text-xs flex items-center gap-1 text-purple-600 hover:bg-purple-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                     >
                                        {loadingRubricId === q.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        AI Tạo hướng dẫn
                                     </button>
                                 </div>
                                 <textarea 
                                    className="w-full p-2 bg-green-50/50 border border-green-100 rounded text-sm text-gray-700 focus:outline-none focus:border-green-300"
                                    rows={4}
                                    placeholder="Nhập hướng dẫn chấm (hoặc dùng AI tạo)..."
                                    value={q.answer || ''}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'answer', e.target.value)}
                                 />
                            </div>
                        </div>
                    )))}
                </div>
                 <div className="flex gap-3 mt-4">
                    <button 
                        onClick={() => handleAddQuestion('essay')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Thêm câu tự luận
                    </button>
                    <button 
                        onClick={() => openGenModal('essay')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm shadow-sm shadow-purple-200"
                    >
                        <Wand2 size={16} /> Tạo câu hỏi AI
                    </button>
                </div>
            </div>
            
            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <ChartBar size={20} /> Thống kê số câu hỏi
                </h2>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 font-mono text-sm text-gray-600 whitespace-pre-wrap">
                    {Object.entries(questionSummary).length > 0 
                        ? Object.entries(questionSummary).map(([key, count]) => `${key}: ${count}`).join('\n')
                        : "Chưa có câu hỏi nào được định nghĩa đầy đủ (thiếu tiêu chí)."}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
                <button 
                    onClick={handleJsonExportClick} 
                    className="px-5 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 text-sm"
                    title="Xuất câu hỏi của bài học đang chọn ra file JSON"
                >
                    <FileOutput size={18} /> Xuất JSON (Theo bài)
                </button>
                <button 
                    type="button"
                    onClick={handleExportFullQuestionBank} 
                    className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
                    title="Sao lưu toàn bộ Ngân hàng câu hỏi của mọi khối lớp ra 1 file JSON duy nhất"
                >
                    <FileOutput size={18} /> Sao lưu toàn bộ Ngân hàng ({questions.length} câu)
                </button>
                <label className="px-5 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer text-sm">
                    <FileInput size={18} /> Nhập JSON
                    <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                </label>
                {filteredQuestions.length > 0 && (
                    <button 
                        type="button"
                        onClick={handleClearAllQuestions} 
                        className="px-5 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-100 hover:border-rose-300 transition-all flex items-center gap-2 shadow-sm ml-auto text-sm"
                        title={lesson ? `Xóa sạch toàn bộ câu hỏi của bài "${lesson}"` : "Xóa toàn bộ câu hỏi hiện có trong danh sách"}
                    >
                        <Trash size={18} /> Xóa bài hiện tại ({filteredQuestions.length})
                    </button>
                )}
            </div>

        </div>

        {/* Sidebar (Right Col) */}
        <aside className="lg:col-span-1">
            <div className="sticky top-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 max-h-[calc(100vh-40px)] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                        <ListChecks size={20} /> Yêu Cầu Cần Đạt
                    </h3>
                    
                    {!lesson ? (
                        <p className="text-gray-500 text-sm">Vui lòng chọn khối và bài để xem yêu cầu cần đạt.</p>
                    ) : (
                        currentCriteriaData ? (
                            <div className="space-y-6">
                                {['NB', 'TH', 'VD', 'VDC', ...Object.keys(currentCriteriaData).filter(l => !['NB', 'TH', 'VD', 'VDC'].includes(l))].map(level => {
                                    const criteriaList = currentCriteriaData[level];
                                    if (!criteriaList) return null;
                                    const levelName = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' }[level] || level;
                                    return (
                                        <div key={level}>
                                            <h4 className="text-sm font-bold text-primary mb-2 bg-blue-50 p-1.5 rounded inline-block">{levelName}</h4>
                                            <ul className="text-xs text-gray-700 space-y-2 list-none leading-relaxed">
                                                {criteriaList.map((c, i) => {
                                                    const cleanText = c.replace(/^\d+\.\d+\s/, '');
                                                    const code = c.split(' ')[0].trim();
                                                    const lessonKey = lesson ? `${lesson}:::${code}` : '';
                                                    const fullLessonKey = lesson ? `${lesson}:::${c}` : '';
                                                    const isChecked = !!(hsktChecked[c] || (fullLessonKey && hsktChecked[fullLessonKey]) || (lessonKey && hsktChecked[lessonKey]));
                                                    const isEditingThis = editingCriterion?.level === level && editingCriterion?.originalText === c;

                                                    if (isEditingThis) {
                                                        return (
                                                            <li key={i} className="p-2 bg-blue-50/90 border border-blue-300 rounded-lg space-y-2">
                                                                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
                                                                    <span>Chỉnh sửa YCCĐ:</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCancelEditCriterion}
                                                                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                                        title="Hủy"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    rows={3}
                                                                    autoFocus
                                                                    className="w-full p-2 border border-blue-300 rounded bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                                    value={editingCriterionText}
                                                                    onChange={(e) => setEditingCriterionText(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleSaveEditCriterion();
                                                                        } else if (e.key === 'Escape') {
                                                                            handleCancelEditCriterion();
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCancelEditCriterion}
                                                                        className="px-2 py-0.5 rounded text-slate-500 hover:bg-slate-200/60 text-[11px] font-medium cursor-pointer"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleSaveEditCriterion}
                                                                        disabled={!editingCriterionText.trim()}
                                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        <Check size={12} />
                                                                        <span>Lưu thay đổi</span>
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        );
                                                    }

                                                    return (
                                                    <li key={i} className="group/crit flex items-start gap-1.5 p-1 rounded-md hover:bg-slate-100/70 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mt-0.5 cursor-pointer accent-red-500 flex-shrink-0" 
                                                            title="Đánh dấu YCCĐ này dành cho HSKT"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                const nextVal = !isChecked;
                                                                setHsktChecked(prev => {
                                                                    const updated = { ...prev, [c]: nextVal };
                                                                    if (lessonKey) updated[lessonKey] = nextVal;
                                                                    if (fullLessonKey) updated[fullLessonKey] = nextVal;
                                                                    return updated;
                                                                });
                                                            }}
                                                        />
                                                        <span className={`flex-1 break-words leading-relaxed ${isChecked ? "font-semibold text-red-600" : ""}`}>
                                                            {cleanText}
                                                        </span>
                                                        <div className="opacity-0 group-hover/crit:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartEditCriterion(level, c)}
                                                                className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                                                title="Sửa yêu cầu cần đạt này"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCriterion(level, c)}
                                                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                                title="Xóa yêu cầu cần đạt này"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </li>
                                                );})}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm italic">Không có dữ liệu đặc tả cho bài này.</p>
                        )
                    )}

                    {lesson && (
                        isAddingCustomCriterion ? (
                            <div className="mt-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs space-y-2">
                                <div className="flex items-center justify-between font-semibold text-indigo-900">
                                    <span>Bổ sung YCCĐ / Mức độ:</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddingCustomCriterion(false)}
                                        className="text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Mức độ nhận thức:</label>
                                    <select
                                        className="w-full p-1.5 border border-indigo-300 rounded bg-white text-xs outline-none"
                                        value={newCriterionLevel}
                                        onChange={(e) => setNewCriterionLevel(e.target.value)}
                                    >
                                        <option value="NB">NB - Nhận biết</option>
                                        <option value="TH">TH - Thông hiểu</option>
                                        <option value="VD">VD - Vận dụng</option>
                                        <option value="VDC">VDC - Vận dụng cao</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Nội dung YCCĐ:</label>
                                    <textarea
                                        rows={2}
                                        className="w-full p-1.5 border border-indigo-300 rounded bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="Nhập nội dung yêu cầu cần đạt..."
                                        value={newCriterionText}
                                        onChange={(e) => setNewCriterionText(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCustomCriterion(false)}
                                        className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 font-medium"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddCustomCriterion}
                                        disabled={!newCriterionText.trim()}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold disabled:opacity-50 cursor-pointer"
                                    >
                                        Thêm YCCĐ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingCustomCriterion(true);
                                    setNewCriterionText('');
                                }}
                                className="mt-4 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-full cursor-pointer"
                                title="Thêm yêu cầu cần đạt hoặc bổ sung mức độ mới cho bài học này"
                            >
                                <Plus size={13} />
                                <span>Bổ sung YCCĐ / Mức độ</span>
                            </button>
                        )
                    )}
                </div>
            </div>
        </aside>
          </div>
        </>
      )}

      {/* AI Generate Question Modal */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Wand2 className="text-purple-600" /> Tạo câu hỏi bằng AI ({activeSection === 'mc' ? 'Trắc nghiệm' : 'Tự luận'})
                    </h3>
                    <button onClick={() => setIsGenModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ nhận thức</label>
                        <select 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            value={genLevel}
                            onChange={(e) => setGenLevel(e.target.value)}
                        >
                            <option value="NB">Nhận biết</option>
                            <option value="TH">Thông hiểu</option>
                            <option value="VD">Vận dụng</option>
                            <option value="VDC">Vận dụng cao</option>
                            <option value="ALL">Tất cả mức độ (NB, TH, VD - Tự động phân bổ)</option>
                        </select>
                         {/* Warning Block */}
                        {genLevel !== 'ALL' && currentCriteriaData && (!currentCriteriaData[genLevel] || currentCriteriaData[genLevel].length === 0) && (
                             <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex gap-2 items-start">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Lưu ý:</strong> Bài "<strong>{lesson}</strong>" không có YCCĐ riêng ở mức này, hệ thống đã tự động hiển thị toàn bộ YCCĐ của bài bên dưới để bạn chọn.
                                </span>
                             </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dạng câu hỏi</label>
                        <select 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            value={genType}
                            onChange={(e) => setGenType(e.target.value)}
                        >
                            {activeSection === 'mc' ? (
                                <>
                                    <option value="multiple-choice">Trắc nghiệm nhiều lựa chọn (Phần I - 4 chọn 1)</option>
                                    <option value="multiple-answer">Trắc nghiệm nhiều đáp án (Chọn từ 2 đáp án đúng trở lên)</option>
                                    <option value="true-false">Trắc nghiệm Đúng / Sai (Tình huống + 4 ý a, b, c, d)</option>
                                    <option value="short-answer">Trắc nghiệm Trả lời ngắn (Phần III - Chuẩn 2025)</option>
                                    <option value="fill-blank">Điền khuyết / Khuyết từ</option>
                                </>
                            ) : (
                                <option value="essay">Tự luận (Kèm barem chấm chi tiết)</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu chí (Tùy chọn)</label>
                        <select 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            value={genCriteriaCode}
                            onChange={(e) => setGenCriteriaCode(e.target.value)}
                        >
                            <option value="">-- Mặc định (Theo bài học) --</option>
                            {getCriteriaOptionsForLevel(genLevel === 'ALL' ? 'NB' : genLevel).map((c, i) => {
                                const code = c.split(' ')[0];
                                return <option key={i} value={code}>{c}</option>
                            })}
                        </select>
                    </div>

                    {/* PDF Grounding Attachment */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                <FileText size={16} className="text-purple-600" /> Ngữ liệu PDF tham khảo (Tùy chọn)
                            </label>
                            {genPdf && (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={13} /> Đã nạp PDF
                                </span>
                            )}
                        </div>

                        {!genPdf ? (
                            <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50/80 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                                <FileUp className="text-purple-500 mb-1 group-hover:scale-110 transition-transform" size={24} />
                                <span className="text-xs font-bold text-purple-900">Bấm để tải file PDF (SGK, SGV, đề mẫu...)</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">AI sẽ đọc trực tiếp nội dung PDF này để ra đề bám sát 100% ngữ liệu</span>
                                <input 
                                    type="file" 
                                    accept=".pdf,application/pdf" 
                                    className="hidden" 
                                    onChange={(e) => handlePdfFileChange(e, 'gen')} 
                                />
                            </label>
                        ) : (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                        PDF
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-purple-900 truncate">{genPdf.name}</p>
                                        <p className="text-[10px] text-purple-600 font-medium">{genPdf.size} • AI sẽ ra đề bám sát nội dung này</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setGenPdf(null)}
                                    className="p-1 hover:bg-purple-200 rounded-lg text-purple-700 transition-colors"
                                    title="Gỡ bỏ tài liệu này"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng câu hỏi</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            value={genQuantity}
                            onChange={(e) => setGenQuantity(parseInt(e.target.value) || 1)}
                        />
                    </div>

                    {/* Chức năng Sinh Prompt để Copy sang ChatGPT / Gemini ngoài */}
                    <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                <Copy size={14} className="text-indigo-600" />
                                Sinh Prompt chuẩn để Copy sang ChatGPT / Gemini
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPromptPreview(prev => !prev)}
                                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                            >
                                {showPromptPreview ? 'Ẩn nội dung Prompt' : 'Xem nội dung Prompt'}
                            </button>
                        </div>
                        <p className="text-[11px] text-indigo-800 leading-relaxed">
                            Tự động kết xuất Prompt theo đúng <strong>Bài học</strong>, <strong>Mức độ ({genLevel})</strong>, <strong>Tiêu chí</strong> và <strong>Số lượng ({genQuantity} câu)</strong> bạn chọn ở trên. Copy kèm file đính kèm đưa vào AI ngoài để nhận kết quả khớp 100% với <strong>Nhập hàng loạt (AI Scan)</strong>.
                        </p>
                        {showPromptPreview && (
                            <textarea
                                readOnly
                                rows={7}
                                value={buildExternalAIPrompt()}
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-[11px] font-mono text-slate-700 focus:outline-none"
                            />
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                                type="button"
                                onClick={() => handleCopyExternalPrompt(false)}
                                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                                {copiedPromptSuccess ? <Check size={14} /> : <Copy size={14} />}
                                {copiedPromptSuccess ? 'Đã Copy Prompt!' : 'Copy Prompt'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCopyExternalPrompt(true)}
                                className="flex-1 py-2 px-3 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                title="Copy Prompt và chuyển ngay sang cửa sổ Nhập hàng loạt (AI Scan) để chờ dán kết quả"
                            >
                                <Layers size={14} />
                                Copy & Mở AI Scan
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <Sparkles size={14} className="text-emerald-600" /> Hệ thống bảo đảm 100% không gián đoạn:
                        </p>
                        <p className="leading-relaxed">
                            Tạo <strong>{genQuantity}</strong> câu hỏi bám sát bài <strong>"{lesson}"</strong> {genPdf ? `và tài liệu PDF "${genPdf.name}"` : ''}. Khi API Key hết hạn ngạch hoặc chưa cài đặt, hệ thống tự động kích hoạt Bộ sinh Sư phạm Chuẩn GDPT 2018.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-between items-center gap-2 bg-gray-50 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleCopyExternalPrompt(false)}
                        className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Copy size={15} />
                        {copiedPromptSuccess ? 'Đã Copy!' : 'Copy Prompt'}
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsGenModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm">Hủy bỏ</button>
                        <button 
                            onClick={handleGenerateQuestion} 
                            disabled={isGenerating}
                            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-70"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            Tạo ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Duplicate Management Modal */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-yellow-50">
                    <h3 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                        <AlertTriangle className="text-yellow-600" /> Phát hiện câu hỏi trùng lặp
                    </h3>
                    <button onClick={() => setIsDuplicateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <p>Hệ thống phát hiện <strong>{duplicateGroups.length}</strong> nhóm câu hỏi có nội dung giống nhau hoặc <strong>gần giống (&gt;85%)</strong> trong danh sách hiện tại (do nhập thủ công hoặc chỉnh sửa).</p>
                        <p className="mt-1">Vui lòng xem xét và xử lý trước khi xuất file.</p>
                    </div>

                    {duplicateGroups.map((group, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="font-medium text-gray-800 mb-2 text-sm line-clamp-2">
                                "{group[0].content}"
                            </div>
                            <div className="text-xs text-gray-500 mb-3">
                                Xuất hiện {group.length} lần (hoặc các biến thể tương tự).
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleFixDuplicateGroup(group)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-100 text-gray-700"
                                >
                                    Giữ 1 bản (Xóa {group.length - 1} bản thừa)
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-gray-50">
                    <button onClick={handleContinueAnyway} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm">
                        Bỏ qua & Tiếp tục
                    </button>
                    
                    <button 
                        onClick={handleAutoFixAllDuplicates}
                        className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-bold flex items-center gap-2 shadow-md shadow-yellow-200"
                    >
                        <Check size={18} /> Tự động xử lý tất cả
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Layers className="text-primary" /> Nhập câu hỏi hàng loạt
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Đang nhập cho: <b className="text-primary">Khối {grade || '...'} — {lesson || 'Chưa chọn bài học'}</b>
                        </p>
                    </div>
                    <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* 2 Main Bulk Functions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                        <button
                            type="button"
                            onClick={() => setBulkMode('ai')}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                                bulkMode === 'ai'
                                    ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold ${bulkMode === 'ai' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${bulkMode === 'ai' ? 'text-purple-950' : 'text-gray-800'}`}>
                                    Chức năng 1: Dùng AI phân tích
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 leading-snug">
                                    Dán văn bản tự do từ Word hoặc tải file PDF đề thi để AI tự động đọc, phân loại và bóc tách câu hỏi.
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setBulkMode('syntax')}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                                bulkMode === 'syntax'
                                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-emerald-300'
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold ${bulkMode === 'syntax' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                <CheckCircle2 size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-sm font-bold ${bulkMode === 'syntax' ? 'text-emerald-950' : 'text-gray-800'}`}>
                                        Chức năng 2: Dán theo cú pháp chuẩn
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                                        Tự động nhận tức thì
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 leading-snug">
                                    Dán kết quả từ Prompt AI chuẩn hoặc văn bản đúng cú pháp — hệ thống tự nhận hàng loạt ngay lập tức (0 giây, không tốn quota AI).
                                </div>
                            </div>
                        </button>
                    </div>

                    {bulkMode === 'syntax' ? (
                        <div className="space-y-4">
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                                        <CheckCircle2 size={15} className="text-emerald-600" />
                                        Cú pháp chuẩn tự động nhận hàng loạt 100% (Tương thích trực tiếp với Prompt tạo câu hỏi):
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allCrit = [
                                                ...getCriteriaOptionsForLevel('NB').map(c => `- [NB - ${c.split(' ')[0]}] ${c}`),
                                                ...getCriteriaOptionsForLevel('TH').map(c => `- [TH - ${c.split(' ')[0]}] ${c}`),
                                                ...getCriteriaOptionsForLevel('VD').map(c => `- [VD - ${c.split(' ')[0]}] ${c}`),
                                                ...getCriteriaOptionsForLevel('VDC').map(c => `- [VDC - ${c.split(' ')[0]}] ${c}`)
                                            ].join('\n');
                                            const promptText = `Hãy đóng vai chuyên gia biên soạn đề kiểm tra môn Tin học theo Công văn 7991/BGDĐT. Dựa sát 100% vào nội dung nguồn tài liệu/file đính kèm${lesson ? ` của bài học "${lesson}" (Khối ${grade || ''})` : ''}, hãy tạo danh sách câu hỏi theo ĐÚNG cú pháp chuẩn dưới đây để phần mềm tự động nhận hàng loạt:

${allCrit ? `YÊU CẦU CẦN ĐẠT (TIÊU CHÍ) CỦA BÀI HỌC:\n${allCrit}\n\n` : ''}YÊU CẦU CỐT LÕI VỀ NỘI DUNG TÌNH HUỐNG & CÂU HỎI:
- Toàn bộ nội dung Tình huống và các phát biểu/lựa chọn BẮT BUỘC phải trích xuất, khai thác trực tiếp từ kiến thức, dữ kiện, ví dụ thực tế có trong TÀI LIỆU NGUỒN ĐÍNH KÈM và Yêu cầu cần đạt của bài học.
- Mỗi Tình huống phải là một bối cảnh cụ thể, riêng biệt gắn với nội dung tài liệu nguồn để học sinh phân tích.

QUY TẮC ĐỊNH DẠNG BẮT BUỘC (KHÔNG DÙNG BẢNG, KHÔNG DÙNG ĐỊNH DẠNG ĐẬM/NGHIÊNG MARKDOWN **):
1. Đầu mỗi câu hỏi (hoặc ngay sau chữ "Tình huống X:") BẮT BUỘC gắn nhãn mức độ nhận thức kèm mã tiêu chí trong ngoặc vuông: [NB - 1.1], [TH - 2.1], [VD - 3.1] hoặc [VDC - 4.1].
2. Dạng 1 - Trắc nghiệm 4 lựa chọn: Đặt dấu sao (*) ngay trước chữ cái của phương án đúng (ví dụ: *B. Nội dung đáp án đúng).
3. Dạng 2 - Trắc nghiệm Đúng/Sai theo Tình huống: Trình bày đúng mẫu gồm dòng "Tình huống X: [Mức độ - Mã tiêu chí] <Mô tả tình huống cụ thể từ nguồn tài liệu>", dòng tiếp theo "Câu X. Xác định tính đúng hoặc sai của các phát biểu sau:", tiếp theo là 4 dòng a), b), c), d) có gắn nhãn [Đúng] hoặc [Sai] ở cuối mỗi phát biểu.
4. Dạng 3 - Trả lời ngắn / Điền khuyết: Xuống dòng ghi rõ "Đáp án: <nội dung đáp án ngắn gọn>".
5. Dạng 4 - Tự luận: Đầu câu gắn nhãn [TL][VD - 3.1], xuống dòng ghi "Hướng dẫn chấm: <nội dung đáp án>".

KHUNG CÚ PHÁP TRÌNH BÀY MẪU (CHỈ MINH HỌA CẤU TRÚC, HÃY THAY THẾ PHẦN TRONG NGOẶC VUÔNG BẰNG NỘI DUNG TỪ TÀI LIỆU NGUỒN):

Câu 1: [NB - 1.1] [Nội dung câu hỏi trắc nghiệm 4 lựa chọn bám sát tài liệu nguồn?]
A. [Phương án nhiễu 1.]
*B. [Phương án đúng.]
C. [Phương án nhiễu 2.]
D. [Phương án nhiễu 3.]

Tình huống 1: [TH - 2.1] [Mô tả tình huống cụ thể khai thác trực tiếp từ tài liệu nguồn, đủ thông tin để học sinh phân tích.]
Câu 2. Xác định tính đúng hoặc sai của các phát biểu sau:
a) [Phát biểu thứ nhất bám sát tình huống và nguồn tài liệu] [Đúng]
b) [Phát biểu thứ hai bám sát tình huống và nguồn tài liệu] [Sai]
c) [Phát biểu thứ ba bám sát tình huống và nguồn tài liệu] [Đúng]
d) [Phát biểu thứ tư bám sát tình huống và nguồn tài liệu] [Sai]

Câu 3: [NB - 1.1] [Nội dung câu hỏi trả lời ngắn / điền khuyết bám sát tài liệu nguồn?]
Đáp án: [Nội dung đáp án ngắn gọn]

Câu 4: [TL][VD - 3.1] [Nội dung câu hỏi tự luận bám sát tài liệu nguồn?]
Hướng dẫn chấm: [Nội dung đáp án và biểu điểm tóm tắt]`;
                                            navigator.clipboard.writeText(promptText);
                                            setAlertMessage("Đã sao chép Prompt chuẩn vào bộ nhớ tạm! Bạn có thể dán (Ctrl+V) kèm file tài liệu vào ChatGPT / Gemini, sau đó dán kết quả vào ô dưới để tự động nhận hàng loạt.");
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                    >
                                        <Copy size={13} /> Copy Prompt chuẩn để AI tạo đúng cú pháp
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px]">
                                    <div>• <b>Mức độ & Tiêu chí:</b> Ghi <code className="bg-white px-1 border rounded font-bold text-emerald-800">[NB - 1.1]</code>, <code className="bg-white px-1 border rounded font-bold text-emerald-800">[TH - 2.1]</code>, <code className="bg-white px-1 border rounded font-bold text-emerald-800">[VD - 3.1]</code> đầu câu.</div>
                                    <div>• <b>Trắc nghiệm 4 lựa chọn:</b> Đặt dấu <code className="bg-amber-100 text-amber-900 px-1 rounded font-bold">*</code> trước phương án đúng (<code className="bg-white px-1 border rounded">*B. Bàn phím.</code>).</div>
                                    <div>• <b>Đúng / Sai (Tình huống + 4 ý):</b> <code className="bg-white px-1 border rounded">Tình huống 1: [TH - 2.1] ...</code> + <code className="bg-white px-1 border rounded">Câu 1. ...</code> + <code className="bg-white px-1 border rounded">a) ... [Đúng]</code>, <code className="bg-white px-1 border rounded">b) ... [Sai]</code>.</div>
                                    <div>• <b>Trả lời ngắn / Tự luận:</b> Ghi <code className="bg-white px-1 border rounded">Đáp án: ...</code> hoặc gắn <code className="bg-white px-1 border rounded">[TL]</code> kèm <code className="bg-white px-1 border rounded">Hướng dẫn chấm: ...</code>.</div>
                                </div>
                            </div>

                            <textarea 
                                className="w-full h-56 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono text-sm shadow-inner"
                                placeholder={`Dán (Ctrl+V) danh sách câu hỏi theo cú pháp chuẩn vào đây — Hệ thống sẽ tự động nhận diện ngay bên dưới...\n\nVí dụ:\nCâu 1: [NB - 1.1] Thiết bị nào sau đây là thiết bị vào?\nA. Màn hình.\n*B. Bàn phím.\nC. Máy in.\nD. Loa.\n\nTình huống 1: [TH - 2.1] Bạn An sử dụng mạng xã hội để trao đổi học tập với bạn bè.\nCâu 2. Xác định tính đúng hoặc sai của các phát biểu sau:\na) Mạng xã hội giúp kết nối và chia sẻ thông tin nhanh chóng. [Đúng]\nb) Nên công khai mật khẩu tài khoản lên trang cá nhân. [Sai]\nc) Có thể cài đặt quyền riêng tư cho bài đăng. [Đúng]\nd) Mọi đường link lạ gửi qua tin nhắn đều an toàn. [Sai]`}
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                            ></textarea>

                            {/* Live Automatic Detection Preview */}
                            <div className="border border-slate-200 rounded-xl bg-slate-50 p-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <ListChecks size={16} className="text-emerald-600" />
                                        Kết quả tự động nhận diện theo cú pháp:
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${syntaxDetectedQuestions.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                                        Đã nhận diện: {syntaxDetectedQuestions.length} câu hỏi
                                    </span>
                                </div>
                                {syntaxDetectedQuestions.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">
                                        {bulkText.trim()
                                            ? 'Chưa khớp cú pháp chuẩn (cần bắt đầu bằng "Câu 1:" hoặc "Tình huống 1:"). Nếu đây là văn bản tự do chưa chuẩn hóa, bạn có thể bấm sang "Chức năng 1: Dùng AI phân tích".'
                                            : 'Chưa có dữ liệu. Hãy dán văn bản theo cú pháp chuẩn vào ô trên để xem trước danh sách câu hỏi tự động nhận diện.'}
                                    </p>
                                ) : (
                                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                        {syntaxDetectedQuestions.map((q: any, idx: number) => {
                                            const typeLabel = q.questionType === 'true-false'
                                                ? 'Đúng/Sai (4 ý)'
                                                : q.questionType === 'short-answer'
                                                    ? 'Trả lời ngắn'
                                                    : q.questionType === 'essay' || q.category === 'essay'
                                                        ? 'Tự luận'
                                                        : q.questionType === 'multiple-answer'
                                                            ? 'Nhiều đáp án'
                                                            : '4 lựa chọn';
                                            return (
                                                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                            <span className="font-bold text-slate-900">Câu {idx + 1}</span>
                                                            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px]">
                                                                {q.level || 'NB'}{q.criteria ? ` - ${q.criteria}` : ''}
                                                            </span>
                                                            <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px]">
                                                                {typeLabel}
                                                            </span>
                                                            {q.answer && (
                                                                <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold text-[10px]">
                                                                    ĐA: {q.answer}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-700 truncate">{q.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* AI Sub-Tabs: Text vs PDF */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl max-w-sm">
                                <button
                                    type="button"
                                    onClick={() => setBulkTab('text')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${bulkTab === 'text' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Dán văn bản tự do (Ctrl+V)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkTab('pdf')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${bulkTab === 'pdf' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <FileText size={14} /> Tải file PDF đề thi
                                </button>
                            </div>

                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-3.5">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <p className="font-bold text-gray-800 text-xs mb-0.5">Phân tích câu hỏi thông minh bằng AI</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {bulkTab === 'pdf' 
                                                ? `Tải lên file PDF chứa đề thi hoặc danh sách bài tập. AI sẽ tự động đọc tài liệu PDF, bóc tách toàn bộ câu hỏi và lọc đúng nội dung bài "${lesson || '...'}"`
                                                : `Dán nội dung câu hỏi bất kỳ từ Word/PDF chưa chuẩn hóa. AI sẽ tự động phân tích câu hỏi, đáp án, mức độ và gắn vào bài "${lesson || '...'}"`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {bulkTab === 'text' ? (
                                <textarea 
                                    className="w-full h-60 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm shadow-inner"
                                    placeholder={`Dán nội dung câu hỏi tự do từ Word/PDF vào đây để AI phân tích và bóc tách...`}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                ></textarea>
                            ) : (
                                <div className="py-2">
                                    {!bulkPdf ? (
                                        <label className="border-2 border-dashed border-blue-200 hover:border-primary bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                                            <FileUp className="text-primary mb-3 group-hover:scale-110 transition-transform" size={40} />
                                            <span className="text-base font-bold text-gray-800">Chọn hoặc Kéo thả file PDF đề thi vào đây</span>
                                            <span className="text-xs text-gray-500 mt-1">Hỗ trợ file PDF lên đến 25MB</span>
                                            <input 
                                                type="file" 
                                                accept=".pdf,application/pdf" 
                                                className="hidden" 
                                                onChange={(e) => handlePdfFileChange(e, 'bulk')} 
                                            />
                                            <span className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm">
                                                Duyệt tệp PDF
                                            </span>
                                        </label>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-sm">
                                                    PDF
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{bulkPdf.name}</p>
                                                    <p className="text-xs text-blue-600 font-semibold">{bulkPdf.size} • Sẵn sàng để AI phân tích và bóc tách câu hỏi</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setBulkPdf(null)}
                                                className="p-2 hover:bg-blue-200 rounded-xl text-blue-800 transition-colors"
                                                title="Hủy file này"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-between items-center gap-3 bg-gray-50 shrink-0">
                    <div className="text-xs text-gray-500">
                        {bulkMode === 'syntax'
                            ? `Chế độ cú pháp chuẩn: Nhận diện trực tiếp ${syntaxDetectedQuestions.length} câu hỏi.`
                            : 'Chế độ AI: Sử dụng Gemini AI để đọc và phân tích dữ liệu tự do.'}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Hủy bỏ</button>
                        
                        {bulkMode === 'syntax' ? (
                            <button 
                                onClick={handleSyntaxDirectImport} 
                                disabled={syntaxDetectedQuestions.length === 0}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 cursor-pointer"
                            >
                                <CheckCircle2 size={18} />
                                Nhập ngay {syntaxDetectedQuestions.length > 0 ? `${syntaxDetectedQuestions.length} câu hỏi` : 'vào ngân hàng'}
                            </button>
                        ) : (
                            <button 
                                onClick={handleAIImport} 
                                disabled={isAnalyzing || (bulkTab === 'text' ? !bulkText.trim() : !bulkPdf)}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200 cursor-pointer"
                            >
                                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                {isAnalyzing ? 'AI đang phân tích & bóc tách...' : 'Bắt đầu dùng AI phân tích'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Alert Toast */}
      {alertMessage && (
          <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-up z-50 max-w-md">
              <AlertCircle size={24} className="text-yellow-400" />
              <p className="text-sm font-medium">{alertMessage}</p>
              <button onClick={() => setAlertMessage(null)} className="ml-auto text-gray-400 hover:text-white">
                  <X size={18} />
              </button>
          </div>
      )}

    </div>
  );
};

export default QuestionManager;
