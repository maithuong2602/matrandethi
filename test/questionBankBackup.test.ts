import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createBackupPackage, 
  validateBackupPackage, 
  createSafetySnapshot, 
  listSafetySnapshots, 
  restoreBackupPackage, 
  rollbackLatestSnapshot, 
  enforceSnapshotRetention,
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_VERSION,
  SNAPSHOT_STORAGE_PREFIX,
  MAX_SNAPSHOTS_RETAINED,
  QuestionBankBackupPackage
} from '../services/backup/questionBankBackup';
import { 
  saveQuestionBank, 
  loadQuestionBank, 
  QUESTION_BANK_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  isQuarantined,
  setQuarantined
} from '../services/storage/questionBankStorage';
import { ExerciseQuestion } from '../types';

describe('TASK 003: Question Bank Backup, Restore & Safety Snapshot Tests', () => {
  const sampleBank: ExerciseQuestion[] = [
    {
      id: 'q_test_a',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Câu hỏi kiểm thử A',
      options: [{ id: 'A', text: 'Đáp án A', isCorrect: true }]
    },
    {
      id: 'q_test_b',
      category: 'essay',
      level: 'TH',
      criteria: '1.2',
      content: 'Câu hỏi kiểm thử B',
      answer: 'Đáp án chi tiết'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    setQuarantined(false);
    vi.restoreAllMocks();
  });

  // TEST 1
  it('TEST 1: createBackup tạo đúng backupVersion', () => {
    const pkg = createBackupPackage(sampleBank);
    expect(pkg.backupFormat).toBe(BACKUP_FORMAT_IDENTIFIER);
    expect(pkg.backupVersion).toBe(CURRENT_BACKUP_VERSION);
    expect(pkg.questionBankSchemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  // TEST 2
  it('TEST 2: Backup chứa đúng questionCount', () => {
    const pkg = createBackupPackage(sampleBank);
    expect(pkg.questionCount).toBe(2);
    expect(pkg.questions).toHaveLength(2);
  });

  // TEST 3
  it('TEST 3: Backup hợp lệ được validate PASS', () => {
    const pkg = createBackupPackage(sampleBank);
    const result = validateBackupPackage(pkg);
    expect(result.valid).toBe(true);
    expect(result.pkg?.questionCount).toBe(2);
    expect(result.isLegacy).toBe(false);
  });

  // TEST 4
  it('TEST 4: Malformed JSON hoặc dữ liệu null/không phải object bị reject', () => {
    expect(validateBackupPackage(null).valid).toBe(false);
    expect(validateBackupPackage('not-json').valid).toBe(false);
    expect(validateBackupPackage(12345).valid).toBe(false);
  });

  // TEST 5
  it('TEST 5: Sai backupFormat bị reject', () => {
    const invalidPkg = {
      backupFormat: 'random-unknown-format',
      backupVersion: 1,
      questions: sampleBank
    };
    const res = validateBackupPackage(invalidPkg);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  // TEST 6
  it('TEST 6: Unsupported backupVersion bị reject', () => {
    const futurePkg = {
      backupFormat: BACKUP_FORMAT_IDENTIFIER,
      backupVersion: 999,
      questions: sampleBank
    };
    const res = validateBackupPackage(futurePkg);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('cao hơn phiên bản');
  });

  // TEST 7
  it('TEST 7: questions không phải array bị reject', () => {
    const badPkg = {
      backupFormat: BACKUP_FORMAT_IDENTIFIER,
      backupVersion: 1,
      questions: 'not an array'
    };
    const res = validateBackupPackage(badPkg);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('questions');
  });

  // TEST 8
  it('TEST 8: Question schema không hợp lệ bị reject', () => {
    const badPkg = {
      backupFormat: BACKUP_FORMAT_IDENTIFIER,
      backupVersion: 1,
      questions: [
        { id: '', content: '' } // thiếu category, level...
      ]
    };
    const res = validateBackupPackage(badPkg);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('schema Question');
  });

  // TEST 9
  it('TEST 9: Invalid backup KHÔNG làm thay đổi Question Bank hiện tại', () => {
    saveQuestionBank(sampleBank);
    const initialRaw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

    const invalidBackup = { backupFormat: 'invalid', questions: [] };
    const res = restoreBackupPackage(invalidBackup, sampleBank);

    expect(res.success).toBe(false);
    // Dữ liệu trong localStorage không hề bị suy suyển
    expect(localStorage.getItem(QUESTION_BANK_STORAGE_KEY)).toBe(initialRaw);
  });

  // TEST 10
  it('TEST 10: Restore hợp lệ thay thế đúng Question Bank', () => {
    saveQuestionBank(sampleBank);

    const newQuestions: ExerciseQuestion[] = [
      {
        id: 'q_restored_x',
        category: 'mc',
        level: 'VD',
        criteria: '2.1',
        content: 'Câu hỏi mới sau restore',
        answer: 'C'
      }
    ];
    const backupPkg = createBackupPackage(newQuestions);

    const res = restoreBackupPackage(backupPkg, sampleBank);
    expect(res.success).toBe(true);
    expect(res.questions).toHaveLength(1);
    expect(res.questions![0].id).toBe('q_restored_x');

    // Kiểm tra trong storage đã được lưu chính xác
    const loadRes = loadQuestionBank();
    expect(loadRes.data).toHaveLength(1);
    expect(loadRes.data[0].content).toBe('Câu hỏi mới sau restore');
  });

  // TEST 11
  it('TEST 11: Trước restore tạo safety snapshot', () => {
    saveQuestionBank(sampleBank);
    const backupPkg = createBackupPackage([]);

    const res = restoreBackupPackage(backupPkg, sampleBank);
    expect(res.success).toBe(true);
    expect(res.snapshotId).toBeDefined();

    const snapshots = listSafetySnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    // Snapshot phải chứa chính xác dữ liệu cũ sampleBank (2 câu)
    expect(snapshots[0].questions).toHaveLength(2);
    expect(snapshots[0].questions[0].id).toBe('q_test_a');
  });

  // TEST 12
  it('TEST 12: Rollback phục hồi đúng dữ liệu trước restore', () => {
    saveQuestionBank(sampleBank);

    const backupQuestions: ExerciseQuestion[] = [
      {
        id: 'q_replacement',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Câu hỏi thay thế',
        answer: 'A'
      }
    ];
    const backupPkg = createBackupPackage(backupQuestions);

    // Thực hiện restore (tạo snapshot của sampleBank)
    restoreBackupPackage(backupPkg, sampleBank);
    expect(loadQuestionBank().data[0].id).toBe('q_replacement');

    // Thực hiện Rollback
    const rollbackRes = rollbackLatestSnapshot();
    expect(rollbackRes.success).toBe(true);
    expect(rollbackRes.restoredQuestions).toHaveLength(2);
    expect(rollbackRes.restoredQuestions![0].id).toBe('q_test_a');

    // Xác nhận đã lưu vào primary storage
    const current = loadQuestionBank();
    expect(current.data).toHaveLength(2);
    expect(current.data[0].content).toBe('Câu hỏi kiểm thử A');
  });

  // TEST 13
  it('TEST 13: Retention chỉ giữ số snapshot cho phép (tối đa 5), không xóa corrupted_backup', () => {
    // Tạo 1 key corrupted backup
    const corruptedKey = `${QUESTION_BANK_STORAGE_KEY}_corrupted_backup_999999`;
    localStorage.setItem(corruptedKey, 'CORRUPTED_RAW_DATA');

    // Tạo 7 snapshot liên tiếp
    for (let i = 1; i <= 7; i++) {
      createSafetySnapshot(sampleBank, `TEST_ACTION_${i}`);
    }

    const snapshots = listSafetySnapshots();
    expect(snapshots.length).toBe(MAX_SNAPSHOTS_RETAINED); // 5

    // Key corrupted backup vẫn phải còn nguyên 100%!
    expect(localStorage.getItem(corruptedKey)).toBe('CORRUPTED_RAW_DATA');
  });

  // TEST 14
  it('TEST 14: Snapshot QuotaExceededError -> restore bị CANCEL', () => {
    saveQuestionBank(sampleBank);
    const initialRaw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

    // Mock setItem để ném lỗi QuotaExceededError khi tạo snapshot
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
    });

    const newPkg = createBackupPackage([]);
    const res = restoreBackupPackage(newPkg, sampleBank);

    // Phải CANCEL ngay
    expect(res.success).toBe(false);
    expect(res.error).toContain('HỦY');

    // Dữ liệu gốc trong Question Bank không bị thay đổi
    expect(localStorage.getItem(QUESTION_BANK_STORAGE_KEY)).toBe(initialRaw);
  });

  // TEST 15
  it('TEST 15: Existing corrupted storage không bị fallback autosave ghi đè ngoài ý muốn', () => {
    const corruptedString = '{"broken": [json without closing';
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, corruptedString);

    // Nạp dữ liệu bị lỗi
    const loadResult = loadQuestionBank();
    expect(loadResult.success).toBe(false);
    expect(loadResult.canAutoSave).toBe(false);
    expect(isQuarantined()).toBe(true);

    // Thử auto-save bình thường (không có force flag)
    const autosaveAttempt = saveQuestionBank(sampleBank);
    expect(autosaveAttempt.success).toBe(false);
    expect(autosaveAttempt.error).toContain('Quarantine');

    // Khóa chính vẫn phải giữ nguyên dữ liệu gốc bị hỏng (chưa bị đè)
    expect(localStorage.getItem(QUESTION_BANK_STORAGE_KEY)).toBe(corruptedString);
  });

  // TEST 16
  it('TEST 16: Legacy JSON import (định dạng { info, questions } hoặc array) vẫn hoạt động', () => {
    // Định dạng legacy từ QuestionManager cũ: { info: {...}, questions: [...] }
    const legacyExport = {
      info: { grade: '6', lesson: 'Bài 1. Thông tin và dữ liệu' },
      questions: sampleBank
    };

    const valResult = validateBackupPackage(legacyExport);
    expect(valResult.valid).toBe(true);
    expect(valResult.isLegacy).toBe(true);
    expect(valResult.pkg?.questions).toHaveLength(2);

    // Thử restore từ legacy package
    const res = restoreBackupPackage(legacyExport, []);
    expect(res.success).toBe(true);
    expect(res.questions).toHaveLength(2);
  });
});
