import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getCurrentUser, 
  setCurrentUser, 
  switchRole, 
  canApproveExam, 
  canSubmitExam, 
  DEFAULT_USERS,
  getRoleDisplayName
} from '../services/authService';
import { 
  saveExamDossier, 
  submitExamForReview, 
  approveExam, 
  rejectExam, 
  getSavedExams, 
  deleteExamDossier,
  getPendingReviewCount
} from '../services/examApprovalService';

describe('TASK: Phân Quyền (RBAC) & Quy Trình Duyệt Đề (Exam Approval Workflow)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Role-Based Access Control (RBAC)', () => {
    it('mặc định người dùng khởi tạo là Giáo viên', () => {
      const user = getCurrentUser();
      expect(user.role).toBe('teacher');
      expect(user.name).toContain('Nguyễn Văn An');
    });

    it('cho phép chuyển đổi giữa các vai trò (Teacher, Reviewer, Admin)', () => {
      const reviewer = switchRole('reviewer');
      expect(reviewer.role).toBe('reviewer');
      expect(getRoleDisplayName(reviewer.role)).toBe('Tổ trưởng chuyên môn');

      const admin = switchRole('admin');
      expect(admin.role).toBe('admin');
      expect(getRoleDisplayName(admin.role)).toBe('Quản trị viên');

      const teacher = switchRole('teacher');
      expect(teacher.role).toBe('teacher');
      expect(getRoleDisplayName(teacher.role)).toBe('Giáo viên bộ môn');
    });

    it('kiểm tra quyền phê duyệt đề thi chính xác theo vai trò', () => {
      const teacher = DEFAULT_USERS.teacher;
      const reviewer = DEFAULT_USERS.reviewer;
      const admin = DEFAULT_USERS.admin;

      // Giáo viên KHÔNG có quyền tự phê duyệt đề thi
      expect(canApproveExam(teacher)).toBe(false);

      // Tổ trưởng và Admin CÓ quyền phê duyệt đề thi
      expect(canApproveExam(reviewer)).toBe(true);
      expect(canApproveExam(admin)).toBe(true);

      // Mọi vai trò đều có thể soạn và nộp đề
      expect(canSubmitExam(teacher)).toBe(true);
      expect(canSubmitExam(reviewer)).toBe(true);
    });
  });

  describe('2. Quy trình Duyệt Đề (Exam Approval Workflow)', () => {
    it('cho phép lưu đề thi mới ở trạng thái Bản nháp (draft)', () => {
      switchRole('teacher');
      const dossier = saveExamDossier({
        title: 'Đề Kiểm Tra GK1 Tin Học 7',
        grade: '7',
        headerInfo: { tenKyThi: 'Kiểm tra GK1', monHoc: 'Tin học 7' }
      });

      expect(dossier.id).toBeDefined();
      expect(dossier.status).toBe('draft');
      expect(dossier.createdBy).toContain('Nguyễn Văn An');
      expect(dossier.auditLog.length).toBeGreaterThan(0);
      expect(dossier.auditLog[0].action).toBe('created');
    });

    it('giáo viên gửi đề thi lên tổ chuyên môn -> trạng thái chuyển sang Chờ phê duyệt (pending_review)', () => {
      const teacher = switchRole('teacher');
      const dossier = saveExamDossier({
        title: 'Đề Tin 7 Chờ Duyệt',
        grade: '7'
      });

      const submitted = submitExamForReview(
        dossier.id, 
        'Kính gửi Tổ trưởng duyệt đề thi giữa kì 1 khối 7.', 
        teacher
      );

      expect(submitted.status).toBe('pending_review');
      expect(submitted.submissionNotes).toContain('Kính gửi Tổ trưởng');
      expect(submitted.submittedAt).toBeDefined();

      // Kiểm tra lịch sử thao tác (Audit Log)
      const lastLog = submitted.auditLog[submitted.auditLog.length - 1];
      expect(lastLog.action).toBe('submitted');
      expect(lastLog.previousStatus).toBe('draft');
      expect(lastLog.newStatus).toBe('pending_review');
    });

    it('giáo viên không thể tự phê duyệt đề thi (sẽ bị chặn lỗi)', () => {
      const teacher = switchRole('teacher');
      const dossier = saveExamDossier({ title: 'Đề Test Không Có Quyền' });
      submitExamForReview(dossier.id, 'Gửi duyệt', teacher);

      expect(() => {
        approveExam(dossier.id, 'Tự duyệt', teacher);
      }).toThrow(/Chỉ Tổ trưởng chuyên môn hoặc Quản trị viên mới có quyền phê duyệt/);
    });

    it('tổ trưởng chuyên môn phê duyệt đề thi thành công (approved)', () => {
      const teacher = DEFAULT_USERS.teacher;
      const reviewer = switchRole('reviewer');

      const dossier = saveExamDossier({ title: 'Đề Thi Thử Nghiệm' });
      submitExamForReview(dossier.id, 'Gửi duyệt đề thi', teacher);

      const approved = approveExam(
        dossier.id, 
        'Đề thi đạt chuẩn chất lượng sư phạm GDPT 2018.', 
        reviewer
      );

      expect(approved.status).toBe('approved');
      expect(approved.reviewedBy).toBe(reviewer.name);
      expect(approved.reviewedAt).toBeDefined();
      expect(approved.reviewerNotes).toContain('Đề thi đạt chuẩn chất lượng');

      // Audit log ghi nhận hành động approved
      const lastLog = approved.auditLog[approved.auditLog.length - 1];
      expect(lastLog.action).toBe('approved');
      expect(lastLog.userRole).toBe('reviewer');
    });

    it('tổ trưởng từ chối và yêu cầu chỉnh sửa đề thi (rejected)', () => {
      const teacher = DEFAULT_USERS.teacher;
      const reviewer = switchRole('reviewer');

      const dossier = saveExamDossier({ title: 'Đề Thi Cần Sửa' });
      submitExamForReview(dossier.id, 'Nộp đề', teacher);

      const rejected = rejectExam(
        dossier.id, 
        'Câu số 12 mức VDC cần thay thế bằng câu hỏi thực tế hơn.', 
        reviewer
      );

      expect(rejected.status).toBe('rejected');
      expect(rejected.reviewerNotes).toContain('Câu số 12 mức VDC');

      // Audit log ghi nhận hành động rejected
      const lastLog = rejected.auditLog[rejected.auditLog.length - 1];
      expect(lastLog.action).toBe('rejected');
    });

    it('xóa hồ sơ đề thi an toàn khỏi kho lưu trữ', () => {
      const dossier = saveExamDossier({ title: 'Đề Chuẩn Bị Xóa' });
      const beforeCount = getSavedExams().length;
      
      const success = deleteExamDossier(dossier.id);
      expect(success).toBe(true);
      expect(getSavedExams().length).toBe(beforeCount - 1);
    });
  });
});
