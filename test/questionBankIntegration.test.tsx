import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionManager from '../pages/QuestionManager';
import { QUESTION_BANK_STORAGE_KEY } from '../services/storage/questionBankStorage';

describe('TASK 002: Question Bank Persistence Integration Test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('thêm câu hỏi -> tự động lưu vào localStorage -> unmount và render lại (F5) -> câu hỏi vẫn tồn tại', async () => {
    // 1. Render lần đầu
    const { unmount } = render(<QuestionManager />);

    // Kiểm tra tiêu đề danh mục trắc nghiệm hiển thị
    expect(screen.getByText(/PHẦN 1: TRẮC NGHIỆM/i)).toBeInTheDocument();

    // 2. Tìm và bấm nút "Thêm câu hỏi"
    const addButtons = screen.getAllByRole('button', { name: /Thêm câu hỏi/i });
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);

    // 3. Tìm các textarea nội dung câu hỏi
    const textareas = screen.getAllByPlaceholderText(/Nhập nội dung câu hỏi/i);
    const lastTextarea = textareas[textareas.length - 1];

    // Nhập nội dung câu hỏi đặc biệt
    fireEvent.change(lastTextarea, { target: { value: 'TEST PERSISTENCE 001 - BÀI HỌC VẬT MANG TIN' } });

    // 4. Kiểm tra dữ liệu trong localStorage đã được cập nhật
    await waitFor(() => {
      const rawStored = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      expect(rawStored).toContain('TEST PERSISTENCE 001 - BÀI HỌC VẬT MANG TIN');
    });

    // 5. Mô phỏng F5 bằng cách unmount component hoàn toàn
    unmount();

    // 6. Mount lại component (phiên làm việc mới)
    render(<QuestionManager />);

    // 7. Xác nhận nội dung câu hỏi 'TEST PERSISTENCE 001' vẫn tồn tại sau khi nạp lại
    await waitFor(() => {
      expect(screen.getByDisplayValue('TEST PERSISTENCE 001 - BÀI HỌC VẬT MANG TIN')).toBeInTheDocument();
    });
  });

  it('xóa câu hỏi -> tự động cập nhật localStorage -> render lại -> câu hỏi bị xóa không xuất hiện lại', async () => {
    // 1. Render và thêm 1 câu hỏi
    const { container, unmount } = render(<QuestionManager />);
    const addButtons = screen.getAllByRole('button', { name: /Thêm câu hỏi/i });
    fireEvent.click(addButtons[0]);

    const textareas = screen.getAllByPlaceholderText(/Nhập nội dung câu hỏi/i);
    const targetTextarea = textareas[textareas.length - 1];
    fireEvent.change(targetTextarea, { target: { value: 'CÂU HỎI SẼ BỊ XÓA 002' } });

    await waitFor(() => {
      expect(localStorage.getItem(QUESTION_BANK_STORAGE_KEY)).toContain('CÂU HỎI SẼ BỊ XÓA 002');
    });

    // 2. Bấm nút xóa (nút chứa icon Trash2)
    const trashIcons = container.querySelectorAll('.lucide-trash-2');
    expect(trashIcons.length).toBeGreaterThan(0);
    const lastDeleteButton = trashIcons[trashIcons.length - 1].closest('button');
    expect(lastDeleteButton).not.toBeNull();
    fireEvent.click(lastDeleteButton!);

    // 3. Kiểm tra localStorage không còn câu này
    await waitFor(() => {
      const rawStored = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawStored).not.toContain('CÂU HỎI SẼ BỊ XÓA 002');
    });

    // 4. Mô phỏng F5
    unmount();
    render(<QuestionManager />);

    // 5. Xác nhận câu hỏi đã xóa không xuất hiện trở lại
    expect(screen.queryByDisplayValue('CÂU HỎI SẼ BỊ XÓA 002')).not.toBeInTheDocument();
  });
});
