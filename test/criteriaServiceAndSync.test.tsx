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

        // Kiểm tra Bản đặc tả phải khớp 100% số lượng câu hỏi với Ma trận ở mọi dòng
        const specRows = savedFs.children[0].matrixData.specifications.rows;
        const newFormatRows = savedFs.children[0].matrixData.newFormatRows;
        let totalMatrixQuestions = 0;
        let totalSpecQuestions = 0;

        for (let i = 0; i < rows.length; i++) {
            const mRow = rows[i];
            const sRow = specRows[i];
            const nfRow = newFormatRows[i];

            const mNB = (parseInt(mRow[5] || '0', 10) || 0) + (parseInt(mRow[6] || '0', 10) || 0);
            const mTH = (parseInt(mRow[7] || '0', 10) || 0) + (parseInt(mRow[8] || '0', 10) || 0);
            const mVD = (parseInt(mRow[9] || '0', 10) || 0) + (parseInt(mRow[10] || '0', 10) || 0) + (parseInt(mRow[11] || '0', 10) || 0) + (parseInt(mRow[12] || '0', 10) || 0);

            const [sNbTn, sNbTl] = String(sRow[5] || '0-0').split('-').map((n: string) => parseInt(n, 10) || 0);
            const [sThTn, sThTl] = String(sRow[6] || '0-0').split('-').map((n: string) => parseInt(n, 10) || 0);
            const [sVdTn, sVdTl] = String(sRow[7] || '0-0').split('-').map((n: string) => parseInt(n, 10) || 0);
            const [sVdcTn, sVdcTl] = String(sRow[8] || '0-0').split('-').map((n: string) => parseInt(n, 10) || 0);

            expect(sNbTn + sNbTl).toBe(mNB);
            expect(sThTn + sThTl).toBe(mTH);
            expect(sVdTn + sVdTl + sVdcTn + sVdcTl).toBe(mVD);

            const nfB = (nfRow.mc.B.count || 0) + (nfRow.tf.B.count || 0) + (nfRow.sa.B.count || 0) + (nfRow.essay.B.count || 0);
            const nfH = (nfRow.mc.H.count || 0) + (nfRow.tf.H.count || 0) + (nfRow.sa.H.count || 0) + (nfRow.essay.H.count || 0);
            const nfVD = (nfRow.mc.VD.count || 0) + (nfRow.tf.VD.count || 0) + (nfRow.sa.VD.count || 0) + (nfRow.essay.VD.count || 0);

            expect(nfB).toBe(mNB);
            expect(nfH).toBe(mTH);
            expect(nfVD).toBe(mVD);

            totalMatrixQuestions += mNB + mTH + mVD;
            totalSpecQuestions += (sNbTn + sNbTl) + (sThTn + sThTl) + (sVdTn + sVdTl + sVdcTn + sVdcTl);
        }

        expect(totalSpecQuestions).toBe(totalMatrixQuestions);
        expect(totalMatrixQuestions).toBe(31); // 28 câu TN + 3 câu TL = 31 câu
    });

    it('allocates exact 3-4-3 (MC - TF - Essay) and 4-3-3 (NB - TH - VD) ratios on 7-row Grade 8 Final Exam when Short Answer is disabled', () => {
        const mockFs = {
            name: 'Thư mục gốc',
            type: 'folder',
            children: [
                {
                    name: 'Lớp 8 - Cuối kì I (3-4-3 & 4-3-3)',
                    type: 'folder',
                    children: [],
                    matrixData: {
                        matrixFormat: 'new_4part',
                        newPointsConfig: {
                            mc: 0.25,
                            tf: 0.25,
                            sa: 0.25,
                            essay: 1.0,
                            useShortAnswer: false
                        },
                        matrix: {
                            rows: [
                                ['1', 'Chủ đề A', 'Sơ lược về lịch sử phát triển máy tính', 'Bài 1: Lược sử công cụ tính toán', '2', '', '', '', '', '', '', '', '', '14.3', '2'],
                                ['2', 'Chủ đề C', '1. Đặc điểm của thông tin trong môi trường số', 'Bài 2: Thông tin trong môi trường số', '2', '', '', '', '', '', '', '', '', '14.3', '2'],
                                ['3', 'Chủ đề C', '2. Thông tin với giải quyết vấn đề', 'Bài 3: Thực hành: Khai thác thông tin số', '2', '', '', '', '', '', '', '', '', '14.3', '2'],
                                ['4', 'Chủ đề D', 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số', 'Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số', '2', '', '', '', '', '', '', '', '', '14.3', '0'],
                                ['5', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế', '2', '', '', '', '', '', '', '', '', '14.3', '0'],
                                ['6', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 6: Sắp xếp và lọc dữ liệu', '2', '', '', '', '', '', '', '', '', '14.3', '0'],
                                ['7', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 7: Trình bày dữ liệu bằng biểu đồ', '2', '', '', '', '', '', '', '', '', '14.3', '0']
                            ]
                        },
                        specifications: {
                            rows: [
                                ['1', 'Chủ đề A', 'Sơ lược về lịch sử phát triển máy tính', 'Bài 1: Lược sử công cụ tính toán', '', '0-0', '0-0', '0-0', '0-0'],
                                ['2', 'Chủ đề C', '1. Đặc điểm của thông tin trong môi trường số', 'Bài 2: Thông tin trong môi trường số', '', '0-0', '0-0', '0-0', '0-0'],
                                ['3', 'Chủ đề C', '2. Thông tin với giải quyết vấn đề', 'Bài 3: Thực hành: Khai thác thông tin số', '', '0-0', '0-0', '0-0', '0-0'],
                                ['4', 'Chủ đề D', 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số', 'Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số', '', '0-0', '0-0', '0-0', '0-0'],
                                ['5', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế', '', '0-0', '0-0', '0-0', '0-0'],
                                ['6', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 6: Sắp xếp và lọc dữ liệu', '', '0-0', '0-0', '0-0', '0-0'],
                                ['7', 'Chủ đề E', '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử', 'Bài 7: Trình bày dữ liệu bằng biểu đồ', '', '0-0', '0-0', '0-0', '0-0']
                            ]
                        },
                        availableCounts: []
                    }
                }
            ]
        };
        localStorage.setItem('matrixFileSystem', JSON.stringify(mockFs));

        render(<MatrixBuilder />);

        const folderItem = screen.getByText('Lớp 8 - Cuối kì I (3-4-3 & 4-3-3)');
        fireEvent.click(folderItem);

        const distBtn = screen.getByText('Phân bổ');
        fireEvent.click(distBtn);

        const savedFs = JSON.parse(localStorage.getItem('matrixFileSystem') || '{}');
        const mData = savedFs.children[0].matrixData;
        const rows = mData.matrix.rows;
        const nfRows = mData.newFormatRows;

        let totalMC = 0, totalTF = 0, totalSA = 0, totalEssay = 0;
        let totalNB = 0, totalTH = 0, totalVD = 0;

        for (let i = 0; i < rows.length; i++) {
            const nf = nfRows[i];
            const rowMC = (nf.mc.B.count || 0) + (nf.mc.H.count || 0) + (nf.mc.VD.count || 0);
            const rowTF = (nf.tf.B.count || 0) + (nf.tf.H.count || 0) + (nf.tf.VD.count || 0);
            const rowSA = (nf.sa.B.count || 0) + (nf.sa.H.count || 0) + (nf.sa.VD.count || 0);
            const rowEssay = (nf.essay.B.count || 0) + (nf.essay.H.count || 0) + (nf.essay.VD.count || 0);

            totalMC += rowMC;
            totalTF += rowTF;
            totalSA += rowSA;
            totalEssay += rowEssay;

            totalNB += (nf.mc.B.count || 0) + (nf.tf.B.count || 0) + (nf.sa.B.count || 0) + (nf.essay.B.count || 0);
            totalTH += (nf.mc.H.count || 0) + (nf.tf.H.count || 0) + (nf.sa.H.count || 0) + (nf.essay.H.count || 0);
            totalVD += (nf.mc.VD.count || 0) + (nf.tf.VD.count || 0) + (nf.sa.VD.count || 0) + (nf.essay.VD.count || 0);

            // Mọi bài mới (Bài 4..Bài 7) đều phải có câu TNKQ (tỷ lệ điểm từ 15% - 17,5%, không bài nào bị rớt xuống 10%)
            if (i >= 3) {
                expect(rowMC + rowTF).toBeGreaterThanOrEqual(2);
                expect(parseFloat(rows[i][13])).toBeGreaterThanOrEqual(15.0);
                expect(parseFloat(rows[i][13])).toBeLessThanOrEqual(17.5);
            }
        }

        // 1. Kiểm tra tỷ lệ loại câu hỏi 3 - 4 - 3:
        // - Trắc nghiệm nhiều lựa chọn: 12 câu = 3,0 điểm (30%)
        // - Đúng – Sai: 16 ý = 4,0 điểm (40%)
        // - Tự luận: 3 câu = 3,0 điểm (30%)
        expect(totalMC).toBe(12);
        expect(totalTF).toBe(16);
        expect(totalSA).toBe(0);
        expect(totalEssay).toBe(3);

        // 2. Kiểm tra tỷ lệ mức độ nhận thức 4 - 3 - 3:
        // - Nhận biết (NB): 16 câu = 4,0 điểm (40%)
        // - Thông hiểu (TH): 12 câu = 3,0 điểm (30%)
        // - Vận dụng (VD): 3 câu = 3,0 điểm (30%)
        expect(totalNB).toBe(16);
        expect(totalTH).toBe(12);
        expect(totalVD).toBe(3);

        // 3. Kiểm tra Bài 3 và Bài 4 (không có YCCĐ Nhận biết trong Quản lý câu hỏi)
        // tuyệt đối KHÔNG bị cấp câu Nhận biết (Biết = 0) và mọi dòng có câu hỏi ở mức nào thì Bản đặc tả đều có YCCĐ mức đó (không bị rỗng)
        const bai3NB = (nfRows[2].mc.B.count || 0) + (nfRows[2].tf.B.count || 0);
        const bai4NB = (nfRows[3].mc.B.count || 0) + (nfRows[3].tf.B.count || 0);
        expect(bai3NB).toBe(0);
        expect(bai4NB).toBe(0);

        const specRows = mData.specifications.rows;
        for (let i = 0; i < rows.length; i++) {
            const nf = nfRows[i];
            const specHtml = String(specRows[i][4] || '');
            const rowB = (nf.mc.B.count || 0) + (nf.tf.B.count || 0) + (nf.sa.B.count || 0) + (nf.essay.B.count || 0);
            const rowH = (nf.mc.H.count || 0) + (nf.tf.H.count || 0) + (nf.sa.H.count || 0) + (nf.essay.H.count || 0);
            const rowVD = (nf.mc.VD.count || 0) + (nf.tf.VD.count || 0) + (nf.sa.VD.count || 0) + (nf.essay.VD.count || 0);

            if (rowB > 0) expect(specHtml).toMatch(/Nhận biết/i);
            if (rowH > 0) expect(specHtml).toMatch(/Thông hiểu/i);
            if (rowVD > 0) expect(specHtml).toMatch(/Vận dụng/i);
        }
    });
});
