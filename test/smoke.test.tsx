import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Test Group B: Application Smoke Test', () => {
  it('renders application landing page without crashing', () => {
    // Reset hash to root
    window.location.hash = '#/';
    render(<App />);

    // Verify main landing header is rendered
    expect(screen.getByText(/Công Cụ/i)).toBeInTheDocument();
    expect(screen.getByText(/Quản Lý Đề Thi/i)).toBeInTheDocument();

    // Verify footer branding
    expect(screen.getByText(/ExamMaster Pro/i)).toBeInTheDocument();
  });
});
