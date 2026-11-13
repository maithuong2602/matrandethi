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
    generateHsktExamWordHtml,
    getDefaultHsktQuestionIds,
    generateAzotaKeyHtml,
    generateExamVariants,
    generateMultiCodeAnswerKeyMatrixHtml,
    generateFullDossierHtml,
    extractHtmlParts,
    parseParts
} from '../utils';
import { reviewExamWithAI, autoFillMissingQuestions } from '../services/geminiService';
import { splitLegacyTrueFalseQuestions, autoTagQuestion } from './QuestionManager';
import { CURRICULUM } from '../data/curriculum';
import { CANONICAL_REQUIREMENTS, KNTT_LESSON_MAPPINGS } from '../data/curriculum/index';
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
    const [step, setStep] = useState<'upload' | 'config' | 'review'>('config');
    const [bank, setBank] = useState<BankQuestion[]>([]);
    const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
    const [generatedTest, setGeneratedTest] = useState<BankQuestion[]>([]);

    // Config Modes
    const [configMode, setConfigMode] = useState<'manual' | 'matrix'>('matrix');
    const [manualConfig, setManualConfig] = useState<Record<string, Record<string, number>>>({});
    const [importedMatrix, setImportedMatrix] = useState<ImportedMatrixData | null>(null);

    // Multi-Code Variants State
    const [variantCount, setVariantCount] = useState<number>(4);
    const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
    const [activeVariantCode, setActiveVariantCode] = useState<string>('101');
    const [variants, setVariants] = useState<ExamVariant[]>([]);

    // Review Sub-Tab: Đề Chính Thức vs Đề & Biểu mẫu chấm HSKT riêng
    const [reviewTab, setReviewTab] = useState<'regular' | 'hskt'>('regular');
    const [hsktSelectedIds, setHsktSelectedIds] = useState<string[]>([]);
    const [hsktPointMap, setHsktPointMap] = useState<Record<string, number>>({});

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
    const [exportType, setExportType] = useState<'current' | 'all' | 'hskt_both' | 'hskt_exam' | 'hskt_grading' | 'key_matrix' | 'full_dossier' | 'azota_current' | 'azota_all'>('current');
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
                                matrixFormat: folder.matrixData.matrixFormat || 'classic',
                                useShortAnswer: folder.matrixData.newPointsConfig?.useShortAnswer !== false
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

    const normalizeExamQuestionPoints = (qs: BankQuestion[]): BankQuestion[] => {
        const mcCount = qs.filter(q => q.category !== 'essay').length;
        return qs.map(q => {
            if (q.category === 'essay') {
                return { ...q, points: q.points || 1.0 };
            }
            if (mcCount === 28 && (q.points === 1.0 || q.points === 0.5)) {
                return { ...q, points: 0.25 };
            }
            return { ...q, points: q.points || 0.25 };
        });
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
            const normalizedQs = normalizeExamQuestionPoints(dossier.questions);
            setGeneratedTest(normalizedQs);
            setHsktSelectedIds(getDefaultHsktQuestionIds(normalizedQs, dossier.headerInfo || headerInfo));
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

    // Tự động khởi tạo danh sách câu hỏi HSKT khi đề thi thay đổi mà chưa có lựa chọn HSKT
    useEffect(() => {
        if (generatedTest.length > 0) {
            const validIds = new Set(generatedTest.map(q => String(q.id)));
            const currentValid = hsktSelectedIds.filter(id => validIds.has(id));
            if (currentValid.length === 0) {
                setHsktSelectedIds(getDefaultHsktQuestionIds(generatedTest, headerInfo));
            }
        }
    }, [generatedTest]);

    // Danh sách câu hỏi dành riêng cho Đề HSKT (đã lọc và áp điểm HSKT)
    const activeHsktQuestions = useMemo(() => {
        const selectedSet = new Set(hsktSelectedIds.map(String));
        return activeQuestions
            .filter(q => selectedSet.has(String(q.id)))
            .map(q => ({
                ...q,
                points: hsktPointMap[String(q.id)] ?? (q.category === 'essay' ? (q.points || 1.0) : (q.points || 0.25))
            }));
    }, [activeQuestions, hsktSelectedIds, hsktPointMap]);

    const toggleHsktQuestion = (qId: string) => {
        const strId = String(qId);
        setHsktSelectedIds(prev =>
            prev.includes(strId) ? prev.filter(id => id !== strId) : [...prev, strId]
        );
    };

    const applyHsktPreset = (preset: 'yccd' | 'nb' | 'nb_th' | 'all') => {
        if (preset === 'yccd') {
            setHsktSelectedIds(getDefaultHsktQuestionIds(generatedTest, headerInfo));
            showNotice('Đã chọn câu hỏi HSKT theo chuẩn YCCĐ!');
        } else if (preset === 'nb') {
            const nbIds = generatedTest.filter(q => (q.level || 'NB') === 'NB').map(q => String(q.id));
            setHsktSelectedIds(nbIds);
            showNotice(`Đã chọn ${nbIds.length} câu mức Nhận biết (NB) cho Đề HSKT!`);
        } else if (preset === 'nb_th') {
            const ids = generatedTest.filter(q => ['NB', 'TH'].includes(q.level || 'NB')).map(q => String(q.id));
            setHsktSelectedIds(ids);
            showNotice(`Đã chọn ${ids.length} câu mức Nhận biết & Thông hiểu cho Đề HSKT!`);
        } else {
            setHsktSelectedIds(generatedTest.map(q => String(q.id)));
            showNotice('Đã chọn toàn bộ câu hỏi vào Đề HSKT!');
        }
    };

    const applyHsktPointsPreset = (mode: 'keep' | 'scale10') => {
        if (mode === 'keep') {
            setHsktPointMap({});
            showNotice('Đã đặt lại điểm gốc (0,25đ/câu TN, 1,0đ/câu TL) cho Đề HSKT.');
            return;
        }
        const selectedSet = new Set(hsktSelectedIds.map(String));
        const hsktQs = generatedTest.filter(q => selectedSet.has(String(q.id)));
        if (hsktQs.length === 0) return;

        const mcQs = hsktQs.filter(q => q.category !== 'essay');
        const essayQs = hsktQs.filter(q => q.category === 'essay');
        const newMap: Record<string, number> = {};

        if (essayQs.length === 0) {
            const ptPerMc = Number((10 / mcQs.length).toFixed(2));
            mcQs.forEach(q => { newMap[String(q.id)] = ptPerMc; });
        } else if (mcQs.length === 0) {
            const ptPerEs = Number((10 / essayQs.length).toFixed(2));
            essayQs.forEach(q => { newMap[String(q.id)] = ptPerEs; });
        } else {
            const targetEssayTotal = Math.min(3.0, essayQs.length * 1.0);
            const targetMcTotal = 10.0 - targetEssayTotal;
            const ptPerMc = Number((targetMcTotal / mcQs.length).toFixed(2));
            const ptPerEs = Number((targetEssayTotal / essayQs.length).toFixed(2));
            mcQs.forEach(q => { newMap[String(q.id)] = ptPerMc; });
            essayQs.forEach(q => { newMap[String(q.id)] = ptPerEs; });
        }
        setHsktPointMap(newMap);
        showNotice('Đã tự động quy đổi thang điểm Đề HSKT về 10,0 điểm!');
    };

    const updateHsktPoint = (qId: string, val: number) => {
        setHsktPointMap(prev => ({
            ...prev,
            [String(qId)]: val
        }));
    };

    const handleDownloadHsktWord = (section: 'both' | 'exam_only' | 'grading_only') => {
        if (activeHsktQuestions.length === 0) {
            alert('Vui lòng chọn ít nhất 1 câu hỏi cho Đề HSKT.');
            return;
        }
        const vHeader = { ...headerInfo, maDe: activeVariantCode };
        const html = generateHsktExamWordHtml(activeHsktQuestions, vHeader, section);
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = (customFileName || buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)).trim();
        const suffix = section === 'exam_only' ? 'De_HSKT' : section === 'grading_only' ? 'Bieu_Mau_Cham_HSKT' : 'De_Va_HDC_HSKT';
        a.download = `${suffix}_${baseName}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
            // Đảm bảo nạp đầy đủ câu hỏi của khối tương ứng với Ma trận nếu bộ lọc trước đó đang ở khối khác
            if (selectedGradeFilter !== 'all' && selectedGradeFilter !== detectedG) {
                setSelectedGradeFilter(detectedG);
                loadInternalQuestionBank(detectedG, false);
            }
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
        const usedIds = new Set<string>();

        const matchesPreferredType = (
            q: BankQuestion,
            preferredQuestionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay'
        ) => {
            if (preferredQuestionType === 'short-answer') {
                return q.questionType === 'short-answer' || q.questionType === 'fill-blank' || q.mcType === 'fill-blank';
            }
            if (preferredQuestionType === 'true-false') {
                return q.questionType === 'true-false' || q.mcType === 'true-false';
            }
            if (preferredQuestionType === 'multiple-choice') {
                return (
                    (q.questionType === 'multiple-choice' || !q.questionType) &&
                    q.mcType !== 'true-false' &&
                    q.mcType !== 'fill-blank'
                );
            }
            return q.category === 'essay' || q.questionType === 'essay';
        };

        // Chuẩn hóa chuỗi để so khớp tên bài / đơn vị kiến thức chính xác bất kể dấu chấm, hai chấm, gạch ngang
        const normalizeTextKey = (str: string) =>
            (str || '')
                .toLowerCase()
                .replace(/^(chủ đề\s+[a-z0-9]+[\.\:\-]?\s*)/i, '')
                .replace(/^(\d+[\.\)]\s*)/, '')
                .replace(/[:\.\-–—,;()]/g, ' ')
                .replace(/\bthông dụng\b/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

        const extractLessonCode = (str: string): string | null => {
            const m = (str || '').match(/\bbài\s*(\d+[ab]?)\b/i);
            return m ? m[1].toLowerCase() : null;
        };

        const targetGrade = detectGradeFromContext(bank, headerInfo, importedMatrix);

        // Nếu state `bank` đang thiếu câu hỏi của khối mục tiêu (do lọc khối khác), lấy trực tiếp từ kho lưu trữ
        let activeBank: BankQuestion[] = bank.filter(q => !q.grade || String(q.grade) === targetGrade);
        if (activeBank.length === 0) {
            const res = loadQuestionBank();
            if (res.data && res.data.length > 0) {
                const tagged = splitLegacyTrueFalseQuestions(res.data.map(autoTagQuestion));
                const byGrade = tagged.filter(q => !q.grade || String(q.grade) === targetGrade);
                activeBank = (byGrade.length > 0 ? byGrade : tagged).map(q => ({
                    ...q,
                    level: normalizeLevel(q.level),
                    lesson: q.lesson || 'Bài chung',
                    uniqueId: Math.random()
                }));
            } else {
                activeBank = bank;
            }
        }

        // Xây dựng tập hợp các Bài học (KNTT) tương ứng với một dòng Ma trận (dựa trên cả `bai`, `noiDung` và `chuong`)
        const getMatchedLessonsForRow = (lessonName: string, subTopicName?: string, mainTopicName?: string): {
            lessonTitles: Set<string>;
            lessonCodes: Set<string>;
            reqIds: Set<string>;
        } => {
            const lessonTitles = new Set<string>();
            const lessonCodes = new Set<string>();
            const reqIds = new Set<string>();

            const candidates = [lessonName, subTopicName].filter(Boolean) as string[];
            candidates.forEach(c => {
                lessonTitles.add(normalizeTextKey(c));
                const code = extractLessonCode(c);
                if (code) lessonCodes.add(code);
            });

            const normSub = normalizeTextKey(subTopicName || lessonName);
            const normMain = normalizeTextKey(mainTopicName || '');

            // Tìm trong CANONICAL_REQUIREMENTS các YCCĐ thuộc đơn vị kiến thức (`subTopicName`) này
            CANONICAL_REQUIREMENTS.forEach(req => {
                if (String(req.grade) !== String(targetGrade)) return;
                const reqSubNorm = normalizeTextKey(req.subTopicName);
                if (
                    reqSubNorm &&
                    normSub &&
                    (reqSubNorm.includes(normSub) || normSub.includes(reqSubNorm))
                ) {
                    reqIds.add(req.id);
                }
            });

            // Từ reqIds suy ra các bài học trong KNTT_LESSON_MAPPINGS
            if (reqIds.size > 0) {
                KNTT_LESSON_MAPPINGS.forEach(m => {
                    if (String(m.grade) !== String(targetGrade)) return;
                    if (m.requirementIds.some(id => reqIds.has(id))) {
                        lessonTitles.add(normalizeTextKey(m.lessonTitle));
                        const code = extractLessonCode(m.lessonNumber) || extractLessonCode(m.lessonTitle);
                        if (code) lessonCodes.add(code);
                    }
                });
            }

            // Nếu vẫn chưa ánh xạ được qua subTopic, thử ánh xạ theo Chủ đề lớn (topicName)
            if (reqIds.size === 0 && normMain) {
                const topicReqIds = new Set<string>();
                CANONICAL_REQUIREMENTS.forEach(req => {
                    if (String(req.grade) !== String(targetGrade)) return;
                    const reqTopicNorm = normalizeTextKey(req.topicName);
                    if (reqTopicNorm && (reqTopicNorm.includes(normMain) || normMain.includes(reqTopicNorm))) {
                        topicReqIds.add(req.id);
                    }
                });
                KNTT_LESSON_MAPPINGS.forEach(m => {
                    if (String(m.grade) !== String(targetGrade)) return;
                    if (m.requirementIds.some(id => topicReqIds.has(id))) {
                        lessonTitles.add(normalizeTextKey(m.lessonTitle));
                        const code = extractLessonCode(m.lessonNumber) || extractLessonCode(m.lessonTitle);
                        if (code) lessonCodes.add(code);
                    }
                });
            }

            return { lessonTitles, lessonCodes, reqIds };
        };

        const doesQuestionMatchRow = (
            q: BankQuestion,
            lessonName: string,
            subTopicName?: string,
            mainTopicName?: string
        ): boolean => {
            const qLessonRaw = (q.lesson || '').trim();
            const qLessonNorm = normalizeTextKey(qLessonRaw);
            const qLessonCode = extractLessonCode(qLessonRaw);

            const { lessonTitles, lessonCodes, reqIds } = getMatchedLessonsForRow(lessonName, subTopicName, mainTopicName);

            if (q.curriculum?.requirementId && reqIds.has(q.curriculum.requirementId)) {
                return true;
            }
            if (qLessonCode && lessonCodes.has(qLessonCode)) {
                return true;
            }
            for (const targetNorm of lessonTitles) {
                if (!targetNorm) continue;
                if (qLessonNorm.includes(targetNorm) || targetNorm.includes(qLessonNorm)) {
                    return true;
                }
            }
            return false;
        };

        const isLevelMatch = (qLevel: string, targetLevel: string): boolean => {
            if (qLevel === targetLevel) return true;
            // Trong cấu trúc mới 3 mức độ (Biết, Hiểu, Vận dụng), mức Vận dụng (VD) bao gồm cả Vận dụng cao (VDC)
            if (targetLevel === 'VD' && qLevel === 'VDC') return true;
            if (targetLevel === 'VDC' && qLevel === 'VD') return true;
            return false;
        };

        const findQuestions = (
            lessonName: string,
            level: string,
            category: 'mc'|'essay',
            count: number,
            preferredQuestionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay',
            subTopicName?: string,
            mainTopicName?: string
        ) => {
            const effectiveLabel = lessonName || subTopicName || mainTopicName || 'Bài chung';

            // Các câu hỏi chưa dùng thuộc đúng bài học / đơn vị kiến thức của dòng ma trận
            const rowPool = activeBank.filter(q => {
                if (usedIds.has(q.id)) return false;
                return doesQuestionMatchRow(q, effectiveLabel, subTopicName, mainTopicName);
            });

            const shuffle = (arr: BankQuestion[]) => [...arr].sort(() => 0.5 - Math.random());

            // Phân tầng ưu tiên (Multi-tier fallback) để đảm bảo luôn lấy đủ số câu theo ma trận khi ngân hàng có câu hỏi:
            // Tier 1: Đúng bài + Đúng mức độ (VD gồm cả VDC) + Đúng loại câu hỏi (multiple-choice / true-false / short-answer / essay)
            // Tier 2: Đúng bài + Đúng mức độ + Cùng nhóm (TNKQ / Tự luận)
            // Tier 3: Đúng bài + Mức độ lân cận trong cùng bài + Đúng loại câu hỏi
            // Tier 4: Đúng bài + Mức độ lân cận trong cùng bài + Cùng nhóm (TNKQ / Tự luận)
            // Tier 5: Cùng Chủ đề lớn (mainTopic) + Đúng mức độ + Cùng nhóm (TNKQ / Tự luận)
            const tier1: BankQuestion[] = [];
            const tier2: BankQuestion[] = [];
            const tier3: BankQuestion[] = [];
            const tier4: BankQuestion[] = [];

            rowPool.forEach(q => {
                const lvlOk = isLevelMatch(q.level, level);
                const catOk = q.category === category;
                const typeOk = preferredQuestionType
                    ? matchesPreferredType(q, preferredQuestionType) ||
                      (preferredQuestionType === 'short-answer' && matchesPreferredType(q, 'true-false'))
                    : catOk;

                if (lvlOk && typeOk) {
                    tier1.push(q);
                } else if (lvlOk && catOk) {
                    tier2.push(q);
                } else if (typeOk) {
                    tier3.push(q);
                } else if (catOk) {
                    tier4.push(q);
                }
            });

            // Nếu yêu cầu short-answer, ưu tiên exact short-answer trước rồi mới tới true-false trong tier1
            const sortByPreferred = (arr: BankQuestion[]) => {
                if (preferredQuestionType === 'short-answer') {
                    return [
                        ...shuffle(arr.filter(q => matchesPreferredType(q, 'short-answer'))),
                        ...shuffle(arr.filter(q => !matchesPreferredType(q, 'short-answer')))
                    ];
                }
                return shuffle(arr);
            };

            let combinedCandidates = [
                ...sortByPreferred(tier1),
                ... shuffle(tier2),
                ...sortByPreferred(tier3),
                ...shuffle(tier4)
            ];

            // Tier 5: Nếu trong bài vẫn chưa đủ số câu, tìm thêm các câu chưa dùng thuộc cùng Chủ đề lớn (mainTopicName)
            if (combinedCandidates.length < count && mainTopicName) {
                const candidateIds = new Set(combinedCandidates.map(q => q.id));
                const topicPool = activeBank.filter(q => {
                    if (usedIds.has(q.id) || candidateIds.has(q.id)) return false;
                    return doesQuestionMatchRow(q, mainTopicName, mainTopicName, mainTopicName) && q.category === category;
                });
                const topicExactLvl = shuffle(topicPool.filter(q => isLevelMatch(q.level, level)));
                const topicOtherLvl = shuffle(topicPool.filter(q => !isLevelMatch(q.level, level)));
                combinedCandidates = [...combinedCandidates, ...topicExactLvl, ...topicOtherLvl];
            }

            const picked = combinedCandidates.slice(0, count);
            picked.forEach(q => usedIds.add(q.id));

            if (picked.length < count) {
                const diff = count - picked.length;
                missing.push({
                    lesson: effectiveLabel,
                    level,
                    count: diff,
                    questionType: preferredQuestionType === 'short-answer'
                        ? 'true-false'
                        : (preferredQuestionType || (category === 'essay' ? 'essay' : 'multiple-choice'))
                });
            }

            return picked.map(q => ({
                ...q,
                level: level === 'VD' && q.level === 'VDC' ? 'VD' : q.level,
                points: category === 'essay' ? 1.0 : 0.25,
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
            const useSA = importedMatrix.thongTinChung?.useShortAnswer !== false;
            const extractCnt = (val: any): number => (typeof val === 'number' ? val : (val?.count || 0));

            importedMatrix.chiTiet.forEach((row, rowIdx) => {
                const lessonName = row.thongTinChung.bai || row.thongTinChung.noiDung;
                const subTopicName = row.thongTinChung.noiDung;
                const mainTopicName = row.thongTinChung.chuong;

                const tagPicked = (qs: any[], partOrder: number) =>
                    qs.map(q => ({ ...q, _partOrder: partOrder, _rowIdx: rowIdx }));

                const p4 = row.chiTiet4Phan;
                const p4Sum = p4
                    ? extractCnt(p4.nhieuLuaChon?.B) + extractCnt(p4.nhieuLuaChon?.H) + extractCnt(p4.nhieuLuaChon?.VD) +
                      extractCnt(p4.dungSai?.B) + extractCnt(p4.dungSai?.H) + extractCnt(p4.dungSai?.VD) +
                      extractCnt(p4.traLoiNgan?.B) + extractCnt(p4.traLoiNgan?.H) + extractCnt(p4.traLoiNgan?.VD) +
                      extractCnt(p4.tuLuan?.B) + extractCnt(p4.tuLuan?.H) + extractCnt(p4.tuLuan?.VD)
                    : 0;

                if (importedMatrix.thongTinChung?.matrixFormat === 'new_4part' && p4 && p4Sum > 0) {
                    const mcB = extractCnt(p4.nhieuLuaChon?.B);
                    const mcH = extractCnt(p4.nhieuLuaChon?.H);
                    const mcVD = extractCnt(p4.nhieuLuaChon?.VD);

                    const rawSaB = extractCnt(p4.traLoiNgan?.B);
                    const rawSaH = extractCnt(p4.traLoiNgan?.H);
                    const rawSaVD = extractCnt(p4.traLoiNgan?.VD);

                    // Nếu môn học không có điền khuyết (useSA === false), tự động đẩy toàn bộ số lượng Điền khuyết sang câu hỏi Đúng/Sai
                    const tfB = extractCnt(p4.dungSai?.B) + (useSA ? 0 : rawSaB);
                    const tfH = extractCnt(p4.dungSai?.H) + (useSA ? 0 : rawSaH);
                    const tfVD = extractCnt(p4.dungSai?.VD) + (useSA ? 0 : rawSaVD);

                    const saB = useSA ? rawSaB : 0;
                    const saH = useSA ? rawSaH : 0;
                    const saVD = useSA ? rawSaVD : 0;

                    const esB = extractCnt(p4.tuLuan?.B);
                    const esH = extractCnt(p4.tuLuan?.H);
                    const esVD = extractCnt(p4.tuLuan?.VD);

                    if (mcB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'mc', mcB, 'multiple-choice', subTopicName, mainTopicName), 1));
                    if (mcH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'mc', mcH, 'multiple-choice', subTopicName, mainTopicName), 1));
                    if (mcVD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'mc', mcVD, 'multiple-choice', subTopicName, mainTopicName), 1));

                    if (tfB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'mc', tfB, 'true-false', subTopicName, mainTopicName), 2));
                    if (tfH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'mc', tfH, 'true-false', subTopicName, mainTopicName), 2));
                    if (tfVD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'mc', tfVD, 'true-false', subTopicName, mainTopicName), 2));

                    if (saB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'mc', saB, 'short-answer', subTopicName, mainTopicName), 3));
                    if (saH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'mc', saH, 'short-answer', subTopicName, mainTopicName), 3));
                    if (saVD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'mc', saVD, 'short-answer', subTopicName, mainTopicName), 3));

                    if (esB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'essay', esB, 'essay', subTopicName, mainTopicName), 4));
                    if (esH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'essay', esH, 'essay', subTopicName, mainTopicName), 4));
                    if (esVD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'essay', esVD, 'essay', subTopicName, mainTopicName), 4));
                } else {
                    const tnCounts = row.tracNghiem;
                    if (tnCounts) {
                        if (tnCounts.NB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'mc', tnCounts.NB, undefined, subTopicName, mainTopicName), 1));
                        if (tnCounts.TH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'mc', tnCounts.TH, undefined, subTopicName, mainTopicName), 1));
                        if (tnCounts.VD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'mc', tnCounts.VD, undefined, subTopicName, mainTopicName), 1));
                        if (tnCounts.VDC > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VDC', 'mc', tnCounts.VDC, undefined, subTopicName, mainTopicName), 1));
                    }
                    const tlCounts = row.tuLuan;
                    if (tlCounts) {
                        if (tlCounts.NB > 0) selected.push(...tagPicked(findQuestions(lessonName, 'NB', 'essay', tlCounts.NB, undefined, subTopicName, mainTopicName), 4));
                        if (tlCounts.TH > 0) selected.push(...tagPicked(findQuestions(lessonName, 'TH', 'essay', tlCounts.TH, undefined, subTopicName, mainTopicName), 4));
                        if (tlCounts.VD > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VD', 'essay', tlCounts.VD, undefined, subTopicName, mainTopicName), 4));
                        if (tlCounts.VDC > 0) selected.push(...tagPicked(findQuestions(lessonName, 'VDC', 'essay', tlCounts.VDC, undefined, subTopicName, mainTopicName), 4));
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
        selected.sort((a: any, b: any) => {
            if (a.category !== b.category) return a.category === 'mc' ? -1 : 1;
            const pa = a._partOrder ?? (a.category === 'essay' ? 4 : 1);
            const pb = b._partOrder ?? (b.category === 'essay' ? 4 : 1);
            if (pa !== pb) return pa - pb;
            const la = levelOrder[a.level as keyof typeof levelOrder] || 5;
            const lb = levelOrder[b.level as keyof typeof levelOrder] || 5;
            if (la !== lb) return la - lb;
            if (typeof a._rowIdx === 'number' && typeof b._rowIdx === 'number' && a._rowIdx !== b._rowIdx) {
                return a._rowIdx - b._rowIdx;
            }
            return a.lesson.localeCompare(b.lesson);
        });

        setCurrentDossierId(null);
        setGeneratedTest(selected);
        setHsktSelectedIds(getDefaultHsktQuestionIds(selected, headerInfo));
        setHsktPointMap({});
        setReviewTab('regular');
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
        } else if (exportType === 'hskt_both' || exportType === 'hskt_exam' || exportType === 'hskt_grading') {
            const section = exportType === 'hskt_exam' ? 'exam_only' : exportType === 'hskt_grading' ? 'grading_only' : 'both';
            handleDownloadHsktWord(section);
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

    const totalRegularMcPts = activeQuestions.filter(q => q.category !== 'essay').reduce((s, q) => s + (q.points || 0.25), 0);
    const totalRegularEsPts = activeQuestions.filter(q => q.category === 'essay').reduce((s, q) => s + (q.points || 1.0), 0);
    const totalHsktMcPts = activeHsktQuestions.filter(q => q.category !== 'essay').reduce((s, q) => s + (q.points || 0.25), 0);
    const totalHsktEsPts = activeHsktQuestions.filter(q => q.category === 'essay').reduce((s, q) => s + (q.points || 1.0), 0);

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* TOP HEADER WITH CLEAN 2-STEP NAVIGATION & SAVED EXAM BANK */}
            <header className="mb-5 flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <Layers className="text-primary" size={24} /> Tạo Đề Kiểm Tra & Đề HSKT
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        Tự động ra đề theo Ma trận chuẩn 7991, tách riêng Đề & Biểu mẫu chấm dành cho Học sinh khuyết tật (HSKT).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-gray-200 text-xs">
                        <button
                            type="button"
                            onClick={() => setStep('config')}
                            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${step === 'config' || step === 'upload' ? 'bg-white text-primary font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <Settings size={14} /> 1. Cấu hình & Chọn Ma trận
                        </button>
                        <button
                            type="button"
                            onClick={() => generatedTest.length > 0 && setStep('review')}
                            disabled={generatedTest.length === 0}
                            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all ${step === 'review' ? 'bg-white text-primary font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <FileText size={14} /> 2. Xem Đề, HSKT & Xuất File ({generatedTest.length})
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDossierRepoModal(true)}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                        <FileBox size={15} />
                        Kho Đề Đã Lưu ({allSavedExams.length})
                    </button>
                </div>
            </header>

            {/* STEP 1: STREAMLINED CONFIGURATION & QUESTION SOURCE */}
            {(step === 'config' || step === 'upload') && (
                <div className="space-y-5">
                    {/* Compact Question Source & Grade Bar */}
                    <div className="bg-white rounded-2xl shadow-xs p-4 sm:p-5 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1.5 bg-blue-50 text-primary rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-100">
                                <Database size={14} /> Ngân hàng trên máy: <strong>{bank.length} câu</strong> ({Object.keys(availableStats).length} bài)
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                {[
                                    { id: 'all', label: 'Tất cả khối' },
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
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${selectedGradeFilter === g.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="jsonUpload"
                                className="hidden"
                                accept=".json"
                                multiple
                                onChange={handleFileUpload}
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById('jsonUpload')?.click()}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Upload size={14} className="text-primary" /> Nạp thêm câu hỏi (.json)
                            </button>
                        </div>
                    </div>

                    {/* Main Configuration Card */}
                    <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 border border-gray-200">
                        <div className="flex flex-wrap justify-between items-center mb-5 gap-4 border-b pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Settings size={20} className="text-primary" /> Chọn Phương Thức Ra Đề
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Chọn ma trận đã lưu trên máy để tự động lấy đủ số câu chuẩn 7,0đ TN + 3,0đ TL, hoặc tự chọn số câu theo bài.
                                </p>
                            </div>

                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setConfigMode('matrix')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${configMode === 'matrix' ? 'bg-white text-primary shadow-2xs' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FileJson size={15} /> Theo Ma Trận Đề
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfigMode('manual')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${configMode === 'manual' ? 'bg-white text-primary shadow-2xs' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Grid3X3 size={15} /> Chọn Số Câu Theo Bài
                                </button>
                            </div>
                        </div>

                        {/* Mode 1: Manual Table */}
                        {configMode === 'manual' && (
                            <div className="overflow-x-auto border rounded-xl mb-5 max-h-[420px] overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-gray-50 text-gray-700 text-xs">
                                            <th className="p-3 border text-left min-w-[200px]">Bài học / Chủ đề</th>
                                            <th className="p-3 border w-28 bg-green-50 text-green-800 font-bold">Nhận biết</th>
                                            <th className="p-3 border w-28 bg-blue-50 text-blue-800 font-bold">Thông hiểu</th>
                                            <th className="p-3 border w-28 bg-yellow-50 text-yellow-800 font-bold">Vận dụng</th>
                                            <th className="p-3 border w-28 bg-red-50 text-red-800 font-bold">Vận dụng cao</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(availableStats).sort().map(lesson => {
                                            const stats = availableStats[lesson];
                                            return (
                                                <tr key={lesson} className="hover:bg-gray-50">
                                                    <td className="p-2.5 border font-medium text-gray-800 text-xs sm:text-sm">{lesson}</td>
                                                    {['NB', 'TH', 'VD', 'VDC'].map(lvl => (
                                                        <td key={lvl} className="p-2 border text-center">
                                                            <div className="flex flex-col items-center">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={stats[lvl]}
                                                                    value={manualConfig[lesson]?.[lvl] || ''}
                                                                    placeholder="0"
                                                                    className={`w-14 p-1 text-center border rounded-lg focus:ring-2 focus:ring-primary outline-none text-xs ${stats[lvl] === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white font-bold text-gray-800'}`}
                                                                    disabled={stats[lvl] === 0}
                                                                    onChange={(e) => handleManualConfigChange(lesson, lvl, e.target.value)}
                                                                />
                                                                <span className="text-[10px] text-gray-400 mt-0.5">Kho: {stats[lvl]}</span>
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

                        {/* Mode 2: Matrix Selection */}
                        {configMode === 'matrix' && (
                            <div className="space-y-4 mb-5">
                                {savedLocalMatrices.length > 0 && (
                                    <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-2xl">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                <Database size={15} className="text-primary" /> Chọn Ma trận đã lưu trên máy:
                                            </h3>
                                            <label className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1">
                                                <Upload size={13} /> Tải file Ma trận (.json) từ máy
                                                <input type="file" className="hidden" accept=".json" onChange={handleMatrixUpload} />
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                            {savedLocalMatrices.map((m, idx) => {
                                                const isSelected = importedMatrix?.thongTinChung?.tenDe === m.name;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => applyMatrixData(m.data)}
                                                        className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-blue-50 border-primary ring-2 ring-primary/20'
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-primary/50'
                                                        }`}
                                                    >
                                                        <div className="font-bold text-xs sm:text-sm text-gray-900 flex items-center justify-between gap-1">
                                                            <span className="truncate">{m.name}</span>
                                                            {isSelected && <CheckCircle2 size={15} className="text-primary shrink-0" />}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5">{m.data.chiTiet.length} đơn vị kiến thức</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {!importedMatrix ? (
                                    savedLocalMatrices.length === 0 && (
                                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50">
                                            <FileJson size={36} className="mx-auto text-primary mb-2" />
                                            <h3 className="text-sm font-bold text-gray-800 mb-1">Tải lên file Ma trận (.json)</h3>
                                            <p className="text-xs text-gray-500 mb-3">Sử dụng file JSON xuất từ mục "Xây dựng Ma trận" để tự động lấy câu hỏi.</p>
                                            <label className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark transition-all cursor-pointer inline-flex items-center gap-1.5">
                                                <Upload size={15} /> Chọn file Ma trận JSON
                                                <input type="file" className="hidden" accept=".json" onChange={handleMatrixUpload} />
                                            </label>
                                        </div>
                                    )
                                ) : (
                                    <div className="border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4">
                                        <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                                            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                                                <CheckCircle2 size={18} className="text-emerald-600" /> Đang chọn ma trận: {importedMatrix.thongTinChung.tenDe}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {importedMatrix.thongTinChung.matrixFormat === 'new_4part' && (
                                                    <label className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-bold text-indigo-800 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={importedMatrix.thongTinChung.useShortAnswer !== false}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setImportedMatrix(prev => prev ? {
                                                                    ...prev,
                                                                    thongTinChung: {
                                                                        ...prev.thongTinChung,
                                                                        useShortAnswer: checked
                                                                    }
                                                                } : null);
                                                            }}
                                                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <span>Dùng phần Trả lời ngắn (Bỏ tích ➔ Đẩy sang Đúng/Sai)</span>
                                                    </label>
                                                )}
                                                <button onClick={() => setImportedMatrix(null)} className="text-xs text-gray-500 hover:text-red-600 font-semibold cursor-pointer">
                                                    Bỏ chọn
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0">
                                                    <tr>
                                                        <th className="p-2.5 text-left">Nội dung / Bài học</th>
                                                        <th className="p-2.5 text-center">Trắc nghiệm (NB - TH - VD - VDC)</th>
                                                        <th className="p-2.5 text-center">Tự luận (NB - TH - VD - VDC)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {importedMatrix.chiTiet.map((row, idx) => (
                                                        <tr key={idx} className="border-t hover:bg-gray-50">
                                                            <td className="p-2.5 font-medium text-gray-800">{row.thongTinChung.bai || row.thongTinChung.noiDung}</td>
                                                            <td className="p-2.5 text-center">
                                                                <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                                                                    {row.tracNghiem.NB} - {row.tracNghiem.TH} - {row.tracNghiem.VD} - {row.tracNghiem.VDC}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5 text-center">
                                                                <span className="font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-bold">
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

                        {/* Compact Footer Bar: Variant Count + Generate Button */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                        <Shuffle size={14} className="text-primary" /> Số mã đề:
                                    </span>
                                    <div className="flex gap-1">
                                        {[1, 2, 4, 8].map(count => (
                                            <button
                                                key={count}
                                                type="button"
                                                onClick={() => setVariantCount(count)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${variantCount === count
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {count} mã
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={shuffleOptions}
                                        onChange={(e) => setShuffleOptions(e.target.checked)}
                                        className="w-4 h-4 text-primary accent-primary rounded cursor-pointer"
                                    />
                                    <span>Đảo đáp án A, B, C, D</span>
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={generateTest}
                                disabled={configMode === 'matrix' && !importedMatrix}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                <Play size={17} /> Tạo Đề Chính Thức & Đề HSKT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: UNIFIED REVIEW, HSKT SEPARATION & EXPORT */}
            {step === 'review' && (
                <div className="space-y-5">
                    {/* Warning & Auto-fill Banner if missing questions */}
                    {missingRequirements.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-bold text-amber-900 text-xs sm:text-sm">
                                        Ngân hàng hiện thiếu {missingRequirements.reduce((sum, item) => sum + item.count, 0)} câu hỏi theo cấu hình!
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {missingRequirements.map((req, i) => (
                                            <span key={i} className="text-[11px] bg-white px-2 py-0.5 rounded-lg text-amber-900 border border-amber-200">
                                                <strong>{req.lesson}</strong> ({req.level} - {req.questionType === 'essay' ? 'TL' : 'TN'}): thiếu <strong className="text-red-600">{req.count}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleTriggerAutoFill}
                                disabled={isAutoFilling}
                                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                            >
                                {isAutoFilling ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                                Tự động bù câu thiếu
                            </button>
                        </div>
                    )}

                    {isAutoFilling && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center gap-3 text-xs text-blue-800">
                            <Loader2 size={16} className="animate-spin text-primary" />
                            <span>{autoFillProgress}</span>
                        </div>
                    )}

                    {/* UNIFIED CONTROL PANEL (GỌN GÀNG, TÁCH BIỆT ĐỀ CHÍNH THỨC & ĐỀ HSKT) */}
                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                        {/* Row 1: Exam Name + Mode Switcher (Đề Chính Thức vs Đề & Biểu mẫu chấm HSKT) + Quick Save/Export */}
                        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                                <button
                                    type="button"
                                    onClick={() => setStep('config')}
                                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    ← Cấu hình
                                </button>
                                <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                    <input
                                        type="text"
                                        value={customFileName}
                                        onChange={(e) => {
                                            setCustomFileName(e.target.value);
                                            setIsFileNameManuallyEdited(true);
                                        }}
                                        placeholder={buildDefaultFileName(activeQuestions, headerInfo, teacherName, importedMatrix)}
                                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:border-primary outline-none"
                                        title="Tên đề thi lưu trữ & tên file Word"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveToExamBank}
                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                        title="Lưu đề thi này vào Kho Đề"
                                    >
                                        <FolderCheck size={14} /> {currentDossierId ? 'Cập nhật Kho' : 'Lưu Kho Đề'}
                                    </button>
                                </div>
                            </div>

                            {/* Tab Switcher: ĐỀ CHÍNH THỨC vs ĐỀ & BIỂU MẪU CHẤM HSKT */}
                            <div className="flex items-center bg-gray-200/80 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setReviewTab('regular')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reviewTab === 'regular'
                                            ? 'bg-white text-primary shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <FileText size={14} />
                                    Đề Chính Thức ({activeQuestions.length} câu • {(totalRegularMcPts + totalRegularEsPts).toFixed(1).replace('.', ',')}đ)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewTab('hskt')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reviewTab === 'hskt'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'text-rose-700 hover:bg-rose-50'
                                    }`}
                                >
                                    <ShieldCheck size={14} />
                                    Đề & Biểu Mẫu Chấm HSKT Riêng ({activeHsktQuestions.length} câu • {(totalHsktMcPts + totalHsktEsPts).toFixed(1).replace('.', ',')}đ)
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Context Toolbar depending on Regular vs HSKT tab */}
                        {reviewTab === 'regular' ? (
                            <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                                        TN: <strong>{activeQuestions.filter(q => q.category !== 'essay').length} câu</strong> ({totalRegularMcPts.toFixed(1).replace('.', ',')}đ)
                                        {' • '}
                                        TL: <strong>{activeQuestions.filter(q => q.category === 'essay').length} câu</strong> ({totalRegularEsPts.toFixed(1).replace('.', ',')}đ)
                                    </span>

                                    {variants.length > 1 && (
                                        <div className="flex items-center gap-1">
                                            {variants.map(v => (
                                                <button
                                                    key={v.code}
                                                    type="button"
                                                    onClick={() => setActiveVariantCode(v.code)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeVariantCode === v.code
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

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Bulk Swap Menu */}
                                    <div className="relative" ref={swapMenuRef}>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSwapMenuOpen(!isSwapMenuOpen); }}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center gap-1 font-bold text-xs border border-gray-200 cursor-pointer"
                                        >
                                            <RefreshCw size={13} /> Đổi câu hỏi <ChevronDown size={12} />
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

                                    <button
                                        type="button"
                                        onClick={handleRunAIReview}
                                        disabled={isReviewing}
                                        className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 flex items-center gap-1 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isReviewing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                        AI Kiểm Tra
                                    </button>

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
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                        <Download size={14} /> Xuất Đề Chính Thức (.doc)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowExportModal(true)}
                                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                        <Printer size={14} /> Tùy Chọn Xuất Khác
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* HSKT DEDICATED TOOLBAR */
                            <div className="p-4 bg-rose-50/40 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-rose-900 bg-rose-100/80 border border-rose-200 px-3 py-1 rounded-lg">
                                            Đề HSKT: <strong>{activeHsktQuestions.filter(q => q.category !== 'essay').length} câu TN</strong> ({totalHsktMcPts.toFixed(1).replace('.', ',')}đ)
                                            {' + '}
                                            <strong>{activeHsktQuestions.filter(q => q.category === 'essay').length} câu TL</strong> ({totalHsktEsPts.toFixed(1).replace('.', ',')}đ)
                                            {' = '}
                                            <strong className="text-rose-700">{(totalHsktMcPts + totalHsktEsPts).toFixed(1).replace('.', ',')} điểm</strong>
                                        </span>

                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[11px] font-bold text-gray-600 mr-1">Chọn nhanh:</span>
                                            <button
                                                type="button"
                                                onClick={() => applyHsktPreset('yccd')}
                                                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                            >
                                                Theo YCCĐ HSKT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyHsktPreset('nb')}
                                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                            >
                                                Chỉ câu Nhận biết (NB)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyHsktPreset('nb_th')}
                                                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                            >
                                                Câu NB + Thông hiểu
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyHsktPointsPreset('scale10')}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                                title="Tự động chia đều điểm các câu trong đề HSKT để tổng điểm bằng 10,0 điểm"
                                            >
                                                Quy đổi thang 10,0đ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyHsktPointsPreset('keep')}
                                                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                                            >
                                                Giữ điểm gốc
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3 Dedicated HSKT Export Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadHsktWord('exam_only')}
                                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <Download size={13} /> Tải Đề HSKT Riêng (.doc)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadHsktWord('grading_only')}
                                            className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <FileSpreadsheet size={13} /> Tải Biểu Mẫu Chấm HSKT Riêng (.doc)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadHsktWord('both')}
                                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                        >
                                            <Printer size={14} /> Tải Cả Đề & Biểu Mẫu Chấm HSKT (.doc)
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Pill Selector to include/exclude questions for HSKT */}
                                <div className="bg-white p-3 rounded-xl border border-rose-200/80">
                                    <div className="text-[11px] font-bold text-gray-600 mb-2">
                                        Bấm vào số thứ tự câu hỏi bên dưới để Thêm / Bớt câu hỏi trong Đề HSKT (màu đỏ = có trong Đề HSKT):
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeQuestions.map((q, idx) => {
                                            const isSelected = hsktSelectedIds.includes(String(q.id));
                                            return (
                                                <button
                                                    key={q.id || idx}
                                                    type="button"
                                                    onClick={() => toggleHsktQuestion(String(q.id))}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                                        isSelected
                                                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                                    title={`Câu ${idx + 1} (${q.level} - ${q.category === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}): ${q.content?.slice(0, 60)}...`}
                                                >
                                                    <span>Câu {idx + 1}</span>
                                                    <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-rose-700 text-rose-100' : 'bg-gray-200 text-gray-600'}`}>
                                                        {q.level}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
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
                                <span className={`text-xs font-bold mt-2 px-3 py-0.5 rounded border ${
                                    reviewTab === 'hskt'
                                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                }`}>
                                    {reviewTab === 'hskt' ? 'ĐỀ DÀNH CHO HSKT' : 'ĐỀ CHÍNH THỨC'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-start space-y-1 pl-2">
                                <span className="text-sm font-bold uppercase text-gray-950">{headerInfo.tenKyThi}</span>
                                <span className="text-sm font-extrabold uppercase text-gray-900">{headerInfo.monHoc}</span>
                                <span className="text-xs italic text-gray-600">Thời gian: {headerInfo.thoiGian}</span>
                                <span className="text-xs italic text-gray-500">
                                    (Đề có {Math.max(1, Math.ceil((reviewTab === 'hskt' ? activeHsktQuestions.length : activeQuestions.length) / 8))} trang)
                                </span>
                                <span className="text-xs font-bold text-gray-800 mt-1">
                                    Mã đề: {activeVariantCode || headerInfo.maDe || '101'}{reviewTab === 'hskt' ? ' (HSKT)' : ''}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                            <h3 className="text-base font-extrabold text-gray-900 uppercase">
                                PHẦN 1. TRẮC NGHIỆM ({(reviewTab === 'hskt' ? totalHsktMcPts : totalRegularMcPts).toFixed(1).replace('.', ',')} điểm)
                            </h3>
                            <p className="text-xs italic text-gray-600 mt-0.5">
                                Em hãy chọn hoặc điền đáp án đúng vào khung trả lời tương ứng:
                            </p>
                        </div>
                    </div>

                    {/* Question List Preview (Regular vs HSKT) */}
                    <div className="space-y-4">
                        {(reviewTab === 'hskt' ? activeHsktQuestions : activeQuestions).map((q, idx, arr) => {
                            const isFirstEssay = q.category === 'essay' && (idx === 0 || arr[idx - 1].category !== 'essay');
                            const totalEssayPoints = arr.filter(item => item.category === 'essay').reduce((sum, item) => sum + (item.points ?? 1.0), 0);

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
                                                {q.questionType === 'true-false' && q.options && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase())) ? (
                                                    <div className="space-y-2 text-sm text-gray-800">
                                                        <p className="font-medium whitespace-pre-wrap">
                                                            <strong className="text-indigo-950">
                                                                Tình huống {arr.slice(0, idx + 1).filter(item => item.questionType === 'true-false').length}:
                                                            </strong>{' '}
                                                            {(q.content || '')
                                                                .replace(/^Tình\s*huống\s*\d*\s*[:.]\s*/i, '')
                                                                .replace(/\s*(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai\s*của\s*các\s*phát\s*biểu\s*sau\s*[:.]?\s*$/i, '')
                                                                .trim()}
                                                        </p>
                                                        <p className="font-bold text-gray-900">
                                                            Câu {idx + 1}. Xác định tính đúng hoặc sai của các phát biểu sau:
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-800 text-sm font-medium whitespace-pre-wrap">{q.content}</p>
                                                )}

                                                {q.image && (
                                                    <div className="mt-3">
                                                        <img src={q.image} alt="Question illustration" className="max-h-40 w-auto rounded-lg border border-gray-200" />
                                                    </div>
                                                )}

                                                {q.questionType === 'true-false' && (
                                                    q.options && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase())) ? (
                                                        <div className="mt-3 space-y-1.5">
                                                            {q.options.map((opt: any, i: number) => {
                                                                const subLabel = opt.id || ['a', 'b', 'c', 'd'][i] || String.fromCharCode(97 + i);
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-gray-800">
                                                                        <div>
                                                                            <strong className="text-indigo-900">{subLabel})</strong> {opt.text}
                                                                        </div>
                                                                        <span className={`px-2.5 py-0.5 rounded font-extrabold shrink-0 ${
                                                                            opt.isCorrect
                                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                                                                        }`}>
                                                                            {opt.isCorrect ? '✓ ĐÚNG' : '✗ SAI'}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2.5 flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-gray-500">Đáp án chuẩn:</span>
                                                            <span className={`px-3 py-1 rounded text-xs font-extrabold ${q.answer === 'Sai' || q.options?.find(o => o.isCorrect)?.id === 'Sai'
                                                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                }`}>
                                                                {q.answer === 'Sai' || q.options?.find(o => o.isCorrect)?.id === 'Sai' ? '✗ SAI' : '✓ ĐÚNG'}
                                                            </span>
                                                        </div>
                                                    )
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

                                                {q.category === 'essay' && q.answer && (() => {
                                                    const rawAns = (q.answer || '')
                                                        .replace(/^HƯỚNG DẪN CHẤM:?\s*/i, '')
                                                        .replace(/;\s*(?=(?:[a-z]|[0-9]{1,2})\s*[\)\.\-–:])/gi, '\n')
                                                        .replace(/(\s+)(?=[a-z]\s*[-–]\s*\d+(?:[\.,]\d+)?[đd])/gi, '\n');
                                                    const aParts = parseParts(rawAns);
                                                    const qParts = parseParts(q.content || '');
                                                    const getKey = (lbl: string) => {
                                                        const m = lbl.match(/([a-z]|[0-9]{1,2})/i);
                                                        return m ? m[1].toLowerCase() : lbl.replace(/[^a-z0-9]/gi, '').toLowerCase();
                                                    };
                                                    if (aParts.length > 1) {
                                                        return (
                                                            <div className="mt-3 bg-orange-50/40 rounded-lg border border-orange-200 overflow-hidden text-xs">
                                                                <div className="bg-orange-100/70 px-3 py-1.5 font-bold text-orange-950 border-b border-orange-200 flex items-center justify-between">
                                                                    <span>Bảng Hướng dẫn chấm / Barem ({aParts.length} ý):</span>
                                                                    <span>Tổng: {(q.points ?? 1.0).toFixed(1).replace('.', ',')} điểm</span>
                                                                </div>
                                                                <table className="w-full border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-orange-50/80 text-orange-900 border-b border-orange-200">
                                                                            <th className="p-2 border-r border-orange-200 text-left w-[36%]">Ý hỏi</th>
                                                                            <th className="p-2 text-left w-[64%]">Nội dung đáp án & Thang điểm</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {aParts.map((ap, pIdx) => {
                                                                            const k = getKey(ap.label);
                                                                            const qp = qParts.find(item => getKey(item.label) === k);
                                                                            let lbl = ap.label.replace(/\s*[-–].*$/, '').trim();
                                                                            if (lbl && !lbl.endsWith(')') && !lbl.endsWith('.')) lbl += ')';
                                                                            return (
                                                                                <tr key={pIdx} className="border-b border-orange-100 last:border-b-0 bg-white/80">
                                                                                    <td className="p-2 border-r border-orange-200 align-top text-slate-700">
                                                                                        <strong className="text-slate-900">{lbl || `Ý ${pIdx + 1})`}</strong>{' '}
                                                                                        {qp?.content || ''}
                                                                                    </td>
                                                                                    <td className="p-2 align-top text-orange-950 font-medium whitespace-pre-wrap">
                                                                                        {ap.content}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="mt-3 text-xs bg-orange-50/70 p-3 rounded-lg border border-orange-200 text-orange-950 whitespace-pre-wrap">
                                                            <strong className="block mb-1 text-orange-900">Hướng dẫn chấm / Barem:</strong>
                                                            {q.answer}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex flex-col items-end gap-2 min-w-[130px]">
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
                                                            if (reviewTab === 'hskt') {
                                                                updateHsktPoint(String(q.id), isNaN(val) ? 0.25 : val);
                                                            } else {
                                                                updatePoint(q.uniqueId, isNaN(val) ? 0 : val);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {reviewTab === 'hskt' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleHsktQuestion(String(q.id))}
                                                        className="text-xs flex items-center gap-1 text-rose-600 hover:bg-rose-50 px-2 py-1 rounded font-semibold transition-colors cursor-pointer"
                                                    >
                                                        <X size={13} /> Loại khỏi đề HSKT
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => swapQuestion(q)}
                                                        className="text-xs flex items-center gap-1 text-primary hover:bg-blue-50 px-2 py-1 rounded font-semibold transition-colors cursor-pointer"
                                                    >
                                                        <RefreshCw size={13} /> Đổi câu khác
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* SEPARATE HSKT GRADING SHEET PREVIEW WHEN IN HSKT TAB */}
                    {reviewTab === 'hskt' && activeHsktQuestions.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-xs border-2 border-rose-200 p-6 sm:p-8 space-y-4 font-serif mt-6">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-3 font-sans">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-extrabold">
                                        BIỂU MẪU CHẤM RIÊNG CHO HSKT
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        (Tách biệt hoàn toàn với Hướng dẫn chấm của Đề chính thức)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadHsktWord('grading_only')}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={14} /> Xuất Biểu Mẫu Chấm HSKT Riêng (.doc)
                                </button>
                            </div>

                            <div className="text-center space-y-1">
                                <div className="text-sm font-bold uppercase text-gray-900">
                                    HƯỚNG DẪN CHẤM {headerInfo.tenKyThi}
                                </div>
                                <div className="text-sm font-extrabold uppercase text-rose-700">
                                    (BIỂU MẪU CHẤM DÀNH CHO HỌC SINH KHUYẾT TẬT)
                                </div>
                                <div className="text-xs font-bold uppercase text-gray-800">{headerInfo.monHoc}</div>
                            </div>

                            <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-gray-100 font-bold text-center">
                                        <th className="border border-black p-2 w-1/5">Phần</th>
                                        <th className="border border-black p-2 w-3/5">Đáp án / Hướng dẫn chấm HSKT</th>
                                        <th className="border border-black p-2 w-1/5">Điểm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeHsktQuestions.some(q => q.category !== 'essay') && (
                                        <tr>
                                            <td className="border border-black p-3 text-center font-bold">
                                                Trắc nghiệm:<br />{totalHsktMcPts.toFixed(1).replace('.', ',')} điểm
                                            </td>
                                            <td className="border border-black p-3">
                                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
                                                    {activeHsktQuestions.filter(q => q.category !== 'essay').map((q, i) => {
                                                        let ans = '';
                                                        if (q.questionType === 'true-false') {
                                                            if (Array.isArray(q.options) && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase()))) {
                                                                ans = q.options.map((o: any, sIdx: number) => `${o.id || ['a', 'b', 'c', 'd'][sIdx]}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
                                                            } else {
                                                                ans = q.answer === 'Sai' ? 'S' : 'Đ';
                                                            }
                                                        } else {
                                                            ans = q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ') || q.answer || '';
                                                        }
                                                        return (
                                                            <div key={i} className="border border-gray-400 rounded p-1 bg-gray-50">
                                                                <div className="font-bold text-gray-700 border-b border-gray-300 pb-0.5">Câu {i + 1}</div>
                                                                <div className="font-extrabold text-primary pt-0.5">{ans}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="border border-black p-3 text-center font-bold">
                                                {totalHsktMcPts.toFixed(1).replace('.', ',')}đ
                                            </td>
                                        </tr>
                                    )}
                                    {activeHsktQuestions.filter(q => q.category === 'essay').map((q, idx) => {
                                        const mcLen = activeHsktQuestions.filter(item => item.category !== 'essay').length;
                                        return (
                                            <tr key={q.id || idx}>
                                                <td className="border border-black p-3 text-center font-bold">
                                                    Tự luận (Câu {mcLen + idx + 1})
                                                </td>
                                                <td className="border border-black p-3 whitespace-pre-wrap">
                                                    <div className="font-bold underline mb-1">{q.content}</div>
                                                    <div>{q.answer}</div>
                                                </td>
                                                <td className="border border-black p-3 text-center font-bold">
                                                    {(q.points || 1.0).toFixed(1).replace('.', ',')}đ
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-50 font-bold text-center">
                                        <td colSpan={2} className="border border-black p-2.5">
                                            Tổng cộng Đề HSKT: {activeHsktQuestions.length} câu
                                        </td>
                                        <td className="border border-black p-2.5 text-rose-700">
                                            {(totalHsktMcPts + totalHsktEsPts).toFixed(1).replace('.', ',')}đ
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                    <div className="pt-2 mt-1 border-t border-dashed border-rose-200">
                                        <div className="text-[11px] font-bold text-rose-700 uppercase mb-1.5">Hồ sơ riêng dành cho Học sinh Khuyết tật (HSKT):</div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${exportType === 'hskt_both' ? 'border-rose-600 bg-rose-50/70 text-rose-800 font-bold' : 'border-gray-200 hover:bg-rose-50/30'}`}>
                                                <input type="radio" name="exportOption" checked={exportType === 'hskt_both'} onChange={() => setExportType('hskt_both')} />
                                                <div>
                                                    <div className="text-sm">Đề HSKT + Biểu mẫu chấm HSKT riêng ({hsktSelectedIds.length} câu - Thang 10đ)</div>
                                                    <div className="text-xs text-gray-500 font-normal">Gồm cả đề thi rút gọn cho HSKT và biểu mẫu chấm điểm riêng</div>
                                                </div>
                                            </label>
                                            <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${exportType === 'hskt_exam' ? 'border-rose-600 bg-rose-50/70 text-rose-800 font-bold' : 'border-gray-200 hover:bg-rose-50/30'}`}>
                                                <input type="radio" name="exportOption" checked={exportType === 'hskt_exam'} onChange={() => setExportType('hskt_exam')} />
                                                <div>
                                                    <div className="text-sm">Chỉ xuất Đề thi HSKT riêng</div>
                                                </div>
                                            </label>
                                            <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${exportType === 'hskt_grading' ? 'border-rose-600 bg-rose-50/70 text-rose-800 font-bold' : 'border-gray-200 hover:bg-rose-50/30'}`}>
                                                <input type="radio" name="exportOption" checked={exportType === 'hskt_grading'} onChange={() => setExportType('hskt_grading')} />
                                                <div>
                                                    <div className="text-sm">Chỉ xuất Biểu mẫu chấm HSKT riêng</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
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
