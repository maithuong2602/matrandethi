import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionManager, { autoTagQuestion } from '../pages/QuestionManager';
import { QUESTION_BANK_STORAGE_KEY } from '../services/storage/questionBankStorage';
import { ExerciseQuestion } from '../types';

describe('TASK: Phân vùng và cô lập dữ liệu câu hỏi theo từng bài học (Lesson Partitioning)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('autoTagQuestion: Tự động gán Khối 8 Bài 1 cho câu hỏi legacy về Pascaline và lịch sử công cụ tính toán', () => {
    const legacyQuestion: ExerciseQuestion = {
      id: 'leg_01',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Chiếc máy tính cơ học Pascaline do nhà bác học Blaise Pascal sáng chế có khả năng thực hiện trực tiếp các phép tính nào?',
      options: [
        { id: 'A', text: 'Phép cộng và trừ', isCorrect: true },
        { id: 'B', text: 'Phép nhân và chia', isCorrect: false }
      ]
    };

    const tagged = autoTagQuestion(legacyQuestion);
    expect(tagged.grade).toBe('8');
    expect(tagged.lesson).toBe('Bài 1: Lược sử công cụ tính toán');
  });

  it('autoTagQuestion: Giữ nguyên bài học nếu câu hỏi đã được gắn grade và lesson', () => {
    const existing: ExerciseQuestion = {
      id: 'ex_02',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Câu hỏi đã có bài',
      grade: '8',
      lesson: 'Bài 2: Thông tin trong môi trường số'
    };

    const tagged = autoTagQuestion(existing);
    expect(tagged.grade).toBe('8');
    expect(tagged.lesson).toBe('Bài 2: Thông tin trong môi trường số');
  });

  it('Khi chọn bài khác (Bài 2), dữ liệu bài 1 không còn hiển thị và nạp mới độc lập', async () => {
    // 1. Render QuestionManager
    const { container } = render(<QuestionManager />);

    // 2. Chọn Khối 8
    const selects = container.querySelectorAll('select');
    const gradeSelect = selects[0];
    fireEvent.change(gradeSelect, { target: { value: '8' } });

    // 3. Chọn Bài 1
    const lessonSelect = selects[1];
    fireEvent.change(lessonSelect, { target: { value: 'Bài 1: Lược sử công cụ tính toán' } });

    // 4. Thêm 1 câu hỏi cho Bài 1
    const addButtons = screen.getAllByRole('button', { name: /Thêm câu hỏi/i });
    fireEvent.click(addButtons[0]);

    const textarea = screen.getAllByPlaceholderText(/Nhập nội dung câu hỏi/i)[0];
    fireEvent.change(textarea, { target: { value: 'NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE' } });

    // Đảm bảo câu hỏi Bài 1 đang hiển thị
    expect(screen.getByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE')).toBeInTheDocument();

    // 5. Chuyển sang Bài 2: Thông tin trong môi trường số
    fireEvent.change(lessonSelect, { target: { value: 'Bài 2: Thông tin trong môi trường số' } });

    // 6. KIỂM TRA: Câu hỏi của Bài 1 KHÔNG CÒN hiển thị khi đang ở Bài 2!
    expect(screen.queryByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE')).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa có câu hỏi trắc nghiệm nào cho bài học này/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0 câu/i).length).toBeGreaterThan(0);

    // 7. Thêm câu hỏi mới cho Bài 2
    const addButtonsB2 = screen.getAllByRole('button', { name: /Thêm câu hỏi/i });
    fireEvent.click(addButtonsB2[0]);

    const textareaB2 = screen.getAllByPlaceholderText(/Nhập nội dung câu hỏi/i)[0];
    fireEvent.change(textareaB2, { target: { value: 'NỘI DUNG CÂU HỎI THUỘC BÀI 2: MÔI TRƯỜNG SỐ' } });

    expect(screen.getByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 2: MÔI TRƯỜNG SỐ')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE')).not.toBeInTheDocument();

    // 8. Chuyển ngược lại về Bài 1
    fireEvent.change(lessonSelect, { target: { value: 'Bài 1: Lược sử công cụ tính toán' } });

    // 9. Xác nhận câu hỏi Bài 1 hiển thị trở lại, câu hỏi Bài 2 ẩn đi
    expect(screen.getByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('NỘI DUNG CÂU HỎI THUỘC BÀI 2: MÔI TRƯỜNG SỐ')).not.toBeInTheDocument();

    // 10. Kiểm tra localStorage đã lưu trữ cả 2 câu hỏi với đúng nhãn bài học tương ứng
    await waitFor(() => {
      const rawStored = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
      expect(rawStored).toContain('NỘI DUNG CÂU HỎI THUỘC BÀI 1: PASCALINE');
      expect(rawStored).toContain('NỘI DUNG CÂU HỎI THUỘC BÀI 2: MÔI TRƯỜNG SỐ');
    });
  });
});
