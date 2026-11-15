import { describe, it, expect, beforeEach } from 'vitest';
import {
    buildSimilarQuestionPrompt,
    buildBulkSimilarExamPrompt,
    parseAndMapBulkSimilarQuestions,
    formatQuestionOptionsAndAnswer
} from '../services/similarPromptService';
import { BankQuestion } from '../pages/ExamGenerator';
import { cleanQuestionContentForWord, generateExamWordHtml } from '../utils';
import {
    getSavedSimilarExams,
    saveSimilarExamDossier,
    deleteSimilarExamDossier,
    duplicateSimilarExamDossier,
    exportSimilarExamBankJson,
    importSimilarExamBankJson,
    SIMILAR_EXAM_STORAGE_KEY
} from '../services/similarExamService';

describe('similarPromptService: Single and Bulk Similar Question Generation', () => {
    const mockQuestionSingle: BankQuestion = {
        id: 'q1',
        uniqueId: 101,
        category: 'mc',
        questionType: 'multiple-choice',
        mcType: 'multiple-choice',
        level: 'NB',
        lesson: 'Bài 1: Lược sử công cụ tính toán',
        criteria: '1.1',
        content: 'Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện chính nào?',
        options: [
            { id: 'A', text: 'Bóng bán dẫn.', isCorrect: false },
            { id: 'B', text: 'Đèn điện tử chân không.', isCorrect: true },
            { id: 'C', text: 'Mạch tích hợp.', isCorrect: false },
            { id: 'D', text: 'Bộ vi xử lí.', isCorrect: false }
        ],
        answer: 'B',
        points: 0.25
    };

    const mockQuestionTF: BankQuestion = {
        id: 'q2',
        uniqueId: 102,
        category: 'mc',
        questionType: 'true-false',
        mcType: 'true-false',
        level: 'TH',
        lesson: 'Bài 2: Thông tin trong môi trường số',
        criteria: '2.1',
        content: 'Một nhóm học sinh thực hiện dự án tìm kiếm và chia sẻ thông tin trên Internet.',
        options: [
            { id: 'a', text: 'Thông tin trên mạng xã hội luôn được kiểm chứng chính xác 100%.', isCorrect: false },
            { id: 'b', text: 'Cần trích dẫn nguồn khi sử dụng bài viết của người khác.', isCorrect: true },
            { id: 'c', text: 'Mọi thông tin tải về đều được tự do sao chép thương mại.', isCorrect: false },
            { id: 'd', text: 'Nên kiểm tra tính cập nhật và tác giả trước khi sử dụng.', isCorrect: true }
        ],
        answer: 'a-S, b-Đ, c-S, d-Đ',
        points: 0.25
    };

    const mockQuestionEssay: BankQuestion = {
        id: 'q3',
        uniqueId: 103,
        category: 'essay',
        questionType: 'essay',
        level: 'VD',
        lesson: 'Bài 14: Cấu trúc điều khiển',
        criteria: '3.1',
        content: 'Em hãy viết thuật toán và chương trình giải bài toán kiểm tra tính chẵn lẻ của một số nguyên.\na) Nêu dữ liệu đầu vào và đầu ra.\nb) Trình bày thuật toán bằng sơ đồ khối hoặc liệt kê các bước.\nc) Viết đoạn chương trình ngắn minh họa.\nd) Nêu ý nghĩa của câu lệnh rẽ nhánh trong bài toán này.',
        options: [],
        answer: 'a) Input: số nguyên n; Output: thông báo chẵn hoặc lẻ - 0,25 điểm.\nb) Nếu n chia hết cho 2 thì chẵn, ngược lại lẻ - 0,25 điểm.\nc) Đoạn mã Scratch/Python đúng cú pháp - 0,25 điểm.\nd) Giúp máy tính tự động đưa ra quyết định dựa trên điều kiện - 0,25 điểm.',
        points: 1.0
    };

    it('1. formats question options and answers accurately', () => {
        const singleFmt = formatQuestionOptionsAndAnswer(mockQuestionSingle);
        expect(singleFmt).toContain('*B. Đèn điện tử chân không.');
        expect(singleFmt).toContain('Đáp án: B');

        const tfFmt = formatQuestionOptionsAndAnswer(mockQuestionTF);
        expect(tfFmt).toContain('a) Thông tin trên mạng xã hội luôn được kiểm chứng chính xác 100%. [Sai]');
        expect(tfFmt).toContain('b) Cần trích dẫn nguồn khi sử dụng bài viết của người khác. [Đúng]');
        expect(tfFmt).toContain('Đáp án: a-S, b-Đ, c-S, d-Đ');
    });

    it('2. builds single question prompt with strict GDPT 2018 instructions and context restriction', () => {
        const customContext = 'Nghiên cứu về lịch sử các dòng máy tính cá nhân IBM PC và Apple Macintosh từ năm 1980 đến 1990.';
        const prompt = buildSimilarQuestionPrompt(mockQuestionSingle, 0, customContext, '8');

        expect(prompt).toContain('Câu 1');
        expect(prompt).toContain('Bài 1: Lược sử công cụ tính toán');
        expect(prompt).toContain('Trắc nghiệm 1 đáp án');
        expect(prompt).toContain('NB');
        expect(prompt).toContain('NGUỒN TÀI LIỆU / NGỮ CẢNH CUNG CẤP');
        expect(prompt).toContain('Apple Macintosh');
        expect(prompt).toContain('CHỈ ĐỔI NGỮ CẢNH');
        expect(prompt).toContain('GIỮ NGUYÊN HOÀN TOÀN');
    });

    it('3. builds single prompt for True/False questions emphasizing flexible 2Đ2S / 3Đ1S / 3S1Đ distribution', () => {
        const prompt = buildSimilarQuestionPrompt(mockQuestionTF, 1, undefined, '8');
        expect(prompt).toContain('Đúng/Sai');
        expect(prompt).toContain('TUYỆT ĐỐI KHÔNG RẬP KHUÔN 2 ĐÚNG 2 SAI');
        expect(prompt).toContain('3 phát biểu Sai - 1 phát biểu Đúng');
        expect(prompt).toContain('3 phát biểu Đúng - 1 phát biểu Sai');
    });

    it('4. builds bulk exam prompt preserving 100% question positions from Câu 1..N', () => {
        const examList = [mockQuestionSingle, mockQuestionTF, mockQuestionEssay];
        const bulkContext = 'Chủ đề: Ứng dụng trí tuệ nhân tạo và chuyển đổi số trong giáo dục.';
        const prompt = buildBulkSimilarExamPrompt(examList, bulkContext, 'all', '8');

        expect(prompt).toContain('GIỮ NGUYÊN 100% VỊ TRÍ VÀ THỨ TỰ CÂU HỎI');
        expect(prompt).toContain('[CÂU 1]');
        expect(prompt).toContain('[CÂU 2]');
        expect(prompt).toContain('[CÂU 3]');
        expect(prompt).toContain('Chủ đề: Ứng dụng trí tuệ nhân tạo');
    });

    it('5. parses and replaces bulk questions into exact slot preserving original points and metadata', () => {
        const examList = [mockQuestionSingle, mockQuestionTF, mockQuestionEssay];

        const rawPastedResult = `
Câu 1: [Trắc nghiệm 1 đáp án] [NB] Máy tính cá nhân IBM PC ra đời năm 1981 sử dụng bộ vi xử lý nào?
A. Intel 4004.
*B. Intel 8088.
C. MOS 6502.
D. Zilog Z80.
Đáp án: B

Câu 2: [Đúng/Sai] [TH] Tình huống: Một doanh nghiệp triển khai hệ thống lưu trữ dữ liệu trên đám mây.
Xác định tính đúng hoặc sai của các phát biểu sau:
a) Dữ liệu đám mây có thể truy cập từ mọi thiết bị có kết nối Internet. [Đúng]
b) Doanh nghiệp không cần quan tâm đến sao lưu dự phòng vì nhà cung cấp luôn an toàn tuyệt đối. [Sai]
c) Người quản trị cần thiết lập mật khẩu mạnh và xác thực hai yếu tố. [Đúng]
d) Bất kỳ ai trên Internet đều có thể xem toàn bộ dữ liệu nội bộ của công ty. [Sai]
Đáp án: a-Đ, b-S, c-Đ, d-S

Câu 3: [Tự luận] [VD] Em hãy viết thuật toán tính tổng các số chẵn từ 1 đến N.
a) Xác định Input và Output của bài toán.
b) Mô tả thuật toán bằng ngôn ngữ tự nhiên hoặc sơ đồ khối.
c) Viết chương trình thực hiện thuật toán.
d) Giải thích ý nghĩa biến đếm trong vòng lặp.
Hướng dẫn chấm:
a) Input: số N; Output: tổng S - 0,25 điểm.
b) Các bước lặp từ 2 đến N với bước nhảy 2 - 0,25 điểm.
c) Chương trình hoàn chỉnh đúng cú pháp - 0,25 điểm.
d) Biến đếm điều khiển số lần lặp chính xác - 0,25 điểm.
        `;

        const res = parseAndMapBulkSimilarQuestions(rawPastedResult, examList);
        expect(res.appliedCount).toBe(3);
        expect(res.updatedQuestions).toHaveLength(3);

        // Check Câu 1 replaced in slot 0, keeping points = 0.25 and NO tags in content
        expect(res.updatedQuestions[0].content).toContain('Máy tính cá nhân IBM PC ra đời năm 1981');
        expect(res.updatedQuestions[0].content).not.toContain('[Trắc nghiệm 1 đáp án]');
        expect(res.updatedQuestions[0].content).not.toContain('[NB]');
        expect(res.updatedQuestions[0].points).toBe(0.25);
        expect(res.updatedQuestions[0].lesson).toBe('Bài 1: Lược sử công cụ tính toán');

        // Check Câu 2 replaced in slot 1, keeping points = 0.25 and NO tags in content
        expect(res.updatedQuestions[1].content).toContain('Một doanh nghiệp triển khai');
        expect(res.updatedQuestions[1].content).not.toContain('[Đúng/Sai]');
        expect(res.updatedQuestions[1].content).not.toContain('[TH]');
        expect(res.updatedQuestions[1].points).toBe(0.25);
        expect(res.updatedQuestions[1].questionType).toBe('true-false');

        // Check Câu 3 replaced in slot 2, keeping points = 1.0 and NO tags in content
        expect(res.updatedQuestions[2].content).toContain('Em hãy viết thuật toán tính tổng các số chẵn từ 1 đến N');
        expect(res.updatedQuestions[2].content).not.toContain('[Tự luận]');
        expect(res.updatedQuestions[2].content).not.toContain('[VD]');
        expect(res.updatedQuestions[2].points).toBe(1.0);
        expect(res.updatedQuestions[2].category).toBe('essay');
    });

    it('6. cleanQuestionContentForWord removes all bracketed metadata and leading tags leaving pure question text', () => {
        const rawContentWithTags = '[Trắc nghiệm 1 đáp án] [NB] Trong giới thiệu chiếc máy tính cơ khí Pascaline năm 1642...';
        const cleaned = cleanQuestionContentForWord(rawContentWithTags);
        expect(cleaned).toBe('Trong giới thiệu chiếc máy tính cơ khí Pascaline năm 1642...');
        expect(cleaned).not.toContain('[Trắc nghiệm 1 đáp án]');
        expect(cleaned).not.toContain('[NB]');

        const rawTF = '[Đúng/Sai] [TH] Cho tình huống về an toàn thông tin mạng.';
        expect(cleanQuestionContentForWord(rawTF)).toBe('Cho tình huống về an toàn thông tin mạng.');

        const rawMultipleAns = '[Trắc nghiệm nhiều đáp án] [VD] Những phương án nào sau đây đúng?';
        expect(cleanQuestionContentForWord(rawMultipleAns)).toBe('Những phương án nào sau đây đúng?');

        const rawWithPrefix = 'Câu 1: [Nhận biết] Khái niệm hệ điều hành là:';
        expect(cleanQuestionContentForWord(rawWithPrefix)).toBe('Khái niệm hệ điều hành là:');
    });

    it('7. generateExamWordHtml produces clean question text without [Trắc nghiệm 1 đáp án] tags in Word document', () => {
        const dirtyQuestion: BankQuestion = {
            ...mockQuestionSingle,
            content: '[Trắc nghiệm 1 đáp án] [NB] Trong giới thiệu chiếc máy tính cơ khí Pascaline năm 1642, nhà khoa học Pascal đã chế tạo nhằm mục đích gì?'
        };

        const wordHtml = generateExamWordHtml(
            [dirtyQuestion],
            [],
            'Trường THCS A',
            'ĐỀ KIỂM TRA CUỐI HỌC KỲ I',
            'Tin học',
            '8',
            '45 phút',
            '2024-2025',
            '101'
        );

        // Word output must NOT contain [Trắc nghiệm 1 đáp án] or [NB] in question body
        expect(wordHtml).not.toContain('[Trắc nghiệm 1 đáp án]');
        expect(wordHtml).not.toContain('[NB]');
        expect(wordHtml).toContain('Trong giới thiệu chiếc máy tính cơ khí Pascaline năm 1642');
    });

    describe('Separate Similar Exam Repository (Kho Đề Tương Tự)', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('8. saves to separate similar exam storage key and isolates from main exam bank', () => {
            const similarDossier = {
                id: 'similar-exam-001',
                title: 'ĐỀ THI TƯƠNG TỰ SỐ 1 - TIN HỌC 8 CUỐI KỲ I',
                grade: '8',
                term: 'CK1',
                questions: [mockQuestionSingle, mockQuestionTF],
                createdAt: new Date().toISOString()
            };

            // Save to Similar repository
            saveSimilarExamDossier(similarDossier as any);

            // Verify it is present in similar exam storage
            const similarList = getSavedSimilarExams();
            expect(similarList).toHaveLength(1);
            expect(similarList[0].id).toBe('similar-exam-001');

            // Verify it does NOT touch the main exam bank key
            const mainBankRaw = localStorage.getItem('matrandethi_saved_exams');
            expect(mainBankRaw).toBeNull();
        });

        it('9. supports duplicate, delete, and JSON export/import on similar exam repository', () => {
            const original = {
                id: 'sim-1',
                title: 'Đề Tương Tự Lớp 8',
                grade: '8',
                term: 'CK1',
                questions: [mockQuestionSingle],
                createdAt: new Date().toISOString()
            };
            saveSimilarExamDossier(original as any);

            // Duplicate
            const dup = duplicateSimilarExamDossier('sim-1');
            expect(dup).not.toBeNull();
            expect(dup?.title).toContain('Bản sao');

            let all = getSavedSimilarExams();
            expect(all).toHaveLength(2);

            // Delete original
            deleteSimilarExamDossier('sim-1');
            all = getSavedSimilarExams();
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe(dup?.id);

            // Export to JSON string
            const jsonStr = exportSimilarExamBankJson();
            expect(jsonStr).toContain('Bản sao');

            // Clear and re-import
            localStorage.clear();
            expect(getSavedSimilarExams()).toHaveLength(0);

            const importResult = importSimilarExamBankJson(jsonStr);
            expect(importResult.success).toBe(true);
            expect(importResult.addedCount).toBe(1);
            expect(getSavedSimilarExams()).toHaveLength(1);
        });
    });
});
