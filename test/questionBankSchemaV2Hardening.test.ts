import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExerciseQuestion } from '../types';
import {
  CURRENT_SCHEMA_VERSION,
  QUESTION_BANK_STORAGE_KEY,
  loadQuestionBank,
  saveQuestionBank,
  StoredQuestionBankPayload,
} from '../services/storage/questionBankStorage';
import {
  executeQuestionBankMigrationV1ToV2,
  migrateQuestionToV2,
  runQuestionBankMigrationDryRun,
} from '../services/migration/questionBankCanonicalMigration';
import {
  createSafetySnapshot,
  listSafetySnapshots,
  restoreBackupPackage,
  QuestionBankBackupPackage,
  SNAPSHOT_STORAGE_PREFIX,
} from '../services/backup/questionBankBackup';

describe('TASK 006B.1: Schema V2 Hardening Verification', () => {

  const MOCK_V1_QUESTIONS: ExerciseQuestion[] = [
    {
      id: 'leg_v1_01',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Test content 1',
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      lesson: 'Tin học 6 - Bài 1: Thông tin và dữ liệu'
    }
  ];

  const seedV1Storage = (questions: ExerciseQuestion[], schemaVersion: number = 1) => {
    const payload = {
      schemaVersion,
      savedAt: new Date().toISOString(),
      questions: JSON.parse(JSON.stringify(questions))
    };
    window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(payload));
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // A. PUBLIC LOAD V1 → V2
  it('A. PUBLIC LOAD V1 → V2: loadQuestionBank migrates schemaVersion 1 to 2', () => {
    seedV1Storage(MOCK_V1_QUESTIONS, 1);
    const result = loadQuestionBank();
    expect(result.success).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY)!);
    expect(stored.schemaVersion).toBe(2);
    expect(stored.questions[0].curriculum).toBeDefined();
  });

  // B. SNAPSHOT ORDER
  it('B. SNAPSHOT ORDER: WRITE_SNAPSHOT occurs before WRITE_PRIMARY_V2', () => {
    seedV1Storage(MOCK_V1_QUESTIONS, 1);
    const callOrder: string[] = [];
    const originalSetItem = Storage.prototype.setItem;
    
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
      if (key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
        callOrder.push('SNAPSHOT');
      } else if (key === QUESTION_BANK_STORAGE_KEY) {
        callOrder.push('PRIMARY_V2');
      }
      return originalSetItem.call(this, key, val);
    });

    executeQuestionBankMigrationV1ToV2();
    expect(callOrder[0]).toBe('SNAPSHOT');
    expect(callOrder[1]).toBe('PRIMARY_V2');
  });

  // C. SNAPSHOT FAILURE
  it('C. SNAPSHOT FAILURE: QuotaExceededError preserves raw primary V1 payload byte-for-byte unchanged', () => {
    seedV1Storage(MOCK_V1_QUESTIONS, 1);
    const rawBefore = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
      if (key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
    });

    executeQuestionBankMigrationV1ToV2();
    const rawAfter = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    expect(rawAfter).toBe(rawBefore);
  });

  // D. READ-BACK FAILURE
  it('D. READ-BACK FAILURE: read-back verify failure causes rollback to original V1', () => {
    seedV1Storage(MOCK_V1_QUESTIONS, 1);
    const rawBefore = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    
    let v2Saved = false;
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
      if (key === QUESTION_BANK_STORAGE_KEY) {
        const payload = JSON.parse(val);
        if (payload.schemaVersion === 2) {
          v2Saved = true;
        }
      }
      return originalSetItem.call(this, key, val);
    });

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: any, key: string) {
      if (key === QUESTION_BANK_STORAGE_KEY && v2Saved) {
        return JSON.stringify({ schemaVersion: 2, questions: [] }); // Trả về mảng rỗng để read-back fail
      }
      return originalGetItem.call(this, key);
    });

    executeQuestionBankMigrationV1ToV2();
    vi.restoreAllMocks();
    const rawAfter = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    expect(rawAfter).toBe(rawBefore);
  });

  // E. FAILED V1 RESTORE PRESERVES CURRENT V2
  it('E. FAILED V1 RESTORE PRESERVES CURRENT V2: rollback to CURRENT V2, not V1 backup', () => {
    // Setup current V2
    const currentV2Questions = [
      { ...MOCK_V1_QUESTIONS[0], id: 'v2_01', content: 'Current V2' }
    ];
    saveQuestionBank(currentV2Questions, { schemaVersion: 2, force: true });
    const currentV2Raw = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

    // Try to restore V1 Backup, but fail on save V2
    const v1BackupPackage: QuestionBankBackupPackage = {
      backupFormat: 'matrandethi-question-bank',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      questionBankSchemaVersion: 1,
      questionCount: 1,
      questions: [{ ...MOCK_V1_QUESTIONS[0], id: 'v1_restore_01' }]
    };

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
      if (key === QUESTION_BANK_STORAGE_KEY) {
        const parsed = JSON.parse(val);
        if (parsed.questions[0].id === 'v1_restore_01') {
          throw new Error('Disk full during restore');
        }
      }
      return originalSetItem.call(this, key, val);
    });

    const res = restoreBackupPackage(v1BackupPackage, currentV2Questions);
    expect(res.success).toBe(false);

    vi.restoreAllMocks();
    const finalRaw = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    const parsedFinal = JSON.parse(finalRaw!);
    const parsedCurrentV2 = JSON.parse(currentV2Raw!);
    expect(parsedFinal.schemaVersion).toBe(parsedCurrentV2.schemaVersion);
    expect(parsedFinal.questions.length).toBe(parsedCurrentV2.questions.length);
    expect(parsedFinal.questions[0].id).toBe(parsedCurrentV2.questions[0].id);
  });

  // F. MANUAL VERIFIED PRESERVATION
  it('F. MANUAL VERIFIED PRESERVATION: manual mapping preserved across load and restore', () => {
    const qManual = {
      ...MOCK_V1_QUESTIONS[0],
      id: 'manual_01',
      curriculum: {
        mappingStatus: 'verified',
        mappingMethod: 'manual',
        requirementId: 'TH6-A-002',
        notes: 'Teacher verified'
      }
    };

    // Load test
    seedV1Storage([qManual], 1);
    const loadRes = loadQuestionBank();
    expect(loadRes.data[0].curriculum?.requirementId).toBe('TH6-A-002');
    expect(loadRes.data[0].curriculum?.mappingStatus).toBe('verified');

    // Restore test
    const v1BackupPackage: QuestionBankBackupPackage = {
      backupFormat: 'matrandethi-question-bank',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      questionBankSchemaVersion: 1,
      questionCount: 1,
      questions: [qManual]
    };
    const restoreRes = restoreBackupPackage(v1BackupPackage, []);
    expect(restoreRes.questions![0].curriculum?.requirementId).toBe('TH6-A-002');
    expect(restoreRes.questions![0].curriculum?.mappingStatus).toBe('verified');
  });

  // G. ERROR ACCOUNTING
  it('G. ERROR ACCOUNTING: Grade conflict results in ERROR, not NEEDS_REVIEW or UNMAPPED', () => {
    const qConflict: ExerciseQuestion = {
      id: 'TH6_conflict',
      category: 'mc',
      level: 'NB',
      lesson: 'Tin học 8 - Bài 1: Lược sử',
      content: 'Conflict',
      options: ['A'],
      answer: 'A'
    };

    const report = runQuestionBankMigrationDryRun([qConflict]);
    expect(report.errors).toBe(1);
    expect(report.needsReview).toBe(0);
    expect(report.unmapped).toBe(0);
    expect(report.autoResolved).toBe(0);
  });

  // H. DUPLICATE QUESTION ID
  it('H. DUPLICATE QUESTION ID: Migration transaction fails', () => {
    const qDup = MOCK_V1_QUESTIONS[0];
    seedV1Storage([qDup, qDup], 1);

    const res = executeQuestionBankMigrationV1ToV2();
    expect(res.success).toBe(false);
    expect(res.error).toContain('Trùng lặp');
  });

  // I. UNKNOWN SCHEMA
  it('I. UNKNOWN SCHEMA: schemaVersion 999 does not migrate and preserves storage', () => {
    seedV1Storage(MOCK_V1_QUESTIONS, 999);
    const res = loadQuestionBank();
    expect(res.success).toBe(false);
    expect(res.data.length).toBeGreaterThan(0); // Fallback sample
    expect(window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY)?.includes('"schemaVersion":999')).toBe(true);
  });

  // J. V1 BACKUP FULL TRANSACTION
  it('J. V1 BACKUP FULL TRANSACTION: full pipeline is executed in restore', () => {
    // Ensure read-back happens in restore:
    const v1BackupPackage: QuestionBankBackupPackage = {
      backupFormat: 'matrandethi-question-bank',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      questionBankSchemaVersion: 1,
      questionCount: 1,
      questions: [MOCK_V1_QUESTIONS[0]]
    };

    const originalGetItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: any, key: string) {
      if (key === QUESTION_BANK_STORAGE_KEY) {
        return JSON.stringify({ schemaVersion: 2, questions: [] }); // read-back fail
      }
      return originalGetItem.call(this, key);
    });

    const res = restoreBackupPackage(v1BackupPackage, []);
    expect(res.success).toBe(false);
    expect(res.error).toContain('read-back');
  });

});
