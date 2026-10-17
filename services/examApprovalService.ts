import { SavedExamDossier, ExamApprovalStatus, ExamAuditEntry, UserProfile, UserRole } from '../types';
import { getCurrentUser } from './authService';

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
 * Danh sách đề thi mẫu ban đầu nhằm tạo môi trường trực quan cho quy trình duyệt đề
 */
const INITIAL_SAMPLE_EXAMS: SavedExamDossier[] = [
  {
    id: 'exam_gk1_tin7_demo',
    title: 'GK1 TIN 7-26-27 - ĐỀ CHUẨN GDPT 2018',
    grade: '7',
    status: 'approved',
    createdAt: '2026-10-15T08:30:00.000Z',
    updatedAt: '2026-10-15T10:15:00.000Z',
    createdBy: 'ThS. Nguyễn Văn An',
    creatorRole: 'teacher',
    submittedAt: '2026-10-15T09:00:00.000Z',
    submissionNotes: 'Kính gửi Tổ trưởng chuyên môn thẩm định đề kiểm tra GK1 Tin học 7. Ma trận và câu hỏi đã chuẩn hóa theo tỉ lệ 4:3:2:1.',
    reviewedBy: 'Cô Trần Thị Mai',
    reviewedAt: '2026-10-15T10:15:00.000Z',
    reviewerNotes: 'Đề thi đạt chuẩn chất lượng sư phạm. Các câu hỏi bám sát chuẩn kiến thức kĩ năng GDPT 2018. Đồng ý phê duyệt tổ chức in sao.',
    aiReviewScore: 92,
    aiReviewSummary: 'Đề thi chuẩn hóa rất tốt, phân loại học sinh rõ rệt, không trùng lặp.',
    auditLog: [
      {
        id: 'log_1',
        timestamp: '2026-10-15T08:30:00.000Z',
        userId: 'user_gv_01',
        userName: 'ThS. Nguyễn Văn An',
        userRole: 'teacher',
        action: 'created',
        comment: 'Khởi tạo bản nháp đề thi'
      },
      {
        id: 'log_2',
        timestamp: '2026-10-15T09:00:00.000Z',
        userId: 'user_gv_01',
        userName: 'ThS. Nguyễn Văn An',
        userRole: 'teacher',
        action: 'submitted',
        comment: 'Gửi tổ chuyên môn phê duyệt',
        previousStatus: 'draft',
        newStatus: 'pending_review'
      },
      {
        id: 'log_3',
        timestamp: '2026-10-15T10:15:00.000Z',
        userId: 'user_tt_01',
        userName: 'Cô Trần Thị Mai',
        userRole: 'reviewer',
        action: 'approved',
        comment: 'Phê duyệt đề thi chính thức',
        previousStatus: 'pending_review',
        newStatus: 'approved'
      }
    ],
    headerInfo: {
      donVi: 'UBND QUẬN HẢI CHÂU',
      tenTruong: 'THCS LÊ HỒNG PHONG',
      tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
      monHoc: 'MÔN: TIN HỌC – LỚP 7',
      thoiGian: '45 phút (không kể thời gian giao đề)',
      maDe: '101'
    },
    teacherName: 'ThS. Nguyễn Văn An',
    questions: []
  },
  {
    id: 'exam_gk1_tin6_pending',
    title: 'GK1 TIN 6-26-27 - ĐỀ XUẤT TỔ TRƯỞNG DUYỆT',
    grade: '6',
    status: 'pending_review',
    createdAt: '2026-10-16T14:20:00.000Z',
    updatedAt: '2026-10-16T14:35:00.000Z',
    createdBy: 'ThS. Nguyễn Văn An',
    creatorRole: 'teacher',
    submittedAt: '2026-10-16T14:35:00.000Z',
    submissionNotes: 'Kính gửi Tổ trưởng duyệt đề GK1 Tin học 6, cấu trúc gồm 16 câu trắc nghiệm và 2 câu tự luận kèm thang điểm chi tiết.',
    aiReviewScore: 88,
    aiReviewSummary: 'Đề thi cân đối, cần lưu ý câu tự luận về mạng máy tính để barem điểm rõ ràng hơn.',
    auditLog: [
      {
        id: 'log_p1',
        timestamp: '2026-10-16T14:20:00.000Z',
        userId: 'user_gv_01',
        userName: 'ThS. Nguyễn Văn An',
        userRole: 'teacher',
        action: 'created',
        comment: 'Biên soạn đề thi hoàn tất'
      },
      {
        id: 'log_p2',
        timestamp: '2026-10-16T14:35:00.000Z',
        userId: 'user_gv_01',
        userName: 'ThS. Nguyễn Văn An',
        userRole: 'teacher',
        action: 'submitted',
        comment: 'Nộp đề chờ tổ trưởng phê duyệt',
        previousStatus: 'draft',
        newStatus: 'pending_review'
      }
    ],
    headerInfo: {
      donVi: 'UBND QUẬN HẢI CHÂU',
      tenTruong: 'THCS LÊ HỒNG PHONG',
      tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
      monHoc: 'MÔN: TIN HỌC – LỚP 6',
      thoiGian: '45 phút (không kể thời gian giao đề)',
      maDe: '101'
    },
    teacherName: 'ThS. Nguyễn Văn An',
    questions: []
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

export const getExamById = (id: string): SavedExamDossier | undefined => {
  const exams = getSavedExams();
  return exams.find(e => e.id === id);
};

export const saveExamDossier = (dossierData: Partial<SavedExamDossier>): SavedExamDossier => {
  const exams = getSavedExams();
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  let target: SavedExamDossier;
  const existingIdx = exams.findIndex(e => e.id === dossierData.id);

  if (existingIdx >= 0) {
    // Update existing
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
    // Create new
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

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }
  notifyListeners();
  return target;
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

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }
  notifyListeners();
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

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }
  notifyListeners();
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

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }
  notifyListeners();
  return exam;
};

export const deleteExamDossier = (examId: string): boolean => {
  const exams = getSavedExams();
  const filtered = exams.filter(e => e.id !== examId);
  if (filtered.length === exams.length) return false;

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(filtered));
  }
  notifyListeners();
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
        label: 'Đã Phê Duyệt',
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300'
      };
    case 'pending_review':
      return {
        label: 'Chờ Phê Duyệt',
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300'
      };
    case 'rejected':
      return {
        label: 'Yêu Cầu Chỉnh Sửa',
        bg: 'bg-rose-100',
        text: 'text-rose-800',
        border: 'border-rose-300'
      };
    case 'draft':
    default:
      return {
        label: 'Bản Nháp',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300'
      };
  }
};
