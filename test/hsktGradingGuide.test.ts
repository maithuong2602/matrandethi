import { describe, it, expect } from 'vitest';
import { isQuestionForHskt, generateExamWordHtml } from '../utils';
import { ExerciseQuestion } from '../types';

describe('HSKT (Học sinh khuyết tật) Grading Guide', () => {
    const mockHsktChecked = {
        // Teacher ticked 1.1 in Bài 1 (Khối 6)
        "1.1 Phân biệt được thông tin với vật mang tin.": true,
        // Teacher also ticked 2.1 in Bài 1
        "Bài 1. Thông tin và dữ liệu:::2.1": true
    };

    it('correctly includes question from Bài 1 with criteria 1.1', () => {
        const qBai1_11: ExerciseQuestion = {
            id: 'q1',
            category: 'mc',
            grade: '6',
            lesson: 'Bài 1. Thông tin và dữ liệu',
            level: 'NB',
            criteria: '1.1',
            content: 'Vật nào sau đây là vật mang tin?',
            options: [
                { id: 'A', text: 'Sách giáo khoa', isCorrect: true },
                { id: 'B', text: 'Tiếng còi', isCorrect: false }
            ],
            answer: 'A'
        };

        expect(isQuestionForHskt(qBai1_11, mockHsktChecked, '6')).toBe(true);
    });

    it('excludes question from Bài 2 with criteria 1.1 that was not ticked', () => {
        const qBai2_11: ExerciseQuestion = {
            id: 'q2',
            category: 'mc',
            grade: '6',
            lesson: 'Bài 2. Xử lí thông tin',
            level: 'NB',
            criteria: '1.1', // Code 1.1 in Bài 2 is "1.1 Nêu được các bước...", not ticked!
            content: 'Nêu các bước xử lí thông tin?',
            options: [
                { id: 'A', text: 'Thu nhận, lưu trữ, xử lí, truyền', isCorrect: true },
                { id: 'B', text: 'Chỉ thu nhận', isCorrect: false }
            ],
            answer: 'A'
        };

        expect(isQuestionForHskt(qBai2_11, mockHsktChecked, '6')).toBe(false);
    });

    it('excludes question from Bài 1 with criteria 1.2 that was not ticked', () => {
        const qBai1_12: ExerciseQuestion = {
            id: 'q3',
            category: 'mc',
            grade: '6',
            lesson: 'Bài 1. Thông tin và dữ liệu',
            level: 'NB',
            criteria: '1.2',
            content: 'Phát biểu nào đúng về thông tin và dữ liệu?',
            options: [
                { id: 'A', text: 'Đáp án A', isCorrect: true },
                { id: 'B', text: 'Đáp án B', isCorrect: false }
            ],
            answer: 'A'
        };

        expect(isQuestionForHskt(qBai1_12, mockHsktChecked, '6')).toBe(false);
    });

    it('renders "Miễn" for excluded questions and answer for included questions in Word HTML', () => {
        localStorage.setItem('hsktChecked', JSON.stringify(mockHsktChecked));

        const questions: ExerciseQuestion[] = [
            {
                id: 'q1',
                category: 'mc',
                grade: '6',
                lesson: 'Bài 1. Thông tin và dữ liệu',
                level: 'NB',
                criteria: '1.1',
                content: 'Câu 1 (Được tick đỏ cho HSKT)',
                options: [
                    { id: 'A', text: 'A đúng', isCorrect: true },
                    { id: 'B', text: 'B sai', isCorrect: false }
                ],
                answer: 'A',
                points: 0.25
            },
            {
                id: 'q2',
                category: 'mc',
                grade: '6',
                lesson: 'Bài 2. Xử lí thông tin',
                level: 'NB',
                criteria: '1.1',
                content: 'Câu 2 (Không được tick đỏ ở Bài 2)',
                options: [
                    { id: 'A', text: 'A sai', isCorrect: false },
                    { id: 'B', text: 'B đúng', isCorrect: true }
                ],
                answer: 'B',
                points: 0.25
            }
        ];

        const headerInfo = {
            tenTruong: 'THCS Lê Hồng Phong',
            tenKyThi: 'Kiểm tra giữa kì 1',
            monHoc: 'Tin học 6',
            thoiGian: '45 phút'
        };

        const html = generateExamWordHtml(questions, headerInfo);

        // Standard table must show both answers
        expect(html).toContain('Hướng dẫn chấm dành cho HSKT');
        // HSKT table should have "A" for Câu 1 and "Miễn" for Câu 2
        expect(html).toContain('>Miễn<');

        // Cleanup
        localStorage.removeItem('hsktChecked');
    });
});
