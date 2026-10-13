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
  resolveQuestionCurriculum,
} from '../services/migration/questionBankCanonicalMigration';
import {
  createSafetySnapshot,
  listSafetySnapshots,
  restoreBackupPackage,
  rollbackLatestSnapshot,
  createBackupPackage,
  QuestionBankBackupPackage,
  SNAPSHOT_STORAGE_PREFIX,
} from '../services/backup/questionBankBackup';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';
import { CANONICAL_REQUIREMENTS } from '../data/curriculum/requirements';

const getRequirementById = (id: string) => CANONICAL_REQUIREMENTS.find(r => r.id === id);

describe('TASK 006B: Question Bank Schema v2 Migration & Safety Snapshot', () => {

  // Seed data representing legacy V1 questions (no curriculum attachment)
  const LEGACY_V1_QUESTIONS: ExerciseQuestion[] = [
    {
      id: 'leg_g6_01',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Thông tin là gì?',
      options: ['A. Âm thanh', 'B. Hình ảnh', 'C. Hiểu biết của con người', 'D. Chữ viết'],
      answer: 'C',
      points: 0.25,
      lesson: 'Tin học 6 - Bài 1: Thông tin và dữ liệu'
    },
    {
      id: 'leg_g7_02',
      category: 'mc',
      level: 'TH',
      criteria: '2.1',
      content: 'Thiết bị nào sau đây là thiết bị vào?',
      options: ['A. Chuột', 'B. Màn hình', 'C. Máy in', 'D. Loa'],
      answer: 'A',
      points: 0.25,
      lesson: 'Tin học 7 - Bài 2: Thiết bị vào - ra'
    },
    {
      id: 'leg_ambiguous_03',
      category: 'mc',
      level: 'VD',
      criteria: 'unknown_criteria_xyz',
      content: 'Câu hỏi chưa rõ tiêu chí',
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      points: 0.25,
      lesson: 'Tin học 6 - Bài 1: Thông tin và dữ liệu'
    },
    {
      id: 'leg_manual_04',
      category: 'mc',
      level: 'VD',
      criteria: '1.2',
      content: 'Câu hỏi đã được giáo viên chỉnh sửa thủ công',
      options: ['A', 'B', 'C', 'D'],
      answer: 'B',
      points: 0.5,
      lesson: 'Tin học 6 - Bài 1: Thông tin và dữ liệu',
      curriculum: {
        requirementId: 'TH6-A-002',
        mappingStatus: 'verified',
        mappingMethod: 'manual',
        resolvedAt: '2026-09-25T10:00:00.000Z',
        notes: 'Giáo viên đã xác nhận YCCĐ này'
      }
    }
  ];

  const seedV1Storage = (questions: ExerciseQuestion[]) => {
    const payload = {
      schemaVersion: 1,
      savedAt: '2026-09-20T00:00:00.000Z',
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

  // =========================================================================
  // 1. ATOMIC MIGRATION PIPELINE & SAFETY SNAPSHOT
  // =========================================================================

  describe('1. Pipeline V1 -> Snapshot -> Migrate -> Validate -> Save -> Read-back', () => {

    it('MIG-01: Full migration thành công từ V1 sang V2 và tạo Safety Snapshot', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);

      const snapshotsBefore = listSafetySnapshots();
      expect(snapshotsBefore.length).toBe(0);

      const result = executeQuestionBankMigrationV1ToV2({ trigger: 'manual_migration_test' });

      expect(result.success).toBe(true);
      expect(result.status).toBe('migrated');
      expect(result.migratedCount).toBe(LEGACY_V1_QUESTIONS.length);
      expect(result.snapshotCreated).toBe(true);
      expect(result.snapshotId).toBeDefined();

      // Snapshot đã được tạo và chứa dữ liệu V1 trước khi migrate
      const snapshotsAfter = listSafetySnapshots();
      expect(snapshotsAfter.length).toBe(1);
      expect(snapshotsAfter[0].schemaVersion).toBe(1);
      expect(snapshotsAfter[0].questions.length).toBe(LEGACY_V1_QUESTIONS.length);

      // Storage đã lên V2
      const rawStored = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      const storedPayload: StoredQuestionBankPayload = JSON.parse(rawStored!);
      expect(storedPayload.schemaVersion).toBe(2);
      expect(storedPayload.questions.length).toBe(LEGACY_V1_QUESTIONS.length);

      // Read-back verification đã qua
      expect(result.readBackVerified).toBe(true);
    });

    it('MIG-02: ABORT MIGRATION nếu Safety Snapshot thất bại (QuotaExceeded / Exception)', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);
      const rawBefore = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

      // Giả lập lỗi khi lưu snapshot (ví dụ: QuotaExceededError)
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
        if (key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
          const quotaErr = new Error('Quota exceeded for safety snapshot');
          quotaErr.name = 'QuotaExceededError';
          throw quotaErr;
        }
        return originalSetItem.call(this, key, val);
      });

      const result = executeQuestionBankMigrationV1ToV2({ trigger: 'test_snapshot_failure' });

      // Migration phải ABORT ngay lập tức
      expect(result.success).toBe(false);
      expect(result.status).toBe('aborted');
      expect(result.snapshotCreated).toBe(false);
      expect(result.error).toContain('Safety Snapshot');

      // Question Bank storage TUYỆT ĐỐI không bị thay đổi
      const rawAfter = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawAfter).toBe(rawBefore);
      const storedPayload = JSON.parse(rawAfter!);
      expect(storedPayload.schemaVersion).toBe(1); // Vẫn giữ V1 nguyên vẹn
    });

    it('MIG-03: ROLLBACK nếu ghi V2 vào Storage thất bại (QuotaExceeded khi save V2)', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);
      const rawBefore = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

      // Cho snapshot thành công, nhưng giả lập lỗi khi save V2 vào storage
      const originalSetItem = Storage.prototype.setItem;
      let saveV2Attempted = false;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
        if (key === QUESTION_BANK_STORAGE_KEY && !saveV2Attempted) {
          saveV2Attempted = true;
          const quotaErr = new Error('Disk full when writing Schema v2');
          quotaErr.name = 'QuotaExceededError';
          throw quotaErr;
        }
        return originalSetItem.call(this, key, val);
      });

      const result = executeQuestionBankMigrationV1ToV2({ trigger: 'test_save_failure' });

      expect(result.success).toBe(false);
      expect(result.status).toBe('rollback');
      expect(result.rollbackPerformed).toBe(true);

      // Storage đã được phục hồi về V1 nguyên vẹn
      const rawAfter = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawAfter).toBe(rawBefore);
      const storedPayload = JSON.parse(rawAfter!);
      expect(storedPayload.schemaVersion).toBe(1);
    });

    it('MIG-04: ROLLBACK nếu Read-back verify thất bại (dữ liệu đọc lại không khớp)', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);
      const rawBefore = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

      // Giả lập lưu thành công nhưng khi getItem đọc lại bị hỏng hoặc trả về rỗng
      let saveV2Done = false;
      const originalSetItem = Storage.prototype.setItem;
      const originalGetItem = Storage.prototype.getItem;

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: any, key: string, val: string) {
        if (key === QUESTION_BANK_STORAGE_KEY) {
          saveV2Done = true;
        }
        return originalSetItem.call(this, key, val);
      });

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: any, key: string) {
        if (key === QUESTION_BANK_STORAGE_KEY && saveV2Done) {
          // Trả về payload bị thiếu câu hỏi để fail read-back verification
          return JSON.stringify({
            schemaVersion: 2,
            savedAt: new Date().toISOString(),
            questions: [] // Sai số lượng câu hỏi!
          });
        }
        return originalGetItem.call(this, key);
      });

      const result = executeQuestionBankMigrationV1ToV2({ trigger: 'test_readback_fail' });

      expect(result.success).toBe(false);
      expect(result.status).toBe('rollback');
      expect(result.rollbackPerformed).toBe(true);
      expect(result.readBackVerified).toBe(false);

      // Sau khi rollback, getItem bình thường sẽ thấy payload V1 ban đầu
      vi.restoreAllMocks();
      const rawFinal = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawFinal).toBe(rawBefore);
    });

  });

  // =========================================================================
  // 2. IDEMPOTENCY & SCHEMA V2 GUARDS
  // =========================================================================

  describe('2. Idempotency & Schema v2 Protection', () => {

    it('IDEM-01: Migration là Idempotent - Dữ liệu đã là V2 không migrate lại', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);

      // Chạy migration lần 1
      const res1 = executeQuestionBankMigrationV1ToV2();
      expect(res1.success).toBe(true);
      expect(res1.status).toBe('migrated');

      const snapshotsCountAfterRes1 = listSafetySnapshots().length;
      const rawAfterRes1 = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

      // Chạy migration lần 2 trên dữ liệu V2 hiện tại
      const res2 = executeQuestionBankMigrationV1ToV2();
      expect(res2.success).toBe(true);
      expect(res2.status).toBe('already_v2');
      expect(res2.migratedCount).toBe(0);

      // Không tạo snapshot dư thừa
      expect(listSafetySnapshots().length).toBe(snapshotsCountAfterRes1);

      // Storage không bị thay đổi
      const rawAfterRes2 = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawAfterRes2).toBe(rawAfterRes1);
    });

    it('IDEM-02: migrateQuestionToV2 không biến đổi câu hỏi đã có curriculum trừ khi force', () => {
      const v2Question: ExerciseQuestion = {
        ...LEGACY_V1_QUESTIONS[0],
        curriculum: {
          requirementId: 'TH6-A-001',
          mappingStatus: 'auto_resolved',
          mappingMethod: 'kntt_rule_exact',
          resolvedAt: '2026-09-27T00:00:00.000Z'
        }
      };

      const resultWithoutForce = migrateQuestionToV2(v2Question, { force: false });
      expect(resultWithoutForce).toEqual(v2Question);
      expect(resultWithoutForce.curriculum?.resolvedAt).toBe('2026-09-27T00:00:00.000Z');
    });

  });

  // =========================================================================
  // 3. MAPPING RULES: AUTO_RESOLVED vs NEEDS_REVIEW / UNMAPPED
  // =========================================================================

  describe('3. Mapping Rules: AUTO_RESOLVED vs NEEDS_REVIEW / UNMAPPED', () => {

    it('MAP-01: Chỉ AUTO_RESOLVED mới được nhận requirementId thật', () => {
      const qAuto = LEGACY_V1_QUESTIONS[0]; // KNTT 6 bài 1, criteria 1.1 -> TH6-A-001
      const migrated = migrateQuestionToV2(qAuto);

      expect(migrated.curriculum).toBeDefined();
      expect(migrated.curriculum?.mappingStatus).toBe('auto_resolved');
      expect(migrated.curriculum?.requirementId).toBe('TH6-A-001');

      // Canonical requirement tương ứng phải tồn tại trong Canonical Curriculum
      const req = getRequirementById('TH6-A-001');
      expect(req).toBeDefined();
      expect(req?.grade).toBe(6);
    });

    it('MAP-02: NEEDS_REVIEW và UNMAPPED KHÔNG được có requirementId giả (phải undefined)', () => {
      const qAmbiguous = LEGACY_V1_QUESTIONS[2]; // unknown criteria
      const migrated = migrateQuestionToV2(qAmbiguous);

      expect(migrated.curriculum).toBeDefined();
      // requirementId TUYỆT ĐỐI không được gắn chuỗi bừa bãi
      expect(migrated.curriculum?.requirementId).toBeUndefined();
      expect(['needs_review', 'unmapped']).toContain(migrated.curriculum?.mappingStatus);

      // Câu hỏi không hề có lesson hoặc criteria
      const qUnmapped: ExerciseQuestion = {
        id: 'q_empty_meta',
        category: 'mc',
        level: 'NB',
        content: 'Câu hỏi không có bài học và tiêu chí',
        options: ['A', 'B'],
        answer: 'A'
      };
      const migratedUnmapped = migrateQuestionToV2(qUnmapped);
      expect(migratedUnmapped.curriculum?.requirementId).toBeUndefined();
      expect(migratedUnmapped.curriculum?.mappingStatus).toBe('unmapped');
    });

    it('MAP-03: Mapping do giáo viên xác nhận thủ công (manual / verified) có ƯU TIÊN CAO NHẤT', () => {
      // Câu hỏi leg_manual_04 có criteria 1.2 (vốn map tới TH6-A-002 theo rule, nhưng giả sử giáo viên đã sửa)
      const qManual = LEGACY_V1_QUESTIONS[3];
      const migrated = migrateQuestionToV2(qManual);

      expect(migrated.curriculum).toBeDefined();
      expect(migrated.curriculum?.mappingMethod).toBe('manual');
      expect(migrated.curriculum?.mappingStatus).toBe('verified');
      expect(migrated.curriculum?.requirementId).toBe('TH6-A-002');
      expect(migrated.curriculum?.notes).toBe('Giáo viên đã xác nhận YCCĐ này');
    });

    it('MAP-04: Không dùng question.id regex làm canonical truth cho grade và xử lý Grade Conflict an toàn', () => {
      // Câu hỏi có ID bắt đầu bằng 'TH6' nhưng bài học lại thuộc Lớp 8
      const qConflict: ExerciseQuestion = {
        id: 'TH6_test_conflict_grade',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Câu hỏi xung đột giữa ID TH6 và bài học Lớp 8',
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
        points: 0.25,
        lesson: 'Tin học 8 - Bài 1: Lược sử công cụ tính toán'
      };

      const resolution = resolveQuestionCurriculum(qConflict);

      // Hệ thống nhận diện grade từ lesson là 8, không lấy grade 6 từ ID
      // Nếu có sự mâu thuẫn hoặc không giải quyết sạch sẽ, không tự đoán mò gán requirementId của lớp 6
      if (resolution.status === 'auto_resolved') {
        expect(resolution.requirementId?.startsWith('TH8-')).toBe(true);
      } else {
        expect(resolution.requirementId).toBeUndefined();
        expect(resolution.status).not.toBe('auto_resolved');
      }
    });

  });

  // =========================================================================
  // 4. 100% LEGACY DATA & QUESTION INTEGRITY PRESERVATION
  // =========================================================================

  describe('4. Bảo tồn 100% dữ liệu legacy và tính toàn vẹn', () => {

    it('PRES-01: Giữ nguyên vẹn id, content, options, answer, points, lesson, level, criteria và custom fields', () => {
      const complexLegacyQuestion: ExerciseQuestion = {
        id: 'custom_legacy_uuid_12345',
        category: 'mc',
        level: 'TH',
        criteria: '1.1',
        content: 'Nội dung chứa ký tự đặc biệt: <tag> & "quotes" \'single\' và \n xuống dòng',
        options: [
          'A: Lựa chọn thứ nhất',
          'B: Lựa chọn thứ hai',
          'C: Lựa chọn thứ ba',
          'D: Lựa chọn thứ tư'
        ],
        answer: 'B',
        points: 0.75,
        lesson: 'Tin học 6 - Bài 1: Thông tin và dữ liệu'
      };

      const migrated = migrateQuestionToV2(complexLegacyQuestion);

      // 1. Không đổi id
      expect(migrated.id).toBe(complexLegacyQuestion.id);
      // 2. Không đổi content
      expect(migrated.content).toBe(complexLegacyQuestion.content);
      // 3. Không đổi options
      expect(migrated.options).toEqual(complexLegacyQuestion.options);
      // 4. Không đổi answer
      expect(migrated.answer).toBe(complexLegacyQuestion.answer);
      // 5. Không đổi points
      expect(migrated.points).toBe(complexLegacyQuestion.points);
      // 6. Không đổi lesson
      expect(migrated.lesson).toBe(complexLegacyQuestion.lesson);
      // 7. Không đổi level
      expect(migrated.level).toBe(complexLegacyQuestion.level);
      // 8. Không đổi criteria
      expect(migrated.criteria).toBe(complexLegacyQuestion.criteria);
    });

    it('PRES-02: Không regenerate question ID và không xáo trộn options', () => {
      const q = LEGACY_V1_QUESTIONS[1];
      const migrated = migrateQuestionToV2(q);

      expect(migrated.id).toBe(q.id);
      expect(migrated.options?.[0]).toBe(q.options?.[0]);
      expect(migrated.options?.[1]).toBe(q.options?.[1]);
      expect(migrated.options?.[2]).toBe(q.options?.[2]);
      expect(migrated.options?.[3]).toBe(q.options?.[3]);
    });

  });

  // =========================================================================
  // 5. V1/V2 COMPATIBILITY, TRANSPARENT LOADING & RESTORE
  // =========================================================================

  describe('5. V1/V2 Compatibility, Transparent Loading & Restore', () => {

    it('COMPAT-01: loadQuestionBank tự động nhận diện V1, tạo Snapshot và migrate lên V2', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);

      const loadResult = loadQuestionBank();

      // Đọc ra được đầy đủ số lượng câu hỏi
      expect(loadResult.data.length).toBe(LEGACY_V1_QUESTIONS.length);

      // Các câu hỏi được trả về đã có curriculum attachment
      expect(loadResult.data[0].curriculum).toBeDefined();

      // Storage đã tự động được nâng cấp lên V2
      const rawStored = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      const storedPayload: StoredQuestionBankPayload = JSON.parse(rawStored!);
      expect(storedPayload.schemaVersion).toBe(2);

      // Snapshot an toàn V1 đã được tạo trước khi nâng cấp
      const snapshots = listSafetySnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0].schemaVersion).toBe(1);
    });

    it('COMPAT-02: Restore file Backup định dạng V1 thành công vào hệ thống V2', () => {
      // Giả sử người dùng tải lên 1 file backup từ phiên bản trước (V1)
      const v1BackupPackage: QuestionBankBackupPackage = {
        backupFormat: 'matrandethi-question-bank',
        backupVersion: 1,
        createdAt: '2026-09-20T10:00:00.000Z',
        appVersion: '1.0.0',
        questionBankSchemaVersion: 1, // File backup phiên bản 1
        questionCount: LEGACY_V1_QUESTIONS.length,
        questions: JSON.parse(JSON.stringify(LEGACY_V1_QUESTIONS))
      };

      // Đang có sẵn 1 số câu hỏi trong ngân hàng hiện tại
      const currentQuestions = [SAMPLE_QUESTIONS[0]];
      saveQuestionBank(currentQuestions);

      // Tiến hành Restore file backup V1
      const restoreRes = restoreBackupPackage(v1BackupPackage, currentQuestions);

      expect(restoreRes.success).toBe(true);
      expect(restoreRes.questions?.length).toBe(LEGACY_V1_QUESTIONS.length);

      // Câu hỏi phục hồi trong ngân hàng đã được migrate sang V2
      const rawStored = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      const storedPayload: StoredQuestionBankPayload = JSON.parse(rawStored!);
      expect(storedPayload.schemaVersion).toBe(2);
      expect(storedPayload.questions[0].curriculum).toBeDefined();
    });

    it('COMPAT-03: Rollback latest snapshot phục hồi đúng phiên bản và dữ liệu', () => {
      seedV1Storage(LEGACY_V1_QUESTIONS);

      // Migrate sang V2 (tạo snapshot V1)
      const migRes = executeQuestionBankMigrationV1ToV2();
      expect(migRes.success).toBe(true);

      // Giờ thực hiện rollback
      const rollbackRes = rollbackLatestSnapshot();
      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.restoredQuestions?.length).toBe(LEGACY_V1_QUESTIONS.length);

      // Storage đã quay lại snapshot V1
      const rawStored = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      const storedPayload: StoredQuestionBankPayload = JSON.parse(rawStored!);
      expect(storedPayload.schemaVersion).toBe(1);
    });

  });

  // =========================================================================
  // 6. SPECIFIC SAFETY REGRESSIONS: TH9-E-007, TH8-E-013 & CORRUPTION
  // =========================================================================

  describe('6. Regression & Safety Checks (TH9-E-007, TH8-E-013, Quarantine)', () => {

    it('REG-01: TH9-E-007 và TH8-E-013 được bảo toàn và định danh chính xác', () => {
      const th9Req = getRequirementById('TH9-E-007');
      expect(th9Req).toBeDefined();
      expect(th9Req?.grade).toBe(9);
      expect(th9Req?.topicId).toBe('TH-E');

      const th8Req = getRequirementById('TH8-E-013');
      expect(th8Req).toBeDefined();
      expect(th8Req?.grade).toBe(8);
      expect(th8Req?.topicId).toBe('TH-E');

      // Câu hỏi liên quan đến TH9-E-007
      const qTH9: ExerciseQuestion = {
        id: 'q_th9_sample',
        category: 'mc',
        level: 'TH',
        content: 'Tác động tiêu cực của công nghệ kĩ thuật số...',
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
        curriculum: {
          requirementId: 'TH9-E-007',
          mappingStatus: 'verified',
          mappingMethod: 'manual'
        }
      };

      const migratedTH9 = migrateQuestionToV2(qTH9);
      expect(migratedTH9.curriculum?.requirementId).toBe('TH9-E-007');
    });

    it('REG-02: Corruption quarantine tiếp tục hoạt động an toàn', () => {
      // Dữ liệu JSON bị hỏng hoàn toàn trong storage
      window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, '{ invalid_malformed_json_corrupted');

      // loadQuestionBank không crash và trả về fallback an toàn
      const fallback = loadQuestionBank();
      expect(Array.isArray(fallback.data)).toBe(true);
      expect(fallback.data.length).toBeGreaterThan(0);

      // Key corrupted backup đã được tạo
      let foundCorruptedBackup = false;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.includes('corrupted_backup')) {
          foundCorruptedBackup = true;
          break;
        }
      }
      expect(foundCorruptedBackup).toBe(true);
    });

  });

});
