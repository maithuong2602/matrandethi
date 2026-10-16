import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatrixView from '../components/MatrixView';
import { MatrixData } from '../types';

describe('Assessment Level (Mức độ đánh giá) Management in MatrixView', () => {
    const createMockData = (yccdHtml: string): MatrixData => ({
        matrix: {
            rows: [
                ['1', 'Chủ đề 1', 'Nội dung 1', 'Bài 1', '2', '0', '', '5', '', '', '0', '', '', '50', '0'],
            ]
        },
        specifications: {
            rows: [
                ['1', 'Chủ đề 1', 'Nội dung 1', 'Bài 1', yccdHtml, '0-0', '5-0', '0-0', '0-0']
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
            rowEssayPoints: {}
        }
    });

    it('renders "Thêm mức độ đánh giá" button in specification table', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={vi.fn()} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        expect(screen.getAllByText('Thông hiểu').length).toBeGreaterThan(0);
        expect(screen.getByText('– Giải thích được khái niệm.')).toBeInTheDocument();
        expect(screen.getByText('Thêm mức độ đánh giá')).toBeInTheDocument();
    });

    it('opens assessment level selector and displays standard level options', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={vi.fn()} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        fireEvent.click(screen.getByText('Thêm mức độ đánh giá'));

        expect(screen.getByText('Chọn hoặc thêm mức độ đánh giá:')).toBeInTheDocument();
        expect(screen.getByText('+ Nhận biết')).toBeInTheDocument();
        // Thông hiểu is already present, so it should show (Đã có)
        expect(screen.getByText(/\+ Thông hiểu/)).toBeInTheDocument();
        expect(screen.getByText('+ Vận dụng')).toBeInTheDocument();
        expect(screen.getByText('+ Vận dụng cao')).toBeInTheDocument();
    });

    it('adds "Nhận biết" level before "Thông hiểu" according to standard order', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        const onUpdateMatrix = vi.fn();
        
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        fireEvent.click(screen.getByText('Thêm mức độ đánh giá'));
        fireEvent.click(screen.getByText('+ Nhận biết'));

        expect(onUpdateMatrix).toHaveBeenCalled();
        const updatedData: MatrixData = onUpdateMatrix.mock.calls[0][0];
        const newHtml = updatedData.specifications.rows[0][4];

        // Verify "Nhận biết" is placed before "Thông hiểu"
        const nbIndex = newHtml.indexOf('Nhận biết');
        const thIndex = newHtml.indexOf('Thông hiểu');
        expect(nbIndex).toBeGreaterThan(-1);
        expect(thIndex).toBeGreaterThan(-1);
        expect(nbIndex).toBeLessThan(thIndex);
    });

    it('adds "Vận dụng" level after "Thông hiểu" according to standard order', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        const onUpdateMatrix = vi.fn();
        
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        fireEvent.click(screen.getByText('Thêm mức độ đánh giá'));
        fireEvent.click(screen.getByText('+ Vận dụng'));

        expect(onUpdateMatrix).toHaveBeenCalled();
        const updatedData: MatrixData = onUpdateMatrix.mock.calls[0][0];
        const newHtml = updatedData.specifications.rows[0][4];

        // Verify "Vận dụng" is placed after "Thông hiểu"
        const thIndex = newHtml.indexOf('Thông hiểu');
        const vdIndex = newHtml.indexOf('Vận dụng');
        expect(thIndex).toBeGreaterThan(-1);
        expect(vdIndex).toBeGreaterThan(-1);
        expect(thIndex).toBeLessThan(vdIndex);
    });

    it('allows deleting an assessment level section using trash button', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        const onUpdateMatrix = vi.fn();
        
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        const deleteBtn = screen.getByTitle('Xoá mức độ đánh giá "Thông hiểu"');
        fireEvent.click(deleteBtn);

        expect(onUpdateMatrix).toHaveBeenCalled();
        const updatedData: MatrixData = onUpdateMatrix.mock.calls[0][0];
        expect(updatedData.specifications.rows[0][4]).toBe('');
    });

    it('allows adding a custom assessment level name', () => {
        const mockData = createMockData('<strong class="block font-semibold">Thông hiểu</strong><div class="pl-2">– Giải thích được khái niệm.</div>');
        const onUpdateMatrix = vi.fn();
        
        render(
            <MatrixView 
                data={mockData} 
                onUpdateMatrix={onUpdateMatrix} 
                onDeleteRow={vi.fn()} 
                examName="Kiểm tra Tin học 7" 
            />
        );

        fireEvent.click(screen.getByText('Thêm mức độ đánh giá'));
        const input = screen.getByPlaceholderText('Hoặc nhập tên mức độ khác...');
        fireEvent.change(input, { target: { value: 'Kỹ năng thực hành' } });
        fireEvent.click(screen.getByText('Thêm'));

        expect(onUpdateMatrix).toHaveBeenCalled();
        const updatedData: MatrixData = onUpdateMatrix.mock.calls[0][0];
        expect(updatedData.specifications.rows[0][4]).toContain('Kỹ năng thực hành');
    });
});
