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
  CheckSquare
} from 'lucide-react';
import { ExerciseQuestion } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { parseQuestionsWithAI, generateBulkQuestions, generateEssayRubric } from '../services/geminiService';
import { generateOfflineQuestions } from '../services/offlineQuestionGenerator';
import { loadQuestionBank, saveQuestionBank } from '../services/storage/questionBankStorage';
import { CurriculumMappingReview } from '../components/CurriculumMappingReview';
import { isQuestionForHskt } from '../utils';
import { 
  getMergedCriteria, 
  addCustomCriterion, 
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
  const result: ExerciseQuestion[] = [];
  questions.forEach(q => {
    // If it's a legacy true-false question with 4 sub-options (a, b, c, d)
    if (
      q.questionType === 'true-false' &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.some(opt => opt.id?.toLowerCase() === 'a' || opt.id?.toLowerCase() === 'b')
    ) {
      const baseStem = (q.content || '').trim().replace(/[:\.\s]+$/, '');
      q.options.forEach((opt, idx) => {
        const optText = (opt.text || '').trim();
        let statement = optText;
        if (baseStem && !optText.toLowerCase().startsWith(baseStem.toLowerCase())) {
          statement = `${baseStem}: ${optText}`;
        }
        result.push({
          ...q,
          id: `${q.id}_tf_${opt.id || idx}`,
          content: statement,
          questionType: 'true-false',
          category: 'mc',
          answer: opt.isCorrect ? 'Đúng' : 'Sai',
          options: [
            { id: 'Đúng', text: 'Đúng', isCorrect: !!opt.isCorrect },
            { id: 'Sai', text: 'Sai', isCorrect: !opt.isCorrect }
          ],
          points: 0.25
        });
      });
    } else {
      result.push(q);
    }
  });
  return result;
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
  const [bulkTab, setBulkTab] = useState<'text' | 'pdf'>('text');
  const [bulkPdf, setBulkPdf] = useState<{ name: string; size: string; base64: string } | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingRubricId, setLoadingRubricId] = useState<string | null>(null);

  // Generation Modal State
  const [genLevel, setGenLevel] = useState('NB');
  const [genCriteriaCode, setGenCriteriaCode] = useState('');
  const [genQuantity, setGenQuantity] = useState(1);
  const [genType, setGenType] = useState('multiple-choice');
  const [genPdf, setGenPdf] = useState<{ name: string; size: string; base64: string } | null>(null);

  // Custom criteria store synced with Matrix & Specification tables
  const [customCriteriaStore, setCustomCriteriaStore] = useState(() => loadCustomCriteriaStore());
  const [isAddingCustomCriterion, setIsAddingCustomCriterion] = useState(false);
  const [newCriterionLevel, setNewCriterionLevel] = useState('NB');
  const [newCriterionText, setNewCriterionText] = useState('');

  // Reload custom criteria whenever grade or lesson changes
  useEffect(() => {
    setCustomCriteriaStore(loadCustomCriteriaStore());
  }, [grade, lesson]);

  // Listen to storage events from MatrixView or other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CUSTOM_CRITERIA_STORAGE_KEY || e.key === 'matrixFileSystem') {
        setCustomCriteriaStore(loadCustomCriteriaStore());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Derived state for available lessons and merged criteria (curriculum + matrix custom levels)
  const availableLessons = grade ? CURRICULUM.lessonData[grade] : [];
  const currentCriteriaData = useMemo(() => {
    if (!grade || !lesson) return null;
    return getMergedCriteria(grade, lesson, customCriteriaStore);
  }, [grade, lesson, customCriteriaStore]);

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
    setAlertMessage(`Đã bổ sung YCCĐ cho mức độ ${newCriterionLevel === 'NB' ? 'Nhận biết' : newCriterionLevel === 'TH' ? 'Thông hiểu' : newCriterionLevel === 'VD' ? 'Vận dụng' : 'Vận dụng cao'}.`);
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

  // Lọc câu hỏi hiển thị theo Khối và Bài học hiện tại
  const filteredQuestions = useMemo(() => {
    if (!lesson) {
      if (!grade) return questions;
      return questions.filter(q => !q.grade || q.grade === grade);
    }
    return questions.filter(q => q.lesson === lesson && (!q.grade || !grade || q.grade === grade));
  }, [questions, grade, lesson]);

  // Stats
  const questionSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const lessonNumberMatch = lesson.match(/Bài (\d+)|(\d+\w)/);
    const lessonNumber = lessonNumberMatch ? (lessonNumberMatch[1] || lessonNumberMatch[2]) : null;
    
    filteredQuestions.forEach(q => {
      if (q.criteria && lessonNumber) {
        const key = `B${lessonNumber}-${q.level}-${q.criteria}`;
        summary[key] = (summary[key] || 0) + 1;
      }
    });
    return summary;
  }, [filteredQuestions, lesson]);

  // Handlers
  const handleAddQuestion = (type: 'mc' | 'essay') => {
    const newQuestion: ExerciseQuestion = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      category: type,
      level: 'NB',
      criteria: '',
      content: '',
      grade: grade || '',
      lesson: lesson || '',
      // MC defaults
      mcType: 'multiple-choice',
      options: [
        { id: 'A', text: '', isCorrect: false },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false },
      ],
      // Essay defaults
      essayType: 'explanation'
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof ExerciseQuestion, value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      return {
        ...q,
        [field]: value,
        grade: q.grade || grade || '',
        lesson: q.lesson || lesson || ''
      };
    }));
  };

  const handleUpdateOption = (qId: string, optId: string, field: 'text' | 'isCorrect', value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const newOptions = q.options?.map(opt => opt.id === optId ? { ...opt, [field]: value } : opt);
      let updatedAnswer = q.answer;
      if (field === 'isCorrect') {
        const correctIds = newOptions?.filter(o => o.isCorrect).map(o => o.id) || [];
        if (q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer') {
          updatedAnswer = correctIds.join(', ');
        } else if (q.questionType === 'multiple-choice' || !q.questionType) {
          updatedAnswer = correctIds[0] || '';
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
    const fillInTheBlankPattern = /\.{3,}|_{3,}/;
    
    if (lines.length === 1 && fillInTheBlankPattern.test(value)) {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, content: value, mcType: 'fill-blank' } : q));
        return;
    }

    if (lines.length >= 2) {
        const optionLines = lines.slice(1);
        const hasValidOption = optionLines.some(line => /^\s*\*?[A-Da-d][.)]/.test(line.trim()));
        
        if (hasValidOption) {
            const questionText = lines[0];
            const parsedOptions = [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false },
            ];
            
            optionLines.forEach((line, idx) => {
                if (idx < 4) {
                    const isCorrect = line.trim().startsWith('*');
                    let cleanText = line.trim();
                    if (isCorrect) cleanText = cleanText.substring(1).trim();
                    cleanText = cleanText.replace(/^[A-Da-d][.)]\s*/, '').trim();
                    
                    parsedOptions[idx].text = cleanText;
                    parsedOptions[idx].isCorrect = isCorrect;
                }
            });

            const correctCount = parsedOptions.filter(o => o.isCorrect).length;
            const mcType = correctCount > 1 ? 'multiple-answer' : 'multiple-choice';
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
      setGenType(section === 'essay' ? 'essay' : 'multiple-choice');
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

        const newQuestions: ExerciseQuestion[] = aiQuestions.map((q: any) => {
            const isMulti = q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer';
            const options = Array.isArray(q.options) && q.options.length > 0 ? q.options.map((opt: any, idx: number) => ({
                id: ['A', 'B', 'C', 'D'][idx] || idx.toString(),
                text: opt.text || '',
                isCorrect: opt.isCorrect || false
            })) : [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false },
            ];
            const correctAnswers = options.filter(o => o.isCorrect).map(o => o.id).join(', ');

            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                category: q.category || 'mc',
                questionType: q.questionType || (isMulti ? 'multiple-answer' : (q.category === 'essay' ? 'essay' : 'multiple-choice')),
                level: q.level || 'NB',
                criteria: q.criteria || '',
                content: q.content || '',
                grade: grade || '',
                lesson: lesson || '',
                mcType: isMulti ? 'multiple-answer' : (q.mcType || 'multiple-choice'),
                options: options,
                answer: q.answer || correctAnswers || '',
                essayType: 'explanation',
                originalNumber: q.criteria ? `${q.criteria}` : undefined
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
    } catch (error) {
        setAlertMessage("Đã xảy ra lỗi khi phân tích AI. Vui lòng thử lại.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGenerateQuestion = async () => {
      if (!grade || !lesson) {
          setAlertMessage("Vui lòng chọn Khối và Bài học trước.");
          return;
      }
      
      let criteriaText = lesson;
      if (currentCriteriaData && genCriteriaCode) {
          const list = currentCriteriaData[genLevel];
          const found = list?.find(c => c.startsWith(genCriteriaCode));
          if (found) criteriaText = found;
      }

      setIsGenerating(true);
      try {
          const results = await generateBulkQuestions(
              grade, 
              lesson, 
              genLevel, 
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
                  else if (genType === 'true-false') mcType = 'multiple-choice';
                  
                  let options = q.options;
                  if (genType === 'true-false') {
                      const isCorrect = q.answer === 'Sai' ? false : true;
                      options = [
                          { id: 'Đúng', text: 'Đúng', isCorrect: isCorrect },
                          { id: 'Sai', text: 'Sai', isCorrect: !isCorrect }
                      ];
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
                      ? (q.answer === 'Sai' ? 'Sai' : 'Đúng')
                      : options?.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ');

                  return {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    category: category,
                    level: genLevel,
                    criteria: genCriteriaCode,
                    content: q.content || 'Câu hỏi tự động',
                    grade: grade || '',
                    lesson: lesson || '',
                    questionType: genType === 'essay' ? 'essay' : genType as any,
                    mcType: mcType,
                    options: options,
                    answer: genType === 'true-false' ? (q.answer === 'Sai' ? 'Sai' : 'Đúng') : (q.answer || correctAnswers || ''),
                    essayType: 'explanation',
                    points: genType === 'essay' ? 1.0 : 0.25
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
              const fallbackResults = generateOfflineQuestions(grade || '7', lesson || 'Tin học', genLevel, criteriaText, genQuantity, genType);
              setQuestions(prev => [...prev, ...fallbackResults]);
              setAlertMessage(`Đã tạo thành công ${fallbackResults.length} câu hỏi chuẩn xác (Kích hoạt Bộ sinh Dự phòng GDPT 2018).`);
              setIsGenModalOpen(false);
          }
      } catch (error) {
          try {
              const fallbackResults = generateOfflineQuestions(grade || '7', lesson || 'Tin học', genLevel, criteriaText, genQuantity, genType);
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
              if (data.questions && Array.isArray(data.questions)) {
                  const incomingQuestions = data.questions as ExerciseQuestion[];
                  
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
                                        {currentCriteriaData && currentCriteriaData[q.level]?.map((c, i) => {
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
                                            handleUpdateQuestion(q.id, 'mcType', 'multiple-choice');
                                            const isCorrect = q.answer === 'Sai' ? false : true;
                                            handleUpdateQuestion(q.id, 'options', [
                                                { id: 'Đúng', text: 'Đúng', isCorrect },
                                                { id: 'Sai', text: 'Sai', isCorrect: !isCorrect }
                                            ]);
                                            handleUpdateQuestion(q.id, 'answer', isCorrect ? 'Đúng' : 'Sai');
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
                                    <option value="true-false">Trắc nghiệm Đúng / Sai (1 nhận định độc lập)</option>
                                    <option value="short-answer">Trắc nghiệm Trả lời ngắn (Phần III - 2025)</option>
                                    <option value="fill-blank">Điền khuyết từ</option>
                                </select>
                            </div>

                            <div className="mb-3">
                                <textarea 
                                    className="w-full p-3 border rounded-lg text-sm mb-2 focus:border-primary outline-none"
                                    rows={2}
                                    placeholder={q.questionType === 'true-false' ? "Nhập một nhận định hoàn chỉnh để học sinh xác định Đúng hoặc Sai..." : "Nhập nội dung câu hỏi..."}
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
                                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                                    <label className="block text-xs font-bold text-blue-900 mb-2">
                                        Xác định đáp án cho nhận định trên:
                                    </label>
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
                                        {currentCriteriaData && currentCriteriaData[q.level]?.map((c, i) => {
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
            <div className="flex flex-wrap items-center gap-4">
                <button 
                    onClick={handleJsonExportClick} 
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                    <FileOutput size={20} /> Xuất JSON
                </button>
                <label className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer">
                    <FileInput size={20} /> Nhập JSON
                    <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                </label>
                {filteredQuestions.length > 0 && (
                    <button 
                        type="button"
                        onClick={handleClearAllQuestions} 
                        className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-100 hover:border-rose-300 transition-all flex items-center gap-2 shadow-sm ml-auto"
                        title={lesson ? `Xóa sạch toàn bộ câu hỏi của bài "${lesson}"` : "Xóa toàn bộ câu hỏi hiện có trong danh sách"}
                    >
                        <Trash size={20} /> Xóa toàn bộ câu hỏi ({filteredQuestions.length})
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
                                                    return (
                                                    <li key={i} className="flex gap-2 items-start">
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
                                                        <span className={isChecked ? "font-semibold text-red-600" : ""}>{cleanText}</span>
                                                    </li>
                                                )})}
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
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Wand2 className="text-purple-600" /> Tạo câu hỏi bằng AI ({activeSection === 'mc' ? 'Trắc nghiệm' : 'Tự luận'})
                    </h3>
                    <button onClick={() => setIsGenModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
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
                        </select>
                         {/* Warning Block */}
                        {currentCriteriaData && (!currentCriteriaData[genLevel] || currentCriteriaData[genLevel].length === 0) && (
                             <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex gap-2 items-start">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Lưu ý:</strong> Bài "<strong>{lesson}</strong>" không có yêu cầu cần đạt cho mức độ này trong dữ liệu chương trình. AI sẽ tự suy luận nội dung.
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
                                    <option value="true-false">Trắc nghiệm Đúng / Sai (1 nhận định độc lập)</option>
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
                            {currentCriteriaData && currentCriteriaData[genLevel]?.map((c, i) => {
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
                            max="10" 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            value={genQuantity}
                            onChange={(e) => setGenQuantity(parseInt(e.target.value) || 1)}
                        />
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

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={() => setIsGenModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Hủy bỏ</button>
                    <button 
                        onClick={handleGenerateQuestion} 
                        disabled={isGenerating}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-70"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        Tạo ngay
                    </button>
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
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="text-primary" /> Nhập hàng loạt (AI Scan)
                    </h3>
                    <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Bulk Method Tabs */}
                    <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl max-w-sm">
                        <button
                            type="button"
                            onClick={() => setBulkTab('text')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${bulkTab === 'text' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Dán văn bản (Ctrl+V)
                        </button>
                        <button
                            type="button"
                            onClick={() => setBulkTab('pdf')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${bulkTab === 'pdf' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <FileText size={14} /> Tải file PDF đề thi
                        </button>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-4 mb-5">
                        <div className="flex items-start gap-3">
                            <Sparkles className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
                            <div>
                                <p className="font-bold text-gray-800 text-xs mb-0.5">Công nghệ phân tích câu hỏi tự động</p>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {bulkTab === 'pdf' 
                                        ? `Tải lên file PDF chứa đề thi hoặc danh sách bài tập. AI sẽ tự động đọc tài liệu PDF, bóc tách toàn bộ câu hỏi và lọc đúng nội dung bài "${lesson || '...'}"`
                                        : `Chỉ cần copy nội dung từ Word/PDF và dán vào dưới. AI sẽ tự động nhận diện câu hỏi, đáp án và lọc đúng bài "${lesson || '...'}"`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {bulkTab === 'text' ? (
                        <textarea 
                            className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm shadow-inner"
                            placeholder="Dán nội dung câu hỏi vào đây (Ctrl+V)..."
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                        ></textarea>
                    ) : (
                        <div className="py-4">
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

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Hủy bỏ</button>
                    
                    <button 
                        onClick={handleAIImport} 
                        disabled={isAnalyzing || (bulkTab === 'text' ? !bulkText.trim() : !bulkPdf)}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isAnalyzing ? 'Đang phân tích & bóc tách...' : 'Bắt đầu phân tích'}
                    </button>
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
