import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, FilePlus, GitGraph, LayoutGrid, ChevronRight, Settings, Key, 
  Check, X, Sparkles, ExternalLink, ShieldCheck, UserCheck, User, 
  ChevronDown, RefreshCw, Zap, Bell, CheckCircle2, AlertCircle,
  Database, Cloud, LogOut, LogIn, Users, Download, HardDrive, Shield
} from 'lucide-react';
import { getCustomApiKey } from '../services/geminiService';
import { 
  getApiKeyPool, 
  saveApiKeyPool, 
  isOfflineFallbackEnabled, 
  setOfflineFallbackEnabled, 
  testGeminiApiKey,
  FALLBACK_MODELS 
} from '../services/apiKeyService';
import { 
  getCurrentUser, 
  switchRole, 
  subscribeUserChange, 
  getRoleDisplayName, 
  getRoleBadgeColor,
  DEFAULT_USERS,
  loginWithGmail,
  logoutUser
} from '../services/authService';
import { 
  getDatabaseConfig, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  syncAllDataToCloud, 
  exportFullDatabaseJson 
} from '../services/database/dbService';
import { getPendingReviewCount, subscribeExamChange } from '../services/examApprovalService';
import { UserRole, UserProfile, DatabaseConfig } from '../types';
import { UserManagementModal } from './UserManagementModal';

// Google Colorful SVG Icon
const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

const Layout: React.FC = () => {
  const location = useLocation();
  
  // Modals & Navigation State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'api' | 'database'>('api');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isGmailLoginOpen, setIsGmailLoginOpen] = useState(false);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile>(getCurrentUser());
  const [pendingReviewCount, setPendingReviewCount] = useState<number>(0);

  // Gmail Login form state
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailName, setGmailName] = useState('');
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Settings State: AI Keys
  const [keysInput, setKeysInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [offlineFallback, setOfflineFallback] = useState<boolean>(true);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Settings State: Database & Sync
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(getDatabaseConfig());
  const [testingDb, setTestingDb] = useState(false);
  const [testDbResult, setTestDbResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [syncingDb, setSyncingDb] = useState(false);
  const [syncDbResult, setSyncDbResult] = useState<{ success: boolean; message: string; counts?: any } | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  useEffect(() => {
    const unsubUser = subscribeUserChange((u) => setCurrentUser(u));
    const unsubExam = subscribeExamChange(() => setPendingReviewCount(getPendingReviewCount()));
    setPendingReviewCount(getPendingReviewCount());

    return () => {
      unsubUser();
      unsubExam();
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      const pool = getApiKeyPool();
      setKeysInput(pool.map(k => k.key).join('\n'));
      setHasApiKey(pool.length > 0 || Boolean(getCustomApiKey()));
      setOfflineFallback(isOfflineFallbackEnabled());
      const storedModel = localStorage.getItem('gemini_model') || 'gemini-3.8-flash';
      setSelectedModel(storedModel);
      setTestResult(null);

      // Load DB config
      setDbConfig(getDatabaseConfig());
      setTestDbResult(null);
      setSyncDbResult(null);
      setBackupDownloaded(false);
    } else {
      const active = getCustomApiKey();
      setHasApiKey(Boolean(active));
    }
  }, [isSettingsOpen]);

  const handleSaveSettings = () => {
    // 1. Save AI Keys & Model
    const keyLines = keysInput
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean);

    saveApiKeyPool(keyLines);
    setOfflineFallbackEnabled(offlineFallback);
    localStorage.setItem('gemini_model', selectedModel);
    setHasApiKey(keyLines.length > 0);

    // 2. Save Database Config
    saveDatabaseConfig(dbConfig);

    setIsSettingsOpen(false);
  };

  const handleTestConnection = async () => {
    const firstKey = keysInput.split('\n').map(k => k.trim()).filter(Boolean)[0] || getCustomApiKey();
    if (!firstKey) {
      setTestResult({ success: false, message: 'Vui lòng nhập ít nhất 1 API key để kiểm tra.' });
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(firstKey);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Lỗi không xác định khi kết nối.' });
    } finally {
      setTestingKey(false);
    }
  };

  // Test Database Connection
  const handleTestDb = async () => {
    setTestingDb(true);
    setTestDbResult(null);
    try {
      const res = await testDatabaseConnection(dbConfig.endpointUrl || '', dbConfig.apiKey || '');
      setTestDbResult(res);
    } catch (e: any) {
      setTestDbResult({ success: false, message: e.message || 'Lỗi kiểm tra kết nối CSDL.' });
    } finally {
      setTestingDb(false);
    }
  };

  // Sync to Cloud
  const handleSyncToCloud = async () => {
    setSyncingDb(true);
    setSyncDbResult(null);
    try {
      saveDatabaseConfig(dbConfig);
      const res = await syncAllDataToCloud();
      setSyncDbResult(res);
      setDbConfig(getDatabaseConfig());
    } catch (e: any) {
      setSyncDbResult({ success: false, message: e.message || 'Lỗi đồng bộ đám mây.', counts: undefined });
    } finally {
      setSyncingDb(false);
    }
  };

  // Export Full JSON Backup
  const handleExportBackup = () => {
    try {
      const jsonStr = exportFullDatabaseJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `ExamMaster_FullBackup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
      setTimeout(() => setBackupDownloaded(false), 4000);
    } catch (e: any) {
      alert('Lỗi sao lưu cơ sở dữ liệu: ' + e.message);
    }
  };

  // Gmail Login Handlers
  const handleGmailLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gmailEmail || !gmailEmail.includes('@')) {
      setGmailError('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: nguyenan@gmail.com)');
      return;
    }
    setGmailError(null);
    const loggedIn = loginWithGmail(gmailEmail, gmailName);
    setCurrentUser(loggedIn);
    setIsGmailLoginOpen(false);
    setGmailEmail('');
    setGmailName('');
  };

  const handleQuickGmailLogin = (email: string, name: string) => {
    const loggedIn = loginWithGmail(email, name);
    setCurrentUser(loggedIn);
    setIsGmailLoginOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(getCurrentUser());
    setIsRoleMenuOpen(false);
  };

  const handleSelectRole = (role: UserRole) => {
    const u = switchRole(role);
    setCurrentUser(u);
    setIsRoleMenuOpen(false);
  };

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/questions': return 'Thêm & Chuẩn Hóa Câu Hỏi';
      case '/create-exam': return 'Tạo Đề Thi';
      case '/matrix': return 'Xây Dựng Ma Trận';
      default: return '';
    }
  };

  const navItems = [
    { path: '/questions', icon: <FilePlus size={20} />, label: 'Câu Hỏi' },
    { path: '/create-exam', icon: <GitGraph size={20} />, label: 'Tạo Đề' },
    { path: '/matrix', icon: <LayoutGrid size={20} />, label: 'Ma Trận' },
  ];

  const roleBadge = getRoleBadgeColor(currentUser.role);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Navigation - Collapsible (w-20 -> w-64 on hover) */}
      <aside className="group w-20 hover:w-64 bg-white shadow-xl flex-shrink-0 flex flex-col border-r border-gray-200 z-50 transition-all duration-300 ease-in-out absolute md:relative h-full">
        <div className="p-4 h-16 border-b border-gray-100 flex items-center justify-center group-hover:justify-start group-hover:px-6 transition-all">
          <Link to="/" className="flex items-center gap-3 text-primary font-bold text-xl overflow-hidden whitespace-nowrap">
            <div className="min-w-[24px]">
               <LayoutGrid className="fill-current w-8 h-8" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">ExamMaster</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-3 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors justify-center group-hover:justify-start"
            title="Dashboard"
          >
            <Home size={22} className="min-w-[22px]" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap font-medium">Dashboard</span>
          </Link>
          
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center group-hover:text-left transition-all">
            <span className="hidden group-hover:block">Chức Năng</span>
            <span className="block group-hover:hidden">...</span>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors justify-center group-hover:justify-start ${
                location.pathname === item.path 
                  ? 'bg-blue-50 text-primary font-bold' 
                  : 'text-gray-600 hover:bg-gray-50 font-medium'
              }`}
              title={item.label}
            >
              <div className="min-w-[22px] relative">
                  {item.icon}
                  {item.path === '/create-exam' && pendingReviewCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping group-hover:hidden"></span>
                  )}
              </div>
              <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex items-center justify-between w-full`}>
                  <span>{item.label}</span>
                  {item.path === '/create-exam' && pendingReviewCount > 0 && (currentUser.role === 'reviewer' || currentUser.role === 'admin') && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
                      {pendingReviewCount} chờ duyệt
                    </span>
                  )}
              </span>
            </Link>
          ))}
        </nav>

        {/* Pro Banner in Sidebar */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-primary rounded-xl p-3 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sparkles size={14} className="text-yellow-300" /> Hệ Thống Chuẩn 2025
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-semibold">v2.5 Pro</span>
            </div>
            <p className="opacity-90 text-[11px] mb-3 leading-snug">
              Gmail Auth, Phân quyền 3 cấp, CSDL đám mây & Bộ sinh không lỗi.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSettingsTab('api');
                  setIsSettingsOpen(true);
                }}
                className="flex-1 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 shadow"
              >
                <Settings size={12} /> Cấu hình
              </button>
              <button 
                onClick={() => setIsUserMgmtOpen(true)}
                className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                title="Quản lý thành viên & phân quyền"
              >
                <Users size={13} />
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 left-0 w-full flex justify-center group-hover:hidden text-primary">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-20 md:ml-0 transition-all duration-300">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
           {/* Breadcrumbs */}
           <div className="flex items-center gap-2 text-sm text-gray-500">
             <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
             <ChevronRight size={14} />
             <span className="text-gray-900 font-semibold">{getBreadcrumb()}</span>
           </div>
           
           {/* Header Right Actions */}
           <div className="flex items-center gap-3">
             {/* Pending Review Badge (for Reviewer / Admin) */}
             {(currentUser.role === 'reviewer' || currentUser.role === 'admin') && pendingReviewCount > 0 && (
               <Link
                 to="/create-exam"
                 className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm"
                 title="Có đề thi đang chờ bạn phê duyệt"
               >
                 <Bell size={13} className="text-amber-600 animate-bounce" />
                 <span>{pendingReviewCount} đề chờ duyệt</span>
               </Link>
             )}

             {/* Gmail Login Status / Quick Login Button */}
             {currentUser.provider === 'google' ? (
               <div 
                 onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                 className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 cursor-pointer transition-colors"
                 title={`Đã xác thực qua Google: ${currentUser.email}`}
               >
                 <GoogleIcon />
                 <span className="font-mono text-[11px] truncate max-w-[140px]">{currentUser.email}</span>
               </div>
             ) : (
               <button
                 onClick={() => setIsGmailLoginOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-sm transition-all hover:border-gray-300"
                 title="Đăng nhập tài khoản Gmail để đồng bộ đề thi & phân quyền"
               >
                 <GoogleIcon />
                 <span className="hidden sm:inline">Đăng nhập Gmail</span>
               </button>
             )}

             {/* AI Engine Status Badge */}
             <button
                onClick={() => {
                  setSettingsTab('api');
                  setIsSettingsOpen(true);
                }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${
                  hasApiKey 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
                title="Bấm để cấu hình Khóa AI & Bộ sinh dự phòng"
             >
                <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></span>
                {hasApiKey ? 'AI: Đa khóa tự xoay' : 'Sinh dự phòng GDPT (100%)'}
             </button>

             {/* Settings Button */}
             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200"
               title="Cấu hình hệ thống & CSDL"
             >
               <Settings size={18} />
             </button>

             <div className="h-6 w-px bg-gray-200 mx-1"></div>

             {/* User Profile & Role Switcher Dropdown */}
             <div className="relative">
               <button
                 onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                 className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border ${roleBadge.border} ${roleBadge.bg} hover:shadow-md transition-all text-left`}
                 title="Bấm để mở hồ sơ, chuyển vai trò hoặc quản lý thành viên"
               >
                 {currentUser.avatar ? (
                   <img 
                     src={currentUser.avatar} 
                     alt={currentUser.name} 
                     className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm"
                     onError={(e) => {
                       (e.target as HTMLElement).style.display = 'none';
                     }}
                   />
                 ) : (
                   <div className={`w-8 h-8 rounded-lg ${roleBadge.dot} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                     {currentUser.role === 'admin' ? 'AD' : currentUser.role === 'reviewer' ? 'TT' : 'GV'}
                   </div>
                 )}
                 <div className="hidden sm:block">
                   <div className="text-xs font-bold text-gray-800 leading-tight flex items-center gap-1">
                     {currentUser.name}
                     <ChevronDown size={12} className={`text-gray-400 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                   </div>
                   <div className={`text-[10px] font-semibold ${roleBadge.text}`}>
                     {getRoleDisplayName(currentUser.role)}
                   </div>
                 </div>
               </button>

               {/* Role & Profile Dropdown Menu */}
               {isRoleMenuOpen && (
                 <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                   {/* User Info Header */}
                   <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                     <div className="flex items-center gap-2 mb-1">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleBadge.bg} ${roleBadge.text} border ${roleBadge.border}`}>
                         {getRoleDisplayName(currentUser.role)}
                       </span>
                       {currentUser.provider === 'google' && (
                         <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                           <GoogleIcon /> Google Verified
                         </span>
                       )}
                     </div>
                     <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name}</p>
                     <p className="text-[11px] text-gray-500 font-mono truncate">{currentUser.email || 'Chưa liên kết email'}</p>
                     <p className="text-[11px] text-gray-400 truncate mt-0.5">{currentUser.department} • {currentUser.school}</p>
                   </div>

                   {/* Admin / Reviewer Special Action: Manage Users & Roles */}
                   <div className="p-2 border-b border-gray-100">
                     <button
                       onClick={() => {
                         setIsRoleMenuOpen(false);
                         setIsUserMgmtOpen(true);
                       }}
                       className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200"
                     >
                       <Users size={16} className="text-primary flex-shrink-0" />
                       <div className="text-left flex-1">
                         <div>Quản Lý Thành Viên & Cấp Quyền</div>
                         <div className="text-[10px] font-normal text-blue-600/80">Phân vai trò GV, TT, AD cho Gmail</div>
                       </div>
                       <ChevronRight size={14} className="text-blue-400" />
                     </button>
                   </div>

                   {/* Role Switcher for Fast Simulation */}
                   <div className="px-4 pt-2 pb-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trải Nghiệm Nhanh Phân Quyền</p>
                   </div>

                   <div className="p-2 space-y-1">
                     {/* Teacher */}
                     <button
                       onClick={() => handleSelectRole('teacher')}
                       className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                         currentUser.role === 'teacher' ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200' : 'hover:bg-gray-50 text-gray-700'
                       }`}
                     >
                       <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                         GV
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-xs font-bold truncate">Giáo Viên (Soạn đề & gửi duyệt)</div>
                       </div>
                       {currentUser.role === 'teacher' && <Check size={14} className="text-emerald-600" />}
                     </button>

                     {/* Reviewer */}
                     <button
                       onClick={() => handleSelectRole('reviewer')}
                       className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                         currentUser.role === 'reviewer' ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200' : 'hover:bg-gray-50 text-gray-700'
                       }`}
                     >
                       <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px]">
                         TT
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-xs font-bold truncate">Tổ Trưởng (Thẩm định & Phê duyệt)</div>
                       </div>
                       {currentUser.role === 'reviewer' && <Check size={14} className="text-indigo-600" />}
                     </button>

                     {/* Admin */}
                     <button
                       onClick={() => handleSelectRole('admin')}
                       className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                         currentUser.role === 'admin' ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200' : 'hover:bg-gray-50 text-gray-700'
                       }`}
                     >
                       <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-[11px]">
                         AD
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-xs font-bold truncate">Quản Trị Viên (Toàn quyền hệ thống)</div>
                       </div>
                       {currentUser.role === 'admin' && <Check size={14} className="text-purple-600" />}
                     </button>
                   </div>

                   {/* Bottom Auth Actions */}
                   <div className="p-2 border-t border-gray-100 space-y-1">
                     <button
                       onClick={() => {
                         setIsRoleMenuOpen(false);
                         setIsGmailLoginOpen(true);
                       }}
                       className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                     >
                       <GoogleIcon />
                       <span>{currentUser.provider === 'google' ? 'Đổi tài khoản Gmail khác' : 'Đăng nhập bằng Gmail'}</span>
                     </button>

                     <button
                       onClick={handleLogout}
                       className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                     >
                       <LogOut size={14} />
                       <span>Đăng xuất tài khoản</span>
                     </button>
                   </div>
                 </div>
               )}
             </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* GMAIL AUTHENTICATION MODAL */}
      {isGmailLoginOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 animate-fade-in-up border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-2xl border border-blue-100">
                  <GoogleIcon />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Đăng Nhập Bằng Gmail</h3>
                  <p className="text-[11px] text-gray-500">Google Workspace & Cá nhân</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGmailLoginOpen(false)} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Đăng nhập bằng Gmail để lưu trữ đề thi, ma trận đồng bộ trên đám mây và nhận phân quyền chính thức từ Quản trị viên nhà trường.
            </p>

            {/* Quick Demo Accounts */}
            <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Tài Khoản Gmail Mẫu (Bấm để đăng nhập nhanh):
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickGmailLogin('giaovien.an@gmail.com', 'ThS. Nguyễn Văn An')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-left transition-all text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-gray-800">giaovien.an@gmail.com</span>
                    <span className="text-[11px] text-gray-500 block">ThS. Nguyễn Văn An</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Giáo Viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGmailLogin('totruong.mai@gmail.com', 'Cô Trần Thị Mai')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 text-left transition-all text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-gray-800">totruong.mai@gmail.com</span>
                    <span className="text-[11px] text-gray-500 block">Cô Trần Thị Mai</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Tổ Trưởng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGmailLogin('admin@haichau.edu.vn', 'Thầy Lê Hoàng Phúc')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-left transition-all text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-gray-800">admin@haichau.edu.vn</span>
                    <span className="text-[11px] text-gray-500 block">Thầy Lê Hoàng Phúc</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Admin</span>
                </button>
              </div>
            </div>

            {/* Custom Gmail Form */}
            <form onSubmit={handleGmailLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Địa Chỉ Gmail Của Bạn:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="nguyenvanan@gmail.com"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <GoogleIcon />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Họ và Tên (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thầy Trần Quang Hải"
                  value={gmailName}
                  onChange={(e) => setGmailName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {gmailError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{gmailError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGmailLoginOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <LogIn size={14} /> Xác Nhận Đăng Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT & ROLE ASSIGNMENT MODAL (ADMIN / REVIEWER) */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />

      {/* SETTINGS MODAL (AI ENGINE & CLOUD DATABASE) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-7 animate-fade-in-up border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="text-primary" size={20} /> Cấu Hình Hệ Thống & Cơ Sở Dữ Liệu
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Tùy biến bộ sinh AI không lỗi và kết nối lưu trữ đám mây</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-5 gap-2">
              <button
                type="button"
                onClick={() => setSettingsTab('api')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  settingsTab === 'api'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Key size={15} /> Khóa AI & Sinh Dự Phòng
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('database')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  settingsTab === 'database'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Database size={15} /> Cơ Sở Dữ Liệu & Đám Mây
              </button>
            </div>

            {/* TAB 1: AI & API KEYS */}
            {settingsTab === 'api' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Cơ chế <strong className="text-primary font-bold">Zero-Failure Engine</strong>: Tự động đổi khóa khi gặp lỗi 429 hoặc kích hoạt thuật toán sư phạm nội bộ GDPT 2018 khi mất kết nối mạng.
                </p>

                {/* API Keys Pool */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">
                      Danh Sách Google Gemini API Key (Mỗi dòng 1 key):
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Tự động xoay khóa khi quá tải
                    </span>
                  </div>
                  <textarea 
                    rows={3}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-gray-400"
                    placeholder="AIzaSy... (Khóa chính)&#10;AIzaSy... (Khóa dự phòng 1)&#10;AIzaSy... (Khóa dự phòng 2)"
                    value={keysInput}
                    onChange={(e) => setKeysInput(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Dán nhiều key. Khi 1 key chạm hạn ngạch, hệ thống tự động đổi sang key kế tiếp ngay lập tức.
                  </p>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mô Hình AI Gemini:
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                  >
                    {FALLBACK_MODELS.map(m => (
                      <option key={m} value={m}>{m} {m === 'gemini-3.8-flash' ? '(Khuyên dùng - Nhanh & Chuẩn)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Offline Fallback Toggle */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl mt-0.5">
                    <Zap size={16} />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">Bộ Sinh Sư Phạm Dự Phòng (Offline Fallback)</span>
                      <input 
                        type="checkbox"
                        checked={offlineFallback}
                        onChange={(e) => setOfflineFallback(e.target.checked)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                      />
                    </div>
                    <p className="text-blue-800/80 mt-1 leading-relaxed">
                      Đảm bảo <strong>100% không bao giờ thất bại</strong> khi tạo câu hỏi, ngay cả khi toàn bộ API Key hết hạn mức hoặc mất mạng.
                    </p>
                  </div>
                </div>

                {/* Test API Key Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingKey}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-gray-200 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={testingKey ? 'animate-spin' : ''} />
                    {testingKey ? 'Đang kiểm tra...' : 'Kiểm tra API Key'}
                  </button>

                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1 ml-auto"
                  >
                    Lấy Google API Key Miễn Phí <ExternalLink size={12} />
                  </a>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    testResult.success 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DATABASE & CLOUD STORAGE */}
            {settingsTab === 'database' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Lưu trữ dữ liệu chuyên nghiệp: hỗ trợ chế độ <strong className="text-gray-900">Offline-first</strong> bảo mật trên máy và đồng bộ đám mây <strong className="text-primary">PostgreSQL / Supabase</strong> với phân quyền dữ liệu Row-Level Security (RLS).
                </p>

                {/* Provider Choice */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Loại Cơ Sở Dữ Liệu Lưu Trữ:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDbConfig({ ...dbConfig, provider: 'local' })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        dbConfig.provider === 'local'
                          ? 'border-primary bg-blue-50/60 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-gray-900 mb-1">
                        <HardDrive size={15} className="text-primary" /> CSDL Nội Bộ (Offline)
                      </div>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Tốc độ siêu tốc (&lt;5ms), dữ liệu lưu trên máy, an toàn tuyệt đối.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDbConfig({ ...dbConfig, provider: 'supabase' })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        dbConfig.provider === 'supabase'
                          ? 'border-primary bg-blue-50/60 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-gray-900 mb-1">
                        <Cloud size={15} className="text-emerald-600" /> PostgreSQL Đám Mây
                      </div>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Supabase Cloud, đồng bộ nhiều máy, phân quyền RLS chuẩn trường học.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Supabase Config Fields */}
                {dbConfig.provider === 'supabase' && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Supabase Project URL:
                      </label>
                      <input
                        type="url"
                        placeholder="https://xyzcompany.supabase.co"
                        value={dbConfig.endpointUrl || ''}
                        onChange={(e) => setDbConfig({ ...dbConfig, endpointUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Supabase Anon / Public API Key:
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        value={dbConfig.apiKey || ''}
                        onChange={(e) => setDbConfig({ ...dbConfig, apiKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dbConfig.enableAutoSync}
                          onChange={(e) => setDbConfig({ ...dbConfig, enableAutoSync: e.target.checked })}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <span>Tự động đồng bộ ngầm khi lưu đề thi & câu hỏi</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleTestDb}
                        disabled={testingDb}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={testingDb ? 'animate-spin' : ''} />
                        {testingDb ? 'Đang test...' : 'Kiểm tra kết nối CSDL'}
                      </button>
                    </div>

                    {testDbResult && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                        testDbResult.success 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {testDbResult.success ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />}
                        <span>{testDbResult.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cloud Sync & Backup Actions */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Cloud size={15} className="text-emerald-700" />
                      <span>Đồng Bộ Hóa Dữ Liệu Tức Thì</span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">
                      {dbConfig.lastSyncAt ? `Đồng bộ lần cuối: ${new Date(dbConfig.lastSyncAt).toLocaleString('vi-VN')}` : 'Chưa thực hiện đồng bộ lần nào.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncToCloud}
                    disabled={syncingDb}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={syncingDb ? 'animate-spin' : ''} />
                    {syncingDb ? 'Đang đồng bộ...' : 'Đồng Bộ Ngay'}
                  </button>
                </div>

                {syncDbResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    syncDbResult.success 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {syncDbResult.success ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />}
                    <span>{syncDbResult.message}</span>
                  </div>
                )}

                {/* Full Database Export / Backup */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Download size={15} className="text-primary" />
                      <span>Sao Lưu Toàn Bộ Cơ Sở Dữ Liệu (.json)</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Tải về gói sao lưu trọn gói gồm: Tài khoản, Ngân hàng câu hỏi & Hồ sơ đề thi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Download size={13} /> Tải Gói Backup
                  </button>
                </div>

                {backupDownloaded && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                    <span>Đã tạo và tải về tệp sao lưu CSDL thành công!</span>
                  </div>
                )}

                {/* Schema file reference note */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                  <strong>Khởi tạo CSDL Đám Mây:</strong> Tệp script SQL hoàn chỉnh <code className="bg-amber-100 px-1 rounded font-mono">database_schema.sql</code> đã có sẵn trong thư mục dự án. Chỉ cần copy và dán vào <em>Supabase SQL Editor</em> để tạo 4 bảng chuẩn hóa kèm phân quyền Row-Level Security (RLS) trong 30 giây.
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
              <button 
                type="button"
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark shadow-md flex items-center gap-1.5"
              >
                <Check size={16} /> Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;