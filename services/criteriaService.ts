import { CURRICULUM } from '../data/curriculum';
import { CANONICAL_REQUIREMENTS, KNTT_LESSON_MAPPINGS } from '../data/curriculum/index';
import { REQUIREMENTS_DATA } from '../data/matrixConstants';
import { MatrixData } from '../types';
import { loadQuestionBank, saveQuestionBank } from './storage/questionBankStorage';

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
        .replace(/[:.\-–_(),;/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

/**
 * Checks if two criterion strings represent the same semantic requirement
 * (handles minor wording differences between CURRICULUM and REQUIREMENTS_DATA, e.g., "tìm kiếm được thông tin" vs "tìm kiếm thông tin", "thông qua" vs "qua", "nhiệm vụ học tập" vs "nhiệm vụ")
 */
export const areCriteriaSemanticallySame = (a: string, b: string): boolean => {
    const na = normalizeCriterionText(a);
    const nb = normalizeCriterionText(b);
    if (na === nb) return true;
    if (!na || !nb) return false;

    const canonicalize = (s: string) =>
        s
            .replace(/được lưu trữ với dung lượng khổng lồ bởi nhiều tổ chức và cá nhân/g, 'dung lượng lớn')
            .replace(/có tính bản quyền/g, 'có bản quyền')
            .replace(/có độ tin cậy rất khác nhau/g, 'độ tin cậy khác nhau')
            .replace(/có các công cụ tìm kiếm/g, 'có công cụ tìm kiếm')
            .replace(/và xử lí hiệu quả/g, 'xử lí hiệu quả')
            .replace(/thông qua/g, 'qua')
            .replace(/nhiệm vụ học tập/g, 'nhiệm vụ')
            .replace(/tìm kiếm được/g, 'tìm kiếm')
            .replace(/sử dụng được/g, 'sử dụng')
            .replace(/thực hiện được/g, 'thực hiện')
            .replace(/giải thích được/g, 'giải thích')
            .replace(/nêu được ví dụ minh hoạ/g, 'nêu ví dụ minh hoạ')
            .replace(/có ví dụ minh hoạ/g, 'nêu ví dụ minh hoạ')
            .replace(/nêu được/g, 'nêu')
            .replace(/trình bày được/g, 'trình bày')
            .replace(/nhận biết được/g, 'nhận biết')
            .replace(/biết được/g, 'biết')
            .replace(/xác định được/g, 'xác định')
            .replace(/mô tả được/g, 'mô tả')
            .replace(/thể hiện được/g, 'thể hiện')
            .replace(/lựa chọn được/g, 'lựa chọn')
            .replace(/sao chép được/g, 'sao chép')
            .replace(/tạo được/g, 'tạo')
            .replace(/\s+/g, ' ')
            .trim();

    const ca = canonicalize(na);
    const cb = canonicalize(nb);
    if (ca === cb) return true;
    if (ca.length > 15 && cb.length > 15 && (ca.includes(cb) || cb.includes(ca))) return true;
    if (ca.length >= 35 && cb.length >= 35 && ca.slice(0, 35) === cb.slice(0, 35)) return true;
    return false;
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

const _canonicalLessonCache = new Map<string, string>();

/**
 * Resolves a lesson name to its canonical key in CURRICULUM.lessonData[grade] if one exists
 */
export const resolveCanonicalLessonName = (grade: string, lessonName: string): string => {
    if (!grade || !lessonName) return lessonName || '';
    const g = grade.trim();
    const cacheKey = `${g}::${lessonName}`;
    const cached = _canonicalLessonCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const lessons = CURRICULUM.lessonData[g] || [];
    if (lessons.includes(lessonName)) {
        _canonicalLessonCache.set(cacheKey, lessonName);
        return lessonName;
    }

    const normTarget = normalizeLessonString(lessonName);
    const targetNum = extractLessonNumber(lessonName);

    for (const l of lessons) {
        if (normalizeLessonString(l) === normTarget) {
            _canonicalLessonCache.set(cacheKey, l);
            return l;
        }
    }
    if (targetNum) {
        for (const l of lessons) {
            if (extractLessonNumber(l) === targetNum) {
                _canonicalLessonCache.set(cacheKey, l);
                return l;
            }
        }
    }
    const res = lessonName.trim();
    _canonicalLessonCache.set(cacheKey, res);
    return res;
};

const _lessonsForSubTopicCache = new Map<string, string[]>();

/**
 * Finds all canonical lesson names in CURRICULUM.lessonData[grade] that belong to a Matrix subTopic
 */
export const getLessonsForSubTopic = (grade: string, subTopic: string): string[] => {
    if (!grade || !subTopic) return [];
    const g = grade.trim();
    const cacheKey = `${g}::${subTopic}`;
    const cached = _lessonsForSubTopicCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const gradeNum = Number(g);
    const normSub = normalizeLessonString(subTopic);
    const strippedSub = normalizeLessonString(subTopic.replace(/^\d+\.\s*/, ''));
    if (!normSub) return [];

    // If subTopic is already a lesson name in CURRICULUM.lessonData[g]
    const lessonsInGrade = CURRICULUM.lessonData[g] || [];
    const directLesson = lessonsInGrade.find(
        l => normalizeLessonString(l) === normSub || (extractLessonNumber(subTopic) && extractLessonNumber(l) === extractLessonNumber(subTopic))
    );
    if (directLesson) {
        const res = [directLesson];
        _lessonsForSubTopicCache.set(cacheKey, res);
        return res;
    }

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

    _lessonsForSubTopicCache.set(cacheKey, matchedLessons);
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

let _lastRawCustomStr: string | null = null;
let _lastMfsRawStr: string | null = null;
let _cachedCustomStore: GradeCriteriaMap | null = null;

export const invalidateCriteriaStoreCache = () => {
    _lastRawCustomStr = null;
    _lastMfsRawStr = null;
    _cachedCustomStore = null;
};

const isFakePlaceholderCriterion = (text: string): boolean => {
    const norm = normalizeCriterionText(text);
    return (
        norm.startsWith('nêu được các khái niệm nội dung cơ bản thuộc') ||
        norm.startsWith('giải thích và phân biệt được các nội dung trọng tâm thuộc') ||
        norm.startsWith('vận dụng được kiến thức thuộc')
    );
};

const sanitizeLoadedCriteriaStore = (store: GradeCriteriaMap): void => {
    for (const [g, gradeMap] of Object.entries(store)) {
        if (!gradeMap || typeof gradeMap !== 'object') continue;
        const baseForGrade = CURRICULUM.criteriaData[g] || {};

        for (const [lessonKey, entry] of Object.entries(gradeMap)) {
            if (!entry || typeof entry !== 'object') continue;

            const canonicalLesson = resolveCanonicalLessonName(g, lessonKey);
            const baseMap = baseForGrade[canonicalLesson];
            const entryAny = entry as any;
            const replacementsMap: Record<string, string> =
                entryAny.__replacements && typeof entryAny.__replacements === 'object' ? entryAny.__replacements : {};

            // 1. Loại bỏ các chuỗi YCCĐ giả lập từng bị lưu trong __deleted,
            //    hoặc bản trùng từ REQUIREMENTS_DATA cũ ("được lưu trữ với dung lượng khổng lồ") mà người dùng từng xóa để khử trùng lặp,
            //    đồng thời khử trùng lặp trong __deleted
            if (Array.isArray(entry.__deleted)) {
                const dedupedDeleted: string[] = [];
                entry.__deleted.forEach(d => {
                    if (!d || isFakePlaceholderCriterion(d)) return;
                    const normD = normalizeCriterionText(d);
                    if (!normD) return;
                    if (normD.includes('được lưu trữ với dung lượng khổng lồ')) return;
                    if (!dedupedDeleted.some(ex => ex === normD || areCriteriaSemanticallySame(ex, normD))) {
                        dedupedDeleted.push(normD);
                    }
                });
                entry.__deleted = dedupedDeleted;
            }

            const deletedList: string[] = Array.isArray(entry.__deleted) ? entry.__deleted : [];

            // 2. Khử trùng lặp ngữ nghĩa (giữa CURRICULUM và REQUIREMENTS_DATA cũ) và lọc bỏ các mục đã nằm trong __deleted
            for (const [lvl, list] of Object.entries(entry)) {
                if (lvl.startsWith('__') || !Array.isArray(list)) continue;
                const baseForLvl = baseMap?.[lvl] || [];
                const deduped: string[] = [];
                list.forEach(it => {
                    if (!it || isFakePlaceholderCriterion(it)) return;
                    const normIt = normalizeCriterionText(it);
                    if (deletedList.some(d => d === normIt || areCriteriaSemanticallySame(d, it))) return;

                    // Nếu mục này tương đương ngữ nghĩa với một YCCĐ gốc trong CURRICULUM (và không phải bản sửa đổi chủ đích trong __replacements),
                    // chuẩn hóa về đúng văn bản chuẩn của CURRICULUM để không bao giờ sinh ra 2 bản trùng lặp
                    const matchedBase = baseForLvl.find(b => areCriteriaSemanticallySame(b, it));
                    const isCustomReplaced = Object.values(replacementsMap).some(
                        rv => normalizeCriterionText(rv) === normIt
                    );
                    const canonicalItem = matchedBase && !isCustomReplaced ? matchedBase : it;

                    if (!deduped.some(ex => areCriteriaSemanticallySame(ex, canonicalItem))) {
                        deduped.push(canonicalItem);
                    }
                });
                entry[lvl] = deduped;
            }

            // 3. Làm sạch __deletedCodes: Nếu bài học thuộc CURRICULUM.criteriaData, chỉ giữ mã code trong __deletedCodes
            // khi nội dung YCCĐ ứng với mã đó trong CURRICULUM thực sự nằm trong __deleted
            if (baseMap && Array.isArray(entryAny.__deletedCodes)) {
                entryAny.__deletedCodes = entryAny.__deletedCodes.filter((rawCode: string) => {
                    const pureCode = String(rawCode).includes(':') ? String(rawCode).split(':')[1] : String(rawCode);
                    const baseItemWithCode = Object.values(baseMap)
                        .flat()
                        .find(b => b.trim().startsWith(`${pureCode} `));
                    if (!baseItemWithCode) return true;
                    const normBase = normalizeCriterionText(baseItemWithCode);
                    return deletedList.some(d => d === normBase || areCriteriaSemanticallySame(d, baseItemWithCode));
                });
            }
        }
    }
};

/**
 * Loads custom criteria store from localStorage (with in-memory memoization when localStorage strings are unchanged)
 */
export const loadCustomCriteriaStore = (): GradeCriteriaMap => {
    try {
        const raw = localStorage.getItem(CUSTOM_CRITERIA_STORAGE_KEY);
        const mfsRaw = localStorage.getItem('matrixFileSystem');

        if (_cachedCustomStore !== null && raw === _lastRawCustomStr && mfsRaw === _lastMfsRawStr) {
            return _cachedCustomStore;
        }

        const store: GradeCriteriaMap = raw ? JSON.parse(raw) : {};
        sanitizeLoadedCriteriaStore(store);

        const sanitizedJson = JSON.stringify(store);
        if (raw && sanitizedJson !== raw) {
            try {
                localStorage.setItem(CUSTOM_CRITERIA_STORAGE_KEY, sanitizedJson);
            } catch (e) {
                // ignore storage write error during read
            }
        }

        _lastRawCustomStr = localStorage.getItem(CUSTOM_CRITERIA_STORAGE_KEY);
        _lastMfsRawStr = mfsRaw;
        _cachedCustomStore = store;
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
            const subTopic = row[2] || item.matrixData.matrix?.rows?.[idx]?.[2] || '';
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
                        const canonicalLesson = resolveCanonicalLessonName(effectiveGrade, tKey);
                        const baseMap = CURRICULUM.criteriaData[effectiveGrade]?.[canonicalLesson] || {};
                        const baseFlat = Object.values(baseMap).flat();

                        // Also collect default REQUIREMENTS_DATA lines for this subTopic so we don't accidentally treat default subTopic lines from another lesson as custom additions
                        const gradeReqs = REQUIREMENTS_DATA[`Lớp ${effectiveGrade}`] || {};
                        const defaultReqLines: string[] = [];
                        for (const subTopics of Object.values(gradeReqs)) {
                            for (const [sKey, sVal] of Object.entries(subTopics as Record<string, string>)) {
                                if (!subTopic || normalizeLessonString(sKey) === normalizeLessonString(subTopic)) {
                                    defaultReqLines.push(...String(sVal || '').split('\n'));
                                }
                            }
                        }

                        Object.entries(parsed).forEach(([lvl, list]) => {
                            const prefix = getLevelPrefixNumber(lvl);
                            const filteredList = list.filter(it => {
                                if (deletedList.some(d => areCriteriaSemanticallySame(d, it))) return false;
                                const normIt = normalizeCriterionText(it);
                                if (
                                    normIt.startsWith('nêu được các khái niệm nội dung cơ bản thuộc') ||
                                    normIt.startsWith('giải thích và phân biệt được các nội dung trọng tâm thuộc') ||
                                    normIt.startsWith('vận dụng được kiến thức thuộc')
                                ) {
                                    return false;
                                }
                                // If lesson is in CURRICULUM, ignore lines that come from REQUIREMENTS_DATA but are not in this lesson's baseMap
                                if (baseFlat.length > 0) {
                                    const inBase = baseFlat.some(b => areCriteriaSemanticallySame(b, it));
                                    const inDefaultReq = defaultReqLines.some(r => areCriteriaSemanticallySame(r, it));
                                    if (!inBase && inDefaultReq) return false;
                                }
                                return true;
                            });
                            if (!store[effectiveGrade][tKey][lvl] || store[effectiveGrade][tKey][lvl].length === 0) {
                                // Only populate if lesson has no base criteria in CURRICULUM or has genuinely new custom items
                                const baseForLvl = baseMap[lvl] || [];
                                const newCustomItems = filteredList.filter(
                                    it => !baseForLvl.some(b => areCriteriaSemanticallySame(b, it))
                                );
                                if (newCustomItems.length > 0) {
                                    const combined = [...baseForLvl.filter(b => !deletedList.some(d => areCriteriaSemanticallySame(d, b)))];
                                    newCustomItems.forEach(it => {
                                        const clean = it.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
                                        const nextIdx = combined.length + 1;
                                        combined.push(`${prefix}.${nextIdx} ${clean}`);
                                    });
                                    store[effectiveGrade][tKey][lvl] = combined;
                                }
                            } else {
                                filteredList.forEach(it => {
                                    const isDup =
                                        store[effectiveGrade][tKey][lvl].some(ex => areCriteriaSemanticallySame(ex, it)) ||
                                        (baseMap[lvl] || []).some(ex => areCriteriaSemanticallySame(ex, it));
                                    if (!isDup) {
                                        const clean = it.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
                                        const nextIdx = store[effectiveGrade][tKey][lvl].length + 1;
                                        store[effectiveGrade][tKey][lvl].push(`${prefix}.${nextIdx} ${clean}`);
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
        invalidateCriteriaStoreCache();
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
                const canonicalLesson = resolveCanonicalLessonName(grade, tKey);
                const baseMap = CURRICULUM.criteriaData[grade]?.[canonicalLesson] || {};
                const baseFlat = Object.values(baseMap).flat();

                const gradeReqs = REQUIREMENTS_DATA[`Lớp ${grade}`] || {};
                const defaultReqLines: string[] = [];
                for (const subTopics of Object.values(gradeReqs)) {
                    for (const [sKey, sVal] of Object.entries(subTopics as Record<string, string>)) {
                        if (!subTopic || normalizeLessonString(sKey) === normalizeLessonString(subTopic)) {
                            defaultReqLines.push(...String(sVal || '').split('\n'));
                        }
                    }
                }

                Object.entries(parsed).forEach(([lvl, list]) => {
                    const prefix = getLevelPrefixNumber(lvl);
                    const filteredList = list.filter(it => {
                        if (deletedList.some(d => areCriteriaSemanticallySame(d, it))) return false;
                        const normIt = normalizeCriterionText(it);
                        if (
                            normIt.startsWith('nêu được các khái niệm nội dung cơ bản thuộc') ||
                            normIt.startsWith('giải thích và phân biệt được các nội dung trọng tâm thuộc') ||
                            normIt.startsWith('vận dụng được kiến thức thuộc')
                        ) {
                            return false;
                        }
                        if (baseFlat.length > 0) {
                            const inBase = baseFlat.some(b => areCriteriaSemanticallySame(b, it));
                            const inDefaultReq = defaultReqLines.some(r => areCriteriaSemanticallySame(r, it));
                            if (!inBase && inDefaultReq) return false;
                        }
                        return true;
                    });
                    if (filteredList.length > 0) {
                        const existingList = store[grade][tKey][lvl] || [];
                        const baseForLvl = baseMap[lvl] || [];
                        if (existingList.length === 0) {
                            const newCustomItems = filteredList.filter(
                                it => !baseForLvl.some(b => areCriteriaSemanticallySame(b, it))
                            );
                            if (newCustomItems.length > 0) {
                                const combined = [...baseForLvl.filter(b => !deletedList.some(d => areCriteriaSemanticallySame(d, b)))];
                                newCustomItems.forEach(it => {
                                    const clean = it.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
                                    const nextIdx = combined.length + 1;
                                    combined.push(`${prefix}.${nextIdx} ${clean}`);
                                });
                                store[grade][tKey][lvl] = combined;
                            }
                        } else {
                            filteredList.forEach(it => {
                                const isDup =
                                    store[grade][tKey][lvl].some(ex => areCriteriaSemanticallySame(ex, it)) ||
                                    baseForLvl.some(ex => areCriteriaSemanticallySame(ex, it));
                                if (!isDup) {
                                    const clean = it.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
                                    const nextIdx = store[grade][tKey][lvl].length + 1;
                                    store[grade][tKey][lvl].push(`${prefix}.${nextIdx} ${clean}`);
                                }
                            });
                        }
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
    let sections = parseYccdSections(currentHtml);
    const targetTitle = getLevelTitleFromCode(levelCode).trim().toLowerCase();
    const targetNormOld = data.oldText ? normalizeCriterionText(data.oldText) : '';
    const cleanNew = data.newText 
        ? data.newText.trim().replace(/^[\s–\-*•]+/, '').replace(/^\d+\.\d+\s*/, '').trim() 
        : '';

    let secIdx = sections.findIndex(s => s.levelTitle.trim().toLowerCase() === targetTitle);

    const isItemMatchOld = (itemText: string): boolean => {
        if (!targetNormOld) return false;
        const itemNorm = normalizeCriterionText(itemText);
        if (
            itemNorm === targetNormOld ||
            (targetNormOld.length > 5 && itemNorm.includes(targetNormOld)) ||
            (itemNorm.length > 5 && targetNormOld.includes(itemNorm))
        ) {
            return true;
        }
        return areCriteriaSemanticallySame(itemText, data.oldText || '');
    };

    if (action === 'delete') {
        let deleted = false;
        if (secIdx !== -1) {
            const beforeCount = sections[secIdx].items.length;
            sections[secIdx].items = sections[secIdx].items.filter(it => !isItemMatchOld(it.text));
            if (sections[secIdx].items.length < beforeCount) {
                deleted = true;
            }
        }
        if (!deleted) {
            for (const s of sections) {
                s.items = s.items.filter(it => !isItemMatchOld(it.text));
            }
        }
        // Remove any level section that now has 0 items
        sections = sections.filter(s => s.items.length > 0);
    } else if (action === 'update') {
        let updated = false;
        if (secIdx !== -1) {
            sections[secIdx].items.forEach(it => {
                if (isItemMatchOld(it.text)) {
                    it.text = `– ${cleanNew}`;
                    updated = true;
                }
            });
        }
        // Fallback: search across all sections if not in primary level
        if (!updated) {
            for (const s of sections) {
                s.items.forEach(it => {
                    if (isItemMatchOld(it.text)) {
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
            const alreadyExists = sections[secIdx].items.some(it => areCriteriaSemanticallySame(it.text, cleanNew));
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
    const store = loadCustomCriteriaStore();
    const targetLessons = resolveTargetLessons(g, lessonOrSubTopic, data.oldText, store);
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

    const matchesLessonName = (lessonStr: string): boolean => {
        if (!lessonStr) return false;
        if (targetNormLessons.has(normalizeLessonString(lessonStr))) return true;
        const rNum = extractLessonNumber(lessonStr);
        if (rNum && targetLessonNums.has(rNum)) return true;
        return false;
    };

    const matchesRow = (row: string[], folderGrade?: string): boolean => {
        if (folderGrade && g && folderGrade !== g) return false;
        const rowSubTopic = row[2] || '';
        const rowLesson = row[3] || '';

        if (rowLesson && matchesLessonName(rowLesson)) {
            return true;
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

    // 1. Đồng bộ vào matrixFileSystem (Bảng ma trận & đặc tả + lọc lại các file câu hỏi đã upload trong Ma Trận Đề Thi)
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

                // Nếu là file câu hỏi đã upload trong thư mục chủ đề con và đang xóa YCCĐ -> lọc bỏ câu hỏi thuộc YCCĐ đã xóa
                if (action === 'delete' && item.type === 'file' && item.content) {
                    const effGrade = folderGrade || g;
                    if (!folderGrade || !g || folderGrade === g) {
                        const fileLesson = item.content?.info?.lesson || item.content?.thongTinChung?.bai || item.name?.replace('.json', '') || '';
                        if (matchesLessonName(fileLesson)) {
                            if (Array.isArray(item.content.questions)) {
                                const beforeLen = item.content.questions.length;
                                item.content.questions = filterQuestionsByActiveCriteria(item.content.questions, effGrade, fileLesson, store).valid;
                                if (item.content.questions.length !== beforeLen) modified = true;
                            }
                            if (Array.isArray(item.content.tracNghiem)) {
                                const beforeLen = item.content.tracNghiem.length;
                                item.content.tracNghiem = filterQuestionsByActiveCriteria(item.content.tracNghiem, effGrade, fileLesson, store).valid;
                                if (item.content.tracNghiem.length !== beforeLen) modified = true;
                            }
                            if (Array.isArray(item.content.tuLuan)) {
                                const beforeLen = item.content.tuLuan.length;
                                item.content.tuLuan = filterQuestionsByActiveCriteria(item.content.tuLuan, effGrade, fileLesson, store).valid;
                                if (item.content.tuLuan.length !== beforeLen) modified = true;
                            }
                        }
                    }
                }

                if (Array.isArray(item.children)) {
                    item.children.forEach((child: any) => updateInTree(child, folderGrade));
                }

                if (item.matrixData?.specifications?.rows && Array.isArray(item.matrixData.specifications.rows)) {
                    item.matrixData.specifications.rows.forEach((row: string[], rIdx: number) => {
                        if (matchesRow(row, folderGrade)) {
                            const curHtml = row[4] || '';
                            const newHtml = applyCriterionChangeToHtml(curHtml, levelCode, action, data);
                            if (newHtml !== curHtml) {
                                row[4] = newHtml;
                                modified = true;
                            }

                            // Nếu xóa hết YCCĐ của mức độ trên dòng này thì cập nhật lại availableCounts
                            if (action === 'delete' && item.matrixData.availableCounts?.[rIdx]) {
                                const rowLesson = row[3] || item.matrixData.matrix?.rows?.[rIdx]?.[3] || '';
                                const effGrade = folderGrade || g;
                                if (rowLesson && effGrade) {
                                    const merged = getMergedCriteria(effGrade, rowLesson, store);
                                    (['NB', 'TH', 'VD', 'VDC'] as const).forEach(lKey => {
                                        if (!merged?.[lKey] || merged[lKey].length === 0) {
                                            if (
                                                item.matrixData.availableCounts[rIdx][lKey]?.TN > 0 ||
                                                item.matrixData.availableCounts[rIdx][lKey]?.TL > 0
                                            ) {
                                                item.matrixData.availableCounts[rIdx][lKey] = { TN: 0, TL: 0 };
                                                modified = true;
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    });
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
            store[g][tKey].__deleted = store[g][tKey].__deleted.filter(d => !areCriteriaSemanticallySame(d, cleanText) && d !== normNew);
        }

        const existingMerged = getMergedCriteria(g, tKey, store)?.[lvl] || [];
        const currentList = store[g][tKey][lvl] || [];
        const baseList = [...existingMerged];

        const alreadyExists = baseList.some(item => areCriteriaSemanticallySame(item, cleanText));
        if (!alreadyExists) {
            // Find next sub-index that doesn't collide with existing codes
            const usedSubNums = baseList
                .map(it => {
                    const m = it.match(/^\d+\.(\d+)\s/);
                    return m ? parseInt(m[1], 10) : 0;
                })
                .filter(n => n > 0);
            const nextIdx = usedSubNums.length > 0 ? Math.max(...usedSubNums) + 1 : baseList.length + 1;
            const newCode = `${prefix}.${nextIdx}`;
            const entryAny = store[g][tKey] as any;
            if (Array.isArray(entryAny.__deletedCodes)) {
                entryAny.__deletedCodes = entryAny.__deletedCodes.filter((c: string) => c !== newCode && c !== `${lvl}:${newCode}`);
            }
            const formatted = `${newCode} ${cleanText}`;
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
        let foundChain = false;
        for (const [origNorm, prevVal] of Object.entries(entryAny.__replacements as Record<string, string>)) {
            if (normalizeCriterionText(prevVal) === normOld || areCriteriaSemanticallySame(prevVal, oldCriterionText)) {
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
                areCriteriaSemanticallySame(it, oldCriterionText) ||
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
    const explicitCodeMatch = criterionText.trim().match(/^(\d+\.\d+)\b/);
    const explicitCode = explicitCodeMatch ? explicitCodeMatch[1] : '';

    const targetKeys = resolveTargetLessons(g, lesson, criterionText, store);
    if (extractLessonNumber(lesson) && !targetKeys.includes(lesson.trim())) {
        targetKeys.push(lesson.trim());
    }

    targetKeys.forEach(tKey => {
        if (!store[g][tKey]) store[g][tKey] = {};
        const beforeMergedList = getMergedCriteria(g, tKey, store)?.[lvl] || [];

        // Tìm mã code của mục bị xóa nếu người dùng truyền text không kèm mã (ví dụ xóa từ Bảng đặc tả)
        let detectedCode = explicitCode;
        if (!detectedCode) {
            const matchedItem = beforeMergedList.find(it => areCriteriaSemanticallySame(it, criterionText));
            const m = matchedItem?.match(/^(\d+\.\d+)\b/);
            if (m) detectedCode = m[1];
        }

        // 1. Ghi nhận vào __deleted và __deletedCodes để chặn CURRICULUM cơ bản hoặc file upload cũ không hiện lại
        if (!store[g][tKey].__deleted) {
            store[g][tKey].__deleted = [];
        }
        if (!store[g][tKey].__deleted.includes(normText)) {
            store[g][tKey].__deleted.push(normText);
        }

        const entryAny = store[g][tKey] as any;
        if (detectedCode) {
            if (!Array.isArray(entryAny.__deletedCodes)) {
                entryAny.__deletedCodes = [];
            }
            if (!entryAny.__deletedCodes.includes(detectedCode)) {
                entryAny.__deletedCodes.push(detectedCode);
            }
            if (!entryAny.__deletedCodes.includes(`${lvl}:${detectedCode}`)) {
                entryAny.__deletedCodes.push(`${lvl}:${detectedCode}`);
            }
        }

        if (entryAny.__replacements) {
            for (const [origNorm, prevVal] of Object.entries(entryAny.__replacements as Record<string, string>)) {
                if (
                    normalizeCriterionText(prevVal) === normText ||
                    origNorm === normText ||
                    areCriteriaSemanticallySame(prevVal, criterionText)
                ) {
                    if (!store[g][tKey].__deleted.includes(origNorm)) {
                        store[g][tKey].__deleted.push(origNorm);
                    }
                    delete entryAny.__replacements[origNorm];
                }
            }
        }

        // 2. Xóa khỏi danh sách hiện hành (giữ nguyên mã số của các mục còn lại, không đánh số đè lên mã đã xóa)
        const baseList = beforeMergedList.length > 0 ? beforeMergedList : (store[g][tKey][lvl] || []);
        store[g][tKey][lvl] = baseList.filter(it => {
            const itNorm = normalizeCriterionText(it);
            const itCodeMatch = it.match(/^(\d+\.\d+)\b/);
            if (detectedCode && itCodeMatch && itCodeMatch[1] === detectedCode) {
                return false;
            }
            return !(
                itNorm === normText ||
                areCriteriaSemanticallySame(it, criterionText) ||
                (normText.length > 5 && itNorm.includes(normText)) ||
                (itNorm.length > 5 && normText.includes(itNorm))
            );
        });
    });

    saveCustomCriteriaStore(store);

    // 3. Đồng bộ xóa câu hỏi thuộc YCCĐ đã xóa khỏi Ngân hàng câu hỏi lưu trữ (questionBankStorage)
    try {
        const bankRes = loadQuestionBank();
        if (bankRes.success && Array.isArray(bankRes.data) && bankRes.data.length > 0) {
            const { valid, removedCount } = filterQuestionsByActiveCriteria(bankRes.data, undefined, undefined, store);
            if (removedCount > 0) {
                saveQuestionBank(valid, { force: true });
            }
        }
    } catch (e) {
        console.error('[criteriaService] Error filtering questionBank after criterion deletion:', e);
    }

    // 4. Đồng bộ xóa khỏi Bảng đặc tả & các file JSON trong matrixFileSystem / saved exams
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

    const g = (grade.match(/\d+/)?.[0] || grade || '').trim();
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

    // Gom danh sách __deleted, __deletedCodes và __replacements từ tất cả các khóa tương đương của bài học
    const deletedNorms = new Set<string>();
    const deletedCodes = new Set<string>();
    const replacementsMap: Record<string, string> = {};
    matchingCustomEntries.forEach(entry => {
        if (Array.isArray(entry.__deleted)) {
            entry.__deleted.forEach(d => deletedNorms.add(d));
        }
        const delCodes = (entry as any).__deletedCodes;
        if (Array.isArray(delCodes)) {
            delCodes.forEach((c: string) => deletedCodes.add(c));
        }
        const rep = (entry as any).__replacements;
        if (rep && typeof rep === 'object') {
            Object.assign(replacementsMap, rep);
        }
    });

    const isItemDeleted = (text: string, lvl?: string) => {
        const norm = normalizeCriterionText(text);
        if (Object.values(replacementsMap).some(rv => normalizeCriterionText(rv) === norm)) {
            return false;
        }
        // Nếu mục YCCĐ chỉ có mã số ngắn (không kèm nội dung mô tả) thì kiểm tra theo deletedCodes
        if (norm.length <= 5) {
            const codeMatch = text.trim().match(/^(\d+\.\d+)\b/);
            if (codeMatch && deletedCodes.size > 0) {
                const code = codeMatch[1];
                if (deletedCodes.has(code) || (lvl && deletedCodes.has(`${lvl}:${code}`))) {
                    return true;
                }
            }
        }
        if (deletedNorms.size === 0) return false;
        if (deletedNorms.has(norm)) return true;
        return Array.from(deletedNorms).some(d => areCriteriaSemanticallySame(d, text));
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
                const matchedRepKey = Object.keys(replacementsMap).find(
                    rk => rk === norm || areCriteriaSemanticallySame(rk, item)
                );
                if (matchedRepKey && replacementsMap[matchedRepKey]) {
                    const codeMatch = item.match(/^(\d+\.\d+)\s/);
                    const codePrefix = codeMatch ? codeMatch[1] : `${prefix}.${idx + 1}`;
                    processed.push(`${codePrefix} ${replacementsMap[matchedRepKey]}`);
                } else if (!isItemDeleted(item, lvl)) {
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

            const validList = list.filter(item => !isItemDeleted(item, lvl));
            if (!merged[lvl]) {
                if (validList.length > 0) merged[lvl] = [...validList];
            } else {
                validList.forEach(item => {
                    const isDup = merged[lvl].some(ex => areCriteriaSemanticallySame(ex, item));
                    if (!isDup) {
                        merged[lvl].push(item);
                    }
                });
            }
        });
    });

    // 3. Đảm bảo mã đánh số (1.1, 1.2...; 2.1, 2.2...; 3.1, 3.2...) trong cùng một mức độ luôn duy nhất,
    // giữ nguyên mã của các mục hợp lệ (ví dụ khi xóa 1.1 thì 1.2 vẫn giữ nguyên là 1.2, không bị đổi thành 1.1)
    Object.entries(merged).forEach(([lvl, list]) => {
        if (!Array.isArray(list) || list.length === 0) return;
        const prefix = getLevelPrefixNumber(lvl);
        const usedCodes = new Set<string>();
        let maxSubNum = 0;

        list.forEach(item => {
            const m = item.match(/^(\d+)\.(\d+)\s/);
            if (m) {
                const sub = parseInt(m[2], 10);
                if (sub > maxSubNum) maxSubNum = sub;
            }
        });

        merged[lvl] = list.map(item => {
            const m = item.match(/^(\d+\.\d+)\s/);
            if (m && !usedCodes.has(m[1])) {
                usedCodes.add(m[1]);
                return item;
            }
            const clean = item.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
            let candidateIdx = 1;
            while (
                usedCodes.has(`${prefix}.${candidateIdx}`) ||
                deletedCodes.has(`${prefix}.${candidateIdx}`) ||
                deletedCodes.has(`${lvl}:${prefix}.${candidateIdx}`)
            ) {
                candidateIdx++;
            }
            const newCode = `${prefix}.${candidateIdx}`;
            usedCodes.add(newCode);
            return `${newCode} ${clean}`;
        });
    });

    return Object.keys(merged).length > 0 ? merged : null;
};

/**
 * Kiểm tra một câu hỏi (khi upload JSON / nhập hàng loạt / đồng bộ) có thuộc YCCĐ hợp lệ hiện có của bài học hay không.
 * Nếu YCCĐ đó đã bị xóa trên "Tạo bài tập/quản lý câu hỏi" (hoặc bài học không có YCCĐ đó) -> trả về false (không đưa vào).
 */
interface LessonValidationMeta {
    isKnownLesson: boolean;
    hasAnyCriteria: boolean;
    deletedNorms: Set<string>;
    deletedCodes: Set<string>;
    allActiveByLevel: Record<string, string[]>;
    allActiveList: string[];
    activeCodes: Set<string>;
}

const _lessonValidationCache = new WeakMap<GradeCriteriaMap, Map<string, LessonValidationMeta>>();

const getLessonValidationMeta = (
    g: string,
    rawLesson: string,
    store: GradeCriteriaMap
): LessonValidationMeta => {
    let storeMap = _lessonValidationCache.get(store);
    if (!storeMap) {
        storeMap = new Map<string, LessonValidationMeta>();
        _lessonValidationCache.set(store, storeMap);
    }

    const cacheKey = `${g}::${rawLesson}`;
    const existing = storeMap.get(cacheKey);
    if (existing) return existing;

    const normLesson = normalizeLessonString(rawLesson);
    const lessonNum = extractLessonNumber(rawLesson);
    const canonicalLesson = resolveCanonicalLessonName(g, rawLesson);

    const gradeCriteriaData = CURRICULUM.criteriaData[g] || {};
    const gradeStore = store[g] || {};

    const isKnownLesson =
        Boolean(gradeCriteriaData[canonicalLesson]) ||
        Boolean(gradeStore[canonicalLesson]) ||
        Boolean(gradeStore[rawLesson]) ||
        Object.keys(gradeCriteriaData).some(
            k => normalizeLessonString(k) === normLesson || (lessonNum && extractLessonNumber(k) === lessonNum)
        ) ||
        Object.keys(gradeStore).some(
            k => normalizeLessonString(k) === normLesson || (lessonNum && extractLessonNumber(k) === lessonNum)
        );

    const deletedNorms = new Set<string>();
    const deletedCodes = new Set<string>();
    const allActiveByLevel: Record<string, string[]> = {};
    const allActiveList: string[] = [];
    const activeCodes = new Set<string>();

    if (!isKnownLesson) {
        const meta: LessonValidationMeta = {
            isKnownLesson: false,
            hasAnyCriteria: true,
            deletedNorms,
            deletedCodes,
            allActiveByLevel,
            allActiveList,
            activeCodes
        };
        storeMap.set(cacheKey, meta);
        return meta;
    }

    for (const [k, entry] of Object.entries(gradeStore)) {
        if (
            k === rawLesson ||
            k === canonicalLesson ||
            normalizeLessonString(k) === normLesson ||
            (lessonNum && extractLessonNumber(k) === lessonNum)
        ) {
            if (Array.isArray(entry.__deleted)) {
                entry.__deleted.forEach(d => deletedNorms.add(d));
            }
            const delCodes = (entry as any).__deletedCodes;
            if (Array.isArray(delCodes)) {
                delCodes.forEach((c: string) => deletedCodes.add(c));
            }
        }
    }

    const merged = getMergedCriteria(g, canonicalLesson, store);
    if (merged && Object.keys(merged).length > 0) {
        Object.entries(merged).forEach(([lvl, arr]) => {
            if (lvl.startsWith('__') || !Array.isArray(arr)) return;
            allActiveByLevel[lvl] = arr;
            arr.forEach(c => {
                allActiveList.push(c);
                const code = c.trim().split(/\s+/)[0].replace(/[:.]$/, '');
                if (code) activeCodes.add(code);
            });
        });
    }

    const meta: LessonValidationMeta = {
        isKnownLesson: true,
        hasAnyCriteria: allActiveList.length > 0,
        deletedNorms,
        deletedCodes,
        allActiveByLevel,
        allActiveList,
        activeCodes
    };
    storeMap.set(cacheKey, meta);
    return meta;
};

export const isQuestionCriteriaValidForLesson = (
    q: any,
    defaultGrade?: string,
    defaultLesson?: string,
    customStore?: GradeCriteriaMap
): boolean => {
    if (!q) return false;
    const store = customStore || loadCustomCriteriaStore();

    const rawLesson = String(q.lesson || q.bai || defaultLesson || '').trim();
    const rawGrade = String(q.grade || q.lop || defaultGrade || '').trim();
    const gMatch = rawGrade.match(/\d+/);
    const g = gMatch ? gMatch[0] : (rawLesson ? detectGradeFromLessonOrContext(rawLesson) : '');

    if (!g || !rawLesson || rawLesson === 'Bài chung') return true;

    const meta = getLessonValidationMeta(g, rawLesson, store);
    if (!meta.isKnownLesson) return true;
    if (!meta.hasAnyCriteria) return false;

    const { deletedNorms, deletedCodes, allActiveByLevel, allActiveList, activeCodes } = meta;

    const rawCrit = String(q.criteria || q.tieuChi || '').trim();
    const qLvl = getLevelCodeFromTitle(String(q.level || q.mucDo || 'NB'));

    // 0. Kiểm tra bắt buộc theo mức độ nhận thức (NB / TH / VD / VDC):
    // Nếu bài học KHÔNG có bất kỳ YCCĐ nào ở mức độ nhận thức `qLvl` của câu hỏi
    // (ví dụ bài học không có yêu cầu về Nhận biết mà lại có câu hỏi mức Nhận biết),
    // thì câu hỏi đó KHÔNG hợp lệ -> trả về false!
    const levelActiveList =
        qLvl === 'VD' || qLvl === 'VDC'
            ? [...(allActiveByLevel['VD'] || []), ...(allActiveByLevel['VDC'] || [])]
            : (allActiveByLevel[qLvl] || []);
    if (levelActiveList.length === 0) {
        return false;
    }

    const levelActiveCodes = new Set<string>();
    levelActiveList.forEach(c => {
        const code = c.trim().split(/\s+/)[0].replace(/[:.]$/, '');
        if (code) levelActiveCodes.add(code);
    });

    if (rawCrit) {
        const codeMatch = rawCrit.match(/^(\d+\.\d+)\b/);
        const qCode = codeMatch ? codeMatch[1] : rawCrit.split(/\s+/)[0].replace(/[:.]$/, '').trim();
        const qText = rawCrit.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();

        // 1. Nếu câu hỏi gắn kèm nội dung chữ của YCCĐ -> kiểm tra xem đã bị xóa chưa hoặc có khớp YCCĐ hiện có của mức độ này không
        if (qText.length > 5 && normalizeLessonString(qText) !== normalizeLessonString(rawLesson)) {
            if (Array.from(deletedNorms).some(d => areCriteriaSemanticallySame(d, qText))) {
                return false;
            }
            const matchesLevelText = levelActiveList.some(c => areCriteriaSemanticallySame(c, qText));
            if (!matchesLevelText) {
                return false;
            }
            return true;
        }

        // 2. Nếu câu hỏi gắn mã YCCĐ (ví dụ 1.1, 2.1, 3.1) -> mã đó bắt buộc phải tồn tại trong danh sách YCCĐ thuộc mức độ này của bài học
        if (qCode && /^\d+\.\d+$/.test(qCode)) {
            if (deletedCodes.has(qCode) || deletedCodes.has(`${qLvl}:${qCode}`)) {
                if (!levelActiveCodes.has(qCode)) return false;
            }
            if (!levelActiveCodes.has(qCode)) {
                return false;
            }
        }
    }

    return true;
};

export interface InvalidQuestionCleanupReport {
    validQuestions: any[];
    removedCount: number;
    remainingCount: number;
    removedDetails: string[];
    matrixRemovedCount: number;
}

/**
 * Kiểm tra toàn bộ câu hỏi (trong danh sách đang mở, trong Ngân hàng câu hỏi lưu trữ và trong các file JSON của Ma trận).
 * Nếu có câu hỏi mà bài học đó không có Yêu cầu cần đạt tương ứng (ví dụ bài không có YCCĐ mức Nhận biết mà lại có câu hỏi Nhận biết,
 * hoặc câu hỏi gắn YCCĐ không tồn tại / đã bị xóa), tự động xóa bỏ câu hỏi đó và thống kê lại toàn bộ.
 */
export const purgeInvalidQuestionsAndResync = (
    currentQuestions?: any[],
    filterGrade?: string,
    filterLesson?: string
): InvalidQuestionCleanupReport => {
    const store = loadCustomCriteriaStore();
    const removedBucketMap = new Map<string, number>();

    const recordRemoval = (q: any, fallbackGrade?: string, fallbackLesson?: string) => {
        const rawLesson = String(q?.lesson || q?.bai || fallbackLesson || 'Chưa rõ bài').trim();
        const rawGrade = String(q?.grade || q?.lop || fallbackGrade || '').trim();
        const gMatch = rawGrade.match(/\d+/);
        const g = gMatch ? gMatch[0] : (rawLesson ? detectGradeFromLessonOrContext(rawLesson) : '');
        const lvl = getLevelCodeFromTitle(String(q?.level || q?.mucDo || 'NB'));
        const lvlTitle = getLevelTitleFromCode(lvl);
        const key = `${g ? `Khối ${g} - ` : ''}${rawLesson} (${lvlTitle} - ${lvl})`;
        removedBucketMap.set(key, (removedBucketMap.get(key) || 0) + 1);
    };

    const matchesScope = (q: any, fallbackGrade?: string, fallbackLesson?: string) => {
        if (!filterGrade && !filterLesson) return true;
        const qGrade = String(q?.grade || q?.lop || fallbackGrade || '').match(/\d+/)?.[0] || '';
        const qLesson = String(q?.lesson || q?.bai || fallbackLesson || '').trim();
        if (filterGrade) {
            const targetG = filterGrade.match(/\d+/)?.[0] || filterGrade.trim();
            if (targetG && qGrade && qGrade !== targetG) return false;
        }
        if (filterLesson) {
            const normFilter = normalizeLessonString(filterLesson);
            const filterNum = extractLessonNumber(filterLesson);
            const normQ = normalizeLessonString(qLesson);
            const qNum = extractLessonNumber(qLesson);
            if (normFilter && normQ !== normFilter && !(filterNum && qNum === filterNum)) {
                return false;
            }
        }
        return true;
    };

    // 1. Kiểm tra và làm sạch danh sách câu hỏi truyền vào (hoặc Ngân hàng câu hỏi lưu trữ)
    const bankRes = loadQuestionBank();
    const sourceList: any[] = Array.isArray(currentQuestions)
        ? currentQuestions
        : (bankRes.success && Array.isArray(bankRes.data) ? bankRes.data : []);

    const validQuestions: any[] = [];
    let removedCount = 0;

    sourceList.forEach(q => {
        if (!matchesScope(q)) {
            validQuestions.push(q);
            return;
        }
        if (isQuestionCriteriaValidForLesson(q, q?.grade || filterGrade, q?.lesson || filterLesson, store)) {
            validQuestions.push(q);
        } else {
            removedCount++;
            recordRemoval(q, filterGrade, filterLesson);
        }
    });

    // Đồng bộ lưu vào Ngân hàng câu hỏi chính (questionBankStorage)
    try {
        if (Array.isArray(currentQuestions)) {
            saveQuestionBank(validQuestions, { force: true });
        } else if (removedCount > 0) {
            saveQuestionBank(validQuestions, { force: true });
        }
        // Nếu người dùng truyền currentQuestions là tập con nhưng trong questionBank tổng vẫn còn câu sai -> làm sạch luôn kho tổng
        const latestBank = loadQuestionBank();
        if (latestBank.success && Array.isArray(latestBank.data) && latestBank.data.length > 0) {
            const cleanedAll = latestBank.data.filter(q => {
                if (!matchesScope(q)) return true;
                return isQuestionCriteriaValidForLesson(q, q?.grade || filterGrade, q?.lesson || filterLesson, store);
            });
            if (cleanedAll.length !== latestBank.data.length) {
                saveQuestionBank(cleanedAll, { force: true });
            }
        }
    } catch (e) {
        console.error('[criteriaService] Error saving cleaned questionBank:', e);
    }

    // 2. Kiểm tra, xóa câu hỏi sai YCCĐ trong các file JSON thuộc matrixFileSystem và thống kê lại availableCounts + Bản đặc tả
    let matrixRemovedCount = 0;
    try {
        const rawFs = localStorage.getItem('matrixFileSystem');
        if (rawFs) {
            const fs = JSON.parse(rawFs);
            let fsModified = false;

            const cleanTreeNode = (node: any, inheritedGrade?: string) => {
                if (!node) return;
                let currentGrade = inheritedGrade;
                if (node.name) {
                    const m = node.name.match(/(?:Lớp|Khối)\s*(\d+)/i) || node.name.match(/\b([6-9])\b/);
                    if (m && ['6', '7', '8', '9'].includes(m[1])) {
                        currentGrade = m[1];
                    }
                }

                // Làm sạch từng file bài học (.json)
                if (node.type === 'file' && node.content) {
                    const effGrade = String(node.content?.info?.grade || currentGrade || filterGrade || '8').match(/\d+/)?.[0] || '8';
                    const fileLesson =
                        node.content?.info?.lesson ||
                        node.content?.thongTinChung?.bai ||
                        String(node.name || '').replace(/\.json$/i, '');

                    const cleanArray = (arr: any[]) => {
                        if (!Array.isArray(arr)) return arr;
                        const kept: any[] = [];
                        arr.forEach(q => {
                            if (!matchesScope(q, effGrade, fileLesson)) {
                                kept.push(q);
                                return;
                            }
                            if (isQuestionCriteriaValidForLesson(q, effGrade, fileLesson, store)) {
                                kept.push(q);
                            } else {
                                matrixRemovedCount++;
                                fsModified = true;
                                if (removedCount === 0) {
                                    recordRemoval(q, effGrade, fileLesson);
                                }
                            }
                        });
                        return kept;
                    };

                    if (Array.isArray(node.content.questions)) {
                        node.content.questions = cleanArray(node.content.questions);
                    }
                    if (Array.isArray(node.content.tracNghiem)) {
                        node.content.tracNghiem = cleanArray(node.content.tracNghiem);
                    }
                    if (Array.isArray(node.content.tuLuan)) {
                        node.content.tuLuan = cleanArray(node.content.tuLuan);
                    }
                }

                if (Array.isArray(node.children)) {
                    node.children.forEach((child: any) => cleanTreeNode(child, currentGrade));
                }

                // Thống kê lại availableCounts, làm sạch các ô cấp phát sai mức độ và đồng bộ lại Bản đặc tả cho thư mục đề thi
                if (node.matrixData?.matrix?.rows && Array.isArray(node.matrixData.matrix.rows)) {
                    const effGrade = currentGrade || '8';
                    const mRows: string[][] = node.matrixData.matrix.rows;
                    const sRows: string[][] = node.matrixData.specifications?.rows || [];
                    const nfRows: Record<number, any> = node.matrixData.newFormatRows || {};
                    if (!Array.isArray(node.matrixData.availableCounts)) {
                        node.matrixData.availableCounts = [];
                    }

                    mRows.forEach((row: string[], rIdx: number) => {
                        const subTopic = row[2] || '';
                        const rowLesson = row[3] || '';
                        if (!rowLesson && !subTopic) return;

                        // Tìm file JSON tương ứng trong thư mục chủ đề con để thống kê lại số lượng câu hỏi hợp lệ
                        const subDir = Array.isArray(node.children)
                            ? node.children.find(
                                  (c: any) =>
                                      c.type === 'folder' &&
                                      normalizeLessonString(c.name) === normalizeLessonString(subTopic)
                              )
                            : null;
                        const matchedFile =
                            subDir && Array.isArray(subDir.children)
                                ? subDir.children.find((f: any) => {
                                      const fLesson =
                                          f.content?.info?.lesson ||
                                          f.content?.thongTinChung?.bai ||
                                          String(f.name || '').replace(/\.json$/i, '');
                                      return (
                                          normalizeLessonString(fLesson) === normalizeLessonString(rowLesson) ||
                                          (extractLessonNumber(fLesson) &&
                                              extractLessonNumber(fLesson) === extractLessonNumber(rowLesson))
                                      );
                                  })
                                : null;

                        const poolQuestions: any[] = [];
                        if (matchedFile?.content) {
                            const counts = {
                                NB: { TN: 0, TL: 0 },
                                TH: { TN: 0, TL: 0 },
                                VD: { TN: 0, TL: 0 },
                                VDC: { TN: 0, TL: 0 }
                            };
                            (matchedFile.content.tracNghiem || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, effGrade, rowLesson, store)) return;
                                const l = getLevelCodeFromTitle(String(q.mucDo || 'NB')) as 'NB' | 'TH' | 'VD' | 'VDC';
                                if (counts[l]) counts[l].TN++;
                                poolQuestions.push({ ...q, level: l, category: 'mc', criteria: q.tieuChi || q.criteria || '' });
                            });
                            (matchedFile.content.tuLuan || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, effGrade, rowLesson, store)) return;
                                const l = getLevelCodeFromTitle(String(q.mucDo || 'NB')) as 'NB' | 'TH' | 'VD' | 'VDC';
                                if (counts[l]) counts[l].TL++;
                                poolQuestions.push({ ...q, level: l, category: 'essay', criteria: q.tieuChi || q.criteria || '' });
                            });
                            (matchedFile.content.questions || []).forEach((q: any) => {
                                if (!isQuestionCriteriaValidForLesson(q, effGrade, rowLesson, store)) return;
                                const l = getLevelCodeFromTitle(String(q.level || 'NB')) as 'NB' | 'TH' | 'VD' | 'VDC';
                                const isMC = q.category === 'mc' || q.category !== 'essay';
                                if (counts[l]) {
                                    if (isMC) counts[l].TN++;
                                    else counts[l].TL++;
                                }
                                poolQuestions.push({ ...q, level: l, category: isMC ? 'mc' : 'essay', criteria: q.criteria || q.tieuChi || '' });
                            });
                            node.matrixData.availableCounts[rIdx] = counts;
                            fsModified = true;
                        }

                        // Kiểm tra các mức độ của bài học hiện tại: nếu mức độ nào không có YCCĐ thì xóa số câu phân bổ ở mức đó trên Ma trận
                        if (rowLesson) {
                            const merged = getMergedCriteria(effGrade, rowLesson, store);
                            const hasNB = Boolean(merged?.NB && merged.NB.length > 0);
                            const hasTH = Boolean(merged?.TH && merged.TH.length > 0);
                            const hasVD = Boolean(
                                (merged?.VD && merged.VD.length > 0) || (merged?.VDC && merged.VDC.length > 0)
                            );

                            if (!hasNB) {
                                if (node.matrixData.availableCounts[rIdx]) {
                                    node.matrixData.availableCounts[rIdx].NB = { TN: 0, TL: 0 };
                                }
                                if (row[5] || row[6]) {
                                    row[5] = '';
                                    row[6] = '';
                                    fsModified = true;
                                }
                                if (sRows[rIdx] && sRows[rIdx][5] !== '0-0') {
                                    sRows[rIdx][5] = '0-0';
                                    fsModified = true;
                                }
                                if (nfRows[rIdx]) {
                                    if (nfRows[rIdx].mc?.B) nfRows[rIdx].mc.B.count = 0;
                                    if (nfRows[rIdx].tf?.B) nfRows[rIdx].tf.B.count = 0;
                                    if (nfRows[rIdx].sa?.B) nfRows[rIdx].sa.B.count = 0;
                                    if (nfRows[rIdx].essay?.B) nfRows[rIdx].essay.B.count = 0;
                                }
                            }
                            if (!hasTH) {
                                if (node.matrixData.availableCounts[rIdx]) {
                                    node.matrixData.availableCounts[rIdx].TH = { TN: 0, TL: 0 };
                                }
                                if (row[7] || row[8]) {
                                    row[7] = '';
                                    row[8] = '';
                                    fsModified = true;
                                }
                                if (sRows[rIdx] && sRows[rIdx][6] !== '0-0') {
                                    sRows[rIdx][6] = '0-0';
                                    fsModified = true;
                                }
                                if (nfRows[rIdx]) {
                                    if (nfRows[rIdx].mc?.H) nfRows[rIdx].mc.H.count = 0;
                                    if (nfRows[rIdx].tf?.H) nfRows[rIdx].tf.H.count = 0;
                                    if (nfRows[rIdx].sa?.H) nfRows[rIdx].sa.H.count = 0;
                                    if (nfRows[rIdx].essay?.H) nfRows[rIdx].essay.H.count = 0;
                                }
                            }
                            if (!hasVD) {
                                if (node.matrixData.availableCounts[rIdx]) {
                                    node.matrixData.availableCounts[rIdx].VD = { TN: 0, TL: 0 };
                                    node.matrixData.availableCounts[rIdx].VDC = { TN: 0, TL: 0 };
                                }
                                if (row[9] || row[10] || row[11] || row[12]) {
                                    row[9] = '';
                                    row[10] = '';
                                    row[11] = '';
                                    row[12] = '';
                                    fsModified = true;
                                }
                                if (sRows[rIdx] && (sRows[rIdx][7] !== '0-0' || sRows[rIdx][8] !== '0-0')) {
                                    sRows[rIdx][7] = '0-0';
                                    sRows[rIdx][8] = '0-0';
                                    fsModified = true;
                                }
                                if (nfRows[rIdx]) {
                                    if (nfRows[rIdx].mc?.VD) nfRows[rIdx].mc.VD.count = 0;
                                    if (nfRows[rIdx].tf?.VD) nfRows[rIdx].tf.VD.count = 0;
                                    if (nfRows[rIdx].sa?.VD) nfRows[rIdx].sa.VD.count = 0;
                                    if (nfRows[rIdx].essay?.VD) nfRows[rIdx].essay.VD.count = 0;
                                }
                            }
                        }

                        // Cập nhật lại nội dung YCCĐ trên Bản đặc tả theo kho câu hỏi đã làm sạch
                        if (sRows[rIdx]) {
                            const poolSpec =
                                poolQuestions.length > 0
                                    ? buildSpecHtmlFromQuestionPool(effGrade, rowLesson, subTopic, poolQuestions, store)
                                    : null;
                            if (poolSpec) {
                                sRows[rIdx][4] = poolSpec.specHtml;
                                fsModified = true;
                            } else if (rowLesson) {
                                const fallbackHtml = buildSpecHtmlFromMergedCriteria(effGrade, rowLesson, store);
                                if (fallbackHtml !== null) {
                                    sRows[rIdx][4] = fallbackHtml;
                                    fsModified = true;
                                }
                            }
                        }
                    });
                }
            };

            cleanTreeNode(fs);
            if (fsModified) {
                localStorage.setItem('matrixFileSystem', JSON.stringify(fs));
            }
        }
    } catch (e) {
        console.error('[criteriaService] Error cleaning matrixFileSystem:', e);
    }

    const totalRemoved = removedCount > 0 ? removedCount : matrixRemovedCount;
    const removedDetails = Array.from(removedBucketMap.entries()).map(
        ([label, cnt]) => `${label}: ${cnt} câu`
    );

    window.dispatchEvent(new CustomEvent('matrix_filesystem_updated', { detail: { action: 'purge_invalid_questions' } }));
    window.dispatchEvent(new CustomEvent('criteria_updated', { detail: { action: 'purge_invalid_questions' } }));

    return {
        validQuestions,
        removedCount: totalRemoved,
        remainingCount: validQuestions.length,
        removedDetails,
        matrixRemovedCount
    };
};

/**
 * Lọc danh sách câu hỏi, loại bỏ mọi câu hỏi có YCCĐ đã bị xóa hoặc không tồn tại trong bài học
 */
export const filterQuestionsByActiveCriteria = <T = any>(
    questions: T[],
    defaultGrade?: string,
    defaultLesson?: string,
    customStore?: GradeCriteriaMap
): { valid: T[]; removedCount: number } => {
    if (!Array.isArray(questions) || questions.length === 0) {
        return { valid: [], removedCount: 0 };
    }
    const store = customStore || loadCustomCriteriaStore();
    const valid: T[] = [];
    let removedCount = 0;

    questions.forEach(q => {
        if (isQuestionCriteriaValidForLesson(q, defaultGrade, defaultLesson, store)) {
            valid.push(q);
        } else {
            removedCount++;
        }
    });

    return { valid, removedCount };
};

/**
 * Dựng chuỗi HTML Đặc tả trực tiếp từ danh sách YCCĐ hiện hành (getMergedCriteria) của một bài học cụ thể
 */
export const buildSpecHtmlFromMergedCriteria = (
    grade: string,
    lessonName: string,
    customStore?: GradeCriteriaMap
): string | null => {
    if (!grade || !lessonName) return null;
    const g = (grade.match(/\d+/)?.[0] || grade || '').trim();
    if (!g) return null;

    const store = customStore || loadCustomCriteriaStore();
    const normLesson = normalizeLessonString(lessonName);
    const lessonNum = extractLessonNumber(lessonName);
    const canonicalLesson = resolveCanonicalLessonName(g, lessonName);

    const gradeCriteriaData = CURRICULUM.criteriaData[g] || {};
    const gradeStore = store[g] || {};

    const isKnownLesson =
        Boolean(gradeCriteriaData[canonicalLesson]) ||
        Boolean(gradeStore[canonicalLesson]) ||
        Boolean(gradeStore[lessonName]) ||
        Object.keys(gradeCriteriaData).some(
            k => normalizeLessonString(k) === normLesson || (lessonNum && extractLessonNumber(k) === lessonNum)
        ) ||
        Object.keys(gradeStore).some(
            k => normalizeLessonString(k) === normLesson || (lessonNum && extractLessonNumber(k) === lessonNum)
        );

    if (!isKnownLesson) return null;

    const merged = getMergedCriteria(g, canonicalLesson, store);
    if (!merged) return '';

    const sections: YccdSection[] = [];
    (['NB', 'TH', 'VD', 'VDC'] as const).forEach(lvl => {
        const list = merged[lvl];
        if (Array.isArray(list) && list.length > 0) {
            sections.push({
                levelTitle: getLevelTitleFromCode(lvl),
                items: list.map((raw, idx) => {
                    const clean = raw.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
                    return {
                        id: `${lvl}-${idx}`,
                        text: `– ${clean}`,
                        checked: true
                    };
                })
            });
        }
    });

    return serializeYccdSections(sections);
};

export interface QuestionPoolSpecResult {
    specHtml: string;
    hasNB: boolean;
    hasTH: boolean;
    hasVD: boolean;
    hasPoolQuestions: boolean;
}

/**
 * Dựng nội dung HTML Yêu cầu cần đạt trên Bản đặc tả và xác định các mức độ nhận thức (Biết / Hiểu / Vận dụng)
 * trực tiếp từ KHO CÂU HỎI TRONG ĐỀ của dòng bài học/chủ đề đó.
 * Chỉ những mức độ nhận thức và YCCĐ thực sự có câu hỏi trong kho câu hỏi của đề mới được đưa vào Bản đặc tả.
 */
export const buildSpecHtmlFromQuestionPool = (
    grade: string,
    lessonName: string,
    subTopic: string,
    poolQuestions: any[],
    customStore?: GradeCriteriaMap
): QuestionPoolSpecResult | null => {
    if (!Array.isArray(poolQuestions) || poolQuestions.length === 0) {
        return null;
    }

    const explicitGradeMatch = (grade || '').match(/(?:lớp|khối|tin)\s*([6-9])\b/i) || (grade || '').match(/\b([6-9])\b/);
    const g = explicitGradeMatch
        ? explicitGradeMatch[1]
        : detectGradeFromLessonOrContext(lessonName || subTopic, grade) || '7';

    const store = customStore || loadCustomCriteriaStore();
    let merged: CriteriaMap | null = null;
    if (lessonName) {
        const canonicalLesson = resolveCanonicalLessonName(g, lessonName);
        merged = getMergedCriteria(g, canonicalLesson, store);
    }
    if (!merged && subTopic) {
        const lessons = getLessonsForSubTopic(g, subTopic);
        const combined: CriteriaMap = {};
        lessons.forEach(l => {
            const m = getMergedCriteria(g, l, store);
            if (m) {
                Object.entries(m).forEach(([lvl, arr]) => {
                    if (lvl.startsWith('__') || !Array.isArray(arr)) return;
                    if (!combined[lvl]) combined[lvl] = [];
                    arr.forEach(item => {
                        if (!combined[lvl].some(ex => areCriteriaSemanticallySame(ex, item))) {
                            combined[lvl].push(item);
                        }
                    });
                });
            }
        });
        if (Object.keys(combined).length > 0) merged = combined;
    }

    const nbQuestions: any[] = [];
    const thQuestions: any[] = [];
    const vdQuestions: any[] = [];

    poolQuestions.forEach(q => {
        if (!q) return;
        const lvl = getLevelCodeFromTitle(String(q.level || q.mucDo || 'NB'));
        if (lvl === 'NB') nbQuestions.push(q);
        else if (lvl === 'TH') thQuestions.push(q);
        else vdQuestions.push(q);
    });

    const hasNB = nbQuestions.length > 0;
    const hasTH = thQuestions.length > 0;
    const hasVD = vdQuestions.length > 0;

    const allLessonCriteria: string[] = merged
        ? Object.entries(merged)
              .filter(([k]) => !k.startsWith('__'))
              .flatMap(([, v]) => (Array.isArray(v) ? v : []))
        : [];

    const levelBuckets: { code: 'NB' | 'TH' | 'VD'; title: string; qs: any[]; pool: string[] }[] = [
        { code: 'NB', title: 'Nhận biết', qs: nbQuestions, pool: merged?.['NB'] || [] },
        { code: 'TH', title: 'Thông hiểu', qs: thQuestions, pool: merged?.['TH'] || [] },
        {
            code: 'VD',
            title: 'Vận dụng',
            qs: vdQuestions,
            pool: [...(merged?.['VD'] || []), ...(merged?.['VDC'] || [])]
        }
    ];

    const sections: YccdSection[] = [];

    levelBuckets.forEach(({ code, title, qs, pool }) => {
        if (qs.length === 0) return;

        const matchedItems: string[] = [];
        const addUniqueItem = (rawText: string) => {
            const clean = rawText.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();
            if (!clean) return;
            if (!matchedItems.some(ex => areCriteriaSemanticallySame(ex, clean))) {
                matchedItems.push(clean);
            }
        };

        qs.forEach(q => {
            const rawCrit = String(q.criteria || q.tieuChi || '').trim();
            if (!rawCrit) return;

            const codeMatch = rawCrit.match(/^(\d+\.\d+)\b/);
            const qCode = codeMatch ? codeMatch[1] : rawCrit.split(/\s+/)[0].replace(/[:.]$/, '').trim();
            const qText = rawCrit.replace(/^\d+\.\d+\s*/, '').replace(/^[\s–\-*•]+/, '').trim();

            // 1. Ưu tiên khớp trong danh sách YCCĐ thuộc đúng mức độ nhận thức này của bài học
            const matchedInLevel = pool.find(item => {
                const itemCode = item.trim().match(/^(\d+\.\d+)\b/)?.[1];
                if (qCode && /^\d+\.\d+$/.test(qCode) && itemCode === qCode) return true;
                if (qText.length > 5 && areCriteriaSemanticallySame(item, qText)) return true;
                return false;
            });

            if (matchedInLevel) {
                addUniqueItem(matchedInLevel);
                return;
            }

            // 2. Nếu không thấy trong cùng mức độ, kiểm tra toàn bộ YCCĐ của bài học
            const matchedInAll = allLessonCriteria.find(item => {
                const itemCode = item.trim().match(/^(\d+\.\d+)\b/)?.[1];
                if (qCode && /^\d+\.\d+$/.test(qCode) && itemCode === qCode) return true;
                if (qText.length > 5 && areCriteriaSemanticallySame(item, qText)) return true;
                return false;
            });

            if (matchedInAll) {
                addUniqueItem(matchedInAll);
                return;
            }

            // 3. Nếu câu hỏi mang sẵn nội dung chữ của YCCĐ
            if (qText.length > 5) {
                addUniqueItem(qText);
            }
        });

        // Nếu các câu hỏi ở mức độ này không gắn mã YCCĐ cụ thể (mặc định theo bài học),
        // lấy danh sách YCCĐ hiện hành ở mức độ đó của bài học
        if (matchedItems.length === 0) {
            if (pool.length > 0) {
                pool.forEach(item => addUniqueItem(item));
            } else if (allLessonCriteria.length > 0) {
                addUniqueItem(allLessonCriteria[0]);
            }
        }

        // Sắp xếp lại các mục theo đúng thứ tự chuẩn trong pool của bài học nếu có
        if (pool.length > 1 && matchedItems.length > 1) {
            matchedItems.sort((a, b) => {
                const idxA = pool.findIndex(p => areCriteriaSemanticallySame(p, a));
                const idxB = pool.findIndex(p => areCriteriaSemanticallySame(p, b));
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0;
            });
        }

        if (matchedItems.length > 0) {
            sections.push({
                levelTitle: title,
                items: matchedItems.map((clean, idx) => ({
                    id: `${code}-${idx}`,
                    text: `– ${clean}`,
                    checked: true
                }))
            });
        }
    });

    return {
        specHtml: serializeYccdSections(sections),
        hasNB,
        hasTH,
        hasVD,
        hasPoolQuestions: true
    };
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
    const gradeStore = store[g] || {};

    const targetLessons = lessonName
        ? resolveTargetLessons(g, lessonName, undefined, store)
        : getLessonsForSubTopic(g, subTopic);

    if (targetLessons.length === 0) return htmlContent;

    let updatedHtml = htmlContent || '';

    // Loại bỏ các câu YCCĐ giả lập nếu từng bị chèn trước đây
    updatedHtml = updatedHtml.replace(
        /<div[^>]*>\s*[-–]?\s*(?:Nêu được các khái niệm, nội dung cơ bản thuộc|Giải thích và phân biệt được các nội dung trọng tâm thuộc|Vận dụng được kiến thức thuộc)[\s\S]*?<\/div>/gi,
        ''
    );

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
                    if (deletedList.some(d => d === itemNorm || areCriteriaSemanticallySame(d, item))) return;
                    if (
                        baseNorms.has(itemNorm) ||
                        Object.values(baseMap).flat().some(b => areCriteriaSemanticallySame(b, item)) ||
                        replacementValuesNorm.has(itemNorm)
                    ) {
                        return;
                    }
                    updatedHtml = applyCriterionChangeToHtml(updatedHtml, lvl, 'add', {
                        newText: item
                    });
                });
            });
        });
    });

    // Nếu dòng đặc tả gắn với một Bài học cụ thể trong CURRICULUM, chỉ giữ lại các YCCĐ thực sự tồn tại trong getMergedCriteria của bài học đó
    if (lessonName) {
        const canonicalLesson = resolveCanonicalLessonName(g, lessonName);
        if (CURRICULUM.criteriaData[g]?.[canonicalLesson]) {
            const merged = getMergedCriteria(g, canonicalLesson, store);
            if (merged) {
                for (const [lvl, list] of Object.entries(merged)) {
                    if (lvl.startsWith('__') || !Array.isArray(list)) continue;
                    for (const item of list) {
                        updatedHtml = applyCriterionChangeToHtml(updatedHtml, lvl, 'add', { newText: item });
                    }
                }
            }
            const activeItems = merged
                ? Object.entries(merged)
                      .filter(([k]) => !k.startsWith('__'))
                      .flatMap(([, arr]) => (Array.isArray(arr) ? arr : []))
                : [];
            const sections = parseYccdSections(updatedHtml);
            const filteredSections = sections
                .map(sec => ({
                    ...sec,
                    items: sec.items.filter(it => activeItems.some(act => areCriteriaSemanticallySame(act, it.text)))
                }))
                .filter(sec => sec.items.length > 0);
            updatedHtml = serializeYccdSections(filteredSections);
        }
    }

    return updatedHtml;
};

/**
 * Xác định loại câu hỏi chuẩn hóa (nhiều lựa chọn, đúng-sai, trả lời ngắn, tự luận)
 */
export const getQuestionTypeKey = (q: any): 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' => {
    if (!q) return 'multiple-choice';
    if (q.category === 'essay' || q.questionType === 'essay' || q.loai === 'tu-luan') {
        return 'essay';
    }
    if (q.questionType === 'true-false' || q.mcType === 'true-false') {
        return 'true-false';
    }
    if (q.questionType === 'short-answer' || q.questionType === 'fill-blank' || q.mcType === 'fill-blank') {
        return 'short-answer';
    }
    return 'multiple-choice';
};

/**
 * Trả về khóa định danh chuẩn hóa của Yêu cầu cần đạt (YCCĐ) gắn với câu hỏi `q`
 * theo phạm vi bài học (ví dụ: "bài 1:::1.1", "bài 2:::2.1"), giúp so khớp chính xác
 * kể cả khi câu hỏi lưu mã rút gọn ("1.1") hay lưu nguyên câu văn bản YCCĐ.
 */
export const getCanonicalCriterionKeyForQuestion = (
    q: any,
    defaultGrade?: string,
    defaultLesson?: string,
    customStore?: GradeCriteriaMap
): string => {
    if (!q) return 'general:::default';
    const rawGrade = String(q.grade || defaultGrade || '');
    const g = (rawGrade.match(/\d+/)?.[0] || rawGrade).trim();
    const rawLesson = String(q.lesson || q.bai || defaultLesson || '').trim();
    const canonicalLesson = g && rawLesson ? resolveCanonicalLessonName(g, rawLesson) : rawLesson;
    const lessonScope = extractLessonNumber(canonicalLesson) || normalizeLessonString(canonicalLesson) || 'general';

    const rawCriteria = String(q.criteria || q.tieuChi || '').trim();
    const codeMatch = rawCriteria.match(/^(\d+\.\d+)\b/);
    if (codeMatch) {
        return `${lessonScope}:::${codeMatch[1]}`;
    }

    if (rawCriteria && g && canonicalLesson) {
        const merged = getMergedCriteria(g, canonicalLesson, customStore);
        if (merged) {
            for (const [lvl, list] of Object.entries(merged)) {
                if (lvl.startsWith('__') || !Array.isArray(list)) continue;
                const matched = list.find(item => areCriteriaSemanticallySame(item, rawCriteria));
                if (matched) {
                    const m = matched.match(/^(\d+\.\d+)\b/);
                    if (m) return `${lessonScope}:::${m[1]}`;
                    return `${lessonScope}:::${normalizeCriterionText(matched)}`;
                }
            }
        }
    }

    if (rawCriteria) {
        return `${lessonScope}:::${normalizeCriterionText(rawCriteria)}`;
    }

    if (q.curriculum?.requirementId) {
        return `${lessonScope}:::${q.curriculum.requirementId}`;
    }

    const lvl = getLevelCodeFromTitle(String(q.level || q.mucDo || 'NB'));
    return `${lessonScope}:::${lvl}:default`;
};
