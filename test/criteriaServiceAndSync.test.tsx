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
import MatrixBuilder from '../pages/MatrixBuilder';
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

    it('distributes questions evenly across examined lessons with equal periods instead of 7 - 6 - 1 skew', () => {
        const mockFs = {
            name: 'Thư mục gốc',
            type: 'folder',
            children: [
                {
                    name: 'Lớp 8 - Cuối kì I',
                    type: 'folder',
                    children: [
                        { name: 'Sơ lược về lịch sử phát triển máy tính', type: 'folder', children: [] },
                        { name: '1. Đặc điểm của thông tin trong môi trường số', type: 'folder', children: [] },
                        { name: '2. Thông tin với giải quyết vấn đề', type: 'folder', children: [] },
                        { name: 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số', type: 'folder', children: [] },
                        { name: '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', type: 'folder', children: [] },
                        { name: 'Lập trình trực quan', type: 'folder', children: [] }
                    ],
                    matrixData: {
                        matrixFormat: 'new_4part',
                        matrix: {
                            rows: [
                                ['1', 'Chủ đề A', 'Sơ lược về lịch sử phát triển máy tính', 'Bài 1: Lược sử công cụ tính toán', '2', '', '', '', '', '', '', '', '', '16.7', '2'],
                                ['2', 'Chủ đề C', '1. Đặc điểm của thông tin trong môi trường số', 'Bài 2: Thông tin trong môi trường số', '2', '', '', '', '', '', '', '', '', '16.7', '2'],
                                ['3', 'Chủ đề C', '2. Thông tin với giải quyết vấn đề', 'Bài 3: Thực hành: Khai thác thông tin số', '2', '', '', '', '', '', '', '', '', '16.7', '2'],
                                ['4', 'Chủ đề D', 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số', 'Bài 4: Đạo đức và văn hóa', '2', '', '', '', '', '', '', '', '', '16.7', '0'],
                                ['5', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 5: Sử dụng bảng tính', '2', '', '', '', '', '', '', '', '', '16.7', '0'],
                                ['6', 'Chủ đề F', 'Lập trình trực quan', 'Bài 12: Từ thuật toán đến chương trình', '2', '', '', '', '', '', '', '', '', '16.7', '0']
                            ]
                        },
                        specifications: {
                            rows: [
                                ['1', 'Chủ đề A', 'Sơ lược về lịch sử phát triển máy tính', 'Bài 1: Lược sử công cụ tính toán', '', '0-0', '0-0', '0-0', '0-0'],
                                ['2', 'Chủ đề C', '1. Đặc điểm của thông tin trong môi trường số', 'Bài 2: Thông tin trong môi trường số', '', '0-0', '0-0', '0-0', '0-0'],
                                ['3', 'Chủ đề C', '2. Thông tin với giải quyết vấn đề', 'Bài 3: Thực hành: Khai thác thông tin số', '', '0-0', '0-0', '0-0', '0-0'],
                                ['4', 'Chủ đề D', 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số', 'Bài 4: Đạo đức và văn hóa', '', '0-0', '0-0', '0-0', '0-0'],
                                ['5', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 5: Sử dụng bảng tính', '', '0-0', '0-0', '0-0', '0-0'],
                                ['6', 'Chủ đề F', 'Lập trình trực quan', 'Bài 12: Từ thuật toán đến chương trình', '', '0-0', '0-0', '0-0', '0-0']
                            ]
                        },
                        // Simulate imbalanced file counts that previously caused 7 - 6 - 1 skew
                        availableCounts: [
                            { NB: { TN: 10, TL: 0 }, TH: { TN: 2, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } },
                            { NB: { TN: 10, TL: 0 }, TH: { TN: 2, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } },
                            { NB: { TN: 0, TL: 0 }, TH: { TN: 1, TL: 0 }, VD: { TN: 0, TL: 0 }, VDC: { TN: 0, TL: 0 } },
                            { NB: { TN: 5, TL: 0 }, TH: { TN: 5, TL: 0 }, VD: { TN: 0, TL: 2 }, VDC: { TN: 0, TL: 1 } },
                            { NB: { TN: 5, TL: 0 }, TH: { TN: 5, TL: 0 }, VD: { TN: 0, TL: 2 }, VDC: { TN: 0, TL: 1 } },
                            { NB: { TN: 5, TL: 0 }, TH: { TN: 5, TL: 0 }, VD: { TN: 0, TL: 2 }, VDC: { TN: 0, TL: 1 } }
                        ]
                    }
                }
            ]
        };
        localStorage.setItem('matrixFileSystem', JSON.stringify(mockFs));

        render(<MatrixBuilder />);

        // Click to navigate into "Lớp 8 - Cuối kì I"
        const folderItem = screen.getByText('Lớp 8 - Cuối kì I');
        fireEvent.click(folderItem);

        // Click "Phân bổ"
        const distBtn = screen.getByText('Phân bổ');
        fireEvent.click(distBtn);

        const savedFs = JSON.parse(localStorage.getItem('matrixFileSystem') || '{}');
        const rows = savedFs.children[0].matrixData.matrix.rows;

        // First 3 rows (2 tiết, 2 tiết đã KT) must each get 4 or 5 TN questions evenly (5 - 5 - 4), NEVER 7 - 6 - 1!
        let totalExaminedQuestions = 0;
        let totalExaminedPercent = 0;
        for (let i = 0; i < 3; i++) {
            const nb = parseInt(rows[i][5] || '0', 10);
            const th = parseInt(rows[i][7] || '0', 10);
            const totalRowQ = nb + th;
            expect(totalRowQ).toBeGreaterThanOrEqual(4);
            expect(totalRowQ).toBeLessThanOrEqual(5);
            totalExaminedQuestions += totalRowQ;
            totalExaminedPercent += parseFloat(rows[i][13] || '0');
        }
        // Tổng tỷ lệ % đã kiểm tra cuối kỳ không vượt quá 35% (tối đa 14 câu TN = 3,5đ = 35%)
        expect(totalExaminedQuestions).toBeLessThanOrEqual(14);
        expect(totalExaminedPercent).toBeLessThanOrEqual(35.0);
    });
});
