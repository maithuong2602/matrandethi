import { ExerciseQuestion } from '../../types';
import { SAMPLE_QUESTIONS } from '../../data/sampleQuestions';
import { 
  executeQuestionBankMigrationV1ToV2, 
  migrateQuestionToV2 
} from '../migration/questionBankCanonicalMigration';

export const QUESTION_BANK_STORAGE_KEY = 'matrandethi_question_bank';
export const CURRENT_SCHEMA_VERSION = 2;

export interface QuestionBankStoragePayload {
  schemaVersion: number;
  updatedAt: string;
  questions: ExerciseQuestion[];
  metadata?: {
    totalCount: number;
    appVersion?: string;
    migratedFromVersion?: number;
    migratedAt?: string;
    safetySnapshotId?: string;
  };
}

export interface StorageLoadResult {
  success: boolean;
  data: ExerciseQuestion[];
  error?: string;
  isInitial?: boolean;
  canAutoSave?: boolean;
}

export interface StorageSaveResult {
  success: boolean;
  error?: string;
}

// Trạng thái cách ly bảo vệ dữ liệu khi phát hiện hỏng hóc
let isStorageQuarantined = false;

export const isQuarantined = (): boolean => isStorageQuarantined;
export const setQuarantined = (val: boolean): void => {
  isStorageQuarantined = val;
};

/**
 * Kiểm tra tính khả dụng của window.localStorage
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Kiểm tra xem một đối tượng câu hỏi có thỏa mãn schema tối thiểu hay không
 */
export const isValidQuestion = (item: any): item is ExerciseQuestion => {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (item.category !== 'mc' && item.category !== 'essay') return false;
  if (typeof item.level !== 'string') return false;
  if (typeof item.content !== 'string') return false;
  if (item.options !== undefined && !Array.isArray(item.options)) return false;
  return true;
};

/**
 * Validate cấu trúc payload của Question Bank từ chuỗi hoặc object thô
 */
export const validateStoredQuestionBank = (raw: unknown): { valid: boolean; error?: string; payload?: QuestionBankStoragePayload } => {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Dữ liệu lưu trữ rỗng hoặc không phải định dạng JSON Object.' };
  }

  const candidate = raw as Record<string, any>;

  if (typeof candidate.schemaVersion !== 'number') {
    return { valid: false, error: 'Thiếu trường schemaVersion hoặc định dạng version không hợp lệ.' };
  }

  if (candidate.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { 
      valid: false, 
      error: `Phiên bản dữ liệu (${candidate.schemaVersion}) cao hơn phiên bản ứng dụng hỗ trợ (${CURRENT_SCHEMA_VERSION}). Cần cập nhật ứng dụng.` 
    };
  }

  if (!Array.isArray(candidate.questions)) {
    return { valid: false, error: 'Trường "questions" bị thiếu hoặc không phải là danh sách (Array).' };
  }

  for (let i = 0; i < candidate.questions.length; i++) {
    const q = candidate.questions[i];
    if (!isValidQuestion(q)) {
      return { 
        valid: false, 
        error: `Câu hỏi thứ ${i + 1} (ID: ${q?.id || 'không xác định'}) không thỏa mãn cấu trúc câu hỏi hợp lệ.` 
      };
    }
  }

  return {
    valid: true,
    payload: candidate as QuestionBankStoragePayload
  };
};

/**
 * Nạp toàn bộ ngân hàng câu hỏi từ localStorage
 * Tuân thủ nghiêm ngặt 3 trường hợp:
 * - CASE A: Chưa tồn tại -> nạp SAMPLE_QUESTIONS và lưu persist
 * - CASE B: Tồn tại & hợp lệ -> nạp dữ liệu người dùng (không ghi đè)
 * - CASE C: Dữ liệu hỏng / không hợp lệ -> tạo bản sao lưu lỗi, trả về fallback an toàn, không crash
 */
export const loadQuestionBank = (): StorageLoadResult => {
  if (!isLocalStorageAvailable()) {
    console.warn('[QuestionBankStorage] localStorage không khả dụng, sử dụng bộ nhớ tạm thời.');
    return {
      success: true,
      data: [...SAMPLE_QUESTIONS],
      isInitial: true
    };
  }

  try {
    const rawData = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);

    // CASE A: Storage chưa tồn tại
    if (rawData === null) {
      const initialV2Questions = SAMPLE_QUESTIONS.map(q => 
        migrateQuestionToV2(q, { defaultLesson: 'KNTT-TH6-B01', defaultGrade: 6 })
      );
      const initialPayload: QuestionBankStoragePayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        questions: initialV2Questions,
        metadata: {
          totalCount: initialV2Questions.length,
          appVersion: '2.0.0'
        }
      };

      try {
        window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(initialPayload));
      } catch (saveErr) {
        console.error('[QuestionBankStorage] Không thể ghi dữ liệu khởi tạo:', saveErr);
      }

      isStorageQuarantined = false;
      return {
        success: true,
        data: initialV2Questions,
        isInitial: true,
        canAutoSave: true
      };
    }

    // CASE B & C: Đọc và phân tích dữ liệu hiện có
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch (parseError) {
      // CASE C: JSON parse error -> Kích hoạt cách ly dữ liệu
      isStorageQuarantined = true;
      const backupKey = `${QUESTION_BANK_STORAGE_KEY}_corrupted_backup_${Date.now()}`;
      try {
        window.localStorage.setItem(backupKey, rawData);
        console.error(`[QuestionBankStorage] JSON bị hỏng. Đã lưu backup sang "${backupKey}".`);
      } catch {
        // bỏ qua nếu backup lỗi
      }

      return {
        success: false,
        data: [...SAMPLE_QUESTIONS],
        canAutoSave: false,
        error: 'Tệp lưu trữ ngân hàng câu hỏi bị lỗi cú pháp JSON. Hệ thống đã kích hoạt chế độ an toàn và sao lưu dữ liệu cũ.'
      };
    }

    // Kiểm tra tính hợp lệ của schema
    const validation = validateStoredQuestionBank(parsed);
    if (!validation.valid || !validation.payload) {
      // CASE C: Invalid schema -> Kích hoạt cách ly dữ liệu
      isStorageQuarantined = true;
      const backupKey = `${QUESTION_BANK_STORAGE_KEY}_invalid_schema_backup_${Date.now()}`;
      try {
        window.localStorage.setItem(backupKey, rawData);
        console.error(`[QuestionBankStorage] Schema không hợp lệ. Đã sao lưu sang "${backupKey}":`, validation.error);
      } catch {
        // bỏ qua nếu backup lỗi
      }

      return {
        success: false,
        data: [...SAMPLE_QUESTIONS],
        canAutoSave: false,
        error: `Dữ liệu câu hỏi trong bộ nhớ không hợp lệ: ${validation.error}. Đã kích hoạt bản sao lưu an toàn.`
      };
    }

    // CASE B: Dữ liệu hợp lệ
    // TASK 006B: Tự động nâng cấp an toàn Schema v1 -> Schema v2 với Safety Snapshot
    if (validation.payload.schemaVersion === 1) {
      const migRes = executeQuestionBankMigrationV1ToV2();
      if (migRes.success) {
        isStorageQuarantined = false;
        return {
          success: true,
          data: migRes.data,
          isInitial: false,
          canAutoSave: true
        };
      } else {
        // Migration bị abort hoặc rollback an toàn, giữ nguyên dữ liệu V1
        console.warn('[QuestionBankStorage] Migration Schema v2 tạm dừng:', migRes.error);
        isStorageQuarantined = false;
        return {
          success: true,
          data: validation.payload.questions,
          isInitial: false,
          canAutoSave: true,
          error: migRes.error
        };
      }
    }

    // CASE B2: Schema v2 hợp lệ
    isStorageQuarantined = false;
    return {
      success: true,
      data: validation.payload.questions,
      isInitial: false,
      canAutoSave: true
    };
  } catch (unknownError: any) {
    isStorageQuarantined = true;
    console.error('[QuestionBankStorage] Lỗi không xác định khi tải câu hỏi:', unknownError);
    return {
      success: false,
      data: [...SAMPLE_QUESTIONS],
      canAutoSave: false,
      error: `Lỗi không xác định khi truy xuất bộ nhớ: ${unknownError?.message || unknownError}`
    };
  }
};

/**
 * Lưu toàn bộ danh sách câu hỏi vào localStorage theo cấu trúc có phiên bản (Versioned Schema)
 * @param questions Danh sách câu hỏi cần lưu
 * @param options Tùy chọn, force = true cho phép bỏ qua trạng thái cách ly khi người dùng chủ động phục hồi
 */
export const saveQuestionBank = (
  questions: ExerciseQuestion[], 
  options?: { force?: boolean; schemaVersion?: number }
): StorageSaveResult => {
  if (isStorageQuarantined && !options?.force) {
    return {
      success: false,
      error: 'Storage đang ở chế độ cách ly bảo vệ (Quarantine) do dữ liệu lưu trữ bị lỗi. Tự động lưu bị tạm khóa để bảo vệ dữ liệu hỏng trước khi phục hồi.'
    };
  }

  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: 'Bộ nhớ localStorage không khả dụng trên trình duyệt của bạn.'
    };
  }

  if (!Array.isArray(questions)) {
    return {
      success: false,
      error: 'Dữ liệu cần lưu phải là một mảng danh sách câu hỏi.'
    };
  }

  const payload: QuestionBankStoragePayload = {
    schemaVersion: options?.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    questions,
    metadata: {
      totalCount: questions.length,
      appVersion: '2.0.0'
    }
  };

  try {
    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, serialized);
    if (options?.force) {
      isStorageQuarantined = false;
    }
    return { success: true };
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError' || error?.code === 22 || error?.number === -2147024882) {
      console.error('[QuestionBankStorage] Tràn bộ nhớ lưu trữ localStorage (QuotaExceededError).');
      return {
        success: false,
        error: 'Bộ nhớ trình duyệt đã đầy (QuotaExceededError). Vui lòng xóa bớt câu hỏi hoặc xuất file sao lưu trước khi tiếp tục.'
      };
    }

    console.error('[QuestionBankStorage] Lỗi khi lưu câu hỏi:', error);
    return {
      success: false,
      error: `Không thể lưu câu hỏi: ${error?.message || error}`
    };
  }
};

/**
 * Xóa sạch Question Bank trong localStorage (dành cho Reset hoặc Kiểm thử)
 */
export const clearQuestionBank = (): StorageSaveResult => {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage không khả dụng.' };
  }
  try {
    window.localStorage.removeItem(QUESTION_BANK_STORAGE_KEY);
    isStorageQuarantined = false;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Lỗi khi xóa dữ liệu.' };
  }
};

/**
 * Xuất chuỗi JSON sao lưu hiện tại
 */
export const exportQuestionBankBackup = (): string | null => {
  if (!isLocalStorageAvailable()) return null;
  return window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
};

/**
 * Khôi phục dữ liệu từ chuỗi JSON sao lưu
 */
export const restoreQuestionBankFromBackup = (jsonString: string): { success: boolean; error?: string; count?: number } => {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateStoredQuestionBank(parsed);
    if (!validation.valid || !validation.payload) {
      return { success: false, error: validation.error || 'Dữ liệu sao lưu không đúng định dạng.' };
    }

    const saveResult = saveQuestionBank(validation.payload.questions);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true, count: validation.payload.questions.length };
  } catch (err: any) {
    return { success: false, error: 'Chuỗi JSON sao lưu không thể phân tích cú pháp: ' + err.message };
  }
};
