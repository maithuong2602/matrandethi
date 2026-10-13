import { ExerciseQuestion } from '../../types';
import { 
  isValidQuestion, 
  saveQuestionBank, 
  CURRENT_SCHEMA_VERSION, 
  isLocalStorageAvailable,
  QUESTION_BANK_STORAGE_KEY
} from '../storage/questionBankStorage';
import { migrateQuestionToV2 } from '../migration/questionBankCanonicalMigration';

export const BACKUP_FORMAT_IDENTIFIER = 'matrandethi-question-bank';
export const CURRENT_BACKUP_VERSION = 1;
export const SNAPSHOT_STORAGE_PREFIX = 'matrandethi_question_bank_snapshot_';
export const MAX_SNAPSHOTS_RETAINED = 5;

export interface QuestionBankBackupPackage {
  backupFormat: 'matrandethi-question-bank';
  backupVersion: 1;
  createdAt: string;
  appVersion: string;
  questionBankSchemaVersion: number;
  questionCount: number;
  questions: ExerciseQuestion[];
}

export interface SafetySnapshot {
  snapshotId: string;
  createdAt: string;
  schemaVersion: number;
  questionCount: number;
  actionTrigger: string;
  questions: ExerciseQuestion[];
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  pkg?: QuestionBankBackupPackage;
  isLegacy?: boolean;
}

export interface RestoreResult {
  success: boolean;
  questions?: ExerciseQuestion[];
  error?: string;
  snapshotId?: string;
}

export interface RollbackResult {
  success: boolean;
  restoredQuestions?: ExerciseQuestion[];
  error?: string;
}

/**
 * Tạo gói dữ liệu sao lưu có định danh và phiên bản chuẩn
 */
export const createBackupPackage = (questions: ExerciseQuestion[]): QuestionBankBackupPackage => {
  return {
    backupFormat: BACKUP_FORMAT_IDENTIFIER,
    backupVersion: CURRENT_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    questionBankSchemaVersion: CURRENT_SCHEMA_VERSION,
    questionCount: questions.length,
    questions: JSON.parse(JSON.stringify(questions))
  };
};

/**
 * Kiểm định tính hợp lệ của file sao lưu (hỗ trợ cả chuẩn mới có version và định dạng legacy cũ)
 */
export const validateBackupPackage = (raw: unknown): BackupValidationResult => {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'File sao lưu rỗng hoặc không phải định dạng JSON Object.' };
  }

  const candidate = raw as Record<string, any>;

  // TRƯỜNG HỢP 1: Chuẩn Backup mới có phiên bản
  if (candidate.backupFormat === BACKUP_FORMAT_IDENTIFIER) {
    if (typeof candidate.backupVersion !== 'number') {
      return { valid: false, error: 'Thiếu thông tin backupVersion trong file sao lưu.' };
    }

    if (candidate.backupVersion > CURRENT_BACKUP_VERSION) {
      return { 
        valid: false, 
        error: `Phiên bản sao lưu (${candidate.backupVersion}) cao hơn phiên bản ứng dụng hỗ trợ (${CURRENT_BACKUP_VERSION}). Cần nâng cấp hệ thống để đọc file này.` 
      };
    }

    if (!Array.isArray(candidate.questions)) {
      return { valid: false, error: 'Trường "questions" bị thiếu hoặc không phải mảng danh sách.' };
    }

    if (candidate.questionCount !== undefined && candidate.questionCount !== candidate.questions.length) {
      return { 
        valid: false, 
        error: `Số lượng câu hỏi khai báo (${candidate.questionCount}) không khớp với số lượng thực tế trong file (${candidate.questions.length}).` 
      };
    }

    for (let i = 0; i < candidate.questions.length; i++) {
      const q = candidate.questions[i];
      if (!isValidQuestion(q)) {
        return { 
          valid: false, 
          error: `Câu hỏi thứ ${i + 1} (ID: ${q?.id || 'không xác định'}) trong bản sao lưu không thỏa mãn schema Question hợp lệ.` 
        };
      }
    }

    return {
      valid: true,
      pkg: candidate as QuestionBankBackupPackage,
      isLegacy: false
    };
  }

  // Nếu file có trường backupFormat nhưng khác BACKUP_FORMAT_IDENTIFIER -> REJECT ngay
  if (candidate.backupFormat !== undefined && candidate.backupFormat !== BACKUP_FORMAT_IDENTIFIER) {
    return {
      valid: false,
      error: `Định dạng backupFormat không hợp lệ: "${candidate.backupFormat}". Hệ thống chỉ chấp nhận "${BACKUP_FORMAT_IDENTIFIER}".`
    };
  }

  // TRƯỜNG HỢP 2: Khả năng tương thích ngược (Legacy Import Format)
  // Dạng { info: {...}, questions: [...] } từ QuestionManager cũ
  if (candidate.questions && Array.isArray(candidate.questions)) {
    for (let i = 0; i < candidate.questions.length; i++) {
      const q = candidate.questions[i];
      if (!isValidQuestion(q)) {
        return { 
          valid: false, 
          error: `Câu hỏi thứ ${i + 1} trong tệp dữ liệu cũ không thỏa mãn schema hợp lệ.` 
        };
      }
    }

    const synthesized: QuestionBankBackupPackage = {
      backupFormat: BACKUP_FORMAT_IDENTIFIER,
      backupVersion: CURRENT_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: 'legacy-export-compatible',
      questionBankSchemaVersion: CURRENT_SCHEMA_VERSION,
      questionCount: candidate.questions.length,
      questions: candidate.questions
    };

    return {
      valid: true,
      pkg: synthesized,
      isLegacy: true
    };
  }

  // Dạng mảng Question[] trần
  if (Array.isArray(candidate)) {
    for (let i = 0; i < candidate.length; i++) {
      if (!isValidQuestion(candidate[i])) {
        return { valid: false, error: `Câu hỏi thứ ${i + 1} trong mảng không đúng cấu trúc.` };
      }
    }

    const synthesized: QuestionBankBackupPackage = {
      backupFormat: BACKUP_FORMAT_IDENTIFIER,
      backupVersion: CURRENT_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: 'raw-array-compatible',
      questionBankSchemaVersion: CURRENT_SCHEMA_VERSION,
      questionCount: candidate.length,
      questions: candidate
    };

    return {
      valid: true,
      pkg: synthesized,
      isLegacy: true
    };
  }

  return { 
    valid: false, 
    error: 'Định dạng file không được nhận diện. File không chứa thông tin backupFormat hợp lệ hoặc danh sách câu hỏi.' 
  };
};

let snapshotSeqCounter = 0;

/**
 * Thực thi chính sách lưu trữ Snapshot: Chỉ giữ tối đa 5 bản snapshot gần nhất.
 * TUYỆT ĐỐI KHÔNG XÓA các khóa corrupted_backup hoặc invalid_schema_backup!
 */
export const enforceSnapshotRetention = (): void => {
  if (!isLocalStorageAvailable()) return;

  const snapshotKeys: { key: string; timestamp: number; seq: number }[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
      // Trích xuất timestamp và seq từ key
      const parts = key.replace(SNAPSHOT_STORAGE_PREFIX, '').split('_');
      const ts = parseInt(parts[0], 10);
      const seq = parts[1] ? parseInt(parts[1], 10) : 0;
      snapshotKeys.push({ key, timestamp: isNaN(ts) ? 0 : ts, seq: isNaN(seq) ? 0 : seq });
    }
  }

  // Sắp xếp tăng dần theo thời gian (cũ nhất đứng trước)
  snapshotKeys.sort((a, b) => a.timestamp === b.timestamp ? a.seq - b.seq : a.timestamp - b.timestamp);

  // Xóa các snapshot cũ vượt quá giới hạn (để danh sách luôn <= MAX_SNAPSHOTS_RETAINED)
  while (snapshotKeys.length >= MAX_SNAPSHOTS_RETAINED) {
    const oldest = snapshotKeys.shift();
    if (oldest) {
      window.localStorage.removeItem(oldest.key);
    }
  }
};

/**
 * Tạo một Safety Snapshot cho danh sách câu hỏi hiện tại trước thao tác nguy hiểm
 */
export const createSafetySnapshot = (
  questions: ExerciseQuestion[], 
  actionTrigger: string,
  schemaVersion?: number
): { success: boolean; snapshotId?: string; error?: string } => {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage không khả dụng, không thể tạo snapshot an toàn.' };
  }

  // Áp dụng retention trước khi ghi
  enforceSnapshotRetention();

  const timestamp = Date.now();
  const seq = ++snapshotSeqCounter;
  const snapshotId = `snapshot_${timestamp}_${seq}`;
  const key = `${SNAPSHOT_STORAGE_PREFIX}${timestamp}_${seq}`;

  const snapshotData: SafetySnapshot = {
    snapshotId,
    createdAt: new Date().toISOString(),
    schemaVersion: schemaVersion ?? CURRENT_SCHEMA_VERSION,
    questionCount: questions.length,
    actionTrigger,
    questions: JSON.parse(JSON.stringify(questions))
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshotData));
    return { success: true, snapshotId };
  } catch (err: any) {
    console.error('[SafetySnapshot] Không thể lưu snapshot an toàn:', err);
    return {
      success: false,
      error: 'Bộ nhớ trình duyệt đã đầy (QuotaExceededError). Không thể tạo bản sao an toàn trước thao tác.'
    };
  }
};

/**
 * Lấy danh sách toàn bộ các Safety Snapshot hiện có, sắp xếp mới nhất lên đầu
 */
export const listSafetySnapshots = (): SafetySnapshot[] => {
  if (!isLocalStorageAvailable()) return [];

  const snapshots: SafetySnapshot[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as SafetySnapshot;
          if (parsed && Array.isArray(parsed.questions)) {
            snapshots.push(parsed);
          }
        }
      } catch {
        // bỏ qua nếu đọc lỗi
      }
    }
  }

  // Mới nhất lên đầu
  return snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Phục hồi Question Bank từ bản sao lưu hợp lệ (Quy trình An Toàn Bắt Buộc)
 * 1. Validate package
 * 2. Tạo Safety Snapshot cho currentQuestions (Nếu lỗi Quota -> HỦY NGAY)
 * 3. Nếu backup là V1 -> Tự động migrate sang Schema v2
 * 4. Ghi đè có kiểm soát vào Storage
 */
export const restoreBackupPackage = (
  pkg: unknown, 
  currentQuestions: ExerciseQuestion[]
): RestoreResult => {
  // BƯỚC 1: Validate trước khi làm bất cứ việc gì
  const validation = validateBackupPackage(pkg);
  if (!validation.valid || !validation.pkg) {
    return {
      success: false,
      error: validation.error || 'Dữ liệu sao lưu không hợp lệ.'
    };
  }

  // BƯỚC 2: Tạo bản sao an toàn (Safety Snapshot) của dữ liệu hiện tại
  const snapshotRes = createSafetySnapshot(currentQuestions, 'RESTORE_BACKUP');
  if (!snapshotRes.success) {
    return {
      success: false,
      error: `Thao tác phục hồi bị HỦY để bảo vệ an toàn dữ liệu: ${snapshotRes.error}`
    };
  }

  // BƯỚC 3: Nếu gói backup là Schema v1 hoặc legacy, tự động migrate sang Schema v2!
  let questionsToRestore = validation.pkg.questions;
  if (validation.pkg.questionBankSchemaVersion === 1 || validation.isLegacy) {
    const v1Questions = questionsToRestore;
    questionsToRestore = v1Questions.map(q => migrateQuestionToV2(q));

    // Validate V2 sau khi migrate
    const seenIds = new Set<string>();
    for (let i = 0; i < questionsToRestore.length; i++) {
      const q = questionsToRestore[i];
      if (seenIds.has(q.id)) {
        rollbackLatestSnapshot();
        return {
          success: false,
          error: `Phục hồi thất bại: Trùng lặp question ID "${q.id}". Đã hoàn tác an toàn.`
        };
      }
      seenIds.add(q.id);
      
      if (q.curriculum) {
        if ((q.curriculum.mappingStatus === 'needs_review' || q.curriculum.mappingStatus === 'unmapped') && q.curriculum.requirementId) {
          rollbackLatestSnapshot();
          return {
            success: false,
            error: `Phục hồi thất bại: Vi phạm an toàn (requirementId giả mạo ở câu ${q.id}). Đã hoàn tác an toàn.`
          };
        }
      }
    }
  }

  // BƯỚC 4: Ghi dữ liệu mới vào Storage
  const saveRes = saveQuestionBank(questionsToRestore, { 
    force: true, 
    schemaVersion: CURRENT_SCHEMA_VERSION 
  });
  if (!saveRes.success) {
    rollbackLatestSnapshot();
    return {
      success: false,
      error: `Không thể lưu dữ liệu phục hồi: ${saveRes.error}. Đã hoàn tác an toàn về dữ liệu gốc.`
    };
  }

  // BƯỚC 5: Read-back verify
  if (isLocalStorageAvailable()) {
    try {
      const readBack = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      if (!readBack) throw new Error('Read-back rỗng.');
      const readBackJson = JSON.parse(readBack);
      if (readBackJson.schemaVersion !== CURRENT_SCHEMA_VERSION || readBackJson.questions.length !== questionsToRestore.length) {
        throw new Error('Dữ liệu read-back không khớp.');
      }
    } catch (err: any) {
      rollbackLatestSnapshot();
      return {
        success: false,
        error: `Kiểm tra read-back thất bại (${err?.message}). Đã hoàn tác an toàn về dữ liệu gốc.`
      };
    }
  }

  return {
    success: true,
    questions: questionsToRestore,
    snapshotId: snapshotRes.snapshotId
  };
};

/**
 * Hoàn tác lần phục hồi gần nhất (Rollback về Safety Snapshot mới nhất)
 */
export const rollbackLatestSnapshot = (): RollbackResult => {
  const snapshots = listSafetySnapshots();
  if (snapshots.length === 0) {
    return {
      success: false,
      error: 'Không tìm thấy bản sao an toàn nào để hoàn tác.'
    };
  }

  const latestSnapshot = snapshots[0];
  const saveRes = saveQuestionBank(latestSnapshot.questions, { 
    force: true,
    schemaVersion: latestSnapshot.schemaVersion 
  });
  if (!saveRes.success) {
    return {
      success: false,
      error: `Không thể hoàn tác về snapshot: ${saveRes.error}`
    };
  }

  // Xóa snapshot vừa hoàn tác để lần sau có thể hoàn tác về snapshot trước đó nữa nếu cần
  const snapshotKey = `${SNAPSHOT_STORAGE_PREFIX}${new Date(latestSnapshot.createdAt).getTime()}`;
  try {
    window.localStorage.removeItem(snapshotKey);
  } catch {
    // bỏ qua
  }

  return {
    success: true,
    restoredQuestions: latestSnapshot.questions
  };
};
