import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Check, X, Search, Mail, 
  School, Building2, Trash2, Edit3, Award, Info, 
  CheckCircle2, AlertTriangle, ExternalLink 
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { 
  getAllUsers, 
  updateUserRole, 
  updateUserProfile, 
  preAuthorizeGmailUser, 
  deleteUserById, 
  getCurrentUser, 
  getRoleDisplayName, 
  getRoleBadgeColor 
} from '../services/authService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>(getAllUsers());
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'guide'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const currentUser = getCurrentUser();

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  const [newDepartment, setNewDepartment] = useState('Tổ Tin học - Công nghệ');
  const [newSchool, setNewSchool] = useState('THCS Lê Hồng Phong');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const refreshList = () => {
    setUsers(getAllUsers());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setActionSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    try {
      updateUserRole(userId, newRole);
      refreshList();
      setActionSuccessMsg(`Đã cập nhật vai trò người dùng thành "${getRoleDisplayName(newRole)}" thành công!`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật quyền.');
    }
  };

  const handlePreAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      alert('Vui lòng nhập đúng định dạng địa chỉ Gmail (ví dụ: giaovien@gmail.com).');
      return;
    }

    try {
      preAuthorizeGmailUser(newEmail, newRole, newName, newDepartment, newSchool);
      refreshList();
      setNewEmail('');
      setNewName('');
      setActionSuccessMsg(`Đã thêm và phân quyền trước cho tài khoản "${newEmail}" với vai trò ${getRoleDisplayName(newRole)}!`);
      setActiveTab('list');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi thêm người dùng.');
    }
  };

  const handleDeleteUser = (userId: string, email?: string) => {
    if (userId === currentUser.id) {
      alert('Không thể xóa tài khoản bạn đang đăng nhập.');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${email || userId}" khỏi hệ thống?`)) {
      deleteUserById(userId);
      refreshList();
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-gray-100">
        {/* Modal Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-primary" size={24} /> Quản Lý & Phân Quyền Người Dùng
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Phân quyền tài khoản Gmail, bổ nhiệm Tổ trưởng chuyên môn và quản lý thành viên nhà trường
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 border-b bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'list' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users size={14} /> Danh Sách Thành Viên ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'add' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserPlus size={14} /> Thêm & Cấp Quyền Gmail Mới
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'guide' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Info size={14} /> Hướng Dẫn Phân Quyền
            </button>
          </div>

          {actionSuccessMsg && (
            <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-fade-in font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* TAB 1: DANH SÁCH NGƯỜI DÙNG */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Role Filter Bar */}
            <div className="p-4 border-b bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Tìm theo tên, email Gmail, tổ bộ môn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Lọc vai trò:</span>
                <select 
                  value={filterRole} 
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="p-1.5 text-xs bg-white border border-gray-300 rounded-xl font-medium outline-none"
                >
                  <option value="all">Tất cả ({users.length})</option>
                  <option value="admin">Quản trị viên ({users.filter(u => u.role === 'admin').length})</option>
                  <option value="reviewer">Tổ trưởng chuyên môn ({users.filter(u => u.role === 'reviewer').length})</option>
                  <option value="teacher">Giáo viên ({users.filter(u => u.role === 'teacher').length})</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 text-gray-700 font-bold border-b">
                    <tr>
                      <th className="p-3">Họ và tên / Gmail</th>
                      <th className="p-3">Đơn vị / Trường</th>
                      <th className="p-3 text-center">Vai trò hiện tại</th>
                      <th className="p-3 text-center">Thao tác phân quyền</th>
                      <th className="p-3 text-center w-16">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const roleBadge = getRoleBadgeColor(user.role);
                      const isCurrent = user.id === currentUser.id;

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full ${roleBadge.dot} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                                  {user.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                  {user.name}
                                  {isCurrent && <span className="bg-blue-100 text-primary text-[10px] px-1.5 py-0.2 rounded font-semibold">(Bạn)</span>}
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                                  <Mail size={11} className="text-gray-400" />
                                  {user.email || 'Chưa liên kết email'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="text-gray-800 font-medium">{user.department || 'Tổ Tin học'}</div>
                            <div className="text-[11px] text-gray-400">{user.school || 'THCS Lê Hồng Phong'}</div>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full font-bold border text-[11px] ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                              disabled={isCurrent && currentUser.role === 'admin'}
                              className="p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer hover:bg-white"
                              title="Bấm để nâng cấp hoặc thay đổi quyền hạn"
                            >
                              <option value="teacher">Giáo viên bộ môn</option>
                              <option value="reviewer">Tổ trưởng chuyên môn</option>
                              <option value="admin">Quản trị viên</option>
                            </select>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={isCurrent}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isCurrent ? 'Không thể xóa tài khoản hiện tại' : 'Xóa người dùng này'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THÊM & PHÂN QUYỀN TRƯỚC TÀI KHOẢN GMAIL */}
        {activeTab === 'add' && (
          <form onSubmit={handlePreAuthorize} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-primary mb-1">
                <Shield size={16} /> Cơ Chế Cấp Quyền Trước (Pre-authorization):
              </p>
              Nhập địa chỉ Gmail của giáo viên hoặc tổ trưởng. Khi người đó nhấp <strong>"Đăng nhập bằng Gmail"</strong>, hệ thống sẽ tự động đối soát email và cấp đúng vai trò bạn chỉ định mà không cần chờ duyệt!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Địa chỉ Gmail (*):
                </label>
                <input
                  type="email"
                  required
                  placeholder="giaovien.tin@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Họ và tên người dùng:
                </label>
                <input
                  type="text"
                  placeholder="Thầy/Cô Nguyễn Văn B"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vai trò phân quyền (*):
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="teacher">Giáo viên bộ môn (Soạn câu hỏi & Tạo đề thi)</option>
                  <option value="reviewer">Tổ trưởng chuyên môn (Thẩm định & Phê duyệt đề thi)</option>
                  <option value="admin">Quản trị viên (Toàn quyền hệ thống)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tổ chuyên môn:
                </label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trường học / Đơn vị:
                </label>
                <input
                  type="text"
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark shadow-md flex items-center gap-1.5"
              >
                <UserPlus size={15} /> Thêm & Cấp Quyền Ngay
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: HƯỚNG DẪN PHÂN QUYỀN */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700 leading-relaxed">
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                <Award size={18} className="text-indigo-600" /> Ma Trận Phân Quyền Trong Nhà Trường
              </h4>
              <p className="text-indigo-800">
                Hệ thống tuân thủ quy chuẩn quản lý khảo thí của Bộ GD&ĐT, phân định rõ ràng trách nhiệm giữa người ra đề và người duyệt đề.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl space-y-2">
                <span className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div> Giáo Viên Bộ Môn
                </span>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Soạn thảo và chuẩn hóa câu hỏi.</li>
                  <li>Xây dựng ma trận đề kiểm tra.</li>
                  <li>Sinh đề thi tự động & hoán vị mã đề.</li>
                  <li><strong>Gửi đề thi lên Tổ trưởng để phê duyệt.</strong></li>
                  <li><em className="text-rose-600">Không có quyền tự duyệt đề của chính mình.</em></li>
                </ul>
              </div>

              <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl space-y-2">
                <span className="font-bold text-indigo-800 text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Tổ Trưởng Chuyên Môn
                </span>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Xem tất cả đề thi do giáo viên nộp lên.</li>
                  <li>Chạy AI Thẩm định chất lượng câu hỏi.</li>
                  <li><strong>Phê duyệt đề thi (cấp dấu mộc chính thức).</strong></li>
                  <li><strong>Yêu cầu chỉnh sửa đề kèm góp ý chi tiết.</strong></li>
                  <li>Quản trị ngân hàng câu hỏi dùng chung.</li>
                </ul>
              </div>

              <div className="p-4 border border-purple-200 bg-purple-50/50 rounded-xl space-y-2">
                <span className="font-bold text-purple-800 text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div> Quản Trị Viên (Admin)
                </span>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Toàn quyền truy cập mọi tính năng.</li>
                  <li><strong>Phân quyền bất kỳ tài khoản Gmail nào.</strong></li>
                  <li>Cấu hình hệ thống, API Key & Cơ sở dữ liệu đám mây.</li>
                  <li>Sao lưu, phục hồi dữ liệu nhà trường.</li>
                </ul>
              </div>
            </div>

            <div className="border p-4 rounded-xl space-y-3 bg-gray-50">
              <h5 className="font-bold text-gray-900">Cách Phân Quyền Nhanh Cho 1 Giáo Viên:</h5>
              <ol className="list-decimal pl-4 space-y-2">
                <li><strong>Cách 1 (Tự động):</strong> Giáo viên chỉ cần bấm <em>"Đăng nhập bằng Gmail"</em> trên thanh điều hướng. Mặc định họ sẽ nhận quyền Giáo viên. Quản trị viên chỉ cần vào bảng này chọn đổi vai trò thành <em>Tổ trưởng</em> khi cần.</li>
                <li><strong>Cách 2 (Cấp quyền trước):</strong> Chuyển sang tab <em>"Thêm & Cấp Quyền Gmail Mới"</em>, nhập email Gmail của giáo viên đó và chọn vai trò <em>Tổ trưởng chuyên môn</em>. Khi người đó đăng nhập lần đầu, họ sẽ có quyền Tổ trưởng ngay lập tức.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
