import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, FilePlus, GitGraph, LayoutGrid, ChevronRight, Settings, Key, 
  Check, X, ExternalLink, RefreshCw, Zap, CheckCircle2, AlertCircle,
  Database, Cloud, Download, Upload, HardDrive, FolderArchive
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
  getDatabaseConfig, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  syncAllDataToCloud, 
  exportFullDatabaseJson,
  importFullDatabaseJson,
  getStorageStats
} from '../services/database/dbService';
import { subscribeExamChange } from '../services/examApprovalService';
import { DatabaseConfig } from '../types';

const Layout: React.FC = () => {
  const location = useLocation();
  
  // Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'storage' | 'api'>('storage');
  
  // Live Storage Stats
  const [stats, setStats] = useState(getStorageStats());

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
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshStats = () => {
    setStats(getStorageStats());
  };

  useEffect(() => {
    refreshStats();
    const unsubExam = subscribeExamChange(refreshStats);
    const handleStorage = () => refreshStats();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('matrix_filesystem_updated', handleStorage);
    return () => {
      unsubExam();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('matrix_filesystem_updated', handleStorage);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (isSettingsOpen) {
      refreshStats();
      const pool = getApiKeyPool();
      setKeysInput(pool.map(k => k.key).join('\n'));
      setHasApiKey(pool.length > 0 || Boolean(getCustomApiKey()));
      setOfflineFallback(isOfflineFallbackEnabled());
      const storedModel = localStorage.getItem('gemini_model') || 'gemini-3.8-flash';
      setSelectedModel(storedModel);
      setTestResult(null);

      setDbConfig(getDatabaseConfig());
      setTestDbResult(null);
      setSyncDbResult(null);
      setBackupMessage(null);
    } else {
      const active = getCustomApiKey();
      setHasApiKey(Boolean(active));
    }
  }, [isSettingsOpen]);

  const handleSaveSettings = () => {
    const keyLines = keysInput
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean);

    saveApiKeyPool(keyLines);
    setOfflineFallbackEnabled(offlineFallback);
    localStorage.setItem('gemini_model', selectedModel);
    setHasApiKey(keyLines.length > 0);

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

  const handleExportBackup = () => {
    try {
      const jsonStr = exportFullDatabaseJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `NganHang_DeThi_CauHoi_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage({
        type: 'success',
        text: `Đã tải về tệp sao lưu trọn bộ (${stats.questionCount} câu hỏi, ${stats.examCount} đề thi)!`
      });
    } catch (e: any) {
      setBackupMessage({
        type: 'error',
        text: 'Lỗi sao lưu dữ liệu: ' + e.message
      });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) return;
      const res = importFullDatabaseJson(content, 'merge');
      if (res.success) {
        refreshStats();
        setBackupMessage({ type: 'success', text: res.message });
        window.dispatchEvent(new Event('storage'));
      } else {
        setBackupMessage({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    { path: '/matrix', icon: <LayoutGrid size={20} />, label: 'Ma Trận' },
    { path: '/create-exam', icon: <GitGraph size={20} />, label: 'Tạo Đề' },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="group w-20 hover:w-60 bg-white shadow-lg flex-shrink-0 flex flex-col border-r border-gray-200 z-50 transition-all duration-300 ease-in-out absolute md:relative h-full">
        <div className="p-4 h-16 border-b border-gray-100 flex items-center justify-center group-hover:justify-start group-hover:px-5 transition-all">
          <Link to="/" className="flex items-center gap-3 text-primary font-bold text-xl overflow-hidden whitespace-nowrap">
            <div className="min-w-[24px]">
               <LayoutGrid className="fill-current w-7 h-7" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">ExamMaster</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2.5 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors justify-center group-hover:justify-start"
            title="Trang chủ"
          >
            <Home size={20} className="min-w-[20px]" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium text-sm">Trang chủ</span>
          </Link>
          
          <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center group-hover:text-left">
            <span className="hidden group-hover:block">Quy trình 3 bước</span>
            <span className="block group-hover:hidden">•••</span>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors justify-center group-hover:justify-start text-sm ${
                location.pathname === item.path 
                  ? 'bg-blue-50 text-primary font-bold' 
                  : 'text-gray-600 hover:bg-gray-100 font-medium'
              }`}
              title={item.label}
            >
              <div className="min-w-[20px]">
                {item.icon}
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Simple Storage Quick Button in Sidebar Footer */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              setSettingsTab('storage');
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-primary transition-colors justify-center group-hover:justify-start text-xs font-semibold"
            title="Lưu trữ & Sao lưu Ngân hàng"
          >
            <Database size={18} className="min-w-[18px] text-primary" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Lưu trữ & Sao lưu
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-20 md:ml-0 transition-all duration-300">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
           {/* Breadcrumbs */}
           <div className="flex items-center gap-2 text-sm text-gray-500">
             <Link to="/" className="hover:text-primary transition-colors font-medium">Trang chủ</Link>
             <ChevronRight size={14} />
             <span className="text-gray-900 font-bold">{getBreadcrumb()}</span>
           </div>
           
           {/* Clean Header Right Actions */}
           <div className="flex items-center gap-2.5">
             {/* Direct Storage & Backup Pill */}
             <button
               onClick={() => {
                 setSettingsTab('storage');
                 setIsSettingsOpen(true);
               }}
               className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-primary border border-gray-200 hover:border-blue-200 rounded-xl text-xs font-semibold transition-all"
               title="Quản lý lưu trữ, sao lưu & khôi phục Ngân hàng Câu hỏi và Đề thi"
             >
               <FolderArchive size={15} className="text-primary" />
               <span>
                 Kho lưu trữ: <strong>{stats.questionCount}</strong> câu • <strong>{stats.examCount}</strong> đề
               </span>
             </button>

             {/* AI Config Badge */}
             <button
               onClick={() => {
                 setSettingsTab('api');
                 setIsSettingsOpen(true);
               }}
               className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                 hasApiKey 
                   ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                   : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
               }`}
               title="Cấu hình khóa AI Gemini & Bộ sinh câu hỏi dự phòng"
             >
               <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
               {hasApiKey ? 'AI Gemini: Sẵn sàng' : 'Chế độ Offline (100%)'}
             </button>

             {/* Settings Icon */}
             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors border border-gray-200/80"
               title="Cài đặt Lưu trữ & AI"
             >
               <Settings size={17} />
             </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* CLEAN STORAGE & AI SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Database className="text-primary" size={19} /> Trung Tâm Lưu Trữ Ngân Hàng & Cấu Hình AI
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Sao lưu, khôi phục ngân hàng đề thi & câu hỏi đơn giản, an toàn tuyệt đối</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-5 gap-2">
              <button
                type="button"
                onClick={() => setSettingsTab('storage')}
                className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  settingsTab === 'storage'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <FolderArchive size={15} /> Lưu Trữ & Sao Lưu Ngân Hàng
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('api')}
                className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  settingsTab === 'api'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Key size={15} /> Cấu Hình AI Gemini
              </button>
            </div>

            {/* TAB 1: STORAGE & BACKUP */}
            {settingsTab === 'storage' && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-center">
                    <div className="text-xl font-extrabold text-primary">{stats.questionCount}</div>
                    <div className="text-[11px] font-semibold text-gray-600 mt-0.5">Câu hỏi trong kho</div>
                  </div>
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
                    <div className="text-xl font-extrabold text-emerald-700">{stats.examCount}</div>
                    <div className="text-[11px] font-semibold text-gray-600 mt-0.5">Đề thi đã lưu</div>
                  </div>
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-center">
                    <div className="text-xl font-extrabold text-indigo-700">{stats.matrixCount}</div>
                    <div className="text-[11px] font-semibold text-gray-600 mt-0.5">Khung ma trận</div>
                  </div>
                </div>

                {/* Primary Backup & Restore Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Sao lưu & Khôi phục trọn gói bằng tệp (.json)</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        Mọi câu hỏi, ma trận và đề thi được tự động lưu trên trình duyệt. Bạn nên tải tệp sao lưu (.json) về máy hoặc Google Drive để lưu trữ vĩnh viễn và mang sang máy tính khác.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <Download size={15} /> Tải File Sao Lưu (.json)
                    </button>

                    <label className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                      <Upload size={15} className="text-primary" /> Khôi Phục / Nhập File (.json)
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {backupMessage && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                      backupMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {backupMessage.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <AlertCircle size={15} className="text-rose-600 shrink-0" />}
                      <span>{backupMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* Optional Cloud Storage Mode */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                      {dbConfig.provider === 'local' ? <HardDrive size={15} className="text-primary" /> : <Cloud size={15} className="text-emerald-600" />}
                      <span>Chế độ lưu trữ: {dbConfig.provider === 'local' ? 'Lưu trực tiếp trên máy (Mặc định)' : 'Đồng bộ Đám mây (Supabase)'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDbConfig({ ...dbConfig, provider: 'local' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          dbConfig.provider === 'local' ? 'bg-blue-50 text-primary border-blue-200' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        Trên máy
                      </button>
                      <button
                        type="button"
                        onClick={() => setDbConfig({ ...dbConfig, provider: 'supabase' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          dbConfig.provider === 'supabase' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        Đám mây
                      </button>
                    </div>
                  </div>

                  {dbConfig.provider === 'supabase' && (
                    <div className="space-y-2.5 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Supabase Project URL:</label>
                        <input
                          type="url"
                          placeholder="https://xyzcompany.supabase.co"
                          value={dbConfig.endpointUrl || ''}
                          onChange={(e) => setDbConfig({ ...dbConfig, endpointUrl: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Supabase Anon API Key:</label>
                        <input
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          value={dbConfig.apiKey || ''}
                          onChange={(e) => setDbConfig({ ...dbConfig, apiKey: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleTestDb}
                          disabled={testingDb}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          <RefreshCw size={12} className={testingDb ? 'animate-spin' : ''} />
                          Kiểm tra kết nối
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncToCloud}
                          disabled={syncingDb}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <Cloud size={13} />
                          {syncingDb ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                        </button>
                      </div>
                      {testDbResult && (
                        <div className={`p-2 rounded-lg text-xs ${testDbResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          {testDbResult.message}
                        </div>
                      )}
                      {syncDbResult && (
                        <div className={`p-2 rounded-lg text-xs ${syncDbResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          {syncDbResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: AI KEYS */}
            {settingsTab === 'api' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">
                      Google Gemini API Key (Mỗi dòng 1 key):
                    </label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      Lấy Key miễn phí <ExternalLink size={12} />
                    </a>
                  </div>
                  <textarea 
                    rows={3}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                    placeholder="AIzaSy..."
                    value={keysInput}
                    onChange={(e) => setKeysInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mô hình AI Gemini:
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-xl text-xs font-medium outline-none"
                  >
                    {FALLBACK_MODELS.map(m => (
                      <option key={m} value={m}>{m} {m === 'gemini-3.8-flash' ? '(Khuyên dùng)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                  <Zap size={16} className="text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">Tự động dùng Bộ sinh Sư phạm Offline khi không có API Key</span>
                      <input 
                        type="checkbox"
                        checked={offlineFallback}
                        onChange={(e) => setOfflineFallback(e.target.checked)}
                        className="w-4 h-4 text-primary rounded cursor-pointer"
                      />
                    </div>
                    <p className="text-blue-800/80 mt-0.5">
                      Đảm bảo luôn tạo được câu hỏi chuẩn GDPT 2018 ngay cả khi chưa nhập API Key hoặc mất mạng.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingKey}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-gray-200"
                  >
                    <RefreshCw size={13} className={testingKey ? 'animate-spin' : ''} />
                    {testingKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Key'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-2.5 border-t pt-4">
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
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark shadow-xs flex items-center gap-1.5"
              >
                <Check size={15} /> Lưu Cài Đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
