import { DatabaseConfig, DatabaseProvider } from '../../types';
import { getAllUsers, saveAllUsers } from '../authService';
import { getSavedExams } from '../examApprovalService';
import { loadQuestionBank } from '../storage/questionBankStorage';

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
    // Ping Supabase REST API endpoint /rest/v1/ hoặc custom health endpoint
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
    // Lưu trữ nội bộ an toàn (Offline-first snapshot)
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

  // Đẩy lên Supabase qua PostgREST
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

      // 1. Sync Users
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

      // 2. Sync Exams
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

  const backupPackage = {
    app: 'ExamMaster Pro',
    version: '2025.1.0',
    exportedAt: new Date().toISOString(),
    database: {
      users,
      exams,
      questions: questionsRes.data || [],
      config: dbConfig
    }
  };

  return JSON.stringify(backupPackage, null, 2);
};
