import { SavedExamDossier, ExamApprovalStatus, ExamAuditEntry, UserProfile } from '../types';
import { getCurrentUser } from './authService';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';

const EXAMS_STORAGE_KEY = 'matrandethi_saved_exams';

type ExamChangeListener = () => void;
const listeners: Set<ExamChangeListener> = new Set();

const notifyListeners = () => {
  listeners.forEach(cb => {
    try { cb(); } catch (e) { console.error(e); }
  });
};

export const subscribeExamChange = (callback: ExamChangeListener): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Danh sách đề thi mẫu ban đầu có sẵn câu hỏi thực tế để giáo viên có thể mở xem ngay
 */
const INITIAL_SAMPLE_EXAMS: SavedExamDossier[] = [
  {
    id: 'exam_gk1_tin6_demo',
    title: 'GK1 TIN 6-26-27 - ĐỀ MẪU CHUẨN GDPT 2018',
    grade: '6',
    status: 'approved',
    createdAt: '2026-10-15T08:30:00.000Z',
    updatedAt: '2026-10-15T10:15:00.000Z',
    createdBy: 'ThS. Nguyễn Văn An',
    creatorRole: 'teacher',
    submittedAt: '2026-10-15T09:00:00.000Z',
    submissionNotes: 'Đề kiểm tra Giữa kì I Tin học 6 chuẩn cấu trúc GDPT 2018.',
    reviewedBy: 'Cô Trần Thị Mai',
    reviewedAt: '2026-10-15T10:15:00.000Z',
    reviewerNotes: 'Đề thi đạt chuẩn chất lượng sư phạm GDPT 2018.',
    aiReviewScore: 95,
    aiReviewSummary: 'Đề thi chuẩn hóa tốt, phân loại học sinh rõ rệt.',
    auditLog: [
      {
        id: 'log_1',
        timestamp: '2026-10-15T08:30:00.000Z',
        userId: 'user_gv_01',
        userName: 'ThS. Nguyễn Văn An',
        userRole: 'teacher',
        action: 'created',
        comment: 'Khởi tạo đề thi mẫu'
      }
    ],
    headerInfo: {
      donVi: 'UBND QUẬN HẢI CHÂU',
      tenTruong: 'LÊ HỒNG PHONG',
      tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
      monHoc: 'MÔN: TIN HỌC – LỚP 6',
      thoiGian: '45 phút (không kể thời gian giao đề)',
      maDe: '101'
    },
    teacherName: 'ThS. Nguyễn Văn An',
    questions: SAMPLE_QUESTIONS.map((q, idx) => ({
      ...q,
      grade: q.grade || '6',
      lesson: q.lesson || 'Bài 1: Thông tin và dữ liệu',
      points: q.category === 'essay' ? 1.0 : 0.25,
      uniqueId: idx + 1
    }))
  }
];

export const getSavedExams = (): SavedExamDossier[] => {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_EXAMS;
  try {
    const raw = localStorage.getItem(EXAMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_EXAMS));
      return INITIAL_SAMPLE_EXAMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('[examApprovalService] Error reading saved exams:', err);
  }
  return INITIAL_SAMPLE_EXAMS;
};

export const saveAllExams = (exams: SavedExamDossier[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }
  notifyListeners();
};

export const getExamById = (id: string): SavedExamDossier | undefined => {
  const exams = getSavedExams();
  return exams.find(e => e.id === id);
};

export const saveExamDossier = (dossierData: Partial<SavedExamDossier>): SavedExamDossier => {
  const exams = getSavedExams();
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  let target: SavedExamDossier;
  const existingIdx = dossierData.id ? exams.findIndex(e => e.id === dossierData.id) : -1;

  if (existingIdx >= 0) {
    const existing = exams[existingIdx];
    const updateLog: ExamAuditEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'updated',
      comment: 'Cập nhật nội dung câu hỏi hoặc thông số đề thi'
    };

    target = {
      ...existing,
      ...dossierData,
      updatedAt: now,
      auditLog: [...(existing.auditLog || []), updateLog]
    } as SavedExamDossier;

    exams[existingIdx] = target;
  } else {
    const id = dossierData.id || ('exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const createLog: ExamAuditEntry = {
      id: 'log_' + Date.now(),
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'created',
      comment: 'Khởi tạo đề thi mới'
    };

    target = {
      id,
      title: dossierData.title || `ĐỀ THI TIN HỌC - ${new Date().toLocaleDateString('vi-VN')}`,
      grade: dossierData.grade || '7',
      status: dossierData.status || 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.name,
      creatorRole: currentUser.role,
      auditLog: [createLog],
      questions: dossierData.questions || [],
      variants: dossierData.variants || [],
      matrixData: dossierData.matrixData || null,
      headerInfo: dossierData.headerInfo || {},
      teacherName: dossierData.teacherName || currentUser.name,
      ...dossierData
    } as SavedExamDossier;

    exams.unshift(target);
  }

  saveAllExams(exams);
  return target;
};

/**
 * Nhân bản một đề thi trong Ngân hàng Đề thi để tạo đề mới nhanh chóng
 */
export const duplicateExamDossier = (examId: string): SavedExamDossier | null => {
  const existing = getExamById(examId);
  if (!existing) return null;

  const cloned = JSON.parse(JSON.stringify(existing)) as SavedExamDossier;
  return saveExamDossier({
    ...cloned,
    id: undefined,
    title: `${existing.title} (Bản sao)`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

/**
 * Xuất toàn bộ Ngân hàng Đề thi (hoặc 1 đề thi) ra chuỗi JSON chuẩn
 */
export const exportExamBankJson = (singleExamId?: string): string => {
  const allExams = getSavedExams();
  const examsToExport = singleExamId
    ? allExams.filter(e => e.id === singleExamId)
    : allExams;

  return JSON.stringify(
    {
      format: 'matrandethi-exam-bank',
      version: 1,
      exportedAt: new Date().toISOString(),
      examCount: examsToExport.length,
      exams: examsToExport
    },
    null,
    2
  );
};

/**
 * Nhập file JSON Ngân hàng Đề thi (gộp thông minh không mất đề cũ)
 */
export const importExamBankJson = (
  jsonString: string
): { success: boolean; addedCount: number; updatedCount: number; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    let incoming: SavedExamDossier[] = [];

    if (Array.isArray(parsed)) {
      incoming = parsed;
    } else if (parsed && Array.isArray(parsed.exams)) {
      incoming = parsed.exams;
    } else if (parsed && parsed.database && Array.isArray(parsed.database.exams)) {
      incoming = parsed.database.exams;
    } else if (parsed && parsed.id && parsed.title && Array.isArray(parsed.questions)) {
      incoming = [parsed];
    } else {
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        error: 'Tệp JSON không đúng định dạng Ngân hàng Đề thi.'
      };
    }

    const currentExams = getSavedExams();
    const map = new Map<string, SavedExamDossier>();
    currentExams.forEach(e => map.set(e.id, e));

    let addedCount = 0;
    let updatedCount = 0;

    incoming.forEach(item => {
      if (!item || !item.title) return;
      const id = item.id || ('exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
      const normalized: SavedExamDossier = {
        ...item,
        id,
        grade: item.grade || '7',
        status: item.status || 'draft',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: item.createdBy || 'Giáo viên',
        creatorRole: item.creatorRole || 'teacher',
        auditLog: Array.isArray(item.auditLog) ? item.auditLog : [],
        questions: Array.isArray(item.questions) ? item.questions : [],
        headerInfo: item.headerInfo || {}
      };

      if (map.has(id)) {
        updatedCount++;
      } else {
        addedCount++;
      }
      map.set(id, normalized);
    });

    saveAllExams(Array.from(map.values()));
    return { success: true, addedCount, updatedCount };
  } catch (err: any) {
    return {
      success: false,
      addedCount: 0,
      updatedCount: 0,
      error: 'Lỗi đọc tệp JSON: ' + (err?.message || String(err))
    };
  }
};

export const submitExamForReview = (
  examId: string, 
  submissionNotes: string, 
  user: UserProfile = getCurrentUser()
): SavedExamDossier => {
  const exams = getSavedExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) throw new Error('Không tìm thấy đề thi với mã: ' + examId);

  const now = new Date().toISOString();
  const entry: ExamAuditEntry = {
    id: 'log_' + Date.now(),
    timestamp: now,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'submitted',
    comment: submissionNotes || 'Gửi phê duyệt đề thi',
    previousStatus: exam.status,
    newStatus: 'pending_review'
  };

  exam.status = 'pending_review';
  exam.submittedAt = now;
  exam.submissionNotes = submissionNotes;
  exam.updatedAt = now;
  exam.auditLog = [...(exam.auditLog || []), entry];

  saveAllExams(exams);
  return exam;
};

export const approveExam = (
  examId: string, 
  reviewerNotes: string, 
  user: UserProfile = getCurrentUser()
): SavedExamDossier => {
  if (user.role !== 'admin' && user.role !== 'reviewer') {
    throw new Error('Chỉ Tổ trưởng chuyên môn hoặc Quản trị viên mới có quyền phê duyệt đề thi.');
  }

  const exams = getSavedExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) throw new Error('Không tìm thấy đề thi với mã: ' + examId);

  const now = new Date().toISOString();
  const entry: ExamAuditEntry = {
    id: 'log_' + Date.now(),
    timestamp: now,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'approved',
    comment: reviewerNotes || 'Phê duyệt đề thi đạt chuẩn',
    previousStatus: exam.status,
    newStatus: 'approved'
  };

  exam.status = 'approved';
  exam.reviewedBy = user.name;
  exam.reviewedAt = now;
  exam.reviewerNotes = reviewerNotes || 'Đề thi đã được thẩm định đạt chuẩn chất lượng sư phạm GDPT 2018.';
  exam.updatedAt = now;
  exam.auditLog = [...(exam.auditLog || []), entry];

  saveAllExams(exams);
  return exam;
};

export const rejectExam = (
  examId: string, 
  feedbackNotes: string, 
  user: UserProfile = getCurrentUser()
): SavedExamDossier => {
  if (user.role !== 'admin' && user.role !== 'reviewer') {
    throw new Error('Chỉ Tổ trưởng chuyên môn hoặc Quản trị viên mới có quyền yêu cầu chỉnh sửa đề thi.');
  }

  const exams = getSavedExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) throw new Error('Không tìm thấy đề thi với mã: ' + examId);

  const now = new Date().toISOString();
  const entry: ExamAuditEntry = {
    id: 'log_' + Date.now(),
    timestamp: now,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'rejected',
    comment: feedbackNotes || 'Yêu cầu chỉnh sửa đề thi',
    previousStatus: exam.status,
    newStatus: 'rejected'
  };

  exam.status = 'rejected';
  exam.reviewedBy = user.name;
  exam.reviewedAt = now;
  exam.reviewerNotes = feedbackNotes;
  exam.updatedAt = now;
  exam.auditLog = [...(exam.auditLog || []), entry];

  saveAllExams(exams);
  return exam;
};

export const deleteExamDossier = (examId: string): boolean => {
  const exams = getSavedExams();
  const filtered = exams.filter(e => e.id !== examId);
  if (filtered.length === exams.length) return false;

  saveAllExams(filtered);
  return true;
};

export const getPendingReviewCount = (): number => {
  const exams = getSavedExams();
  return exams.filter(e => e.status === 'pending_review').length;
};

export const getStatusBadgeInfo = (status: ExamApprovalStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
} => {
  switch (status) {
    case 'approved':
      return {
        label: 'Chính thức',
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300'
      };
    case 'pending_review':
      return {
        label: 'Chờ duyệt',
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300'
      };
    case 'rejected':
      return {
        label: 'Cần chỉnh sửa',
        bg: 'bg-rose-100',
        text: 'text-rose-800',
        border: 'border-rose-300'
      };
    case 'draft':
    default:
      return {
        label: 'Đã lưu',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200'
      };
  }
};
