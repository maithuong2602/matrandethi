import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  loadQuestionBank, 
  saveQuestionBank, 
  clearQuestionBank, 
  validateStoredQuestionBank,
  QUESTION_BANK_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  QuestionBankStoragePayload,
  setQuarantined
} from '../services/storage/questionBankStorage';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';
import { ExerciseQuestion } from '../types';

describe('TASK 002: Question Bank Storage Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    setQuarantined(false);
    vi.restoreAllMocks();
  });

  // TEST 1
  it('TEST 1: Storage chưa tồn tại -> load khởi tạo đúng SAMPLE_QUESTIONS và tự động persist', () => {
    expect(localStorage.getItem(QUESTION_BANK_STORAGE_KEY)).toBeNull();

    const result = loadQuestionBank();
    expect(result.success).toBe(true);
    expect(result.isInitial).toBe(true);
    expect(result.data).toHaveLength(SAMPLE_QUESTIONS.length);
    expect(result.data[0].id).toBe(SAMPLE_QUESTIONS[0].id);

    // Kiểm tra đã được persist vào localStorage
    const savedRaw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.questions).toHaveLength(SAMPLE_QUESTIONS.length);
  });

  // TEST 2
  it('TEST 2: saveQuestionBank() -> dữ liệu được lưu vào storage', () => {
    const customQuestions: ExerciseQuestion[] = [
      {
        id: 'q_custom_001',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Câu hỏi kiểm thử lưu trữ',
        options: [{ id: 'A', text: 'Đáp án A', isCorrect: true }]
      }
    ];

    const saveResult = saveQuestionBank(customQuestions);
    expect(saveResult.success).toBe(true);

    const raw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const payload = JSON.parse(raw!);
    expect(payload.questions).toHaveLength(1);
    expect(payload.questions[0].id).toBe('q_custom_001');
  });

  // TEST 3
  it('TEST 3: loadQuestionBank() -> dữ liệu đã lưu được đọc lại chính xác', () => {
    const customQuestions: ExerciseQuestion[] = [
      {
        id: 'test_persist_001',
        category: 'mc',
        level: 'TH',
        criteria: '2.1',
        content: 'TEST PERSISTENCE 001',
        answer: 'B'
      }
    ];

    saveQuestionBank(customQuestions);
    const loadResult = loadQuestionBank();

    expect(loadResult.success).toBe(true);
    expect(loadResult.isInitial).toBe(false);
    expect(loadResult.data).toHaveLength(1);
    expect(loadResult.data[0].content).toBe('TEST PERSISTENCE 001');
  });

  // TEST 4
  it('TEST 4: Refresh simulation -> phiên làm việc mới lấy lại chính xác dữ liệu đã lưu', () => {
    const initialList: ExerciseQuestion[] = [
      {
        id: 'q_user_1',
        category: 'essay',
        level: 'VD',
        criteria: '3.1',
        content: 'Câu hỏi tự luận người dùng',
        answer: 'Gợi ý đáp án'
      }
    ];

    saveQuestionBank(initialList);

    // Mô phỏng F5 bằng cách gọi loadQuestionBank trong phiên mới
    const secondSessionResult = loadQuestionBank();
    expect(secondSessionResult.success).toBe(true);
    expect(secondSessionResult.data[0].content).toBe('Câu hỏi tự luận người dùng');
  });

  // TEST 5
  it('TEST 5: Malformed JSON -> storage service không crash, sao lưu dữ liệu hỏng và trả về fallback', () => {
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, '{{THIS IS NOT VALID JSON!!!');

    const result = loadQuestionBank();

    // Không được crash
    expect(result.success).toBe(false);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveLength(SAMPLE_QUESTIONS.length);
    expect(result.error).toContain('lỗi cú pháp JSON');

    // Kiểm tra đã tạo bản sao lưu dữ liệu hỏng
    const allKeys = Object.keys(localStorage);
    const backupKey = allKeys.find(k => k.includes('corrupted_backup'));
    expect(backupKey).toBeDefined();
    expect(localStorage.getItem(backupKey!)).toBe('{{THIS IS NOT VALID JSON!!!');
  });

  // TEST 6
  it('TEST 6: Invalid schema -> không coi dữ liệu lỗi là Question Bank hợp lệ', () => {
    // Thiếu schemaVersion và questions không phải array
    const invalidPayload = { foo: 'bar', timestamp: 12345 };
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(invalidPayload));

    const result = loadQuestionBank();
    expect(result.success).toBe(false);
    expect(result.error).toContain('schemaVersion');

    // Kiểm tra hàm validateStoredQuestionBank
    const validation = validateStoredQuestionBank(invalidPayload);
    expect(validation.valid).toBe(false);
  });

  // TEST 7
  it('TEST 7: Storage write error (QuotaExceededError) -> được xử lý an toàn mà không crash', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key === QUESTION_BANK_STORAGE_KEY) {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
    });

    const result = saveQuestionBank(SAMPLE_QUESTIONS);
    expect(result.success).toBe(false);
    expect(result.error).toContain('QuotaExceededError');
  });

  // TEST 8
  it('TEST 8: Existing valid user data -> KHÔNG bị SAMPLE_QUESTIONS overwrite', () => {
    const userQuestions: ExerciseQuestion[] = [
      {
        id: 'user_created_q1',
        category: 'mc',
        level: 'VDC',
        criteria: '4.1',
        content: 'Nội dung câu hỏi của giáo viên không được bị ghi đè',
        answer: 'D'
      }
    ];

    saveQuestionBank(userQuestions);

    const loadResult = loadQuestionBank();
    expect(loadResult.success).toBe(true);
    expect(loadResult.data).toHaveLength(1);
    expect(loadResult.data[0].id).toBe('user_created_q1');
    expect(loadResult.data[0].content).toBe('Nội dung câu hỏi của giáo viên không được bị ghi đè');
  });

  // TEST 9
  it('TEST 9: schemaVersion được lưu và kiểm tra đúng', () => {
    saveQuestionBank(SAMPLE_QUESTIONS);
    const raw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    const parsed = JSON.parse(raw!) as QuestionBankStoragePayload;

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(typeof parsed.updatedAt).toBe('string');

    // Thử validate với version tương lai chưa hỗ trợ
    const futurePayload = { ...parsed, schemaVersion: 999 };
    const validation = validateStoredQuestionBank(futurePayload);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('cao hơn phiên bản ứng dụng hỗ trợ');
  });
});
