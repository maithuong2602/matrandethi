import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  parseYccdHtmlToCriteria, 
  getMergedCriteria, 
  addCustomCriterion, 
  syncCriteriaFromMatrixData,
  CUSTOM_CRITERIA_STORAGE_KEY 
} from '../services/criteriaService';
import QuestionManager from '../pages/QuestionManager';
import { MatrixData } from '../types';

describe('Criteria Service & Matrix Synchronization', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('parses YCCĐ HTML into structured criteria map', () => {
        const html = `
            <strong class="block font-semibold">Nhận biết</strong>
            <div class="pl-2">– Nêu được vai trò của thông tin.</div>
            <div class="pl-2">– Nhận diện được nguồn thông tin.</div>
            <strong class="block font-semibold mt-2">Thông hiểu</strong>
            <div class="pl-2">– Giải thích được tầm quan trọng của thông tin.</div>
        `;
        const result = parseYccdHtmlToCriteria(html);

        expect(result.NB).toBeDefined();
        expect(result.NB.length).toBe(2);
        expect(result.NB[0]).toBe('1.1 Nêu được vai trò của thông tin.');
        expect(result.NB[1]).toBe('1.2 Nhận diện được nguồn thông tin.');

        expect(result.TH).toBeDefined();
        expect(result.TH.length).toBe(1);
        expect(result.TH[0]).toBe('2.1 Giải thích được tầm quan trọng của thông tin.');
    });

    it('merges newly added "Nhận biết" level for Grade 9 Bài 2 into criteria data', () => {
        // Standard CURRICULUM for Grade 9 Bài 2 only has TH
        const initial = getMergedCriteria('9', 'Bài 2. Thông tin trong giải quyết vấn đề');
        expect(initial?.TH).toBeDefined();
        expect(initial?.NB).toBeUndefined(); // Standard does not have NB

        // Add NB criterion
        addCustomCriterion('9', 'Bài 2. Thông tin trong giải quyết vấn đề', 'NB', 'Nêu được các tiêu chuẩn chất lượng thông tin.');

        // Verify merged criteria now includes both NB and TH
        const merged = getMergedCriteria('9', 'Bài 2. Thông tin trong giải quyết vấn đề');
        expect(merged?.NB).toBeDefined();
        expect(merged?.NB[0]).toBe('1.1 Nêu được các tiêu chuẩn chất lượng thông tin.');
        expect(merged?.TH).toBeDefined();
    });

    it('syncs criteria from MatrixData when updated in matrix/spec table', () => {
        const mockMatrixData: MatrixData = {
            matrix: {
                rows: [
                    ['1', 'Chủ đề 1', 'Nội dung 1', 'Bài 2. Thông tin trong giải quyết vấn đề', '2', '1', '', '2', '', '', '0', '', '', '30', '0']
                ]
            },
            specifications: {
                rows: [
                    ['1', 'Chủ đề 1', 'Nội dung 1', 'Bài 2. Thông tin trong giải quyết vấn đề', 
                     '<strong class="block font-semibold">Nhận biết</strong><div class="pl-2">– Biết cách tra cứu dữ liệu.</div><strong class="block font-semibold mt-2">Thông hiểu</strong><div class="pl-2">– Hiểu ý nghĩa dữ liệu.</div>', 
                     '1-0', '2-0', '0-0', '0-0']
                ]
            },
            availableCounts: [{ NB: { TN: 1, TL: 0 }, TH: { TN: 2, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } }]
        };

        syncCriteriaFromMatrixData(mockMatrixData, 'Lớp 9');

        const merged = getMergedCriteria('9', 'Bài 2. Thông tin trong giải quyết vấn đề');
        expect(merged?.NB).toBeDefined();
        expect(merged?.NB.some(c => c.includes('Biết cách tra cứu dữ liệu.'))).toBe(true);
    });

    it('displays newly added "Nhận biết" level in QuestionManager sidebar and criteria dropdowns', async () => {
        // Pre-populate custom criteria for Grade 9 Bài 2 with NB
        addCustomCriterion('9', 'Bài 2. Thông tin trong giải quyết vấn đề', 'NB', 'Nêu được khái niệm thông tin số.');

        render(<QuestionManager />);

        // Select Khối 9
        const gradeSelect = screen.getByLabelText('Khối') || screen.getAllByRole('combobox')[0];
        fireEvent.change(gradeSelect, { target: { value: '9' } });

        // Select Bài 2
        const lessonSelect = screen.getByLabelText('Bài') || screen.getAllByRole('combobox')[1];
        fireEvent.change(lessonSelect, { target: { value: 'Bài 2. Thông tin trong giải quyết vấn đề' } });

        // Check sidebar now displays "Nhận biết"
        expect(screen.getAllByText('Nhận biết').length).toBeGreaterThan(0);
        expect(screen.getByText('Nêu được khái niệm thông tin số.')).toBeInTheDocument();

        // Check "Bổ sung YCCĐ / Mức độ" button exists in sidebar
        expect(screen.getByText('Bổ sung YCCĐ / Mức độ')).toBeInTheDocument();
    });

    it('renumbers criteria sequentially (3.1, 3.2...) when two matrix rows map to the same lesson so 3.1 is never duplicated', () => {
        const mockMatrixData: MatrixData = {
            matrix: {
                rows: [
                    ['1', 'Chủ đề C', '1. Đặc điểm của thông tin trong môi trường số', 'Bài 3: Thực hành: Khai thác thông tin số', '1', '', '', '', '', '1', '', '', '', '10', '0'],
                    ['2', 'Chủ đề C', '2. Thông tin với giải quyết vấn đề', 'Bài 3: Thực hành: Khai thác thông tin số', '1', '', '', '', '', '1', '', '', '', '10', '0']
                ]
            },
            specifications: {
                rows: [
                    [
                        '1',
                        'Chủ đề C',
                        '1. Đặc điểm của thông tin trong môi trường số',
                        'Bài 3: Thực hành: Khai thác thông tin số',
                        '<strong class="block font-semibold">Vận dụng</strong><div class="pl-2">– Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.</div>',
                        '0-0', '0-0', '1-0', '0-0'
                    ],
                    [
                        '2',
                        'Chủ đề C',
                        '2. Thông tin với giải quyết vấn đề',
                        'Bài 3: Thực hành: Khai thác thông tin số',
                        '<strong class="block font-semibold">Vận dụng</strong><div class="pl-2">– Chủ động tìm kiếm được thông tin để thực hiện nhiệm vụ (thông qua bài tập cụ thể).</div>',
                        '0-0', '0-0', '1-0', '0-0'
                    ]
                ]
            },
            availableCounts: [
                { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 1, TL: 0 }, VDC: { TN: 0, TL: 0 } },
                { NB: { TN: 0, TL: 0 }, TH: { TN: 0, TL: 0 }, VD: { TN: 1, TL: 0 }, VDC: { TN: 0, TL: 0 } }
            ]
        };

        syncCriteriaFromMatrixData(mockMatrixData, 'Lớp 8');
        const merged = getMergedCriteria('8', 'Bài 3: Thực hành: Khai thác thông tin số');
        expect(merged?.VD).toBeDefined();
        expect(merged?.VD.length).toBe(2);
        expect(merged?.VD[0].startsWith('3.1 ')).toBe(true);
        expect(merged?.VD[1].startsWith('3.2 ')).toBe(true);
    });
});
