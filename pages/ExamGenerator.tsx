import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Upload, FileText, Settings, Play, Check, X, Printer, Download, RefreshCw, 
    Layers, FileJson, Grid3X3, ChevronDown, AlertCircle, Info, Sparkles, 
    Wand2, ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet, Eye, 
    Shuffle, Copy, BookOpenCheck, Loader2
} from 'lucide-react';
import { ExerciseQuestion, ImportedMatrixData, ExamVariant, ExamReviewResult } from '../types';
import { 
    generateExamWordHtml, 
    generateAzotaKeyHtml, 
    generateExamVariants, 
    generateMultiCodeAnswerKeyMatrixHtml,
    generateFullDossierHtml,
    extractHtmlParts
} from '../utils';
import { reviewExamWithAI, autoFillMissingQuestions } from '../services/geminiService';

// Extended type for internal state
interface BankQuestion extends ExerciseQuestion {
    lesson: string;
    points?: number;
    uniqueId?: number;
}

const ExamGenerator: React.FC = () => {
    const [step, setStep] = useState<'upload' | 'config' | 'review'>('upload');
    const [bank, setBank] = useState<BankQuestion[]>([]);
    const [generatedTest, setGeneratedTest] = useState<BankQuestion[]>([]);
    
    // Config Modes
    const [configMode, setConfigMode] = useState<'manual' | 'matrix'>('manual');
    const [manualConfig, setManualConfig] = useState<Record<string, Record<string, number>>>({});
    const [importedMatrix, setImportedMatrix] = useState<ImportedMatrixData | null>(null);

    // Multi-Code Variants State
    const [variantCount, setVariantCount] = useState<number>(4);
    const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
    const [activeVariantCode, setActiveVariantCode] = useState<string>('101');
    const [variants, setVariants] = useState<ExamVariant[]>([]);

    // AI Review State
    const [isReviewing, setIsReviewing] = useState<boolean>(false);
    const [reviewResult, setReviewResult] = useState<ExamReviewResult | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

    // Smart Auto-Fill State
    const [missingRequirements, setMissingRequirements] = useState<{ lesson: string; level: string; count: number; questionType?: string; criteriaText?: string }[]>([]);
    const [isAutoFilling, setIsAutoFilling] = useState<boolean>(false);
    const [autoFillProgress, setAutoFillProgress] = useState<string>('');

    // UI States
    const [showExportModal, setShowExportModal] = useState<boolean>(false);
    const [exportType, setExportType] = useState<'current' | 'all' | 'key_matrix' | 'full_dossier' | 'azota'>('current');
    const [isSwapMenuOpen, setIsSwapMenuOpen] = useState<boolean>(false);
    const swapMenuRef = useRef<HTMLDivElement>(null);

    const [headerInfo, setHeaderInfo] = useState({
        donVi: 'UBND PHƯỜNG HẢI CHÂU',
        tenTruong: 'LÊ HỒNG PHONG',
        tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
        monHoc: 'MON: TIN HỌC – LỚP 7',
        thoiGian: '45 phút (không kể thời gian giao đề)',
        maDe: '101'
    });
    const [customFileName, setCustomFileName] = useState<string>('GK1 TIN 7-26-27-THUONG');
    
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

    // Re-generate variants when base test, variantCount, or shuffleOptions change
    useEffect(() => {
        if (generatedTest.length > 0) {
            const availableCodes = ['101', '102', '103', '104', '105', '106', '107', '108'].slice(0, variantCount);
            const newVariants = generateExamVariants(generatedTest, availableCodes, shuffleOptions);
            setVariants(newVariants);
            if (!availableCodes.includes(activeVariantCode)) {
                setActiveVariantCode(availableCodes[0] || '101');
            }
        }
    }, [generatedTest, variantCount, shuffleOptions]);

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

    // Active questions based on selected variant tab
    const activeQuestions = useMemo(() => {
        if (variants.length === 0) return generatedTest;
        const currentV = variants.find(v => v.code === activeVariantCode);
        return currentV ? currentV.questions : generatedTest;
    }, [variants, activeVariantCode, generatedTest]);

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
                            questionType: q.questionType || (q.category === 'essay' ? 'essay' : 'multiple-choice'),
                            level: normalizeLevel(rawLevel),
                            criteria: q.criteria || q.tieuChi || '',
                            content: q.content || q.noiDung || '',
                            options: q.options || q.luaChon || [],
                            answer: q.answer || q.dapAn || '',
                            image: q.image || undefined,
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
                    if (data.thongTinChung?.tenDe) {
                        setHeaderInfo(prev => ({ ...prev, tenKyThi: data.thongTinChung.tenDe }));
                    }
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
        const missing: { lesson: string; level: string; count: number; questionType?: string; criteriaText?: string }[] = [];

        const findQuestions = (lessonName: string, level: string, category: 'mc'|'essay', count: number) => {
            const normalizedTarget = lessonName.toLowerCase().trim();
            const pool = bank.filter(q => {
                const normalizedSource = q.lesson.toLowerCase().trim();
                const lessonMatch = normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
                return lessonMatch && q.level === level && q.category === category;
            });

            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            if (shuffled.length < count) {
                const diff = count - shuffled.length;
                missing.push({
                    lesson: lessonName,
                    level,
                    count: diff,
                    questionType: category === 'essay' ? 'essay' : 'multiple-choice'
                });
            }
            
            return shuffled.slice(0, count).map(q => ({
                ...q,
                points: category === 'essay' ? 1.0 : (q.questionType === 'true-false' ? 1.0 : 0.25),
                uniqueId: Math.random()
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

        setMissingRequirements(missing);

        if (selected.length === 0 && missing.length === 0) {
            alert("Không tìm thấy yêu cầu câu hỏi nào. Vui lòng kiểm tra lại cấu hình.");
            return;
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

    // --- SMART AUTO-FILL WITH AI ---
    const handleTriggerAutoFill = async () => {
        if (missingRequirements.length === 0) return;
        setIsAutoFilling(true);
        setAutoFillProgress('Bắt đầu khởi tạo AI để bù đắp các câu hỏi còn thiếu...');

        try {
            const gradeNum = headerInfo.monHoc.match(/\d+/)?.[0] || '6';
            const autoQuestions = await autoFillMissingQuestions(
                missingRequirements,
                gradeNum,
                (completed, total, msg) => {
                    setAutoFillProgress(`(${completed}/${total}) ${msg}`);
                }
            );

            if (autoQuestions.length > 0) {
                // Add to bank
                setBank(prev => [...prev, ...autoQuestions]);
                // Clear missing and append to current test
                setGeneratedTest(prev => [...prev, ...autoQuestions]);
                setMissingRequirements([]);
                alert(`Tuyệt vời! Đã bù đắp thành công ${autoQuestions.length} câu hỏi chuẩn xác bằng AI vào đề thi.`);
            } else {
                alert("Không thể sinh câu hỏi tự động. Vui lòng kiểm tra kết nối API.");
            }
        } catch (error) {
            alert("Lỗi khi bù đắp tự động bằng AI: " + (error as Error).message);
        } finally {
            setIsAutoFilling(false);
            setAutoFillProgress('');
        }
    };

    // --- AI REVIEWER HANDLER ---
    const handleRunAIReview = async () => {
        if (generatedTest.length === 0) return;
        setIsReviewing(true);
        try {
            const gradeNum = headerInfo.monHoc.match(/\d+/)?.[0] || '6';
            const result = await reviewExamWithAI(generatedTest, `Khối ${gradeNum}`, headerInfo.tenKyThi);
            setReviewResult(result);
            setIsReviewModalOpen(true);
        } catch (error) {
            alert("Lỗi khi thẩm định bằng AI: " + (error as Error).message);
        } finally {
            setIsReviewing(false);
        }
    };

    // --- STEP 3: REVIEW & EXPORT ---
    const triggerBulkSwap = (targetLevel?: string) => {
        setIsSwapMenuOpen(false); 
        setTimeout(() => handleBulkSwap(targetLevel), 50);
    };

    const handleBulkSwap = (targetLevel?: string) => {
        const label = targetLevel ? `các câu mức ${targetLevel}` : 'toàn bộ đề thi';
        if (!window.confirm(`Bạn có chắc muốn đổi ${label}?`)) return;

        const newTest = [...generatedTest];
        const currentTestIds = new Set(generatedTest.map(t => t.id)); 
        const newlySelectedIds = new Set<string>();

        newTest.forEach(q => {
            if (targetLevel && q.level !== targetLevel) {
                newlySelectedIds.add(q.id);
            }
        });

        let swappedCount = 0;
        newTest.forEach((q, index) => {
            if (targetLevel && q.level !== targetLevel) return;

            const qLesson = q.lesson.toLowerCase().trim();
            const qCriteria = (q.criteria || '').trim().toLowerCase();

            const isCompatible = (b: BankQuestion) => b.level === q.level && b.category === q.category;
            const isLessonMatch = (b: BankQuestion) => {
                const bLesson = b.lesson.toLowerCase().trim();
                return bLesson.includes(qLesson) || qLesson.includes(bLesson);
            };

            let pool = bank.filter(b => isCompatible(b) && isLessonMatch(b));
            let validCandidates = pool.filter(b => !currentTestIds.has(b.id) && !newlySelectedIds.has(b.id));

            let finalCandidates: BankQuestion[] = [];
            if (qCriteria) {
                finalCandidates = validCandidates.filter(b => (b.criteria || '').trim().toLowerCase() === qCriteria);
            }
            if (finalCandidates.length === 0) {
                finalCandidates = validCandidates;
            }

            if (finalCandidates.length > 0) {
                const replacement = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
                newTest[index] = { 
                    ...replacement, 
                    points: q.points, 
                    uniqueId: Math.random()
                };
                newlySelectedIds.add(replacement.id);
                swappedCount++;
            } else {
                newlySelectedIds.add(q.id);
            }
        });

        setGeneratedTest(newTest);
        if (swappedCount === 0) {
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
             if (!qCriteria) return true;
             return (b.criteria || '').trim().toLowerCase() === qCriteria;
        };

        let pool = bank.filter(b => isCompatible(b) && isLessonMatch(b));
        const currentTestIds = new Set(generatedTest.map(gt => gt.id));
        let candidates = pool.filter(b => !currentTestIds.has(b.id));
        let bestCandidates = candidates.filter(b => isCriteriaMatch(b));

        if (bestCandidates.length === 0 && candidates.length > 0) {
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

    // --- EXPORT HANDLERS ---
    const handlePerformExport = () => {
        if (generatedTest.length === 0) return;

        if (exportType === 'azota_current' || exportType === 'azota_all') {
            const variantsToExport = exportType === 'azota_current' 
                ? [variants.find(v => v.code === activeVariantCode)].filter(Boolean)
                : variants;
            
            variantsToExport.forEach(v => {
                if (!v) return;
                const keyHtml = generateAzotaKeyHtml(v.questions);
                const questionsHtml = v.questions.map((q: any, idx: number) => {
                    let html = `<p><strong>Câu ${idx + 1}:</strong> ${q.content}</p>`;
                    if (q.category !== 'essay' && q.options) {
                        q.options.forEach((opt: any, i: number) => {
                            const letter = String.fromCharCode(65 + i);
                            html += `<p>${opt.isCorrect ? '*' : ''}${letter}. ${opt.text}</p>`;
                        });
                    }
                    return html;
                }).join('');
                
                const fullHtml = `<html><body>${questionsHtml}<br/><br/>${keyHtml}</body></html>`;
                const blob = new Blob([fullHtml], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Made${v.code}_azota.doc`;
                a.click();
            });
        } else if (exportType === 'key_matrix') {
            const html = generateMultiCodeAnswerKeyMatrixHtml(variants, headerInfo);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || 'GK1 TIN 7-26-27-THUONG').trim();
            a.download = `Bang_Dap_An_${baseName}.doc`;
            a.click();
        } else if (exportType === 'full_dossier') {
            const html = generateFullDossierHtml(null, variants, headerInfo);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || 'GK1 TIN 7-26-27-THUONG').trim();
            a.download = `Ho_So_${baseName}.doc`;
            a.click();
        } else if (exportType === 'all') {
            let combinedStyles = '';
            const allHtmlBodies = variants.map((v, idx) => {
                const vHeader = { ...headerInfo, maDe: v.code };
                const parts = extractHtmlParts(generateExamWordHtml(v.questions, vHeader));
                if (idx === 0) combinedStyles += parts.style;
                
                let out = parts.body;
                if (idx > 0) {
                    out = `<br clear=all style='mso-special-character:line-break;page-break-before:always'>` + out;
                }
                return out;
            }).join('');
            
            const finalAllHtml = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset="utf-8">
                    <title>Bộ Đề ${variants.length} Mã - ${headerInfo.monHoc}</title>
                    <style>${combinedStyles}</style>
                    <xml>
                        <w:WordDocument>
                            <w:View>Print</w:View>
                            <w:Zoom>100</w:Zoom>
                            <w:DoNotOptimizeForBrowser/>
                        </w:WordDocument>
                    </xml>
                </head>
                <body>
                    ${allHtmlBodies}
                </body>
                </html>
            `;
            
            const blob = new Blob(['\ufeff', finalAllHtml], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || 'GK1 TIN 7-26-27-THUONG').trim();
            a.download = `Bo_De_${baseName}.doc`;
            a.click();
        } else {
            // Current active variant
            const currentV = variants.find(v => v.code === activeVariantCode);
            const vHeader = { ...headerInfo, maDe: activeVariantCode };
            const html = generateExamWordHtml(currentV ? currentV.questions : generatedTest, vHeader);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || 'GK1 TIN 7-26-27-THUONG').trim();
            a.download = `${baseName}.doc`;
            a.click();
        }

        setShowExportModal(false);
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <header className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-primary rounded-full text-xs font-semibold mb-3">
                    <Sparkles size={14} /> Khảo Thí Chuẩn Hóa GDPT 2018 & Định Dạng Mới 2025
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
                    <Layers className="text-primary" /> Trình Tạo Đề Thi & Quản Lý Đa Mã Đề
                </h1>
                <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
                    Tự động tạo trọn bộ hồ sơ khảo thí: Đề thi đa mã đề, ma trận, bản đặc tả, barem chấm và bảng đối chiếu đáp án chéo.
                </p>
            </header>

            {/* PROGRESS STEPS */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-200">
                    <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">1</span> Tải dữ liệu
                    </div>
                    <div className="w-8 h-[1px] bg-gray-300"></div>
                    <div className={`flex items-center gap-2 ${step === 'config' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">2</span> Cấu hình & Ma trận
                    </div>
                    <div className="w-8 h-[1px] bg-gray-300"></div>
                    <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary font-bold' : 'text-gray-500'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs border border-current">3</span> Thẩm định & Xuất bản
                    </div>
                </div>
            </div>

            {/* VIEW 1: UPLOAD */}
            {step === 'upload' && (
                <div className="max-w-3xl mx-auto">
                    <div 
                        className="bg-white rounded-2xl shadow-md p-12 text-center border-2 border-dashed border-blue-200 hover:border-primary transition-all cursor-pointer group" 
                        onClick={() => document.getElementById('jsonUpload')?.click()}
                    >
                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary group-hover:scale-110 transition-transform">
                            <Upload size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tải lên Ngân hàng Câu hỏi</h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Tải các file .json xuất từ "Quản lý câu hỏi". Bạn có thể chọn nhiều file các bài học cùng lúc.
                        </p>
                        <input 
                            type="file" 
                            id="jsonUpload" 
                            className="hidden" 
                            accept=".json" 
                            multiple 
                            onChange={handleFileUpload} 
                        />
                        <button className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-blue-200 transition-all">
                            Chọn các file JSON
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 2: CONFIG */}
            {step === 'config' && (
                <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in-up border border-gray-100">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b pb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Settings size={24} className="text-primary" /> Thiết lập Đề Thi & Cấu Trúc Mã Đề
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Ngân hàng hiện có: <strong className="text-primary">{bank.length}</strong> câu hỏi</p>
                        </div>
                        
                        {/* Config Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setConfigMode('manual')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${configMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Grid3X3 size={16} /> Theo Bài (Thủ công)
                            </button>
                            <button 
                                onClick={() => setConfigMode('matrix')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${configMode === 'matrix' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileJson size={16} /> Từ Ma Trận (JSON)
                            </button>
                        </div>
                    </div>

                    {/* Mode 1: Manual Table */}
                    {configMode === 'manual' && (
                        <div className="overflow-x-auto border rounded-xl shadow-sm mb-6">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-700 text-sm">
                                        <th className="p-3 border text-left min-w-[200px]">Bài học / Chủ đề</th>
                                        <th className="p-3 border w-32 bg-green-50 text-green-800 font-bold">Nhận biết</th>
                                        <th className="p-3 border w-32 bg-blue-50 text-blue-800 font-bold">Thông hiểu</th>
                                        <th className="p-3 border w-32 bg-yellow-50 text-yellow-800 font-bold">Vận dụng</th>
                                        <th className="p-3 border w-32 bg-red-50 text-red-800 font-bold">Vận dụng cao</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(availableStats).sort().map(lesson => {
                                        const stats = availableStats[lesson];
                                        return (
                                            <tr key={lesson} className="hover:bg-gray-50">
                                                <td className="p-3 border font-medium text-gray-800">{lesson}</td>
                                                {['NB', 'TH', 'VD', 'VDC'].map(lvl => (
                                                    <td key={lvl} className="p-2 border text-center">
                                                        <div className="flex flex-col items-center">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max={stats[lvl]} 
                                                                className={`w-16 p-1.5 text-center border rounded-lg focus:ring-2 focus:ring-primary outline-none ${stats[lvl] === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold text-gray-800'}`}
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
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50 mb-6">
                            {!importedMatrix ? (
                                <>
                                    <FileJson size={48} className="mx-auto text-primary mb-4" />
                                    <h3 className="text-lg font-bold text-gray-700 mb-2">Tải lên file cấu trúc Ma trận</h3>
                                    <p className="text-sm text-gray-500 mb-6">Sử dụng file JSON xuất từ mục "Xây dựng Ma trận" để tự động chia tỷ lệ số câu.</p>
                                    <label className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all cursor-pointer inline-flex items-center gap-2 shadow-md">
                                        <Upload size={18} /> Chọn file Ma trận JSON
                                        <input type="file" className="hidden" accept=".json" onChange={handleMatrixUpload} />
                                    </label>
                                </>
                            ) : (
                                <div className="text-left w-full mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-emerald-700 flex items-center gap-2">
                                                <CheckCircle2 size={20}/> Đã nạp ma trận: {importedMatrix.thongTinChung.tenDe}
                                            </h3>
                                            <p className="text-sm text-gray-500">Ngày tạo: {new Date(importedMatrix.thongTinChung.ngayTao).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <button onClick={() => setImportedMatrix(null)} className="text-red-500 hover:text-red-700 text-sm font-semibold">
                                            Thay đổi ma trận khác
                                        </button>
                                    </div>
                                    
                                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 text-gray-700 font-bold">
                                                <tr>
                                                    <th className="p-3 text-left">Bài học</th>
                                                    <th className="p-3 text-center">Trắc nghiệm (NB-TH-VD-VDC)</th>
                                                    <th className="p-3 text-center">Tự luận (NB-TH-VD-VDC)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importedMatrix.chiTiet.map((row, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{row.thongTinChung.bai}</td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">
                                                                {row.tracNghiem.NB} - {row.tracNghiem.TH} - {row.tracNghiem.VD} - {row.tracNghiem.VDC}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded font-bold">
                                                                {row.tuLuan.NB} - {row.tuLuan.TH} - {row.tuLuan.VD} - {row.tuLuan.VDC}
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

                    {/* Multi-Code Configuration Options */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Shuffle size={18} className="text-primary" /> Thiết lập Đa Mã Đề Thi (Trộn Đề Thông Minh)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng mã đề cần tạo:</label>
                                <div className="flex gap-2">
                                    {[1, 2, 4, 8].map(count => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setVariantCount(count)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                                                variantCount === count 
                                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {count} mã đề {count === 4 ? '(Khuyến nghị)' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <input 
                                    type="checkbox" 
                                    id="shuffleOpts"
                                    checked={shuffleOptions}
                                    onChange={(e) => setShuffleOptions(e.target.checked)}
                                    className="w-5 h-5 text-primary accent-primary rounded cursor-pointer"
                                />
                                <label htmlFor="shuffleOpts" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Tự động đảo phương án A, B, C, D giữa các mã đề (Bảo toàn đáp án)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={() => setStep('upload')} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Quay lại bước 1
                        </button>
                        <button 
                            onClick={generateTest} 
                            disabled={configMode === 'matrix' && !importedMatrix}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                            <Play size={20} /> Tạo Đề & Hoán Vị Mã Đề
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 3: REVIEW & EXPORT */}
            {step === 'review' && (
                <div className="space-y-6 animate-fade-in-up">
                    
                    {/* Warning & Auto-fill Banner if missing questions */}
                    {missingRequirements.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">
                                        Ngân hàng hiện còn thiếu {missingRequirements.reduce((sum, item) => sum + item.count, 0)} câu hỏi theo yêu cầu ma trận!
                                    </p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Hệ thống cho phép bạn tự động sinh bù đúng số lượng và mức độ nhận thức bằng AI chuẩn GDPT 2018.
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        {missingRequirements.map((req, i) => (
                                            <div key={i} className="text-xs bg-white/50 px-2 py-1.5 rounded text-amber-900 border border-amber-200/50">
                                                <span className="font-bold">{req.lesson}</span> • 
                                                Mức <span className="font-semibold text-amber-700">{req.level}</span> • 
                                                <span className="font-medium"> {req.questionType === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</span>: 
                                                Thiếu <strong className="text-red-600">{req.count}</strong> câu
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleTriggerAutoFill}
                                disabled={isAutoFilling}
                                className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                {isAutoFilling ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                Bù đắp tự động bằng AI
                            </button>
                        </div>
                    )}

                    {isAutoFilling && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 text-sm text-blue-800">
                            <Loader2 size={18} className="animate-spin text-primary" />
                            <span>{autoFillProgress}</span>
                        </div>
                    )}

                    {/* Top Action Bar */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Xem trước đề thi ({activeQuestions.length} câu)
                                </h2>
                                <span className="bg-blue-100 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                                    {variants.length} Mã đề
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Đang xem: <strong>Mã đề {activeVariantCode}</strong></p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* AI Review Button */}
                            <button
                                onClick={handleRunAIReview}
                                disabled={isReviewing}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 flex items-center gap-2 text-sm font-bold shadow-md shadow-purple-200 transition-all disabled:opacity-50"
                            >
                                {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                AI Thẩm Định Đề Thi
                            </button>

                            {/* Bulk Swap Menu */}
                            <div className="relative" ref={swapMenuRef}>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSwapMenuOpen(!isSwapMenuOpen); }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center gap-2 font-semibold text-sm border border-gray-200 transition-colors"
                                >
                                    <RefreshCw size={16} /> Đổi câu hỏi <ChevronDown size={14}/>
                                </button>
                                {isSwapMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in-up">
                                        <button onClick={() => triggerBulkSwap()} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2 font-bold text-gray-800">
                                            <RefreshCw size={14}/> Toàn bộ đề
                                        </button>
                                        <div className="border-t border-gray-100"></div>
                                        <button onClick={() => triggerBulkSwap('NB')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs text-green-700 font-semibold">Mức Nhận biết</button>
                                        <button onClick={() => triggerBulkSwap('TH')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs text-blue-700 font-semibold">Mức Thông hiểu</button>
                                        <button onClick={() => triggerBulkSwap('VD')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs text-yellow-700 font-semibold">Mức Vận dụng</button>
                                        <button onClick={() => triggerBulkSwap('VDC')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs text-red-700 font-semibold">Mức Vận dụng cao</button>
                                    </div>
                                )}
                            </div>

                            {/* Bulk Points */}
                            <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <span className="text-xs font-semibold text-gray-600 pl-2">Điểm TN:</span>
                                <input 
                                    type="number" 
                                    step="0.25" 
                                    value={bulkPoints} 
                                    onChange={(e) => setBulkPoints(parseFloat(e.target.value))}
                                    className="w-16 p-1 border rounded text-center text-xs font-bold bg-white"
                                />
                                <button onClick={applyBulkPoints} className="px-2.5 py-1 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-dark">
                                    Áp dụng
                                </button>
                            </div>

                            {/* Direct Fast Export Button */}
                            <button
                                onClick={() => {
                                    const currentV = variants.find(v => v.code === activeVariantCode);
                                    const vHeader = { ...headerInfo, maDe: activeVariantCode };
                                    const html = generateExamWordHtml(currentV ? currentV.questions : generatedTest, vHeader);
                                    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    const baseName = (customFileName || 'GK1 TIN 7-26-27-THUONG').trim();
                                    a.download = `${baseName}.doc`;
                                    a.click();
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold text-sm shadow-md shadow-emerald-200 transition-all"
                                title="Tải ngay file Word mã đề hiện tại với tên GK1 TIN 7-26-27-THUONG.doc"
                            >
                                <Download size={16} /> Tải file Word ({customFileName || 'GK1 TIN 7-26-27-THUONG'}.doc)
                            </button>
                        </div>
                    </div>

                    {/* Variant Tabs */}
                    {variants.length > 1 && (
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                            <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
                                <Shuffle size={14} /> Mã đề:
                            </span>
                            {variants.map(v => (
                                <button
                                    key={v.code}
                                    onClick={() => setActiveVariantCode(v.code)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                        activeVariantCode === v.code 
                                            ? 'bg-primary text-white shadow-md shadow-blue-200' 
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    Mã đề {v.code} {v.code === '101' ? '(Gốc)' : ''}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Official Exam Paper Preview Header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6 font-serif">
                        {/* 2-Column Header */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dotted border-gray-400 p-4 rounded text-center">
                            {/* Col 1 */}
                            <div className="flex flex-col items-center justify-start space-y-1 md:border-r md:border-dotted md:border-gray-400 pr-2">
                                <span className="text-sm font-semibold uppercase text-gray-800">{headerInfo.donVi}</span>
                                <span className="text-sm font-bold uppercase text-gray-900">TRƯỜNG TRUNG HỌC CƠ SỞ</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-base font-extrabold uppercase text-gray-950">
                                        {headerInfo.tenTruong.replace(/^(TRƯỜNG\s+)?(TRUNG\s+HỌC\s+CƠ\s+SỞ\s+|THCS\s+)/i, '') || 'LÊ HỒNG PHONG'}
                                    </span>
                                    <div className="w-[90px] h-[1px] bg-black mt-1"></div>
                                </div>
                                <span className="text-xs font-bold text-gray-700 mt-2 bg-gray-100 px-3 py-0.5 rounded border border-gray-300">ĐỀ CHÍNH THỨC</span>
                            </div>
                            {/* Col 2 */}
                            <div className="flex flex-col items-center justify-start space-y-1 pl-2">
                                <span className="text-sm font-bold uppercase text-gray-950">{headerInfo.tenKyThi}</span>
                                <span className="text-sm font-extrabold uppercase text-gray-900">{headerInfo.monHoc}</span>
                                <span className="text-xs italic text-gray-600">Thời gian: {headerInfo.thoiGian}</span>
                                <span className="text-xs italic text-gray-500">(Đề có {Math.max(1, Math.ceil(activeQuestions.length / 8))} trang)</span>
                                <span className="text-xs font-bold text-gray-800 mt-1">Mã đề: {activeVariantCode || headerInfo.maDe || '101'}</span>
                            </div>
                        </div>

                        {/* Student Info & Score Box */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center text-sm font-bold text-gray-900">
                                <span>Họ và tên học sinh :</span>
                                <span className="flex-1 mx-2 border-b border-dotted border-gray-500 h-4"></span>
                                <span className="ml-2">Lớp:</span>
                                <span className="w-24 border-b border-dotted border-gray-500 h-4 ml-2"></span>
                            </div>

                            <table className="w-full border-collapse border border-gray-700 text-sm">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-700 p-2 text-left font-bold w-1/3 bg-gray-50">Điểm</th>
                                        <th className="border border-gray-700 p-2 text-left font-bold w-2/3 bg-gray-50">Nhận xét của giáo viên</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-700 h-20 align-top p-2 text-gray-300 italic text-xs">&nbsp;</td>
                                        <td className="border border-gray-700 h-20 align-top p-2 text-gray-300 italic text-xs">&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Section 1 Header Banner */}
                        <div className="pt-2 border-t border-gray-200">
                            <h3 className="text-base font-extrabold text-gray-900 uppercase">
                                PHẦN 1. TRẮC NGHIỆM ({activeQuestions.filter(q => q.category !== 'essay').reduce((s, q) => s + (q.points || 0.25), 0).toFixed(1).replace('.', ',')} điểm)
                            </h3>
                            <p className="text-xs italic text-gray-600 mt-0.5">
                                Em hãy chọn hoặc điền đáp án đúng vào khung trả lời tương ứng: (mỗi câu đúng 0,25 điểm)
                            </p>
                        </div>
                    </div>

                    {/* Question List Preview */}
                    <div className="space-y-4">
                        {activeQuestions.map((q, idx) => (
                            <div key={q.uniqueId || idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative group hover:border-primary/50 transition-all">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="font-extrabold text-blue-900 text-sm">Câu {idx + 1}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${q.level==='NB'?'bg-green-50 border-green-200 text-green-700':q.level==='TH'?'bg-blue-50 border-blue-200 text-blue-700':q.level==='VD'?'bg-yellow-50 border-yellow-200 text-yellow-700':'bg-red-50 border-red-200 text-red-700'}`}>
                                                {q.level} {q.criteria ? `- ${q.criteria}` : ''}
                                            </span>
                                            <span className="text-[10px] font-bold text-purple-700 border border-purple-200 bg-purple-50 px-2 py-0.5 rounded">
                                                {q.questionType === 'true-false' 
                                                    ? 'Đúng / Sai (Phần II)' 
                                                    : q.questionType === 'short-answer' 
                                                    ? 'Trả lời ngắn (Phần III)' 
                                                    : q.category === 'essay' 
                                                    ? 'Tự luận' 
                                                    : 'Trắc nghiệm (Phần I)'}
                                            </span>
                                            <span className="text-xs text-gray-400">({q.lesson})</span>
                                        </div>
                                        <p className="text-gray-800 text-sm font-medium whitespace-pre-wrap">{q.content}</p>
                                        
                                        {/* Image Preview */}
                                        {q.image && (
                                            <div className="mt-3">
                                                <img src={q.image} alt="Question illustration" className="max-h-40 w-auto rounded-lg border border-gray-200" />
                                            </div>
                                        )}
                                        
                                        {/* Options Preview for True/False */}
                                        {q.questionType === 'true-false' && q.options && (
                                            <div className="mt-3 bg-blue-50/60 p-3 rounded-lg space-y-1.5 border border-blue-100">
                                                {q.options.map((opt, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded border border-gray-200">
                                                        <span className="text-gray-800">
                                                            <strong>{opt.id || String.fromCharCode(97 + i)})</strong> {opt.text}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded font-extrabold ${opt.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                            {opt.isCorrect ? 'ĐÚNG' : 'SAI'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Options Preview for MCQ */}
                                        {q.questionType !== 'true-false' && q.category !== 'essay' && q.options && q.options.length > 0 && (
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {q.options.map((opt, i) => (
                                                    <div key={i} className={`text-xs p-2.5 rounded-lg border ${opt.isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                                        <strong>{opt.id || String.fromCharCode(65 + i)}.</strong> {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Answer Preview for Short Answer */}
                                        {q.questionType === 'short-answer' && (
                                            <div className="mt-2 text-xs bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                                                <strong>Đáp án ngắn:</strong> {q.answer || 'Chưa có'}
                                            </div>
                                        )}

                                        {/* Essay Rubric */}
                                        {q.category === 'essay' && q.answer && (
                                            <div className="mt-3 text-xs bg-orange-50/70 p-3 rounded-lg border border-orange-200 text-orange-950 whitespace-pre-wrap">
                                                <strong className="block mb-1 text-orange-900">Hướng dẫn chấm / Barem:</strong>
                                                {q.answer}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-xs text-gray-500 font-medium">Điểm:</label>
                                            <select 
                                                className="p-1 border rounded text-xs bg-gray-50 font-bold"
                                                value={q.points}
                                                onChange={(e) => updatePoint(q.uniqueId, parseFloat(e.target.value))}
                                            >
                                                {[0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => swapQuestion(q)}
                                            className="text-xs flex items-center gap-1 text-primary hover:bg-blue-50 px-2 py-1 rounded font-semibold transition-colors"
                                        >
                                            <RefreshCw size={13} /> Đổi câu khác
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Sticky Action Bar */}
                    <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-200 flex flex-wrap justify-between items-center gap-4 z-20">
                        <button onClick={() => setStep('config')} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm">
                            ← Chỉnh sửa Ma trận
                        </button>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <button 
                                onClick={() => { setExportType('key_matrix'); setShowExportModal(true); }}
                                className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                <FileSpreadsheet size={16} /> Bảng Đáp Án Các Mã Đề
                            </button>
                            
                            <button 
                                onClick={() => { setExportType('azota_current'); setShowExportModal(true); }}
                                className="px-5 py-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-orange-200 transition-all"
                            >
                                <FileText size={16} /> Xuất Azota
                            </button>
                            
                            <button 
                                onClick={() => setShowExportModal(true)}
                                className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
                            >
                                <Download size={18} /> Xuất Hồ Sơ & Đề Thi (Word)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI REVIEW RESULTS MODAL */}
            {isReviewModalOpen && reviewResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="p-6 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                                    {reviewResult.overallScore}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <ShieldCheck size={22} /> Kết Quả Thẩm Định Sư Phạm (AI Reviewer)
                                    </h3>
                                    <p className="text-xs text-purple-200">Đánh giá độ chuẩn xác, tính sư phạm và độ phân hóa</p>
                                </div>
                            </div>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-white/80 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Verdict */}
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                <h4 className="font-bold text-purple-900 text-sm mb-1">Kết luận tổng quan của Hội đồng:</h4>
                                <p className="text-sm text-purple-800">{reviewResult.verdict}</p>
                            </div>

                            {/* Strengths & Weaknesses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <h4 className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-1.5">
                                        <CheckCircle2 size={16} className="text-emerald-600" /> Điểm mạnh đề thi:
                                    </h4>
                                    <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">
                                        {reviewResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h4 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-1.5">
                                        <AlertTriangle size={16} className="text-amber-600" /> Khuyến nghị cải thiện:
                                    </h4>
                                    <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                                        {reviewResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>

                            {/* Detailed Question Review */}
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-3">Nhận xét chi tiết từng câu:</h4>
                                <div className="space-y-2">
                                    {reviewResult.questionAnalyses.map((qa, i) => (
                                        <div key={i} className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                                            qa.status === 'error' 
                                                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                                                : qa.status === 'warning' 
                                                ? 'bg-yellow-50 border-yellow-200 text-yellow-900' 
                                                : 'bg-gray-50 border-gray-200 text-gray-800'
                                        }`}>
                                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                                qa.status === 'error' ? 'bg-rose-600 text-white' : qa.status === 'warning' ? 'bg-yellow-600 text-white' : 'bg-emerald-600 text-white'
                                            }`}>
                                                Câu {qa.questionIndex || i + 1}
                                            </span>
                                            <span className="flex-1">{qa.comment}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark"
                            >
                                Đã hiểu & Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ENHANCED EXPORT MODAL */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
                        <div className="flex justify-between items-center p-6 border-b shrink-0">
                            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                                <Download /> Tùy Chọn Xuất Hồ Sơ Khảo Thí
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 flex-1">
                            {/* Export Type Selection */}
                            <div className="mb-6 space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Định dạng xuất file:
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'full_dossier' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'full_dossier'} onChange={() => setExportType('full_dossier')} />
                                    <div>
                                        <div className="text-sm">Trọn bộ Hồ sơ Khảo thí đầy đủ</div>
                                        <div className="text-xs text-gray-500 font-normal">Gồm: Đề các mã + Barem chấm + Bảng đáp án đối chiếu</div>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'current' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'current'} onChange={() => setExportType('current')} />
                                    <div>
                                        <div className="text-sm">Chỉ xuất Mã đề đang xem ({activeVariantCode})</div>
                                        <div className="text-xs text-gray-500 font-normal">Đề thi + Hướng dẫn chấm tương ứng cho mã đề {activeVariantCode}</div>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'all' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'all'} onChange={() => setExportType('all')} />
                                    <div>
                                        <div className="text-sm">Tất cả {variants.length} Mã đề (Gộp vào 1 file Word)</div>
                                        <div className="text-xs text-gray-500 font-normal">Mỗi mã đề bắt đầu trên 1 trang mới</div>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'key_matrix' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'key_matrix'} onChange={() => setExportType('key_matrix')} />
                                    <div>
                                        <div className="text-sm">Bảng đối chiếu đáp án các mã đề (Cross Matrix)</div>
                                        <div className="text-xs text-gray-500 font-normal">Phục vụ giáo viên chấm thi hoặc soi phách nhanh chóng</div>
                                    </div>
                                </label>
                                <div className="border-t border-gray-200 my-2 pt-2"></div>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'azota_current' ? 'border-orange-500 bg-orange-50/50 text-orange-600 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'azota_current'} onChange={() => setExportType('azota_current')} />
                                    <div>
                                        <div className="text-sm">Xuất Azota (Chỉ mã đề đang xem: {activeVariantCode})</div>
                                        <div className="text-xs text-gray-500 font-normal">Định dạng chuẩn Azota cho mã đề {activeVariantCode}</div>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'azota_all' ? 'border-orange-500 bg-orange-50/50 text-orange-600 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="exportOption" checked={exportType === 'azota_all'} onChange={() => setExportType('azota_all')} />
                                    <div>
                                        <div className="text-sm">Xuất Azota (Tất cả {variants.length} mã đề)</div>
                                        <div className="text-xs text-gray-500 font-normal">Tự động tải về {variants.length} file Azota riêng biệt</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Đơn vị chủ quản</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={headerInfo.donVi} onChange={e=>setHeaderInfo({...headerInfo, donVi:e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên trường</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={headerInfo.tenTruong} onChange={e=>setHeaderInfo({...headerInfo, tenTruong:e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên kỳ thi</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={headerInfo.tenKyThi} onChange={e=>setHeaderInfo({...headerInfo, tenKyThi:e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Môn học</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={headerInfo.monHoc} onChange={e=>setHeaderInfo({...headerInfo, monHoc:e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Thời gian</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={headerInfo.thoiGian} onChange={e=>setHeaderInfo({...headerInfo, thoiGian:e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-700 mb-1">Tên file Word tải về (không cần gõ .doc)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border-2 border-blue-400 bg-blue-50/30 rounded-lg text-sm font-semibold text-gray-800" 
                                    value={customFileName} 
                                    onChange={e => setCustomFileName(e.target.value)} 
                                    placeholder="GK1 TIN 7-26-27-THUONG"
                                />
                            </div>
                        </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">
                                Hủy bỏ
                            </button>
                            <button onClick={handlePerformExport} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark shadow-md flex items-center gap-2">
                                <Printer size={16} /> Tải File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamGenerator;