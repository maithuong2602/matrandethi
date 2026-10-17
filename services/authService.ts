import { UserRole, UserProfile } from '../types';

export const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  teacher: {
    id: 'user_gv_01',
    name: 'ThS. Nguyễn Văn An',
    role: 'teacher',
    department: 'Tổ Tin học - Công nghệ',
    school: 'THCS Lê Hồng Phong',
    email: 'nvan.gv@school.edu.vn',
    provider: 'local',
    status: 'active'
  },
  reviewer: {
    id: 'user_tt_01',
    name: 'Cô Trần Thị Mai',
    role: 'reviewer',
    department: 'Tổ trưởng Chuyên môn Tin học',
    school: 'THCS Lê Hồng Phong',
    email: 'ttmai.totruong@school.edu.vn',
    provider: 'local',
    status: 'active'
  },
  admin: {
    id: 'user_admin_01',
    name: 'Thầy Lê Hoàng Phúc',
    role: 'admin',
    department: 'Ban Giám Hiệu & Quản Trị Hệ Thống',
    school: 'Phòng GD&ĐT Hải Châu',
    email: 'lhphuc.admin@haichau.edu.vn',
    provider: 'local',
    status: 'active'
  }
};

const USER_STORAGE_KEY = 'matrandethi_current_user';
const ALL_USERS_STORAGE_KEY = 'matrandethi_all_users';

type UserChangeListener = (user: UserProfile) => void;
const listeners: Set<UserChangeListener> = new Set();

/**
 * Lấy danh sách tất cả người dùng trong hệ thống (phục vụ Admin quản lý & phân quyền)
 */
export const getAllUsers = (): UserProfile[] => {
  if (typeof window === 'undefined') return Object.values(DEFAULT_USERS);
  try {
    const raw = localStorage.getItem(ALL_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Khởi tạo danh sách mặc định nếu chưa có
    const initialList = Object.values(DEFAULT_USERS);
    localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(initialList));
    return initialList;
  } catch (e) {
    console.error('[authService] Lỗi đọc danh sách users:', e);
    return Object.values(DEFAULT_USERS);
  }
};

/**
 * Lưu danh sách người dùng
 */
export const saveAllUsers = (users: UserProfile[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(users));
  }
};

export const getCurrentUser = (): UserProfile => {
  if (typeof window === 'undefined') return DEFAULT_USERS.teacher;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[authService] Error parsing user from storage:', e);
  }
  return DEFAULT_USERS.teacher;
};

export const setCurrentUser = (user: UserProfile): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    try {
      localStorage.setItem('teacherName', user.name);
    } catch {}
  }
  listeners.forEach(cb => cb(user));
};

export const switchRole = (role: UserRole): UserProfile => {
  const allUsers = getAllUsers();
  const matchedUser = allUsers.find(u => u.role === role);
  const target = matchedUser || DEFAULT_USERS[role];
  setCurrentUser(target);
  return target;
};

export const subscribeUserChange = (callback: UserChangeListener): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * ĐĂNG NHẬP BẰNG GMAIL / GOOGLE OAUTH
 * Tự động tìm kiếm tài khoản theo Gmail. Nếu chưa có -> tạo mới với quyền mặc định (Teacher)
 * hoặc áp dụng phân quyền do Quản trị viên đã thiết lập trước.
 */
export const loginWithGmail = (
  email: string, 
  name?: string, 
  avatar?: string
): UserProfile => {
  const normalizedEmail = email.trim().toLowerCase();
  const allUsers = getAllUsers();
  const existingUserIndex = allUsers.findIndex(u => (u.email || '').toLowerCase() === normalizedEmail);

  let loggedInUser: UserProfile;
  const now = new Date().toISOString();

  if (existingUserIndex >= 0) {
    // Tài khoản đã có trong hệ thống (giữ nguyên phân quyền đã được cấp)
    const existing = allUsers[existingUserIndex];
    loggedInUser = {
      ...existing,
      name: name && name.trim() ? name.trim() : existing.name,
      avatar: avatar || existing.avatar,
      provider: 'google',
      lastLoginAt: now
    };
    allUsers[existingUserIndex] = loggedInUser;
  } else {
    // Tài khoản Gmail mới lần đầu đăng nhập
    const displayName = name && name.trim() ? name.trim() : normalizedEmail.split('@')[0];
    loggedInUser = {
      id: `user_google_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: displayName,
      email: normalizedEmail,
      role: 'teacher', // Mặc định là Giáo viên bộ môn
      department: 'Tổ Tin học - Công nghệ',
      school: 'THCS Lê Hồng Phong',
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      provider: 'google',
      createdAt: now,
      lastLoginAt: now,
      status: 'active'
    };
    allUsers.push(loggedInUser);
  }

  saveAllUsers(allUsers);
  setCurrentUser(loggedInUser);
  return loggedInUser;
};

/**
 * Đăng xuất
 */
export const logoutUser = (): void => {
  const defaultTeacher = DEFAULT_USERS.teacher;
  setCurrentUser(defaultTeacher);
};

/**
 * PHÂN QUYỀN CHO NGƯỜI DÙNG (ADMIN ONLY)
 * Quản trị viên thay đổi vai trò: 'admin' | 'reviewer' | 'teacher'
 */
export const updateUserRole = (userId: string, newRole: UserRole): UserProfile => {
  const allUsers = getAllUsers();
  const user = allUsers.find(u => u.id === userId);
  if (!user) throw new Error('Không tìm thấy người dùng với mã: ' + userId);

  user.role = newRole;
  saveAllUsers(allUsers);

  // Nếu người dùng đang là người dùng hiện tại -> cập nhật ngay
  const current = getCurrentUser();
  if (current.id === userId) {
    setCurrentUser({ ...current, role: newRole });
  }

  return user;
};

/**
 * CẬP NHẬT THÔNG TIN HỒ SƠ NGƯỜI DÙNG (Tổ bộ môn, Trường, Tên, Trạng thái)
 */
export const updateUserProfile = (userId: string, updates: Partial<UserProfile>): UserProfile => {
  const allUsers = getAllUsers();
  const user = allUsers.find(u => u.id === userId);
  if (!user) throw new Error('Không tìm thấy người dùng với mã: ' + userId);

  Object.assign(user, updates);
  saveAllUsers(allUsers);

  const current = getCurrentUser();
  if (current.id === userId) {
    setCurrentUser({ ...current, ...updates });
  }

  return user;
};

/**
 * PHÂN QUYỀN TRƯỚC THEO GMAIL (PRE-AUTHORIZE / INVITE)
 * Admin có thể gán trước vai trò (Tổ trưởng / Giáo viên / Quản trị viên) cho 1 Gmail
 * để ngay khi người đó đăng nhập bằng Gmail sẽ nhận đúng quyền được giao.
 */
export const preAuthorizeGmailUser = (
  email: string, 
  role: UserRole, 
  name?: string, 
  department?: string, 
  school?: string
): UserProfile => {
  const normalizedEmail = email.trim().toLowerCase();
  const allUsers = getAllUsers();
  const existing = allUsers.find(u => (u.email || '').toLowerCase() === normalizedEmail);

  if (existing) {
    existing.role = role;
    if (name) existing.name = name;
    if (department) existing.department = department;
    if (school) existing.school = school;
    saveAllUsers(allUsers);
    return existing;
  }

  const newUser: UserProfile = {
    id: `preauth_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name && name.trim() ? name.trim() : normalizedEmail.split('@')[0],
    email: normalizedEmail,
    role: role,
    department: department || 'Tổ Tin học - Công nghệ',
    school: school || 'THCS Lê Hồng Phong',
    provider: 'google',
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  allUsers.push(newUser);
  saveAllUsers(allUsers);
  return newUser;
};

/**
 * Xóa người dùng (Admin only)
 */
export const deleteUserById = (userId: string): boolean => {
  const allUsers = getAllUsers();
  const filtered = allUsers.filter(u => u.id !== userId);
  if (filtered.length === allUsers.length) return false;
  saveAllUsers(filtered);
  return true;
};

export const canApproveExam = (user: UserProfile = getCurrentUser()): boolean => {
  return user.role === 'admin' || user.role === 'reviewer';
};

export const canSubmitExam = (user: UserProfile = getCurrentUser()): boolean => {
  return true;
};

export const canManageSystem = (user: UserProfile = getCurrentUser()): boolean => {
  return user.role === 'admin';
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Quản trị viên';
    case 'reviewer':
      return 'Tổ trưởng chuyên môn';
    case 'teacher':
      return 'Giáo viên bộ môn';
    default:
      return 'Người dùng';
  }
};

export const getRoleBadgeColor = (role: UserRole): { bg: string; text: string; border: string; dot: string } => {
  switch (role) {
    case 'admin':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-600'
      };
    case 'reviewer':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-600'
      };
    case 'teacher':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-600'
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        dot: 'bg-gray-500'
      };
  }
};
