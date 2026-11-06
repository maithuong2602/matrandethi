import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Upload, FileText, Settings, Play, Check, X, Printer, Download, RefreshCw,
    Layers, FileJson, Grid3X3, ChevronDown, AlertCircle, Sparkles,
    Wand2, ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet,
    Shuffle, Copy, Loader2, FolderCheck, FileBox, Search, Database, Trash2, PlusCircle
} from 'lucide-react';
import { ExerciseQuestion, ImportedMatrixData, ExamVariant, ExamReviewResult, SavedExamDossier } from '../types';
import {
    generateExamWordHtml,
    generateAzotaKeyHtml,
    generateExamVariants,
    generateMultiCodeAnswerKeyMatrixHtml,
    generateFullDossierHtml,
    extractHtmlParts
} from '../utils';
import { reviewExamWithAI, autoFillMissingQuestions } from '../services/geminiService';
import { splitLegacyTrueFalseQuestions, autoTagQuestion } from './QuestionManager';
import { CURRICULUM } from '../data/curriculum';
import { loadQuestionBank, saveQuestionBank } from '../services/storage/questionBankStorage';
import {
    getSavedExams,
    saveExamDossier,
    deleteExamDossier,
    duplicateExamDossier,
    exportExamBankJson,
    importExamBankJson,
    subscribeExamChange,
    submitExamForReview,
    approveExam
} from '../services/examApprovalService';
import { getCurrentUser, canApproveExam } from '../services/authService';

export const detectGradeFromContext = (questions: any[], headerInfo?: any, importedMatrix?: any): string => {
    if (Array.isArray(questions)) {
        for (const q of questions) {
            if (q.grade && ['6', '7', '8', '9', '10', '11', '12'].includes(String(q.grade))) {
                return String(q.grade);
            }
        }
        for (const q of questions) {
            if (q.lesson) {
                for (const [g, lessons] of Object.entries(CURRICULUM.criteriaData)) {
                    if (lessons[q.lesson]) return g;
                }
            }
        }
    }
    const matrixName = importedMatrix?.thongTinChung?.tenDe || '';
    const matrixMatch = matrixName.match(/L[ớo]p\s*(\d+)|Kh[ốo]i\s*(\d+)|\b(6|7|8|9|10|11|12)\b/i);
    if (matrixMatch) {
        const g = matrixMatch[1] || matrixMatch[2] || matrixMatch[3];
        if (g && ['6', '7', '8', '9', '10', '11', '12'].includes(g)) return g;
    }
    if (headerInfo?.monHoc) {
        const m = headerInfo.monHoc.match(/L[ỚO]P\s*(\d+)/i);
        if (m && m[1]) return m[1];
    }
    if (headerInfo?.tenKyThi) {
        const m = headerInfo.tenKyThi.match(/L[ỚO]P\s*(\d+)/i);
        if (m && m[1]) return m[1];
    }
    return '7';
};

export const buildDefaultFileName = (
    questions: any[],
    headerInfo: any,
    teacherName?: string,
    importedMatrix?: any
): string => {
    const grade = detectGradeFromContext(questions, headerInfo, importedMatrix);
    const examTitle = (headerInfo?.tenKyThi || importedMatrix?.thongTinChung?.tenDe || '').toUpperCase();

    let examCode = 'GK1';
    if (examTitle.includes('CUỐI KÌ 1') || examTitle.includes('CUỐI KÌ I') || examTitle.includes('CK1') || examTitle.includes('CK 1') || examTitle.includes('HỌC KÌ 1') || examTitle.includes('HỌC KÌ I')) {
        examCode = 'CK1';
    } else if (examTitle.includes('GIỮA KÌ 2') || examTitle.includes('GIỮA KÌ II') || examTitle.includes('GK2') || examTitle.includes('GK 2')) {
        examCode = 'GK2';
    } else if (examTitle.includes('CUỐI KÌ 2') || examTitle.includes('CUỐI KÌ II') || examTitle.includes('CK2') || examTitle.includes('CK 2') || examTitle.includes('HỌC KÌ 2') || examTitle.includes('HỌC KÌ II')) {
        examCode = 'CK2';
    } else if (examTitle.includes('GIỮA KÌ 1') || examTitle.includes('GIỮA KÌ I') || examTitle.includes('GK1') || examTitle.includes('GK 1')) {
        examCode = 'GK1';
    }

    let yearCode = '';
    const yearMatch = examTitle.match(/(\d{4})\s*[\-–]\s*(\d{4})/);
    if (yearMatch) {
        yearCode = `${yearMatch[1].slice(-2)}-${yearMatch[2].slice(-2)}`;
    } else {
        const now = new Date();
        const y = now.getFullYear();
        const startY = now.getMonth() >= 8 ? y : y - 1;
        yearCode = `${String(startY).slice(-2)}-${String(startY + 1).slice(-2)}`;
    }

    const teacher = (teacherName || '').trim().replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '');
    return teacher ? `${examCode} TIN ${grade}-${yearCode}-${teacher}` : `${examCode} TIN ${grade}-${yearCode}`;
};

interface BankQuestion extends ExerciseQuestion {
    lesson: string;
    points?: number;
    uniqueId?: number;
}

const ExamGenerator: React.FC = () => {
    const [step, setStep] = useState<'upload' | 'config' | 'review'>('upload');
    const [bank, setBank] = useState<BankQuestion[]>([]);
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
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
    const [exportType, setExportType] = useState<'current' | 'all' | 'key_matrix' | 'full_dossier' | 'azota_current' | 'azota_all'>('current');
    const [isSwapMenuOpen, setIsSwapMenuOpen] = useState<boolean>(false);
    const swapMenuRef = useRef<HTMLDivElement>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Exam Bank (Ngân hàng Đề thi) State
    const [currentDossierId, setCurrentDossierId] = useState<string | null>(null);
    const [allSavedExams, setAllSavedExams] = useState<SavedExamDossier[]>(getSavedExams());
    const [showDossierRepoModal, setShowDossierRepoModal] = useState<boolean>(false);
    const [examGradeFilter, setExamGradeFilter] = useState<string>('all');
    const [examSearchQuery, setExamSearchQuery] = useState<string>('');

    const showNotice = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3500);
    };

    const normalizeLevel = (lvl: string) => {
        if (!lvl) return 'NB';
        const s = lvl.trim().toUpperCase();
        if (s === 'NB' || s === 'NHẬN BIẾT' || s.startsWith('NHẬN')) return 'NB';
        if (s === 'TH' || s === 'THÔNG HIỂU' || s.startsWith('THÔNG')) return 'TH';
        if (s === 'VDC' || s === 'VẬN DỤNG CAO') return 'VDC';
        if (s === 'VD' || s === 'VẬN DỤNG') return 'VD';
        return s;
    };

    // Tự động nạp Ngân hàng Câu hỏi có sẵn trên máy ngay khi mở trang
    const loadInternalQuestionBank = (gradeFilter = selectedGradeFilter, moveToConfig = false) => {
        const res = loadQuestionBank();
        if (res.data && res.data.length > 0) {
            const tagged = splitLegacyTrueFalseQuestions(res.data.map(autoTagQuestion));
            const filtered = gradeFilter === 'all'
                ? tagged
                : tagged.filter(q => String(q.grade) === gradeFilter);

            const normalized: BankQuestion[] = filtered.map(q => ({
                ...q,
                level: normalizeLevel(q.level),
                lesson: q.lesson || 'Bài chung',
                uniqueId: Math.random()
            }));

            setBank(normalized);
            if (gradeFilter !== 'all') {
                setHeaderInfo(prev => ({ ...prev, monHoc: `MÔN: TIN HỌC – LỚP ${gradeFilter}` }));
            } else if (normalized.length > 0) {
                const detectedG = detectGradeFromContext(normalized, headerInfo);
                setHeaderInfo(prev => ({ ...prev, monHoc: `MÔN: TIN HỌC – LỚP ${detectedG}` }));
            }

            if (moveToConfig) {
                if (normalized.length === 0) {
                    showNotice(`Chưa có câu hỏi nào thuộc Khối ${gradeFilter} trong Ngân hàng.`);
                } else {
                    setStep('config');
                }
            }
        }
    };

    useEffect(() => {
        loadInternalQuestionBank('all', false);
        const unsubExam = subscribeExamChange(() => setAllSavedExams(getSavedExams()));
        return () => {
            unsubExam();
        };
    }, []);

    // Danh sách Ma trận đã lưu sẵn trên máy (từ mục Xây Dựng Ma Trận)
    const savedLocalMatrices = useMemo(() => {
        const list: { name: string; data: ImportedMatrixData }[] = [];
        try {
            const raw = localStorage.getItem('matrixFileSystem');
            if (!raw) return list;
            const fs = JSON.parse(raw);
            if (Array.isArray(fs?.children)) {
                fs.children.forEach((folder: any) => {
                    if (folder.type === 'folder' && folder.matrixData?.matrix?.rows) {
                        const mRows = folder.matrixData.matrix.rows;
                        const sRows = folder.matrixData.specifications?.rows || [];
                        const newRows = folder.matrixData.newFormatRows || {};
                        const converted: ImportedMatrixData = {
                            thongTinChung: {
                                tenDe: folder.name,
                                ngayTao: new Date().toISOString(),
                                matrixFormat: folder.matrixData.matrixFormat || 'classic'
                            },
                            chiTiet: mRows.map((row: any[], idx: number) => ({
                                thongTinChung: {
                                    stt: row[0],
                                    chuong: row[1],
                                    noiDung: row[2],
                                    bai: row[3] || row[2],
                                    soTiet: parseFloat(row[4]) || 0,
                                    daThi: row[14] === '1'
                                },
                                yeuCauCanDat: sRows[idx] ? sRows[idx][4] : '',
                                tracNghiem: {
                                    NB: parseInt(row[5]) || 0,
                                    TH: parseInt(row[7]) || 0,
                                    VD: parseInt(row[9]) || 0,
                                    VDC: parseInt(row[11]) || 0
                                },
                                tuLuan: {
                                    NB: parseInt(row[6]) || 0,
                                    TH: parseInt(row[8]) || 0,
                                    VD: parseInt(row[10]) || 0,
                                    VDC: parseInt(row[12]) || 0
                                },
                                chiTiet4Phan: newRows[idx] ? {
                                    nhieuLuaChon: newRows[idx].mc,
                                    dungSai: newRows[idx].tf,
                                    traLoiNgan: newRows[idx].sa,
                                    tuLuan: newRows[idx].essay
                                } : undefined,
                                tiLeDiem: parseFloat(row[13]) || 0
                            }))
                        };
                        list.push({ name: folder.name, data: converted });
                    }
                });
            }
        } catch {
            // ignore
        }
        return list;
    }, [step, configMode]);

    const [headerInfo, setHeaderInfo] = useState({
        donVi: 'UBND PHƯỜNG HẢI CHÂU',
        tenTruong: 'LÊ HỒNG PHONG',
        tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
        monHoc: 'MÔN: TIN HỌC – LỚP 7',
        thoiGian: '45 phút (không kể thời gian giao đề)',
        maDe: '101'
    });
    const [teacherName, setTeacherName] = useState<string>(() => {
        try { return localStorage.getItem('teacherName') || ''; } catch { return ''; }
    });
    const [customFileName, setCustomFileName] = useState<string>('');
    const [isFileNameManuallyEdited, setIsFileNameManuallyEdited] = useState<boolean>(false);

    useEffect(() => {
        try { localStorage.setItem('teacherName', teacherName); } catch { }
    }, [teacherName]);

    useEffect(() => {
        if (!isFileNameManuallyEdited) {
            const autoName = buildDefaultFileName(generatedTest, headerInfo, teacherName, importedMatrix);
            setCustomFileName(autoName);
        }
    }, [generatedTest, headerInfo, teacherName, importedMatrix, isFileNameManuallyEdited]);

    // --- EXAM BANK (NGÂN HÀNG ĐỀ THI) HANDLERS ---
    const handleSaveToExamBank = () => {
        if (generatedTest.length === 0) {
            showNotice('Chưa có câu hỏi nào trong đề thi để lưu.');
            return;
        }
        const gradeVal = detectGradeFromContext(generatedTest, headerInfo, importedMatrix);
        const titleVal = (customFileName || buildDefaultFileName(generatedTest, headerInfo, teacherName, importedMatrix)).trim();

        const saved = saveExamDossier({
            id: currentDossierId || undefined,
            title: titleVal,
            grade: gradeVal,
            status: 'approved',
            questions: generatedTest,
            variants: variants,
            matrixData: importedMatrix,
            headerInfo: headerInfo,
            teacherName: teacherName || 'Giáo viên',
            aiReviewScore: reviewResult?.overallScore,
            aiReviewSummary: reviewResult?.verdict
        });

        setCurrentDossierId(saved.id);
        showNotice(`Đã lưu đề "${saved.title}" vào Ngân hàng Đề thi!`);
    };

    const handleSaveAsNewExam = () => {
        if (generatedTest.length === 0) return;
        const gradeVal = detectGradeFromContext(generatedTest, headerInfo, importedMatrix);
        const titleVal = (customFileName || buildDefaultFileName(generatedTest, headerInfo, teacherName, importedMatrix)).trim();

        const saved = saveExamDossier({
            id: undefined,
            title: `${titleVal} (Bản mới)`,
            grade: gradeVal,
            status: 'approved',
            questions: generatedTest,
            variants: variants,
            matrixData: importedMatrix,
            headerInfo: headerInfo,
            teacherName: teacherName || 'Giáo viên'
        });

        setCurrentDossierId(saved.id);
        setCustomFileName(saved.title);
        setIsFileNameManuallyEdited(true);
        showNotice(`Đã lưu bản đề mới "${saved.title}" vào Ngân hàng Đề thi!`);
    };

    const handleLoadDossier = (dossier: SavedExamDossier) => {
        setCurrentDossierId(dossier.id);
        if (dossier.teacherName) setTeacherName(dossier.teacherName);
        if (dossier.headerInfo) setHeaderInfo(dossier.headerInfo);
        if (dossier.title) {
            setCustomFileName(dossier.title);
            setIsFileNameManuallyEdited(true);
        }
        if (dossier.matrixData) setImportedMatrix(dossier.matrixData);
        if (Array.isArray(dossier.questions) && dossier.questions.length > 0) {
            setGeneratedTest(dossier.questions);
            setStep('review');
            showNotice(`Đã mở đề thi "${dossier.title}"`);
        } else {
            showNotice('Đề thi này chưa có danh sách câu hỏi.');
        }
        setShowDossierRepoModal(false);
    };

    const handleQuickWordDownloadFromBank = (dossier: SavedExamDossier, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!dossier.questions || dossier.questions.length === 0) {
            showNotice('Đề thi này chưa có câu hỏi để tải Word.');
            return;
        }
        const vHeader = { ...(dossier.headerInfo || headerInfo), maDe: '101' };
        const html = generateExamWordHtml(dossier.questions, vHeader);
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dossier.title || 'De_Thi'}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDuplicateDossier = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const cloned = duplicateExamDossier(id);
        if (cloned) {
            showNotice(`Đã nhân bản thành "${cloned.title}"`);
        }
    };

    const handleDeleteDossier = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bạn có chắc muốn xóa đề thi này khỏi Ngân hàng Đề thi?')) {
            deleteExamDossier(id);
            if (currentDossierId === id) {
                setCurrentDossierId(null);
            }
            showNotice('Đã xóa đề thi khỏi Ngân hàng.');
        }
    };

    const handleExportExamBank = (singleId?: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const jsonStr = exportExamBankJson(singleId);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = singleId ? `DeThi_${singleId}.json` : `NganHang_DeThi_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotice('Đã xuất tệp Ngân hàng Đề thi (.json) thành công!');
    };

    const handleImportExamBankFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (!content) return;
            const res = importExamBankJson(content);
            if (res.success) {
                showNotice(`Đã nhập Ngân hàng Đề thi (Thêm mới: ${res.addedCount}, Cập nhật: ${res.updatedCount})!`);
            } else {
                alert(res.error || 'Lỗi nhập tệp Ngân hàng Đề thi.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const [bulkPoints, setBulkPoints] = useState(0.25);
    const [bulkPointsTL, setBulkPointsTL] = useState(1.0);

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

    // Filtered Saved Exams
    const filteredSavedExams = useMemo(() => {
        return allSavedExams.filter(exam => {
            const matchGrade = examGradeFilter === 'all' || String(exam.grade) === examGradeFilter;
            const q = examSearchQuery.trim().toLowerCase();
            const matchQuery = !q || exam.title.toLowerCase().includes(q) || (exam.headerInfo?.tenKyThi || '').toLowerCase().includes(q);
            return matchGrade && matchQuery;
        });
    }, [allSavedExams, examGradeFilter, examSearchQuery]);

    // --- STEP 1: UPLOAD OR LOAD QUESTION BANK ---
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
                const gradeName = data.info?.grade || '';
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
                            grade: q.grade || gradeName,
                            lesson: q.lesson || lessonName,
                            uniqueId: Math.random()
                        };
                        newQuestions.push(normalizedQ);
                    });
                }
            });

            // Merge with existing internal Question Bank so uploaded questions are also saved!
            const combined = [...bank, ...newQuestions];
            const uniqueMap = new Map();
            combined.forEach(q => {
                const key = (q.content || '').trim().toLowerCase();
                if (!uniqueMap.has(key)) uniqueMap.set(key, q);
            });

            const rawQuestions = Array.from(uniqueMap.values());
            const migrated = splitLegacyTrueFalseQuestions(rawQuestions as any);
            setBank(migrated as any);

            // Also persist into primary Question Bank storage
            const stored = loadQuestionBank().data || [];
            const storedMap = new Map();
            stored.forEach(q => storedMap.set((q.content || '').trim().toLowerCase(), q));
            migrated.forEach(q => storedMap.set((q.content || '').trim().toLowerCase(), q));
            saveQuestionBank(Array.from(storedMap.values()), { force: true });

            const detectedG = detectGradeFromContext(migrated, headerInfo);
            setHeaderInfo(prev => ({
                ...prev,
                monHoc: `MÔN: TIN HỌC – LỚP ${detectedG}`
            }));
            if (migrated.length > 0) {
                showNotice(`Đã nạp và đồng bộ ${migrated.length} câu hỏi vào Ngân hàng!`);
                setStep('config');
            }
        });
    };

    // --- STEP 2: CONFIGURATION ---
    const availableStats = useMemo(() => {
        const stats: Record<string, Record<string, number>> = {};
        bank.forEach(q => {
            if (!stats[q.lesson]) stats[q.lesson] = { NB: 0, TH: 0, VD: 0, VDC: 0 };
            const lvl = q.level as 'NB' | 'TH' | 'VD' | 'VDC';
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

    const applyMatrixData = (data: ImportedMatrixData) => {
        setImportedMatrix(data);
        if (data.thongTinChung?.tenDe) {
            const detectedG = detectGradeFromContext([], null, data);
            setHeaderInfo(prev => ({
                ...prev,
                tenKyThi: data.thongTinChung.tenDe,
                monHoc: `MÔN: TIN HỌC – LỚP ${detectedG}`
            }));
        }
    };

    const handleMatrixUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.chiTiet && Array.isArray(data.chiTiet)) {
                    applyMatrixData(data);
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

        const findQuestions = (
            lessonName: string,
            level: string,
            category: 'mc'|'essay',
            count: number,
            preferredQuestionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay'
        ) => {
            const normalizedTarget = lessonName.toLowerCase().trim();
            const pool = bank.filter(q => {
                const normalizedSource = q.lesson.toLowerCase().trim();
                const lessonMatch = normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
                if (!lessonMatch || q.level !== level) return false;
                if (preferredQuestionType) {
                    if (q.questionType === preferredQuestionType) return true;
                    return q.category === category;
                }
                return q.category === category;
            });

            // Prefer exact questionType first if specified
            const sortedPool = preferredQuestionType
                ? [
                    ...pool.filter(q => q.questionType === preferredQuestionType).sort(() => 0.5 - Math.random()),
                    ...pool.filter(q => q.questionType !== preferredQuestionType).sort(() => 0.5 - Math.random())
                ]
                : [...pool].sort(() => 0.5 - Math.random());

            if (sortedPool.length < count) {
                const diff = count - sortedPool.length;
                missing.push({
                    lesson: lessonName,
                    level,
                    count: diff,
                    questionType: preferredQuestionType || (category === 'essay' ? 'essay' : 'multiple-choice')
                });
            }

            return sortedPool.slice(0, count).map(q => ({
                ...q,
                points: category === 'essay' ? 1.0 : preferredQuestionType === 'true-false' ? 1.0 : preferredQuestionType === 'short-answer' ? 0.5 : 0.25,
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
                alert("Vui lòng chọn hoặc tải lên Ma trận đề thi.");
                return;
            }
            importedMatrix.chiTiet.forEach(row => {
                const lessonName = row.thongTinChung.bai;
                if (importedMatrix.thongTinChung?.matrixFormat === 'new_4part' && row.chiTiet4Phan) {
                    const p4 = row.chiTiet4Phan;
                    const pick4Part = (
                        grp: { B: { count: number }; H: { count: number }; VD: { count: number } } | undefined,
                        cat: 'mc' | 'essay',
                        qType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay'
                    ) => {
                        if (!grp) return;
                        if (grp.B?.count > 0) selected.push(...findQuestions(lessonName, 'NB', cat, grp.B.count, qType));
                        if (grp.H?.count > 0) selected.push(...findQuestions(lessonName, 'TH', cat, grp.H.count, qType));
                        if (grp.VD?.count > 0) selected.push(...findQuestions(lessonName, 'VD', cat, grp.VD.count, qType));
                    };
                    pick4Part(p4.nhieuLuaChon, 'mc', 'multiple-choice');
                    pick4Part(p4.dungSai, 'mc', 'true-false');
                    pick4Part(p4.traLoiNgan, 'mc', 'short-answer');
                    pick4Part(p4.tuLuan, 'essay', 'essay');
                } else {
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
                }
            });
        }

        setMissingRequirements(missing);

        if (selected.length === 0 && missing.length === 0) {
            alert("Vui lòng nhập số lượng câu hỏi cần lấy trước khi tạo đề.");
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

        setCurrentDossierId(null);
        setGeneratedTest(selected);
        setStep('review');
    };

    // --- SMART AUTO-FILL WITH AI ---
    const handleTriggerAutoFill = async () => {
        if (missingRequirements.length === 0) return;
        setIsAutoFilling(true);
        setAutoFillProgress('Đang khởi tạo câu hỏi bù đắp theo chuẩn GDPT 2018...');

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
                setBank(prev => [...prev, ...autoQuestions]);
                setGeneratedTest(prev => [...prev, ...autoQuestions]);
                setMissingRequirements([]);
                // Save newly generated questions back into Question Bank storage
                const currentStored = loadQuestionBank().data || [];
                saveQuestionBank([...currentStored, ...autoQuestions], { force: true });
                showNotice(`Đã bù đắp thành công ${autoQuestions.length} câu hỏi vào đề thi và lưu vào Ngân hàng!`);
            } else {
                alert("Không thể sinh câu hỏi tự động.");
            }
        } catch (error) {
            alert("Lỗi khi bù đắp tự động: " + (error as Error).message);
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
            alert("Không tìm thấy câu hỏi thay thế nào khác trong ngân hàng.");
        } else {
            showNotice(`Đã đổi ${swappedCount} câu hỏi mới từ Ngân hàng.`);
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
            alert(`Không tìm thấy câu hỏi nào khác cùng bài và mức độ để thay thế.`);
        }
    };

    const applyBulkPoints = () => {
        setGeneratedTest(prev => prev.map(q => q.category !== 'essay' ? { ...q, points: bulkPoints } : q));
    };

    const applyBulkPointsTL = () => {
        setGeneratedTest(prev => prev.map(q => q.category === 'essay' ? { ...q, points: bulkPointsTL } : q));
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
            const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
            a.download = `Bang_Dap_An_${baseName}.doc`;
            a.click();
        } else if (exportType === 'full_dossier') {
            const html = generateFullDossierHtml(null, variants, headerInfo);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
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
            const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
            a.download = `Bo_De_${baseName}.doc`;
            a.click();
        } else {
            const currentV = variants.find(v => v.code === activeVariantCode);
            const vHeader = { ...headerInfo, maDe: activeVariantCode };
            const html = generateExamWordHtml(currentV ? currentV.questions : generatedTest, vHeader);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
            a.download = `${baseName}.doc`;
            a.click();
        }

        setShowExportModal(false);
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* TOP HEADER WITH QUICK ACCESS TO EXAM BANK */}
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <Layers className="text-primary" size={26} /> Tạo Đề Thi & Ngân Hàng Đề Thi
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        Kết nối trực tiếp Ngân hàng câu hỏi trên máy, trộn đa mã đề và lưu trữ Ngân hàng đề thi chuyên nghiệp.
                    </p>
                </div>

                {/* Progress Steps & Exam Bank Button */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-gray-200 text-xs">
                        <button
                            type="button"
                            onClick={() => setStep('upload')}
                            className={`flex items-center gap-1.5 cursor-pointer ${step === 'upload' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] border border-current">1</span> Nguồn & Kho Đề
                        </button>
                        <span className="text-gray-300">→</span>
                        <button
                            type="button"
                            onClick={() => bank.length > 0 && setStep('config')}
                            disabled={bank.length === 0}
                            className={`flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${step === 'config' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] border border-current">2</span> Cấu hình & Ma trận
                        </button>
                        <span className="text-gray-300">→</span>
                        <button
                            type="button"
                            onClick={() => generatedTest.length > 0 && setStep('review')}
                            disabled={generatedTest.length === 0}
                            className={`flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${step === 'review' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] border border-current">3</span> Xem & Xuất Đề
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDossierRepoModal(true)}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs"
                    >
                        <FileBox size={16} />
                        Ngân Hàng Đề Đã Lưu ({allSavedExams.length})
                    </button>
                </div>
            </header>

            {/* VIEW 1: SOURCE SELECTION & SAVED EXAM BANK */}
            {step === 'upload' && (
                <div className="space-y-6">
                    {/* Top Grid: 1-Click Use Internal Question Bank vs Upload JSON */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Card 1: Direct Internal Question Bank (2 cols) */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs p-6 border border-blue-200 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="px-3 py-1 bg-blue-50 text-primary rounded-full text-xs font-bold flex items-center gap-1.5">
                                        <Database size={14} /> Khuyên dùng • Tự động kết nối
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Đang có sẵn <strong className="text-primary">{bank.length} câu hỏi</strong>
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1.5">
                                    Tạo đề thi mới từ Ngân hàng Câu hỏi trên máy
                                </h2>
                                <p className="text-sm text-gray-500 mb-5">
                                    Sử dụng trực tiếp các câu hỏi bạn đã soạn trong mục <strong>Câu Hỏi</strong> mà không cần phải xuất/nhập file thủ công.
                                </p>

                                {/* Grade Filter Pills */}
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-gray-600 mb-2">Chọn Khối lớp cần ra đề:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'all', label: 'Tất cả các khối' },
                                            { id: '6', label: 'Khối 6' },
                                            { id: '7', label: 'Khối 7' },
                                            { id: '8', label: 'Khối 8' },
                                            { id: '9', label: 'Khối 9' },
                                        ].map(g => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedGradeFilter(g.id);
                                                    loadInternalQuestionBank(g.id, false);
                                                }}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedGradeFilter === g.id
                                                    ? 'bg-primary text-white border-primary shadow-xs'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                                <div className="text-xs text-gray-500">
                                    Số bài học sẵn sàng: <strong className="text-gray-800">{Object.keys(availableStats).length} bài</strong>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadInternalQuestionBank(selectedGradeFilter, true)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                                >
                                    <Play size={16} /> Tiếp tục cấu hình Đề thi ({bank.length} câu)
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Upload External JSON Files (1 col) */}
                        <div
                            className="bg-white rounded-2xl shadow-xs p-6 text-center border-2 border-dashed border-gray-200 hover:border-primary transition-all cursor-pointer flex flex-col items-center justify-center group"
                            onClick={() => document.getElementById('jsonUpload')?.click()}
                        >
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-primary group-hover:scale-105 transition-transform border border-gray-200">
                                <Upload size={26} />
                            </div>
                            <h3 className="text-base font-bold text-gray-800 mb-1">Nạp thêm từ File JSON</h3>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                Tải lên 1 hoặc nhiều file <code className="bg-gray-100 px-1 rounded">.json</code> câu hỏi từ máy tính để gộp vào Ngân hàng.
                            </p>
                            <input
                                type="file"
                                id="jsonUpload"
                                className="hidden"
                                accept=".json"
                                multiple
                                onChange={handleFileUpload}
                            />
                            <span className="px-4 py-2 bg-slate-100 group-hover:bg-primary group-hover:text-white text-gray-700 rounded-xl text-xs font-bold transition-colors">
                                Chọn file JSON từ máy
                            </span>
                        </div>
                    </div>

                    {/* SAVED EXAM BANK SECTION (NGÂN HÀNG ĐỀ THI ĐÃ LƯU) */}
                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileBox className="text-primary" size={22} /> Ngân Hàng Đề Thi Đã Lưu ({allSavedExams.length})
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Lưu trữ trọn bộ đề thi, các mã đề hoán vị & đáp án để sử dụng lâu dài qua các năm học.
                                </p>
                            </div>

                            {/* Export / Import Exam Bank Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleExportExamBank()}
                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    title="Tải toàn bộ Ngân hàng Đề thi về máy dạng file .json"
                                >
                                    <Download size={14} className="text-primary" /> Sao lưu Kho Đề (.json)
                                </button>
                                <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                                    <Upload size={14} className="text-emerald-600" /> Nhập Đề Thi (.json)
                                    <input type="file" accept=".json" onChange={handleImportExamBankFile} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Filter & Search Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 my-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { id: 'all', label: 'Tất cả' },
                                    { id: '6', label: 'Khối 6' },
                                    { id: '7', label: 'Khối 7' },
                                    { id: '8', label: 'Khối 8' },
                                    { id: '9', label: 'Khối 9' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setExamGradeFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${examGradeFilter === tab.id
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm tên đề thi, kỳ thi..."
                                    value={examSearchQuery}
                                    onChange={(e) => setExamSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Saved Exam Cards List */}
                        {filteredSavedExams.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                Chưa có đề thi nào trong mục này. Hãy tạo đề mới hoặc bấm "Nhập Đề Thi (.json)".
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {filteredSavedExams.map(dossier => (
                                    <div
                                        key={dossier.id}
                                        onClick={() => handleLoadDossier(dossier)}
                                        className="p-4 rounded-xl border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all bg-white cursor-pointer flex flex-col justify-between gap-3 group"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-primary text-[11px] font-bold border border-blue-100">
                                                        Khối {dossier.grade || '7'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-gray-700 text-[11px] font-semibold">
                                                        {dossier.questions?.length || 0} câu
                                                    </span>
                                                    {dossier.variants && dossier.variants.length > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                                                            {dossier.variants.length} mã đề
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-gray-400">
                                                    {new Date(dossier.updatedAt || dossier.createdAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                                                {dossier.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                {dossier.headerInfo?.tenKyThi || 'Đề kiểm tra định kì'} • {dossier.headerInfo?.tenTruong || ''}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                                            <span className="text-xs font-bold text-primary">
                                                Bấm để mở & chỉnh sửa →
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleQuickWordDownloadFromBank(dossier, e)}
                                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                                    title="Tải ngay file Word (.doc)"
                                                >
                                                    <Download size={12} /> Word
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleExportExamBank(dossier.id, e)}
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Xuất đề này ra file .json"
                                                >
                                                    <FileJson size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDuplicateDossier(dossier.id, e)}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Nhân bản đề thi này"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteDossier(dossier.id, e)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Xóa đề thi"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 2: CONFIG */}
            {step === 'config' && (
                <div className="bg-white rounded-2xl shadow-xs p-6 sm:p-8 border border-gray-200">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b pb-5">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Settings size={22} className="text-primary" /> Thiết Lập Cấu Trúc Đề Thi & Mã Đề
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                Ngân hàng đang chọn: <strong className="text-primary">{bank.length} câu hỏi</strong> ({Object.keys(availableStats).length} bài học)
                            </p>
                        </div>

                        {/* Config Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setConfigMode('manual')}
                                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${configMode === 'manual' ? 'bg-white text-primary shadow-2xs' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Grid3X3 size={16} /> Chọn Số Câu Theo Bài
                            </button>
                            <button
                                onClick={() => setConfigMode('matrix')}
                                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${configMode === 'matrix' ? 'bg-white text-primary shadow-2xs' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <FileJson size={16} /> Theo Ma Trận Đề
                            </button>
                        </div>
                    </div>

                    {/* Mode 1: Manual Table */}
                    {configMode === 'manual' && (
                        <div className="overflow-x-auto border rounded-xl mb-6">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-700 text-xs sm:text-sm">
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
                                                <td className="p-3 border font-medium text-gray-800 text-sm">{lesson}</td>
                                                {['NB', 'TH', 'VD', 'VDC'].map(lvl => (
                                                    <td key={lvl} className="p-2 border text-center">
                                                        <div className="flex flex-col items-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={stats[lvl]}
                                                                value={manualConfig[lesson]?.[lvl] || ''}
                                                                placeholder="0"
                                                                className={`w-16 p-1.5 text-center border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm ${stats[lvl] === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold text-gray-800'}`}
                                                                disabled={stats[lvl] === 0}
                                                                onChange={(e) => handleManualConfigChange(lesson, lvl, e.target.value)}
                                                            />
                                                            <span className="text-[10px] text-gray-400 mt-1">Kho: {stats[lvl]}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Mode 2: Matrix Selection (Direct from Local Storage OR Upload JSON) */}
                    {configMode === 'matrix' && (
                        <div className="space-y-4 mb-6">
                            {/* Saved Matrices on Machine */}
                            {savedLocalMatrices.length > 0 && !importedMatrix && (
                                <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Database size={16} className="text-primary" /> Chọn nhanh Ma trận đã tạo trên máy:
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {savedLocalMatrices.map((m, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => applyMatrixData(m.data)}
                                                className="p-3.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-primary rounded-xl text-left transition-all shadow-2xs"
                                            >
                                                <div className="font-bold text-sm text-gray-900">{m.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">{m.data.chiTiet.length} nội dung / bài học</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50">
                                {!importedMatrix ? (
                                    <>
                                        <FileJson size={40} className="mx-auto text-primary mb-3" />
                                        <h3 className="text-base font-bold text-gray-800 mb-1">Hoặc tải lên file Ma trận (.json)</h3>
                                        <p className="text-xs text-gray-500 mb-4">Sử dụng file JSON xuất từ mục "Xây dựng Ma trận" để tự động chia tỷ lệ số câu.</p>
                                        <label className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-primary-dark transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs">
                                            <Upload size={16} /> Chọn file Ma trận JSON
                                            <input type="file" className="hidden" accept=".json" onChange={handleMatrixUpload} />
                                        </label>
                                    </>
                                ) : (
                                    <div className="text-left w-full mx-auto">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="text-base font-bold text-emerald-700 flex items-center gap-2">
                                                    <CheckCircle2 size={20} /> Đã chọn ma trận: {importedMatrix.thongTinChung.tenDe}
                                                </h3>
                                            </div>
                                            <button onClick={() => setImportedMatrix(null)} className="text-red-600 hover:underline text-xs font-bold">
                                                Đổi ma trận khác
                                            </button>
                                        </div>

                                        <div className="bg-white border rounded-xl overflow-hidden">
                                            <table className="w-full text-xs sm:text-sm">
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
                        </div>
                    )}

                    {/* Multi-Code Configuration Options */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                            <Shuffle size={17} className="text-primary" /> Trộn Đa Mã Đề Thi
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-2">Số lượng mã đề cần tạo:</label>
                                <div className="flex gap-2">
                                    {[1, 2, 4, 8].map(count => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setVariantCount(count)}
                                            className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${variantCount === count
                                                ? 'bg-primary text-white border-primary'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {count} mã đề
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 pt-2 md:pt-5">
                                <input
                                    type="checkbox"
                                    id="shuffleOpts"
                                    checked={shuffleOptions}
                                    onChange={(e) => setShuffleOptions(e.target.checked)}
                                    className="w-4 h-4 text-primary accent-primary rounded cursor-pointer"
                                />
                                <label htmlFor="shuffleOpts" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                                    Tự động đảo phương án A, B, C, D giữa các mã đề
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={() => setStep('upload')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm">
                            ← Quay lại
                        </button>
                        <button
                            onClick={generateTest}
                            disabled={configMode === 'matrix' && !importedMatrix}
                            className="px-7 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                            <Play size={18} /> Tạo Đề & Trộn Mã Đề
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 3: REVIEW & SAVE TO EXAM BANK & EXPORT */}
            {step === 'review' && (
                <div className="space-y-6">
                    {/* Warning & Auto-fill Banner if missing questions */}
                    {missingRequirements.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">
                                        Ngân hàng hiện thiếu {missingRequirements.reduce((sum, item) => sum + item.count, 0)} câu hỏi theo cấu hình!
                                    </p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Bấm nút bên cạnh để hệ thống tự động sinh bù các câu còn thiếu và lưu luôn vào Ngân hàng.
                                    </p>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {missingRequirements.map((req, i) => (
                                            <span key={i} className="text-xs bg-white px-2.5 py-1 rounded-lg text-amber-900 border border-amber-200">
                                                <strong>{req.lesson}</strong> ({req.level} - {req.questionType === 'essay' ? 'TL' : 'TN'}): thiếu <strong className="text-red-600">{req.count}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleTriggerAutoFill}
                                disabled={isAutoFilling}
                                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                            >
                                {isAutoFilling ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                Tự động bù câu thiếu
                            </button>
                        </div>
                    )}

                    {isAutoFilling && (
                        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-blue-800">
                            <Loader2 size={18} className="animate-spin text-primary" />
                            <span>{autoFillProgress}</span>
                        </div>
                    )}

                    {/* SAVE TO EXAM BANK BAR (LƯU TRỮ NGÂN HÀNG ĐỀ THI CHUYÊN NGHIỆP & ĐƠN GIẢN) */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-blue-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                                <FolderCheck size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase">
                                    Tên lưu trữ trong Ngân hàng Đề thi & Tên file Word:
                                </label>
                                <input
                                    type="text"
                                    value={customFileName}
                                    onChange={(e) => {
                                        setCustomFileName(e.target.value);
                                        setIsFileNameManuallyEdited(true);
                                    }}
                                    placeholder={buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)}
                                    className="w-full max-w-md mt-0.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:border-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSaveToExamBank}
                                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                            >
                                <Check size={15} />
                                {currentDossierId ? 'Cập Nhật Vào Ngân Hàng Đề' : 'Lưu Vào Ngân Hàng Đề Thi'}
                            </button>

                            {currentDossierId && (
                                <button
                                    type="button"
                                    onClick={handleSaveAsNewExam}
                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                    title="Lưu thành một bản đề thi mới trong Ngân hàng"
                                >
                                    <PlusCircle size={14} /> Lưu Bản Mới
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    const currentV = variants.find(v => v.code === activeVariantCode);
                                    const vHeader = { ...headerInfo, maDe: activeVariantCode };
                                    const html = generateExamWordHtml(currentV ? currentV.questions : generatedTest, vHeader);
                                    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
                                    a.download = `${baseName}.doc`;
                                    a.click();
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                            >
                                <Download size={15} /> Tải Ngay File Word (.doc)
                            </button>
                        </div>
                    </div>

                    {/* Top Action Bar */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">
                                Tổng số: <strong className="text-primary">{activeQuestions.length} câu</strong>
                            </span>
                            {variants.length > 1 && (
                                <div className="flex items-center gap-1.5">
                                    {variants.map(v => (
                                        <button
                                            key={v.code}
                                            onClick={() => setActiveVariantCode(v.code)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeVariantCode === v.code
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Mã {v.code}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* AI Review Button */}
                            <button
                                onClick={handleRunAIReview}
                                disabled={isReviewing}
                                className="px-3.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                AI Kiểm Tra Đề
                            </button>

                            {/* Bulk Swap Menu */}
                            <div className="relative" ref={swapMenuRef}>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSwapMenuOpen(!isSwapMenuOpen); }}
                                    className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center gap-1.5 font-bold text-xs border border-gray-200"
                                >
                                    <RefreshCw size={14} /> Đổi câu hỏi <ChevronDown size={13} />
                                </button>
                                {isSwapMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                        <button onClick={() => triggerBulkSwap()} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs flex items-center gap-2 font-bold text-gray-800">
                                            <RefreshCw size={13} /> Đổi toàn bộ đề
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
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                <span className="text-[11px] font-semibold text-gray-600 pl-2">TN:</span>
                                <input
                                    type="number"
                                    step="0.25"
                                    value={bulkPoints}
                                    onChange={(e) => setBulkPoints(parseFloat(e.target.value))}
                                    className="w-12 p-1 border rounded text-center text-xs font-bold bg-white"
                                />
                                <button onClick={applyBulkPoints} className="px-2 py-1 bg-primary text-white rounded text-[11px] font-bold">
                                    Áp dụng
                                </button>
                                <div className="h-4 w-[1px] bg-gray-300 mx-0.5"></div>
                                <span className="text-[11px] font-semibold text-gray-600 pl-1">TL:</span>
                                <input
                                    type="number"
                                    step="0.25"
                                    value={bulkPointsTL}
                                    onChange={(e) => setBulkPointsTL(parseFloat(e.target.value))}
                                    className="w-12 p-1 border rounded text-center text-xs font-bold bg-white"
                                />
                                <button onClick={applyBulkPointsTL} className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold">
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Official Exam Paper Preview Header */}
                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-8 space-y-6 font-serif">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dotted border-gray-400 p-4 rounded text-center">
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
                            <div className="flex flex-col items-center justify-start space-y-1 pl-2">
                                <span className="text-sm font-bold uppercase text-gray-950">{headerInfo.tenKyThi}</span>
                                <span className="text-sm font-extrabold uppercase text-gray-900">{headerInfo.monHoc}</span>
                                <span className="text-xs italic text-gray-600">Thời gian: {headerInfo.thoiGian}</span>
                                <span className="text-xs italic text-gray-500">(Đề có {Math.max(1, Math.ceil(activeQuestions.length / 8))} trang)</span>
                                <span className="text-xs font-bold text-gray-800 mt-1">Mã đề: {activeVariantCode || headerInfo.maDe || '101'}</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                            <h3 className="text-base font-extrabold text-gray-900 uppercase">
                                PHẦN 1. TRẮC NGHIỆM ({activeQuestions.filter(q => q.category !== 'essay').reduce((s, q) => s + (q.points || 0.25), 0).toFixed(1).replace('.', ',')} điểm)
                            </h3>
                            <p className="text-xs italic text-gray-600 mt-0.5">
                                Em hãy chọn hoặc điền đáp án đúng vào khung trả lời tương ứng:
                            </p>
                        </div>
                    </div>

                    {/* Question List Preview */}
                    <div className="space-y-4">
                        {activeQuestions.map((q, idx) => {
                            const isFirstEssay = q.category === 'essay' && (idx === 0 || activeQuestions[idx - 1].category !== 'essay');
                            const totalEssayPoints = activeQuestions.filter(item => item.category === 'essay').reduce((sum, item) => sum + (item.points ?? 1.0), 0);

                            return (
                                <React.Fragment key={q.uniqueId || idx}>
                                    {isFirstEssay && (
                                        <div className="pt-4 border-t-2 border-indigo-200 mt-6 mb-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-extrabold text-indigo-950 uppercase">
                                                    PHẦN 2. TỰ LUẬN ({totalEssayPoints.toFixed(1).replace('.', ',')} điểm)
                                                </h3>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 relative group hover:border-primary/50 transition-all">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="font-extrabold text-blue-900 text-sm">Câu {idx + 1}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${q.level === 'NB' ? 'bg-green-50 border-green-200 text-green-700' : q.level === 'TH' ? 'bg-blue-50 border-blue-200 text-blue-700' : q.level === 'VD' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                        {q.level} {q.criteria ? `- ${q.criteria}` : ''}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-purple-700 border border-purple-200 bg-purple-50 px-2 py-0.5 rounded">
                                                        {q.questionType === 'true-false'
                                                            ? 'Đúng / Sai'
                                                            : q.questionType === 'short-answer'
                                                                ? 'Trả lời ngắn'
                                                                : q.questionType === 'multiple-answer' || q.mcType === 'multiple-answer'
                                                                    ? 'Nhiều đáp án'
                                                                    : q.category === 'essay'
                                                                        ? 'Tự luận'
                                                                        : 'Trắc nghiệm'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">({q.lesson})</span>
                                                </div>
                                                <p className="text-gray-800 text-sm font-medium whitespace-pre-wrap">{q.content}</p>

                                                {q.image && (
                                                    <div className="mt-3">
                                                        <img src={q.image} alt="Question illustration" className="max-h-40 w-auto rounded-lg border border-gray-200" />
                                                    </div>
                                                )}

                                                {q.questionType === 'true-false' && (
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-gray-500">Đáp án chuẩn:</span>
                                                        <span className={`px-3 py-1 rounded text-xs font-extrabold ${q.answer === 'Sai' || q.options?.find(o => o.isCorrect)?.id === 'Sai'
                                                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                            }`}>
                                                            {q.answer === 'Sai' || q.options?.find(o => o.isCorrect)?.id === 'Sai' ? '✗ SAI' : '✓ ĐÚNG'}
                                                        </span>
                                                    </div>
                                                )}

                                                {q.questionType !== 'true-false' && q.category !== 'essay' && q.options && q.options.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {q.options.map((opt, i) => (
                                                            <div key={i} className={`text-xs p-2.5 rounded-lg border ${opt.isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                                                <strong>{opt.id || String.fromCharCode(65 + i)}.</strong> {opt.text}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.questionType === 'short-answer' && (
                                                    <div className="mt-2 text-xs bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                                                        <strong>Đáp án ngắn:</strong> {q.answer || 'Chưa có'}
                                                    </div>
                                                )}

                                                {q.category === 'essay' && q.answer && (
                                                    <div className="mt-3 text-xs bg-orange-50/70 p-3 rounded-lg border border-orange-200 text-orange-950 whitespace-pre-wrap">
                                                        <strong className="block mb-1 text-orange-900">Hướng dẫn chấm / Barem:</strong>
                                                        {q.answer}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                                                    <label className="text-xs text-gray-600 font-semibold">Điểm:</label>
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0.25"
                                                        max="10.0"
                                                        className="w-14 p-0.5 border border-gray-300 rounded text-center text-xs font-bold bg-white text-indigo-700 outline-none"
                                                        value={q.points ?? (q.category === 'essay' ? 1.0 : 0.25)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            updatePoint(q.uniqueId, isNaN(val) ? 0 : val);
                                                        }}
                                                    />
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
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Bottom Sticky Action Bar */}
                    <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 flex flex-wrap justify-between items-center gap-4 z-20">
                        <button onClick={() => setStep('config')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm">
                            ← Quay lại Cấu hình
                        </button>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                onClick={handleSaveToExamBank}
                                className="px-4 py-2.5 bg-blue-50 text-primary hover:bg-blue-100 border border-blue-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                            >
                                <FolderCheck size={16} /> Lưu Vào Ngân Hàng Đề
                            </button>

                            <button
                                onClick={() => { setExportType('key_matrix'); setShowExportModal(true); }}
                                className="px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                            >
                                <FileSpreadsheet size={16} /> Bảng Đáp Án
                            </button>

                            <button
                                onClick={() => { setExportType('azota_current'); setShowExportModal(true); }}
                                className="px-4 py-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                            >
                                <FileText size={16} /> Xuất Azota
                            </button>

                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-5 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-200 transition-all"
                            >
                                <Download size={17} /> Tùy Chọn Xuất Word
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI REVIEW RESULTS MODAL */}
            {isReviewModalOpen && reviewResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                                    {reviewResult.overallScore}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <ShieldCheck size={20} /> Kết Quả Kiểm Tra Đề Thi (AI)
                                    </h3>
                                </div>
                            </div>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-white/80 hover:text-white">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5">
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                <h4 className="font-bold text-purple-900 text-sm mb-1">Nhận xét tổng quan:</h4>
                                <p className="text-sm text-purple-800">{reviewResult.verdict}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <h4 className="font-bold text-emerald-900 text-sm mb-2">Điểm mạnh:</h4>
                                    <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">
                                        {reviewResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h4 className="font-bold text-amber-900 text-sm mb-2">Gợi ý hoàn thiện:</h4>
                                    <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                                        {reviewResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPORT MODAL */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b shrink-0">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <Download size={20} /> Xuất Đề Thi & Hồ Sơ (Word)
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 flex-1">
                            <div className="mb-5 space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Chọn loại tài liệu cần tải về:
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'current' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="exportOption" checked={exportType === 'current'} onChange={() => setExportType('current')} />
                                        <div>
                                            <div className="text-sm">Mã đề đang xem ({activeVariantCode}) + Đáp án</div>
                                            <div className="text-xs text-gray-500 font-normal">Đề thi chính thức kèm bảng đáp án và hướng dẫn chấm</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'all' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="exportOption" checked={exportType === 'all'} onChange={() => setExportType('all')} />
                                        <div>
                                            <div className="text-sm">Gộp tất cả {variants.length} Mã đề vào 1 file Word</div>
                                            <div className="text-xs text-gray-500 font-normal">Mỗi mã đề tự động ngắt sang trang mới để in ấn nhanh</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'full_dossier' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="exportOption" checked={exportType === 'full_dossier'} onChange={() => setExportType('full_dossier')} />
                                        <div>
                                            <div className="text-sm">Trọn bộ Hồ sơ Khảo thí đầy đủ</div>
                                            <div className="text-xs text-gray-500 font-normal">Gồm: Đề các mã + Barem chấm + Bảng đáp án đối chiếu</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'key_matrix' ? 'border-primary bg-blue-50/50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="exportOption" checked={exportType === 'key_matrix'} onChange={() => setExportType('key_matrix')} />
                                        <div>
                                            <div className="text-sm">Bảng đối chiếu đáp án các mã đề</div>
                                            <div className="text-xs text-gray-500 font-normal">Phục vụ chấm thi nhanh tất cả các mã đề</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportType === 'azota_current' ? 'border-orange-500 bg-orange-50/50 text-orange-600 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="exportOption" checked={exportType === 'azota_current'} onChange={() => setExportType('azota_current')} />
                                        <div>
                                            <div className="text-sm">Định dạng Azota (Mã đề {activeVariantCode})</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3 border-t pt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Đơn vị chủ quản</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-xs" value={headerInfo.donVi} onChange={e => setHeaderInfo({ ...headerInfo, donVi: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tên trường</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-xs" value={headerInfo.tenTruong} onChange={e => setHeaderInfo({ ...headerInfo, tenTruong: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tên kỳ thi</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-xs" value={headerInfo.tenKyThi} onChange={e => setHeaderInfo({ ...headerInfo, tenKyThi: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Môn & Khối lớp</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-xs" value={headerInfo.monHoc} onChange={e => setHeaderInfo({ ...headerInfo, monHoc: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Thời gian làm bài</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-xs" value={headerInfo.thoiGian} onChange={e => setHeaderInfo({ ...headerInfo, thoiGian: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-primary mb-1">Tên file tải về</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-blue-400 bg-blue-50/30 rounded-lg text-xs font-bold text-gray-800"
                                        value={customFileName}
                                        onChange={e => {
                                            setCustomFileName(e.target.value);
                                            setIsFileNameManuallyEdited(true);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold">
                                Hủy
                            </button>
                            <button onClick={handlePerformExport} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark shadow-xs flex items-center gap-2">
                                <Printer size={15} /> Tải File Word
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXAM BANK MODAL (KHO ĐỀ THI ĐÃ LƯU) */}
            {showDossierRepoModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileBox className="text-primary" size={22} /> Ngân Hàng Đề Thi Đã Lưu ({allSavedExams.length})
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Chọn đề thi bất kỳ để mở lại, chỉnh sửa, tải file Word hoặc sao lưu ra tệp .json
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleExportExamBank()}
                                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Download size={13} className="text-primary" /> Xuất Kho Đề (.json)
                                </button>
                                <label className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                                    <Upload size={13} className="text-emerald-600" /> Nhập Đề (.json)
                                    <input type="file" accept=".json" onChange={handleImportExamBankFile} className="hidden" />
                                </label>
                                <button onClick={() => setShowDossierRepoModal(false)} className="text-gray-400 hover:text-gray-600 ml-2">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Filter by Grade & Search */}
                        <div className="px-5 py-3 border-b bg-white flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { id: 'all', label: 'Tất cả' },
                                    { id: '6', label: 'Khối 6' },
                                    { id: '7', label: 'Khối 7' },
                                    { id: '8', label: 'Khối 8' },
                                    { id: '9', label: 'Khối 9' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setExamGradeFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${examGradeFilter === tab.id
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm tên đề thi..."
                                    value={examSearchQuery}
                                    onChange={(e) => setExamSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Content List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {filteredSavedExams.map(dossier => (
                                <div
                                    key={dossier.id}
                                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/40 transition-all flex flex-wrap items-center justify-between gap-4"
                                >
                                    <div className="flex-1 min-w-[260px]">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-xs bg-blue-50 text-primary px-2.5 py-0.5 rounded-md font-bold">
                                                Khối {dossier.grade || '7'}
                                            </span>
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-semibold">
                                                {dossier.questions?.length || 0} câu hỏi
                                            </span>
                                            {dossier.status === 'approved' ? (
                                                <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                                                    ✓ Ngân hàng chung (Đã duyệt)
                                                </span>
                                            ) : dossier.status === 'pending_review' ? (
                                                <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                                                    ⏳ Chờ duyệt
                                                </span>
                                            ) : (
                                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                                                    Kho cá nhân
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                Lưu ngày: {new Date(dossier.updatedAt || dossier.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900">{dossier.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {dossier.headerInfo?.tenKyThi} • {dossier.headerInfo?.tenTruong}
                                            {dossier.reviewedBy ? ` • Duyệt bởi: ${dossier.reviewedBy}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {dossier.status !== 'approved' && canApproveExam(getCurrentUser()) && (
                                            <button
                                                onClick={() => {
                                                    try {
                                                        approveExam(dossier.id, 'Đã duyệt vào Ngân hàng đề dùng chung');
                                                        setAllSavedExams(getSavedExams());
                                                        showNotice(`Đã phê duyệt đề "${dossier.title}" vào Ngân hàng dùng chung!`);
                                                    } catch (err: any) {
                                                        alert(err.message);
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                title="Duyệt đề này vào Ngân hàng dùng chung và đồng bộ câu hỏi chuẩn"
                                            >
                                                <CheckCircle2 size={13} /> Duyệt dùng chung
                                            </button>
                                        )}
                                        {dossier.status === 'draft' && !canApproveExam(getCurrentUser()) && (
                                            <button
                                                onClick={() => {
                                                    submitExamForReview(dossier.id, 'Đề xuất đưa vào Ngân hàng đề dùng chung');
                                                    setAllSavedExams(getSavedExams());
                                                    showNotice(`Đã gửi đề "${dossier.title}" chờ Admin/Tổ trưởng duyệt!`);
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Gửi duyệt
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleLoadDossier(dossier)}
                                            className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all"
                                        >
                                            Mở Đề Thi
                                        </button>
                                        <button
                                            onClick={(e) => handleQuickWordDownloadFromBank(dossier, e)}
                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                        >
                                            <Download size={13} /> Word
                                        </button>
                                        <button
                                            onClick={(e) => handleDuplicateDossier(dossier.id, e)}
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Nhân bản"
                                        >
                                            <Copy size={15} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteDossier(dossier.id, e)}
                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Xóa đề thi"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredSavedExams.length === 0 && (
                                <div className="text-center py-12 text-gray-400 text-sm">
                                    Không có đề thi nào trong mục này.
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setShowDossierRepoModal(false)}
                                className="px-5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toastMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 z-50 max-w-md">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold">{toastMsg}</span>
                </div>
            )}
        </div>
    );
};

export default ExamGenerator;
