import { describe, it, expect } from 'vitest';
import {
    generateExamVariants,
    generateExamWordHtml,
    cleanQuestionContentForWord,
    generateAzotaKeyHtml
} from '../utils';

describe('Word Export Synchronization and Zero-Crash Robustness', () => {
    it('generateExamVariants safely returns empty array without throwing t.filter is not a function', () => {
        expect(() => generateExamVariants(null as any)).not.toThrow();
        expect(generateExamVariants(null as any)).toEqual([]);

        expect(() => generateExamVariants(undefined as any)).not.toThrow();
        expect(generateExamVariants(undefined as any)).toEqual([]);

        expect(() => generateExamVariants({} as any)).not.toThrow();
        expect(generateExamVariants({} as any)).toEqual([]);

        expect(() => generateExamVariants([])).not.toThrow();
        expect(generateExamVariants([])).toEqual([]);

        // Robustness against malformed questions (missing or non-array options)
        const malformed = [
            { id: 'q1', category: 'mc', questionType: 'single-choice', content: 'Test question?', options: null },
            { id: 'q2', category: 'mc', questionType: 'true-false', content: 'TF question?', options: 'invalid' }
        ];
        expect(() => generateExamVariants(malformed as any)).not.toThrow();
        const variants = generateExamVariants(malformed as any, ['101', '102']);
        expect(variants.length).toBe(2);
        expect(variants[0].code).toBe('101');
    });

    it('generateExamWordHtml and generateAzotaKeyHtml do not crash when given null or undefined questions', () => {
        expect(() => generateExamWordHtml(null as any, {})).not.toThrow();
        expect(() => generateExamWordHtml(undefined as any, {})).not.toThrow();

        expect(() => generateAzotaKeyHtml(null as any)).not.toThrow();
        expect(generateAzotaKeyHtml(null as any)).toBe('');

        expect(() => generateAzotaKeyHtml(undefined as any)).not.toThrow();
        expect(generateAzotaKeyHtml(undefined as any)).toBe('');
    });

    it('cleanQuestionContentForWord strips all bracket tags cleanly from question content', () => {
        const raw1 = 'Câu 1. [Trắc nghiệm 1 đáp án] [NB] Trong năm 1642, Pascal sáng chế ra chiếc máy tính cơ khí';
        expect(cleanQuestionContentForWord(raw1)).toBe('Trong năm 1642, Pascal sáng chế ra chiếc máy tính cơ khí');

        const raw2 = '[NB - 1.1] [Trắc nghiệm 1 đáp án] (Bài 1: Lược sử công cụ tính toán) Máy tính Harvard Mark I được chế tạo thành công vào năm nào?';
        expect(cleanQuestionContentForWord(raw2)).toBe('Máy tính Harvard Mark I được chế tạo thành công vào năm nào?');

        const raw3 = '(Bài 2: Thông tin trong môi trường số) Đặc điểm nào đúng về việc xử lí và chia sẻ thông tin số?';
        expect(cleanQuestionContentForWord(raw3)).toBe('Đặc điểm nào đúng về việc xử lí và chia sẻ thông tin số?');
    });

    it('generateExamWordHtml preserves the exact order and numbering of active questions as displayed on web UI', () => {
        const dummyQuestions = [
            {
                id: 'harvard_mark_1',
                uniqueId: 1001,
                category: 'mc',
                questionType: 'single-choice',
                level: 'NB',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                content: 'Máy tính Harvard Mark I được chế tạo thành công vào năm nào?',
                options: [
                    { id: 'A', text: '1642', isCorrect: false },
                    { id: 'B', text: '1833', isCorrect: false },
                    { id: 'C', text: '1945', isCorrect: false },
                    { id: 'D', text: '1943', isCorrect: true }
                ],
                answer: 'D',
                points: 0.25
            },
            {
                id: 'lan_photo_question',
                uniqueId: 1002,
                category: 'mc',
                questionType: 'single-choice',
                level: 'NB',
                lesson: 'Bài 2: Thông tin trong môi trường số',
                content: 'Lan muốn chỉnh sửa một bức ảnh số rồi gửi cho các bạn qua Internet. Nhận xét nào đúng về thông tin số?',
                options: [
                    { id: 'A', text: 'Thông tin số không thể chỉnh sửa.', isCorrect: false },
                    { id: 'B', text: 'Có nhiều công cụ hỗ trợ xử lí và chia sẻ thông tin số.', isCorrect: true },
                    { id: 'C', text: 'Thông tin số chỉ có thể trao đổi trực tiếp.', isCorrect: false },
                    { id: 'D', text: 'Thông tin số không thể truyền qua Internet.', isCorrect: false }
                ],
                answer: 'B',
                points: 0.25
            }
        ];

        const headerInfo = {
            donVi: 'UBND PHƯỜNG HẢI CHÂU',
            tenTruong: 'LÊ HỒNG PHONG',
            tenKyThi: 'KIỂM TRA GIỮA KỲ 1',
            monHoc: 'TIN HỌC 8',
            maDe: '101'
        };

        const html = generateExamWordHtml(dummyQuestions, headerInfo);

        // Câu 1 must be Harvard Mark I
        const idxHarvard = html.indexOf('Máy tính Harvard Mark I');
        const idxLan = html.indexOf('Lan muốn chỉnh sửa một bức ảnh số');

        expect(idxHarvard).toBeGreaterThan(-1);
        expect(idxLan).toBeGreaterThan(-1);
        expect(idxHarvard).toBeLessThan(idxLan);

        // Harvard Mark I must be preceded by Câu 1.
        expect(html).toContain('<strong>Câu 1.</strong> Máy tính Harvard Mark I');
        // Lan must be preceded by Câu 2.
        expect(html).toContain('<strong>Câu 2.</strong> Lan muốn chỉnh sửa');
    });

    it('generateAzotaKeyHtml produces valid formatted answers', () => {
        const dummy = [
            {
                id: 'q1',
                category: 'mc',
                questionType: 'single-choice',
                options: [
                    { id: 'A', text: 'Opt A', isCorrect: false },
                    { id: 'B', text: 'Opt B', isCorrect: true }
                ]
            },
            {
                id: 'q2',
                category: 'mc',
                questionType: 'true-false',
                options: [
                    { id: 'a', text: 'Opt a', isCorrect: true },
                    { id: 'b', text: 'Opt b', isCorrect: false }
                ]
            }
        ];
        const res = generateAzotaKeyHtml(dummy);
        expect(res).toContain('1. B');
        expect(res).toContain('2. a-Đ, b-S');
    });
});
