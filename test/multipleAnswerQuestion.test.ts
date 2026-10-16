import { describe, it, expect } from 'vitest';
import { ExerciseQuestion } from '../types';
import { generateExamVariants, generateAzotaKeyHtml } from '../utils';

describe('Multiple Answer Question Support', () => {
    it('supports multiple-answer question format in types and models', () => {
        const question: ExerciseQuestion = {
            id: 'q-multi-1',
            category: 'mc',
            questionType: 'multiple-answer',
            mcType: 'multiple-answer',
            level: 'TH',
            criteria: '1.1',
            content: 'Những thiết bị nào sau đây là thiết bị vào của máy tính?',
            options: [
                { id: 'A', text: 'Bàn phím', isCorrect: true },
                { id: 'B', text: 'Màn hình', isCorrect: false },
                { id: 'C', text: 'Chuột', isCorrect: true },
                { id: 'D', text: 'Máy in', isCorrect: false }
            ],
            answer: 'A, C'
        };

        expect(question.questionType).toBe('multiple-answer');
        expect(question.mcType).toBe('multiple-answer');
        const correctOptions = question.options?.filter(o => o.isCorrect).map(o => o.id);
        expect(correctOptions).toEqual(['A', 'C']);
        expect(question.answer).toBe('A, C');
    });

    it('generates correct answer keys for multiple answer questions in Azota key HTML', () => {
        const questions: ExerciseQuestion[] = [
            {
                id: 'q1',
                category: 'mc',
                questionType: 'multiple-choice',
                level: 'NB',
                criteria: '1.1',
                content: 'Câu 1',
                options: [
                    { id: 'A', text: 'A', isCorrect: false },
                    { id: 'B', text: 'B', isCorrect: true },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'B'
            },
            {
                id: 'q2',
                category: 'mc',
                questionType: 'multiple-answer',
                mcType: 'multiple-answer',
                level: 'TH',
                criteria: '1.1',
                content: 'Câu 2',
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: false },
                    { id: 'C', text: 'C', isCorrect: true },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'A, C'
            }
        ];

        const keyHtml = generateAzotaKeyHtml(questions);
        expect(keyHtml).toContain('1. B');
        expect(keyHtml).toContain('2. A, C');
    });

    it('includes multiple-answer questions in Part 1 when generating exam variants', () => {
        const questions: ExerciseQuestion[] = [
            {
                id: 'q1',
                category: 'mc',
                questionType: 'multiple-choice',
                level: 'NB',
                criteria: '1.1',
                content: 'Câu hỏi đơn đáp án',
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: false },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'A'
            },
            {
                id: 'q2',
                category: 'mc',
                questionType: 'multiple-answer',
                mcType: 'multiple-answer',
                level: 'TH',
                criteria: '1.2',
                content: 'Câu hỏi nhiều đáp án',
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: true },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'A, B'
            }
        ];

        const variants = generateExamVariants(questions, ['101', '102'], false);
        expect(variants.length).toBe(2);
        // Both variants have both questions in Part 1
        expect(variants[0].questions.length).toBe(2);
        const multiQ = variants[0].questions.find((q: any) => q.questionType === 'multiple-answer');
        expect(multiQ).toBeDefined();
        expect(multiQ?.content).toBe('Câu hỏi nhiều đáp án');
    });

    it('toggles multiple options independently without clearing previous selections', () => {
        let options = [
            { id: 'A', text: 'Opt A', isCorrect: false },
            { id: 'B', text: 'Opt B', isCorrect: false },
            { id: 'C', text: 'Opt C', isCorrect: false },
            { id: 'D', text: 'Opt D', isCorrect: false }
        ];

        // Toggle A to true
        options = options.map(o => o.id === 'A' ? { ...o, isCorrect: !o.isCorrect } : o);
        // Toggle C to true
        options = options.map(o => o.id === 'C' ? { ...o, isCorrect: !o.isCorrect } : o);

        const correctIds = options.filter(o => o.isCorrect).map(o => o.id);
        const answer = correctIds.join(', ');

        expect(correctIds).toEqual(['A', 'C']);
        expect(answer).toBe('A, C');

        // Toggle C to false
        options = options.map(o => o.id === 'C' ? { ...o, isCorrect: !o.isCorrect } : o);
        const updatedCorrectIds = options.filter(o => o.isCorrect).map(o => o.id);
        const updatedAnswer = updatedCorrectIds.join(', ');

        expect(updatedCorrectIds).toEqual(['A']);
        expect(updatedAnswer).toBe('A');
    });

    it('parses pasted content with multiple starred options correctly', () => {
        const text = `Những thiết bị nào sau đây là thiết bị vào?
*A. Bàn phím
B. Màn hình
*C. Chuột
D. Loa`;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        const optionLines = lines.slice(1);
        const parsedOptions = [
            { id: 'A', text: '', isCorrect: false },
            { id: 'B', text: '', isCorrect: false },
            { id: 'C', text: '', isCorrect: false },
            { id: 'D', text: '', isCorrect: false },
        ];

        optionLines.forEach((line, idx) => {
            if (idx < 4) {
                const isCorrect = line.trim().startsWith('*');
                let cleanText = line.trim();
                if (isCorrect) cleanText = cleanText.substring(1).trim();
                cleanText = cleanText.replace(/^[A-Da-d][.)]\s*/, '').trim();
                parsedOptions[idx].text = cleanText;
                parsedOptions[idx].isCorrect = isCorrect;
            }
        });

        const correctCount = parsedOptions.filter(o => o.isCorrect).length;
        const mcType = correctCount > 1 ? 'multiple-answer' : 'multiple-choice';
        const correctAnswers = parsedOptions.filter(o => o.isCorrect).map(o => o.id).join(', ');

        expect(correctCount).toBe(2);
        expect(mcType).toBe('multiple-answer');
        expect(correctAnswers).toBe('A, C');
        expect(parsedOptions[0].isCorrect).toBe(true);
        expect(parsedOptions[1].isCorrect).toBe(false);
        expect(parsedOptions[2].isCorrect).toBe(true);
        expect(parsedOptions[3].isCorrect).toBe(false);
    });
});
