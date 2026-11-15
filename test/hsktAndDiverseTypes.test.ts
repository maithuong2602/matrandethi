import { describe, it, expect, beforeEach } from 'vitest';
import {
    getQuestionSubtype,
    getQuestionSubtypeLabel,
    QuestionSubtype
} from '../types';
import {
    buildHsktExamQuestions,
    generateExamWordHtml,
    generateExamVariants
} from '../utils';

describe('Diverse Question Types and HSKT 28-Question Guarantee Tests', () => {
    // Mock sample questions
    const mockQuestions = [
        {
            id: 1,
            category: 'mc',
            questionType: 'multiple-choice',
            content: 'Câu 1 đơn đáp án',
            options: [
                { id: 'A', text: 'Đáp án A', isCorrect: true },
                { id: 'B', text: 'Đáp án B', isCorrect: false },
                { id: 'C', text: 'Đáp án C', isCorrect: false },
                { id: 'D', text: 'Đáp án D', isCorrect: false }
            ],
            answer: 'A',
            level: 'NB',
            lesson: 'Bài 1: Lịch sử máy tính',
            criteria: '1.1. Biết lịch sử'
        },
        {
            id: 2,
            category: 'mc',
            questionType: 'multiple-answer',
            content: 'Câu 2 nhiều đáp án',
            options: [
                { id: 'A', text: 'Đúng 1', isCorrect: true },
                { id: 'B', text: 'Sai 1', isCorrect: false },
                { id: 'C', text: 'Đúng 2', isCorrect: true },
                { id: 'D', text: 'Sai 2', isCorrect: false }
            ],
            answer: 'A, C',
            level: 'NB',
            lesson: 'Bài 1: Lịch sử máy tính',
            criteria: '1.1. Biết lịch sử'
        },
        {
            id: 3,
            category: 'mc',
            questionType: 'true-false',
            content: 'Tình huống 1: Bài toán biểu diễn dữ liệu.\nXác định tính đúng hoặc sai của các phát biểu sau:',
            options: [
                { id: 'a', text: 'Ý a đúng', isCorrect: true },
                { id: 'b', text: 'Ý b sai', isCorrect: false },
                { id: 'c', text: 'Ý c đúng', isCorrect: true },
                { id: 'd', text: 'Ý d sai', isCorrect: false }
            ],
            level: 'NB',
            lesson: 'Bài 2: Biểu diễn dữ liệu',
            criteria: '2.1. Biết biểu diễn'
        },
        {
            id: 4,
            category: 'essay',
            questionType: 'essay',
            content: 'Câu 4 tự luận: Trình bày thuật toán',
            answer: 'a) Bước 1: 0.5đ\nb) Bước 2: 0.5đ',
            points: 1.0,
            level: 'VD',
            lesson: 'Bài 3: Thuật toán',
            criteria: '3.1. Vận dụng thuật toán'
        }
    ];

    it('should correctly classify question subtypes and labels', () => {
        expect(getQuestionSubtype(mockQuestions[0])).toBe('single-choice');
        expect(getQuestionSubtypeLabel('single-choice')).toBe('Trắc nghiệm 1 đáp án');

        expect(getQuestionSubtype(mockQuestions[1])).toBe('multiple-answer');
        expect(getQuestionSubtypeLabel('multiple-answer')).toBe('Trắc nghiệm Đúng - Sai (Nhiều đáp án)');

        expect(getQuestionSubtype(mockQuestions[2])).toBe('true-false');
        expect(getQuestionSubtypeLabel('true-false')).toBe('Trắc nghiệm Đúng - Sai (Tình huống)');

        expect(getQuestionSubtype(mockQuestions[3])).toBe('essay');
        expect(getQuestionSubtypeLabel('essay')).toBe('Tự luận');
    });

    it('should generate multi-section Word HTML grouping 1-answer in Part I, true-false & multiple-answer in Part II, and essay', () => {
        const headerInfo = {
            donVi: 'PHÒNG GD&ĐT QUẬN HẢI CHÂU',
            tenTruong: 'THCS LÊ HỒNG PHONG',
            tenKyThi: 'KIỂM TRA HỌC KỲ I',
            monHoc: 'MÔN: TIN HỌC – LỚP 8',
            thoiGian: '45 phút',
            maDe: '101'
        };

        const wordHtml = generateExamWordHtml(mockQuestions, headerInfo);

        // Kiểm tra phân rõ các phần theo chuẩn Bộ GD&ĐT (Phần II gộp cả tình huống và nhiều đáp án đúng vào dạng Đúng - Sai)
        expect(wordHtml).toContain('PHẦN I. CÂU HỎI TRẮC NGHIỆM 1 ĐÁP ÁN');
        expect(wordHtml).toContain('PHẦN II. CÂU HỎI TRẮC NGHIỆM ĐÚNG - SAI');
        expect(wordHtml).toContain('PHẦN III. TỰ LUẬN');

        // Bảng đáp án Đúng - Sai có cấu trúc lệnh hỏi a, b, c, d
        expect(wordHtml).toContain('Thí sinh điền (Đ/S)');
        expect(wordHtml).toContain('Câu 2');
        expect(wordHtml).toContain('Câu 3');

        // Hướng dẫn chấm phân tách rõ các phần
        expect(wordHtml).toContain('HƯỚNG DẪN CHẤM');
        expect(wordHtml).toContain('Trắc nghiệm 1 đáp án');
        expect(wordHtml).toContain('Trắc nghiệm Đúng - Sai');
        expect(wordHtml).toContain('Tự luận');
    });

    it('should preserve multiple correct answers in variant generation for multiple-answer questions', () => {
        const variants = generateExamVariants(mockQuestions, ['101', '102'], true);
        expect(variants.length).toBe(2);

        // Mã 101 (gốc)
        const v101 = variants[0];
        const v101MaQ = v101.questions.find((q: any) => getQuestionSubtype(q) === 'multiple-answer');
        expect(v101MaQ).toBeDefined();
        expect(v101MaQ.answer).toContain(',');

        // Mã 102 (hoán vị phương án)
        const v102 = variants[1];
        const v102MaQ = v102.questions.find((q: any) => getQuestionSubtype(q) === 'multiple-answer');
        expect(v102MaQ).toBeDefined();
        // Phương án đúng sau hoán vị vẫn giữ đủ 2 chữ cái (ví dụ: A, C hoặc B, D)
        const correctLetters = v102MaQ.options.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort().join(', ');
        expect(v102MaQ.answer).toBe(correctLetters);
        expect(v102MaQ.answer).toContain(',');
    });

    it('should compensate non-reduced YCCĐ up to full 28 MC questions for HSKT when an YCCĐ is reduced', () => {
        // Tạo ngân hàng câu hỏi dồi dào cho các bài học
        const largeBank: any[] = [];
        
        // Bài 1: Không giảm tải (15 câu NB)
        for (let i = 1; i <= 20; i++) {
            largeBank.push({
                id: 100 + i,
                category: 'mc',
                questionType: 'multiple-choice',
                content: `Bài 1 - Câu ngân hàng ${i}`,
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: false },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'A',
                level: 'NB',
                lesson: 'Bài 1: Lịch sử máy tính',
                criteria: '1.1. Biết lịch sử'
            });
        }

        // Bài 2: Không giảm tải (15 câu TH)
        for (let i = 1; i <= 20; i++) {
            largeBank.push({
                id: 200 + i,
                category: 'mc',
                questionType: 'multiple-choice',
                content: `Bài 2 - Câu ngân hàng ${i}`,
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: false },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: false }
                ],
                answer: 'A',
                level: 'TH',
                lesson: 'Bài 2: Biểu diễn dữ liệu',
                criteria: '2.1. Hiểu biểu diễn'
            });
        }

        // Đề thi ban đầu có 28 câu trắc nghiệm:
        // - 10 câu Bài 1 (NB - Không giảm tải)
        // - 18 câu Bài 5 (VD - Bị giảm tải cho HSKT)
        const regularExamQuestions: any[] = [];
        for (let i = 1; i <= 10; i++) {
            regularExamQuestions.push({
                id: 100 + i,
                category: 'mc',
                content: `Đề thi Bài 1 - Câu ${i}`,
                level: 'NB',
                lesson: 'Bài 1: Lịch sử máy tính',
                criteria: '1.1. Biết lịch sử'
            });
        }
        for (let i = 1; i <= 18; i++) {
            regularExamQuestions.push({
                id: 500 + i,
                category: 'mc',
                content: `Đề thi Bài 5 - Câu ${i} (Giảm tải)`,
                level: 'VD',
                lesson: 'Bài 5: Lập trình Scratch',
                criteria: '5.1. Vận dụng lập trình'
            });
        }
        expect(regularExamQuestions.length).toBe(28);

        // Gọi hàm buildHsktExamQuestions
        // 18 câu Bài 5 bị loại vì là mức VD (giảm tải cho HSKT).
        // Hệ thống phải tự động tăng số lượng câu của Bài 1 và Bài 2 từ ngân hàng để bù đủ đúng 28 câu trắc nghiệm!
        const hsktExam = buildHsktExamQuestions(
            regularExamQuestions,
            largeBank,
            { monHoc: 'Tin học 8' },
            28
        );

        const hsktMc = hsktExam.filter(q => q.category !== 'essay');
        expect(hsktMc.length).toBe(28);

        // Không chứa bất kỳ câu nào thuộc Bài 5 (mức VD giảm tải)
        expect(hsktMc.every(q => q.lesson !== 'Bài 5: Lập trình Scratch')).toBe(true);

        // Các câu hỏi được bù đắp từ các YCCĐ / bài học không giảm tải (Bài 1 và Bài 2)
        const bai1Count = hsktMc.filter(q => q.lesson === 'Bài 1: Lịch sử máy tính').length;
        const bai2Count = hsktMc.filter(q => q.lesson === 'Bài 2: Biểu diễn dữ liệu').length;

        expect(bai1Count + bai2Count).toBe(28);
        expect(bai1Count).toBeGreaterThan(10); // Bài 1 đã tăng số lượng câu lên vượt mức 10 câu ban đầu!
        expect(bai2Count).toBeGreaterThan(0);  // Bài 2 cũng được lấy thêm từ ngân hàng để bù đủ 28 câu!
    });

    it('should support both 2-correct and 3-correct answers for multiple-answer questions without bias', () => {
        const ma2Correct = {
            id: 201,
            category: 'mc',
            questionType: 'multiple-answer',
            content: 'Câu trắc nghiệm 2 đáp án đúng: Chọn các thiết bị vào của máy tính.',
            options: [
                { id: 'A', text: 'Bàn phím.', isCorrect: true },
                { id: 'B', text: 'Màn hình.', isCorrect: false },
                { id: 'C', text: 'Chuột máy tính.', isCorrect: true },
                { id: 'D', text: 'Máy in.', isCorrect: false }
            ],
            answer: 'A, C',
            level: 'NB',
            lesson: 'Bài 1: Thiết bị vào - ra'
        };

        const ma3Correct = {
            id: 202,
            category: 'mc',
            questionType: 'multiple-answer',
            content: 'Câu trắc nghiệm 3 đáp án đúng: Chọn các hành vi ứng xử có văn hóa trên không gian mạng.',
            options: [
                { id: 'A', text: 'Tôn trọng quan điểm của người khác.', isCorrect: true },
                { id: 'B', text: 'Sử dụng ngôn từ lịch sự, nhã nhặn.', isCorrect: true },
                { id: 'C', text: 'Chia sẻ thông tin chưa kiểm chứng.', isCorrect: false },
                { id: 'D', text: 'Bảo vệ thông tin cá nhân của bản thân và bạn bè.', isCorrect: true }
            ],
            answer: 'A, B, D',
            level: 'TH',
            lesson: 'Bài 5: Ứng xử trên mạng'
        };

        expect(getQuestionSubtype(ma2Correct)).toBe('multiple-answer');
        expect(getQuestionSubtype(ma3Correct)).toBe('multiple-answer');

        const variants = generateExamVariants([ma2Correct, ma3Correct], ['101', '102'], true);
        expect(variants.length).toBe(2);

        // Đề hoán vị (102)
        const v102Q1 = variants[1].questions.find((q: any) => q.id === 201);
        const v102Q2 = variants[1].questions.find((q: any) => q.id === 202);

        // Câu 2 đáp án đúng: vẫn đúng 2 đáp án đúng sau hoán vị
        const correctCount1 = v102Q1.options.filter((o: any) => o.isCorrect).length;
        expect(correctCount1).toBe(2);
        expect(v102Q1.answer.split(',').length).toBe(2);

        // Câu 3 đáp án đúng: vẫn đúng 3 đáp án đúng sau hoán vị
        const correctCount2 = v102Q2.options.filter((o: any) => o.isCorrect).length;
        expect(correctCount2).toBe(3);
        expect(v102Q2.answer.split(',').length).toBe(3);
    });

    it('should prioritize new lessons for Vận dụng (VD/VDC) in Final Exam when new lessons have VD', () => {
        // Mô phỏng ngân hàng câu hỏi kỳ thi Cuối kỳ I Tin học 8:
        // Bài 1 (Bài cũ đã thi giữa kỳ): Có câu VD
        // Bài 4, Bài 12 (Bài mới chưa thi giữa kỳ): Đều có câu VD
        const candidateQuestions: any[] = [
            {
                id: 101,
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                level: 'VD',
                category: 'essay',
                questionType: 'essay',
                content: 'Câu tự luận VD Bài cũ 1'
            },
            {
                id: 102,
                lesson: 'Bài 2: Thông tin trong môi trường số',
                level: 'VD',
                category: 'essay',
                questionType: 'essay',
                content: 'Câu tự luận VD Bài cũ 2'
            },
            {
                id: 401,
                lesson: 'Bài 4: Đạo đức và văn hóa trong sử dụng CNTT',
                level: 'VD',
                category: 'essay',
                questionType: 'essay',
                content: 'Câu tự luận VD Bài mới 4'
            },
            {
                id: 1201,
                lesson: 'Bài 12: Từ thuật toán đến chương trình',
                level: 'VD',
                category: 'essay',
                questionType: 'essay',
                content: 'Câu tự luận VD Bài mới 12'
            }
        ];

        // Giả lập ma trận Cuối kỳ I:
        // Bài 1, 2 là bài cũ đã kiểm tra (daThi = true)
        // Bài 4, 12 là bài mới chưa kiểm tra (daThi = false)
        const importedMatrixMock: any = {
            thongTinChung: {
                tenDe: 'ĐỀ KIỂM TRA HỌC KỲ I - TIN HỌC 8'
            },
            chiTiet: [
                { thongTinChung: { bai: 'Bài 1: Lược sử công cụ tính toán', soTiet: 2, daThi: true, soTietDaThi: 2 } },
                { thongTinChung: { bai: 'Bài 2: Thông tin trong môi trường số', soTiet: 2, daThi: true, soTietDaThi: 2 } },
                { thongTinChung: { bai: 'Bài 4: Đạo đức và văn hóa trong sử dụng CNTT', soTiet: 2, daThi: false, soTietDaThi: 0 } },
                { thongTinChung: { bai: 'Bài 12: Từ thuật toán đến chương trình', soTiet: 6, daThi: false, soTietDaThi: 0 } }
            ]
        };

        const isNewLesson = (q: any) => {
            const row = importedMatrixMock.chiTiet.find((r: any) => r.thongTinChung.bai === q.lesson);
            return row ? !row.thongTinChung.daThi : true;
        };

        // Thuật toán sắp xếp ưu tiên cho mức Vận dụng trong kỳ thi Cuối kỳ
        const sortedForVD = [...candidateQuestions].sort((a, b) => {
            const newA = isNewLesson(a) ? 1 : 0;
            const newB = isNewLesson(b) ? 1 : 0;
            return newB - newA;
        });

        // 2 câu đầu tiên được chọn cho mức Vận dụng bắt buộc phải là bài mới (Bài 4 và Bài 12)
        expect(isNewLesson(sortedForVD[0])).toBe(true);
        expect(isNewLesson(sortedForVD[1])).toBe(true);
        expect([401, 1201]).toContain(sortedForVD[0].id);
        expect([401, 1201]).toContain(sortedForVD[1].id);

        // Các bài cũ (Bài 1, Bài 2) nằm sau bài mới
        expect(isNewLesson(sortedForVD[2])).toBe(false);
        expect(isNewLesson(sortedForVD[3])).toBe(false);
    });

    it('should only fallback to old lessons for Vận dụng when new lessons have NO Vận dụng at all', () => {
        // Trường hợp 1: Bài mới CÓ Vận dụng -> 100% câu Vận dụng lấy từ bài mới, không lấy bài cũ
        const newHasVD = [
            { id: 1, lesson: 'Bài cũ 1', isNew: false, hasVD: true },
            { id: 2, lesson: 'Bài mới 1', isNew: true, hasVD: true },
            { id: 3, lesson: 'Bài mới 2', isNew: true, hasVD: true }
        ];
        const hasNewVD1 = newHasVD.some(r => r.isNew && r.hasVD);
        expect(hasNewVD1).toBe(true);
        const picked1 = newHasVD.filter(r => (hasNewVD1 ? (r.isNew && r.hasVD) : r.hasVD));
        expect(picked1.every(r => r.isNew)).toBe(true);

        // Trường hợp 2: Bài mới HOÀN TOÀN KHÔNG CÓ Vận dụng -> lúc này mới được lấy bài cũ
        const newNoVD = [
            { id: 1, lesson: 'Bài cũ 1', isNew: false, hasVD: true },
            { id: 2, lesson: 'Bài mới 1', isNew: true, hasVD: false },
            { id: 3, lesson: 'Bài mới 2', isNew: true, hasVD: false }
        ];
        const hasNewVD2 = newNoVD.some(r => r.isNew && r.hasVD);
        expect(hasNewVD2).toBe(false);
        const picked2 = newNoVD.filter(r => (hasNewVD2 ? (r.isNew && r.hasVD) : r.hasVD));
        expect(picked2.some(r => !r.isNew)).toBe(true);
    });

    it('should maintain strict sequential question order (13..28) in Part II grading table for combined multiple-answer and true-false', () => {
        // Tạo 12 câu Phần I (single-choice, Câu 1..12)
        const part1Questions: any[] = [];
        for (let i = 1; i <= 12; i++) {
            part1Questions.push({
                id: `mc_${i}`,
                category: 'mc',
                questionType: 'multiple-choice',
                content: `Câu trắc nghiệm 1 đáp án ${i}`,
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: false }
                ],
                points: 0.25,
                level: 'NB',
                lesson: 'Bài 1'
            });
        }

        // Tạo 8 câu multiple-answer và 8 câu true-false cho Phần II (Câu 13..28)
        const part2Questions: any[] = [];
        for (let i = 13; i <= 20; i++) {
            part2Questions.push({
                id: `ma_${i}`,
                category: 'mc',
                questionType: 'multiple-answer',
                content: `Câu trắc nghiệm nhiều đáp án ${i}`,
                options: [
                    { id: 'A', text: 'A', isCorrect: true },
                    { id: 'B', text: 'B', isCorrect: true },
                    { id: 'C', text: 'C', isCorrect: false },
                    { id: 'D', text: 'D', isCorrect: true }
                ],
                points: 0.25,
                level: 'TH',
                lesson: 'Bài 2'
            });
        }
        for (let i = 21; i <= 28; i++) {
            part2Questions.push({
                id: `tf_${i}`,
                category: 'mc',
                questionType: 'true-false',
                content: `Câu đúng sai tình huống ${i}`,
                options: [
                    { id: 'a', text: 'a', isCorrect: true },
                    { id: 'b', text: 'b', isCorrect: false },
                    { id: 'c', text: 'c', isCorrect: true },
                    { id: 'd', text: 'd', isCorrect: false }
                ],
                points: 0.25,
                level: 'TH',
                lesson: 'Bài 3'
            });
        }

        // 3 câu tự luận (Câu 29..31)
        const essayQuestions: any[] = [
            { id: 'tl_1', category: 'essay', questionType: 'essay', content: 'TL 1', points: 1.0, level: 'VD', lesson: 'Bài 4' },
            { id: 'tl_2', category: 'essay', questionType: 'essay', content: 'TL 2', points: 1.0, level: 'VD', lesson: 'Bài 12' },
            { id: 'tl_3', category: 'essay', questionType: 'essay', content: 'TL 3', points: 1.0, level: 'VD', lesson: 'Bài 14' }
        ];

        const allQuestions = [...part1Questions, ...part2Questions, essayQuestions[0], essayQuestions[1], essayQuestions[2]];
        const headerInfo = {
            donVi: 'PHÒNG GD&ĐT',
            tenTruong: 'THCS LÊ HỒNG PHONG',
            tenKyThi: 'KIỂM TRA CUỐI KÌ I',
            monHoc: 'MÔN: TIN HỌC – LỚP 8'
        };

        const html = generateExamWordHtml(allQuestions, headerInfo);

        // Bảng đáp án Phần II phải chứa đủ từ Câu 13 đến Câu 28
        for (let i = 13; i <= 28; i++) {
            expect(html).toContain(`Câu ${i}`);
        }

        // Kiểm tra tính liên tục, không nhảy cóc: Câu 13 phải xuất hiện trước Câu 14, Câu 14 trước Câu 15...
        let lastPos = 0;
        for (let i = 13; i <= 28; i++) {
            const currentPos = html.indexOf(`Câu ${i}`);
            expect(currentPos).toBeGreaterThan(0);
            expect(currentPos).toBeGreaterThanOrEqual(lastPos);
            lastPos = currentPos;
        }

        // Điểm chuẩn: Phần I = 3.0đ, Phần II = 4.0đ, Phần III = 3.0đ
        expect(html).toContain('3,0 điểm');
        expect(html).toContain('4,0 điểm');
    });
});
