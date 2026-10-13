import React, { useState, useMemo } from 'react';
import { ExerciseQuestion } from '../types';
import { CANONICAL_REQUIREMENTS } from '../data/curriculum/requirements';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle, ChevronRight, Check } from 'lucide-react';

interface Props {
  questions: ExerciseQuestion[];
  onSaveMapping: (questionId: string, requirementId: string | null, status: 'verified' | 'needs_review' | 'unmapped') => void;
}

type FilterStatus = 'all' | 'needs_review' | 'verified' | 'auto_resolved' | 'unmapped';

export const CurriculumMappingReview: React.FC<Props> = ({ questions, onSaveMapping }) => {
  const [filter, setFilter] = useState<FilterStatus>('needs_review');
  const [searchTerm, setSearchTerm] = useState('');

  // Counters
  const counts = useMemo(() => {
    const init = { all: 0, needs_review: 0, verified: 0, auto_resolved: 0, unmapped: 0 };
    questions.forEach(q => {
      init.all++;
      const status = q.curriculum?.mappingStatus || 'unmapped';
      init[status as keyof typeof init]++;
    });
    return init;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const status = q.curriculum?.mappingStatus || 'unmapped';
      if (filter !== 'all' && status !== filter) return false;
      if (searchTerm) {
        if (!q.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [questions, filter, searchTerm]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'auto_resolved': return <CheckCircle2 className="text-blue-500" size={18} />;
      case 'needs_review': return <AlertCircle className="text-amber-500" size={18} />;
      default: return <XCircle className="text-gray-400" size={18} />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'verified': return 'Đã xác nhận';
      case 'auto_resolved': return 'Tự động đối sánh';
      case 'needs_review': return 'Cần rà soát';
      default: return 'Chưa ánh xạ';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
      {/* Header & Filters */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Rà soát ánh xạ YCCĐ (Human-in-the-loop)</h2>
          <p className="text-sm text-gray-500">Xác nhận chuẩn mực CTGDPT 2018 cho từng câu hỏi</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'needs_review', 'verified', 'auto_resolved', 'unmapped'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === f 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'needs_review' && <AlertCircle size={14} className={filter === f ? 'text-amber-200' : 'text-amber-500'} />}
              {f === 'verified' && <CheckCircle2 size={14} className={filter === f ? 'text-emerald-200' : 'text-emerald-500'} />}
              {f === 'auto_resolved' && <CheckCircle2 size={14} className={filter === f ? 'text-blue-200' : 'text-blue-500'} />}
              {f === 'unmapped' && <XCircle size={14} className={filter === f ? 'text-gray-200' : 'text-gray-400'} />}
              {f === 'all' && <HelpCircle size={14} />}
              {f === 'all' ? 'Tất cả' : getStatusLabel(f)}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? 'bg-white/20' : 'bg-gray-100'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Không tìm thấy câu hỏi nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <QuestionMappingCard 
              key={q.id} 
              question={q} 
              index={idx + 1}
              onConfirm={(reqId, isCancel) => {
                if (isCancel) {
                  const fallbackStatus = (q.curriculum?.candidateRequirementIds && q.curriculum.candidateRequirementIds.length > 0) 
                    ? 'needs_review' 
                    : 'unmapped';
                  onSaveMapping(q.id, null, fallbackStatus);
                } else {
                  onSaveMapping(q.id, reqId, 'verified');
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

const QuestionMappingCard: React.FC<{
  question: ExerciseQuestion;
  index: number;
  onConfirm: (reqId: string | null, isCancel?: boolean) => void;
}> = ({ question, index, onConfirm }) => {
  const status = question.curriculum?.mappingStatus || 'unmapped';
  const isNeedsReview = status === 'needs_review';
  const isVerified = status === 'verified';
  const isAutoResolved = status === 'auto_resolved';

  // Extract Grade from trusted structured sources ONLY
  let reliableGrade: number | null = null;
  
  // A. Explicit question.grade if available
  if ('grade' in question) {
    const g = (question as any).grade;
    if (typeof g === 'number') reliableGrade = g;
    else if (typeof g === 'string') reliableGrade = parseInt(g.replace(/\D/g, ''));
  }
  
  // B. sourceLessonId
  if (!reliableGrade && question.curriculum?.sourceLessonId) {
    const m = question.curriculum.sourceLessonId.match(/Lop(\d+)/i) || question.curriculum.sourceLessonId.match(/grade(\d+)/i);
    if (m) reliableGrade = parseInt(m[1]);
  }

  // C & D. Verified canonical requirement
  if (!reliableGrade && status === 'verified' && question.curriculum?.requirementId) {
    const verifiedReq = CANONICAL_REQUIREMENTS.find(r => r.id === question.curriculum?.requirementId);
    if (verifiedReq) reliableGrade = verifiedReq.grade;
  }

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirmReq = (reqId: string) => {
    setErrorMsg(null);
    const req = CANONICAL_REQUIREMENTS.find(r => r.id === reqId);
    if (reliableGrade && req && req.grade !== reliableGrade) {
      setErrorMsg(`Không thể xác nhận: Câu hỏi thuộc khối ${reliableGrade}, nhưng YCCĐ thuộc khối ${req.grade}.`);
      return;
    }
    onConfirm(reqId, false);
  };

  const candidates = question.curriculum?.candidateRequirementIds || [];
  const hasCandidates = candidates.length !== 0;
  
  // Find current requirement if verified/auto
  const currentReq = question.curriculum?.requirementId 
    ? CANONICAL_REQUIREMENTS.find(r => r.id === question.curriculum?.requirementId)
    : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${
      isNeedsReview ? 'border-amber-200 shadow-amber-50' : 
      isVerified ? 'border-emerald-200' : 
      isAutoResolved ? 'border-blue-200' : 'border-gray-200'
    } overflow-hidden`}>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Question Context & Details */}
        <div className="space-y-3 border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 lg:pr-6">
          <div className="flex items-start justify-between">
            <span className="inline-flex text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Câu {index}
            </span>
            <span className="inline-flex text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">
              {question.level}
            </span>
          </div>
          
          <div className="text-sm text-gray-800 font-medium">
            {question.content}
          </div>
          
          {question.category === 'mc' && question.options && (
            <div className="space-y-1.5 mt-3">
              {question.options.map(opt => (
                <div key={opt.id} className={`text-xs p-1.5 rounded flex items-start gap-2 ${opt.isCorrect ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-gray-600'}`}>
                  <span className="font-bold w-4">{opt.id}.</span>
                  <span>{opt.text}</span>
                  {opt.isCorrect && <Check size={14} className="ml-auto text-emerald-500" />}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Nguồn:</strong> {question.criteria || 'Không có mã tiêu chí legacy'}</span>
            <span><strong>Dạng:</strong> {question.questionType || question.mcType || question.category}</span>
          </div>
        </div>

        {/* Right: Mapping Status & Resolution */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            {status === 'verified' && <CheckCircle2 className="text-emerald-500" size={20} />}
            {status === 'auto_resolved' && <CheckCircle2 className="text-blue-500" size={20} />}
            {status === 'needs_review' && <AlertCircle className="text-amber-500" size={20} />}
            {status === 'unmapped' && <XCircle className="text-gray-400" size={20} />}
            
            <h3 className={`font-bold text-sm ${
              isNeedsReview ? 'text-amber-700' : 
              isVerified ? 'text-emerald-700' : 
              isAutoResolved ? 'text-blue-700' : 'text-gray-600'
            }`}>
              {status === 'needs_review' ? 'Cần giáo viên rà soát' :
               status === 'verified' ? 'Đã xác nhận (Manual)' :
               status === 'auto_resolved' ? 'Khớp tự động (Tỉ lệ cao)' : 'Chưa có thông tin ánh xạ'}
            </h3>
          </div>

          <div className="flex-1">
            {currentReq ? (
              <div className="bg-green-50/50 border border-green-100 rounded-lg p-3 relative">
                 <div className="absolute top-2 right-2 flex gap-1">
                    {/* Allows re-verifying a different one if needed, but for now just show selected */}
                 </div>
                 <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded mb-1">
                   {currentReq.id}
                 </span>
                 <p className="text-sm font-medium text-green-900">{currentReq.requirementText}</p>
                 <p className="text-xs text-green-700 mt-1">{currentReq.topicName} - {currentReq.subTopicName}</p>
                 
                 <div className="mt-3 flex justify-between items-center">
                   {isAutoResolved ? (
                     <button 
                       onClick={() => handleConfirmReq(currentReq.id)}
                       className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700"
                     >
                       Xác nhận YCCĐ
                     </button>
                   ) : <div/>}
                   
                   <button 
                     onClick={() => onConfirm(null, true)}
                     className="text-xs text-red-600 hover:underline"
                   >
                     Hủy ánh xạ
                   </button>
                 </div>
              </div>
            ) : ((isNeedsReview || isAutoResolved) && hasCandidates) ? (
              <div className="space-y-3">
                {errorMsg && (
                  <div className="bg-red-50 text-red-700 p-2 rounded text-xs font-medium border border-red-200">
                    {errorMsg}
                  </div>
                )}
                <p className="text-xs text-amber-700 font-medium bg-amber-50 p-2 rounded">
                  Phát hiện {candidates.length} ứng viên. Vui lòng kiểm tra và xác nhận YCCĐ phù hợp nhất:
                </p>
                {candidates.map(cId => {
                  const req = CANONICAL_REQUIREMENTS.find(r => r.id === cId);
                  if (!req) return null;
                  return (
                    <div key={req.id} className="border border-gray-200 hover:border-primary/50 bg-white rounded-lg p-3 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded mb-1">
                            {req.id}
                          </span>
                          <p className="text-sm text-gray-800">{req.requirementText}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{req.topicName}</p>
                        </div>
                        <button
                          onClick={() => handleConfirmReq(req.id)}
                          className="flex-shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-dark"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center border border-dashed border-gray-300">
                Không có ứng viên tự động.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
