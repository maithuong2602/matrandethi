import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, Copy, Trash2, Upload, FileEdit, Printer, Share2, Clipboard, FileText, FileJson, CheckSquare, Square, FolderPlus, Save, Settings, PieChart, Sparkles, Database
} from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import MatrixView from '../components/MatrixView';
import { FileSystemItem, DraggedItemInfo, ToastState, AvailableCounts, ImportedMatrixData, MatrixData, ExerciseQuestion, NewMatrixFormatRowConfig } from '../types';
import { PREDEFINED_FOLDERS as predefinedFoldersByGrade, REQUIREMENTS_DATA as requirementsData, getDefaultCompetencyForTopic, createEmptyNewFormatRow } from '../data/matrixConstants';
import { getRequirementsHtml, generatePrintHTML } from '../utils';
import { loadQuestionBank } from '../services/storage/questionBankStorage';
import { CANONICAL_REQUIREMENTS, KNTT_LESSON_MAPPINGS } from '../data/curriculum/index';
import { syncSpecHtmlWithCustomStore, CUSTOM_CRITERIA_STORAGE_KEY, isQuestionCriteriaValidForLesson, filterQuestionsByActiveCriteria, loadCustomCriteriaStore, GradeCriteriaMap, detectGradeFromLessonOrContext, buildSpecHtmlFromQuestionPool, parseYccdSections, serializeYccdSections, getLevelCodeFromTitle } from '../services/criteriaService';

const collectRowPoolQuestionsFromDir = (
    dir: FileSystemItem | null | undefined,
    subTopic: string,
    lessonName: string,
    gradeNum: string,
    customStore: GradeCriteriaMap,
    liveBankQuestions: any[] = []
): any[] => {
    const folderQuestions: any[] = [];
    const normSub = (subTopic || '').trim();
    const normLesson = (lessonName || '').trim();
    const lessonNum = normLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();

    if (dir && Array.isArray(dir.children)) {
        const subTopicFolder = dir.children.find(c => c.type === 'folder' && c.name === normSub);
        const files = subTopicFolder?.children?.filter(c => c.type === 'file' && c.content) || [];
        files.forEach(file => {
            const fileLesson = String(
                file.content?.info?.lesson ||
                file.content?.thongTinChung?.bai ||
                file.name.replace(/\.json$/i, '') ||
                ''
            ).trim();
            const fileLessonNum = fileLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();

            const matchesLesson =
                !normLesson ||
                fileLesson === normLesson ||
                (lessonNum && fileLessonNum === lessonNum);

            if (!matchesLesson) return;

            const effLesson = fileLesson || normLesson;
            (file.content?.tracNghiem || []).forEach((q: any) => {
                if (!isQuestionCriteriaValidForLesson(q, gradeNum, effLesson, customStore)) return;
                folderQuestions.push({
                    ...q,
                    level: (q.mucDo || q.level || 'NB').toUpperCase(),
                    category: 'mc',
                    criteria: q.tieuChi || q.criteria || ''
                });
            });
            (file.content?.tuLuan || []).forEach((q: any) => {
                if (!isQuestionCriteriaValidForLesson(q, gradeNum, effLesson, customStore)) return;
                folderQuestions.push({
                    ...q,
                    level: (q.mucDo || q.level || 'NB').toUpperCase(),
                    category: 'essay',
                    criteria: q.tieuChi || q.criteria || ''
                });
            });
            (file.content?.questions || []).forEach((q: any) => {
                if (!isQuestionCriteriaValidForLesson(q, gradeNum, effLesson, customStore)) return;
                folderQuestions.push({
                    ...q,
                    level: (q.level || q.mucDo || 'NB').toUpperCase(),
                    category: q.category || 'mc',
                    criteria: q.criteria || q.tieuChi || ''
                });
            });
        });
    }

    if (folderQuestions.length > 0) {
        return folderQuestions;
    }

    const bankMatched: any[] = [];
    if ((normLesson || normSub) && Array.isArray(liveBankQuestions) && liveBankQuestions.length > 0) {
        liveBankQuestions.forEach(q => {
            const qLesson = String(q.lesson || '').trim();
            const qLessonNum = qLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();
            const isMatch =
                (normLesson && (qLesson === normLesson || (lessonNum && qLessonNum === lessonNum))) ||
                (!normLesson && normSub && qLesson.toLowerCase().includes(normSub.replace(/^\d+\.\s*/, '').toLowerCase()));
            if (isMatch) {
                bankMatched.push({
                    ...q,
                    level: (q.level || q.mucDo || 'NB').toUpperCase(),
                    category: q.category || 'mc',
                    criteria: q.criteria || q.tieuChi || ''
                });
            }
        });
    }

    return bankMatched;
};

const MatrixBuilder: React.FC = () => {
    // --- State ---
    const [fileSystem, setFileSystem] = useState<FileSystemItem>({ name: 'Thư mục gốc', type: 'folder', children: [] });
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState<FileSystemItem[] | null>(null);
    const [draggedItem, setDraggedItem] = useState<DraggedItemInfo | null>(null);
    const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
    
    // Modal States
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
    const [modalInputValue, setModalInputValue] = useState('');
    
    // Create Exam Type Form State
    const [gradeSelectValue, setGradeSelectValue] = useState('');
    const [gradeDescType, setGradeDescType] = useState('Giữa kì I');
    const [gradeDescValue, setGradeDescValue] = useState(''); // Only used when type is 'Khác'
    const [newFolderFormat, setNewFolderFormat] = useState<'classic' | 'new_4part'>('new_4part');
    
    const [selectedTopicValue, setSelectedTopicValue] = useState('');
    
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // New State for bulk topic selection
    const [tempSelectedGroups, setTempSelectedGroups] = useState<string[]>([]);
    
    // State for Distribution Ratio
    const [ratioOption, setRatioOption] = useState<'40-30-30' | '30-40-30' | '40-30-20-10'>('40-30-20-10');
    const [isSmartRatioApplied, setIsSmartRatioApplied] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        const syncTreeWithCustomCriteria = (
            node: FileSystemItem,
            customStore: GradeCriteriaMap,
            allBankQuestions: any[],
            currentGrade?: string
        ) => {
            if (!node) return;
            let g = currentGrade;
            const m = node.name?.match(/(?:Lớp|Khối)\s*(\d+)/i) || node.name?.match(/\b([6-9])\b/);
            if (m && ['6', '7', '8', '9'].includes(m[1])) {
                g = m[1];
            }
            if (node.type === 'file' && node.content) {
                const fGrade = String(node.content.info?.grade || node.content.thongTinChung?.khoi || g || '7').match(/\d+/)?.[0] || g || '7';
                const fLesson = String(node.content.info?.lesson || node.content.thongTinChung?.bai || node.name.replace(/\.json$/i, '') || '').trim();
                if (Array.isArray(node.content.questions)) {
                    const filtered = filterQuestionsByActiveCriteria(node.content.questions, fGrade, fLesson, customStore);
                    if (filtered.valid.length > 0 || node.content.questions.length === 0) {
                        node.content.questions = filtered.valid;
                    }
                }
                if (Array.isArray(node.content.tracNghiem)) {
                    const filtered = filterQuestionsByActiveCriteria(node.content.tracNghiem, fGrade, fLesson, customStore);
                    if (filtered.valid.length > 0 || node.content.tracNghiem.length === 0) {
                        node.content.tracNghiem = filtered.valid;
                    }
                }
                if (Array.isArray(node.content.tuLuan)) {
                    const filtered = filterQuestionsByActiveCriteria(node.content.tuLuan, fGrade, fLesson, customStore);
                    if (filtered.valid.length > 0 || node.content.tuLuan.length === 0) {
                        node.content.tuLuan = filtered.valid;
                    }
                }

                // Tự động khôi phục từ Ngân hàng câu hỏi nếu file bài học trong đề từng bị lọc rỗng do lỗi cũ
                const totalInFile =
                    (node.content.questions?.length || 0) +
                    (node.content.tracNghiem?.length || 0) +
                    (node.content.tuLuan?.length || 0);
                if (totalInFile === 0 && fLesson && allBankQuestions.length > 0) {
                    const fLessonNum = fLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();
                    const restored = allBankQuestions.filter(q => {
                        if (fGrade && q.grade && String(q.grade) !== fGrade) return false;
                        const qLesson = String(q.lesson || '').trim();
                        const qLessonNum = qLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();
                        return qLesson === fLesson || (fLessonNum && qLessonNum === fLessonNum);
                    });
                    if (restored.length > 0) {
                        node.content.questions = restored;
                    }
                }
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(c => syncTreeWithCustomCriteria(c, customStore, allBankQuestions, g));
            }
            if (node.matrixData?.specifications?.rows && Array.isArray(node.matrixData.specifications.rows)) {
                node.matrixData.specifications.rows.forEach((row: string[], rIdx: number) => {
                    const mainTopic = row[1] || node.matrixData?.matrix?.rows?.[rIdx]?.[1] || '';
                    const subTopic = row[2] || node.matrixData?.matrix?.rows?.[rIdx]?.[2] || '';
                    const lessonName = row[3] || node.matrixData?.matrix?.rows?.[rIdx]?.[3] || '';
                    const effGrade = g || detectGradeFromLessonOrContext(lessonName || subTopic || mainTopic, node.name);

                    const gradeBankQs = allBankQuestions.filter(q => !effGrade || !q.grade || String(q.grade) === effGrade);
                    const poolQs = collectRowPoolQuestionsFromDir(node, subTopic, lessonName, effGrade, customStore, gradeBankQs);
                    if (poolQs.length > 0) {
                        const poolSpec = buildSpecHtmlFromQuestionPool(effGrade, lessonName, subTopic, poolQs, customStore);
                        if (poolSpec && poolSpec.specHtml) {
                            row[4] = poolSpec.specHtml;
                            return;
                        }
                    }

                    if (row[4] || lessonName || subTopic) {
                        const baseHtml = row[4] || getRequirementsHtml(effGrade, mainTopic, subTopic, lessonName, customStore);
                        const syncedHtml = syncSpecHtmlWithCustomStore(
                            baseHtml,
                            effGrade,
                            subTopic,
                            lessonName,
                            customStore
                        );
                        row[4] = syncedHtml || getRequirementsHtml(effGrade, mainTopic, subTopic, lessonName, customStore);
                    }
                });
            }
        };

        const reloadFs = () => {
            const saved = localStorage.getItem('matrixFileSystem');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const customStore = loadCustomCriteriaStore();
                    const bankRes = loadQuestionBank();
                    const validBankQs = filterQuestionsByActiveCriteria(bankRes.data || [], undefined, undefined, customStore).valid;
                    syncTreeWithCustomCriteria(parsed, customStore, validBankQs);
                    setFileSystem(parsed);
                } catch (e) {
                    console.error("Failed to load file system", e);
                }
            }
        };

        reloadFs();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'matrixFileSystem' || e.key === CUSTOM_CRITERIA_STORAGE_KEY) {
                reloadFs();
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('matrix_filesystem_updated', reloadFs);
        window.addEventListener('criteria_updated', reloadFs);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('matrix_filesystem_updated', reloadFs);
            window.removeEventListener('criteria_updated', reloadFs);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('matrixFileSystem', JSON.stringify(fileSystem));
    }, [fileSystem]);

    const findDirectory = (path: string[], root = fileSystem): FileSystemItem | null => {
        let current = root;
        for (const segment of path) {
            if (!current.children) return null;
            const found = current.children.find(child => child.name === segment && child.type === 'folder');
            if (!found) return null;
            current = found;
        }
        return current;
    };

    // --- SMART DEFAULTS EFFECTS ---

    // 1. Sync tempSelectedGroups when entering a folder
    useEffect(() => {
        if (currentPath.length === 1) {
            const currentDir = findDirectory(currentPath, fileSystem);
            if (currentDir) {
                const activeGroups = predefinedFoldersByGrade[currentDir.name.match(/Lớp \d+/)?.[0] || '']?.filter(grp => {
                    return grp.items.some(item => currentDir.children?.some(c => c.name === item));
                }).map(g => g.group) || [];
                setTempSelectedGroups(activeGroups);
            }
        }
    }, [currentPath, fileSystem]);

    // 2. Advanced Smart Ratio Selection based on Folder Name AND Content Analysis (YCCĐ)
    useEffect(() => {
        if (currentPath.length > 0) {
            const currentFolderName = currentPath[currentPath.length - 1].toLowerCase();
            const currentDir = findDirectory(currentPath, fileSystem);
            const gradeName = currentDir?.name.match(/Lớp \d+/)?.[0];

            let recommendedRatio: '40-30-30' | '30-40-30' | '40-30-20-10' = '40-30-20-10';
            
            // ANALYZE CONTENT (Count YCCĐ lines)
            let countNB = 0;
            let countTH = 0;
            let countVDC = 0;
            let countVDC_New = 0; // Check VDC only in New/Active content

            if (currentDir && gradeName && requirementsData[gradeName]) {
                const gradeReqs = requirementsData[gradeName];
                
                // Iterate through existing sub-folders (Topics/Lessons)
                currentDir.children?.forEach(child => {
                    if (child.type === 'folder') {
                        // Determine if this is likely "New Content" (heuristic: not fully examined)
                        // If MatrixData exists, use it. Else assume all are new unless indicated.
                        let isNewContent = true;
                        if (currentDir.matrixData) {
                            const row = currentDir.matrixData.matrix.rows.find(r => r[3] === child.name || r[3] === child.content?.info?.lesson);
                            if (row) {
                                const st = parseFloat(row[4] as string) || 0;
                                const ex = parseFloat(row[14] as string) || 0;
                                if (ex >= st && st > 0) isNewContent = false;
                            }
                        }

                        // Find which Main Topic this child belongs to
                        const mainTopicEntry = Object.entries(gradeReqs).find(([_, subTopics]) => 
                            Object.keys(subTopics as object).includes(child.name)
                        );
                        
                        if (mainTopicEntry) {
                            const [mainTopicKey, subTopicList] = mainTopicEntry;
                            const reqString = (subTopicList as any)[child.name];
                            
                            if (reqString) {
                                const lines = reqString.split('\n');
                                let currentLevel = '';
                                lines.forEach((line: string) => {
                                    const l = line.trim().toLowerCase();
                                    if (l.startsWith('nhận biết')) currentLevel = 'NB';
                                    else if (l.startsWith('thông hiểu')) currentLevel = 'TH';
                                    else if (l.startsWith('vận dụng cao')) currentLevel = 'VDC';
                                    else if (l.startsWith('vận dụng')) currentLevel = 'VD'; 
                                    else if (l.length > 3) {
                                        if (currentLevel === 'NB') countNB++;
                                        if (currentLevel === 'TH') countTH++;
                                        if (currentLevel === 'VDC') {
                                            countVDC++;
                                            if (isNewContent) countVDC_New++;
                                        }
                                    }
                                });
                            }
                        }
                    }
                });
            }

            const isMidTerm = currentFolderName.includes('giữa kì') || currentFolderName.includes('giua ki');
            const isFinal = currentFolderName.includes('cuối kì') || currentFolderName.includes('cuoi ki');
            
            if (isMidTerm) {
                // Chuẩn CV 7991: Mặc định tỷ lệ nhận thức luôn ưu tiên 4-3-3 (40% NB - 30% TH - 30% VD)
                recommendedRatio = countVDC > 0 ? '40-30-20-10' : '40-30-30';
            } else if (isFinal) {
                recommendedRatio = countVDC_New > 0 ? '40-30-20-10' : '40-30-30';
            } else {
                recommendedRatio = countVDC > 0 ? '40-30-20-10' : '40-30-30';
            }

            setRatioOption(recommendedRatio);
            setIsSmartRatioApplied(true);
            setTimeout(() => setIsSmartRatioApplied(false), 3000); 
        }
    }, [currentPath]);

    // --- Helpers ---
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const getCurrentDirectory = () => findDirectory(currentPath);

    // --- Folder/Matrix Logic ---

    const regenerateMatrix = (dir: FileSystemItem, providedStore?: GradeCriteriaMap) => {
        if (!dir.children) return;
        const subTopicFolders = dir.children.filter(c => c.type === 'folder');
        if (subTopicFolders.length === 0) {
            delete dir.matrixData;
            return;
        }

        const grade = dir.name;
        const gradeNumberMatch = grade.match(/\d+/);
        if (!gradeNumberMatch) { delete dir.matrixData; return; }
        const gradeKey = `Lớp ${gradeNumberMatch[0]}`;
        const topicsForGrade = predefinedFoldersByGrade[gradeKey];
        if (!topicsForGrade) { delete dir.matrixData; return; }

        const customStore = providedStore || loadCustomCriteriaStore();

        // Initialize Data
        const matrixRows: string[][] = [];
        const specRows: string[][] = [];
        const availableCounts: AvailableCounts[] = [];
        
        let stt = 1;

        // Iterate through Predefined Topics to maintain order
        topicsForGrade.forEach((group: any) => {
            const mainTopic = group.group;
            group.items.forEach((subTopic: string) => {
                // Check if this subtopic exists in fileSystem
                const subTopicFolder = subTopicFolders.find(f => f.name === subTopic);
                if (subTopicFolder) {
                    const files = subTopicFolder.children?.filter(c => c.type === 'file' && c.content) || [];
                    
                    if (files.length > 0) {
                        // Create a row for each file (Lesson)
                        files.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                        
                        files.forEach(file => {
                            // Support both old and new formats for Lesson Name
                            const lessonName = file.content?.info?.lesson || file.content?.thongTinChung?.bai || file.name.replace('.json', '');
                            const soTiet = (file.content?.info?.soTiet || file.content?.thongTinChung?.soTiet || 1).toString();
                            const gradeDigits = gradeNumberMatch[0];
                            
                            // Count available questions & collect question pool (chỉ tính các câu có YCCĐ hợp lệ trong bài học)
                            const counts = { NB: {TN:0,TL:0}, TH: {TN:0,TL:0}, VD: {TN:0,TL:0}, VDC: {TN:0,TL:0} };
                            const filePoolQuestions: any[] = [];
                            
                            // Old format counts
                            (file.content?.tracNghiem || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, gradeDigits, lessonName, customStore)) return;
                                const l = (q.mucDo || 'NB').toUpperCase() as keyof AvailableCounts;
                                if(counts[l]) counts[l].TN++;
                                filePoolQuestions.push({ ...q, level: l, category: 'mc', criteria: q.tieuChi || q.criteria || '' });
                            });
                            (file.content?.tuLuan || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, gradeDigits, lessonName, customStore)) return;
                                const l = (q.mucDo || 'NB').toUpperCase() as keyof AvailableCounts;
                                if(counts[l]) counts[l].TL++;
                                filePoolQuestions.push({ ...q, level: l, category: 'essay', criteria: q.tieuChi || q.criteria || '' });
                            });

                            // New format counts
                            (file.content?.questions || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, gradeDigits, lessonName, customStore)) return;
                                const l = (q.level || 'NB').toUpperCase() as keyof AvailableCounts;
                                const isMC = q.category === 'mc';
                                if(counts[l]) {
                                    if (isMC) counts[l].TN++;
                                    else counts[l].TL++;
                                }
                                filePoolQuestions.push({ ...q, level: l, category: q.category || 'mc', criteria: q.criteria || q.tieuChi || '' });
                            });

                            const poolSpec = filePoolQuestions.length > 0
                                ? buildSpecHtmlFromQuestionPool(gradeDigits, lessonName, subTopic, filePoolQuestions, customStore)
                                : null;
                            const requirements = poolSpec?.specHtml || getRequirementsHtml(grade, mainTopic, subTopic, lessonName, customStore);

                            // Push Rows
                            // Matrix Row: 
                            // 0:STT, 1:Main, 2:Sub, 3:Lesson, 4:SoTiet, 
                            // 5-12: Counts (NB_TN, NB_TL...), 
                            // 13: Percent, 
                            // 14: Examined Periods (string number, initialized to '0')
                            // Preserve existing row if present
                            const existingRow = dir.matrixData?.matrix?.rows?.find((r: any) => 
                                r[1] === mainTopic && r[2] === subTopic && r[3] === lessonName
                            );
                            if (existingRow) {
                                const keptSoTiet = (existingRow[4] && existingRow[4] !== '0') ? existingRow[4] : soTiet;
                                matrixRows.push([
                                    stt.toString(), mainTopic, subTopic, lessonName, keptSoTiet, 
                                    existingRow[5] || '', existingRow[6] || '', existingRow[7] || '', existingRow[8] || '',
                                    existingRow[9] || '', existingRow[10] || '', existingRow[11] || '', existingRow[12] || '',
                                    existingRow[13] || '0', existingRow[14] || '0'
                                ]);
                            } else {
                                matrixRows.push([
                                    stt.toString(), mainTopic, subTopic, lessonName, soTiet, 
                                    '','','','','','','','','0', '0' 
                                ]);
                            }
                            const existingSpec = (dir.matrixData?.specifications?.rows || (dir.matrixData as any)?.spec?.rows)?.find((r: any) =>
                                r[1] === mainTopic && r[2] === subTopic && r[3] === lessonName
                            );
                            if (existingSpec) {
                                const syncedExistingHtml = poolSpec?.specHtml || syncSpecHtmlWithCustomStore(
                                    existingSpec[4] || requirements,
                                    gradeNumberMatch[0],
                                    subTopic,
                                    lessonName,
                                    customStore
                                );
                                specRows.push([
                                    stt.toString(), mainTopic, subTopic, lessonName, syncedExistingHtml || requirements, 
                                    existingSpec[5] || '0-0', existingSpec[6] || '0-0', existingSpec[7] || '0-0', existingSpec[8] || '0-0'
                                ]);
                            } else {
                                specRows.push([
                                    stt.toString(), mainTopic, subTopic, lessonName, requirements, 
                                    '0-0', '0-0', '0-0', '0-0'
                                ]);
                            }
                            availableCounts.push(counts);
                            stt++;
                        });
                    } else {
                        // Create placeholder row for subtopic
                        const requirements = getRequirementsHtml(grade, mainTopic, subTopic);
                        const existingRow = dir.matrixData?.matrix?.rows?.find((r: any) => 
                            r[1] === mainTopic && r[2] === subTopic && (r[3] === '' || !r[3])
                        );
                        if (existingRow) {
                            const keptSoTiet = (existingRow[4] && existingRow[4] !== '0') ? existingRow[4] : '2';
                            matrixRows.push([
                                stt.toString(), mainTopic, subTopic, '', keptSoTiet, 
                                existingRow[5] || '', existingRow[6] || '', existingRow[7] || '', existingRow[8] || '',
                                existingRow[9] || '', existingRow[10] || '', existingRow[11] || '', existingRow[12] || '',
                                existingRow[13] || '0', existingRow[14] || '0'
                            ]);
                        } else {
                            matrixRows.push([
                                stt.toString(), mainTopic, subTopic, '', '2', 
                                '','','','','','','','','0', '0'
                            ]);
                        }
                        const existingSpec = (dir.matrixData?.specifications?.rows || (dir.matrixData as any)?.spec?.rows)?.find((r: any) =>
                            r[1] === mainTopic && r[2] === subTopic && (r[3] === '' || !r[3])
                        );
                        if (existingSpec) {
                            const syncedExistingHtml = syncSpecHtmlWithCustomStore(
                                existingSpec[4] || requirements,
                                gradeNumberMatch[0],
                                subTopic,
                                undefined,
                                customStore
                            );
                            specRows.push([
                                stt.toString(), mainTopic, subTopic, '', syncedExistingHtml, 
                                existingSpec[5] || '0-0', existingSpec[6] || '0-0', existingSpec[7] || '0-0', existingSpec[8] || '0-0'
                            ]);
                        } else {
                            specRows.push([
                                stt.toString(), mainTopic, subTopic, '', requirements, 
                                '0-0', '0-0', '0-0', '0-0'
                            ]);
                        }
                        availableCounts.push({ NB: {TN:0,TL:0}, TH: {TN:0,TL:0}, VD: {TN:0,TL:0}, VDC: {TN:0,TL:0} });
                        stt++;
                    }
                }
            });
        });

        // Calculate Percentages strictly based on SoTiet
        const totalSoTiet = matrixRows.reduce((sum, row) => sum + (parseFloat(row[4] as string) || 0), 0);
        if (totalSoTiet > 0) {
            matrixRows.forEach(row => {
                const periods = parseFloat(row[4] as string) || 0;
                // Store Period Percentage in Column 13
                row[13] = ((periods / totalSoTiet) * 100).toFixed(1);
            });
        }

        // Initialize Matrix Data (preserving format & custom configs)
        const prevFormat = dir.matrixData?.matrixFormat;
        const prevPointsConfig = dir.matrixData?.pointsConfig;
        const prevNewPointsConfig = dir.matrixData?.newPointsConfig;
        const prevNewFormatRows = dir.matrixData?.newFormatRows;
        const prevCustomNote = dir.matrixData?.customNote;

        dir.matrixData = {
            matrix: { rows: matrixRows },
            specifications: { rows: specRows },
            availableCounts: availableCounts,
            normalizedPercentages: {}, // Deprecated in favor of SoTiet calculation
            subTopicPercentages: {}, // Deprecated
            ...(prevFormat ? { matrixFormat: prevFormat } : {}),
            ...(prevPointsConfig ? { pointsConfig: prevPointsConfig } : {}),
            ...(prevNewPointsConfig ? { newPointsConfig: prevNewPointsConfig } : {}),
            ...(prevNewFormatRows ? { newFormatRows: prevNewFormatRows } : {}),
            ...(prevCustomNote !== undefined ? { customNote: prevCustomNote } : {})
        };
    };

    const handleDistribute = () => {
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir || !currentDir.matrixData) return;
        
        const data = currentDir.matrixData;
        const examName = currentDir.name.toLowerCase();
        const isFinalExam = examName.includes('cuối kì') || examName.includes('cuoi ki');

        // --- 1. CONFIGURATIONS ---
        const SCORE_TL = 1.0;
        const SCORE_TN = 0.25;
        const TOTAL_SCORE = 10.0;
        const MAX_OLD_PERCENT = 0.35; // 35% cap for old lessons in Final Exam
        
        // Calculate Target Counts based on Ratio
        // Standard: 28 TN (7.0 pts) + 3 TL (3.0 pts)
        let targetNB_TN = 16, targetTH_TN = 12; // Default 4:3
        let targetVD_TL = 0, targetVDC_TL = 0;
        
        if (ratioOption === '40-30-20-10') {
            targetNB_TN = 16; targetTH_TN = 12; // 40-30 TN
            targetVD_TL = 2;  targetVDC_TL = 1; // 20-10 TL
        } else if (ratioOption === '40-30-30') {
            targetNB_TN = 16; targetTH_TN = 12; // 40-30 TN
            targetVD_TL = 3;  targetVDC_TL = 0; // 30 VD
        } else if (ratioOption === '30-40-30') {
            targetNB_TN = 12; targetTH_TN = 16; // 30-40 TN (Flip)
            targetVD_TL = 3;  targetVDC_TL = 0; // 30 VD
        }

        // --- 2. PREPARE ROW DATA & REFRESH AVAILABLE COUNTS FROM LIVE QUESTION BANK ---
        const firstRowRef = data.matrix?.rows?.[0];
        const gradeNum = detectGradeFromLessonOrContext(
            String(firstRowRef?.[3] || firstRowRef?.[2] || firstRowRef?.[1] || ''),
            currentDir.name
        );
        const customStore = loadCustomCriteriaStore();
        const liveBankRes = loadQuestionBank();
        const liveBankQuestions = (liveBankRes.data || []).filter(
            q => (!gradeNum || !q.grade || String(q.grade) === gradeNum) && isQuestionCriteriaValidForLesson(q, gradeNum, q.lesson, customStore)
        );

        const rows = data.matrix.rows.map((row: any[], idx: number) => {
            const st = parseFloat(row[4] as string) || 0;
            const examined = parseFloat(row[14] as string) || 0;
            const validExamined = Math.min(Math.max(examined, 0), st);
            const validNew = Math.max(st - validExamined, 0);
            const rowLesson = String(row[3] || '').trim();
            const rowSubTopic = String(row[2] || '').trim();

            // Thu thập kho câu hỏi trong đề (từ tệp JSON trong thư mục đề hoặc Ngân hàng câu hỏi của bài học đó)
            const rowPoolQuestions = collectRowPoolQuestionsFromDir(
                currentDir,
                rowSubTopic,
                rowLesson,
                gradeNum,
                customStore,
                liveBankQuestions
            );

            // Kết hợp số lượng câu có sẵn trong thư mục và trong Ngân hàng câu hỏi nội bộ
            const baseAvail = data.availableCounts?.[idx] || { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } };
            const poolCounts = { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } };
            rowPoolQuestions.forEach(q => {
                const lvl = getLevelCodeFromTitle(String(q.level || q.mucDo || 'NB')) as 'NB' | 'TH' | 'VD' | 'VDC';
                if (poolCounts[lvl]) {
                    if (q.category === 'essay') poolCounts[lvl].TL++;
                    else poolCounts[lvl].TN++;
                }
            });

            const mergedAvail = rowPoolQuestions.length > 0
                ? poolCounts
                : {
                    NB: { TN: baseAvail.NB?.TN || 0, TL: baseAvail.NB?.TL || 0 },
                    TH: { TN: baseAvail.TH?.TN || 0, TL: baseAvail.TH?.TL || 0 },
                    VD: { TN: baseAvail.VD?.TN || 0, TL: baseAvail.VD?.TL || 0 },
                    VDC: { TN: baseAvail.VDC?.TN || 0, TL: baseAvail.VDC?.TL || 0 }
                };
            if (data.availableCounts) {
                data.availableCounts[idx] = mergedAvail;
            }

            // Dựa trực tiếp vào KHO CÂU HỎI TRONG ĐỀ để biết có ra Yêu cầu cần đạt ở mức Nhận biết / Thông hiểu / Vận dụng trên Bản đặc tả không
            const poolSpec = rowPoolQuestions.length > 0
                ? buildSpecHtmlFromQuestionPool(gradeNum || currentDir.name, rowLesson, rowSubTopic, rowPoolQuestions, customStore)
                : null;

            const freshSpecHtml = getRequirementsHtml(gradeNum || currentDir.name, String(row[1] || ''), rowSubTopic, rowLesson, customStore);
            const baseCurriculumHtml =
                freshSpecHtml ||
                syncSpecHtmlWithCustomStore(String(data.specifications?.rows?.[idx]?.[4] || ''), gradeNum, rowSubTopic, rowLesson, customStore);

            const currHasNB = /<strong[^>]*>\s*(?:\d+[\.\)]\s*)?(?:nhận biết|biết|- biết)/i.test(baseCurriculumHtml);
            const currHasTH = /<strong[^>]*>\s*(?:\d+[\.\)]\s*)?(?:thông hiểu|hiểu|- hiểu)/i.test(baseCurriculumHtml);
            const currHasVD = /<strong[^>]*>\s*(?:\d+[\.\)]\s*)?(?:vận dụng|- vận dụng)/i.test(baseCurriculumHtml);

            let specHtml = poolSpec?.specHtml || baseCurriculumHtml;

            let hasNBSpec = poolSpec ? (poolSpec.hasNB && currHasNB) : currHasNB;
            let hasTHSpec = poolSpec ? (poolSpec.hasTH && currHasTH) : currHasTH;
            let hasVDSpec = poolSpec ? (poolSpec.hasVD && currHasVD) : currHasVD;

            // Nếu dòng không có mảng câu hỏi chi tiết nhưng có cấu hình availableCounts > 0,
            // cũng giới hạn mức độ YCCĐ theo đúng các mức có số lượng câu hỏi > 0 trong kho câu hỏi của dòng đó
            const availNBTotal = (mergedAvail.NB?.TN || 0) + (mergedAvail.NB?.TL || 0);
            const availTHTotal = (mergedAvail.TH?.TN || 0) + (mergedAvail.TH?.TL || 0);
            const availVDTotal = (mergedAvail.VD?.TN || 0) + (mergedAvail.VD?.TL || 0) + (mergedAvail.VDC?.TN || 0) + (mergedAvail.VDC?.TL || 0);
            const hasExplicitAvailCounts = !poolSpec && (availNBTotal + availTHTotal + availVDTotal > 0);

            if (hasExplicitAvailCounts) {
                hasNBSpec = hasNBSpec && availNBTotal > 0;
                hasTHSpec = hasTHSpec && availTHTotal > 0;
                hasVDSpec = hasVDSpec && availVDTotal > 0;

                const parsedSecs = parseYccdSections(specHtml).filter(sec => {
                    const code = getLevelCodeFromTitle(sec.levelTitle);
                    if (code === 'NB') return availNBTotal > 0;
                    if (code === 'TH') return availTHTotal > 0;
                    return availVDTotal > 0;
                });
                if (parsedSecs.length > 0) {
                    specHtml = serializeYccdSections(parsedSecs);
                }
            }

            if (data.specifications?.rows?.[idx]) {
                data.specifications.rows[idx][4] = specHtml;
            }

            return { 
                idx, 
                soTiet: st,
                soTietExamined: validExamined, // For Final Exam logic
                soTietNew: validNew,           // For Final Exam logic
                isOldLesson: validExamined > 0 && validNew === 0,
                isNewLesson: validNew > 0,
                avail: mergedAvail,
                currHasNB,
                currHasTH,
                currHasVD,
                baseCurriculumHtml,
                hasNBSpec,
                hasTHSpec,
                hasVDSpec,
                allocNB: 0, allocTH: 0, allocVD: 0, allocVDC: 0,
                targetScore: 0,
                currentScore: 0,
            };
        });

        // Helper: Update Current Score
        const updateRowScore = (r: any) => {
            r.currentScore = (r.allocNB + r.allocTH) * SCORE_TN + (r.allocVD + r.allocVDC) * SCORE_TL;
        };

        // Calculate Target Score for Old Pool (Max 35% for examined lessons in Final Exam, unified with MatrixView & buildMatrixNotesSummary)
        const totalSoTietAll = rows.reduce((s: number, r: any) => s + r.soTiet, 0);
        const totalSoTietExaminedAll = rows.reduce((s: number, r: any) => s + r.soTietExamined, 0);
        const totalSoTietNewAll = rows.reduce((s: number, r: any) => s + r.soTietNew, 0);
        const hasExaminedReduction = totalSoTietExaminedAll > 0 && totalSoTietNewAll > 0;
        const LIMIT_OLD_SCORE = hasExaminedReduction ? (TOTAL_SCORE * MAX_OLD_PERCENT) : TOTAL_SCORE; // Max 3.5đ (35%)

        if (!hasExaminedReduction) {
            // --- PROPORTIONAL TO TOTAL PERIODS ---
            rows.forEach((r: any) => {
                if (totalSoTietAll > 0) {
                    r.targetScore = (r.soTiet / totalSoTietAll) * TOTAL_SCORE;
                }
            });
        } else {
            // --- WEIGHTED OLD VS NEW (Tổng tỷ lệ % đã kiểm tra không vượt quá 35%) ---
            const naturalOldPct = (totalSoTietExaminedAll / totalSoTietAll) * 100;
            const targetOldPct = Math.min(MAX_OLD_PERCENT * 100, naturalOldPct);
            const scoreForOld = TOTAL_SCORE * (targetOldPct / 100);
            const scoreForNew = TOTAL_SCORE - scoreForOld;

            rows.forEach((r: any) => {
                let sOld = 0, sNew = 0;
                if (totalSoTietExaminedAll > 0) {
                    sOld = (r.soTietExamined / totalSoTietExaminedAll) * scoreForOld;
                }
                if (totalSoTietNewAll > 0) {
                    sNew = (r.soTietNew / totalSoTietNewAll) * scoreForNew;
                }
                r.targetScore = sOld + sNew;
            });
        }

        // --- 4. STEP 1: DISTRIBUTE ESSAY (TL) ---
        // TL Priority Queue: VDC first, then VD
        const tasksTL: ('VDC'|'VD')[] = [];
        for(let i=0; i<targetVDC_TL; i++) tasksTL.push('VDC');
        for(let i=0; i<targetVD_TL; i++) tasksTL.push('VD');

        const eligibleVDNewCount = rows.filter(
            (r: any) => r.soTiet > 0 && r.hasVDSpec && !(hasExaminedReduction && r.isOldLesson)
        ).length;
        if (eligibleVDNewCount < tasksTL.length) {
            rows.forEach((r: any) => {
                if (r.soTiet > 0 && !r.hasVDSpec && r.currHasVD) {
                    r.hasVDSpec = true;
                }
            });
        }

        for (const type of tasksTL) {
            // Ưu tiên bài học mới (chưa thi), có YCCĐ Vận dụng trong bài học và còn hạn mức điểm
            let candidates = rows.filter((r: any) => {
                if (r.soTiet <= 0 || !r.hasVDSpec) return false;
                if (hasExaminedReduction && r.isOldLesson) return false;
                if ((r.allocVD + r.allocVDC) > 0) return false;
                const avail = type === 'VD' ? r.avail.VD.TL : r.avail.VDC.TL;
                const allocated = type === 'VD' ? r.allocVD : r.allocVDC;
                return avail > allocated && (r.targetScore - r.currentScore) >= 0.5;
            });
            // Fallback 1: Bài mới bất kỳ có YCCĐ Vận dụng chưa có câu tự luận
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => {
                    if (r.soTiet <= 0 || !r.hasVDSpec) return false;
                    if (hasExaminedReduction && r.isOldLesson) return false;
                    return (r.allocVD + r.allocVDC) === 0;
                });
            }
            // Fallback 2: Bất kỳ bài nào có YCCĐ Vận dụng còn trống tự luận
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => r.soTiet > 0 && r.hasVDSpec && (r.allocVD + r.allocVDC) === 0);
            }
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => r.soTiet > 0 && r.hasVDSpec);
            }
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => r.soTiet > 0);
            }

            candidates.sort((a: any, b: any) => {
                if (hasExaminedReduction) {
                    if (a.isNewLesson && !b.isNewLesson) return -1;
                    if (!a.isNewLesson && b.isNewLesson) return 1;
                }
                // Ưu tiên bài có khoảng trống điểm mục tiêu lớn nhất
                const aGap = a.targetScore - a.currentScore;
                const bGap = b.targetScore - b.currentScore;
                if (Math.abs(aGap - bGap) > 0.05) return bGap - aGap;

                const availA = type === 'VD' ? a.avail.VD.TL : a.avail.VDC.TL;
                const availB = type === 'VD' ? b.avail.VD.TL : b.avail.VDC.TL;
                return availB - availA;
            });

            if (candidates.length > 0) {
                const r = candidates[0];
                if (type === 'VD') r.allocVD++; else r.allocVDC++;
                updateRowScore(r);
            }
        }

        // --- 5. STEP 2: DISTRIBUTE MULTIPLE CHOICE (TN) ---
        // Pha 2A: Phân bổ tổng số câu TN (allocTN) cho từng bài theo đúng tỷ lệ targetScore (Largest Gap / Quota Method),
        // đảm bảo bài đã kiểm tra <= 35% và mọi bài học đều nhận đúng tỷ lệ phần trăm điểm mục tiêu.
        rows.forEach((r: any) => {
            r.allocTN = 0;
            r.tnTargetScore = Math.max(0, r.targetScore - r.currentScore);
            r.tnTargetQuestions = r.tnTargetScore / SCORE_TN;
            r.canTakeNB = Boolean(r.hasNBSpec || r.currHasNB);
            r.canTakeTH = Boolean(r.hasTHSpec || r.currHasTH);
        });

        const totalTargetTN = targetNB_TN + targetTH_TN;
        let allocatedTN = 0;
        let safetyLoop = 0;
        while (allocatedTN < totalTargetTN && safetyLoop < 5000) {
            safetyLoop++;

            // Tính tổng điểm hiện tại của cụm bài học đã kiểm tra (không được vượt quá LIMIT_OLD_SCORE = 3.5đ = 35%)
            const currentTotalOldScore = rows.reduce((sum: number, r: any) => {
                if (r.isOldLesson) return sum + r.currentScore;
                if (r.soTietExamined > 0 && r.soTiet > 0) {
                    return sum + r.currentScore * (r.soTietExamined / r.soTiet);
                }
                return sum;
            }, 0);

            // Tổng số câu TN đã cấp cho nhóm bài chỉ có thể nhận TH (!canTakeNB) hoặc chỉ có thể nhận NB (!canTakeTH)
            const currentTHOnlyTN = rows.reduce(
                (sum: number, r: any) => sum + (!r.canTakeNB && r.canTakeTH ? (r.allocTN || 0) : 0),
                0
            );
            const currentNBOnlyTN = rows.reduce(
                (sum: number, r: any) => sum + (r.canTakeNB && !r.canTakeTH ? (r.allocTN || 0) : 0),
                0
            );

            // Chọn bài đang thiếu hụt nhiều nhất so với targetScore và đảm bảo:
            // 1. Bài học phải có YCCĐ mức Biết hoặc Hiểu (canTakeNB || canTakeTH)
            // 2. Tổng điểm bài đã KT <= 35%
            // 3. Nhóm bài không có NB (!canTakeNB) không vượt quá targetTH_TN; nhóm bài không có TH (!canTakeTH) không vượt quá targetNB_TN
            let rowCandidates = rows.filter((r: any) => {
                if (r.soTiet <= 0) return false;
                if (!r.canTakeNB && !r.canTakeTH) return false;
                if (!r.canTakeNB && currentTHOnlyTN >= targetTH_TN) return false;
                if (!r.canTakeTH && currentNBOnlyTN >= targetNB_TN) return false;
                if (hasExaminedReduction && r.soTietExamined > 0) {
                    const addedOldScore = r.isOldLesson ? SCORE_TN : SCORE_TN * (r.soTietExamined / r.soTiet);
                    if (currentTotalOldScore + addedOldScore > LIMIT_OLD_SCORE + 1e-6) return false;
                }
                return true;
            });
            if (rowCandidates.length === 0) {
                rowCandidates = rows.filter((r: any) => {
                    if (r.soTiet <= 0) return false;
                    if (!r.canTakeNB && !r.canTakeTH) return false;
                    if (hasExaminedReduction && r.soTietExamined > 0) {
                        const addedOldScore = r.isOldLesson ? SCORE_TN : SCORE_TN * (r.soTietExamined / r.soTiet);
                        if (currentTotalOldScore + addedOldScore > LIMIT_OLD_SCORE + 1e-6) return false;
                    }
                    return true;
                });
            }
            if (rowCandidates.length === 0) {
                rowCandidates = rows.filter((r: any) => r.soTiet > 0 && (r.canTakeNB || r.canTakeTH));
            }
            if (rowCandidates.length === 0) {
                rowCandidates = rows.filter((r: any) => r.soTiet > 0);
            }
            if (rowCandidates.length === 0) break;

            rowCandidates.sort((a: any, b: any) => {
                const aGap = a.targetScore - a.currentScore;
                const bGap = b.targetScore - b.currentScore;
                if (Math.abs(aGap - bGap) > 0.01) return bGap - aGap;

                // Nếu cùng độ lệch điểm, ưu tiên bài có ít câu hơn để chia đều tuyệt đối
                const aTotal = (a.allocTN || 0) + a.allocVD + a.allocVDC;
                const bTotal = (b.allocTN || 0) + b.allocVD + b.allocVDC;
                if (aTotal !== bTotal) return aTotal - bTotal;

                return a.idx - b.idx;
            });

            const best = rowCandidates[0];
            best.allocTN = (best.allocTN || 0) + 1;
            allocatedTN++;
            best.currentScore = best.allocTN * SCORE_TN + (best.allocVD + best.allocVDC) * SCORE_TL;
        }

        // Đảm bảo tính khả thi toán học cho tỷ lệ 4-3-3 (targetNB_TN : targetTH_TN) trước khi bước vào Pha 2B:
        // 1. Nếu bài học nhận allocTN > 0 nhưng kho câu hỏi chỉ có Tự luận (!hasNBSpec && !hasTHSpec), mở mức YCCĐ theo chương trình (currHasNB / currHasTH)
        rows.forEach((r: any) => {
            if ((r.allocTN || 0) > 0 && !r.hasNBSpec && !r.hasTHSpec) {
                r.hasNBSpec = Boolean(r.currHasNB);
                r.hasTHSpec = Boolean(r.currHasTH);
            }
        });

        // 2. Nếu tổng dung lượng câu TN của các bài có hasNBSpec < targetNB_TN (ví dụ Bài 5, Bài 6 chưa có câu NB trong file JSON cũ),
        //    mở thêm mức Nhận biết cho các bài có YCCĐ Nhận biết hợp lệ trong chương trình (currHasNB === true, tuyệt đối không mở cho Bài 3, Bài 4 không có NB)
        const currentNBCapacity = rows.reduce((sum: number, r: any) => sum + (r.hasNBSpec ? (r.allocTN || 0) : 0), 0);
        if (currentNBCapacity < targetNB_TN) {
            rows.forEach((r: any) => {
                if ((r.allocTN || 0) > 0 && !r.hasNBSpec && r.currHasNB) {
                    r.hasNBSpec = true;
                }
            });
        }

        // 3. Tương tự, nếu tổng dung lượng câu TN của các bài có hasTHSpec < targetTH_TN,
        //    mở thêm mức Thông hiểu cho các bài có YCCĐ Thông hiểu hợp lệ trong chương trình (currHasTH === true)
        const currentTHCapacity = rows.reduce((sum: number, r: any) => sum + (r.hasTHSpec ? (r.allocTN || 0) : 0), 0);
        if (currentTHCapacity < targetTH_TN) {
            rows.forEach((r: any) => {
                if ((r.allocTN || 0) > 0 && !r.hasTHSpec && r.currHasTH) {
                    r.hasTHSpec = true;
                }
            });
        }

        // Pha 2B: Tách số câu TN của từng bài (r.allocTN) thành mức Biết (allocNB) và Hiểu (allocTH)
        // sao cho:
        // 1. Bài không có YCCĐ mức Biết (!hasNBSpec) TUYỆT ĐỐI KHÔNG nhận câu Biết (allocNB = 0)
        // 2. Bài không có YCCĐ mức Hiểu (!hasTHSpec) TUYỆT ĐỐI KHÔNG nhận câu Hiểu (allocTH = 0)
        // 3. Bài có cả YCCĐ mức Biết và Thông hiểu (hasNBSpec && hasTHSpec) và có từ 2 câu TN trở lên
        //    LUÔN được chọn cả mức Biết (allocNB >= 1) VÀ mức Thông hiểu (allocTH >= 1)
        // 4. Tổng toàn đề đạt chính xác tuyệt đối tỷ lệ targetNB_TN : targetTH_TN (4-3-3 => 16 NB : 12 TH)
        let remNB = targetNB_TN;
        let remTH = targetTH_TN;

        rows.forEach((r: any) => {
            r.allocNB = 0;
            r.allocTH = 0;
            r.remRowTN = r.allocTN || 0;
        });

        // Bước 2B.1: Bài chỉ có mức Nhận biết (hasNBSpec && !hasTHSpec) bắt buộc nhận 100% câu NB
        rows.forEach((r: any) => {
            if (r.remRowTN > 0 && r.hasNBSpec && !r.hasTHSpec) {
                const take = remNB > 0 ? Math.min(r.remRowTN, remNB) : r.remRowTN;
                r.allocNB += take;
                r.remRowTN -= take;
                remNB = Math.max(0, remNB - take);
            }
        });

        // Bước 2B.2: Bài chỉ có mức Thông hiểu (hasTHSpec && !hasNBSpec, ví dụ Bài 3, Bài 4 Tin 8)
        // bắt buộc nhận 100% câu TH — tuyệt đối không cấp câu NB vào bài không có YCCĐ Nhận biết!
        rows.forEach((r: any) => {
            if (r.remRowTN > 0 && r.hasTHSpec && !r.hasNBSpec) {
                const take = remTH > 0 ? Math.min(r.remRowTN, remTH) : r.remRowTN;
                r.allocTH += take;
                r.remRowTN -= take;
                remTH = Math.max(0, remTH - take);
            }
        });

        // Bước 2B.3: Với mọi bài học có CẢ Nhận biết VÀ Thông hiểu (hasNBSpec && hasTHSpec) và có >= 2 câu TN,
        // đảm bảo bài đó luôn nhận ít nhất 1 câu Nhận biết VÀ 1 câu Thông hiểu để cả 2 mức độ đều được chọn trên Bản đặc tả
        rows.forEach((r: any) => {
            if (r.remRowTN >= 2 && r.hasNBSpec && r.hasTHSpec && remNB > 0 && remTH > 0) {
                r.allocNB++;
                r.allocTH++;
                r.remRowTN -= 2;
                remNB--;
                remTH--;
            }
        });

        // Bước 2B.4: Phân bổ phần câu TN còn lại (remRowTN > 0) cho các bài có đủ cả NB và TH
        // sao cho tổng toàn đề khớp tuyệt đối targetNB_TN : targetTH_TN (4-3-3)
        rows.forEach((r: any) => {
            while (r.remRowTN > 0 && (remNB > 0 || remTH > 0)) {
                if (!r.hasNBSpec && r.hasTHSpec) {
                    r.allocTH++;
                    remTH = Math.max(0, remTH - 1);
                } else if (r.hasNBSpec && !r.hasTHSpec) {
                    r.allocNB++;
                    remNB = Math.max(0, remNB - 1);
                } else if (remTH <= 0) {
                    r.allocNB++;
                    remNB--;
                } else if (remNB <= 0) {
                    r.allocTH++;
                    remTH--;
                } else {
                    const desiredNBRatio = remNB / (remNB + remTH);
                    const nextRowTN = r.allocNB + r.allocTH + 1;
                    const ratioIfNB = (r.allocNB + 1) / nextRowTN;
                    const ratioIfTH = r.allocNB / nextRowTN;
                    const diffIfNB = Math.abs(ratioIfNB - desiredNBRatio);
                    const diffIfTH = Math.abs(ratioIfTH - desiredNBRatio);

                    if (Math.abs(diffIfNB - diffIfTH) > 0.01) {
                        if (diffIfNB < diffIfTH) {
                            r.allocNB++;
                            remNB--;
                        } else {
                            r.allocTH++;
                            remTH--;
                        }
                    } else if (remNB >= remTH) {
                        r.allocNB++;
                        remNB--;
                    } else {
                        r.allocTH++;
                        remTH--;
                    }
                }
                r.remRowTN--;
            }
            updateRowScore(r);
        });

        // --- 6. APPLY TO DATA OBJECT (BOTH CLASSIC & NEW 4-PART FORMAT) ---
        if (!data.newFormatRows) data.newFormatRows = {};

        // Track remaining quotas for 4-part split across rows:
        // Standard 10.0pt exam:
        // - Nhiều lựa chọn (mc): 12 câu = 3,0đ (30%) -> 8 Biết + 4 Hiểu (hoặc 6 Biết + 6 Hiểu)
        // - "Đúng – Sai" (tf): 8 lệnh hỏi = 2,0đ (20%) -> 4 Biết + 4 Hiểu (hoặc 16 lệnh hỏi = 4,0đ (40%) -> 8 Biết + 8 Hiểu khi tắt Trả lời ngắn)
        // - Trả lời ngắn (sa): 8 câu = 2,0đ (20%) -> 4 Biết + 4 Hiểu
        // - Tự luận (essay): 3 câu = 3,0đ (30%) -> 3 Vận dụng
        const useShortAnswer = data.newPointsConfig?.useShortAnswer !== false;
        const capMC = 12;
        const capTF = useShortAnswer ? 8 : 16;
        const capSA = useShortAnswer ? 8 : 0;

        let remMC_B = ratioOption === '30-40-30' ? 6 : 8;
        let remTF_B = useShortAnswer
            ? (ratioOption === '30-40-30' ? 3 : 4)
            : (ratioOption === '30-40-30' ? 6 : 8);
        let remSA_B = useShortAnswer ? (ratioOption === '30-40-30' ? 3 : 4) : 0;

        // Điều chỉnh hạn mức Biết (B) của 3 phần TNKQ khớp chính xác với tổng số câu NB thực tế được phân bổ
        const totalAllocatedNB = rows.reduce((s: number, r: any) => s + (r.allocNB || 0), 0);
        let guardAdjust = 0;
        while ((remMC_B + remTF_B + remSA_B) > totalAllocatedNB && guardAdjust < 100) {
            guardAdjust++;
            if (remMC_B >= remTF_B && remMC_B >= remSA_B && remMC_B > 0) remMC_B--;
            else if (remTF_B >= remSA_B && remTF_B > 0) remTF_B--;
            else if (remSA_B > 0) remSA_B--;
            else break;
        }
        while ((remMC_B + remTF_B + remSA_B) < totalAllocatedNB && guardAdjust < 200) {
            guardAdjust++;
            if ((capMC - remMC_B) >= (capTF - remTF_B) && (capMC - remMC_B) >= (capSA - remSA_B) && remMC_B < capMC) remMC_B++;
            else if ((capTF - remTF_B) >= (capSA - remSA_B) && remTF_B < capTF) remTF_B++;
            else if (remSA_B < capSA) remSA_B++;
            else break;
        }

        let remMC_H = Math.max(0, capMC - remMC_B);
        let remTF_H = Math.max(0, capTF - remTF_B);
        let remSA_H = Math.max(0, capSA - remSA_B);

        rows.forEach((r: any) => {
            const idx = r.idx;
            const totalRowVD = (r.allocVD || 0) + (r.allocVDC || 0);
            data.specifications.rows[idx][5] = `${r.allocNB}-0`;      
            data.specifications.rows[idx][6] = `${r.allocTH}-0`;      
            data.specifications.rows[idx][7] = `0-${totalRowVD}`; 
            data.specifications.rows[idx][8] = `0-0`;

            const mRow = data.matrix.rows[idx];
            mRow[5] = r.allocNB > 0 ? r.allocNB.toString() : ''; mRow[6] = '';
            mRow[7] = r.allocTH > 0 ? r.allocTH.toString() : ''; mRow[8] = '';
            mRow[9] = '';                                        mRow[10] = totalRowVD > 0 ? totalRowVD.toString() : '';
            mRow[11] = '';                                       mRow[12] = '';

            const pts = r.currentScore;
            mRow[13] = (pts / TOTAL_SCORE * 100).toFixed(1);

            // Populate new 4-part structure (Nhiều lựa chọn, Đúng-Sai, Trả lời ngắn, Tự luận + NLa-NLe)
            const defaultNL = getDefaultCompetencyForTopic(String(mRow[1] || ''), String(mRow[2] || ''));
            const rowCfg = createEmptyNewFormatRow(defaultNL);

            let nbLeft = r.allocNB;
            while (nbLeft > 0) {
                if (remMC_B >= remTF_B && remMC_B >= remSA_B && remMC_B > 0) {
                    rowCfg.mc.B.count++; remMC_B--;
                } else if (remTF_B >= remSA_B && remTF_B > 0) {
                    rowCfg.tf.B.count++; remTF_B--;
                } else if (remSA_B > 0) {
                    rowCfg.sa.B.count++; remSA_B--;
                } else {
                    rowCfg.mc.B.count++;
                }
                nbLeft--;
            }

            let thLeft = r.allocTH;
            while (thLeft > 0) {
                if (remMC_H >= remTF_H && remMC_H >= remSA_H && remMC_H > 0) {
                    rowCfg.mc.H.count++; remMC_H--;
                } else if (remTF_H >= remSA_H && remTF_H > 0) {
                    rowCfg.tf.H.count++; remTF_H--;
                } else if (remSA_H > 0) {
                    rowCfg.sa.H.count++; remSA_H--;
                } else {
                    rowCfg.mc.H.count++;
                }
                thLeft--;
            }

            rowCfg.essay.VD.count = totalRowVD;
            data.newFormatRows[idx] = rowCfg;

            // Tự động đồng bộ cột Yêu cầu cần đạt trên Bản đặc tả:
            // Đảm bảo mọi mức độ được phân bổ câu hỏi (quota > 0) đều có đầy đủ YCCĐ từ kho câu hỏi hoặc chương trình học của bài đó
            let rawReqHtml = String(data.specifications.rows[idx]?.[4] || '');
            const quotaByLevel: Record<'B' | 'H' | 'VD', number> = {
                B: r.allocNB || 0,
                H: r.allocTH || 0,
                VD: totalRowVD
            };

            const currentSecs = parseYccdSections(rawReqHtml);
            const currSecs = parseYccdSections(r.baseCurriculumHtml || '');
            const mapSecToQuotaKey = (secTitle: string): 'B' | 'H' | 'VD' => {
                const code = getLevelCodeFromTitle(secTitle);
                if (code === 'NB') return 'B';
                if (code === 'TH') return 'H';
                return 'VD';
            };

            const finalSecs = (['B', 'H', 'VD'] as const).flatMap(qKey => {
                const existingInCurrent = currentSecs.filter(s => mapSecToQuotaKey(s.levelTitle) === qKey && s.items.length > 0);
                if (existingInCurrent.length > 0) {
                    return existingInCurrent;
                }
                if (quotaByLevel[qKey] > 0) {
                    return currSecs.filter(s => mapSecToQuotaKey(s.levelTitle) === qKey && s.items.length > 0);
                }
                return [];
            });

            if (finalSecs.length > 0) {
                rawReqHtml = serializeYccdSections(finalSecs);
            }

            if (rawReqHtml) {
                const keptByLevel: Record<'B' | 'H' | 'VD', number> = { B: 0, H: 0, VD: 0 };

                const updatedReqHtml = rawReqHtml.replace(
                    /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi,
                    (_fullMatch, rawTitle, bodyHtml) => {
                        const lower = String(rawTitle || '').replace(/<[^>]*>/g, '').trim().toLowerCase();
                        let lvlKey: 'B' | 'H' | 'VD' = 'VD';
                        if (lower.startsWith('nhận biết') || lower.startsWith('biết') || lower.startsWith('- biết')) {
                            lvlKey = 'B';
                        } else if (lower.startsWith('thông hiểu') || lower.startsWith('hiểu') || lower.startsWith('- hiểu')) {
                            lvlKey = 'H';
                        } else {
                            lvlKey = 'VD';
                        }
                        const lvlQuota = quotaByLevel[lvlKey];
                        const updatedBody = String(bodyHtml).replace(
                            /<div([^>]*)>([\s\S]*?)<\/div>/gi,
                            (_divMatch, _attrs, innerTxt) => {
                                keptByLevel[lvlKey]++;
                                const isSelected = lvlQuota > 0 && keptByLevel[lvlKey] <= lvlQuota;
                                return `<div class="pl-2"${isSelected ? '' : ' data-unchecked="true"'}>${innerTxt}</div>`;
                            }
                        );
                        return `<strong class="block font-semibold">${rawTitle}</strong>${updatedBody}`;
                    }
                );
                data.specifications.rows[idx][4] = updatedReqHtml;
            }
        });

        setFileSystem(root);
        
        const finalTLCount = rows.reduce((s: number, r: any) => s + r.allocVD + r.allocVDC, 0);
        const finalNB = rows.reduce((s: number, r: any) => s + r.allocNB, 0);
        const finalTH = rows.reduce((s: number, r: any) => s + r.allocTH, 0);
        
        showToast(`Đã phân bổ ${isFinalExam ? '(Cuối kỳ)' : '(Giữa kỳ)'}. Biết: ${finalNB} - Hiểu: ${finalTH} - Vận dụng: ${finalTLCount}.`);
    };

    // ... (rest of the file remains same: handleNavigate, handleBreadcrumbClick, etc.)

    const handleNavigate = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSelectedItems([]);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setCurrentPath([]);
        } else {
            setCurrentPath(currentPath.slice(0, index + 1));
        }
        setSelectedItems([]);
    };

    const handleCreateFolder = () => {
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir) return;

        let folderName = '';
        if (folderModalMode === 'create') {
            if (currentPath.length === 0) {
                // Logic update: Use dropdown value, or text input if "Khác"
                const desc = gradeDescType === 'Khác' ? gradeDescValue : gradeDescType;
                
                if (!gradeSelectValue || !desc) {
                    showToast('Vui lòng nhập đầy đủ thông tin', 'error');
                    return;
                }
                folderName = `${gradeSelectValue} - ${desc}`;
            } else if (currentPath.length === 1) {
                folderName = selectedTopicValue;
            } else {
                folderName = modalInputValue;
            }
        } else {
            folderName = modalInputValue;
        }

        if (!folderName) { showToast('Tên không được để trống', 'error'); return; }
        
        // Rename Logic
        if (folderModalMode === 'rename') {
             const item = currentDir.children?.find(c => c.name === selectedItems[0]);
             if (item) item.name = folderName;
        } else {
            // Create Logic
            if (currentDir.children?.some(c => c.name === folderName)) {
                showToast('Tên đã tồn tại', 'error'); return;
            }
            if (!currentDir.children) currentDir.children = [];
            const newFolderNode: FileSystemItem = { name: folderName, type: 'folder', children: [] };
            if (currentPath.length === 0) {
                newFolderNode.matrixData = {
                    matrix: { headers: [], rows: [] },
                    specifications: { headers: [], rows: [] },
                    matrixFormat: newFolderFormat,
                    newPointsConfig: { mc: 3.0, tf: 2.0, sa: 2.0, essay: 3.0 },
                    newFormatRows: {}
                };
                regenerateMatrix(newFolderNode);
            }
            currentDir.children.push(newFolderNode);
        }

        if (currentPath.length === 1 || (currentPath.length === 0 && folderModalMode === 'rename')) {
             const gradeDir = currentPath.length === 1 ? currentDir : findDirectory([folderName], root); 
             if (currentPath.length === 1 && gradeDir) regenerateMatrix(gradeDir);
             if (gradeDir && currentPath.length === 0) regenerateMatrix(gradeDir);
        }

        setFileSystem(root);
        setShowFolderModal(false);
        setModalInputValue('');
        setGradeDescValue('');
        setGradeDescType('Giữa kì I');
        setSelectedTopicValue('');
    };

    const handleBulkApply = () => {
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir) return;
        const gradeName = currentDir.name.match(/Lớp \d+/)?.[0];
        if (!gradeName) return;

        const allGroups = predefinedFoldersByGrade[gradeName];
        if (!currentDir.children) currentDir.children = [];
        
        let changed = false;

        allGroups.forEach(group => {
            const shouldBePresent = tempSelectedGroups.includes(group.group);
            if (shouldBePresent) {
                // Ensure all items exist
                group.items.forEach(item => {
                    if (!currentDir.children!.some((c: any) => c.name === item)) {
                        currentDir.children!.push({ name: item, type: 'folder', children: [] });
                        changed = true;
                    }
                });
            } else {
                // Ensure all items are removed if they exist
                const originalLength = currentDir.children!.length;
                currentDir.children = currentDir.children!.filter((c: any) => !group.items.includes(c.name));
                if (currentDir.children.length !== originalLength) changed = true;
            }
        });

        regenerateMatrix(currentDir);
        setFileSystem(root);
        if (changed) showToast("Đã cập nhật cấu trúc đề thi thành công!");
        else showToast("Cấu trúc không thay đổi.");
    };

    const toggleTempGroup = (groupName: string) => {
        setTempSelectedGroups(prev => 
            prev.includes(groupName) 
                ? prev.filter(g => g !== groupName) 
                : [...prev, groupName]
        );
    };

    const handleDelete = () => {
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir || !currentDir.children) return;

        currentDir.children = currentDir.children.filter(c => !selectedItems.includes(c.name));
        
        // Regenerate if inside Grade or Topic
        if (currentPath.length === 1) {
            regenerateMatrix(currentDir);
        } else if (currentPath.length > 1) {
             const gradeDir = findDirectory([currentPath[0]], root);
             if (gradeDir) regenerateMatrix(gradeDir);
        }

        setFileSystem(root);
        setSelectedItems([]);
        setShowConfirmModal(false);
    };

    const handleCopy = () => {
        const currentDir = getCurrentDirectory();
        if (!currentDir || !currentDir.children) return;
        const items = currentDir.children.filter(c => selectedItems.includes(c.name));
        setClipboard(JSON.parse(JSON.stringify(items)));
        showToast(`Đã sao chép ${items.length} mục`);
        setSelectedItems([]);
    };

    const handlePaste = () => {
        if (!clipboard) return;
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir) return;
        if (!currentDir.children) currentDir.children = [];

        clipboard.forEach(item => {
            let newName = item.name;
            let counter = 1;
            while (currentDir.children!.some(c => c.name === newName)) {
                newName = `${item.name.replace(/\.[^/.]+$/, "")} - Copy (${counter})${item.name.includes('.') ? item.name.substring(item.name.lastIndexOf('.')) : ''}`;
                counter++;
            }
            const newItem = { ...item, name: newName };
            currentDir.children!.push(newItem);
        });

        // Regenerate logic
        if (currentPath.length === 1) regenerateMatrix(currentDir);
        else if (currentPath.length > 1) {
             const gradeDir = findDirectory([currentPath[0]], root);
             if (gradeDir) regenerateMatrix(gradeDir);
        }

        setFileSystem(root);
        setClipboard(null);
        showToast('Đã dán thành công');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files: File[] = Array.from(e.target.files);
        const root = JSON.parse(JSON.stringify(fileSystem));
        const currentDir = findDirectory(currentPath, root);
        if (!currentDir) return;
        if (!currentDir.children) currentDir.children = [];

        Promise.all(files.map(file => new Promise<{name: string, content: any, removedCount: number}>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const json = JSON.parse(evt.target?.result as string);
                    
                    // Validate JSON Structure (Check both Old and New formats)
                    const isOldFormat = json.thongTinChung && (json.tracNghiem || json.tuLuan);
                    const isNewFormat = json.info && json.questions;
                    
                    if (!isOldFormat && !isNewFormat) {
                        throw new Error("Invalid format");
                    }
                    const gradeFromPath = currentPath[0]?.match(/\d+/)?.[0] || '';
                    const fGrade = String(json.info?.grade || json.thongTinChung?.khoi || gradeFromPath || '');
                    const fLesson = String(json.info?.lesson || json.thongTinChung?.bai || file.name.replace(/\.json$/i, '') || '');
                    let removedCount = 0;
                    if (Array.isArray(json.questions)) {
                        const filtered = filterQuestionsByActiveCriteria(json.questions, fGrade, fLesson);
                        json.questions = filtered.valid;
                        removedCount += filtered.removedCount;
                    }
                    if (Array.isArray(json.tracNghiem)) {
                        const filtered = filterQuestionsByActiveCriteria(json.tracNghiem, fGrade, fLesson);
                        json.tracNghiem = filtered.valid;
                        removedCount += filtered.removedCount;
                    }
                    if (Array.isArray(json.tuLuan)) {
                        const filtered = filterQuestionsByActiveCriteria(json.tuLuan, fGrade, fLesson);
                        json.tuLuan = filtered.valid;
                        removedCount += filtered.removedCount;
                    }
                    resolve({ name: file.name, content: json, removedCount });
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        }))).then(results => {
            let totalRemoved = 0;
            results.forEach(res => {
                totalRemoved += res.removedCount || 0;
                const existing = currentDir.children!.find(c => c.name === res.name);
                if (existing) existing.content = res.content;
                else currentDir.children!.push({ name: res.name, type: 'file', content: res.content });
            });

             // Update Matrix from Grade root
             if (currentPath.length >= 2) {
                 const gradeDir = findDirectory([currentPath[0]], root);
                 if (gradeDir) regenerateMatrix(gradeDir);
             }

            setFileSystem(root);
            const skipMsg = totalRemoved > 0 ? ` (Đã chặn ${totalRemoved} câu không có YCCĐ hợp lệ trong bài học)` : '';
            showToast(`Đã tải lên ${results.length} tệp${skipMsg}`);
        }).catch(() => showToast('Lỗi khi đọc tệp JSON (Sai định dạng)', 'error'));
        
        e.target.value = '';
    };

    const handleSyncFromQuestionBank = () => {
        if (currentPath.length === 0) return;
        const root = JSON.parse(JSON.stringify(fileSystem));
        const gradeDir = findDirectory([currentPath[0]], root);
        if (!gradeDir) return;

        const gradeMatch = gradeDir.name.match(/\d+/);
        if (!gradeMatch) {
            showToast('Không xác định được khối lớp từ tên thư mục.', 'error');
            return;
        }
        const gradeNum = gradeMatch[0];
        const gradeKey = `Lớp ${gradeNum}`;
        const topicsForGrade = predefinedFoldersByGrade[gradeKey] || [];

        const customStore = loadCustomCriteriaStore();
        const bankRes = loadQuestionBank();
        const rawGradeQuestions = (bankRes.data || []).filter(q => String(q.grade) === gradeNum && q.lesson);
        const { valid: gradeQuestions } = filterQuestionsByActiveCriteria(rawGradeQuestions, gradeNum, undefined, customStore);

        if (gradeQuestions.length === 0) {
            showToast(`Chưa có câu hỏi nào thuộc Khối ${gradeNum} trong Ngân hàng câu hỏi nội bộ.`, 'error');
            return;
        }

        // Group questions by lesson
        const byLesson: Record<string, ExerciseQuestion[]> = {};
        gradeQuestions.forEach(q => {
            const lessonName = (q.lesson || '').trim();
            if (!lessonName) return;
            if (!byLesson[lessonName]) byLesson[lessonName] = [];
            byLesson[lessonName].push(q);
        });

        if (!gradeDir.children) gradeDir.children = [];

        let syncedLessonCount = 0;

        Object.entries(byLesson).forEach(([lessonName, qs]) => {
            // Find matching subTopicName for this lesson
            let targetSubTopic = '';

            // 1. Check question curriculum requirementId
            const firstWithReq = qs.find(q => q.curriculum?.requirementId);
            if (firstWithReq?.curriculum?.requirementId) {
                const req = CANONICAL_REQUIREMENTS.find(r => r.id === firstWithReq.curriculum?.requirementId);
                if (req?.subTopicName) targetSubTopic = req.subTopicName;
            }

            // 2. Check KNTT_LESSON_MAPPINGS
            if (!targetSubTopic) {
                const lessonNumMatch = lessonName.match(/Bài\s*\d+[ab]?/i)?.[0];
                const mapping = KNTT_LESSON_MAPPINGS.find(m =>
                    m.grade === Number(gradeNum) &&
                    (m.lessonTitle === lessonName || (lessonNumMatch && m.lessonNumber.toLowerCase() === lessonNumMatch.toLowerCase()))
                );
                if (mapping && mapping.requirementIds.length > 0) {
                    const req = CANONICAL_REQUIREMENTS.find(r => r.id === mapping.requirementIds[0]);
                    if (req?.subTopicName) targetSubTopic = req.subTopicName;
                }
            }

            // 3. Fallback to first available subtopic in predefinedFoldersByGrade
            if (!targetSubTopic && topicsForGrade.length > 0 && topicsForGrade[0].items.length > 0) {
                targetSubTopic = topicsForGrade[0].items[0];
            }

            if (!targetSubTopic) return;

            let subTopicFolder = gradeDir.children!.find((c: FileSystemItem) => c.type === 'folder' && c.name === targetSubTopic);
            if (!subTopicFolder) {
                subTopicFolder = { name: targetSubTopic, type: 'folder', children: [] };
                gradeDir.children!.push(subTopicFolder);
            }
            if (!subTopicFolder.children) subTopicFolder.children = [];

            const fileName = `${lessonName}.json`;
            const filePayload = {
                info: { grade: gradeNum, lesson: lessonName, soTiet: 2 },
                questions: qs
            };

            const existingFile = subTopicFolder.children.find((f: FileSystemItem) => f.type === 'file' && (f.name === fileName || f.content?.info?.lesson === lessonName));
            if (existingFile) {
                existingFile.content = filePayload;
            } else {
                subTopicFolder.children.push({
                    name: fileName,
                    type: 'file',
                    content: filePayload
                });
            }
            syncedLessonCount++;
        });

        regenerateMatrix(gradeDir, customStore);
        setFileSystem(root);
        showToast(`Đã đồng bộ ${gradeQuestions.length} câu hỏi (${syncedLessonCount} bài học) Khối ${gradeNum} từ Ngân hàng!`);
    };

    const handlePrint = () => {
        const currentDir = getCurrentDirectory();
        if (currentDir?.matrixData) {
            const html = generatePrintHTML(currentDir.matrixData, currentDir.name);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = `MaTran_${currentDir.name.replace(/\s+/g, '_')}.doc`; 
            document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        }
    };

    const handleExportJSON = () => {
        const currentDir = getCurrentDirectory();
        if (!currentDir || !currentDir.matrixData) return;

        const { rows: matrixRows } = currentDir.matrixData.matrix;
        const { rows: specRows } = currentDir.matrixData.specifications;

        const useSA = currentDir.matrixData.newPointsConfig?.useShortAnswer !== false;
        const exportData: ImportedMatrixData = {
            thongTinChung: { 
                tenDe: currentDir.name, 
                ngayTao: new Date().toISOString(),
                matrixFormat: currentDir.matrixData.matrixFormat || 'classic',
                useShortAnswer: useSA
            },
            chiTiet: matrixRows.map((row, idx) => {
                const specRow = specRows[idx];
                const newCfg = currentDir.matrixData?.newFormatRows?.[idx];
                const defaultNL = getDefaultCompetencyForTopic(String(row[1] || ''), String(row[2] || ''));
                return {
                    thongTinChung: {
                        stt: row[0],
                        chuong: row[1],
                        noiDung: row[2],
                        bai: row[3] || row[2],
                        soTiet: parseFloat(row[4]) || 0,
                        daThi: (parseFloat(row[14]) || 0) > 0,
                        soTietDaThi: parseFloat(row[14]) || 0
                    },
                    yeuCauCanDat: specRow ? specRow[4] : '',
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
                    ...(newCfg ? {
                        chiTiet4Phan: {
                            nhieuLuaChon: { B: newCfg.mc.B.count, H: newCfg.mc.H.count, VD: newCfg.mc.VD.count, NL: newCfg.mc.B.competency || defaultNL },
                            dungSai: {
                                B: useSA ? newCfg.tf.B.count : (newCfg.tf.B.count + newCfg.sa.B.count),
                                H: useSA ? newCfg.tf.H.count : (newCfg.tf.H.count + newCfg.sa.H.count),
                                VD: useSA ? newCfg.tf.VD.count : (newCfg.tf.VD.count + newCfg.sa.VD.count),
                                NL: newCfg.tf.B.competency || defaultNL
                            },
                            traLoiNgan: {
                                B: useSA ? newCfg.sa.B.count : 0,
                                H: useSA ? newCfg.sa.H.count : 0,
                                VD: useSA ? newCfg.sa.VD.count : 0,
                                NL: newCfg.sa.B.competency || defaultNL
                            },
                            tuLuan: { B: newCfg.essay.B.count, H: newCfg.essay.H.count, VD: newCfg.essay.VD.count, NL: newCfg.essay.VD.competency || defaultNL }
                        }
                    } : {}),
                    tiLeDiem: parseFloat(row[13]) || 0
                };
            })
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MaTran_${currentDir.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Render Logic ---
    const currentDirectory = getCurrentDirectory() || fileSystem;
    const availableTopics = predefinedFoldersByGrade[currentPath.length > 0 ? `Lớp ${currentPath[0].match(/\d+/)?.[0]}` : ''] || [];
    
    // Logic for Quick Topic Select inside Exam Folder
    const isExamFolder = currentPath.length === 1 && !currentDirectory.matrixData;
    const currentGradeStr = isExamFolder ? (currentDirectory.name.match(/Lớp \d+/)?.[0]) : null;
    const gradeTopics = currentGradeStr ? predefinedFoldersByGrade[currentGradeStr] : null;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl min-h-screen">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="text-indigo-600" />
                    Trình quản lý ma trận đề
                </h1>
                <div className="flex items-center gap-2 sm:gap-3">
                    {clipboard && (
                        <button onClick={handlePaste} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-all">
                            <Clipboard size={20} /> Dán
                        </button>
                    )}
                    {currentPath.length >= 1 && (
                        <button
                            onClick={handleSyncFromQuestionBank}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-all text-sm"
                            title="Tự động nạp danh sách bài học và số câu hỏi từ Ngân hàng câu hỏi nội bộ vào Ma trận này"
                        >
                            <Database size={18} />
                            Đồng bộ từ Ngân hàng câu hỏi
                        </button>
                    )}
                    {currentPath.length >= 2 && (
                         <label className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm cursor-pointer flex items-center gap-2 transition-all text-sm">
                             <Upload size={18} />
                             Tải file JSON lẻ
                             <input type="file" className="hidden" accept=".json" multiple onChange={handleFileUpload} />
                         </label>
                    )}
                </div>
            </header>

            <nav className="bg-white p-3 rounded-lg shadow-sm mb-6 flex items-center gap-2 text-sm">
                <button onClick={() => handleBreadcrumbClick(-1)} className="hover:text-indigo-600 font-medium">Thư mục gốc</button>
                {currentPath.map((segment, idx) => (
                    <React.Fragment key={idx}>
                        <ChevronRight size={16} className="text-slate-400" />
                        {idx === currentPath.length - 1 ? (
                            <span className="font-bold text-slate-800">{segment}</span>
                        ) : (
                            <button onClick={() => handleBreadcrumbClick(idx)} className="hover:text-indigo-600">{segment}</button>
                        )}
                    </React.Fragment>
                ))}
            </nav>

            {selectedItems.length > 0 && (
                <div className="flex flex-wrap justify-between items-center gap-4 bg-sky-100 p-3 rounded-lg shadow-sm mb-6 border border-sky-200">
                    <span className="font-semibold text-sky-800">{selectedItems.length} mục đã chọn</span>
                    <div className="flex items-center gap-3">
                        {selectedItems.length === 1 && (
                            <button onClick={() => { setModalInputValue(selectedItems[0]); setFolderModalMode('rename'); setShowFolderModal(true); }} className="flex items-center gap-2 bg-white text-slate-700 py-2 px-4 rounded-lg border hover:bg-slate-50">
                                <FileEdit size={16} /> Sửa tên
                            </button>
                        )}
                        <button onClick={handleCopy} className="flex items-center gap-2 bg-white text-slate-700 py-2 px-4 rounded-lg border hover:bg-slate-50">
                            <Copy size={16} /> Sao chép
                        </button>
                        <button onClick={() => setShowConfirmModal(true)} className="flex items-center gap-2 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600">
                            <Trash2 size={16} /> Xóa
                        </button>
                    </div>
                </div>
            )}

            {!currentDirectory.matrixData ? (
                <>
                    {/* NEW: Quick Topic Selector for Exam Folders */}
                    {isExamFolder && gradeTopics && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 mb-6">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <FolderPlus size={20} className="text-indigo-600"/>
                                    <h3 className="font-bold text-gray-800">Cấu trúc đề thi (Chọn chủ đề)</h3>
                                </div>
                                <button 
                                    onClick={handleBulkApply} 
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold shadow-md transition-all"
                                >
                                    <Save size={16}/> Tạo / Cập nhật cấu trúc
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {gradeTopics.map((group, idx) => {
                                    const isChecked = tempSelectedGroups.includes(group.group);
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`
                                                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${isChecked 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800 ring-1 ring-indigo-200' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-white'}
                                            `}
                                            onClick={() => toggleTempGroup(group.group)}
                                        >
                                            <div className="mt-0.5">
                                                {isChecked ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-gray-400" />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{group.group}</div>
                                                <div className="text-xs opacity-70 mt-1">{group.items.length} bài học</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <FileExplorer 
                        currentPath={currentPath}
                        currentDir={currentDirectory}
                        selectedItems={selectedItems}
                        onSelectItem={(name) => setSelectedItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])}
                        onNavigate={handleNavigate}
                        onCreateClick={() => { setFolderModalMode('create'); setShowFolderModal(true); }}
                        onDragStart={(e, item) => setDraggedItem({ name: item.name, type: item.type, sourcePath: currentPath })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e, targetItem) => {
                            e.preventDefault();
                            if (draggedItem && draggedItem.name !== targetItem.name) {
                                const root = JSON.parse(JSON.stringify(fileSystem));
                                const sourceDir = findDirectory(draggedItem.sourcePath, root);
                                const destDir = findDirectory([...currentPath, targetItem.name], root);
                                if (sourceDir && destDir && sourceDir.children && destDir.children) {
                                    const itemIdx = sourceDir.children.findIndex((c: any) => c.name === draggedItem.name);
                                    if (itemIdx > -1) {
                                        const [moved] = sourceDir.children.splice(itemIdx, 1);
                                        if (!destDir.children.some((c: any) => c.name === moved.name)) {
                                            destDir.children.push(moved);
                                            setFileSystem(root);
                                            showToast(`Đã chuyển ${moved.name} vào ${targetItem.name}`);
                                        } else {
                                            showToast('Tên trùng lặp ở thư mục đích', 'error');
                                        }
                                    }
                                }
                                setDraggedItem(null);
                            }
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        draggedItemInfo={draggedItem}
                    />
                </>
            ) : (
                <div className="space-y-6">
                    <div className="mb-6">
                         <h3 className="text-lg font-bold mb-4 text-slate-800">Thư mục chủ đề</h3>
                         <FileExplorer 
                            currentPath={currentPath}
                            currentDir={currentDirectory}
                            selectedItems={selectedItems}
                            onSelectItem={(name) => setSelectedItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])}
                            onNavigate={handleNavigate}
                            onCreateClick={() => { setFolderModalMode('create'); setShowFolderModal(true); }}
                            onDragStart={() => {}} onDragOver={() => {}} onDrop={() => {}} onDragEnd={() => {}} draggedItemInfo={null}
                        />
                     </div>

                     <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm gap-4">
                        <h2 className="text-xl font-bold text-slate-900">Chi tiết Ma trận</h2>
                        <div className="flex flex-wrap gap-2 items-center">
                             <div className={`flex items-center gap-2 mr-2 bg-gradient-to-r ${isSmartRatioApplied ? 'from-purple-50 to-indigo-50 border-purple-200' : 'from-gray-50 to-white border-gray-200'} px-3 py-1.5 rounded-lg border shadow-sm transition-colors duration-500`}>
                                <div className={`flex items-center gap-1.5 ${isSmartRatioApplied ? 'text-purple-600' : 'text-indigo-600'} font-semibold border-r border-gray-200 pr-2 mr-1`}>
                                    {isSmartRatioApplied ? <Sparkles size={16} className="animate-pulse" /> : <PieChart size={16} />}
                                    <span className="text-sm">Tỷ lệ:</span>
                                </div>
                                <select 
                                    className="border-none bg-transparent text-sm font-bold text-gray-800 focus:ring-0 cursor-pointer outline-none hover:text-indigo-700 transition-colors"
                                    value={ratioOption}
                                    onChange={(e) => setRatioOption(e.target.value as any)}
                                >
                                    <option value="40-30-30">40% NB - 30% TH - 30% VD</option>
                                    <option value="30-40-30">30% NB - 40% TH - 30% VD</option>
                                    <option value="40-30-20-10">40% NB - 30% TH - 20% VD - 10% VDC</option>
                                </select>
                             </div>
                             <button onClick={handleDistribute} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all">
                                <Share2 size={18} /> Phân bổ
                             </button>
                             <div className="h-8 w-[1px] bg-gray-300 mx-1 hidden sm:block"></div>
                             <button onClick={handleExportJSON} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all">
                                <FileJson size={18} /> Xuất JSON
                             </button>
                             <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all">
                                <Printer size={18} /> Tải file Word
                             </button>
                        </div>
                     </div>

                     <div className="bg-white p-6 rounded-xl shadow-md">
                         <MatrixView 
                            data={currentDirectory.matrixData} 
                            examName={currentDirectory.name} // PASS THE EXAM NAME HERE
                            onUpdateMatrix={(newData) => {
                                const root = JSON.parse(JSON.stringify(fileSystem));
                                const cur = findDirectory(currentPath, root);
                                if (cur) { cur.matrixData = newData; setFileSystem(root); }
                            }}
                            onDeleteRow={(idx) => {
                                const root = JSON.parse(JSON.stringify(fileSystem));
                                const cur = findDirectory(currentPath, root);
                                if (cur && cur.matrixData) {
                                    const row = cur.matrixData.matrix.rows[idx];
                                    const subTopic = row[2];
                                    const lesson = row[3];
                                    const subFolder = cur.children?.find((c: any) => c.name === subTopic);
                                    if(subFolder && subFolder.children && lesson) {
                                         const fileIdx = subFolder.children.findIndex((f: any) => 
                                            (f.content?.thongTinChung?.bai === lesson) || (f.name.replace('.json','') === lesson)
                                         );
                                         if (fileIdx > -1) subFolder.children.splice(fileIdx, 1);
                                    }
                                    regenerateMatrix(cur);
                                    setFileSystem(root);
                                }
                            }}
                            onEditPercentage={() => {}}
                         />
                     </div>
                </div>
            )}

            {showFolderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">
                            {folderModalMode === 'create' ? (currentPath.length === 0 ? 'Tạo loại đề mới' : 'Tạo mục mới') : 'Đổi tên'}
                        </h3>
                        {folderModalMode === 'create' && currentPath.length === 0 ? (
                            <div className="space-y-3">
                                <select className="w-full border p-2 rounded" value={gradeSelectValue} onChange={e => setGradeSelectValue(e.target.value)}>
                                    <option value="">-- Chọn khối --</option>
                                    <option value="Lớp 6">Lớp 6</option>
                                    <option value="Lớp 7">Lớp 7</option>
                                    <option value="Lớp 8">Lớp 8</option>
                                    <option value="Lớp 9">Lớp 9</option>
                                </select>
                                
                                <select 
                                    className="w-full border p-2 rounded"
                                    value={gradeDescType}
                                    onChange={(e) => setGradeDescType(e.target.value)}
                                >
                                    <option value="Giữa kì I">Giữa kì I</option>
                                    <option value="Cuối kì I">Cuối kì I</option>
                                    <option value="Giữa kì II">Giữa kì II</option>
                                    <option value="Cuối kì II">Cuối kì II</option>
                                    <option value="Ôn tập">Ôn tập</option>
                                    <option value="Khác">Khác...</option>
                                </select>

                                {gradeDescType === 'Khác' && (
                                    <input 
                                        type="text" 
                                        className="w-full border p-2 rounded" 
                                        placeholder="Nhập tên kỳ thi" 
                                        value={gradeDescValue} 
                                        onChange={e => setGradeDescValue(e.target.value)}
                                        autoFocus
                                    />
                                )}

                                <div className="pt-1">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Cấu trúc Ma trận &amp; Bảng đặc tả:</label>
                                    <select
                                        className="w-full border p-2 rounded text-sm font-medium bg-indigo-50/50 border-indigo-200 text-indigo-950"
                                        value={newFolderFormat}
                                        onChange={(e) => setNewFolderFormat(e.target.value as 'classic' | 'new_4part')}
                                    >
                                        <option value="new_4part">Mẫu mới (Nhiều lựa chọn, Đúng–Sai, Trả lời ngắn, Tự luận + Năng lực NLa–NLe)</option>
                                        <option value="classic">Mẫu chuẩn (TNKQ &amp; Tự luận truyền thống)</option>
                                    </select>
                                </div>
                            </div>
                        ) : folderModalMode === 'create' && currentPath.length === 1 ? (
                             <select className="w-full border p-2 rounded" value={selectedTopicValue} onChange={e => setSelectedTopicValue(e.target.value)}>
                                <option value="">-- Chọn chủ đề --</option>
                                {availableTopics.map((grp: any, idx: number) => (
                                    <optgroup key={idx} label={grp.group}>
                                        {grp.items.map((it: string) => <option key={it} value={it}>{it}</option>)}
                                    </optgroup>
                                ))}
                             </select>
                        ) : (
                            <input 
                                type="text" 
                                className="w-full border p-2 rounded" 
                                placeholder="Nhập tên" 
                                value={modalInputValue} 
                                onChange={e => setModalInputValue(e.target.value)}
                                autoFocus
                            />
                        )}
                        <div className="flex justify-end gap-3 mt-5">
                            <button onClick={() => setShowFolderModal(false)} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded">Hủy</button>
                            <button onClick={handleCreateFolder} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded">
                                {folderModalMode === 'create' ? 'Tạo' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-2">Xác nhận xóa</h3>
                        <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xóa {selectedItems.length} mục đã chọn?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded">Hủy</button>
                            <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Xóa</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed bottom-5 right-5 px-5 py-2 rounded-lg shadow-lg text-white transition-all duration-300 z-50 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                {toast.message}
            </div>
        </div>
    );
};

export default MatrixBuilder;