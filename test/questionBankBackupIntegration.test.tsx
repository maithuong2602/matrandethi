import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionManager from '../pages/QuestionManager';
import { 
  saveQuestionBank, 
  loadQuestionBank, 
  QUESTION_BANK_STORAGE_KEY 
} from '../services/storage/questionBankStorage';
import { 
  createBackupPackage, 
  listSafetySnapshots 
} from '../services/backup/questionBankBackup';
import { ExerciseQuestion } from '../types';

// Bỏ qua do người dùng đã yêu cầu xóa cụm giao diện Backup/Restore trên UI
describe.skip('TASK 003: Integration Tests for Backup, Restore & Safety Snapshot', () => {
  const currentBankA_B_C: ExerciseQuestion[] = [
    { id: 'q_A', category: 'mc', level: 'NB', criteria: '1.1', content: 'Câu hỏi Bank A', answer: 'A' },
    { id: 'q_B', category: 'mc', level: 'TH', criteria: '1.2', content: 'Câu hỏi Bank B', answer: 'B' },
    { id: 'q_C', category: 'essay', level: 'VD', criteria: '1.3', content: 'Câu hỏi Bank C', answer: 'C' }
  ];

  const backupBankX_Y: ExerciseQuestion[] = [
    { id: 'q_X', category: 'mc', level: 'NB', criteria: '2.1', content: 'Câu hỏi Backup X', answer: 'X' },
    { id: 'q_Y', category: 'mc', level: 'TH', criteria: '2.2', content: 'Câu hỏi Backup Y', answer: 'Y' }
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Khởi tạo primary storage với A, B, C
    saveQuestionBank(currentBankA_B_C);
  });

  // INTEGRATION A
  it('INTEGRATION A: Current bank (A,B,C) -> Restore (X,Y) -> Snapshot có (A,B,C) -> Rollback về (A,B,C)', async () => {
    // Mock window.confirm để tự động đồng ý
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { unmount } = render(<QuestionManager />);

    // 1. Kiểm tra ban đầu nạp đủ 3 câu A, B, C
    await waitFor(() => {
      expect(screen.getByDisplayValue('Câu hỏi Bank A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Bank B')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Bank C')).toBeInTheDocument();
    });

    // 2. Chuẩn bị file backup X, Y
    const backupPkg = createBackupPackage(backupBankX_Y);
    const file = new File([JSON.stringify(backupPkg)], 'backup_XY.json', { type: 'application/json' });

    // 3. Tìm input file Phục hồi (Restore)
    const restoreInput = screen.getByLabelText(/Phục Hồi \(Restore\)/i);
    expect(restoreInput).toBeInTheDocument();
    fireEvent.change(restoreInput, { target: { files: [file] } });

    // 4. Kiểm tra sau khi Restore: Bank hiển thị X, Y
    await waitFor(() => {
      expect(screen.getByDisplayValue('Câu hỏi Backup X')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Backup Y')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Câu hỏi Bank A')).not.toBeInTheDocument();
    });

    // 5. Kiểm tra Safety Snapshot đã được lưu chứa A, B, C
    const snapshots = listSafetySnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].questions).toHaveLength(3);
    expect(snapshots[0].questions.map(q => q.id)).toEqual(['q_A', 'q_B', 'q_C']);

    // 6. Bấm nút "Hoàn Tác Phục Hồi (Rollback)"
    const rollbackBtn = screen.getByRole('button', { name: /Hoàn Tác Phục Hồi/i });
    fireEvent.click(rollbackBtn);

    // 7. Kiểm tra sau Rollback: Bank đã quay lại A, B, C
    await waitFor(() => {
      expect(screen.getByDisplayValue('Câu hỏi Bank A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Bank B')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Bank C')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Câu hỏi Backup X')).not.toBeInTheDocument();
    });

    // 8. F5 simulation (unmount & re-render) -> A, B, C vẫn tồn tại bền vững
    unmount();
    render(<QuestionManager />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Câu hỏi Bank A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Câu hỏi Bank B')).toBeInTheDocument();
    });
  });

  // INTEGRATION B
  it('INTEGRATION B: Current bank (A,B,C) -> Restore INVALID -> Bank giữ nguyên (A,B,C)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<QuestionManager />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Câu hỏi Bank A')).toBeInTheDocument();
    });

    // Chuẩn bị file backup lỗi không hợp lệ (sai backupFormat)
    const invalidFile = new File(
      [JSON.stringify({ backupFormat: 'hacked_format', questions: [] })], 
      'invalid.json', 
      { type: 'application/json' }
    );

    const restoreInput = screen.getByLabelText(/Phục Hồi \(Restore\)/i);
    fireEvent.change(restoreInput, { target: { files: [invalidFile] } });

    // Kiểm tra thông báo lỗi xuất hiện
    await waitFor(() => {
      expect(screen.getByText(/Lỗi file sao lưu/i)).toBeInTheDocument();
    });

    // Dữ liệu ngân hàng câu hỏi trên giao diện và storage vẫn giữ nguyên A, B, C
    expect(screen.getByDisplayValue('Câu hỏi Bank A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Câu hỏi Bank B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Câu hỏi Bank C')).toBeInTheDocument();

    const stored = loadQuestionBank();
    expect(stored.data).toHaveLength(3);
    expect(stored.data.map(q => q.id)).toEqual(['q_A', 'q_B', 'q_C']);
  });
});
