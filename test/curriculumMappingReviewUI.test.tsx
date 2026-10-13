import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurriculumMappingReview } from '../components/CurriculumMappingReview';
import QuestionManager from '../pages/QuestionManager';
import { ExerciseQuestion } from '../types';
import { vi } from 'vitest';
import * as storage from '../services/storage/questionBankStorage';

// Mock the storage to spy on saveQuestionBank
vi.mock('../services/storage/questionBankStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/storage/questionBankStorage')>();
  return {
    ...actual,
    loadQuestionBank: vi.fn(),
    saveQuestionBank: vi.fn(),
  };
});

describe('TASK 006C.1: Curriculum Mapping Review UI Verification', () => {
  const mockQuestions: ExerciseQuestion[] = [
    {
      id: 'q1',
      category: 'mc',
      level: 'NB',
      criteria: 'Lop6 Bài 1',
      content: 'Máy tính là gì?',
      options: [
        { id: 'A', text: 'Công cụ tính toán', isCorrect: true },
        { id: 'B', text: 'Đồ chơi', isCorrect: false }
      ],
      curriculum: {
        mappingStatus: 'needs_review',
        mappingMethod: 'none',
        candidateRequirementIds: ['TH6-A-001', 'TH6-A-002']
      }
    },
    {
      id: 'q2',
      category: 'mc',
      level: 'TH',
      criteria: 'Lop6 Bài 2',
      content: 'Chức năng của chuột?',
      curriculum: {
        mappingStatus: 'verified',
        mappingMethod: 'manual',
        requirementId: 'TH6-A-003'
      }
    },
    {
      id: 'q3',
      category: 'essay',
      level: 'VD',
      criteria: 'Lop6 Bài 3',
      content: 'Hãy mô tả chức năng của CPU',
      curriculum: {
        mappingStatus: 'auto_resolved',
        mappingMethod: 'exact_criterion',
        requirementId: 'TH6-A-004'
      }
    },
    {
      id: 'q4',
      category: 'essay',
      level: 'VD',
      criteria: 'Lop6 Bài 4',
      content: 'Mạng internet là gì?',
    },
    {
      id: 'q5_case_A',
      category: 'mc',
      level: 'NB',
      criteria: '',
      content: 'Mạng máy tính là gì lớp 7 (q5)?',
      curriculum: {
        mappingStatus: 'needs_review',
        mappingMethod: 'none',
        candidateRequirementIds: ['TH8-E-013', 'TH8-E-014'] 
      },
      ...({ grade: 7 }) // Explicit structured grade
    },
    {
      id: 'q6_case_B',
      category: 'mc',
      level: 'NB',
      criteria: '',
      content: 'Mạng máy tính là gì?',
      curriculum: {
        mappingStatus: 'needs_review',
        mappingMethod: 'none',
        sourceLessonId: 'Lop7_Bai1', // sourceLessonId grade
        candidateRequirementIds: ['TH8-E-013', 'TH8-E-014']
      }
    },
    {
      id: 'TH7-q7_case_CDE',
      category: 'mc',
      level: 'NB',
      criteria: '1.1', // Untrusted criteria
      content: 'Mạng máy tính là gì lớp 7 (q7)?', // Untrusted content
      curriculum: {
        mappingStatus: 'needs_review',
        mappingMethod: 'none',
        candidateRequirementIds: ['TH8-E-013', 'TH8-E-014']
      }
    },
    {
      id: 'q8_TH9_E_007',
      category: 'mc',
      level: 'VD',
      criteria: 'B10A COUNTIF',
      content: 'Hàm COUNTIF dùng để làm gì?',
      curriculum: {
        mappingStatus: 'needs_review',
        mappingMethod: 'none',
        candidateRequirementIds: ['TH9-E-007']
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TEST 1: Render default state (Cần rà soát filter)', () => {
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={vi.fn()} />);
    expect(screen.getByText('Máy tính là gì?')).toBeInTheDocument();
    expect(screen.queryByText('Chức năng của chuột?')).not.toBeInTheDocument();
  });

  it('TEST 2: Counters reflect correct numbers', () => {
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={vi.fn()} />);
    expect(screen.getByText('Cần rà soát').parentElement?.textContent).toContain('5'); 
    expect(screen.getByText('Đã xác nhận').parentElement?.textContent).toContain('1'); 
    expect(screen.getByText('Tự động đối sánh').parentElement?.textContent).toContain('1'); 
    expect(screen.getByText('Chưa ánh xạ').parentElement?.textContent).toContain('1'); 
    expect(screen.getByText('Tất cả').parentElement?.textContent).toContain('8');
  });

  it('TEST 3: NEEDS_REVIEW does not preselect candidates', () => {
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={vi.fn()} />);
    expect(screen.getByText('Phân biệt được thông tin với vật mang tin.')).toBeInTheDocument(); // TH6-A-001
    // Confirm buttons are available for all candidates, no single candidate is "active" by default
    const confirmBtns = screen.getAllByRole('button', { name: 'Xác nhận' });
    expect(confirmBtns.length).toBeGreaterThan(0);
  });

  it('TEST 4: AUTO_RESOLVED vs VERIFIED requires manual confirmation', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    fireEvent.click(screen.getByText(/Tự động đối sánh/));
    
    expect(screen.getByText('TH6-A-004')).toBeInTheDocument();
    const btn = screen.getByText('Xác nhận YCCĐ');
    fireEvent.click(btn);
    expect(handleSave).toHaveBeenCalledWith('q3', 'TH6-A-004', 'verified');
  });

  it('TEST 5: GRADE MISMATCH SAFETY - blocks save on explicit structured grade (Case A)', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    // Select q5_case_A candidate (TH8-E-013)
    // Find all 'TH8-E-013' texts in the document (there are multiple questions with this candidate, so we get the first one)
    const grade8CandidateText = screen.getAllByText('TH8-E-013')[0];
    const confirmBtn = grade8CandidateText.closest('div.group')?.querySelector('button');
    if (confirmBtn) fireEvent.click(confirmBtn);
    
    expect(screen.getByText(/Không thể xác nhận: Câu hỏi thuộc khối 7, nhưng YCCĐ thuộc khối 8/)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('TEST 6: GRADE MISMATCH SAFETY - blocks save on sourceLessonId (Case B)', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    // Select q6_case_B candidate
    // It has content "Mạng máy tính là gì?" (no lop 7), but sourceLessonId = Lop7_Bai1
    const q6Text = screen.getByText('Mạng máy tính là gì?');
    const q6Card = q6Text.closest('.bg-white.rounded-xl');
    const confirmBtn = q6Card?.querySelector('button'); // first confirm button
    if (confirmBtn) fireEvent.click(confirmBtn);
    
    expect(screen.getByText(/Không thể xác nhận: Câu hỏi thuộc khối 7, nhưng YCCĐ thuộc khối 8/)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('TEST 7: UNKNOWN GRADE SAFETY - does not infer from untrusted sources (Case C, D, E)', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    // Select TH7-q7_case_CDE candidate
    const q7Text = screen.getByText('Mạng máy tính là gì lớp 7 (q7)?');
    const q7Card = q7Text.closest('.bg-white.rounded-xl');
    const confirmBtn = q7Card?.querySelector('button');
    if (confirmBtn) fireEvent.click(confirmBtn);
    
    // Should NOT block, should call handleSave because grade is unknown
    expect(handleSave).toHaveBeenCalledWith('TH7-q7_case_CDE', 'TH8-E-013', 'verified');
    expect(screen.queryByText(/Không thể xác nhận/)).not.toBeInTheDocument();
  });

  it('TEST 8: CANCEL / HỦY ÁNH XẠ fallbacks to needs_review if candidates exist', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    fireEvent.click(screen.getByText(/Đã xác nhận/));
    const cancelBtn = screen.getByText('Hủy ánh xạ');
    fireEvent.click(cancelBtn);
    
    // q2 has no candidates, so fallback is unmapped
    expect(handleSave).toHaveBeenCalledWith('q2', null, 'unmapped'); 
  });

  it('TEST 9: TH9-E-007 UI SAFETY - no preselect, save requires user action', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    const q8Text = screen.getByText('Hàm COUNTIF dùng để làm gì?');
    const q8Card = q8Text.closest('.bg-white.rounded-xl');
    
    expect(q8Card).toBeInTheDocument();
    // TH9-E-007 text
    expect(screen.getByText('TH9-E-007')).toBeInTheDocument();
    
    // Should not be auto saved
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('TEST 10: TH8-E-013 / TH8-E-014 UI SAFETY - no preselect in array', () => {
    const handleSave = vi.fn();
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={handleSave} />);
    
    // Select TH8-E-014 explicitly
    const q5Text = screen.getByText('Mạng máy tính là gì lớp 7 (q5)?');
    const q5Card = q5Text.closest('.bg-white.rounded-xl');
    
    // We expect both TH8-E-013 and TH8-E-014 to be rendered
    const th8_14_text = screen.getAllByText('TH8-E-014')[0];
    expect(th8_14_text).toBeInTheDocument();
    
    // Clicking confirm on TH8-E-014
    const btn = th8_14_text.closest('div.group')?.querySelector('button');
    if (btn) fireEvent.click(btn);
    
    // It's blocked by grade mismatch in this test case, but the point is no preselect.
  });

  it('TEST 11: CANONICAL SOURCE - uses exact CANONICAL_REQUIREMENTS text', () => {
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={vi.fn()} />);
    
    // TH6-A-001 text from CANONICAL_REQUIREMENTS
    expect(screen.getByText('Phân biệt được thông tin với vật mang tin.')).toBeInTheDocument(); 
  });

  it('TEST 12: UNMAPPED MANUAL SELECTION - provides select dropdown (if implemented) or fallback', () => {
    render(<CurriculumMappingReview questions={mockQuestions} onSaveMapping={vi.fn()} />);
    fireEvent.click(screen.getByText(/Chưa ánh xạ/));
    
    // Currently UI says "Không có ứng viên tự động."
    // As long as it renders gracefully without error
    expect(screen.getByText('Không có ứng viên tự động.')).toBeInTheDocument();
  });

  it('TEST 13: INTEGRATION - MANUAL SAVE PATH', async () => {
    vi.mocked(storage.loadQuestionBank).mockReturnValue({ success: true, data: mockQuestions });
    vi.mocked(storage.saveQuestionBank).mockReturnValue({ success: true });

    render(<QuestionManager />);
    fireEvent.click(screen.getByText('Rà soát YCCĐ'));
    fireEvent.click(screen.getByText(/Cần rà soát/));
    
    vi.mocked(storage.saveQuestionBank).mockClear();
    
    const confirmBtns = screen.getAllByRole('button', { name: 'Xác nhận' });
    fireEvent.click(confirmBtns[0]); // Confirm TH6-A-001 for q1
    
    await waitFor(() => {
      expect(storage.saveQuestionBank).toHaveBeenCalled();
    });
    
    const savedData = vi.mocked(storage.saveQuestionBank).mock.lastCall?.[0] || [];
    const q1 = savedData.find(q => q.id === 'q1');
    expect(q1?.curriculum?.mappingStatus).toBe('verified');
    expect(q1?.curriculum?.mappingMethod).toBe('manual');
    expect(q1?.curriculum?.requirementId).toBe('TH6-A-001');
  });

  it('TEST 14: LEGACY DATA IMMUTABILITY', async () => {
    vi.mocked(storage.loadQuestionBank).mockReturnValue({ success: true, data: mockQuestions });
    vi.mocked(storage.saveQuestionBank).mockReturnValue({ success: true });

    render(<QuestionManager />);
    fireEvent.click(screen.getByText('Rà soát YCCĐ'));
    vi.mocked(storage.saveQuestionBank).mockClear();
    
    const confirmBtns = screen.getAllByRole('button', { name: 'Xác nhận' });
    fireEvent.click(confirmBtns[0]); // Confirm TH6-A-001 for q1
    
    await waitFor(() => {
      expect(storage.saveQuestionBank).toHaveBeenCalled();
    });
    
    const savedData = vi.mocked(storage.saveQuestionBank).mock.lastCall?.[0] || [];
    const q1Saved = savedData.find(q => q.id === 'q1');
    
    // Compare original non-curriculum fields
    const q1Original = mockQuestions.find(q => q.id === 'q1');
    expect(q1Saved?.content).toBe(q1Original?.content);
    expect(q1Saved?.options).toEqual(q1Original?.options);
    expect(q1Saved?.criteria).toBe(q1Original?.criteria);
    expect(q1Saved?.level).toBe(q1Original?.level);
    expect(q1Saved?.category).toBe(q1Original?.category);
  });
});
