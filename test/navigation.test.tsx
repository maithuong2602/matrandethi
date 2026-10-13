import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import Layout from '../components/Layout';

describe('Test Group C: Routing / Navigation Regression', () => {
  it('renders all three core module cards on Dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    // Card 1: Question Bank / Bài tập
    const questionCard = screen.getByText('Tạo Bài Tập & Câu Hỏi');
    expect(questionCard).toBeInTheDocument();
    expect(questionCard.closest('a')).toHaveAttribute('href', '/questions');

    // Card 2: Exam Generator
    const examCard = screen.getByText('Tạo Đề Thi Từ Ma Trận');
    expect(examCard).toBeInTheDocument();
    expect(examCard.closest('a')).toHaveAttribute('href', '/create-exam');

    // Card 3: Matrix Builder
    const matrixCard = screen.getByText('Xây Dựng Ma Trận');
    expect(matrixCard).toBeInTheDocument();
    expect(matrixCard.closest('a')).toHaveAttribute('href', '/matrix');

    // Verify orphaned ExerciseCreator is NOT referenced
    expect(screen.queryByText(/ExerciseCreator/i)).not.toBeInTheDocument();
  });

  it('renders Layout sidebar navigation and reflects the active route in breadcrumb', () => {
    render(
      <MemoryRouter initialEntries={['/questions']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/questions" element={<div data-testid="question-page-dummy">Question Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Sidebar branding
    expect(screen.getByText('ExamMaster')).toBeInTheDocument();

    // Check nav links in sidebar
    expect(screen.getByText('Câu Hỏi').closest('a')).toHaveAttribute('href', '/questions');
    expect(screen.getByText('Tạo Đề').closest('a')).toHaveAttribute('href', '/create-exam');
    expect(screen.getByText('Ma Trận').closest('a')).toHaveAttribute('href', '/matrix');

    // Check breadcrumb title for /questions
    expect(screen.getByText('Thêm & Chuẩn Hóa Câu Hỏi')).toBeInTheDocument();

    // Check child route rendered
    expect(screen.getByTestId('question-page-dummy')).toBeInTheDocument();
  });

  it('displays correct breadcrumbs when navigating to /matrix and /create-exam', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/matrix']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/matrix" element={<div>Matrix Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Xây Dựng Ma Trận')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/create-exam']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/create-exam" element={<div>Exam Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Tạo Đề Thi')).toBeInTheDocument();
  });
});
