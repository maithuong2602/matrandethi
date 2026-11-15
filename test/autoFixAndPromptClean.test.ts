import { describe, it, expect } from 'vitest';
import { cleanTextbookReferences, runOfflineAutoFixExam } from '../services/geminiService';
import { ExamReviewResult } from '../types';

describe('AI Question Prompt Refinement & Auto-Fix Exam by Recommendations', () => {
  describe('1. cleanTextbookReferences: Sanitization of Textbook References', () => {
    it('loại bỏ cụm "Khi quan sát Hình X.Y" và giữ câu hỏi ngắn gọn', () => {
      const input = 'Khi quan sát Hình 14.3, nhân vật di chuyển bao nhiêu bước?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Nhân vật di chuyển bao nhiêu bước?');
      expect(output).not.toMatch(/Hình\s*14\.3/);
      expect(output).not.toMatch(/quan\s*sát/i);
    });

    it('loại bỏ cụm "Trong Bảng X.Y của SGK" và giữ ngữ cảnh độc lập', () => {
      const input = 'Trong Bảng 13.1 của SGK, trường nào đóng vai trò là khóa chính?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Trường nào đóng vai trò là khóa chính?');
      expect(output).not.toMatch(/Bảng\s*13\.1/i);
      expect(output).not.toMatch(/SGK/i);
    });

    it('loại bỏ tham chiếu "ở Hình 14.7" trong chương trình trò chơi đoán số', () => {
      const input = 'Trong chương trình trò chơi đoán số hoàn chỉnh ở Hình 14.7, câu lệnh lặp dừng lại khi nào?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Trong chương trình trò chơi đoán số hoàn chỉnh, câu lệnh lặp dừng lại khi nào?');
      expect(output).not.toMatch(/Hình\s*14\.7/);
    });

    it('loại bỏ cụm "Ở Hình 14.7," ở đầu câu hỏi', () => {
      const input = 'Ở Hình 14.7, sơ đồ khối biểu diễn thuật toán gì?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Sơ đồ khối biểu diễn thuật toán gì?');
      expect(output).not.toMatch(/Hình\s*14\.7/);
    });

    it('loại bỏ cụm "Trong bảng 12.1,"', () => {
      const input = 'Trong bảng 12.1, khóa chính của bảng là gì?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Khóa chính của bảng là gì?');
      expect(output).not.toMatch(/bảng\s*12\.1/i);
    });

    it('loại bỏ cụm "Theo SGK Tin học 8," hoặc "Theo SGK,"', () => {
      const input = 'Theo SGK Tin học 8, thiết bị nào sau đây là thiết bị vào?';
      const output = cleanTextbookReferences(input);
      expect(output).toBe('Thiết bị nào sau đây là thiết bị vào?');
      expect(output).not.toMatch(/SGK/i);
    });

    it('xử lý an toàn khi đầu vào rỗng hoặc không có tham chiếu SGK', () => {
      expect(cleanTextbookReferences('')).toBe('');
      const standard = 'Thiết bị nào là thiết bị vào của máy tính?';
      expect(cleanTextbookReferences(standard)).toBe(standard);
    });
  });

  describe('2. runOfflineAutoFixExam: Tự động sửa đề thi theo Gợi ý hoàn thiện', () => {
    const mockQuestions = [
      {
        id: 'q1',
        lesson: 'Bài 14: Lập trình trực quan',
        level: 'TH',
        category: 'mc',
        questionType: 'multiple-choice',
        content: 'Khi quan sát Hình 14.3, biến "diem_so" thay đổi như thế nào sau khi ghi điểm?',
        options: [
          { id: 'A', text: 'Tăng 1 điểm theo Bảng 14.1 trong SGK.', isCorrect: true },
          { id: 'B', text: 'Giảm 1 điểm.', isCorrect: false },
          { id: 'C', text: 'Giữ nguyên không đổi.', isCorrect: false },
          { id: 'D', text: 'Về giá trị 0.', isCorrect: false }
        ],
        answer: 'A'
      },
      {
        id: 'q2',
        lesson: 'Bài 14: Lập trình trực quan',
        level: 'TH',
        category: 'mc',
        questionType: 'multiple-choice',
        content: 'Khi quan sát Hình 14.3, biến "diem_so" thay đổi như thế nào sau khi ghi điểm?',
        options: [
          { id: 'A', text: 'Tăng 1 điểm.', isCorrect: true },
          { id: 'B', text: 'Giảm 1 điểm.', isCorrect: false },
          { id: 'C', text: 'Giữ nguyên không đổi.', isCorrect: false },
          { id: 'D', text: 'Về giá trị 0.', isCorrect: false }
        ],
        answer: 'A'
      }
    ];

    const mockCandidatePool = [
      {
        id: 'pool_q_new',
        lesson: 'Bài 14: Lập trình trực quan',
        level: 'TH',
        category: 'mc',
        questionType: 'multiple-choice',
        content: 'Cấu trúc lặp với số lần biết trước trong Scratch được thể hiện qua khối lệnh nào?',
        options: [
          { id: 'A', text: 'Khối lệnh repeat.', isCorrect: true },
          { id: 'B', text: 'Khối lệnh if-then.', isCorrect: false },
          { id: 'C', text: 'Khối lệnh forever.', isCorrect: false },
          { id: 'D', text: 'Khối lệnh wait.', isCorrect: false }
        ],
        answer: 'A'
      }
    ];

    const mockReviewResult: ExamReviewResult = {
      overallScore: 76,
      verdict: 'Đề thi bám sát chuẩn GDPT 2018 nhưng còn phụ thuộc vào SGK (Hình, Bảng) và trùng lặp câu hỏi.',
      strengths: ['Nội dung chuẩn xác về mặt khoa học.'],
      weaknesses: ['Phụ thuộc SGK', 'Trùng lặp câu hỏi'],
      recommendations: [
        "Biên tập lại lời dẫn: Thay các cụm 'Khi quan sát Hình 14.3', 'Trong Bảng 13.1 của SGK' bằng ngữ cảnh trực quan.",
        'Loại bỏ trùng lặp câu hỏi.'
      ],
      questionAnalyses: []
    };

    it('tự động làm sạch toàn bộ tham chiếu SGK trong cả đề thi và các phương án', () => {
      const result = runOfflineAutoFixExam(mockQuestions, mockReviewResult, mockCandidatePool);

      expect(result.fixedQuestions[0].content).not.toMatch(/Hình\s*14\.3/);
      expect(result.fixedQuestions[0].content).toBe('Biến "diem_so" thay đổi như thế nào sau khi ghi điểm?');
      expect(result.fixedQuestions[0].options[0].text).not.toMatch(/Bảng\s*14\.1/);
      expect(result.fixedQuestions[0].options[0].text).not.toMatch(/SGK/);
    });

    it('tự động phát hiện câu trùng lặp và hoán đổi bằng câu mới từ ngân hàng', () => {
      const result = runOfflineAutoFixExam(mockQuestions, mockReviewResult, mockCandidatePool);

      expect(result.fixedQuestions).toHaveLength(2);
      expect(result.fixedQuestions[0].id).not.toBe(result.fixedQuestions[1].id);
      expect(result.fixedQuestions[1].content).toContain('Cấu trúc lặp');
    });

    it('nâng điểm số thẩm định và chuyển trạng thái khuyến nghị thành hoàn thiện', () => {
      const result = runOfflineAutoFixExam(mockQuestions, mockReviewResult, mockCandidatePool);

      expect(result.updatedReview.overallScore).toBeGreaterThanOrEqual(95);
      expect(result.updatedReview.weaknesses).toHaveLength(0);
      expect(result.updatedReview.recommendations.some(r => r.startsWith('✓'))).toBe(true);
    });
  });
});
