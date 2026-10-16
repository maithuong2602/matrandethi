import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatrixView from '../components/MatrixView';
import { MatrixData } from '../types';

describe('MatrixView Question Count Editing', () => {
    const mockData: MatrixData = {
        matrix: {
            rows: [
                ['1', 'Chủ đề A', 'Nội dung 1', 'Bài 1', '2', '1', '', '5', '', '', '2', '', '', '50', '0'],
            ]
        },
        specifications: {
            rows: [
                ['1', 'Chủ đề A', 'Nội dung 1', 'Bài 1', 'Yêu cầu 1', '1-0', '5-0', '0-2', '0-0']
            ]
        },
        availableCounts: [
            {
                NB: { TN: 10, TL: 0 },
                TH: { TN: 10, TL: 0 },
                VD: { TN: 0, TL: 5 },
                VDC: { TN: 0, TL: 0 }
            }
        ],
        pointsConfig: {
            pointsTNKQ: 0.25,
            pointsTL: 1.0,
            rowEssayPoints: { 0: 1.0 }
        }
    };

    it('renders cell counts correctly in Matrix table', () => {
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={vi.fn()} 
                onDeleteRow={vi.fn()} 
                examName="Đề kiểm tra giữa kì" 
            />
        );

        expect(screen.getByText('1 Câu')).toBeInTheDocument();
        expect(screen.getByText('5 Câu')).toBeInTheDocument();
        expect(screen.getByText('2 Câu')).toBeInTheDocument();
    });

    it('allows editing question count in Matrix table and calls onUpdateMatrix upon save', () => {
        const onUpdateMatrix = vi.fn();
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Đề kiểm tra giữa kì" 
            />
        );

        // Click on "1 Câu" in the matrix table
        const cell1 = screen.getByText('1 Câu');
        fireEvent.click(cell1);

        // Should display the editor popup with input for "Số câu:"
        const input = screen.getByPlaceholderText('0');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(1);

        // Change value to 3 and click "Xong"
        fireEvent.change(input, { target: { value: '3' } });
        const saveButton = screen.getByRole('button', { name: 'Xong' });
        fireEvent.click(saveButton);

        // Verify onUpdateMatrix was called with updated matrix and spec rows
        expect(onUpdateMatrix).toHaveBeenCalledTimes(1);
        const updatedData = onUpdateMatrix.mock.calls[0][0];
        expect(updatedData.matrix.rows[0][5]).toBe('3');
        expect(updatedData.specifications.rows[0][5]).toBe('3-0');
    });

    it('allows editing question count and points in TL column', () => {
        const onUpdateMatrix = vi.fn();
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Đề kiểm tra giữa kì" 
            />
        );

        // Click on "2 Câu" (which is TL column: VD TL col 10)
        const cellTL = screen.getByText('2 Câu');
        fireEvent.click(cellTL);

        // Should display two inputs in the editor: "Số câu" and "Điểm/câu"
        const countInput = screen.getByPlaceholderText('0');
        expect(countInput).toBeInTheDocument();
        expect(countInput).toHaveValue(2);

        // Point input has value 1 (second display value 1, since header also has 1)
        const pointInputs = screen.getAllByDisplayValue('1');
        const pointInput = pointInputs[pointInputs.length - 1];
        expect(pointInput).toBeInTheDocument();

        // Change count to 1 and point to 2.0
        fireEvent.change(countInput, { target: { value: '1' } });
        fireEvent.change(pointInput, { target: { value: '2' } });

        const saveButton = screen.getByRole('button', { name: 'Xong' });
        fireEvent.click(saveButton);

        expect(onUpdateMatrix).toHaveBeenCalledTimes(1);
        const updatedData = onUpdateMatrix.mock.calls[0][0];
        expect(updatedData.matrix.rows[0][10]).toBe('1');
        expect(updatedData.specifications.rows[0][7]).toBe('0-1');
        expect(updatedData.pointsConfig.rowEssayPoints[0]).toBe(2);
    });

    it('only opens editor in Matrix table and does not render duplicate editor in Specification table', () => {
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={vi.fn()} 
                onDeleteRow={vi.fn()} 
                examName="Đề kiểm tra giữa kì" 
            />
        );

        // Click "5 Câu" in the matrix table
        const cell = screen.getByText('5 Câu');
        fireEvent.click(cell);

        // Exactly ONE question count editor should be open (placeholder '0')
        const editors = screen.getAllByPlaceholderText('0');
        expect(editors.length).toBe(1);
        expect(editors[0]).toHaveValue(5);

        // Clicking "Hủy" cancels the editor
        const cancelButton = screen.getByRole('button', { name: 'Hủy' });
        fireEvent.click(cancelButton);

        // Editor should be closed
        expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
        expect(screen.getByText('5 Câu')).toBeInTheDocument();
    });
});
