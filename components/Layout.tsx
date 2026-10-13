import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FilePlus, GitGraph, LayoutGrid, ChevronRight, Settings, Key, Check, X, Sparkles, ExternalLink } from 'lucide-react';
import { getCustomApiKey, setCustomApiKey } from '../services/geminiService';

const Layout: React.FC = () => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const key = getCustomApiKey();
    setApiKeyInput(key);
    setHasApiKey(Boolean(key));
  }, [isSettingsOpen]);

  const handleSaveApiKey = () => {
    setCustomApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setIsSettingsOpen(false);
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
                  ? 'bg-blue-50 text-primary' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              <div className="min-w-[22px]">
                  {item.icon}
              </div>
              <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap font-medium ${location.pathname === item.path ? 'font-bold' : ''}`}>
                  {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 flex-shrink-0 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-3 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
            <p className="font-semibold mb-1 whitespace-nowrap flex items-center gap-1.5">
              <Sparkles size={14} /> Phiên bản Pro 2025
            </p>
            <p className="opacity-80 text-xs mb-3 whitespace-nowrap">Định dạng mới & AI Khảo thí.</p>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Key size={13} /> Cài đặt API Key
            </button>
          </div>
          <div className="absolute bottom-4 left-0 w-full flex justify-center group-hover:hidden text-primary">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-20 md:ml-0 transition-all duration-300">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
           <div className="flex items-center gap-2 text-sm text-gray-500">
             <Link to="/" className="hover:text-primary">Trang chủ</Link>
             <ChevronRight size={14} />
             <span className="text-gray-900 font-medium">{getBreadcrumb()}</span>
           </div>
           
           <div className="flex items-center gap-4">
             {/* AI Status Badge */}
             <button
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  hasApiKey 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title="Bấm để cấu hình Gemini API Key"
             >
                <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                {hasApiKey ? 'AI Gemini: Đã kết nối' : 'Cần cài Gemini Key'}
             </button>

             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
               title="Cài đặt hệ thống"
             >
               <Settings size={18} />
             </button>

             <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
               GV
             </div>
             <span className="text-sm font-semibold text-gray-700 hidden sm:block">Giáo Viên</span>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* API KEY SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Key className="text-primary" /> Cấu Hình Google Gemini AI
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Nhập API Key của Google Gemini để kích hoạt các tính năng tạo câu hỏi hàng loạt, thẩm định đề thi (Reviewer), và tự động bù đắp đề thi.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Gemini API Key:
                </label>
                <input 
                  type="password"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Sparkles size={14} /> Cách lấy API Key miễn phí:
                </p>
                <p>
                  Truy cập Google AI Studio để tạo khóa API miễn phí trong 30 giây.
                </p>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary font-bold hover:underline mt-1"
                >
                  Mở Google AI Studio <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveApiKey}
                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-md flex items-center gap-1.5"
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