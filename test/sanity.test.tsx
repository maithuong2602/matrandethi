import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Test Group A: Testing Environment Sanity', () => {
  it('confirms vitest runner is operational', () => {
    expect(1 + 1).toBe(2);
  });

  it('confirms jsdom environment and DOM APIs are working', () => {
    const div = document.createElement('div');
    div.textContent = 'Môi trường kiểm thử CTGDPT 2018';
    document.body.appendChild(div);

    expect(div.textContent).toBe('Môi trường kiểm thử CTGDPT 2018');
    document.body.removeChild(div);
  });

  it('confirms React 19 component renders and jest-dom matchers work', () => {
    const TestComponent: React.FC<{ title: string }> = ({ title }) => (
      <div data-testid="test-card">
        <h1>{title}</h1>
        <p>Hệ thống hỗ trợ ma trận đề thi</p>
      </div>
    );

    render(<TestComponent title="ExamMaster Pro Testing" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('ExamMaster Pro Testing');

    const card = screen.getByTestId('test-card');
    expect(card).toBeInTheDocument();
  });
});
