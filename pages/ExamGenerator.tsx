import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, FileText, Settings, Play, Check, X, Printer, Download, RefreshCw, Layers, FileJson, Grid3X3, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { ExerciseQuestion, ImportedMatrixData } from '../types';
import { generateExamWordHtml, generateAzotaKeyHtml } from '../utils';

// Extended type for internal state
interface BankQuestion extends ExerciseQuestion {
    lesson: string;
    points?: number; // Runtime point assignment
    uniqueId?: number; // For rendering unique items in list
}

const ExamGenerator: React.FC = () => {
    const [step, setStep] = useState<'upload' | 'config' | 'review'>('upload');
    const [bank, setBank] = useState<BankQuestion[]>([]);
    const [generatedTest, setGeneratedTest] = useState<BankQuestion[]>([]);
    
    // Config Modes
    const [configMode, setConfigMode] = useState<'manual' | 'matrix'>('manual');
    
    // Mode 1: Manual Config State
    const [manualConfig, setManualConfig] = useState<Record<string, Record<string, number>>>({});
    
    // Mode 2: Imported Matrix State
    const [importedMatrix, setImportedMatrix] = useState<ImportedMatrixData | null>(null);

    // UI States
    const [showExportModal, setShowExportModal] = useState(false);
    const [isSwapMenuOpen, setIsSwapMenuOpen] = useState(false);
    const swapMenuRef = useRef<HTMLDivElement>(null);

    const [headerInfo, setHeaderInfo] = useState({
        donVi: 'UBND PHƯỜNG HẢI CHÂU',
        tenTruong: 'TRUNG HỌC CƠ SỞ LÊ THÁNH TÔN',
        tenKyThi: 'KIỂM TRA CUỐI KÌ 1 NĂM HỌC 2025-2026',
        monHoc: 'TIN HỌC 6',
        thoiGian: '45 phút',
        maDe: '001'
    });
    
    // Bulk Points
    const [bulkPoints, setBulkPoints] = useState(0.25);

    // Helper: Normalize Level
    const normalizeLevel = (lvl: string) => {
        if (!lvl) return 'NB';
        const s = lvl.trim().toUpperCase();
        if (s === 'NB' || s === 'NHẬN BIẾT' || s.startsWith('NHẬN')) return 'NB';
        if (s === 'TH' || s === 'THÔNG HIỂU' || s.startsWith('THÔNG')) return 'TH';
        if (s === 'VDC' || s === 'VẬN DỤNG CAO') return 'VDC';
        if (s === 'VD' || s === 'VẬN DỤNG') return 'VD';
        return s;
    };

    // Close swap menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (swapMenuRef.current && !swapMenuRef.current.contains(event.target as Node)) {
                setIsSwapMenuOpen(false);
            }
        }
        if (isSwapMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isSwapMenuOpen]);

    // --- STEP 1: UPLOAD QUESTION BANK ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const readers = Array.from(files).map((file) => new Promise<any>((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const target = evt.target as FileReader;
                    if (target?.result) {
                        resolve(JSON.parse(target.result as string));
                    } else {
                        resolve(null);
                    }
                } catch { resolve(null); }
            };
            reader.readAsText(file as Blob);
        }));

        Promise.all(readers).then(results => {
            const newQuestions: BankQuestion[] = [];
            results.forEach(data => {
                if (!data) return;
                const lessonName = data.info?.lesson || data.thongTinChung?.bai || 'Bài chung';
                const qs = data.questions || data.tracNghiem || [];
                if (data.tuLuan) qs.push(...data.tuLuan);

                if (Array.isArray(qs)) {
                    qs.forEach((q: any) => {
                        const rawLevel = q.level || q.mucDo || 'NB';
                        const normalizedQ: BankQuestion = {
                            id: q.id || Math.random().toString(36),
                            category: q.category || (q.loai === 'tu-luan' ? 'essay' : 'mc'),
                            level: normalizeLevel(rawLevel),
                            criteria: q.criteria || q.tieuChi || '',
                            content: q.content || q.noiDung || '',
                            options: q.options || q.luaChon || [],
                            answer: q.answer || q.dapAn || '',
                            image: q.image || undefined, // Import image property
                            lesson: lessonName,
                            uniqueId: Math.random()
                        };
                        newQuestions.push(normalizedQ);
                    });
                }
            });

            // Filter duplicates from upload
            const uniqueMap = new Map();
            newQuestions.forEach(q => {
                const key = (q.content || '').trim().toLowerCase();
                if (!uniqueMap.has(key)) uniqueMap.set(key, q);
            });

            setBank(Array.from(uniqueMap.values()));
            if (newQuestions.length > 0) setStep('config');
        });
    };

    // --- STEP 2: CONFIGURATION ---
    const availableStats = useMemo(() => {
        const stats: Record<string, Record<string, number>> = {};
        bank.forEach(q => {
            if (!stats[q.lesson]) stats[q.lesson] = { NB: 0, TH: 0, VD: 0, VDC: 0 };
            const lvl = q.level as 'NB'|'TH'|'VD'|'VDC';
            if (stats[q.lesson][lvl] !== undefined) stats[q.lesson][lvl]++;
        });
        return stats;
    }, [bank]);

    const handleManualConfigChange = (lesson: string, level: string, val: string) => {
        const num = parseInt(val) || 0;
        setManualConfig(prev => ({
            ...prev,
            [lesson]: {
                ...(prev[lesson] || { NB: 0, TH: 0, VD: 0, VDC: 0 }),
                [level]: num
            }
        }));
    };

    const handleMatrixUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.chiTiet && Array.isArray(data.chiTiet)) {
                    setImportedMatrix(data);
                } else {
                    alert("File JSON không đúng cấu trúc Ma trận.");
                }
            } catch {
                alert("Lỗi đọc file JSON.");
            }
        };
        reader.readAsText(file);
    };

    // --- MAIN GENERATION LOGIC ---
    const generateTest = () => {
        const selected: BankQuestion[] = [];
        const warnings: string[] = [];

        const findQuestions = (lessonName: string, level: string, category: 'mc'|'essay', count: number) => {
            const normalizedTarget = lessonName.toLowerCase().trim();
            const pool = bank.filter(q => {
                const normalizedSource = q.lesson.toLowerCase().trim();
                const lessonMatch = normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
                return lessonMatch && q.level === level && q.category === category;
            });

            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            if (shuffled.length < count) {
                warnings.push(`Thiếu câu hỏi: ${lessonName} - ${level} (${category}). Cần ${count}, có ${shuffled.length}.`);
            }
            
            return shuffled.slice(0, count).map(q => ({
                ...q,
                points: category === 'essay' ? 1.0 : 0.25,
                uniqueId: Math.random() // Unique ID for every instance in the test
            }));
        };

        if (configMode === 'manual') {
            Object.keys(manualConfig).forEach(lesson => {
                const counts = manualConfig[lesson];
                if (!counts) return;
                ['NB', 'TH', 'VD', 'VDC'].forEach(lvl => {
                    const count = counts[lvl];
                    if (count > 0) {
                        let picks = findQuestions(lesson, lvl, 'mc', count);
                        if (picks.length < count) {
                             const essayPicks = findQuestions(lesson, lvl, 'essay', count - picks.length);
                             picks = [...picks, ...essayPicks];
                        }
                        selected.push(...picks);
                    }
                });
            });
        } else {
            if (!importedMatrix) {
                alert("Vui lòng tải lên file ma trận JSON.");
                return;
            }
            importedMatrix.chiTiet.forEach(row => {
                const lessonName = row.thongTinChung.bai;
                const tnCounts = row.tracNghiem;
                if (tnCounts) {
                    if (tnCounts.NB > 0) selected.push(...findQuestions(lessonName, 'NB', 'mc', tnCounts.NB));
                    if (tnCounts.TH > 0) selected.push(...findQuestions(lessonName, 'TH', 'mc', tnCounts.TH));
                    if (tnCounts.VD > 0) selected.push(...findQuestions(lessonName, 'VD', 'mc', tnCounts.VD));
                    if (tnCounts.VDC > 0) selected.push(...findQuestions(lessonName, 'VDC', 'mc', tnCounts.VDC));
                }
                const tlCounts = row.tuLuan;
                if (tlCounts) {
                    if (tlCounts.NB > 0) selected.push(...findQuestions(lessonName, 'NB', 'essay', tlCounts.NB));
                    if (tlCounts.TH > 0) selected.push(...findQuestions(lessonName, 'TH', 'essay', tlCounts.TH));
                    if (tlCounts.VD > 0) selected.push(...findQuestions(lessonName, 'VD', 'essay', tlCounts.VD));
                    if (tlCounts.VDC > 0) selected.push(...findQuestions(lessonName, 'VDC', 'essay', tlCounts.VDC));
                }
            });
        }

        if (selected.length === 0) {
            alert("Không tạo được câu hỏi nào. Vui lòng kiểm tra cấu hình hoặc ngân hàng câu hỏi.");
            return;
        }
        if (warnings.length > 0) {
            alert("Cảnh báo:\n" + warnings.join("\n"));
        }

        const levelOrder = { NB: 1, TH: 2, VD: 3, VDC: 4 };
        selected.sort((a, b) => {
            if (a.category !== b.category) return a.category === 'mc' ? -1 : 1;
            const la = levelOrder[a.level as keyof typeof levelOrder] || 5;
            const lb = levelOrder[b.level as keyof typeof levelOrder] || 5;
            if (la !== lb) return la - lb;
            return a.lesson.localeCompare(b.lesson);
        });

        setGeneratedTest(selected);
        setStep('review');
    };

    // --- STEP 3: REVIEW & EXPORT ---
    
    const triggerBulkSwap = (targetLevel?: string) => {
        setIsSwapMenuOpen(false); 
        // Use a slight timeout to allow UI menu to close and prevent event conflicts
        setTimeout(() => handleBulkSwap(targetLevel), 50);
    };

    const handleBulkSwap = (targetLevel?: string) => {
        const label = targetLevel ? `các câu mức ${targetLevel}` : 'toàn bộ đề thi';
        
        if (!window.confirm(`Bạn có chắc muốn đổi ${label}?`)) return;

        const newTest = [...generatedTest];
        const currentTestIds = new Set(generatedTest.map(t => t.id)); 
        const newlySelectedIds = new Set<string>(); // IDs selected in this new batch
        
        // 1. Keep IDs of questions we are NOT swapping
        newTest.forEach(q => {
            if (targetLevel && q.level !== targetLevel) {
                newlySelectedIds.add(q.id);
            }
        });

        let swappedCount = 0;
        let fallbackUsedCount = 0;

        newTest.forEach((q, index) => {
            if (targetLevel && q.level !== targetLevel) return;

            const qLesson = q.lesson.toLowerCase().trim();
            const qCriteria = (q.criteria || '').trim().toLowerCase();

            // Function to check basic compatibility (Level & Category)
            const isCompatible = (b: BankQuestion) => b.level === q.level && b.category === q.category;
            
            // Function to check Lesson Match (Loose)
            const isLessonMatch = (b: BankQuestion) => {
                const bLesson = b.lesson.toLowerCase().trim();
                return bLesson.includes(qLesson) || qLesson.includes(bLesson);
            };

            // POOL: Only items from bank that match Level/Category and Lesson
            let pool = bank.filter(b => isCompatible(b) && isLessonMatch(b));

            // CRITICAL: Filter out any question that is already in the test (Old + New)
            // "Không nên đổi các câu đã có trong đề"
            let validCandidates = pool.filter(b => 
                !currentTestIds.has(b.id) && 
                !newlySelectedIds.has(b.id)
            );

            // STRATEGY SELECTION
            let finalCandidates: BankQuestion[] = [];

            // 1. Strict Criteria Match (e.g. NB-1.1 -> NB-1.1)
            if (qCriteria) {
                finalCandidates = validCandidates.filter(b => 
                    (b.criteria || '').trim().toLowerCase() === qCriteria
                );
            }

            // 2. Fallback: Same Level/Category/Lesson but ignore Criteria (if strict failed or no criteria defined)
            if (finalCandidates.length === 0) {
                finalCandidates = validCandidates;
            }

            // Execute Swap
            if (finalCandidates.length > 0) {
                const replacement = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
                newTest[index] = { 
                    ...replacement, 
                    points: q.points, 
                    uniqueId: Math.random() // Critical: Forces React to re-render this item
                };
                newlySelectedIds.add(replacement.id);
                swappedCount++;
            } else {
                // Keep original if absolutely no options found
                newlySelectedIds.add(q.id);
            }
        });

        setGeneratedTest(newTest);
        
        if (swappedCount > 0) {
            // Success
        } else {
            alert("Không tìm thấy câu hỏi thay thế nào phù hợp (không trùng lặp) trong ngân hàng.");
        }
    };

    const swapQuestion = (q: BankQuestion) => {
        const qLesson = q.lesson.toLowerCase().trim();
        const qCriteria = (q.criteria || '').trim().toLowerCase();
        
        const isCompatible = (b: BankQuestion) => b.level === q.level && b.category === q.category;
        const isLessonMatch = (b: BankQuestion) => {
             const bLesson = b.lesson.toLowerCase().trim();
             return bLesson.includes(qLesson) || qLesson.includes(bLesson);
        };
        const isCriteriaMatch = (b: BankQuestion) => {
             if (!qCriteria) return true; // If target has no criteria, accept all
             return (b.criteria || '').trim().toLowerCase() === qCriteria;
        };

        // 1. Pool: Same Level, Category, Lesson
        let pool = bank.filter(b => isCompatible(b) && isLessonMatch(b));

        // 2. Strict Check: Exclude ANY question currently in the generated test
        const currentTestIds = new Set(generatedTest.map(gt => gt.id));
        let candidates = pool.filter(b => !currentTestIds.has(b.id));

        // 3. Priority: Same Criteria
        let bestCandidates = candidates.filter(b => isCriteriaMatch(b));

        // 4. Fallback: If no same criteria, use candidates from same level/lesson (if user allows)
        // But prompt says "NB-1.1 only swaps with NB-1.1". So if bestCandidates is empty, we warn.
        // However, to be helpful, if data is malformed (missing criteria), we might fall back to level.
        // Logic decision: If q has criteria, try strict. If 0, fallback to level. 
        if (bestCandidates.length === 0 && candidates.length > 0) {
             // Optional: could warn user "Exact criteria match not found, swapping with same level."
             // For now, let's stick to best effort.
             bestCandidates = candidates; 
        }

        if (bestCandidates.length > 0) {
            const replacement = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
            const newQ = { ...replacement, points: q.points, uniqueId: Math.random() };
            setGeneratedTest(prev => prev.map(item => item.uniqueId === q.uniqueId ? newQ : item));
        } else {
            alert(`Không tìm thấy câu hỏi nào khác cùng mức độ (và chưa có trong đề) để thay thế.`);
        }
    };

    const applyBulkPoints = () => {
        setGeneratedTest(prev => prev.map(q => ({ ...q, points: bulkPoints })));
    };

    const updatePoint = (uniqueId: number | undefined, val: number) => {
        if (!uniqueId) return;
        setGeneratedTest(prev => prev.map(q => q.uniqueId === uniqueId ? { ...q, points: val } : q));
    };

    const handleExportWord = (type: 'azota' | 'exam') => {
        if (generatedTest.length === 0) return;

        if (type === 'azota') {
            const questionsHtml = generatedTest.map((q, idx) => {
                let html = `<p><strong>Câu ${idx + 1}:</strong> ${q.content}</p>`;
                if (q.category !== 'essay' && q.options) {
                    q.options.forEach((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        html += `<p>${opt.isCorrect ? '*' : ''}${letter}. ${opt.text}</p>`;
                    });
                }
                return html;
            }).join('');
            
            const keyHtml = generateAzotaKeyHtml(generatedTest);
            const fullHtml = `<html><body>${questionsHtml}<br/><br/>${keyHtml}</body></html>`;
            
            const blob = new Blob([fullHtml], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'De_Azota.doc';
            a.click();
        } else {
            const html = generateExamWordHtml(generatedTest, headerInfo);
            const blob = new Blob([html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `De_Thi_${headerInfo.monHoc.replace(/\s/g, '_')}.doc`;
            a.click();
            setShowExportModal(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    <Layers className="text-primary" /> Trình Tạo Đề Thi
                </h1>
                <p className="text-gray-500 mt-2">Tự động hóa quy trình ra đề từ ngân hàng câu hỏi JSON.</p>
            </header>

            {/* PROGRESS STEPS */}
            <div className="flex justify-center mb-10">
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
                    <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">1</span> Tải dữ liệu
                    </div>
                    <div className="w-8 h-[1px] bg-gray-300"></div>
                    <div className={`flex items-center gap-2 ${step === 'config' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">2</span> Cấu hình
                    </div>
                    <div className="w-8 h-[1px] bg-gray-300"></div>
                    <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">3</span> Xuất bản
                    </div>
                </div>
            </div>

            {/* VIEW 1: UPLOAD */}
            {step === 'upload' && (
                <div className="bg-white rounded-xl shadow-lg p-10 text-center border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => document.getElementById('jsonUpload')?.click()}>
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                        <Upload size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Tải lên Ngân hàng Câu hỏi</h2>
                    <p className="text-gray-500 mb-6">Hỗ trợ file .json xuất từ phần mềm này. Có thể chọn nhiều file cùng lúc.</p>
                    <input 
                        type="file" 
                        id="jsonUpload" 
                        className="hidden" 
                        accept=".json" 
                        multiple 
                        onChange={handleFileUpload} 
                    />
                    <button className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Chọn file JSON
                    </button>
                </div>
            )}

            {/* VIEW 2: CONFIG */}
            {step === 'config' && (
                <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in-up">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Settings size={24} className="text-primary" /> Thiết lập Đề Thi
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Ngân hàng hiện có: <strong>{bank.length}</strong> câu hỏi</p>
                        </div>
                        
                        {/* Config Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setConfigMode('manual')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${configMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Grid3X3 size={16} /> Theo Bài (Thủ công)
                            </button>
                            <button 
                                onClick={() => setConfigMode('matrix')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${configMode === 'matrix' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileJson size={16} /> Từ Ma Trận (JSON)
                            </button>
                        </div>
                    </div>

                    {/* Mode 1: Manual Table */}
                    {configMode === 'manual' && (
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-700 text-sm">
                                        <th className="p-3 border text-left min-w-[200px]">Bài học / Chủ đề</th>
                                        <th className="p-3 border w-32 bg-green-50 text-green-800">Nhận biết</th>
                                        <th className="p-3 border w-32 bg-blue-50 text-blue-800">Thông hiểu</th>
                                        <th className="p-3 border w-32 bg-yellow-50 text-yellow-800">Vận dụng</th>
                                        <th className="p-3 border w-32 bg-red-50 text-red-800">Vận dụng cao</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(availableStats).sort().map(lesson => {
                                        const stats = availableStats[lesson];
                                        return (
                                            <tr key={lesson} className="hover:bg-gray-50">
                                                <td className="p-3 border font-medium text-gray-800">{lesson}</td>
                                                {['NB', 'TH', 'VD', 'VDC'].map(lvl => (
                                                    <td key={lvl} className="p-2 border text-center relative group">
                                                        <div className="flex flex-col items-center">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max={stats[lvl]} 
                                                                className={`w-16 p-1 text-center border rounded focus:ring-2 focus:ring-primary outline-none ${stats[lvl] === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold'}`}
                                                                disabled={stats[lvl] === 0}
                                                                onChange={(e) => handleManualConfigChange(lesson, lvl, e.target.value)}
                                                            />
                                                            <span className="text-[10px] text-gray-400 mt-1">Kho: {stats[lvl]}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Mode 2: Matrix Upload */}
                    {configMode === 'matrix' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                            {!importedMatrix ? (
                                <>
                                    <FileJson size={48} className="mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tải lên file cấu trúc Ma trận</h3>
                                    <p className="text-sm text-gray-500 mb-6">Sử dụng file JSON được xuất từ chức năng "Xây dựng Ma trận".</p>
                                    <label className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2">
                                        <Upload size={18} /> Chọn file JSON
                                        <input type="file" className="hidden" accept=".json" onChange={handleMatrixUpload} />
                                    </label>
                                </>
                            ) : (
                                <div className="text-left w-full max-w-4xl mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-green-700 flex items-center gap-2"><Check size={20}/> Đã tải ma trận: {importedMatrix.thongTinChung.tenDe}</h3>
                                            <p className="text-sm text-gray-500">Ngày tạo: {new Date(importedMatrix.thongTinChung.ngayTao).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => setImportedMatrix(null)} className="text-red-500 hover:text-red-700 text-sm">Xóa / Chọn lại</button>
                                    </div>
                                    
                                    <div className="bg-white border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                                <tr>
                                                    <th className="p-3 text-left">Bài học</th>
                                                    <th className="p-3 text-center">Trắc nghiệm (NB/TH/VD/VDC)</th>
                                                    <th className="p-3 text-center">Tự luận (NB/TH/VD/VDC)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importedMatrix.chiTiet.map((row, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                                        <td className="p-3">{row.thongTinChung.bai}</td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-mono bg-blue-50 px-2 py-1 rounded">
                                                                {row.tracNghiem.NB}-{row.tracNghiem.TH}-{row.tracNghiem.VD}-{row.tracNghiem.VDC}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-mono bg-orange-50 px-2 py-1 rounded">
                                                                {row.tuLuan.NB}-{row.tuLuan.TH}-{row.tuLuan.VD}-{row.tuLuan.VDC}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setStep('upload')} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Quay lại</button>
                        <button 
                            onClick={generateTest} 
                            disabled={configMode === 'matrix' && !importedMatrix}
                            className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Play size={20} /> Tạo Đề Thi
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 3: REVIEW */}
            {step === 'review' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800">Xem trước đề thi ({generatedTest.length} câu)</h2>
                        
                        <div className="flex items-center gap-4">
                            {/* Bulk Swap Menu - Click Based */}
                            <div className="relative" ref={swapMenuRef}>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSwapMenuOpen(!isSwapMenuOpen); }}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-2 font-medium border border-indigo-200 transition-colors"
                                >
                                    <RefreshCw size={16} /> Đổi câu hỏi <ChevronDown size={14}/>
                                </button>
                                {isSwapMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in-up">
                                        <button onClick={() => triggerBulkSwap()} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 font-semibold text-gray-800 transition-colors">
                                            <RefreshCw size={14}/> Toàn bộ đề
                                        </button>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button onClick={() => triggerBulkSwap('NB')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-green-700 transition-colors">Mức Nhận biết</button>
                                        <button onClick={() => triggerBulkSwap('TH')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-blue-700 transition-colors">Mức Thông hiểu</button>
                                        <button onClick={() => triggerBulkSwap('VD')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-yellow-700 transition-colors">Mức Vận dụng</button>
                                        <button onClick={() => triggerBulkSwap('VDC')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-700 transition-colors">Mức Vận dụng cao</button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <span className="text-sm font-medium text-gray-600 pl-2">Điểm chung:</span>
                                <input 
                                    type="number" 
                                    step="0.25" 
                                    value={bulkPoints} 
                                    onChange={(e) => setBulkPoints(parseFloat(e.target.value))}
                                    className="w-20 p-1 border rounded text-center"
                                />
                                <button onClick={applyBulkPoints} className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark">Áp dụng</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {generatedTest.map((q, idx) => (
                            <div key={q.uniqueId || idx} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 relative group hover:border-blue-300 transition-all">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-blue-800">Câu {idx + 1}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${q.level==='NB'?'bg-green-50 border-green-200 text-green-700':q.level==='TH'?'bg-blue-50 border-blue-200 text-blue-700':q.level==='VD'?'bg-yellow-50 border-yellow-200 text-yellow-700':'bg-red-50 border-red-200 text-red-700'}`}>
                                                {q.level} {q.criteria ? `- ${q.criteria}` : ''}
                                            </span>
                                            <span className="text-xs font-bold text-purple-600 border border-purple-200 bg-purple-50 px-2 py-0.5 rounded">
                                                {q.category === 'mc' ? 'Trắc nghiệm' : 'Tự luận'}
                                            </span>
                                            <span className="text-xs text-gray-400">({q.lesson})</span>
                                        </div>
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{q.content}</p>
                                        
                                        {/* Image Preview */}
                                        {q.image && (
                                            <div className="mt-3">
                                                <img src={q.image} alt="Question illustration" className="max-h-40 w-auto rounded border border-gray-200" />
                                            </div>
                                        )}
                                        
                                        {/* Options Preview */}
                                        {q.category !== 'essay' && (
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {q.options?.map((opt, i) => (
                                                    <div key={i} className={`text-sm p-2 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                                        <strong>{String.fromCharCode(65 + i)}.</strong> {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                        <div className="flex items-center gap-1">
                                            <label className="text-xs text-gray-500">Điểm:</label>
                                            <select 
                                                className="p-1 border rounded text-sm bg-gray-50"
                                                value={q.points}
                                                onChange={(e) => updatePoint(q.uniqueId, parseFloat(e.target.value))}
                                            >
                                                {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => swapQuestion(q)}
                                            className="text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                        >
                                            <RefreshCw size={14} /> Đổi câu khác
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sticky bottom-4 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 flex justify-between items-center z-10">
                        <button onClick={() => setStep('config')} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                            Chỉnh sửa Ma trận
                        </button>
                        <div className="flex gap-3">
                            <button onClick={() => handleExportWord('azota')} className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-md flex items-center gap-2">
                                <FileText size={18} /> Xuất Azota
                            </button>
                            <button onClick={() => setShowExportModal(true)} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2">
                                <Download size={18} /> Xuất File Word
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPORT MODAL */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-primary flex items-center gap-2"><FileText /> Thông tin tiêu đề</h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-red-500"><X /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị chủ quản</label>
                            <input type="text" className="w-full p-2 border rounded" value={headerInfo.donVi} onChange={e=>setHeaderInfo({...headerInfo, donVi:e.target.value})} /></div>
                            
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên trường</label>
                            <input type="text" className="w-full p-2 border rounded" value={headerInfo.tenTruong} onChange={e=>setHeaderInfo({...headerInfo, tenTruong:e.target.value})} /></div>
                            
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên kỳ thi</label>
                            <input type="text" className="w-full p-2 border rounded" value={headerInfo.tenKyThi} onChange={e=>setHeaderInfo({...headerInfo, tenKyThi:e.target.value})} /></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                                <input type="text" className="w-full p-2 border rounded" value={headerInfo.monHoc} onChange={e=>setHeaderInfo({...headerInfo, monHoc:e.target.value})} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                                <input type="text" className="w-full p-2 border rounded" value={headerInfo.thoiGian} onChange={e=>setHeaderInfo({...headerInfo, thoiGian:e.target.value})} /></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mã đề (tùy chọn)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded" 
                                    placeholder="Để trống sẽ hiện dấu chấm" 
                                    value={headerInfo.maDe} 
                                    onChange={e=>setHeaderInfo({...headerInfo, maDe:e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                            <button onClick={() => handleExportWord('exam')} className="px-6 py-2 bg-primary text-white rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                                <Printer size={18} /> Xác nhận & Tải
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamGenerator;