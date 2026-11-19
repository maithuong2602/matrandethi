import React, { useState, useRef } from 'react';
import {
    Upload, FileText, CheckCircle2, AlertCircle, X, ChevronDown,
    ChevronUp, Sparkles, FolderCheck, Save, Eye, FileCode, Check, RefreshCw
} from 'lucide-react';
import { parseUploadedExam, ParsedExamResult } from '../services/examUploadParserService';
import { ExerciseQuestion } from '../types';

interface ExamUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadIntoEditor: (parsed: ParsedExamResult) => void;
    onSaveToMainBank: (parsed: ParsedExamResult) => void;
    onSaveToSimilarBank: (parsed: ParsedExamResult) => void;
}

export const ExamUploadModal: React.FC<ExamUploadModalProps> = ({
    isOpen,
    onClose,
    onLoadIntoEditor,
    onSaveToMainBank,
    onSaveToSimilarBank
}) => {
    const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
    const [pastedText, setPastedText] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [parseResult, setParseResult] = useState<ParsedExamResult | null>(null);
    const [showQuestionsPreview, setShowQuestionsPreview] = useState<boolean>(false);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    // Editable fields in preview
    const [customTitle, setCustomTitle] = useState<string>('');
    const [customGrade, setCustomGrade] = useState<string>('8');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const processFile = (file: File) => {
        setIsLoading(true);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const res = parseUploadedExam(content, file.name);
                setParseResult(res);
                if (res.success) {
                    setCustomTitle(res.title || file.name.replace(/\.[^/.]+$/, ''));
                    setCustomGrade(res.grade || '8');
                }
            } else {
                setParseResult({
                    success: false,
                    error: 'Không đọc được dữ liệu từ tệp tin đã chọn.',
                    headerInfo: {},
                    questions: [],
                    stats: {
                        totalQuestions: 0,
                        singleChoiceCount: 0,
                        multipleAnswerCount: 0,
                        trueFalseCount: 0,
                        shortAnswerCount: 0,
                        essayCount: 0,
                        questionsWithAnswer: 0,
                        totalPoints: 0
                    },
                    sourceType: 'plain_text'
                });
            }
            setIsLoading(false);
        };

        reader.onerror = () => {
            setParseResult({
                success: false,
                error: 'Có lỗi xảy ra trong quá trình đọc tệp tin.',
                headerInfo: {},
                questions: [],
                stats: {
                    totalQuestions: 0,
                    singleChoiceCount: 0,
                    multipleAnswerCount: 0,
                    trueFalseCount: 0,
                    shortAnswerCount: 0,
                    essayCount: 0,
                    questionsWithAnswer: 0,
                    totalPoints: 0
                },
                sourceType: 'plain_text'
            });
            setIsLoading(false);
        };

        reader.readAsText(file, 'utf-8');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleParsePastedText = () => {
        if (!pastedText.trim()) return;
        setIsLoading(true);
        const res = parseUploadedExam(pastedText, 'De_Thi_Dan.txt');
        setParseResult(res);
        if (res.success) {
            setCustomTitle(res.title || 'Đề thi nhập liệu');
            setCustomGrade(res.grade || '8');
        }
        setIsLoading(false);
    };

    const getUpdatedResult = (): ParsedExamResult => {
        if (!parseResult) throw new Error('No parsed result');
        return {
            ...parseResult,
            title: customTitle.trim() || parseResult.title || 'Đề thi tải lên',
            grade: customGrade,
            headerInfo: {
                ...parseResult.headerInfo,
                tenKyThi: customTitle.trim() || parseResult.headerInfo.tenKyThi || customTitle
            }
        };
    };

    const handleReset = () => {
        setParseResult(null);
        setFileName('');
        setPastedText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-white to-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Tải Lên & Khôi Phục Đề Thi Vào ExamMaster Pro
                                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                    .doc / .json / văn bản
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500">
                                Dành cho đề thi bạn đã xuất ra máy tính nhưng chưa kịp lưu vào Kho Pro. Hệ thống tự động đọc câu hỏi, bảng đáp án và đưa vào hệ thống!
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs & Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('file'); handleReset(); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'file'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <FileText size={15} /> Tải tệp từ máy tính (.doc, .html, .json, .txt)
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('paste'); handleReset(); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'paste'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <FileCode size={15} /> Dán nội dung trực tiếp
                        </button>
                    </div>

                    {/* Tab 1: Upload File */}
                    {activeTab === 'file' && !parseResult && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                                isDragOver
                                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".doc,.docx,.html,.htm,.json,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                                <Upload size={28} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">
                                    Kéo thả tệp đề thi vào đây, hoặc <span className="text-indigo-600 underline">bấm để chọn từ máy tính</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Hỗ trợ định dạng Word (.doc được xuất từ hệ thống), file HTML, JSON Ngân hàng, hoặc tệp Text (.txt)
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                                    Tự động nhận diện Đề thi & Bảng đáp án
                                </span>
                                <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    Chuẩn Bộ GD&ĐT 2018 / 2025
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Paste Text */}
                    {activeTab === 'paste' && !parseResult && (
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-700">
                                Dán nội dung đề thi (bao gồm các câu hỏi và bảng đáp án nếu có):
                            </label>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                rows={10}
                                placeholder="Dán nội dung đề thi vào đây... (Ví dụ: Câu 1. Máy tính điện tử... A. ... B. ... BẢNG ĐÁP ÁN: 1.A 2.B...)"
                                className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleParsePastedText}
                                    disabled={!pastedText.trim() || isLoading}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                                >
                                    <Sparkles size={14} /> Phân Tích & Nhận Diện Đề Thi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <RefreshCw size={28} className="animate-spin text-indigo-600" />
                            <p className="text-xs font-medium">Đang đọc và phân tích cấu trúc đề thi, bảng đáp án...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {parseResult && !parseResult.success && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-xs font-bold">Không thể tải đề thi</h4>
                                <p className="text-xs mt-0.5">{parseResult.error}</p>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    Thử tải lại tệp khác
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Preview & Configuration */}
                    {parseResult && parseResult.success && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* Summary Card */}
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4.5">
                                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={18} className="text-emerald-600" />
                                        <h3 className="text-sm font-bold text-emerald-900">
                                            Đã nhận diện thành công đề thi ({parseResult.stats.totalQuestions} câu hỏi)
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="text-xs text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw size={12} /> Đổi tệp khác
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Tên Đề Thi:
                                        </label>
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={(e) => setCustomTitle(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="Tên đề thi..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Khối Lớp:
                                        </label>
                                        <select
                                            value={customGrade}
                                            onChange={(e) => setCustomGrade(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            <option value="6">Lớp 6</option>
                                            <option value="7">Lớp 7</option>
                                            <option value="8">Lớp 8</option>
                                            <option value="9">Lớp 9</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Stats Badges */}
                                <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-emerald-200/60 text-xs">
                                    <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-medium text-slate-700">
                                        🎯 Trắc nghiệm 1 đáp án: <strong className="text-emerald-700">{parseResult.stats.singleChoiceCount}</strong>
                                    </span>
                                    <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-medium text-slate-700">
                                        ⚖️ Đúng - Sai: <strong className="text-emerald-700">{parseResult.stats.trueFalseCount}</strong>
                                    </span>
                                    {parseResult.stats.shortAnswerCount > 0 && (
                                        <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-medium text-slate-700">
                                            ✍️ Trả lời ngắn: <strong className="text-emerald-700">{parseResult.stats.shortAnswerCount}</strong>
                                        </span>
                                    )}
                                    {parseResult.stats.essayCount > 0 && (
                                        <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-medium text-slate-700">
                                            📝 Tự luận: <strong className="text-emerald-700">{parseResult.stats.essayCount}</strong>
                                        </span>
                                    )}
                                    <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-medium text-slate-700">
                                        🏆 Tổng điểm: <strong className="text-indigo-700">{parseResult.stats.totalPoints}đ</strong>
                                    </span>
                                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold">
                                        ✓ Đã khớp {parseResult.stats.questionsWithAnswer}/{parseResult.stats.totalQuestions} câu có đáp án
                                    </span>
                                </div>
                            </div>

                            {/* Header Info Details if detected */}
                            {(parseResult.headerInfo.tenTruong || parseResult.headerInfo.donVi || parseResult.headerInfo.maDe) && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {parseResult.headerInfo.donVi && <span><strong>Đơn vị:</strong> {parseResult.headerInfo.donVi}</span>}
                                    {parseResult.headerInfo.tenTruong && <span><strong>Trường:</strong> {parseResult.headerInfo.tenTruong}</span>}
                                    {parseResult.headerInfo.monHoc && <span><strong>Môn:</strong> {parseResult.headerInfo.monHoc}</span>}
                                    {parseResult.headerInfo.thoiGian && <span><strong>Thời gian:</strong> {parseResult.headerInfo.thoiGian}</span>}
                                    {parseResult.headerInfo.maDe && <span><strong>Mã đề gốc:</strong> {parseResult.headerInfo.maDe}</span>}
                                </div>
                            )}

                            {/* Collapsible Question List Preview */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowQuestionsPreview(!showQuestionsPreview)}
                                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Eye size={14} /> Danh sách câu hỏi nhận diện được ({parseResult.questions.length})
                                    </span>
                                    {showQuestionsPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showQuestionsPreview && (
                                    <div className="max-h-72 overflow-y-auto p-3 divide-y divide-slate-100 bg-white space-y-3">
                                        {parseResult.questions.map((q, idx) => (
                                            <div key={q.id || idx} className="pt-2.5 first:pt-0 text-xs">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800">Câu {idx + 1}.</span>
                                                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                        {q.level || 'NB'}
                                                    </span>
                                                    {q.criteria && (
                                                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                                            {q.criteria}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                                        {q.questionType}
                                                    </span>
                                                    {q.lesson && (
                                                        <span className="text-[10px] text-slate-400 truncate max-w-xs">
                                                            {q.lesson}
                                                        </span>
                                                    )}
                                                    <span className="ml-auto font-semibold text-slate-500">
                                                        {q.points || 0.25}đ
                                                    </span>
                                                </div>
                                                <p className="text-slate-700 font-medium line-clamp-2">{q.content}</p>

                                                {/* Options preview */}
                                                {q.options && q.options.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-2">
                                                        {q.options.map(o => (
                                                            <div
                                                                key={o.id}
                                                                className={`p-1 rounded text-[11px] flex items-center gap-1 ${
                                                                    o.isCorrect
                                                                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                                                                        : 'text-slate-600'
                                                                }`}
                                                            >
                                                                <span className="font-bold">{o.id}.</span>
                                                                <span className="truncate">{o.text}</span>
                                                                {o.isCorrect && <Check size={12} className="text-emerald-600 ml-auto shrink-0" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Essay answer preview */}
                                                {q.category === 'essay' && q.answer && (
                                                    <div className="mt-1 p-1.5 bg-slate-50 text-[11px] text-slate-600 rounded border border-slate-200 line-clamp-2">
                                                        <strong>Đáp án/HDC:</strong> {q.answer}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        Đóng
                    </button>

                    {parseResult && parseResult.success && (
                        <div className="flex items-center gap-2.5">
                            {/* Option 1: Save directly to Main Exam Bank */}
                            <button
                                type="button"
                                onClick={() => {
                                    onSaveToMainBank(getUpdatedResult());
                                    onClose();
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                <Save size={14} /> Lưu Vào Kho Đề Gốc
                            </button>

                            {/* Option 2: Save to Similar Exam Bank */}
                            <button
                                type="button"
                                onClick={() => {
                                    onSaveToSimilarBank(getUpdatedResult());
                                    onClose();
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                <FolderCheck size={14} /> Lưu Vào Kho Đề Tương Tự
                            </button>

                            {/* Option 3: Open in Editor (Review step) */}
                            <button
                                type="button"
                                onClick={() => {
                                    onLoadIntoEditor(getUpdatedResult());
                                    onClose();
                                }}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-200 cursor-pointer"
                            >
                                <Eye size={14} /> Mở & Biên Tập Trong Pro
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
