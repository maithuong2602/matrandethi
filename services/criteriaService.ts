import { CURRICULUM } from '../data/curriculum';
import { MatrixData } from '../types';

export const CUSTOM_CRITERIA_STORAGE_KEY = 'matrandethi_custom_criteria_data';

export type CriteriaMap = Record<string, string[]>; // e.g. { NB: ["1.1 ..."], TH: ["2.1 ..."] }
export type LessonCriteriaMap = Record<string, CriteriaMap>; // lessonName -> CriteriaMap
export type GradeCriteriaMap = Record<string, LessonCriteriaMap>; // grade -> lessonName -> CriteriaMap

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
    // 1. Try from context if available
    if (context) {
        const m = context.match(/(?:lớp|khối|grade|tin)\s*(\d+)/i) || context.match(/\b([6-9])\b/);
        if (m && ['6', '7', '8', '9'].includes(m[1])) return m[1];
    }

    // 2. Lookup lesson in standard curriculum
    const normTarget = normalizeLessonString(lessonName);
    const targetNum = extractLessonNumber(lessonName);

    for (const g of ['6', '7', '8', '9']) {
        const lessons = CURRICULUM.lessonData[g] || [];
        for (const l of lessons) {
            if (normalizeLessonString(l) === normTarget) return g;
            if (targetNum && extractLessonNumber(l) === targetNum) return g;
        }
    }

    return '7'; // Default fallback
};

/**
 * Parses specification YCCĐ HTML string into structured CriteriaMap ({ NB: [...], TH: [...] })
 */
export const parseYccdHtmlToCriteria = (htmlContent: string): CriteriaMap => {
    if (!htmlContent) return {};

    const regex = /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi;
    const result: CriteriaMap = {};
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
        const rawTitle = match[1].trim();
        const bodyHtml = match[2];
        const levelCode = getLevelCodeFromTitle(rawTitle);
        const prefix = getLevelPrefixNumber(levelCode);

        const items: string[] = [];
        const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
        let divMatch;
        let itemIndex = 1;

        while ((divMatch = divRegex.exec(bodyHtml)) !== null) {
            const attrs = divMatch[1];
            // Skip unchecked items if marked
            if (/data-unchecked="true"/i.test(attrs)) continue;

            let text = divMatch[2].trim();
            // Remove leading bullet/dash/numbering
            text = text.replace(/^[\s–\-*•]+/, '').trim();
            if (!text) continue;

            // If text already has numbering like "1.1 ...", preserve it
            if (/^\d+\.\d+\s/.test(text)) {
                items.push(text);
            } else {
                items.push(`${prefix}.${itemIndex} ${text}`);
            }
            itemIndex++;
        }

        // If level section was created but no items were added yet, provide a sensible default criterion
        if (items.length === 0) {
            items.push(`${prefix}.1 Yêu cầu cần đạt mức ${getLevelTitleFromCode(levelCode)}`);
        }

        if (!result[levelCode]) {
            result[levelCode] = [];
        }
        result[levelCode].push(...items);
    }

    return result;
};

/**
 * Loads custom criteria store from localStorage
 */
export const loadCustomCriteriaStore = (): GradeCriteriaMap => {
    try {
        const raw = localStorage.getItem(CUSTOM_CRITERIA_STORAGE_KEY);
        const store: GradeCriteriaMap = raw ? JSON.parse(raw) : {};

        // Also scan matrixFileSystem in localStorage to harvest any updated specifications
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
                    // Merge
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
 * Adds or updates a single criterion for a specific lesson and grade
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

    let cleanText = criterionText.trim().replace(/^[\s–\-*•]+/, '').trim();
    if (!cleanText) {
        cleanText = `Yêu cầu cần đạt mức ${getLevelTitleFromCode(lvl)}`;
    }

    const currentList = store[g][lesson][lvl] || [];
    const nextIdx = currentList.length + 1;
    const formatted = /^\d+\.\d+\s/.test(cleanText) ? cleanText : `${prefix}.${nextIdx} ${cleanText}`;

    // Add if not already present
    if (!currentList.includes(formatted)) {
        store[g][lesson][lvl] = [...currentList, formatted];
        saveCustomCriteriaStore(store);
    }

    return getMergedCriteria(g, lesson, store) || {};
};

/**
 * Gets the merged criteria map for a given grade and lesson, combining
 * 1. Base CURRICULUM.criteriaData
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

    // 1. Get Base Criteria from CURRICULUM
    const baseCriteriaForGrade = CURRICULUM.criteriaData[g] || {};
    let baseCriteria: CriteriaMap | undefined = baseCriteriaForGrade[lesson];

    // Try fuzzy match in base if exact lesson name not found
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

    // Clone base criteria or start with empty object
    const merged: CriteriaMap = {};
    if (baseCriteria) {
        Object.entries(baseCriteria).forEach(([lvl, list]) => {
            merged[lvl] = [...list];
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

    // 3. Merge custom criteria into result
    if (customForLesson) {
        Object.entries(customForLesson).forEach(([lvl, list]) => {
            if (!merged[lvl]) {
                // Newly added level (e.g. NB was not in base, but added in matrix!)
                merged[lvl] = [...list];
            } else {
                // Level existed in base, merge any new custom criteria
                const existingSet = new Set(merged[lvl].map(s => s.toLowerCase().trim()));
                list.forEach(item => {
                    const normItem = item.toLowerCase().trim();
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
