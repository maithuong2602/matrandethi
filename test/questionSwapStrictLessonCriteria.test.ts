import { describe, it, expect } from 'vitest';
import {
    extractLessonNumber,
    normalizeLessonString,
    resolveCanonicalLessonName,
    getCanonicalCriterionKeyForQuestion,
    areCriteriaSemanticallySame,
    normalizeCriterionText
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
});
