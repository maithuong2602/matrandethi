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
    CUSTOM_CRITERIA_STORAGE_KEY,
    filterQuestionsByActiveCriteria,
    isQuestionCriteriaValidForLesson
} from '../services/criteriaService';
import { getRequirementsHtml } from '../utils';
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

    it('6. Đồng bộ 2 chiều: Sửa YCCĐ ở Câu hỏi -> tự động cập nhật sang Ma trận (cả dòng Chủ đề con chưa gắn tên bài và khi khởi tạo Ma trận mới)', () => {
        // Giả lập Ma trận đang lưu theo Chủ đề con (row[3] = "" rỗng, row[2] = "1. Thông tin và dữ liệu")
        const initialSubTopicHtml = getRequirementsHtml('Lớp 6', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu');
        const mockFs = {
            name: 'Root',
            type: 'folder',
            children: [
                {
                    name: 'Lớp 6 - Giữa kì I',
                    type: 'folder',
                    matrixData: {
                        matrix: { rows: [['1', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu', '', '2', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']] },
                        specifications: {
                            rows: [
                                ['1', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu', '', initialSubTopicHtml, '1-0', '0-0', '0-0', '0-0']
                            ]
                        }
                    }
                }
            ]
        };
        localStorage.setItem('matrixFileSystem', JSON.stringify(mockFs));

        // Giáo viên sửa YCCĐ 1.1 của Bài 1 trong Quản lý Câu hỏi
        const updated = updateCustomCriterion(
            '6',
            'Bài 1. Thông tin và dữ liệu',
            'NB',
            '1.1 Phân biệt được thông tin với vật mang tin.',
            'Phân biệt rõ thông tin và vật mang tin trong thực tế.'
        );

        // 1. Giữ nguyên vị trí 1.1 trong Quản lý Câu hỏi
        expect(updated.NB[0]).toBe('1.1 Phân biệt rõ thông tin và vật mang tin trong thực tế.');
        expect(updated.NB[1]).toContain('1.2 Nhận biết được sự khác nhau giữa thông tin và dữ liệu.');

        // 2. Dòng Chủ đề con trong matrixFileSystem đã được cập nhật
        const savedFs = JSON.parse(localStorage.getItem('matrixFileSystem') || '{}');
        const specHtml = savedFs.children[0].matrixData.specifications.rows[0][4];
        expect(specHtml).toContain('Phân biệt rõ thông tin và vật mang tin trong thực tế.');
        expect(specHtml).not.toContain('Phân biệt được thông tin với vật mang tin');

        // 3. Khi tạo Ma trận mới, getRequirementsHtml cũng trả về nội dung đã đồng bộ
        const freshHtml = getRequirementsHtml('Lớp 6', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu');
        expect(freshHtml).toContain('Phân biệt rõ thông tin và vật mang tin trong thực tế.');
    });

    it('7. Đồng bộ 2 chiều ngược lại: Sửa YCCĐ trên Ma trận (dòng Chủ đề con row[3] rỗng) -> tự động cập nhật về đúng Bài học trong Câu hỏi', () => {
        const subTopicHtml = getRequirementsHtml('Lớp 6', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu');
        const initialData: MatrixData = {
            matrix: {
                rows: [
                    ['1', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu', '', '2', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']
                ]
            },
            specifications: {
                rows: [
                    ['1', 'Chủ đề A. Máy tính và cộng đồng', '1. Thông tin và dữ liệu', '', subTopicHtml, '1-0', '0-0', '0-0', '0-0']
                ]
            }
        };

        render(
            <MatrixView
                data={initialData}
                onUpdateMatrix={vi.fn()}
                onDeleteRow={vi.fn()}
                examName="Lớp 6 - Giữa kì I"
            />
        );

        // Sửa dòng YCCĐ thuộc Bài 2 ("– Nêu được các bước cơ bản trong xử lí thông tin.") ngay trên dòng Chủ đề con của Ma trận
        const editBtns = screen.getAllByTitle('Sửa yêu cầu cần đạt này');
        // Dòng thứ 3 của mục Nhận biết là "– Nêu được các bước cơ bản trong xử lí thông tin." (thuộc Bài 2)
        fireEvent.click(editBtns[2]);

        const input = screen.getByDisplayValue(/Nêu được các bước cơ bản trong xử lí thông tin/i);
        fireEvent.change(input, { target: { value: 'Trình bày được 4 bước cơ bản trong xử lí thông tin máy tính.' } });
        fireEvent.click(screen.getByText('Lưu'));

        // Kiểm tra bên Quản lý câu hỏi: Bài 2 đã nhận nội dung mới ở đúng mã 1.1
        const mergedBai2 = getMergedCriteria('6', 'Bài 2. Xử lí thông tin');
        expect(mergedBai2?.NB[0]).toBe('1.1 Trình bày được 4 bước cơ bản trong xử lí thông tin máy tính.');
    });

    it('8. Xóa YCCĐ giữ nguyên mã các YCCĐ còn lại và chặn đưa vào các câu hỏi upload không thuộc YCCĐ hiện có của bài học', () => {
        // Bài 3 Khối 8 ban đầu có 3.1 và 3.2 ở mức Vận dụng (không có Nhận biết)
        const initialBai3 = getMergedCriteria('8', 'Bài 3: Thực hành: Khai thác thông tin số');
        expect(initialBai3?.NB || []).toHaveLength(0);
        expect(initialBai3?.VD).toHaveLength(2);

        // Xóa YCCĐ 3.1 trên Quản lý câu hỏi
        const afterDelete = deleteCustomCriterion(
            '8',
            'Bài 3: Thực hành: Khai thác thông tin số',
            'VD',
            '3.1 Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số. Nêu được ví dụ minh hoạ.'
        );

        // YCCĐ còn lại phải giữ nguyên mã 3.2 (không bị đánh số lại thành 3.1)
        expect(afterDelete.VD.length).toBe(1);
        expect(afterDelete.VD[0]).toContain('3.2 Chủ động tìm kiếm thông tin');

        // Bản đặc tả của Bài 3 chỉ hiển thị YCCĐ còn lại, không lấy nhầm Nhận biết của Bài 2 và không còn YCCĐ 3.1 đã xóa
        const specHtml = getRequirementsHtml(
            'Lớp 8',
            'Chủ đề C. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
            '1. Đặc điểm của thông tin trong môi trường số. Thông tin với giải quyết vấn đề',
            'Bài 3: Thực hành: Khai thác thông tin số'
        );
        expect(specHtml).not.toContain('Nhận biết');
        expect(specHtml).not.toContain('Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số');
        expect(specHtml).toContain('Chủ động tìm kiếm thông tin để thực hiện nhiệm vụ');

        // Giả lập upload file JSON chứa:
        // - Câu 1: mức NB (1.1) -> Bài 3 không có NB -> PHẢI BỊ CHẶN
        // - Câu 2: mức VD (3.1 đã bị xóa) -> PHẢI BỊ CHẶN
        // - Câu 3: mức VD (3.2 đang còn hiệu lực) -> ĐƯỢC ĐƯA VÀO
        const uploadedQuestions = [
            {
                id: 'q-nb',
                grade: '8',
                lesson: 'Bài 3: Thực hành: Khai thác thông tin số',
                level: 'NB',
                criteria: '1.1',
                content: 'Câu hỏi Nhận biết không có YCCĐ trong Bài 3'
            },
            {
                id: 'q-vd-deleted',
                grade: '8',
                lesson: 'Bài 3: Thực hành: Khai thác thông tin số',
                level: 'VD',
                criteria: '3.1 Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.',
                content: 'Câu hỏi thuộc YCCĐ 3.1 đã xóa'
            },
            {
                id: 'q-vd-valid',
                grade: '8',
                lesson: 'Bài 3: Thực hành: Khai thác thông tin số',
                level: 'VD',
                criteria: '3.2',
                content: 'Câu hỏi thuộc YCCĐ 3.2 hợp lệ'
            }
        ];

        const { valid, removedCount } = filterQuestionsByActiveCriteria(
            uploadedQuestions,
            '8',
            'Bài 3: Thực hành: Khai thác thông tin số'
        );

        expect(removedCount).toBe(2);
        expect(valid.length).toBe(1);
        expect(valid[0].id).toBe('q-vd-valid');
        expect(isQuestionCriteriaValidForLesson(uploadedQuestions[0], '8', 'Bài 3: Thực hành: Khai thác thông tin số')).toBe(false);
        expect(isQuestionCriteriaValidForLesson(uploadedQuestions[1], '8', 'Bài 3: Thực hành: Khai thác thông tin số')).toBe(false);
        expect(isQuestionCriteriaValidForLesson(uploadedQuestions[2], '8', 'Bài 3: Thực hành: Khai thác thông tin số')).toBe(true);
    });
});
