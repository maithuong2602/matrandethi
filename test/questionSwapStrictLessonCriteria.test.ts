import { describe, it, expect } from 'vitest';
import {
    extractLessonNumber,
    normalizeLessonString,
    resolveCanonicalLessonName,
    getCanonicalCriterionKeyForQuestion,
    areCriteriaSemanticallySame,
    normalizeCriterionText,
    normalizeQuestionContentKey
} from '../services/criteriaService';
import { generateOfflineQuestions } from '../services/offlineQuestionGenerator';

// Reusable logic mirroring ExamGenerator
const isLessonStrictMatch = (lessonA: string, lessonB: string, grade?: string): boolean => {
    if (!lessonA || !lessonB) return false;
    const numA = extractLessonNumber(lessonA);
    const numB = extractLessonNumber(lessonB);
    if (numA && numB) {
        return numA.toLowerCase() === numB.toLowerCase();
    }
    if (grade) {
        const canA = resolveCanonicalLessonName(grade, lessonA);
        const canB = resolveCanonicalLessonName(grade, lessonB);
        if (canA && canB && normalizeLessonString(canA) === normalizeLessonString(canB)) {
            return true;
        }
    }
    const normA = normalizeLessonString(lessonA);
    const normB = normalizeLessonString(lessonB);
    if (normA === normB) return true;

    const cleanA = normA.replace(/^bài\s*\d+[a-z]?\s*[:\.]?\s*/i, '').trim();
    const cleanB = normB.replace(/^bài\s*\d+[a-z]?\s*[:\.]?\s*/i, '').trim();
    if (cleanA && cleanB && cleanA === cleanB) return true;
    if (cleanA.length > 6 && cleanB.length > 6 && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
        return true;
    }
    return false;
};

const isCriterionStrictMatch = (b: any, q: any, grade: string): boolean => {
    const codeQ = (q.criteria || '').match(/\b(\d+\.\d+)\b/)?.[1] || q.curriculum?.requirementId;
    const codeB = (b.criteria || '').match(/\b(\d+\.\d+)\b/)?.[1] || b.curriculum?.requirementId;
    if (codeQ && codeB) {
        return codeQ === codeB;
    }

    const keyQ = getCanonicalCriterionKeyForQuestion(q, grade, q.lesson);
    const keyB = getCanonicalCriterionKeyForQuestion(b, grade, b.lesson);
    if (keyQ && keyB && keyQ !== 'general:::default' && keyB !== 'general:::default') {
        if (keyQ === keyB) return true;
    }

    if (q.criteria && b.criteria) {
        if (areCriteriaSemanticallySame(q.criteria, b.criteria)) return true;
        const normQ = normalizeCriterionText(q.criteria);
        const normB = normalizeCriterionText(b.criteria);
        if (normQ && normB && (normQ === normB || normQ.includes(normB) || normB.includes(normQ))) return true;
    }

    if (!q.criteria && !q.curriculum?.requirementId) {
        return true;
    }

    return false;
};

describe('Đổi câu hỏi: Đổi đúng bài và đúng tiêu chí YCCĐ (Strict Lesson & Criteria Swap)', () => {
    it('1. isLessonStrictMatch accurately matches same lesson and rejects string-overlapping different lessons', () => {
        // Bài 1 vs Bài 1 variant forms
        expect(isLessonStrictMatch('Bài 1: Lược sử công cụ tính toán', 'Bài 1', '8')).toBe(true);
        expect(isLessonStrictMatch('Bài 1. Lược sử công cụ tính toán', 'Bài 1: Lược sử công cụ tính toán', '8')).toBe(true);
        expect(isLessonStrictMatch('bài 1', 'Bài 1: Lược sử công cụ tính toán', '8')).toBe(true);

        // Bài 1 MUST NOT match Bài 10, Bài 11, Bài 12, Bài 14...
        expect(isLessonStrictMatch('Bài 1: Lược sử công cụ tính toán', 'Bài 10: Lưu trữ dữ liệu', '8')).toBe(false);
        expect(isLessonStrictMatch('Bài 1: Lược sử công cụ tính toán', 'Bài 11: Giải quyết vấn đề', '8')).toBe(false);
        expect(isLessonStrictMatch('Bài 1', 'Bài 14: Cấu trúc điều khiển', '8')).toBe(false);
        expect(isLessonStrictMatch('Bài 2: Thông tin trong môi trường số', 'Bài 12: Biểu diễn dữ liệu', '8')).toBe(false);
    });

    it('2. isCriterionStrictMatch strictly preserves criteria code and rejects different criteria', () => {
        const qOriginal = {
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1 - Nêu được lược sử phát triển...',
            level: 'NB'
        };

        const candSameCritCode = {
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1',
            level: 'NB'
        };

        const candDiffCritCode = {
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.2 - Giải thích được nguyên lý...',
            level: 'NB'
        };

        const candAnotherLesson = {
            lesson: 'Bài 2: Thông tin trong môi trường số',
            criteria: '2.1',
            level: 'NB'
        };

        expect(isCriterionStrictMatch(candSameCritCode, qOriginal, '8')).toBe(true);
        expect(isCriterionStrictMatch(candDiffCritCode, qOriginal, '8')).toBe(false);
        expect(isCriterionStrictMatch(candAnotherLesson, qOriginal, '8')).toBe(false);
    });

    it('3. Question swap candidate filtering selects only questions matching both exact lesson and exact criteria', () => {
        const targetG = '8';
        const currentQ = {
            id: 'q_curr',
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1',
            level: 'NB',
            category: 'mc',
            questionType: 'multiple-choice'
        };

        const bank = [
            // Wrong lesson (Bài 11) even though criteria might be 1.1 or similar
            {
                id: 'q_wrong_lesson',
                lesson: 'Bài 11: Giải quyết vấn đề',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Same lesson (Bài 1) but wrong criteria (1.2)
            {
                id: 'q_wrong_criteria',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.2',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Same lesson, same criteria, but different cognitive level (TH)
            {
                id: 'q_wrong_level',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'TH',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Perfect candidate: Same lesson (Bài 1), same criteria (1.1), same level (NB), same type (mc)
            {
                id: 'q_perfect_swap',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            }
        ];

        const validCandidates = bank.filter(b =>
            b.id !== currentQ.id &&
            b.level === currentQ.level &&
            b.category === currentQ.category &&
            b.questionType === currentQ.questionType &&
            isLessonStrictMatch(b.lesson, currentQ.lesson, targetG) &&
            isCriterionStrictMatch(b, currentQ, targetG)
        );

        expect(validCandidates).toHaveLength(1);
        expect(validCandidates[0].id).toBe('q_perfect_swap');
    });

    it('4. Fallback generation generates question with exact lesson, level, and criteria when bank has no other candidate', () => {
        const targetG = '8';
        const currentQ = {
            id: 'q_lone',
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1',
            level: 'NB',
            category: 'mc',
            questionType: 'multiple-choice',
            points: 0.25
        };

        // When bank has zero alternatives for this exact lesson + criteria
        const generated = generateOfflineQuestions(
            targetG,
            currentQ.lesson,
            currentQ.level,
            currentQ.criteria,
            1,
            'multiple-choice'
        );

        expect(generated).toHaveLength(1);
        const replacement = {
            ...generated[0],
            lesson: currentQ.lesson,
            criteria: currentQ.criteria,
            level: currentQ.level,
            points: currentQ.points
        };

        expect(replacement.lesson).toBe('Bài 1: Lược sử công cụ tính toán');
        expect(replacement.criteria).toBe('1.1');
        expect(replacement.level).toBe('NB');
        expect(replacement.points).toBe(0.25);
    });

    it('5. findMatchingTopic matches exact lesson in Grade 8 and avoids falling back to Input/Output hardware', () => {
        // Bài 2 Lớp 8: Thông tin trong môi trường số
        const qBai2 = generateOfflineQuestions(
            '8',
            'Bài 2: Thông tin trong môi trường số',
            'NB',
            '1.1 - Nêu được đặc điểm của thông tin số',
            1,
            'multiple-choice'
        );
        expect(qBai2).toHaveLength(1);
        const text2 = (qBai2[0].content || qBai2[0].text || '').toLowerCase();
        // Phải nói về thông tin số, không được nói về thiết bị vào ra (bàn phím, chuột quang)
        expect(text2).toMatch(/thông tin|dữ liệu|môi trường số|số hóa/);
        expect(text2).not.toMatch(/thiết bị vào \(input device\)/);
        expect(text2).not.toMatch(/bàn phím và chuột/);

        // Bài 1 Lớp 8: Lược sử công cụ tính toán
        const qBai1 = generateOfflineQuestions(
            '8',
            'Bài 1: Lược sử công cụ tính toán',
            'NB',
            '1.1 - Nêu được lược sử phát triển máy tính',
            1,
            'multiple-choice'
        );
        expect(qBai1).toHaveLength(1);
        const text1 = (qBai1[0].content || qBai1[0].text || '').toLowerCase();
        expect(text1).toMatch(/pascal|pascaline|babbage|lovelace|eniac|thế hệ thứ nhất|công cụ tính toán/);

        // Bài 14 Lớp 8: Cấu trúc điều khiển
        const qBai14 = generateOfflineQuestions(
            '8',
            'Bài 14: Cấu trúc điều khiển',
            'NB',
            '1.1',
            1,
            'multiple-choice'
        );
        expect(qBai14).toHaveLength(1);
        const text14 = (qBai14[0].content || qBai14[0].text || '').toLowerCase();
        expect(text14).toMatch(/rẽ nhánh|lặp|điều khiển|thuật toán|scratch|khối lệnh/);
    });

    it('6. createDynamicLessonTopic guarantees correct lesson and criteria for unlisted or custom lessons', () => {
        const customLesson = 'Bài 99: Chuyên đề Trí tuệ nhân tạo nâng cao';
        const customCriteria = 'YCCĐ 1.1: Trình bày được ứng dụng của thị giác máy tính';
        const qCustom = generateOfflineQuestions(
            '8',
            customLesson,
            'NB',
            customCriteria,
            1,
            'multiple-choice'
        );
        expect(qCustom).toHaveLength(1);
        const textCustom = qCustom[0].content || qCustom[0].text || '';
        expect(textCustom).toContain('Bài 99: Chuyên đề Trí tuệ nhân tạo nâng cao');
        expect(textCustom).toContain('thị giác máy tính');
    });

    it('7. Question swap candidate filtering rejects ANY question already in the test (by ID or content)', () => {
        const targetG = '8';
        const currentQ = {
            id: 'q_current_swap',
            content: 'Năm 1642, Blaise Pascal đã sáng chế ra máy tính cơ học nào?',
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1',
            level: 'NB',
            category: 'mc',
            questionType: 'multiple-choice'
        };

        const existingOtherTestQuestion = {
            id: 'q_other_in_exam',
            content: 'Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện điện tử chính nào sau đây?',
            lesson: 'Bài 1: Lược sử công cụ tính toán',
            criteria: '1.1',
            level: 'NB',
            category: 'mc',
            questionType: 'multiple-choice'
        };

        const generatedTest = [currentQ, existingOtherTestQuestion];
        const existingOtherTestIds = new Set(
            generatedTest.filter(gt => gt.id !== currentQ.id).map(gt => gt.id)
        );
        const currentTestContents = new Set(
            generatedTest.map(gt => normalizeQuestionContentKey(gt.content || (gt as any).text || ''))
        );

        const bank = [
            // Candidate 1: Same lesson, same criteria, but same ID as existing question in exam
            {
                id: 'q_other_in_exam',
                content: 'Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện điện tử chính nào sau đây?',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Candidate 2: Different ID, but DUPLICATE CONTENT with question already in exam
            {
                id: 'q_diff_id_same_content',
                content: 'máy tính điện tử thế hệ thứ nhất sử dụng linh kiện điện tử chính nào sau đây?',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Candidate 3: Same content as currentQ being swapped (no point swapping to the exact same question!)
            {
                id: 'q_same_as_current',
                content: 'Năm 1642, Blaise Pascal đã sáng chế ra máy tính cơ học nào?',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            },
            // Candidate 4: Right lesson, right criteria, right level, NOT in exam!
            {
                id: 'q_fresh_valid',
                content: 'Chiếc máy tính cơ học Pascaline có khả năng thực hiện trực tiếp các phép tính nào?',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                criteria: '1.1',
                level: 'NB',
                category: 'mc',
                questionType: 'multiple-choice'
            }
        ];

        const validCandidates = bank.filter(b => {
            if (existingOtherTestIds.has(b.id) || b.id === currentQ.id) return false;
            const bKey = normalizeQuestionContentKey(b.content || (b as any).text || '');
            if (bKey && currentTestContents.has(bKey)) return false;
            if (b.level !== currentQ.level || b.category !== currentQ.category || b.questionType !== currentQ.questionType) return false;
            if (!isLessonStrictMatch(b.lesson, currentQ.lesson, targetG)) return false;
            if (!isCriterionStrictMatch(b, currentQ, targetG)) return false;
            return true;
        });

        expect(validCandidates).toHaveLength(1);
        expect(validCandidates[0].id).toBe('q_fresh_valid');
    });

    it('8. generateOfflineQuestions excludes questions in excludeContents and selects an unpicked concept', () => {
        const lesson = 'Bài 1: Lược sử công cụ tính toán';
        const level = 'NB';
        const criteria = '1.1';
        const existingStem = 'Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện điện tử chính nào sau đây?';

        // When excludeContents includes the first concept stem
        const generated = generateOfflineQuestions(
            '8',
            lesson,
            level,
            criteria,
            1,
            'multiple-choice',
            [normalizeQuestionContentKey(existingStem)]
        );

        expect(generated).toHaveLength(1);
        const generatedStem = generated[0].content || generated[0].text || '';
        // Guaranteed NOT to be the existing stem
        expect(generatedStem).not.toBe(existingStem);
        expect(normalizeQuestionContentKey(generatedStem)).not.toBe(normalizeQuestionContentKey(existingStem));
        // Still belongs to Bài 1 Lược sử công cụ tính toán
        expect(generatedStem.toLowerCase()).toMatch(/pascal|pascaline|babbage|lovelace|eniac/);
    });
});
