import { describe, it, expect, beforeEach } from 'vitest';
import { 
  loginWithGmail, 
  getAllUsers, 
  saveAllUsers, 
  getCurrentUser, 
  updateUserRole, 
  updateUserProfile, 
  preAuthorizeGmailUser, 
  deleteUserById, 
  logoutUser, 
  DEFAULT_USERS 
} from '../services/authService';
import { 
  getDatabaseConfig, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  syncAllDataToCloud, 
  exportFullDatabaseJson, 
  DEFAULT_DB_CONFIG 
} from '../services/database/dbService';

describe('Gmail Authentication & Role Management', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset initial user list
    saveAllUsers(Object.values(DEFAULT_USERS));
  });

  it('tự động tạo tài khoản mới với vai trò giáo viên (teacher) khi Gmail đăng nhập lần đầu', () => {
    const user = loginWithGmail('giaovien.moi@gmail.com', 'Cô Lê Thu Hà');
    expect(user).toBeDefined();
    expect(user.email).toBe('giaovien.moi@gmail.com');
    expect(user.name).toBe('Cô Lê Thu Hà');
    expect(user.role).toBe('teacher');
    expect(user.provider).toBe('google');
    expect(user.status).toBe('active');

    // Kiểm tra đã được lưu vào danh sách tất cả users
    const allUsers = getAllUsers();
    const found = allUsers.find(u => u.email === 'giaovien.moi@gmail.com');
    expect(found).toBeDefined();
    expect(found?.role).toBe('teacher');
  });

  it('giữ nguyên phân quyền đã cấp khi Gmail đã có trong hệ thống đăng nhập lại', () => {
    // 1. Tạo user với vai trò reviewer
    const preUser = preAuthorizeGmailUser('totruong.hoa@gmail.com', 'reviewer', 'Thầy Vũ Đình Trọng');
    expect(preUser.role).toBe('reviewer');

    // 2. Người đó bấm Đăng nhập bằng Gmail
    const loggedIn = loginWithGmail('totruong.hoa@gmail.com');
    expect(loggedIn.role).toBe('reviewer');
    expect(loggedIn.email).toBe('totruong.hoa@gmail.com');
  });

  it('cho phép Quản trị viên (Admin) thay đổi vai trò và phân quyền cho người dùng', () => {
    // Tạo user ban đầu là teacher
    const user = loginWithGmail('giaovien.test@gmail.com', 'Thầy Nguyễn Văn B');
    expect(user.role).toBe('teacher');

    // Quản trị viên thăng cấp thành reviewer (Tổ trưởng thẩm định đề)
    const updated = updateUserRole(user.id, 'reviewer');
    expect(updated.role).toBe('reviewer');

    // Kiểm tra trong danh sách tổng hợp
    const reloaded = getAllUsers().find(u => u.id === user.id);
    expect(reloaded?.role).toBe('reviewer');

    // Quản trị viên thăng cấp tiếp thành admin
    const adminUser = updateUserRole(user.id, 'admin');
    expect(adminUser.role).toBe('admin');
  });

  it('hỗ trợ Quản trị viên phân quyền trước (Pre-authorize) cho Gmail trước khi giáo viên đăng nhập', () => {
    const preAuth = preAuthorizeGmailUser(
      'chuyengia.toan@gmail.com', 
      'reviewer', 
      'Chuyên gia Toán học', 
      'Tổ Toán - Tin', 
      'Trường THPT Chuyên'
    );

    expect(preAuth.email).toBe('chuyengia.toan@gmail.com');
    expect(preAuth.role).toBe('reviewer');
    expect(preAuth.department).toBe('Tổ Toán - Tin');

    // Khi giáo viên đó đăng nhập
    const loggedIn = loginWithGmail('chuyengia.toan@gmail.com');
    expect(loggedIn.role).toBe('reviewer');
    expect(loggedIn.department).toBe('Tổ Toán - Tin');
  });

  it('cho phép chỉnh sửa hồ sơ và xóa tài khoản', () => {
    const user = loginWithGmail('nguoidung.xoa@gmail.com', 'Tài khoản thử nghiệm');
    expect(getAllUsers().some(u => u.id === user.id)).toBe(true);

    // Cập nhật trường học
    updateUserProfile(user.id, { school: 'THCS Chu Văn An' });
    expect(getAllUsers().find(u => u.id === user.id)?.school).toBe('THCS Chu Văn An');

    // Xóa
    const deleted = deleteUserById(user.id);
    expect(deleted).toBe(true);
    expect(getAllUsers().some(u => u.id === user.id)).toBe(false);
  });
});

describe('Database Architecture & Cloud Sync Services', () => {
  beforeEach(() => {
    localStorage.clear();
    saveAllUsers(Object.values(DEFAULT_USERS));
  });

  it('lưu trữ và truy xuất cấu hình cơ sở dữ liệu (DatabaseConfig)', () => {
    const initialConfig = getDatabaseConfig();
    expect(initialConfig.provider).toBe('local');

    saveDatabaseConfig({
      provider: 'supabase',
      endpointUrl: 'https://testproject.supabase.co',
      apiKey: 'sb-anon-key-12345',
      enableAutoSync: true
    });

    const updatedConfig = getDatabaseConfig();
    expect(updatedConfig.provider).toBe('supabase');
    expect(updatedConfig.endpointUrl).toBe('https://testproject.supabase.co');
    expect(updatedConfig.apiKey).toBe('sb-anon-key-12345');
    expect(updatedConfig.enableAutoSync).toBe(true);
  });

  it('kiểm tra kết nối phát hiện URL rỗng', async () => {
    const res = await testDatabaseConnection('', '');
    expect(res.success).toBe(false);
    expect(res.message).toContain('đang để trống');
  });

  it('thực hiện đồng bộ dữ liệu nội bộ (Offline-first snapshot) thành công', async () => {
    const result = await syncAllDataToCloud();
    expect(result.success).toBe(true);
    expect(result.counts).toBeDefined();
    expect(result.counts.users).toBeGreaterThan(0);

    const config = getDatabaseConfig();
    expect(config.syncStatus).toBe('synced');
    expect(config.lastSyncAt).toBeDefined();
  });

  it('xuất toàn diện gói sao lưu CSDL chuẩn JSON (Full Database Export)', () => {
    const backupJson = exportFullDatabaseJson();
    expect(typeof backupJson).toBe('string');

    const parsed = JSON.parse(backupJson);
    expect(parsed.app).toBe('ExamMaster Pro');
    expect(parsed.database).toBeDefined();
    expect(Array.isArray(parsed.database.users)).toBe(true);
    expect(Array.isArray(parsed.database.exams)).toBe(true);
    expect(Array.isArray(parsed.database.questions)).toBe(true);
    expect(parsed.database.users.length).toBeGreaterThan(0);
  });
});
