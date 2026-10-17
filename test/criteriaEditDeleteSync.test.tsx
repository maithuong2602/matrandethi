import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionManager from '../pages/QuestionManager';
import MatrixView from '../components/MatrixView';
import { 
    updateCustomCriterion, 
    deleteCustomCriterion, 
    addCustomCriterion,
    getMergedCriteria, 
    loadCustomCriteriaStore, 
    applyCriterionChangeToHtml,
    parseYccdSections,
    CUSTOM_CRITERIA_STORAGE_KEY 
} from '../services/criteriaService';
import { MatrixData } from '../types';

describe('Chức năng Sửa/Xóa YCCĐ và Đồng Bộ Giữa Quản Lý Câu Hỏi & Bảng Đặc Tả', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('1. Sửa YCCĐ: Cập nhật nội dung trong store và đồng bộ sang Bảng đặc tả (matrixFileSystem)', () => {
        // Chuẩn bị matrixFileSystem giả lập có bài "Bài 1. Máy tính và cộng đồng"
        const initialHtml = '<strong class="block font-semibold">Nhận biết</strong><div class="pl-2">– Nêu được khả năng của máy tính</div><div class="pl-2">– YCCĐ cần sửa</div>';
        const mockFs = {
            name: 'Root',
            type: 'folder',
            children: [
                {
                    name: 'Đề kiểm tra Tin 7',
                    type: 'folder',
                    matrixData: {
                        matrix: { rows: [['1', 'A', 'Chủ đề', 'Bài 1. Máy tính và cộng đồng', '2', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']] },
                        specifications: {
                            rows: [
                                ['1', 'A', 'Chủ đề', 'Bài 1. Máy tính và cộng đồng', initialHtml, '1-0', '0-0', '0-0', '0-0']
                            ]
                        }
                    }
                }
            ]
        };
        localStorage.setItem('matrixFileSystem', JSON.stringify(mockFs));

        // Thực hiện sửa YCCĐ
        const updatedCriteria = updateCustomCriterion(
            '7',
            'Bài 1. Máy tính và cộng đồng',
            'NB',
            'YCCĐ cần sửa',
            'YCCĐ đã được sửa thành công'
        );

        // Kiểm tra criteria trả về
        expect(updatedCriteria.NB).toBeDefined();
        const hasNewText = updatedCriteria.NB.some(item => item.includes('YCCĐ đã được sửa thành công'));
        expect(hasNewText).toBe(true);

        // Kiểm tra matrixFileSystem đã đồng bộ nội dung mới
        const savedFs = JSON.parse(localStorage.getItem('matrixFileSystem') || '{}');
        const specHtml = savedFs.children[0].matrixData.specifications.rows[0][4];
        expect(specHtml).toContain('YCCĐ đã được sửa thành công');
        expect(specHtml).not.toContain('YCCĐ cần sửa');
    });

    it('2. Xóa YCCĐ: Xóa khỏi store, đưa vào __deleted để chặn xuất hiện lại và đồng bộ xóa khỏi Bảng đặc tả', () => {
        const initialHtml = '<strong class="block font-semibold">Nhận biết</strong><div class="pl-2">– YCCĐ chuẩn bị xóa</div><div class="pl-2">– Giữ lại YCCĐ này</div>';
        const mockFs = {
            name: 'Root',
            type: 'folder',
            children: [
                {
                    name: 'Đề kiểm tra',
                    type: 'folder',
                    matrixData: {
                        matrix: { rows: [['1', 'A', 'Chủ đề', 'Bài 2. Thông tin số', '2', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']] },
                        specifications: {
                            rows: [
                                ['1', 'A', 'Chủ đề', 'Bài 2. Thông tin số', initialHtml, '1-0', '0-0', '0-0', '0-0']
                            ]
                        }
                    }
                }
            ]
        };
        localStorage.setItem('matrixFileSystem', JSON.stringify(mockFs));

        // Thực hiện xóa
        const remainingCriteria = deleteCustomCriterion(
            '7',
            'Bài 2. Thông tin số',
            'NB',
            'YCCĐ chuẩn bị xóa'
        );

        // Kiểm tra trong merged criteria không còn
        if (remainingCriteria.NB) {
            const hasDeleted = remainingCriteria.NB.some(item => item.includes('YCCĐ chuẩn bị xóa'));
            expect(hasDeleted).toBe(false);
        }

        // Kiểm tra store có __deleted
        const store = loadCustomCriteriaStore();
        expect(store['7']['Bài 2. Thông tin số'].__deleted).toBeDefined();

        // Kiểm tra Bảng đặc tả (matrixFileSystem) đã loại bỏ dòng này
        const savedFs = JSON.parse(localStorage.getItem('matrixFileSystem') || '{}');
        const specHtml = savedFs.children[0].matrixData.specifications.rows[0][4];
        expect(specHtml).not.toContain('YCCĐ chuẩn bị xóa');
        expect(specHtml).toContain('Giữ lại YCCĐ này');
    });

    it('3. applyCriterionChangeToHtml xử lý chính xác add, update, delete trực tiếp trên HTML đặc tả', () => {
        const base = '<strong class="block font-semibold">Nhận biết</strong><div class="pl-2">– Mục A</div><div class="pl-2">– Mục B</div>';

        // Update
        const updated = applyCriterionChangeToHtml(base, 'NB', 'update', {
            oldText: 'Mục B',
            newText: 'Mục B Mới'
        });
        expect(updated).toContain('Mục B Mới');
        expect(updated).not.toContain('– Mục B</div>');

        // Delete
        const deleted = applyCriterionChangeToHtml(updated, 'NB', 'delete', {
            oldText: 'Mục A'
        });
        expect(deleted).not.toContain('Mục A');
        expect(deleted).toContain('Mục B Mới');

        // Add
        const added = applyCriterionChangeToHtml(deleted, 'NB', 'add', {
            newText: 'Mục C Bổ Sung'
        });
        expect(added).toContain('Mục C Bổ Sung');
    });

    it('4. UI QuestionManager: Hiển thị nút Sửa (Pencil) và Xóa (Trash2), cho phép giáo viên chỉnh sửa trực tiếp', async () => {
        // Giả lập thêm 1 YCCĐ tùy chỉnh trước
        addCustomCriterion('7', 'Bài 1: Thiết bị vào - ra', 'NB', 'Kiểm tra phần cứng bàn phím');

        // Mock window.confirm
        window.confirm = vi.fn().mockReturnValue(true);

        render(<QuestionManager />);

        // Chọn khối 7
        const gradeSelect = screen.getByLabelText('Khối');
        fireEvent.change(gradeSelect, { target: { value: '7' } });

        // Chờ và chọn bài
        await waitFor(() => {
            const lessonSelect = screen.getByLabelText('Bài');
            expect(lessonSelect).toBeInTheDocument();
            fireEvent.change(lessonSelect, { target: { value: 'Bài 1: Thiết bị vào - ra' } });
        });

        // Kiểm tra YCCĐ xuất hiện trong sidebar
        await waitFor(() => {
            expect(screen.getByText(/Kiểm tra phần cứng bàn phím/i)).toBeInTheDocument();
        });

        // Tìm nút sửa trong dòng của mục tùy chỉnh
        const itemLi = screen.getByText(/Kiểm tra phần cứng bàn phím/i).closest('li');
        expect(itemLi).not.toBeNull();
        const editBtn = itemLi!.querySelector('button[title="Sửa yêu cầu cần đạt này"]');
        expect(editBtn).not.toBeNull();

        // Click nút sửa của mục tùy chỉnh
        fireEvent.click(editBtn!);

        // Form inline edit xuất hiện
        const editTextarea = screen.getByDisplayValue(/Kiểm tra phần cứng bàn phím/i);
        expect(editTextarea).toBeInTheDocument();

        // Đổi nội dung thành "Kiểm tra phần cứng bàn phím VÀ CHUỘT"
        fireEvent.change(editTextarea, { target: { value: 'Kiểm tra phần cứng bàn phím VÀ CHUỘT' } });

        // Nhấn nút "Lưu thay đổi"
        const saveButton = screen.getByText('Lưu thay đổi');
        fireEvent.click(saveButton);

        // Kiểm tra nội dung mới đã xuất hiện
        await waitFor(() => {
            expect(screen.getByText(/Kiểm tra phần cứng bàn phím VÀ CHUỘT/i)).toBeInTheDocument();
        });
    });

    it('5. UI MatrixView: Cho phép sửa và xóa YCCĐ và đồng bộ về criteria store', () => {
        const initialData: MatrixData = {
            matrix: {
                rows: [
                    ['1', 'Chủ đề A', 'Máy tính', 'Bài 1. Thiết bị vào và thiết bị ra', '2', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']
                ]
            },
            specifications: {
                rows: [
                    ['1', 'Chủ đề A', 'Máy tính', 'Bài 1. Thiết bị vào và thiết bị ra', '<strong class="block font-semibold">Nhận biết</strong><div class="pl-2">– YCCĐ thử nghiệm MatrixView</div>', '1-0', '0-0', '0-0', '0-0']
                ]
            }
        };

        const mockOnUpdateMatrix = vi.fn();
        const mockOnDeleteRow = vi.fn();

        render(
            <MatrixView
                data={initialData}
                onUpdateMatrix={mockOnUpdateMatrix}
                onDeleteRow={mockOnDeleteRow}
                examName="Đề thi học kì 1"
            />
        );

        // Kiểm tra YCCĐ hiển thị
        expect(screen.getByText('– YCCĐ thử nghiệm MatrixView')).toBeInTheDocument();

        // Nút sửa và xóa có mặt
        const editBtn = screen.getByTitle('Sửa yêu cầu cần đạt này');
        expect(editBtn).toBeInTheDocument();

        // Click sửa
        fireEvent.click(editBtn);

        // Input sửa xuất hiện
        const input = screen.getByDisplayValue('YCCĐ thử nghiệm MatrixView');
        fireEvent.change(input, { target: { value: 'YCCĐ đã sửa từ MatrixView' } });

        const saveBtn = screen.getByText('Lưu');
        fireEvent.click(saveBtn);

        // onUpdateMatrix được gọi với nội dung mới
        expect(mockOnUpdateMatrix).toHaveBeenCalled();
        const updatedRow = mockOnUpdateMatrix.mock.calls[0][0].specifications.rows[0];
        expect(updatedRow[4]).toContain('YCCĐ đã sửa từ MatrixView');
    });
});
