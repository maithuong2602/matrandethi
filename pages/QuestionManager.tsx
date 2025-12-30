import React, { useState, useMemo } from 'react';
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
  Check, 
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Wand2,
  Image as ImageIcon,
  BookOpenCheck,
  AlertTriangle
} from 'lucide-react';
import { ExerciseQuestion } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { parseQuestionsWithAI, generateBulkQuestions, generateEssayRubric } from '../services/geminiService';

const QuestionManager: React.FC = () => {
  const [grade, setGrade] = useState('');
  const [lesson, setLesson] = useState('');
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  
  // Modal & UI States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<ExerciseQuestion[][]>([]);
  const [pendingAction, setPendingAction] = useState<'export_json' | null>(null); // Track action after duplicate check

  const [activeSection, setActiveSection] = useState<'mc' | 'essay'>('mc');

  const [bulkText, setBulkText] = useState('');
  // Removed showOutput, outputContent states
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingRubricId, setLoadingRubricId] = useState<string | null>(null);

  // Generation Modal State
  const [genLevel, setGenLevel] = useState('NB');
  const [genCriteriaCode, setGenCriteriaCode] = useState('');
  const [genQuantity, setGenQuantity] = useState(1);
  const [genType, setGenType] = useState('multiple-choice');

  // Derived state for available lessons and criteria
  const availableLessons = grade ? CURRICULUM.lessonData[grade] : [];
  const currentCriteriaData = (grade && lesson) ? CURRICULUM.criteriaData[grade]?.[lesson] : null;

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

  // Stats
  const questionSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    const lessonNumberMatch = lesson.match(/Bài (\d+)|(\d+\w)/);
    const lessonNumber = lessonNumberMatch ? (lessonNumberMatch[1] || lessonNumberMatch[2]) : null;
    
    questions.forEach(q => {
      if (q.criteria && lessonNumber) {
        const key = `B${lessonNumber}-${q.level}-${q.criteria}`;
        summary[key] = (summary[key] || 0) + 1;
      }
    });
    return summary;
  }, [questions, lesson]);

  // Handlers
  const handleAddQuestion = (type: 'mc' | 'essay') => {
    const newQuestion: ExerciseQuestion = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      category: type,
      level: 'NB',
      criteria: '',
      content: '',
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
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof ExerciseQuestion, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateOption = (qId: string, optId: string, field: 'text' | 'isCorrect', value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const newOptions = q.options?.map(opt => opt.id === optId ? { ...opt, [field]: value } : opt);
      return { ...q, options: newOptions };
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

            setQuestions(prev => prev.map(q => q.id === id ? { 
                ...q, 
                content: questionText, 
                options: parsedOptions,
                mcType
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
          const rubric = await generateEssayRubric(q.content);
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

  const handleAIImport = async () => {
    if (!bulkText.trim()) {
        setAlertMessage("Vui lòng nhập nội dung để phân tích.");
        return;
    }
    
    if (!grade || !lesson) {
        setAlertMessage("Vui lòng chọn Khối và Bài học trước khi phân tích AI để đảm bảo lọc đúng nội dung bài.");
        return;
    }
    
    setIsAnalyzing(true);
    try {
        const aiQuestions = await parseQuestionsWithAI(bulkText, grade, lesson);
        
        if (aiQuestions.length === 0) {
            setAlertMessage("Không tìm thấy câu hỏi phù hợp với bài học đã chọn hoặc lỗi định dạng.");
            return;
        }

        const newQuestions: ExerciseQuestion[] = aiQuestions.map((q: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: q.category || 'mc',
            level: q.level || 'NB',
            criteria: q.criteria || '',
            content: q.content || '',
            mcType: q.mcType || 'multiple-choice',
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map((opt: any, idx: number) => ({
                id: ['A', 'B', 'C', 'D'][idx] || idx.toString(),
                text: opt.text || '',
                isCorrect: opt.isCorrect || false
            })) : [
                { id: 'A', text: '', isCorrect: false },
                { id: 'B', text: '', isCorrect: false },
                { id: 'C', text: '', isCorrect: false },
                { id: 'D', text: '', isCorrect: false },
            ],
            answer: q.answer || '',
            essayType: 'explanation',
            originalNumber: q.criteria ? `${q.criteria}` : undefined
        }));

        let skippedCount = 0;
        const uniqueQuestions = newQuestions.filter(nq => {
            const isDup = checkDuplicateBeforeAdd(questions, nq.content);
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
          const results = await generateBulkQuestions(grade, lesson, genLevel, criteriaText, genQuantity, genType);
          
          if (results && results.length > 0) {
              const newQuestions: ExerciseQuestion[] = results.map((q: any) => {
                  const category = (q.category === 'essay' || genType === 'essay') ? 'essay' : 'mc';
                  let mcType: any = 'multiple-choice';
                  if (genType === 'fill-blank') mcType = 'fill-blank';
                  else if (genType === 'true-false') mcType = 'multiple-answer';
                  
                  let options = q.options;
                  if (category === 'mc' && (!options || options.length === 0)) {
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

                  return {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    category: category,
                    level: genLevel,
                    criteria: genCriteriaCode,
                    content: q.content || 'Câu hỏi tự động',
                    mcType: mcType,
                    options: options,
                    answer: q.answer || '',
                    essayType: 'explanation'
                  };
              });

              let skippedCount = 0;
              const uniqueQuestions = newQuestions.filter(nq => {
                  const isDup = checkDuplicateBeforeAdd(questions, nq.content);
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
              setAlertMessage("Không thể tạo câu hỏi. Vui lòng thử lại.");
          }
      } catch (error) {
          setAlertMessage("Lỗi kết nối AI: " + (error as Error).message);
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
     // 1. Validate Criteria (Existing logic)
     const questionsMissingCriteria = questions.filter(q => !q.criteria);
     if (questionsMissingCriteria.length > 0) {
         const confirmExport = window.confirm(
             `Cảnh báo: Có ${questionsMissingCriteria.length} câu hỏi chưa được gán "Tiêu chí".\n\n` +
             `Dữ liệu thiếu tiêu chí sẽ không thể sử dụng để xây dựng ma trận đề thi chính xác sau này.\n\n` +
             `Bạn có chắc chắn muốn tiếp tục xuất file không?`
         );
         if (!confirmExport) return;
     }

     // 2. Check Duplicates (Fuzzy Match) - NEW LOGIC
     const duplicates = findDuplicates(questions);
     if (duplicates.length > 0) {
         setDuplicateGroups(duplicates);
         setPendingAction('export_json'); // Set intent
         setIsDuplicateModalOpen(true);
     } else {
         performJsonExport(questions);
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
                  if (!grade) setGrade(data.info.grade);
                  if (!lesson) setLesson(data.info.lesson);
              }
              if (data.questions && Array.isArray(data.questions)) {
                  const incomingQuestions = data.questions as ExerciseQuestion[];
                  
                  const newUnique: ExerciseQuestion[] = [];
                  const newDuplicate: ExerciseQuestion[] = [];

                  incomingQuestions.forEach(newQ => {
                      if (checkDuplicateBeforeAdd(questions, newQ.content)) {
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
                      const processedQuestions = finalToAdd.map(q => ({
                          ...q,
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
          <FileSignature size={36} />
          Tạo Bài Tập / Quản Lý Câu Hỏi
        </h1>
        <p className="text-gray-500 mt-2">Hệ thống tạo file Word hoàn chỉnh với mã nhận thức và tiêu chí cụ thể.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* General Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <Info size={20} /> THÔNG TIN CHUNG
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                        <select 
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
                         <label className="block text-sm font-medium text-gray-700 mb-1">Bài</label>
                        <select 
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
                <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <ListChecks size={20} /> PHẦN 1: TRẮC NGHIỆM
                </h2>
                
                <div className="space-y-6">
                    {questions.filter(q => q.category === 'mc').map((q, idx) => (
                        <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative group">
                            <button 
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                            <h3 className="font-medium text-gray-800 mb-3 text-sm">Câu hỏi {idx + 1}</h3>
                            
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
                                    className="p-2 text-sm border rounded"
                                    value={q.mcType}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'mcType', e.target.value)}
                                >
                                    <option value="multiple-choice">1 Đáp án đúng</option>
                                    <option value="multiple-answer">Nhiều đáp án</option>
                                    <option value="fill-blank">Điền khuyết</option>
                                </select>
                            </div>

                            <div className="mb-3">
                                <textarea 
                                    className="w-full p-3 border rounded-lg text-sm mb-2 focus:border-primary outline-none"
                                    rows={2}
                                    placeholder="Nhập nội dung câu hỏi..."
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

                            {q.mcType !== 'fill-blank' ? (
                                <div className="space-y-2">
                                    {q.options?.map((opt, optIdx) => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={opt.isCorrect}
                                                onChange={(e) => handleUpdateOption(q.id, opt.id, 'isCorrect', e.target.checked)}
                                                className="w-4 h-4 text-primary accent-primary cursor-pointer"
                                            />
                                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-bold text-gray-600">
                                                {opt.id}
                                            </div>
                                            <input 
                                                type="text" 
                                                className="flex-1 p-2 border rounded text-sm"
                                                placeholder={`Lựa chọn ${opt.id}`}
                                                value={opt.text}
                                                onChange={(e) => handleUpdateOption(q.id, opt.id, 'text', e.target.value)}
                                            />
                                        </div>
                                    ))}
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
                    ))}
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
                <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <PenTool size={20} /> PHẦN 2: TỰ LUẬN
                </h2>
                 <div className="space-y-6">
                    {questions.filter(q => q.category === 'essay').map((q, idx) => (
                        <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                             <button 
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                            <h3 className="font-medium text-gray-800 mb-3 text-sm">Câu tự luận {idx + 1}</h3>
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
                    ))}
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
            <div className="flex flex-wrap gap-4">
                <button onClick={handleJsonExportClick} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20">
                    <FileOutput size={20} /> Xuất JSON
                </button>
                <label className="px-6 py-3 bg-blue-400 text-white rounded-xl font-medium hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-400/20 cursor-pointer">
                    <FileInput size={20} /> Nhập JSON
                    <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                </label>
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
                                {['NB', 'TH', 'VD', 'VDC'].map(level => {
                                    const criteriaList = currentCriteriaData[level];
                                    if (!criteriaList) return null;
                                    const levelName = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' }[level];
                                    return (
                                        <div key={level}>
                                            <h4 className="text-sm font-bold text-primary mb-2 bg-blue-50 p-1.5 rounded inline-block">{levelName}</h4>
                                            <ul className="text-xs text-gray-700 space-y-2 list-disc pl-4 leading-relaxed">
                                                {criteriaList.map((c, i) => (
                                                    <li key={i}>{c.replace(/^\d+\.\d+\s/, '')}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm italic">Không có dữ liệu đặc tả cho bài này.</p>
                        )
                    )}
                </div>
            </div>
        </aside>
      </div>

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
                                    <option value="multiple-choice">Trắc nghiệm (4 lựa chọn)</option>
                                    <option value="true-false">Trắc nghiệm (Nhiều đáp án đúng)</option>
                                    <option value="fill-blank">Điền khuyết</option>
                                </>
                            ) : (
                                <option value="essay">Tự luận</option>
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
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                        AI sẽ tạo <strong>{genQuantity}</strong> câu hỏi dựa trên nội dung bài <strong>"{lesson}"</strong> và cấu hình đã chọn.
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
                        <p>Hệ thống phát hiện <strong>{duplicateGroups.length}</strong> nhóm câu hỏi có nội dung giống nhau hoặc <strong>gần giống (>85%)</strong> trong danh sách hiện tại (do nhập thủ công hoặc chỉnh sửa).</p>
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
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-5 mb-6">
                        <div className="flex items-start gap-3">
                            <Sparkles className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-bold text-gray-800 mb-1">Công nghệ phân tích thông minh</p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Chỉ cần copy toàn bộ nội dung từ file Word, PDF hoặc website và dán vào bên dưới.
                                    Hệ thống sẽ tự động:
                                </p>
                                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1 ml-1">
                                    <li>Nhận diện câu hỏi trắc nghiệm, tự luận và đáp án.</li>
                                    <li><strong>Tự động lọc</strong> và chỉ lấy các câu hỏi thuộc nội dung bài <strong>"{lesson || '...'}"</strong>.</li>
                                    <li>Phân loại mức độ nhận thức (NB, TH, VD, VDC) dựa trên ngữ cảnh.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <textarea 
                        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm shadow-inner"
                        placeholder="Dán nội dung câu hỏi vào đây (Ctrl+V)..."
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                    ></textarea>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Hủy bỏ</button>
                    
                    <button 
                        onClick={handleAIImport} 
                        disabled={isAnalyzing || !bulkText.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isAnalyzing ? 'Đang phân tích & lọc...' : 'Bắt đầu phân tích'}
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