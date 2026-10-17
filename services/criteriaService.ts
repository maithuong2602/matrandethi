import { CURRICULUM } from '../data/curriculum';
import { MatrixData } from '../types';

export const CUSTOM_CRITERIA_STORAGE_KEY = 'matrandethi_custom_criteria_data';

export type CriteriaMap = Record<string, string[]>; // e.g. { NB: ["1.1 ..."], TH: ["2.1 ..."] }
export type LessonCriteriaMap = Record<string, CriteriaMap>; // lessonName -> CriteriaMap
export type GradeCriteriaMap = Record<string, LessonCriteriaMap>; // grade -> lessonName -> CriteriaMap

export interface YccdItem {
    id: string;
    text: string;
    checked: boolean;
}

export interface YccdSection {
    levelTitle: string;
    items: YccdItem[];
}

/**
 * Normalizes criterion text for robust fuzzy comparison (stripping numbering, dashes, punctuation, case)
 */
export const normalizeCriterionText = (text: string): string => {
    return (text || '')
        .replace(/^\d+\.\d+\s*/, '')
        .replace(/^[\s–\-*•]+/, '')
        .replace(/[:.\-–_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

/**
 * Maps Vietnamese assessment level title to standard code (NB, TH, VD, VDC)
 */
export const getLevelCodeFromTitle = (title: string): string => {
    const t = (title || '').toLowerCase().trim();
    if (t.includes('nhận biết') || t.startsWith('nb')) return 'NB';
    if (t.includes('thông hiểu') || t.startsWith('th')) return 'TH';
    if (t.includes('vận dụng cao') || t.startsWith('vdc')) return 'VDC';
    if (t.includes('vận dụng') || t.startsWith('vd')) return 'VD';
    return title.trim().toUpperCase() || 'NB';
};

/**
 * Maps standard level code to Vietnamese display title
 */
export const getLevelTitleFromCode = (code: string): string => {
    switch ((code || '').toUpperCase()) {
        case 'NB': return 'Nhận biết';
        case 'TH': return 'Thông hiểu';
        case 'VD': return 'Vận dụng';
        case 'VDC': return 'Vận dụng cao';
        default: return code;
    }
};

/**
 * Standard prefix number by level code:
 * NB -> 1.x
 * TH -> 2.x
 * VD -> 3.x
 * VDC -> 4.x
 */
export const getLevelPrefixNumber = (code: string): string => {
    switch ((code || '').toUpperCase()) {
        case 'NB': return '1';
        case 'TH': return '2';
        case 'VD': return '3';
        case 'VDC': return '4';
        default: return '5';
    }
};

/**
 * Normalizes a lesson string for flexible matching
 */
export const normalizeLessonString = (str: string): string => {
    return (str || '')
        .toLowerCase()
        .replace(/[:.\-–_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Extracts lesson number if present (e.g. "Bài 2. Thông tin..." -> "2", "Bài 8a..." -> "8a")
 */
export const extractLessonNumber = (str: string): string | null => {
    const match = (str || '').match(/(?:bài|bai)\s*(\d+[a-zA-Z]?)/i);
    return match ? match[1].toLowerCase() : null;
};

/**
 * Detects grade ('6' | '7' | '8' | '9') from context strings
 */
export const detectGradeFromLessonOrContext = (lessonName: string, context?: string): string => {
    if (context) {
        const m = context.match(/(?:lớp|khối|grade|tin)\s*(\d+)/i) || context.match(/\b([6-9])\b/);
        if (m && ['6', '7', '8', '9'].includes(m[1])) return m[1];
    }

    const normTarget = normalizeLessonString(lessonName);
    const targetNum = extractLessonNumber(lessonName);

    for (const g of ['6', '7', '8', '9']) {
        const lessons = CURRICULUM.lessonData[g] || [];
        for (const l of lessons) {
            if (normalizeLessonString(l) === normTarget) return g;
            if (targetNum && extractLessonNumber(l) === targetNum) return g;
        }
    }

    return '7';
};

/**
 * Parses specification HTML into structured sections
 */
export const parseYccdSections = (htmlContent: string): YccdSection[] => {
    if (!htmlContent) return [];
    const regex = /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi;
    const sections: YccdSection[] = [];
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
        const rawTitle = match[1].trim();
        const levelTitle = rawTitle.replace(/<[^>]*>/g, '').trim();
        const bodyHtml = match[2];
        const items: YccdItem[] = [];

        const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
        let divMatch;
        let idx = 0;
        while ((divMatch = divRegex.exec(bodyHtml)) !== null) {
            const attrs = divMatch[1];
            const text = divMatch[2].trim();
            const isUnchecked = /data-unchecked="true"/i.test(attrs);
            items.push({
                id: `${levelTitle}-${idx++}`,
                text: text,
                checked: !isUnchecked
            });
        }

        sections.push({
            levelTitle,
            items
        });
    }

    // Fallback if no <strong> tag found
    if (sections.length === 0 && htmlContent.trim()) {
        const items: YccdItem[] = [];
        const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
        let divMatch;
        let idx = 0;
        while ((divMatch = divRegex.exec(htmlContent)) !== null) {
            const attrs = divMatch[1];
            const text = divMatch[2].trim();
            const isUnchecked = /data-unchecked="true"/i.test(attrs);
            items.push({
                id: `default-${idx++}`,
                text,
                checked: !isUnchecked
            });
        }
        if (items.length > 0) {
            sections.push({ levelTitle: '', items });
        }
    }

    return sections;
};

/**
 * Serializes sections back to clean specification HTML
 */
export const serializeYccdSections = (sections: YccdSection[]): string => {
    let result = '';
    sections.forEach((sec, sIdx) => {
        if (sec.levelTitle) {
            const marginTopClass = sIdx === 0 ? '' : 'mt-2';
            result += `<strong class="block font-semibold ${marginTopClass}">${sec.levelTitle}</strong>`;
        }
        sec.items.forEach(it => {
            const uncheckedAttr = !it.checked ? ' data-unchecked="true"' : '';
            result += `<div class="pl-2"${uncheckedAttr}>${it.text}</div>`;
        });
    });
    return result;
};

/**
 * Parses specification YCCĐ HTML string into structured CriteriaMap ({ NB: [...], TH: [...] })
 */
export const parseYccdHtmlToCriteria = (htmlContent: string): CriteriaMap => {
    if (!htmlContent) return {};

    const sections = parseYccdSections(htmlContent);
    const result: CriteriaMap = {};

    sections.forEach(sec => {
        const levelCode = getLevelCodeFromTitle(sec.levelTitle);
        const prefix = getLevelPrefixNumber(levelCode);
        const items: string[] = [];

        let itemIndex = 1;
        sec.items.forEach(it => {
            if (!it.checked) return;
            let text = it.text.replace(/^[\s–\-*•]+/, '').trim();
            if (!text) return;

            if (/^\d+\.\d+\s/.test(text)) {
                items.push(text);
            } else {
                items.push(`${prefix}.${itemIndex} ${text}`);
            }
            itemIndex++;
        });

        if (items.length === 0 && sec.items.length === 0) {
            items.push(`${prefix}.1 Yêu cầu cần đạt mức ${getLevelTitleFromCode(levelCode)}`);
        }

        if (!result[levelCode]) {
            result[levelCode] = [];
        }
        result[levelCode].push(...items);
    });

    return result;
};

/**
 * Loads custom criteria store from localStorage
 */
export const loadCustomCriteriaStore = (): GradeCriteriaMap => {
    try {
        const raw = localStorage.getItem(CUSTOM_CRITERIA_STORAGE_KEY);
        const store: GradeCriteriaMap = raw ? JSON.parse(raw) : {};

        try {
            const mfsRaw = localStorage.getItem('matrixFileSystem');
            if (mfsRaw) {
                const fs = JSON.parse(mfsRaw);
                harvestCriteriaFromFileSystem(fs, store);
            }
        } catch (e) {
            console.error('Error scanning matrixFileSystem for criteria:', e);
        }

        return store;
    } catch (e) {
        console.error('Error loading custom criteria store:', e);
        return {};
    }
};

/**
 * Recursively harvests criteria from matrixFileSystem directory tree
 */
const harvestCriteriaFromFileSystem = (item: any, store: GradeCriteriaMap, currentGrade?: string) => {
    if (!item) return;

    let grade = currentGrade;
    if (item.name) {
        const m = item.name.match(/Lớp\s*(\d+)/i) || item.name.match(/\b([6-9])\b/);
        if (m && ['6', '7', '8', '9'].includes(m[1])) {
            grade = m[1];
        }
    }

    if (item.matrixData?.specifications?.rows && Array.isArray(item.matrixData.specifications.rows)) {
        const effectiveGrade = grade || '7';
        if (!store[effectiveGrade]) store[effectiveGrade] = {};

        item.matrixData.specifications.rows.forEach((row: string[], idx: number) => {
            const lessonName = row[3] || item.matrixData.matrix?.rows?.[idx]?.[3];
            const reqHtml = row[4];
            if (lessonName && reqHtml) {
                const parsed = parseYccdHtmlToCriteria(reqHtml);
                if (Object.keys(parsed).length > 0) {
                    if (!store[effectiveGrade][lessonName]) {
                        store[effectiveGrade][lessonName] = {};
                    }
                    Object.entries(parsed).forEach(([lvl, list]) => {
                        store[effectiveGrade][lessonName][lvl] = list;
                    });
                }
            }
        });
    }

    if (Array.isArray(item.children)) {
        item.children.forEach((child: any) => harvestCriteriaFromFileSystem(child, store, grade));
    }
};

/**
 * Saves custom criteria store to localStorage
 */
export const saveCustomCriteriaStore = (store: GradeCriteriaMap) => {
    try {
        localStorage.setItem(CUSTOM_CRITERIA_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
        console.error('Error saving custom criteria store:', e);
    }
};

/**
 * Synchronizes criteria from MatrixData (called whenever Matrix or Specification table is saved)
 */
export const syncCriteriaFromMatrixData = (matrixData: MatrixData, context?: string) => {
    if (!matrixData?.specifications?.rows || !Array.isArray(matrixData.specifications.rows)) return;

    const store = loadCustomCriteriaStore();

    matrixData.specifications.rows.forEach((row: string[], idx: number) => {
        const lessonName = row[3] || matrixData.matrix?.rows?.[idx]?.[3];
        const reqHtml = row[4];
        if (!lessonName || !reqHtml) return;

        const grade = detectGradeFromLessonOrContext(lessonName, context);
        const parsed = parseYccdHtmlToCriteria(reqHtml);

        if (Object.keys(parsed).length > 0) {
            if (!store[grade]) store[grade] = {};
            if (!store[grade][lessonName]) store[grade][lessonName] = {};

            Object.entries(parsed).forEach(([lvl, list]) => {
                store[grade][lessonName][lvl] = list;
            });
        }
    });

    saveCustomCriteriaStore(store);
};

/**
 * Applies add/update/delete operation directly to a specification cell's HTML
 */
export const applyCriterionChangeToHtml = (
    currentHtml: string,
    levelCode: string,
    action: 'add' | 'update' | 'delete',
    data: { oldText?: string; newText?: string }
): string => {
    const sections = parseYccdSections(currentHtml);
    const targetTitle = getLevelTitleFromCode(levelCode).trim().toLowerCase();
    const targetNormOld = data.oldText ? normalizeCriterionText(data.oldText) : '';
    const cleanNew = data.newText 
        ? data.newText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim() 
        : '';

    let secIdx = sections.findIndex(s => s.levelTitle.trim().toLowerCase() === targetTitle);

    if (action === 'delete') {
        let deleted = false;
        if (secIdx !== -1) {
            const beforeCount = sections[secIdx].items.length;
            sections[secIdx].items = sections[secIdx].items.filter(it => {
                const itemNorm = normalizeCriterionText(it.text);
                const isMatch = itemNorm === targetNormOld || (targetNormOld.length > 5 && itemNorm.includes(targetNormOld)) || (itemNorm.length > 5 && targetNormOld.includes(itemNorm));
                return !isMatch;
            });
            if (sections[secIdx].items.length < beforeCount) {
                deleted = true;
            }
        }
        if (!deleted) {
            for (const s of sections) {
                s.items = s.items.filter(it => {
                    const itemNorm = normalizeCriterionText(it.text);
                    const isMatch = itemNorm === targetNormOld || (targetNormOld.length > 5 && itemNorm.includes(targetNormOld)) || (itemNorm.length > 5 && targetNormOld.includes(itemNorm));
                    return !isMatch;
                });
            }
        }
    } else if (action === 'update') {
        let updated = false;
        if (secIdx !== -1) {
            sections[secIdx].items.forEach(it => {
                const itemNorm = normalizeCriterionText(it.text);
                if (itemNorm === targetNormOld || (targetNormOld.length > 5 && itemNorm.includes(targetNormOld)) || (itemNorm.length > 5 && targetNormOld.includes(itemNorm))) {
                    it.text = `– ${cleanNew}`;
                    updated = true;
                }
            });
        }
        // Fallback: search across all sections if not in primary level
        if (!updated) {
            for (const s of sections) {
                s.items.forEach(it => {
                    const itemNorm = normalizeCriterionText(it.text);
                    if (itemNorm === targetNormOld || (targetNormOld.length > 5 && itemNorm.includes(targetNormOld)) || (itemNorm.length > 5 && targetNormOld.includes(itemNorm))) {
                        it.text = `– ${cleanNew}`;
                        updated = true;
                    }
                });
                if (updated) break;
            }
        }
    } else if (action === 'add') {
        const formattedNew = `– ${cleanNew}`;
        if (secIdx === -1) {
            // Standard order for pedagogical levels in Vietnam
            const standardOrder = ['nhận biết', 'thông hiểu', 'vận dụng', 'vận dụng cao'];
            const stdIdx = standardOrder.indexOf(targetTitle);
            let insertIdx = sections.length;
            if (stdIdx !== -1) {
                for (let i = 0; i < sections.length; i++) {
                    const curStdIdx = standardOrder.indexOf(sections[i].levelTitle.trim().toLowerCase());
                    if (curStdIdx !== -1 && curStdIdx > stdIdx) {
                        insertIdx = i;
                        break;
                    }
                }
            }
            sections.splice(insertIdx, 0, {
                levelTitle: getLevelTitleFromCode(levelCode),
                items: [{ id: `${levelCode}-${Date.now()}`, text: formattedNew, checked: true }]
            });
        } else {
            const alreadyExists = sections[secIdx].items.some(it => normalizeCriterionText(it.text) === normalizeCriterionText(cleanNew));
            if (!alreadyExists) {
                sections[secIdx].items.push({
                    id: `${levelCode}-${Date.now()}`,
                    text: formattedNew,
                    checked: true
                });
            }
        }
    }

    return serializeYccdSections(sections);
};

/**
 * ĐỒNG BỘ 2 CHIỀU SANG BẢNG ĐẶC TẢ (matrixFileSystem & saved exams in localStorage)
 */
export const syncCriterionChangeToMatrixFileSystem = (
    grade: string,
    lesson: string,
    levelCode: string,
    action: 'add' | 'update' | 'delete',
    data: { oldText?: string; newText?: string }
): void => {
    if (typeof window === 'undefined') return;

    const targetNormLesson = normalizeLessonString(lesson);
    const targetLessonNum = extractLessonNumber(lesson);

    const matchesLesson = (rowLesson: string): boolean => {
        if (!rowLesson) return false;
        if (normalizeLessonString(rowLesson) === targetNormLesson) return true;
        if (targetLessonNum && extractLessonNumber(rowLesson) === targetLessonNum) return true;
        return false;
    };

    // 1. Đồng bộ vào matrixFileSystem (Bảng ma trận & đặc tả trong Ma Trận Đề Thi)
    try {
        const raw = localStorage.getItem('matrixFileSystem');
        if (raw) {
            const fs = JSON.parse(raw);
            let modified = false;

            const updateInTree = (item: any) => {
                if (!item) return;

                if (item.matrixData?.specifications?.rows && Array.isArray(item.matrixData.specifications.rows)) {
                    item.matrixData.specifications.rows.forEach((row: string[]) => {
                        const rowLesson = row[3];
                        if (matchesLesson(rowLesson)) {
                            const curHtml = row[4] || '';
                            const newHtml = applyCriterionChangeToHtml(curHtml, levelCode, action, data);
                            if (newHtml !== curHtml) {
                                row[4] = newHtml;
                                modified = true;
                            }
                        }
                    });
                }

                if (Array.isArray(item.children)) {
                    item.children.forEach(updateInTree);
                }
            };

            updateInTree(fs);

            if (modified) {
                localStorage.setItem('matrixFileSystem', JSON.stringify(fs));
            }
        }
    } catch (e) {
        console.error('[criteriaService] Error syncing to matrixFileSystem:', e);
    }

    // 2. Đồng bộ vào các hồ sơ đề thi đã lưu (matrandethi_saved_exams) nếu có ma trận đặc tả
    try {
        const examsRaw = localStorage.getItem('matrandethi_saved_exams');
        if (examsRaw) {
            const exams = JSON.parse(examsRaw);
            let examsModified = false;
            if (Array.isArray(exams)) {
                exams.forEach((exam: any) => {
                    if (exam.matrixData?.specifications?.rows && Array.isArray(exam.matrixData.specifications.rows)) {
                        exam.matrixData.specifications.rows.forEach((row: string[]) => {
                            const rowLesson = row[3];
                            if (matchesLesson(rowLesson)) {
                                const curHtml = row[4] || '';
                                const newHtml = applyCriterionChangeToHtml(curHtml, levelCode, action, data);
                                if (newHtml !== curHtml) {
                                    row[4] = newHtml;
                                    examsModified = true;
                                }
                            }
                        });
                    }
                });
                if (examsModified) {
                    localStorage.setItem('matrandethi_saved_exams', JSON.stringify(exams));
                }
            }
        }
    } catch (e) {
        console.error('[criteriaService] Error syncing to matrandethi_saved_exams:', e);
    }

    // 3. Bắn event cho các view đang mở cập nhật tức thì
    window.dispatchEvent(new CustomEvent('matrix_filesystem_updated', { detail: { grade, lesson, levelCode, action } }));
    window.dispatchEvent(new CustomEvent('criteria_updated', { detail: { grade, lesson, levelCode, action } }));
};

/**
 * Bổ sung YCCĐ mới (từ Quản Lý Câu Hỏi) và đồng bộ qua Bảng đặc tả
 */
export const addCustomCriterion = (
    grade: string,
    lesson: string,
    levelCode: string,
    criterionText: string
): CriteriaMap => {
    const store = loadCustomCriteriaStore();
    const g = grade.trim();
    if (!store[g]) store[g] = {};
    if (!store[g][lesson]) store[g][lesson] = {};

    const lvl = getLevelCodeFromTitle(levelCode);
    const prefix = getLevelPrefixNumber(lvl);

    let cleanText = criterionText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim();
    if (!cleanText) {
        cleanText = `Yêu cầu cần đạt mức ${getLevelTitleFromCode(lvl)}`;
    }

    const currentList = store[g][lesson][lvl] || [];
    const nextIdx = currentList.length + 1;
    const formatted = `${prefix}.${nextIdx} ${cleanText}`;

    // Thêm vào store nếu chưa có
    const exists = currentList.some(item => normalizeCriterionText(item) === normalizeCriterionText(cleanText));
    if (!exists) {
        store[g][lesson][lvl] = [...currentList, formatted];
        saveCustomCriteriaStore(store);
    }

    // Đồng bộ tức thì qua Bảng đặc tả
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'add', { newText: cleanText });

    return getMergedCriteria(g, lesson, store) || {};
};

/**
 * CHỈNH SỬA YCCĐ (từ Quản Lý Câu Hỏi) và đồng bộ qua Bảng đặc tả
 */
export const updateCustomCriterion = (
    grade: string,
    lesson: string,
    levelCode: string,
    oldCriterionText: string,
    newCriterionText: string
): CriteriaMap => {
    const store = loadCustomCriteriaStore();
    const g = grade.trim();
    if (!store[g]) store[g] = {};
    if (!store[g][lesson]) store[g][lesson] = {};

    const lvl = getLevelCodeFromTitle(levelCode);
    const prefix = getLevelPrefixNumber(lvl);
    const normOld = normalizeCriterionText(oldCriterionText);
    const cleanNew = newCriterionText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim();

    if (!cleanNew) {
        throw new Error('Nội dung yêu cầu cần đạt không được để trống.');
    }

    // 1. Đánh dấu oldCriterionText vào __deleted để chặn CURRICULUM cơ bản không hiện lại
    if (!store[g][lesson].__deleted) {
        store[g][lesson].__deleted = [];
    }
    if (!store[g][lesson].__deleted.includes(normOld)) {
        store[g][lesson].__deleted.push(normOld);
    }

    // 2. Cập nhật trong store custom criteria
    const currentList = store[g][lesson][lvl] || [];
    const oldIdx = currentList.findIndex(it => normalizeCriterionText(it) === normOld);
    const displayNum = oldIdx >= 0 ? (oldIdx + 1) : (currentList.length + 1);
    const formattedNew = `${prefix}.${displayNum} ${cleanNew}`;

    if (oldIdx >= 0) {
        currentList[oldIdx] = formattedNew;
        store[g][lesson][lvl] = [...currentList];
    } else {
        store[g][lesson][lvl] = [...currentList, formattedNew];
    }

    saveCustomCriteriaStore(store);

    // 3. Đồng bộ cập nhật qua Bảng đặc tả (matrixFileSystem & saved exams)
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'update', {
        oldText: oldCriterionText,
        newText: cleanNew
    });

    return getMergedCriteria(g, lesson, store) || {};
};

/**
 * XÓA YCCĐ (từ Quản Lý Câu Hỏi) và đồng bộ xóa khỏi Bảng đặc tả
 */
export const deleteCustomCriterion = (
    grade: string,
    lesson: string,
    levelCode: string,
    criterionText: string
): CriteriaMap => {
    const store = loadCustomCriteriaStore();
    const g = grade.trim();
    if (!store[g]) store[g] = {};
    if (!store[g][lesson]) store[g][lesson] = {};

    const lvl = getLevelCodeFromTitle(levelCode);
    const normText = normalizeCriterionText(criterionText);

    // 1. Ghi nhận vào __deleted để chặn CURRICULUM cơ bản không hiện lại
    if (!store[g][lesson].__deleted) {
        store[g][lesson].__deleted = [];
    }
    if (!store[g][lesson].__deleted.includes(normText)) {
        store[g][lesson].__deleted.push(normText);
    }

    // 2. Xóa khỏi custom list nếu có
    if (store[g][lesson][lvl]) {
        store[g][lesson][lvl] = store[g][lesson][lvl].filter(it => normalizeCriterionText(it) !== normText);
    }

    saveCustomCriteriaStore(store);

    // 3. Đồng bộ xóa khỏi Bảng đặc tả (matrixFileSystem & saved exams)
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'delete', {
        oldText: criterionText
    });

    return getMergedCriteria(g, lesson, store) || {};
};

/**
 * Gets the merged criteria map for a given grade and lesson, combining
 * 1. Base CURRICULUM.criteriaData (loại trừ các mục đã bị xóa)
 * 2. Custom/Matrix updated criteria
 */
export const getMergedCriteria = (
    grade: string,
    lesson: string,
    customStore?: GradeCriteriaMap
): CriteriaMap | null => {
    if (!grade || !lesson) return null;

    const g = grade.trim();
    const store = customStore || loadCustomCriteriaStore();

    // Danh sách các mục đã bị giáo viên xóa hoặc sửa
    const deletedNorms: string[] = store[g]?.[lesson]?.__deleted || [];
    const isItemDeleted = (text: string) => {
        if (deletedNorms.length === 0) return false;
        const norm = normalizeCriterionText(text);
        return deletedNorms.some(d => d === norm);
    };

    // 1. Get Base Criteria from CURRICULUM
    const baseCriteriaForGrade = CURRICULUM.criteriaData[g] || {};
    let baseCriteria: CriteriaMap | undefined = baseCriteriaForGrade[lesson];

    if (!baseCriteria) {
        const normTarget = normalizeLessonString(lesson);
        const targetNum = extractLessonNumber(lesson);

        for (const [key, map] of Object.entries(baseCriteriaForGrade)) {
            if (normalizeLessonString(key) === normTarget) {
                baseCriteria = map;
                break;
            }
            if (targetNum && extractLessonNumber(key) === targetNum) {
                baseCriteria = map;
                break;
            }
        }
    }

    const merged: CriteriaMap = {};
    if (baseCriteria) {
        Object.entries(baseCriteria).forEach(([lvl, list]) => {
            const filtered = list.filter(item => !isItemDeleted(item));
            if (filtered.length > 0) {
                merged[lvl] = [...filtered];
            }
        });
    }

    // 2. Find matching custom criteria in store
    const gradeStore = store[g] || {};
    let customForLesson: CriteriaMap | undefined = gradeStore[lesson];

    if (!customForLesson) {
        const normTarget = normalizeLessonString(lesson);
        const targetNum = extractLessonNumber(lesson);

        for (const [key, map] of Object.entries(gradeStore)) {
            if (normalizeLessonString(key) === normTarget) {
                customForLesson = map;
                break;
            }
            if (targetNum && extractLessonNumber(key) === targetNum) {
                customForLesson = map;
                break;
            }
        }
    }

    // 3. Merge custom criteria into result (excluding internal keys like __deleted)
    if (customForLesson) {
        Object.entries(customForLesson).forEach(([lvl, list]) => {
            if (lvl === '__deleted' || !Array.isArray(list)) return;

            const validList = list.filter(item => !isItemDeleted(item));
            if (!merged[lvl]) {
                if (validList.length > 0) merged[lvl] = [...validList];
            } else {
                const existingSet = new Set(merged[lvl].map(s => normalizeCriterionText(s)));
                validList.forEach(item => {
                    const normItem = normalizeCriterionText(item);
                    if (!existingSet.has(normItem)) {
                        merged[lvl].push(item);
                        existingSet.add(normItem);
                    }
                });
            }
        });
    }

    return Object.keys(merged).length > 0 ? merged : null;
};
