import React from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, GitGraph, LayoutGrid, ArrowRight } from 'lucide-react';
import { FeatureCardProps } from '../types';

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, to }) => {
  return (
    <Link 
      to={to} 
      className="bg-white rounded-xl p-8 shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_25px_rgba(0,86,179,0.15)] hover:-translate-y-2 transition-all duration-300 flex flex-col items-center justify-center text-center group border border-transparent hover:border-blue-50"
    >
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary group-hover:bg-blue-100 transition-colors">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-primary transition-colors">
        {title}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        {description}
      </p>
      <div className="text-primary font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        Truy cập ngay <ArrowRight size={16} />
      </div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <header className="text-center mb-12 max-w-2xl animate-fade-in-down">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Công Cụ <span className="text-primary">Quản Lý Đề Thi</span>
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          Hệ thống chuyên nghiệp giúp bạn quản lý ngân hàng câu hỏi, xây dựng ma trận kiến thức và tạo đề thi tự động chỉ trong vài bước.
        </p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        <FeatureCard
          to="/questions"
          title="Tạo Bài Tập & Câu Hỏi"
          description="Tạo bài tập tự luận và trắc nghiệm với định dạng chuẩn, hỗ trợ nhập hàng loạt và xuất file."
          icon={<FilePlus size={32} />}
        />

        <FeatureCard
          to="/create-exam"
          title="Tạo Đề Thi Từ Ma Trận"
          description="Tự động tạo ra các mã đề thi ngẫu nhiên, đảm bảo tính khách quan dựa trên ma trận kiến thức đã thiết lập."
          icon={<GitGraph size={32} />}
        />

        <FeatureCard
          to="/matrix"
          title="Xây Dựng Ma Trận"
          description="Thiết lập cấu trúc đề thi, phân bổ tỉ lệ câu hỏi theo từng chương, chủ đề và mức độ nhận thức."
          icon={<LayoutGrid size={32} />}
        />
      </main>

      <footer className="mt-16 text-gray-400 text-sm">
        © 2024 ExamMaster Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default Dashboard;