import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, GitGraph, LayoutGrid, ArrowRight, Database, FileCheck, Layers } from 'lucide-react';
import { FeatureCardProps } from '../types';
import { getStorageStats } from '../services/database/dbService';

const FeatureCard: React.FC<FeatureCardProps & { badge?: string }> = ({ title, description, icon, to, badge }) => {
  return (
    <Link 
      to={to} 
      className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group border border-gray-200/80 hover:border-primary/40 relative overflow-hidden"
    >
      <div className="w-full flex items-center justify-between mb-6">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          {icon}
        </div>
        {badge && (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold group-hover:bg-blue-50 group-hover:text-primary transition-colors">
            {badge}
          </span>
        )}
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2.5 group-hover:text-primary transition-colors">
        {title}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
        {description}
      </p>
      <div className="text-primary font-semibold text-sm flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
        Mở phân hệ <ArrowRight size={16} />
      </div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ questionCount: 0, examCount: 0, matrixCount: 0 });

  useEffect(() => {
    setStats(getStorageStats());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <header className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-primary rounded-full text-xs font-bold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Chuẩn Chương Trình GDPT 2018 • Đơn Giản & Chuyên Nghiệp
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Công Cụ <span className="text-primary">Quản Lý Đề Thi</span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed">
          Quản lý ngân hàng câu hỏi, xây dựng ma trận đặc tả và lưu trữ ngân hàng đề thi đa mã chỉ trong 3 bước cốt lõi.
        </p>

        {/* Live Storage Summary Pill */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 px-5 py-2.5 bg-white rounded-2xl border border-gray-200 shadow-xs text-xs text-gray-600">
          <Link to="/questions" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Database size={15} className="text-primary" />
            <span>Ngân hàng câu hỏi: <strong className="text-gray-900">{stats.questionCount} câu</strong></span>
          </Link>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <Link to="/matrix" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Layers size={15} className="text-indigo-600" />
            <span>Ma trận đề: <strong className="text-gray-900">{stats.matrixCount} bộ</strong></span>
          </Link>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <Link to="/create-exam" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <FileCheck size={15} className="text-emerald-600" />
            <span>Ngân hàng đề thi: <strong className="text-gray-900">{stats.examCount} đề đã lưu</strong></span>
          </Link>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
        <FeatureCard
          to="/questions"
          title="Tạo Bài Tập & Câu Hỏi"
          description="Soạn thảo, chuẩn hóa câu hỏi trắc nghiệm & tự luận theo từng Khối, Bài học và Yêu cầu cần đạt. Tự động lưu vào ngân hàng."
          icon={<FilePlus size={28} />}
          badge={`${stats.questionCount} câu hỏi`}
        />

        <FeatureCard
          to="/matrix"
          title="Xây Dựng Ma Trận"
          description="Thiết lập ma trận và bản đặc tả đề kiểm tra Giữa kì, Cuối kì tự động phân bổ số câu và tỷ lệ điểm chuẩn xác."
          icon={<LayoutGrid size={28} />}
          badge={stats.matrixCount > 0 ? `${stats.matrixCount} ma trận` : 'Bước 2'}
        />

        <FeatureCard
          to="/create-exam"
          title="Tạo Đề Thi Từ Ma Trận"
          description="Tự động lấy câu hỏi từ Ngân hàng trên máy, trộn đa mã đề (101-108), lưu trữ vào Ngân hàng Đề thi và xuất file Word chuẩn."
          icon={<GitGraph size={28} />}
          badge={`${stats.examCount} đề đã lưu`}
        />
      </main>

      <footer className="mt-14 text-gray-400 text-xs font-medium">
        © 2025 ExamMaster Pro — Hệ thống Quản lý Ngân hàng Câu hỏi & Đề thi.
      </footer>
    </div>
  );
};

export default Dashboard;
