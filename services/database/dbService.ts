import { DatabaseConfig, ExerciseQuestion, SavedExamDossier } from '../../types';
import { getAllUsers, saveAllUsers, getCurrentUser, canApproveExam, SUPER_ADMIN_EMAIL } from '../authService';
import { getSavedExams, saveAllExams } from '../examApprovalService';
import { loadQuestionBank, saveQuestionBank, computeQuestionContentHash } from '../storage/questionBankStorage';
import { createSafetySnapshot } from '../backup/questionBankBackup';

const DB_CONFIG_KEY = 'matrandethi_db_config';

export const DEFAULT_DB_CONFIG: DatabaseConfig = {
  provider: 'local',
  endpointUrl: '',
  apiKey: '',
  enableAutoSync: false,
  syncStatus: 'idle'
};

export const getDatabaseConfig = (): DatabaseConfig => {
  if (typeof window === 'undefined') return DEFAULT_DB_CONFIG;
  try {
    const raw = localStorage.getItem(DB_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_DB_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[dbService] Lỗi đọc cấu hình DB:', e);
  }
  return DEFAULT_DB_CONFIG;
};

export const saveDatabaseConfig = (updates: Partial<DatabaseConfig>): DatabaseConfig => {
  const current = getDatabaseConfig();
  const merged: DatabaseConfig = { ...current, ...updates };
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(merged));
  }
  return merged;
};

/**
 * Thống kê nhanh dữ liệu Ngân hàng Câu hỏi, Ngân hàng Đề thi & Ma trận trên máy
 */
export const getStorageStats = () => {
  const questionsRes = loadQuestionBank();
  const questions = questionsRes.data || [];
  const exams = getSavedExams() || [];

  let matrixCount = 0;
  if (typeof window !== 'undefined') {
    try {
      const rawFs = localStorage.getItem('matrixFileSystem');
      if (rawFs) {
        const parsedFs = JSON.parse(rawFs);
        if (Array.isArray(parsedFs?.children)) {
          matrixCount = parsedFs.children.filter((c: any) => c.type === 'folder').length;
        }
      }
    } catch {
      // ignore
    }
  }

  const questionsByGrade: Record<string, number> = { '6': 0, '7': 0, '8': 0, '9': 0 };
  let sharedQuestionCount = 0;
  let pendingQuestionCount = 0;
  let personalQuestionCount = 0;

  questions.forEach(q => {
    if (q.grade && questionsByGrade[q.grade] !== undefined) {
      questionsByGrade[q.grade]++;
    }
    const scope = q.bankScope || 'shared';
    if (scope === 'shared') sharedQuestionCount++;
    else if (scope === 'pending') pendingQuestionCount++;
    else personalQuestionCount++;
  });

  const approvedExamCount = exams.filter(e => e.status === 'approved').length;
  const pendingExamCount = exams.filter(e => e.status === 'pending_review').length;

  return {
    questionCount: questions.length,
    sharedQuestionCount,
    pendingQuestionCount,
    personalQuestionCount,
    questionsByGrade,
    examCount: exams.length,
    approvedExamCount,
    pendingExamCount,
    matrixCount
  };
};

/**
 * Kiểm tra kết nối đến máy chủ Cơ sở dữ liệu đám mây (Supabase / REST API)
 */
export const testDatabaseConnection = async (
  endpointUrl: string, 
  apiKey: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const start = Date.now();
  if (!endpointUrl || !endpointUrl.trim()) {
    return { success: false, message: 'URL máy chủ cơ sở dữ liệu đang để trống.' };
  }

  const cleanUrl = endpointUrl.trim().replace(/\/+$/, '');

  try {
    const targetUrl = cleanUrl.includes('/rest/v1') ? cleanUrl : `${cleanUrl}/rest/v1/`;
    const headers: Record<string, string> = {
      'apikey': apiKey.trim(),
      'Authorization': `Bearer ${apiKey.trim()}`
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;

    if (response.ok || response.status === 200 || response.status === 404) {
      return {
        success: true,
        message: `Kết nối Cơ sở dữ liệu thành công! Máy chủ phản hồi sau ${latencyMs}ms.`,
        latencyMs
      };
    } else {
      return {
        success: false,
        message: `Máy chủ trả về mã lỗi HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('aborted')) {
      return { success: false, message: 'Hết thời gian chờ phản hồi từ máy chủ (Timeout sau 6 giây).' };
    }
    return { success: false, message: `Lỗi kết nối cơ sở dữ liệu: ${errMsg}` };
  }
};

/**
 * Đồng bộ hóa toàn bộ dữ liệu (Người dùng, Đề thi, Câu hỏi) lên Cơ sở dữ liệu đám mây
 */
export const syncAllDataToCloud = async (): Promise<{
  success: boolean;
  message: string;
  counts: { questions: number; exams: number; users: number };
}> => {
  const config = getDatabaseConfig();
  const questionsRes = loadQuestionBank();
  const questions = questionsRes.data || [];
  const exams = getSavedExams() || [];
  const users = getAllUsers() || [];

  const counts = {
    questions: questions.length,
    exams: exams.length,
    users: users.length
  };

  if (config.provider === 'local') {
    saveDatabaseConfig({
      lastSyncAt: new Date().toISOString(),
      syncStatus: 'synced'
    });
    return {
      success: true,
      message: `Đã lưu trữ an toàn toàn bộ dữ liệu nội bộ (${counts.questions} câu hỏi, ${counts.exams} đề thi, ${counts.users} tài khoản).`,
      counts
    };
  }

  if (config.provider === 'supabase' && config.endpointUrl && config.apiKey) {
    try {
      saveDatabaseConfig({ syncStatus: 'syncing' });
      const cleanUrl = config.endpointUrl.trim().replace(/\/+$/, '');
      const headers = {
        'apikey': config.apiKey.trim(),
        'Authorization': `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      };

      await fetch(`${cleanUrl}/rest/v1/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(users.map(u => ({
          id: u.id,
          email: u.email || `${u.id}@school.edu.vn`,
          name: u.name,
          role: u.role,
          department: u.department,
          school: u.school,
          avatar_url: u.avatar,
          provider: u.provider || 'local',
          status: u.status || 'active'
        })))
      });

      await fetch(`${cleanUrl}/rest/v1/exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(exams.map(e => ({
          id: e.id,
          title: e.title,
          grade: e.grade,
          status: e.status,
          header_info: e.headerInfo,
          matrix_data: e.matrixData,
          questions: e.questions,
          variants: e.variants,
          created_by: e.createdBy,
          creator_role: e.creatorRole,
          submitted_at: e.submittedAt,
          submission_notes: e.submissionNotes,
          reviewed_by: e.reviewedBy,
          reviewed_at: e.reviewedAt,
          reviewer_notes: e.reviewerNotes,
          ai_review_score: e.aiReviewScore,
          ai_review_summary: e.aiReviewSummary
        })))
      });

      const now = new Date().toISOString();
      saveDatabaseConfig({
        lastSyncAt: now,
        syncStatus: 'synced'
      });

      return {
        success: true,
        message: `Đồng bộ đám mây thành công lúc ${new Date(now).toLocaleTimeString('vi-VN')}! (${counts.questions} câu hỏi, ${counts.exams} đề thi, ${counts.users} tài khoản).`,
        counts
      };
    } catch (err: any) {
      saveDatabaseConfig({ syncStatus: 'error', errorMessage: err.message });
      return {
        success: false,
        message: `Lỗi đồng bộ đám mây: ${err.message}`,
        counts
      };
    }
  }

  return {
    success: true,
    message: 'Đã lưu trữ dữ liệu hoàn tất.',
    counts
  };
};

/**
 * Xuất gói dữ liệu sao lưu toàn diện dạng JSON (Full Database Export)
 */
export const exportFullDatabaseJson = (): string => {
  const questionsRes = loadQuestionBank();
  const exams = getSavedExams();
  const users = getAllUsers();
  const dbConfig = getDatabaseConfig();

  let matrixFileSystem = null;
  if (typeof window !== 'undefined') {
    try {
      const rawFs = localStorage.getItem('matrixFileSystem');
      if (rawFs) matrixFileSystem = JSON.parse(rawFs);
    } catch {
      // ignore
    }
  }

  const backupPackage = {
    app: 'ExamMaster Pro',
    version: '2025.1.0',
    exportedAt: new Date().toISOString(),
    database: {
      users,
      exams,
      questions: questionsRes.data || [],
      matrixFileSystem,
      config: dbConfig
    }
  };

  return JSON.stringify(backupPackage, null, 2);
};

/**
 * Nhập / Khôi phục gói dữ liệu sao lưu toàn diện (hỗ trợ cả Full Backup, Kho Đề Thi, hoặc Ngân Hàng Câu Hỏi)
 */
export const importFullDatabaseJson = (
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): {
  success: boolean;
  message: string;
  counts?: { questions: number; exams: number };
} => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Tệp JSON không hợp lệ.' };
    }

    const currentQuestions = loadQuestionBank().data || [];
    const currentExams = getSavedExams() || [];

    // Tạo Safety Snapshot trước khi nhập
    createSafetySnapshot(currentQuestions, 'IMPORT_FULL_DATABASE');

    let incomingQuestions: ExerciseQuestion[] = [];
    let incomingExams: SavedExamDossier[] = [];
    let incomingMatrixFs: any = null;

    if (parsed.database && typeof parsed.database === 'object') {
      // Định dạng Full Backup
      if (Array.isArray(parsed.database.questions)) incomingQuestions = parsed.database.questions;
      if (Array.isArray(parsed.database.exams)) incomingExams = parsed.database.exams;
      if (parsed.database.matrixFileSystem) incomingMatrixFs = parsed.database.matrixFileSystem;
      if (Array.isArray(parsed.database.users) && mode === 'replace') {
        saveAllUsers(parsed.database.users);
      }
    } else if (Array.isArray(parsed.exams)) {
      // Định dạng Kho Đề Thi
      incomingExams = parsed.exams;
      if (Array.isArray(parsed.questions)) incomingQuestions = parsed.questions;
    } else if (Array.isArray(parsed.questions)) {
      // Định dạng Ngân hàng câu hỏi hoặc bài học lẻ
      const defaultGrade = parsed.info?.grade || '';
      const defaultLesson = parsed.info?.lesson || '';
      incomingQuestions = parsed.questions.map((q: any) => ({
        ...q,
        grade: q.grade || defaultGrade,
        lesson: q.lesson || defaultLesson
      }));
    } else {
      return {
        success: false,
        message: 'Tệp JSON không chứa dữ liệu Ngân hàng câu hỏi hoặc Ngân hàng đề thi hợp lệ.'
      };
    }

    // Xử lý lưu câu hỏi theo cơ chế Chống xung đột & Chống phình dữ liệu (Record-Level Upsert + ContentHash Deduplication)
    let finalQuestions = currentQuestions;
    let deduplicatedCount = 0;
    const currentUser = getCurrentUser();
    const userCanApprove = canApproveExam(currentUser);

    if (incomingQuestions.length > 0) {
      if (mode === 'replace' && userCanApprove) {
        finalQuestions = incomingQuestions.map(q => ({
          ...q,
          contentHash: q.contentHash || computeQuestionContentHash(q)
        }));
      } else {
        const existingById = new Map<string, ExerciseQuestion>();
        const existingByHash = new Map<string, string>(); // hash -> id

        currentQuestions.forEach(q => {
          const h = q.contentHash || computeQuestionContentHash(q);
          existingById.set(q.id, { ...q, contentHash: h });
          existingByHash.set(h, q.id);
        });

        incomingQuestions.forEach(q => {
          if (!q || !q.id || !q.content) return;
          const qHash = q.contentHash || computeQuestionContentHash(q);
          const existingSameId = existingById.get(q.id);
          const existingSameHashId = existingByHash.get(qHash);

          if (existingSameId) {
            // Bảo vệ câu hỏi thuộc Ngân hàng chuẩn dùng chung (shared): GV thường không được ghi đè trái phép
            const isProtectedShared = (existingSameId.bankScope || 'shared') === 'shared' && !userCanApprove;
            if (!isProtectedShared) {
              const incomingTime = q.updatedAt ? new Date(q.updatedAt).getTime() : Date.now();
              const existingTime = existingSameId.updatedAt ? new Date(existingSameId.updatedAt).getTime() : 0;
              if (incomingTime >= existingTime) {
                existingById.set(q.id, { ...existingSameId, ...q, contentHash: qHash });
                existingByHash.set(qHash, q.id);
              }
            }
          } else if (existingSameHashId) {
            // Đã tồn tại câu hỏi giống hệt nội dung -> Chống phình dữ liệu (không tạo bản ghi trùng)
            deduplicatedCount++;
            const target = existingById.get(existingSameHashId);
            if (target && target.bankScope !== 'shared' && q.bankScope === 'shared' && userCanApprove) {
              existingById.set(existingSameHashId, { ...target, bankScope: 'shared', approvedBy: q.approvedBy || currentUser.email });
            }
          } else {
            // Câu hỏi hoàn toàn mới: Nếu người nhập không có quyền duyệt thì mặc định vào 'personal' hoặc 'pending'
            const safeScope = userCanApprove
              ? (q.bankScope || 'shared')
              : (q.bankScope === 'pending' ? 'pending' : 'personal');
            existingById.set(q.id, {
              ...q,
              bankScope: safeScope,
              ownerEmail: q.ownerEmail || currentUser.email,
              ownerName: q.ownerName || currentUser.name,
              contentHash: qHash,
              updatedAt: q.updatedAt || new Date().toISOString()
            });
            existingByHash.set(qHash, q.id);
          }
        });

        finalQuestions = Array.from(existingById.values());
      }
      saveQuestionBank(finalQuestions, { force: true });
    }

    // Xử lý lưu đề thi
    let finalExams = currentExams;
    if (incomingExams.length > 0) {
      if (mode === 'replace') {
        finalExams = incomingExams;
      } else {
        const examMap = new Map<string, SavedExamDossier>();
        currentExams.forEach(e => examMap.set(e.id, e));
        incomingExams.forEach(e => {
          if (e && e.id && e.title) {
            examMap.set(e.id, e);
          }
        });
        finalExams = Array.from(examMap.values());
      }
      saveAllExams(finalExams);
    }

    // Xử lý lưu Ma trận nếu có
    if (incomingMatrixFs && typeof window !== 'undefined') {
      localStorage.setItem('matrixFileSystem', JSON.stringify(incomingMatrixFs));
      window.dispatchEvent(new Event('matrix_filesystem_updated'));
    }

    return {
      success: true,
      message: `Đã nạp thành công! Ngân hàng hiện có ${finalQuestions.length} câu hỏi và ${finalExams.length} đề thi.`,
      counts: {
        questions: finalQuestions.length,
        exams: finalExams.length
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi đọc tệp sao lưu JSON: ' + (err?.message || String(err))
    };
  }
};
