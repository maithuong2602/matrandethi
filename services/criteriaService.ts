import { CURRICULUM } from '../data/curriculum';
import { CANONICAL_REQUIREMENTS, KNTT_LESSON_MAPPINGS } from '../data/curriculum/index';
import { REQUIREMENTS_DATA } from '../data/matrixConstants';
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
    if (t.includes('nhận biết') || t.startsWith('biết') || t.startsWith('nb') || t === 'b') return 'NB';
    if (t.includes('thông hiểu') || t.startsWith('hiểu') || t.startsWith('th') || t === 'h') return 'TH';
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
 * Detects grade ('6' | '7' | '8' | '9') from context strings, lesson names, or subTopic names
 */
export const detectGradeFromLessonOrContext = (lessonOrSubTopic: string, context?: string): string => {
    if (context) {
        const m = context.match(/(?:lớp|khối|grade|tin)\s*(\d+)/i) || context.match(/\b([6-9])\b/);
        if (m && ['6', '7', '8', '9'].includes(m[1])) return m[1];
    }

    const normTarget = normalizeLessonString(lessonOrSubTopic);
    const strippedTarget = normalizeLessonString((lessonOrSubTopic || '').replace(/^\d+\.\s*/, ''));
    const targetNum = extractLessonNumber(lessonOrSubTopic);

    for (const g of ['6', '7', '8', '9']) {
        const lessons = CURRICULUM.lessonData[g] || [];
        for (const l of lessons) {
            if (normalizeLessonString(l) === normTarget) return g;
            if (targetNum && extractLessonNumber(l) === targetNum) return g;
        }
    }

    for (const g of ['6', '7', '8', '9']) {
        const gradeReqs = REQUIREMENTS_DATA[`Lớp ${g}`];
        if (gradeReqs && normTarget) {
            for (const [mainTopic, subTopics] of Object.entries(gradeReqs)) {
                if (normalizeLessonString(mainTopic) === normTarget) return g;
                for (const subKey of Object.keys(subTopics as object)) {
                    const normSub = normalizeLessonString(subKey);
                    const strippedSub = normalizeLessonString(subKey.replace(/^\d+\.\s*/, ''));
                    if (normSub === normTarget || (strippedTarget && strippedSub === strippedTarget)) {
                        return g;
                    }
                }
            }
        }
    }

    return '7';
};

/**
 * Resolves a lesson name to its canonical key in CURRICULUM.lessonData[grade] if one exists
 */
export const resolveCanonicalLessonName = (grade: string, lessonName: string): string => {
    if (!grade || !lessonName) return lessonName || '';
    const g = grade.trim();
    const lessons = CURRICULUM.lessonData[g] || [];
    if (lessons.includes(lessonName)) return lessonName;

    const normTarget = normalizeLessonString(lessonName);
    const targetNum = extractLessonNumber(lessonName);

    for (const l of lessons) {
        if (normalizeLessonString(l) === normTarget) return l;
    }
    if (targetNum) {
        for (const l of lessons) {
            if (extractLessonNumber(l) === targetNum) return l;
        }
    }
    return lessonName.trim();
};

/**
 * Finds all canonical lesson names in CURRICULUM.lessonData[grade] that belong to a Matrix subTopic
 */
export const getLessonsForSubTopic = (grade: string, subTopic: string): string[] => {
    if (!grade || !subTopic) return [];
    const g = grade.trim();
    const gradeNum = Number(g);
    const normSub = normalizeLessonString(subTopic);
    const strippedSub = normalizeLessonString(subTopic.replace(/^\d+\.\s*/, ''));
    if (!normSub) return [];

    // If subTopic is already a lesson name in CURRICULUM.lessonData[g]
    const lessonsInGrade = CURRICULUM.lessonData[g] || [];
    const directLesson = lessonsInGrade.find(
        l => normalizeLessonString(l) === normSub || (extractLessonNumber(subTopic) && extractLessonNumber(l) === extractLessonNumber(subTopic))
    );
    if (directLesson) return [directLesson];

    const matchedLessons: string[] = [];

    // 1. Match via CANONICAL_REQUIREMENTS & KNTT_LESSON_MAPPINGS
    const matchingReqIds = new Set(
        CANONICAL_REQUIREMENTS.filter(req => {
            if (req.grade !== gradeNum) return false;
            const reqNormSub = normalizeLessonString(req.subTopicName);
            const reqStrippedSub = normalizeLessonString(req.subTopicName.replace(/^\d+\.\s*/, ''));
            return reqNormSub === normSub || (strippedSub && reqStrippedSub === strippedSub);
        }).map(req => req.id)
    );

    if (matchingReqIds.size > 0) {
        KNTT_LESSON_MAPPINGS.forEach(mapping => {
            if (mapping.grade === gradeNum && mapping.requirementIds.some(id => matchingReqIds.has(id))) {
                const canonical = resolveCanonicalLessonName(g, mapping.lessonTitle || mapping.lessonNumber);
                if (canonical && !matchedLessons.includes(canonical)) {
                    matchedLessons.push(canonical);
                }
            }
        });
    }

    // 2. Fallback: Match by overlapping YCCĐ text between REQUIREMENTS_DATA and CURRICULUM.criteriaData
    if (matchedLessons.length === 0) {
        const gradeReqs = REQUIREMENTS_DATA[`Lớp ${g}`] || {};
        let rawSubTopicText = '';
        for (const subTopics of Object.values(gradeReqs)) {
            for (const [sKey, sVal] of Object.entries(subTopics as Record<string, string>)) {
                if (
                    normalizeLessonString(sKey) === normSub ||
                    normalizeLessonString(sKey.replace(/^\d+\.\s*/, '')) === strippedSub
                ) {
                    rawSubTopicText = sVal;
                    break;
                }
            }
            if (rawSubTopicText) break;
        }

        if (rawSubTopicText) {
            const subLinesNorm = rawSubTopicText
                .split('\n')
                .map(l => normalizeCriterionText(l))
                .filter(l => l.length > 10);
            const criteriaForGrade = CURRICULUM.criteriaData[g] || {};
            for (const [lessonKey, critMap] of Object.entries(criteriaForGrade)) {
                const allLessonNorms = Object.values(critMap)
                    .flat()
                    .map(c => normalizeCriterionText(c));
                const hasOverlap = allLessonNorms.some(ln =>
                    subLinesNorm.some(sn => sn === ln || (sn.length > 12 && ln.includes(sn)) || (ln.length > 12 && sn.includes(ln)))
                );
                if (hasOverlap && !matchedLessons.includes(lessonKey)) {
                    matchedLessons.push(lessonKey);
                }
            }
        }
    }

    return matchedLessons;
};

/**
 * Finds all Matrix subTopics that correspond to a given lesson
 */
export const getSubTopicsForLesson = (grade: string, lessonName: string): string[] => {
    if (!grade || !lessonName) return [];
    const g = grade.trim();
    const gradeNum = Number(g);
    const canonicalLesson = resolveCanonicalLessonName(g, lessonName);
    const lessonNum = extractLessonNumber(canonicalLesson);
    const normLesson = normalizeLessonString(canonicalLesson);

    const subTopics: string[] = [];

    // 1. Lookup via KNTT_LESSON_MAPPINGS -> CANONICAL_REQUIREMENTS
    const mappings = KNTT_LESSON_MAPPINGS.filter(
        m =>
            m.grade === gradeNum &&
            (normalizeLessonString(m.lessonTitle) === normLesson ||
                (lessonNum && extractLessonNumber(m.lessonNumber) === lessonNum))
    );
    const reqIdSet = new Set(mappings.flatMap(m => m.requirementIds));
    if (reqIdSet.size > 0) {
        CANONICAL_REQUIREMENTS.forEach(req => {
            if (req.grade === gradeNum && reqIdSet.has(req.id) && req.subTopicName) {
                if (!subTopics.includes(req.subTopicName)) {
                    subTopics.push(req.subTopicName);
                }
            }
        });
    }

    // 2. Also match against REQUIREMENTS_DATA['Lớp ' + g] subTopic keys
    const gradeReqs = REQUIREMENTS_DATA[`Lớp ${g}`] || {};
    for (const subTopicMap of Object.values(gradeReqs)) {
        for (const sKey of Object.keys(subTopicMap as object)) {
            if (getLessonsForSubTopic(g, sKey).some(l => normalizeLessonString(l) === normLesson)) {
                if (!subTopics.includes(sKey)) {
                    subTopics.push(sKey);
                }
            }
        }
    }

    return subTopics;
};

/**
 * Resolves the target lesson key(s) when a user edits/adds/deletes a YCCĐ in either QuestionManager or MatrixView
 */
export const resolveTargetLessons = (
    grade: string,
    lessonOrSubTopic: string,
    oldCriterionText?: string,
    store?: GradeCriteriaMap
): string[] => {
    if (!grade || !lessonOrSubTopic) return [];
    const g = grade.trim();
    const lessonsInGrade = CURRICULUM.lessonData[g] || [];
    const normInput = normalizeLessonString(lessonOrSubTopic);
    const inputLessonNum = extractLessonNumber(lessonOrSubTopic);

    // Case 1: Input is directly a lesson (e.g. "Bài 1..." or matches CURRICULUM.lessonData)
    const isDirectLesson =
        lessonsInGrade.some(l => normalizeLessonString(l) === normInput) ||
        Boolean(inputLessonNum);

    if (isDirectLesson) {
        const canonical = resolveCanonicalLessonName(g, lessonOrSubTopic);
        return canonical !== lessonOrSubTopic.trim()
            ? [canonical, lessonOrSubTopic.trim()]
            : [canonical];
    }

    // Case 2: Input is a Matrix subTopic (when row[3] lesson is empty)
    const candidateLessons = getLessonsForSubTopic(g, lessonOrSubTopic);
    if (candidateLessons.length === 0) {
        return [lessonOrSubTopic.trim()];
    }

    // If editing or deleting a specific criterion, narrow down to the candidate lesson(s) that actually contain oldCriterionText
    if (oldCriterionText && candidateLessons.length > 1) {
        const targetNorm = normalizeCriterionText(oldCriterionText);
        const matchingCandidates = candidateLessons.filter(cand => {
            const baseMap = CURRICULUM.criteriaData[g]?.[cand] || {};
            const customMap = store?.[g]?.[cand] || {};
            const allTexts = [
                ...Object.values(baseMap).flat(),
                ...Object.entries(customMap)
                    .filter(([k]) => !k.startsWith('__'))
                    .flatMap(([, v]) => (Array.isArray(v) ? v : []))
            ];
            return allTexts.some(t => {
                const n = normalizeCriterionText(t);
                return (
                    n === targetNorm ||
                    (targetNorm.length > 5 && n.includes(targetNorm)) ||
                    (n.length > 5 && targetNorm.includes(n))
                );
            });
        });
        if (matchingCandidates.length > 0) {
            return matchingCandidates;
        }
    }

    return candidateLessons;
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
 * Recursively harvests criteria from matrixFileSystem directory tree without overwriting custom edits/deletions
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
                    const targetKeys = resolveTargetLessons(effectiveGrade, lessonName, undefined, store);
                    targetKeys.forEach(tKey => {
                        if (!store[effectiveGrade][tKey]) {
                            store[effectiveGrade][tKey] = {};
                        }
                        const deletedList: string[] = store[effectiveGrade][tKey].__deleted || [];
                        Object.entries(parsed).forEach(([lvl, list]) => {
                            const filteredList = list.filter(it => !deletedList.includes(normalizeCriterionText(it)));
                            if (!store[effectiveGrade][tKey][lvl] || store[effectiveGrade][tKey][lvl].length === 0) {
                                if (filteredList.length > 0) {
                                    store[effectiveGrade][tKey][lvl] = filteredList;
                                }
                            } else {
                                const existingNorms = new Set(store[effectiveGrade][tKey][lvl].map(s => normalizeCriterionText(s)));
                                filteredList.forEach(it => {
                                    const n = normalizeCriterionText(it);
                                    if (!existingNorms.has(n)) {
                                        store[effectiveGrade][tKey][lvl].push(it);
                                        existingNorms.add(n);
                                    }
                                });
                            }
                        });
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
        const subTopic = row[2] || matrixData.matrix?.rows?.[idx]?.[2] || '';
        const lessonName = row[3] || matrixData.matrix?.rows?.[idx]?.[3] || '';
        const reqHtml = row[4];
        if ((!lessonName && !subTopic) || !reqHtml) return;

        const grade = detectGradeFromLessonOrContext(lessonName || subTopic, context);
        const parsed = parseYccdHtmlToCriteria(reqHtml);

        if (Object.keys(parsed).length > 0) {
            if (!store[grade]) store[grade] = {};
            const targetKeys = lessonName
                ? resolveTargetLessons(grade, lessonName, undefined, store)
                : getLessonsForSubTopic(grade, subTopic).length === 1
                ? getLessonsForSubTopic(grade, subTopic)
                : [];

            targetKeys.forEach(tKey => {
                if (!store[grade][tKey]) store[grade][tKey] = {};
                const deletedList: string[] = store[grade][tKey].__deleted || [];
                Object.entries(parsed).forEach(([lvl, list]) => {
                    const filteredList = list.filter(it => !deletedList.includes(normalizeCriterionText(it)));
                    if (filteredList.length > 0) {
                        store[grade][tKey][lvl] = filteredList;
                    }
                });
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
 * Hỗ trợ đồng bộ cả dòng Bài học (row[3] = lesson) LẪN dòng Chủ đề con / Nội dung (row[2] = subTopic, row[3] = "")
 */
export const syncCriterionChangeToMatrixFileSystem = (
    grade: string,
    lessonOrSubTopic: string,
    levelCode: string,
    action: 'add' | 'update' | 'delete',
    data: { oldText?: string; newText?: string }
): void => {
    if (typeof window === 'undefined') return;

    const g = (grade || '').trim();
    const targetLessons = resolveTargetLessons(g, lessonOrSubTopic, data.oldText);
    const targetNormLessons = new Set([
        normalizeLessonString(lessonOrSubTopic),
        ...targetLessons.map(l => normalizeLessonString(l))
    ]);
    const targetLessonNums = new Set(
        [extractLessonNumber(lessonOrSubTopic), ...targetLessons.map(l => extractLessonNumber(l))].filter(Boolean) as string[]
    );
    const targetSubTopicsNorm = new Set<string>();
    targetLessons.forEach(l => {
        getSubTopicsForLesson(g, l).forEach(st => {
            targetSubTopicsNorm.add(normalizeLessonString(st));
            targetSubTopicsNorm.add(normalizeLessonString(st.replace(/^\d+\.\s*/, '')));
        });
    });
    if (!extractLessonNumber(lessonOrSubTopic)) {
        targetSubTopicsNorm.add(normalizeLessonString(lessonOrSubTopic));
        targetSubTopicsNorm.add(normalizeLessonString(lessonOrSubTopic.replace(/^\d+\.\s*/, '')));
    }

    const matchesRow = (row: string[], folderGrade?: string): boolean => {
        if (folderGrade && g && folderGrade !== g) return false;
        const rowSubTopic = row[2] || '';
        const rowLesson = row[3] || '';

        if (rowLesson) {
            if (targetNormLessons.has(normalizeLessonString(rowLesson))) return true;
            const rNum = extractLessonNumber(rowLesson);
            if (rNum && targetLessonNums.has(rNum)) return true;
        }

        if (rowSubTopic) {
            const normSub = normalizeLessonString(rowSubTopic);
            const strippedSub = normalizeLessonString(rowSubTopic.replace(/^\d+\.\s*/, ''));
            if (targetSubTopicsNorm.has(normSub) || (strippedSub && targetSubTopicsNorm.has(strippedSub))) {
                return true;
            }
        }

        return false;
    };

    // 1. Đồng bộ vào matrixFileSystem (Bảng ma trận & đặc tả trong Ma Trận Đề Thi)
    try {
        const raw = localStorage.getItem('matrixFileSystem');
        if (raw) {
            const fs = JSON.parse(raw);
            let modified = false;

            const updateInTree = (item: any, currentGrade?: string) => {
                if (!item) return;

                let folderGrade = currentGrade;
                if (item.name) {
                    const m = item.name.match(/(?:Lớp|Khối)\s*(\d+)/i) || item.name.match(/\b([6-9])\b/);
                    if (m && ['6', '7', '8', '9'].includes(m[1])) {
                        folderGrade = m[1];
                    }
                }

                if (item.matrixData?.specifications?.rows && Array.isArray(item.matrixData.specifications.rows)) {
                    item.matrixData.specifications.rows.forEach((row: string[]) => {
                        if (matchesRow(row, folderGrade)) {
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
                    item.children.forEach((child: any) => updateInTree(child, folderGrade));
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
                        const examGrade = exam.grade ? String(exam.grade) : undefined;
                        exam.matrixData.specifications.rows.forEach((row: string[]) => {
                            if (matchesRow(row, examGrade)) {
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
    window.dispatchEvent(new CustomEvent('matrix_filesystem_updated', { detail: { grade: g, lesson: lessonOrSubTopic, levelCode, action } }));
    window.dispatchEvent(new CustomEvent('criteria_updated', { detail: { grade: g, lesson: lessonOrSubTopic, levelCode, action } }));
};

/**
 * Bổ sung YCCĐ mới (từ Quản Lý Câu Hỏi hoặc Bảng Đặc Tả) và đồng bộ 2 chiều
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

    const lvl = getLevelCodeFromTitle(levelCode);
    const prefix = getLevelPrefixNumber(lvl);

    let cleanText = criterionText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim();
    if (!cleanText) {
        cleanText = `Yêu cầu cần đạt mức ${getLevelTitleFromCode(lvl)}`;
    }
    const normNew = normalizeCriterionText(cleanText);

    const targetKeys = resolveTargetLessons(g, lesson, undefined, store);
    if (!targetKeys.includes(lesson.trim())) {
        targetKeys.push(lesson.trim());
    }

    targetKeys.forEach(tKey => {
        if (!store[g][tKey]) store[g][tKey] = {};

        // Nếu mục này từng nằm trong __deleted thì gỡ khỏi __deleted
        if (Array.isArray(store[g][tKey].__deleted)) {
            store[g][tKey].__deleted = store[g][tKey].__deleted.filter(d => d !== normNew);
        }

        const existingMerged = getMergedCriteria(g, tKey, store)?.[lvl] || [];
        const currentList = store[g][tKey][lvl] || [];
        const baseList = [...existingMerged];

        const alreadyExists = baseList.some(item => normalizeCriterionText(item) === normNew);
        if (!alreadyExists) {
            const nextIdx = baseList.length + 1;
            const formatted = `${prefix}.${nextIdx} ${cleanText}`;
            store[g][tKey][lvl] = [...baseList, formatted];
        } else if (currentList.length === 0) {
            store[g][tKey][lvl] = [...baseList];
        }
    });

    saveCustomCriteriaStore(store);

    // Đồng bộ tức thì qua Bảng đặc tả
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'add', { newText: cleanText });

    return getMergedCriteria(g, targetKeys[0] || lesson, store) || {};
};

/**
 * CHỈNH SỬA YCCĐ (từ Quản Lý Câu Hỏi hoặc Bảng Đặc Tả) và đồng bộ 2 chiều
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

    const lvl = getLevelCodeFromTitle(levelCode);
    const prefix = getLevelPrefixNumber(lvl);
    const normOld = normalizeCriterionText(oldCriterionText);
    const cleanNew = newCriterionText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim();

    if (!cleanNew) {
        throw new Error('Nội dung yêu cầu cần đạt không được để trống.');
    }

    const targetKeys = resolveTargetLessons(g, lesson, oldCriterionText, store);
    if (extractLessonNumber(lesson) && !targetKeys.includes(lesson.trim())) {
        targetKeys.push(lesson.trim());
    }

    targetKeys.forEach(tKey => {
        if (!store[g][tKey]) store[g][tKey] = {};

        // Lấy danh sách hiện hành trước khi sửa để giữ nguyên vị trí và mã số (1.1, 1.2...)
        const beforeMergedList = getMergedCriteria(g, tKey, store)?.[lvl] || [];

        // 1. Đánh dấu oldCriterionText vào __deleted để chặn CURRICULUM cơ bản không hiện lại bản cũ
        if (!store[g][tKey].__deleted) {
            store[g][tKey].__deleted = [];
        }
        if (!store[g][tKey].__deleted.includes(normOld)) {
            store[g][tKey].__deleted.push(normOld);
        }

        // Lưu thêm vào __replacements để đồng bộ sang Ma trận khi khởi tạo mới
        const entryAny = store[g][tKey] as any;
        if (!entryAny.__replacements) entryAny.__replacements = {};
        // Nếu normOld là kết quả của một lần sửa trước đó, cập nhật luôn gốc ban đầu
        let foundChain = false;
        for (const [origNorm, prevVal] of Object.entries(entryAny.__replacements as Record<string, string>)) {
            if (normalizeCriterionText(prevVal) === normOld) {
                entryAny.__replacements[origNorm] = cleanNew;
                foundChain = true;
            }
        }
        if (!foundChain) {
            entryAny.__replacements[normOld] = cleanNew;
        }

        // Gỡ nội dung mới khỏi __deleted nếu trước đó từng bị xóa
        const normNew = normalizeCriterionText(cleanNew);
        store[g][tKey].__deleted = store[g][tKey].__deleted.filter(d => d !== normNew || d === normOld);

        // 2. Cập nhật tại chỗ (in-place) trong danh sách của mức độ để giữ nguyên thứ tự
        const workingList = beforeMergedList.length > 0 ? [...beforeMergedList] : [...(store[g][tKey][lvl] || [])];
        const matchIdx = workingList.findIndex(it => {
            const itNorm = normalizeCriterionText(it);
            return (
                itNorm === normOld ||
                (normOld.length > 5 && itNorm.includes(normOld)) ||
                (itNorm.length > 5 && normOld.includes(itNorm))
            );
        });

        if (matchIdx >= 0) {
            const codeMatch = workingList[matchIdx].match(/^(\d+\.\d+)\s/);
            const codePrefix = codeMatch ? codeMatch[1] : `${prefix}.${matchIdx + 1}`;
            workingList[matchIdx] = `${codePrefix} ${cleanNew}`;
            store[g][tKey][lvl] = workingList;
        } else {
            const displayNum = workingList.length + 1;
            const formattedNew = `${prefix}.${displayNum} ${cleanNew}`;
            store[g][tKey][lvl] = [...workingList, formattedNew];
        }
    });

    saveCustomCriteriaStore(store);

    // 3. Đồng bộ cập nhật qua Bảng đặc tả (matrixFileSystem & saved exams)
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'update', {
        oldText: oldCriterionText,
        newText: cleanNew
    });

    return getMergedCriteria(g, targetKeys[0] || lesson, store) || {};
};

/**
 * XÓA YCCĐ (từ Quản Lý Câu Hỏi hoặc Bảng Đặc Tả) và đồng bộ 2 chiều
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

    const lvl = getLevelCodeFromTitle(levelCode);
    const normText = normalizeCriterionText(criterionText);

    const targetKeys = resolveTargetLessons(g, lesson, criterionText, store);
    if (extractLessonNumber(lesson) && !targetKeys.includes(lesson.trim())) {
        targetKeys.push(lesson.trim());
    }

    targetKeys.forEach(tKey => {
        if (!store[g][tKey]) store[g][tKey] = {};
        const beforeMergedList = getMergedCriteria(g, tKey, store)?.[lvl] || [];

        // 1. Ghi nhận vào __deleted để chặn CURRICULUM cơ bản không hiện lại
        if (!store[g][tKey].__deleted) {
            store[g][tKey].__deleted = [];
        }
        if (!store[g][tKey].__deleted.includes(normText)) {
            store[g][tKey].__deleted.push(normText);
        }

        const entryAny = store[g][tKey] as any;
        if (entryAny.__replacements) {
            for (const [origNorm, prevVal] of Object.entries(entryAny.__replacements as Record<string, string>)) {
                if (normalizeCriterionText(prevVal) === normText || origNorm === normText) {
                    if (!store[g][tKey].__deleted.includes(origNorm)) {
                        store[g][tKey].__deleted.push(origNorm);
                    }
                    delete entryAny.__replacements[origNorm];
                }
            }
        }

        // 2. Xóa khỏi danh sách hiện hành
        const baseList = beforeMergedList.length > 0 ? beforeMergedList : (store[g][tKey][lvl] || []);
        store[g][tKey][lvl] = baseList.filter(it => {
            const itNorm = normalizeCriterionText(it);
            return !(
                itNorm === normText ||
                (normText.length > 5 && itNorm.includes(normText)) ||
                (itNorm.length > 5 && normText.includes(itNorm))
            );
        });
    });

    saveCustomCriteriaStore(store);

    // 3. Đồng bộ xóa khỏi Bảng đặc tả (matrixFileSystem & saved exams)
    syncCriterionChangeToMatrixFileSystem(g, lesson, lvl, 'delete', {
        oldText: criterionText
    });

    return getMergedCriteria(g, targetKeys[0] || lesson, store) || {};
};

/**
 * Gets the merged criteria map for a given grade and lesson, combining
 * 1. Base CURRICULUM.criteriaData (loại trừ các mục đã bị xóa và áp dụng __replacements tại chỗ)
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
    const gradeStore = store[g] || {};

    const normTarget = normalizeLessonString(lesson);
    const targetNum = extractLessonNumber(lesson);

    // Tìm tất cả các entry trong store[g] khớp với bài học này (kể cả khác dấu ':' và '.')
    const matchingCustomEntries: CriteriaMap[] = [];
    if (gradeStore[lesson]) {
        matchingCustomEntries.push(gradeStore[lesson]);
    }
    for (const [key, map] of Object.entries(gradeStore)) {
        if (key === lesson) continue;
        if (normalizeLessonString(key) === normTarget || (targetNum && extractLessonNumber(key) === targetNum)) {
            matchingCustomEntries.push(map);
        }
    }

    // Gom danh sách __deleted và __replacements từ tất cả các khóa tương đương của bài học
    const deletedNorms = new Set<string>();
    const replacementsMap: Record<string, string> = {};
    matchingCustomEntries.forEach(entry => {
        if (Array.isArray(entry.__deleted)) {
            entry.__deleted.forEach(d => deletedNorms.add(d));
        }
        const rep = (entry as any).__replacements;
        if (rep && typeof rep === 'object') {
            Object.assign(replacementsMap, rep);
        }
    });

    const isItemDeleted = (text: string) => {
        if (deletedNorms.size === 0) return false;
        const norm = normalizeCriterionText(text);
        return deletedNorms.has(norm);
    };

    // 1. Get Base Criteria from CURRICULUM
    const baseCriteriaForGrade = CURRICULUM.criteriaData[g] || {};
    let baseCriteria: CriteriaMap | undefined = baseCriteriaForGrade[lesson];

    if (!baseCriteria) {
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
            const prefix = getLevelPrefixNumber(lvl);
            const processed: string[] = [];
            list.forEach((item, idx) => {
                const norm = normalizeCriterionText(item);
                if (replacementsMap[norm]) {
                    const codeMatch = item.match(/^(\d+\.\d+)\s/);
                    const codePrefix = codeMatch ? codeMatch[1] : `${prefix}.${idx + 1}`;
                    processed.push(`${codePrefix} ${replacementsMap[norm]}`);
                } else if (!isItemDeleted(item)) {
                    processed.push(item);
                }
            });
            if (processed.length > 0) {
                merged[lvl] = processed;
            }
        });
    }

    // 2. Merge custom criteria into result (excluding internal keys like __deleted, __replacements)
    matchingCustomEntries.forEach(customForLesson => {
        Object.entries(customForLesson).forEach(([lvl, list]) => {
            if (lvl.startsWith('__') || !Array.isArray(list)) return;

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
    });

    return Object.keys(merged).length > 0 ? merged : null;
};

/**
 * Đồng bộ nội dung HTML của một ô Yêu cầu cần đạt trên Bản đặc tả với kho YCCĐ đã chỉnh sửa (CUSTOM_CRITERIA_STORAGE_KEY).
 * Áp dụng cho cả dòng Bài học (lessonName) và dòng Chủ đề con (subTopic).
 */
export const syncSpecHtmlWithCustomStore = (
    htmlContent: string,
    grade: string,
    subTopic: string,
    lessonName?: string,
    customStore?: GradeCriteriaMap
): string => {
    const g = (grade.match(/\d+/)?.[0] || grade || '').trim();
    if (!g) return htmlContent;

    const store = customStore || loadCustomCriteriaStore();
    const gradeStore = store[g];
    if (!gradeStore || Object.keys(gradeStore).length === 0) return htmlContent;

    const targetLessons = lessonName
        ? resolveTargetLessons(g, lessonName, undefined, store)
        : getLessonsForSubTopic(g, subTopic);

    if (targetLessons.length === 0) return htmlContent;

    let updatedHtml = htmlContent || '';

    targetLessons.forEach(tLesson => {
        const normTarget = normalizeLessonString(tLesson);
        const targetNum = extractLessonNumber(tLesson);

        // Tìm mọi entry trong gradeStore khớp với tLesson
        const matchingEntries: CriteriaMap[] = [];
        for (const [k, map] of Object.entries(gradeStore)) {
            if (normalizeLessonString(k) === normTarget || (targetNum && extractLessonNumber(k) === targetNum)) {
                matchingEntries.push(map);
            }
        }
        if (matchingEntries.length === 0) return;

        // Xác định danh sách YCCĐ gốc của bài học này trong CURRICULUM để phân biệt mục mới thêm
        const baseMap = CURRICULUM.criteriaData[g]?.[resolveCanonicalLessonName(g, tLesson)] || {};
        const baseNorms = new Set(
            Object.values(baseMap)
                .flat()
                .map(c => normalizeCriterionText(c))
        );

        matchingEntries.forEach(entry => {
            const repMap: Record<string, string> = (entry as any).__replacements || {};
            const deletedList: string[] = Array.isArray(entry.__deleted) ? entry.__deleted : [];

            // 1. Áp dụng các mục đã chỉnh sửa (__replacements)
            for (const [oldNorm, newClean] of Object.entries(repMap)) {
                updatedHtml = applyCriterionChangeToHtml(updatedHtml, 'NB', 'update', {
                    oldText: oldNorm,
                    newText: newClean
                });
            }

            // 2. Áp dụng các mục đã xóa (__deleted mà không nằm trong __replacements)
            deletedList.forEach(delNorm => {
                if (!repMap[delNorm]) {
                    updatedHtml = applyCriterionChangeToHtml(updatedHtml, 'NB', 'delete', {
                        oldText: delNorm
                    });
                }
            });

            // 3. Áp dụng các mục mới bổ sung
            const replacementValuesNorm = new Set(Object.values(repMap).map(v => normalizeCriterionText(v)));
            Object.entries(entry).forEach(([lvl, list]) => {
                if (lvl.startsWith('__') || !Array.isArray(list)) return;
                list.forEach(item => {
                    const itemNorm = normalizeCriterionText(item);
                    if (deletedList.includes(itemNorm)) return;
                    if (baseNorms.has(itemNorm) || replacementValuesNorm.has(itemNorm)) return;
                    updatedHtml = applyCriterionChangeToHtml(updatedHtml, lvl, 'add', {
                        newText: item
                    });
                });
            });
        });
    });

    return updatedHtml;
};
