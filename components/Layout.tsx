import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FilePlus, GitGraph, LayoutGrid, ChevronRight } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();

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
            <p className="font-semibold mb-1 whitespace-nowrap">Phiên bản Pro</p>
            <p className="opacity-80 text-xs mb-3 whitespace-nowrap">Tính năng AI cao cấp.</p>
            <button className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors whitespace-nowrap">
              Xem chi tiết
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
           
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
               AD
             </div>
             <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin User</span>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;