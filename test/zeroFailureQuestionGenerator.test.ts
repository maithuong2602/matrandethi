import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateOfflineQuestions, 
  generateOfflineEssayRubric, 
  generateOfflineExamReview 
} from '../services/offlineQuestionGenerator';
import { 
  getApiKeyPool, 
  saveApiKeyPool, 
  getActiveApiKey, 
  rotateToNextAvailableKey,
  isOfflineFallbackEnabled,
  setOfflineFallbackEnabled
} from '../services/apiKeyService';
import { 
  generateBulkQuestions, 
  generateSingleQuestion, 
  generateEssayRubric, 
  reviewExamWithAI, 
  autoFillMissingQuestions 
} from '../services/geminiService';

describe('TASK: Bảo đảm 100% không để xảy ra tình trạng không tạo được câu hỏi do API key (Zero-Failure Engine)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Bộ tạo câu hỏi Sư phạm Chuẩn GDPT 2018 (Offline Question Generator)', () => {
    it('sinh câu hỏi trắc nghiệm (multiple-choice) chuẩn định dạng Bộ GD&ĐT', () => {
      const questions = generateOfflineQuestions(
        '7', 
        'Bài 1: Thiết bị vào - ra', 
        'NB', 
        '1.1', 
        3, 
        'multiple-choice'
      );

      expect(questions.length).toBe(3);
      for (const q of questions) {
        expect(q.content).toBeTruthy();
        expect(q.category).toBe('mc');
        expect(q.questionType).toBe('multiple-choice');
        expect(q.options).toHaveLength(4);
        
        // Tất cả phương án phải kết thúc bằng dấu chấm (.)
        for (const opt of q.options) {
          expect(opt.text.endsWith('.')).toBe(true);
        }

        // Đúng 1 phương án đúng
        const correctCount = q.options.filter((o: any) => o.isCorrect).length;
        expect(correctCount).toBe(1);
        expect(q.answer).toBeDefined();
        expect(q.points).toBe(0.25);
      }
    });

    it('sinh câu hỏi Đúng/Sai (true-false) đơn lẻ theo quy định mới', () => {
      const questions = generateOfflineQuestions(
        '7', 
        'Bài 2: Hệ điều hành', 
        'TH', 
        '2.1', 
        2, 
        'true-false'
      );

      expect(questions.length).toBe(2);
      for (const q of questions) {
        expect(q.questionType).toBe('true-false');
        expect(q.options).toHaveLength(2);
        expect(q.options.map((o: any) => o.id)).toEqual(['Đúng', 'Sai']);
        expect(['Đúng', 'Sai']).toContain(q.answer);
      }
    });

    it('sinh câu hỏi Trả lời ngắn (short-answer)', () => {
      const questions = generateOfflineQuestions(
        '6', 
        'Bài 1: Thông tin và dữ liệu', 
        'NB', 
        '1.1', 
        2, 
        'short-answer'
      );

      expect(questions.length).toBe(2);
      for (const q of questions) {
        expect(q.questionType).toBe('short-answer');
        expect(q.options).toHaveLength(0);
        expect(q.answer).toBeTruthy();
      }
    });

    it('sinh câu hỏi Tự luận (essay) kèm Hướng dẫn chấm (Rubric)', () => {
      const questions = generateOfflineQuestions(
        '7', 
        'Bài 8: Bảng tính điện tử', 
        'VD', 
        '8.1', 
        1, 
        'essay'
      );

      expect(questions.length).toBe(1);
      const q = questions[0];
      expect(q.category).toBe('essay');
      expect(q.questionType).toBe('essay');
      expect(q.answer).toContain('điểm');
      expect(q.points).toBe(1.0);
    });

    it('sinh barem hướng dẫn chấm tự luận đúng tổng điểm 1.0', () => {
      const rubric = generateOfflineEssayRubric('Trình bày thuật toán tìm kiếm nhị phân', 1.0);
      expect(rubric).toContain('a)');
      expect(rubric).toContain('b)');
      expect(rubric).toContain('0,25 điểm');
    });

    it('thẩm định đề thi ngoại tuyến đạt điểm số đánh giá chuẩn xác', () => {
      const dummyQuestions = [
        { level: 'NB', lesson: 'Bài 1', content: 'Câu 1' },
        { level: 'TH', lesson: 'Bài 1', content: 'Câu 2' },
        { level: 'VD', lesson: 'Bài 2', content: 'Câu 3' },
      ];
      const review = generateOfflineExamReview(dummyQuestions, '7', 'Kiểm tra GK1');
      expect(review.overallScore).toBeGreaterThanOrEqual(85);
      expect(review.verdict).toContain('Kiểm tra GK1');
      expect(review.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('2. Quản lý Đa Khóa API (Multi-Key Rotation Pool)', () => {
    it('lưu trữ và nhận diện danh sách nhiều API key', () => {
      const keys = ['AIzaSyKey1_valid', 'AIzaSyKey2_backup', 'AIzaSyKey3_third'];
      saveApiKeyPool(keys);

      const pool = getApiKeyPool();
      expect(pool).toHaveLength(3);
      expect(pool[0].key).toBe('AIzaSyKey1_valid');
      expect(getActiveApiKey()).toBe('AIzaSyKey1_valid');
    });

    it('tự động xoay sang API key kế tiếp khi key hiện tại chạm Rate Limit (429)', () => {
      const keys = ['AIzaSyKey1_exhausted', 'AIzaSyKey2_available'];
      saveApiKeyPool(keys);

      const nextKey = rotateToNextAvailableKey('AIzaSyKey1_exhausted', 'rate_limited');
      expect(nextKey).toBe('AIzaSyKey2_available');

      const updatedPool = getApiKeyPool();
      expect(updatedPool.find(k => k.key === 'AIzaSyKey1_exhausted')?.status).toBe('rate_limited');
      expect(getActiveApiKey()).toBe('AIzaSyKey2_available');
    });
  });

  describe('3. Tích hợp Hoàn Toàn Không Lỗi (Zero-Failure Guarantee in geminiService)', () => {
    it('generateBulkQuestions thành công 100% ngay cả khi KHÔNG CÓ BẤT KỲ API KEY NÀO', async () => {
      // Đảm bảo không có API key
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('matrandethi_api_keys_pool');

      // Thực thi tạo câu hỏi hàng loạt
      const results = await generateBulkQuestions(
        '7', 
        'Bài 1: Thiết bị vào - ra', 
        'NB', 
        '1.1', 
        4, 
        'multiple-choice'
      );

      // KHÔNG ĐƯỢC THROW LỖI VÀ BẮT BUỘC PHẢI TRẢ VỀ CÂU HỎI
      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      expect(results[0].content).toBeTruthy();
    });

    it('generateSingleQuestion thành công khi API Key không có', async () => {
      localStorage.clear();
      const q = await generateSingleQuestion('7', 'Bài 1: Thiết bị vào - ra', 'TH', '1.2');
      expect(q).toBeDefined();
      expect(q.content).toBeTruthy();
      expect(q.options).toBeDefined();
    });

    it('generateEssayRubric thành công khi API Key rỗng', async () => {
      localStorage.clear();
      const rubric = await generateEssayRubric('Phân tích vai trò của CPU trong máy tính', 1.0);
      expect(rubric).toBeTruthy();
      expect(rubric).toContain('điểm');
    });

    it('reviewExamWithAI hoàn thành thẩm định đề thi ngay cả khi không có kết nối API', async () => {
      localStorage.clear();
      const dummyQuestions = [
        { level: 'NB', lesson: 'Bài 1', content: 'Câu hỏi mẫu nhận biết' }
      ];
      const review = await reviewExamWithAI(dummyQuestions, '7', 'Đề Kiểm Tra');
      expect(review.overallScore).toBeGreaterThanOrEqual(80);
      expect(review.verdict).toBeTruthy();
    });

    it('autoFillMissingQuestions tự động bù đắp câu hỏi thành công khi không có API Key', async () => {
      localStorage.clear();
      const missing = [
        { lesson: 'Bài 1: Thiết bị vào - ra', level: 'NB', count: 2, questionType: 'multiple-choice' },
        { lesson: 'Bài 2: Hệ điều hành', level: 'TH', count: 1, questionType: 'essay' }
      ];

      const pool = await autoFillMissingQuestions(missing, '7');
      expect(pool).toHaveLength(3);
      expect(pool.filter(q => q.level === 'NB')).toHaveLength(2);
      expect(pool.filter(q => q.level === 'TH')).toHaveLength(1);
    });
  });
});
