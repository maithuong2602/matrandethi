import React, { useState, useMemo } from 'react';
import { 
  FileSignature, 
  Info, 
  ListChecks, 
  PenTool, 
  ChartBar, 
  FileText, 
  Copy, 
  Rocket, 
  FileOutput, 
  FileInput, 
  Layers, 
  Plus, 
  Trash2, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { ExerciseQuestion } from '../types';
import { CURRICULUM } from '../data/curriculum';

const ExerciseCreator: React.FC = () => {
  const [grade, setGrade] = useState('');
  const [lesson, setLesson] = useState('');
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  
  // Modal & UI States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [outputContent, setOutputContent] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Derived state for available lessons and criteria
  const availableLessons = grade ? CURRICULUM.lessonData[grade] : [];
  const currentCriteriaData = (grade && lesson) ? CURRICULUM.criteriaData[grade]?.[lesson] : null;

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
        { id: '1', text: '', isCorrect: false },
        { id: '2', text: '', isCorrect: false },
        { id: '3', text: '', isCorrect: false },
        { id: '4', text: '', isCorrect: false },
      ],
      // Essay defaults
      essayType: 'explanation'
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof ExerciseQuestion, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateOption = (qId: string, optId: string, field: 'text' | 'isCorrect', value: any) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newOptions = q.options?.map(opt => opt.id === optId ? { ...opt, [field]: value } : opt);
      return { ...q, options: newOptions };
    }));
  };

  const handleContentChange = (id: string, value: string) => {
    // Smart parsing logic akin to the original HTML script
    const lines = value.split(/\r?\n/).filter(line => line.trim() !== '');
    const fillInTheBlankPattern = /\.{3,}|_{3,}/;
    
    // 1. Auto-detect fill-in-blank
    if (lines.length === 1 && fillInTheBlankPattern.test(value)) {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, content: value, mcType: 'fill-blank' } : q));
        return;
    }

    // 2. Auto-parse options if paste detected (Question + Options)
    if (lines.length >= 2) {
        const optionLines = lines.slice(1);
        const hasValidOption = optionLines.some(line => /^\s*\*?[A-Da-d][.)]/.test(line.trim()));
        
        if (hasValidOption) {
            const questionText = lines[0];
            const parsedOptions = [
                { id: '1', text: '', isCorrect: false },
                { id: '2', text: '', isCorrect: false },
                { id: '3', text: '', isCorrect: false },
                { id: '4', text: '', isCorrect: false },
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

    // Default behavior
    handleUpdateQuestion(id, 'content', value);
  };

  // Bulk Processing Logic
  const processBulkQuestions = () => {
    const existingQuestionMap = new Map();
    questions.forEach(q => {
      if (q.originalNumber) existingQuestionMap.set(q.originalNumber, q);
    });

    let rawText = bulkText;
    const answerMap = new Map();
    const answerKeyMarker = 'ANSWER KEYS';
    const answerKeyIndex = rawText.toUpperCase().indexOf(answerKeyMarker);

    if (answerKeyIndex !== -1) {
        const answerKeyText = rawText.substring(answerKeyIndex + answerKeyMarker.length);
        const answerLines = answerKeyText.split('\n');
        answerLines.forEach(line => {
            const parts = line.match(/^\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s*[:.]\s*(.*)/);
            if (parts) {
                let cleanAnswer = parts[2].trim().replace(/^\*?[A-Da-d][.)]\s*/, '').trim();
                answerMap.set(parts[1], cleanAnswer);
            }
        });
        rawText = rawText.substring(0, answerKeyIndex);
    }

    const questionBlocks = rawText.split(/\n\s*\n/);
    let addCount = 0;
    let updateCount = 0;
    const newQuestions: ExerciseQuestion[] = [...questions];

    questionBlocks.forEach(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return;

        const lines = trimmedBlock.split('\n');
        let headerLine = lines[0];
        let optionLines = lines.slice(1);
        let criteria = "", level = "", content = "", originalQuestionNumber = "";

        const headerRegex = /^(?:Câu\s*)?([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s*\((NB|TH|VD|VDC)\)[:.]?\s*(.*)/;
        const match = headerLine.match(headerRegex);

        if (match) {
            originalQuestionNumber = match[1];
            level = match[2];
            content = match[3].trim();
            const numberParts = originalQuestionNumber.split('.');
            if (numberParts.length >= 2) {
                criteria = `${numberParts[0]}.${numberParts[1]}`;
            }
        } else {
            return; // Skip invalid format
        }
        
        const isFillInTheBlank = /_{3,}|\.{3,}/.test(content) || (optionLines.length === 0 && answerMap.has(originalQuestionNumber));
        const correctOptionCount = optionLines.filter(line => line.trim().startsWith('*')).length;
        
        let mcType: any = 'multiple-choice';
        if (isFillInTheBlank) mcType = 'fill-blank';
        else if (correctOptionCount > 1) mcType = 'multiple-answer';

        const parsedOptions = optionLines.map((line, idx) => {
             const isCorrect = line.trim().startsWith('*');
             let cleanText = line.trim();
             if (isCorrect) cleanText = cleanText.substring(1).trim();
             cleanText = cleanText.replace(/^[A-Da-d][.)]\s*/, '').trim();
             return { id: (idx + 1).toString(), text: cleanText, isCorrect };
        });

        if (mcType !== 'fill-blank' && parsedOptions.length < 4) {
            for(let i = parsedOptions.length; i < 4; i++) {
                parsedOptions.push({ id: (i + 1).toString(), text: '', isCorrect: false });
            }
        }

        const questionData: ExerciseQuestion = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: 'mc',
            level,
            criteria,
            content,
            mcType,
            options: parsedOptions,
            answer: answerMap.get(originalQuestionNumber) || '',
            originalNumber: originalQuestionNumber
        };

        const existingIndex = newQuestions.findIndex(q => q.originalNumber === originalQuestionNumber);
        if (existingIndex !== -1) {
             newQuestions[existingIndex] = { ...questionData, id: newQuestions[existingIndex].id };
             updateCount++;
        } else {
             newQuestions.push(questionData);
             addCount++;
        }
    });

    setQuestions(newQuestions);
    setAlertMessage(`Hoàn tất! Thêm mới: ${addCount}, Cập nhật: ${updateCount}`);
    setIsBulkModalOpen(false);
    setBulkText('');
  };

  const generateDocument = () => {
    if (!lesson) {
        setAlertMessage("Vui lòng chọn bài học.");
        return;
    }
    
    let docContent = `${lesson}\n\n`;
    let mcContent = "Phần 1. Trắc nghiệm\n";
    let essayContent = "Phần 2. Tự luận\n";
    let answerKeys = "ANSWER KEYS\n";
    const criteriaCounter: Record<string, number> = {};

    const getQuestionNumber = (criteria: string, index: number) => {
        if (criteria) {
            criteriaCounter[criteria] = (criteriaCounter[criteria] || 0) + 1;
            return `${criteria}.${criteriaCounter[criteria]}`;
        }
        return `(Chưa có tiêu chí ${index + 1})`;
    };

    const mcQuestions = questions.filter(q => q.category === 'mc');
    const essayQuestions = questions.filter(q => q.category === 'essay');

    mcQuestions.forEach((q, idx) => {
        const qNum = getQuestionNumber(q.criteria, idx);
        mcContent += `Câu ${qNum} (${q.level}): ${q.content}\n`;
        
        if (q.mcType === 'fill-blank') {
            if (q.answer) answerKeys += `${qNum}. ${q.answer}\n`;
        } else {
            const correctLetters: string[] = [];
            q.options?.forEach((opt, optIdx) => {
                if (!opt.text) return;
                const letter = q.mcType === 'multiple-answer' 
                    ? String.fromCharCode(97 + optIdx) // a, b, c
                    : String.fromCharCode(65 + optIdx); // A, B, C
                
                if (opt.isCorrect) correctLetters.push(letter);
                
                const prefix = q.mcType === 'multiple-answer' ? `${letter})` : `${letter}.`;
                mcContent += `${opt.isCorrect ? '*' : ''}${prefix} ${opt.text}\n`;
            });

            if (correctLetters.length > 0) {
                 answerKeys += `${qNum}. ${correctLetters.join(', ')}\n`;
            }
        }
        mcContent += '\n';
    });

    essayQuestions.forEach((q, idx) => {
        const qNum = getQuestionNumber(q.criteria, idx);
        essayContent += `Câu ${qNum} (${q.level}):\n${q.content}\n\n`;
    });

    if (mcQuestions.length > 0) docContent += mcContent + "\n";
    if (mcQuestions.some(q => q.mcType === 'fill-blank' || q.options?.some(o => o.isCorrect))) docContent += answerKeys + "\n";
    if (essayQuestions.length > 0) docContent += essayContent;

    setOutputContent(docContent);
    setShowOutput(true);
    setTimeout(() => document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleJsonExport = () => {
     const data = {
         info: { grade, lesson },
         questions
     };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${lesson.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'bai_tap'}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (data.info) {
                  setGrade(data.info.grade);
                  setLesson(data.info.lesson);
              }
              if (data.questions) {
                  setQuestions(data.questions);
                  setAlertMessage("Nhập dữ liệu thành công!");
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
          Tạo Bài Tập Theo Định Dạng
        </h1>
        <p className="text-gray-500 mt-2">Hệ thống tạo file Word hoàn chỉnh với mã nhận thức và tiêu chí cụ thể.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
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
                                <select 
                                    className="p-2 text-sm border rounded"
                                    value={q.criteria}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'criteria', e.target.value)}
                                >
                                    <option value="">-- Chọn tiêu chí --</option>
                                    {currentCriteriaData && currentCriteriaData[q.level]?.map((c, i) => {
                                        const code = c.split(' ')[0];
                                        return <option key={i} value={code}>{c}</option>
                                    })}
                                </select>
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

                            <textarea 
                                className="w-full p-3 border rounded-lg text-sm mb-3 focus:border-primary outline-none"
                                rows={2}
                                placeholder="Nhập nội dung câu hỏi..."
                                value={q.content}
                                onChange={(e) => handleContentChange(q.id, e.target.value)}
                            />

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
                                            <input 
                                                type="text" 
                                                className="flex-1 p-2 border rounded text-sm"
                                                placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
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
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Layers size={16} /> Nhập hàng loạt
                    </button>
                </div>
            </div>

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
                                <select 
                                    className="p-2 text-sm border rounded"
                                    value={q.criteria}
                                    onChange={(e) => handleUpdateQuestion(q.id, 'criteria', e.target.value)}
                                >
                                    <option value="">-- Chọn tiêu chí --</option>
                                     {currentCriteriaData && currentCriteriaData[q.level]?.map((c, i) => {
                                        const code = c.split(' ')[0];
                                        return <option key={i} value={code}>{c}</option>
                                    })}
                                </select>
                            </div>
                            <textarea 
                                className="w-full p-3 border rounded-lg text-sm focus:border-primary outline-none"
                                rows={3}
                                placeholder="Nhập nội dung câu hỏi tự luận..."
                                value={q.content}
                                onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                 <div className="mt-4">
                    <button 
                        onClick={() => handleAddQuestion('essay')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Thêm câu tự luận
                    </button>
                </div>
            </div>
            
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

            <div className="flex flex-wrap gap-4">
                <button onClick={generateDocument} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-600/20">
                    <Rocket size={20} /> Tạo Tài Liệu
                </button>
                <button onClick={handleJsonExport} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20">
                    <FileOutput size={20} /> Xuất JSON
                </button>
                <label className="px-6 py-3 bg-blue-400 text-white rounded-xl font-medium hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-400/20 cursor-pointer">
                    <FileInput size={20} /> Nhập JSON
                    <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                </label>
            </div>

            {showOutput && (
                <div id="output-section" className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-fade-in-up">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <FileText size={20} /> Nội dung tài liệu
                    </h3>
                    <textarea 
                        className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:outline-none"
                        value={outputContent}
                        readOnly
                    />
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(outputContent);
                                setAlertMessage("Đã sao chép nội dung!");
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <Copy size={16} /> Sao chép nội dung
                        </button>
                    </div>
                </div>
            )}
        </div>

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

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="text-primary" /> Nhập hàng loạt
                    </h3>
                    <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                        <p className="font-bold mb-2 flex items-center gap-2"><Info size={16}/> Định dạng mẫu:</p>
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded border border-blue-100">
{`Câu 1.1.1 (NB): Nội dung câu hỏi...
*A. Đáp án đúng
B. Đáp án sai
C. Đáp án sai
D. Đáp án sai`}
                        </pre>
                        <p className="mt-2 text-xs">Hỗ trợ tự động nhận diện điền khuyết (dùng ANSWER KEYS ở cuối) và nhiều đáp án đúng.</p>
                    </div>

                    <textarea 
                        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
                        placeholder="Dán danh sách câu hỏi của bạn vào đây..."
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                    ></textarea>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Hủy bỏ</button>
                    <button onClick={processBulkQuestions} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center gap-2">
                        <Check size={18} /> Xử lý & Nhập
                    </button>
                </div>
            </div>
        </div>
      )}

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

export default ExerciseCreator;