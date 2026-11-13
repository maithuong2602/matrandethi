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
import { syncSpecHtmlWithCustomStore, CUSTOM_CRITERIA_STORAGE_KEY } from '../services/criteriaService';

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
        const syncTreeWithCustomCriteria = (node: FileSystemItem, currentGrade?: string) => {
            if (!node) return;
            let g = currentGrade;
            const m = node.name?.match(/(?:Lớp|Khối)\s*(\d+)/i) || node.name?.match(/\b([6-9])\b/);
            if (m && ['6', '7', '8', '9'].includes(m[1])) {
                g = m[1];
            }
            if (node.matrixData?.specifications?.rows && Array.isArray(node.matrixData.specifications.rows)) {
                const effGrade = g || '7';
                node.matrixData.specifications.rows.forEach((row: string[], rIdx: number) => {
                    const subTopic = row[2] || node.matrixData?.matrix?.rows?.[rIdx]?.[2] || '';
                    const lessonName = row[3] || node.matrixData?.matrix?.rows?.[rIdx]?.[3] || '';
                    if (row[4]) {
                        row[4] = syncSpecHtmlWithCustomStore(row[4], effGrade, subTopic, lessonName);
                    }
                });
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(c => syncTreeWithCustomCriteria(c, g));
            }
        };

        const reloadFs = () => {
            const saved = localStorage.getItem('matrixFileSystem');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    syncTreeWithCustomCriteria(parsed);
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
                // Mid-term: Just check global VDC
                if (countVDC > 0) recommendedRatio = '40-30-20-10';
                else recommendedRatio = (countNB > countTH) ? '40-30-30' : '30-40-30';
            } else if (isFinal) {
                // Final: Only use 4 levels if NEW content has VDC
                if (countVDC_New > 0) {
                    recommendedRatio = '40-30-20-10';
                } else {
                    // Even if old content has VDC, we shouldn't test VDC again in Final
                    recommendedRatio = (countNB > countTH) ? '40-30-30' : '30-40-30';
                }
            } else {
                // Default fallback
                if (countVDC > 0) recommendedRatio = '40-30-20-10';
                else recommendedRatio = (countNB > countTH) ? '40-30-30' : '30-40-30';
            }

            setRatioOption(recommendedRatio);
            setIsSmartRatioApplied(true);
            setTimeout(() => setIsSmartRatioApplied(false), 3000); 
        }
    }, [currentPath, fileSystem]);

    // --- Helpers ---
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const getCurrentDirectory = () => findDirectory(currentPath);

    // --- Folder/Matrix Logic ---

    const regenerateMatrix = (dir: FileSystemItem) => {
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
                            const requirements = getRequirementsHtml(grade, mainTopic, subTopic, lessonName);
                            
                            // Count available questions
                            const counts = { NB: {TN:0,TL:0}, TH: {TN:0,TL:0}, VD: {TN:0,TL:0}, VDC: {TN:0,TL:0} };
                            
                            // Old format counts
                            (file.content?.tracNghiem || []).forEach((q: any) => {
                                const l = (q.mucDo || 'NB').toUpperCase() as keyof AvailableCounts;
                                if(counts[l]) counts[l].TN++;
                            });
                            (file.content?.tuLuan || []).forEach((q: any) => {
                                const l = (q.mucDo || 'NB').toUpperCase() as keyof AvailableCounts;
                                if(counts[l]) counts[l].TL++;
                            });

                            // New format counts
                            (file.content?.questions || []).forEach((q: any) => {
                                const l = (q.level || 'NB').toUpperCase() as keyof AvailableCounts;
                                const isMC = q.category === 'mc';
                                if(counts[l]) {
                                    if (isMC) counts[l].TN++;
                                    else counts[l].TL++;
                                }
                            });

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
                                const syncedExistingHtml = syncSpecHtmlWithCustomStore(
                                    existingSpec[4] || requirements,
                                    gradeNumberMatch[0],
                                    subTopic,
                                    lessonName
                                );
                                specRows.push([
                                    stt.toString(), mainTopic, subTopic, lessonName, syncedExistingHtml, 
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
                                subTopic
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
        const gradeMatch = currentDir.name.match(/\d+/);
        const gradeNum = gradeMatch ? gradeMatch[0] : '';
        const liveBankRes = loadQuestionBank();
        const liveBankQuestions = (liveBankRes.data || []).filter(q => !gradeNum || !q.grade || String(q.grade) === gradeNum);

        const rows = data.matrix.rows.map((row: any[], idx: number) => {
            const st = parseFloat(row[4] as string) || 0;
            const examined = parseFloat(row[14] as string) || 0;
            const validExamined = Math.min(Math.max(examined, 0), st);
            const validNew = Math.max(st - validExamined, 0);
            const rowLesson = String(row[3] || '').trim();
            const rowSubTopic = String(row[2] || '').trim();

            // Kết hợp số lượng câu có sẵn trong thư mục và trong Ngân hàng câu hỏi nội bộ
            const baseAvail = data.availableCounts?.[idx] || { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } };
            const liveCounts = { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } };
            if (rowLesson || rowSubTopic) {
                const lessonNum = rowLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();
                liveBankQuestions.forEach(q => {
                    const qLesson = (q.lesson || '').trim();
                    const qLessonNum = qLesson.match(/Bài\s*\d+[ab]?/i)?.[0]?.toLowerCase();
                    const isMatch =
                        (rowLesson && (qLesson === rowLesson || (lessonNum && qLessonNum === lessonNum))) ||
                        (!rowLesson && rowSubTopic && qLesson.toLowerCase().includes(rowSubTopic.replace(/^\d+\.\s*/, '').toLowerCase()));
                    if (isMatch) {
                        const lvl = ((q.level || 'NB').toUpperCase()) as 'NB' | 'TH' | 'VD' | 'VDC';
                        if (liveCounts[lvl]) {
                            if (q.category === 'essay') liveCounts[lvl].TL++;
                            else liveCounts[lvl].TN++;
                        }
                    }
                });
            }
            const mergedAvail = {
                NB: { TN: Math.max(baseAvail.NB?.TN || 0, liveCounts.NB.TN), TL: Math.max(baseAvail.NB?.TL || 0, liveCounts.NB.TL) },
                TH: { TN: Math.max(baseAvail.TH?.TN || 0, liveCounts.TH.TN), TL: Math.max(baseAvail.TH?.TL || 0, liveCounts.TH.TL) },
                VD: { TN: Math.max(baseAvail.VD?.TN || 0, liveCounts.VD.TN), TL: Math.max(baseAvail.VD?.TL || 0, liveCounts.VD.TL) },
                VDC: { TN: Math.max(baseAvail.VDC?.TN || 0, liveCounts.VDC.TN), TL: Math.max(baseAvail.VDC?.TL || 0, liveCounts.VDC.TL) }
            };
            if (data.availableCounts) {
                data.availableCounts[idx] = mergedAvail;
            }

            return { 
                idx, 
                soTiet: st,
                soTietExamined: validExamined, // For Final Exam logic
                soTietNew: validNew,           // For Final Exam logic
                isOldLesson: validExamined > 0 && validNew === 0,
                isNewLesson: validNew > 0,
                avail: mergedAvail,
                allocNB: 0, allocTH: 0, allocVD: 0, allocVDC: 0,
                targetScore: 0,
                currentScore: 0,
            };
        });

        // Helper: Update Current Score
        const updateRowScore = (r: any) => {
            r.currentScore = (r.allocNB + r.allocTH) * SCORE_TN + (r.allocVD + r.allocVDC) * SCORE_TL;
        };

        // Calculate Target Score for Old Pool (30% - 40%, unified with MatrixView & buildMatrixNotesSummary)
        const totalSoTietAll = rows.reduce((s: number, r: any) => s + r.soTiet, 0);
        const totalSoTietExaminedAll = rows.reduce((s: number, r: any) => s + r.soTietExamined, 0);
        const totalSoTietNewAll = rows.reduce((s: number, r: any) => s + r.soTietNew, 0);
        const hasExaminedReduction = totalSoTietExaminedAll > 0 && totalSoTietNewAll > 0;

        if (!hasExaminedReduction) {
            // --- PROPORTIONAL TO TOTAL PERIODS ---
            rows.forEach((r: any) => {
                if (totalSoTietAll > 0) {
                    r.targetScore = (r.soTiet / totalSoTietAll) * TOTAL_SCORE;
                }
            });
        } else {
            // --- WEIGHTED OLD VS NEW (Giảm tỷ lệ bài đã kiểm tra còn 30% - 40% khớp với gợi ý trên bảng) ---
            const naturalOldPct = (totalSoTietExaminedAll / totalSoTietAll) * 100;
            const targetOldPct = Math.max(30, Math.min(40, naturalOldPct));
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

        for (const type of tasksTL) {
            // Ưu tiên bài học mới (chưa thi) và còn hạn mức điểm (targetScore - currentScore >= 0.75)
            let candidates = rows.filter((r: any) => {
                if (r.soTiet <= 0) return false;
                if (hasExaminedReduction && r.isOldLesson) return false;
                if ((r.allocVD + r.allocVDC) > 0) return false;
                const avail = type === 'VD' ? r.avail.VD.TL : r.avail.VDC.TL;
                const allocated = type === 'VD' ? r.allocVD : r.allocVDC;
                return avail > allocated && (r.targetScore - r.currentScore) >= 0.5;
            });
            // Fallback 1: Bài mới bất kỳ chưa có câu tự luận (kể cả khi thư mục chưa đồng bộ file câu hỏi tự luận)
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => {
                    if (r.soTiet <= 0) return false;
                    if (hasExaminedReduction && r.isOldLesson) return false;
                    return (r.allocVD + r.allocVDC) === 0;
                });
            }
            // Fallback 2: Bất kỳ bài nào còn trống tự luận
            if (candidates.length === 0) {
                candidates = rows.filter((r: any) => r.soTiet > 0 && (r.allocVD + r.allocVDC) === 0);
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
        // Phân bổ theo đúng tỷ lệ targetScore của từng bài (Largest Gap / Quota Method),
        // đảm bảo mỗi bài có cùng số tiết & trạng thái đã KT nhận số câu đồng đều sát gợi ý nhất!
        let currentNB = 0;
        let currentTH = 0;

        // Xác định hạn mức điểm TN tối đa cho từng bài: max(0, targetScore - điểm Tự luận đã nhận)
        rows.forEach((r: any) => {
            r.tnTargetScore = Math.max(0, r.targetScore - r.currentScore);
            r.tnTargetQuestions = r.tnTargetScore / SCORE_TN;
        });

        let safetyLoop = 0;
        while ((currentNB < targetNB_TN || currentTH < targetTH_TN) && safetyLoop < 5000) {
            safetyLoop++;

            // Chọn bài đang thiếu hụt nhiều nhất so với targetScore (targetScore - currentScore lớn nhất)
            let rowCandidates = rows.filter((r: any) => r.soTiet > 0);
            if (rowCandidates.length === 0) break;

            rowCandidates.sort((a: any, b: any) => {
                const aGap = a.targetScore - a.currentScore;
                const bGap = b.targetScore - b.currentScore;
                if (Math.abs(aGap - bGap) > 0.01) return bGap - aGap;

                // Nếu cùng độ lệch điểm, ưu tiên bài có ít câu hơn để chia đều tuyệt đối (VD: 5 câu - 5 câu - 6 câu thay vì 7 - 6 - 1)
                const aTotal = a.allocNB + a.allocTH + a.allocVD + a.allocVDC;
                const bTotal = b.allocNB + b.allocTH + b.allocVD + b.allocVDC;
                if (aTotal !== bTotal) return aTotal - bTotal;

                return a.idx - b.idx;
            });

            const best = rowCandidates[0];

            // Quyết định gán câu hỏi này vào mức Biết (NB) hay Hiểu (TH) cho bài `best`
            let chosenLevel: 'NB' | 'TH' = 'NB';
            if (currentNB < targetNB_TN && currentTH < targetTH_TN) {
                // Giữ tỷ lệ NB : TH cân đối trên từng bài học (tránh 1 bài bị dồn 5 NB - 1 TH hay 0 NB - 1 TH)
                const desiredRowNBRatio = targetNB_TN / (targetNB_TN + targetTH_TN);
                const bestTN = best.allocNB + best.allocTH;
                const currentRowNBRatio = bestTN > 0 ? (best.allocNB / bestTN) : 0;

                if (bestTN === 0) {
                    // Câu đầu tiên của bài: chọn mức đang thiếu tỷ lệ toàn cục hơn
                    chosenLevel = (currentNB / targetNB_TN) <= (currentTH / targetTH_TN) ? 'NB' : 'TH';
                } else if (currentRowNBRatio < desiredRowNBRatio - 0.01) {
                    chosenLevel = 'NB';
                } else if (currentRowNBRatio > desiredRowNBRatio + 0.01) {
                    chosenLevel = 'TH';
                } else {
                    chosenLevel = (currentNB / targetNB_TN) <= (currentTH / targetTH_TN) ? 'NB' : 'TH';
                }
            } else if (currentNB < targetNB_TN) {
                chosenLevel = 'NB';
            } else {
                chosenLevel = 'TH';
            }

            if (chosenLevel === 'NB') {
                best.allocNB++;
                currentNB++;
            } else {
                best.allocTH++;
                currentTH++;
            }
            updateRowScore(best);
        }

        // --- 6. APPLY TO DATA OBJECT (BOTH CLASSIC & NEW 4-PART FORMAT) ---
        if (!data.newFormatRows) data.newFormatRows = {};

        // Track remaining quotas for 4-part split across rows:
        // Standard 10.0pt exam:
        // - Nhiều lựa chọn (mc): 12 câu = 3,0đ (30%) -> 8 Biết + 4 Hiểu (hoặc 6 Biết + 6 Hiểu)
        // - "Đúng – Sai" (tf): 8 lệnh hỏi = 2,0đ (20%) -> 4 Biết + 4 Hiểu
        // - Trả lời ngắn (sa): 8 câu = 2,0đ (20%) -> 4 Biết + 4 Hiểu
        // - Tự luận (essay): 3 câu = 3,0đ (30%) -> 3 Vận dụng
        const useShortAnswer = data.newPointsConfig?.useShortAnswer !== false;
        let remMC_B = ratioOption === '30-40-30' ? 6 : 8;
        let remTF_B = useShortAnswer
            ? (ratioOption === '30-40-30' ? 3 : 4)
            : (ratioOption === '30-40-30' ? 6 : 8);
        let remSA_B = useShortAnswer ? (ratioOption === '30-40-30' ? 3 : 4) : 0;

        let remMC_H = ratioOption === '30-40-30' ? 6 : 4;
        let remTF_H = useShortAnswer
            ? (ratioOption === '30-40-30' ? 5 : 4)
            : (ratioOption === '30-40-30' ? 10 : 8);
        let remSA_H = useShortAnswer ? (ratioOption === '30-40-30' ? 5 : 4) : 0;

        rows.forEach((r: any) => {
            const idx = r.idx;
            data.specifications.rows[idx][5] = `${r.allocNB}-0`;      
            data.specifications.rows[idx][6] = `${r.allocTH}-0`;      
            data.specifications.rows[idx][7] = `0-${r.allocVD}`; 
            data.specifications.rows[idx][8] = `0-${r.allocVDC}`;

            const mRow = data.matrix.rows[idx];
            mRow[5] = r.allocNB > 0 ? r.allocNB.toString() : ''; mRow[6] = '';
            mRow[7] = r.allocTH > 0 ? r.allocTH.toString() : ''; mRow[8] = '';
            mRow[9] = '';                                        mRow[10] = r.allocVD > 0 ? r.allocVD.toString() : '';
            mRow[11] = '';                                       mRow[12] = r.allocVDC > 0 ? r.allocVDC.toString() : '';

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

            rowCfg.essay.VD.count = (r.allocVD || 0) + (r.allocVDC || 0);
            data.newFormatRows[idx] = rowCfg;

            // Tự động đồng bộ cột Yêu cầu cần đạt trên Bản đặc tả: chỉ bật các tiêu chí tương ứng với mức độ & số câu được chọn ra đề
            const rawReqHtml = String(data.specifications.rows[idx]?.[4] || '');
            if (rawReqHtml) {
                const updatedReqHtml = rawReqHtml.replace(
                    /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi,
                    (_fullMatch, rawTitle, bodyHtml) => {
                        const lower = String(rawTitle || '').replace(/<[^>]*>/g, '').trim().toLowerCase();
                        let lvlQuota = 0;
                        if (lower.startsWith('nhận biết') || lower.startsWith('biết') || lower.startsWith('- biết')) {
                            lvlQuota = r.allocNB || 0;
                        } else if (lower.startsWith('thông hiểu') || lower.startsWith('hiểu') || lower.startsWith('- hiểu')) {
                            lvlQuota = r.allocTH || 0;
                        } else if (lower.startsWith('vận dụng cao')) {
                            lvlQuota = r.allocVDC || r.allocVD || 0;
                        } else {
                            lvlQuota = (r.allocVD || 0) + (r.allocVDC || 0);
                        }
                        let itemIdx = 0;
                        const updatedBody = String(bodyHtml).replace(
                            /<div([^>]*)>([\s\S]*?)<\/div>/gi,
                            (_divMatch, _attrs, innerTxt) => {
                                itemIdx++;
                                const isSelected = lvlQuota > 0 && itemIdx <= lvlQuota;
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

        Promise.all(files.map(file => new Promise<{name: string, content: any}>((resolve, reject) => {
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
                    resolve({ name: file.name, content: json });
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        }))).then(results => {
            results.forEach(res => {
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
            showToast(`Đã tải lên ${results.length} tệp`);
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

        const bankRes = loadQuestionBank();
        const gradeQuestions = (bankRes.data || []).filter(q => String(q.grade) === gradeNum && q.lesson);

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

        regenerateMatrix(gradeDir);
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