import { describe, it, expect } from 'vitest';
import { parseUploadedExam, extractTagsFromQuestionStem } from '../services/examUploadParserService';
import { generateExamWordHtml } from '../utils';

describe('examUploadParserService', () => {
    it('correctly extracts tags, level, criteria, lesson and points from question stem', () => {
        const rawStem = 'Câu 1 [NB - 1.1] [Trắc nghiệm 1 đáp án] (Bài 1: Lược sử công cụ tính toán) Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện chính nào? (0,25 điểm)';
        const res = extractTagsFromQuestionStem(rawStem);
        expect(res.level).toBe('NB');
        expect(res.criteria).toBe('1.1');
        expect(res.lesson).toBe('Bài 1: Lược sử công cụ tính toán');
        expect(res.subtype).toBe('single-choice');
        expect(res.points).toBe(0.25);
        expect(res.cleanStem).toBe('Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện chính nào?');
    });

    it('correctly parses an HTML exported by generateExamWordHtml', () => {
        const dummyQuestions = [
            {
                id: 'q1',
                category: 'mc',
                questionType: 'single-choice',
                level: 'NB',
                criteria: '1.1',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                content: 'Máy tính Pascaline được sáng chế vào năm nào?',
                options: [
                    { id: 'A', text: '1642.', isCorrect: false },
                    { id: 'B', text: '1834.', isCorrect: true },
                    { id: 'C', text: '1945.', isCorrect: false },
                    { id: 'D', text: '1970.', isCorrect: false }
                ],
                answer: 'B',
                points: 0.25
            },
            {
                id: 'q2',
                category: 'mc',
                questionType: 'true-false',
                level: 'TH',
                criteria: '2.1',
                lesson: 'Bài 2: Thông tin trong môi trường số',
                content: 'Xác định tính đúng hoặc sai về đặc điểm thông tin số:',
                options: [
                    { id: 'a', text: 'Dễ dàng sao chép và chia sẻ.', isCorrect: true },
                    { id: 'b', text: 'Không thể bị mất mát hay xóa bỏ.', isCorrect: false },
                    { id: 'c', text: 'Có thể lưu trữ lượng lớn dữ liệu.', isCorrect: true },
                    { id: 'd', text: 'Hoàn toàn không có rủi ro an toàn.', isCorrect: false }
                ],
                answer: 'a-Đ, b-S, c-Đ, d-S',
                points: 0.25
            },
            {
                id: 'q3',
                category: 'essay',
                questionType: 'essay',
                level: 'VD',
                criteria: '3.1',
                lesson: 'Bài 6: Sắp xếp và lọc dữ liệu',
                content: 'Em hãy nêu các bước thực hiện lọc dữ liệu trong bảng tính Excel.',
                answer: 'HƯỚNG DẪN CHẤM: Bước 1: Chọn bảng; Bước 2: Bấm Sort & Filter -> Filter; Bước 3: Nhấp vào mũi tên để chọn tiêu chí lọc.',
                points: 1.0
            }
        ];

        const dummyHeader = {
            donVi: 'UBND PHƯỜNG HẢI CHÂU',
            tenTruong: 'LÊ HỒNG PHONG',
            tenKyThi: 'KIỂM TRA CUỐI HỌC KỲ I - NĂM HỌC 2026–2027',
            monHoc: 'MÔN: TIN HỌC – LỚP 8',
            thoiGian: '45 phút (không kể thời gian giao đề)',
            maDe: '101'
        };

        const exportedHtml = generateExamWordHtml(dummyQuestions, dummyHeader);
        expect(exportedHtml).toContain('HƯỚNG DẪN CHẤM');

        const parsed = parseUploadedExam(exportedHtml, 'De_Thi_Tin_8.doc');

        expect(parsed.success).toBe(true);
        expect(parsed.sourceType).toBe('doc_html');
        expect(parsed.grade).toBe('8');
        expect(parsed.headerInfo.donVi).toContain('UBND');
        expect(parsed.headerInfo.tenTruong).toContain('LÊ HỒNG PHONG');
        expect(parsed.headerInfo.monHoc).toContain('TIN HỌC');
        expect(parsed.headerInfo.maDe).toBe('101');
        expect(parsed.stats.totalQuestions).toBe(3);

        // Check single-choice question
        const q1 = parsed.questions[0];
        expect(q1.questionType).toBe('single-choice');
        expect(q1.content).toContain('Máy tính Pascaline');
        expect(q1.options?.length).toBe(4);
        expect(q1.answer).toBe('B');
        expect(q1.options?.find(o => o.id === 'B')?.isCorrect).toBe(true);

        // Check true-false question
        const q2 = parsed.questions[1];
        expect(q2.questionType).toBe('true-false');
        expect(q2.options?.length).toBe(4);
        expect(q2.options?.find(o => o.id === 'a')?.isCorrect).toBe(true);
        expect(q2.options?.find(o => o.id === 'b')?.isCorrect).toBe(false);

        // Check essay question
        const q3 = parsed.questions[2];
        expect(q3.category).toBe('essay');
        expect(q3.content).toContain('lọc dữ liệu');
        expect(q3.points).toBe(1.0);
    });

    it('correctly parses JSON exported dossier', () => {
        const dossierJson = JSON.stringify({
            id: 'dossier_123',
            title: 'Đề Cuối Kì 1 Tin Học 8',
            grade: '8',
            headerInfo: {
                tenTruong: 'THCS Lê Hồng Phong',
                monHoc: 'Tin học 8',
                maDe: '101'
            },
            questions: [
                {
                    id: 'q1',
                    category: 'mc',
                    questionType: 'single-choice',
                    content: 'Nội dung câu 1',
                    options: [
                        { id: 'A', text: 'Đáp án A', isCorrect: true },
                        { id: 'B', text: 'Đáp án B', isCorrect: false }
                    ],
                    answer: 'A',
                    points: 0.25
                }
            ]
        });

        const parsed = parseUploadedExam(dossierJson);
        expect(parsed.success).toBe(true);
        expect(parsed.sourceType).toBe('json');
        expect(parsed.title).toBe('Đề Cuối Kì 1 Tin Học 8');
        expect(parsed.grade).toBe('8');
        expect(parsed.questions.length).toBe(1);
        expect(parsed.questions[0].answer).toBe('A');
    });

    it('handles empty or malformed files gracefully with clear error', () => {
        const emptyResult = parseUploadedExam('');
        expect(emptyResult.success).toBe(false);
        expect(emptyResult.error).toBeDefined();

        const gibberishResult = parseUploadedExam('Random non-exam text without any question structure');
        expect(gibberishResult.success).toBe(false);
        expect(gibberishResult.error).toContain('Không tìm thấy câu hỏi');
    });

    it('correctly parses full 28-question exam with true-false table format from image', () => {
        // Build 12 single-choice questions + 16 true-false questions + 2 essays
        const questions: any[] = [];
        for (let i = 1; i <= 12; i++) {
            questions.push({
                id: `mc_${i}`,
                category: 'mc',
                questionType: 'single-choice',
                level: 'NB',
                criteria: '1.1',
                lesson: 'Bài 1: Lược sử công cụ tính toán',
                content: `Nội dung câu hỏi trắc nghiệm ${i}`,
                options: [
                    { id: 'A', text: 'Phương án A.', isCorrect: i % 2 === 1 },
                    { id: 'B', text: 'Phương án B.', isCorrect: i % 2 === 0 },
                    { id: 'C', text: 'Phương án C.', isCorrect: false },
                    { id: 'D', text: 'Phương án D.', isCorrect: false }
                ],
                answer: i % 2 === 1 ? 'A' : 'B',
                points: 0.25
            });
        }
        for (let i = 13; i <= 28; i++) {
            questions.push({
                id: `tf_${i}`,
                category: 'mc',
                questionType: 'true-false',
                level: 'TH',
                criteria: '2.1',
                lesson: 'Bài 2: Thông tin trong môi trường số',
                content: `Xác định tính đúng hoặc sai câu ${i}:`,
                options: [
                    { id: 'a', text: 'Ý a đúng.', isCorrect: true },
                    { id: 'b', text: 'Ý b sai.', isCorrect: false },
                    { id: 'c', text: 'Ý c đúng.', isCorrect: true },
                    { id: 'd', text: 'Ý d sai.', isCorrect: false }
                ],
                answer: 'a-Đ, b-S, c-Đ, d-S',
                points: 0.25
            });
        }
        questions.push({
            id: 'es_29',
            category: 'essay',
            questionType: 'essay',
            level: 'VD',
            criteria: '3.1',
            lesson: 'Bài 6: Sắp xếp dữ liệu',
            content: 'Nêu các bước thực hiện thao tác sắp xếp trong Excel.',
            answer: 'HƯỚNG DẪN CHẤM: Bước 1... Bước 2...',
            points: 1.0
        });

        const header = {
            donVi: 'UBND PHƯỜNG HẢI CHÂU',
            tenTruong: 'THCS LÊ HỒNG PHONG',
            tenKyThi: 'KIỂM TRA CUỐI HỌC KỲ I - NĂM HỌC 2026–2027',
            monHoc: 'MÔN: TIN HỌC – LỚP 8',
            thoiGian: '45 phút',
            maDe: '101'
        };

        const html = generateExamWordHtml(questions, header);
        const res = parseUploadedExam(html, 'De_Thi_Lop_8.doc');

        expect(res.success).toBe(true);
        expect(res.stats.totalQuestions).toBe(29);
        expect(res.stats.singleChoiceCount).toBe(12);
        expect(res.stats.trueFalseCount).toBe(16);
        expect(res.stats.essayCount).toBe(1);
        expect(res.questions[0].answer).toBe('A');
        expect(res.questions[1].answer).toBe('B');
        expect(res.questions[12].questionType).toBe('true-false');
        expect(res.questions[12].options?.[0].isCorrect).toBe(true);
        expect(res.questions[12].options?.[1].isCorrect).toBe(false);
    });
});
