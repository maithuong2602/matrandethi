import React, { useState, useRef, useEffect } from 'react';
import { MatrixData, NewMatrixFormatRowConfig } from '../types';
import { formatDiem, buildMatrixNotesSummary } from '../utils';
import { Trash2, GripVertical, Plus, CheckSquare, Square, X, Pencil, Check, BookOpen, Layers } from 'lucide-react';
import { 
    syncCriteriaFromMatrixData,
    getLevelCodeFromTitle,
    detectGradeFromLessonOrContext,
    deleteCustomCriterion,
    updateCustomCriterion,
    addCustomCriterion
} from '../services/criteriaService';
import { THCS_COMPETENCIES, getDefaultCompetencyForTopic, createEmptyNewFormatRow } from '../data/matrixConstants';

interface MatrixViewProps {
    data: MatrixData;
    onUpdateMatrix: (newData: MatrixData) => void;
    onDeleteRow: (index: number) => void;
    onEditPercentage?: () => void;
    examName: string; // Added to check for Final Exam
}

type EditingCellState = {
    table: 'matrix' | 'spec';
    row: number;
    col: number;
} | null;

type EditingNewCellState = {
    table: 'matrix' | 'spec';
    row: number;
    part: 'mc' | 'tf' | 'sa' | 'essay';
    level: 'B' | 'H' | 'VD';
    subRowId?: string;
} | null;

interface NewFormatCellEditorProps {
    initialCount: number;
    initialCompetency: string;
    onSave: (newCount: number, newCompetency: string) => void;
    onCancel: () => void;
}

const NewFormatCellEditor: React.FC<NewFormatCellEditorProps> = ({
    initialCount,
    initialCompetency,
    onSave,
    onCancel
}) => {
    const [count, setCount] = useState<string>(initialCount > 0 ? initialCount.toString() : '');
    const [selectedNLs, setSelectedNLs] = useState<string[]>(
        initialCompetency ? initialCompetency.split(',').map(s => s.trim()).filter(Boolean) : ['NLa']
    );
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleNL = (code: string) => {
        setSelectedNLs(prev => {
            if (prev.includes(code)) {
                return prev.length > 1 ? prev.filter(c => c !== code) : prev;
            }
            return [...prev, code];
        });
    };

    const handleSave = () => {
        const parsedCount = parseInt(count, 10);
        const finalCount = isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;
        onSave(finalCount, selectedNLs.join(', ') || 'NLa');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleSave();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [count, selectedNLs]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-2 p-2.5 bg-white shadow-2xl rounded-xl border-2 border-indigo-500 z-40 min-w-[210px] text-left"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-700 font-bold whitespace-nowrap">Số câu/lệnh hỏi (n):</span>
                <input
                    autoFocus
                    type="number"
                    min="0"
                    className="w-16 text-center border border-indigo-400 rounded-lg p-1 outline-none text-xs font-bold bg-white"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                />
            </div>

            <div className="border-t border-gray-100 pt-1.5">
                <div className="text-[11px] font-bold text-gray-600 mb-1">Thành phần năng lực (THCS):</div>
                <div className="flex flex-wrap gap-1">
                    {THCS_COMPETENCIES.map(nl => {
                        const active = selectedNLs.includes(nl.code);
                        return (
                            <button
                                key={nl.code}
                                type="button"
                                onClick={() => toggleNL(nl.code)}
                                title={`${nl.code} - ${nl.shortName}: ${nl.description}`}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                    active
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50'
                                }`}
                            >
                                {nl.code}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-1.5 w-full pt-1">
                <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 text-center text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold py-1 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                    Lưu
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-center text-xs text-slate-500 hover:text-slate-700 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

interface QuestionCellEditorProps {
    initialCount: number;
    isTLColumn: boolean;
    initialTLPoint: number;
    onSave: (newCount: number, newPoint?: number) => void;
    onCancel: () => void;
}

const QuestionCellEditor: React.FC<QuestionCellEditorProps> = ({
    initialCount,
    isTLColumn,
    initialTLPoint,
    onSave,
    onCancel
}) => {
    const [count, setCount] = useState<string>(initialCount > 0 ? initialCount.toString() : '');
    const [point, setPoint] = useState<string>(initialTLPoint.toString());
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSave = () => {
        const parsedCount = parseInt(count, 10);
        const finalCount = isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;
        const parsedPoint = parseFloat(point);
        const finalPoint = isNaN(parsedPoint) || parsedPoint <= 0 ? initialTLPoint : parsedPoint;
        onSave(finalCount, isTLColumn ? finalPoint : undefined);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleSave();
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [count, point]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center gap-1.5 p-1.5 bg-white shadow-xl rounded-lg border-2 border-indigo-400 z-30 min-w-[110px]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between w-full gap-1">
                <span className="text-[11px] text-gray-600 font-semibold whitespace-nowrap">Số câu:</span>
                <input
                    autoFocus
                    type="number"
                    min="0"
                    className="w-14 text-center border border-sky-400 rounded p-1 outline-none text-xs font-bold bg-white"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                />
            </div>
            {isTLColumn && (
                <div className="flex items-center justify-between w-full gap-1 border-t border-indigo-100 pt-1">
                    <span className="text-[11px] text-indigo-700 font-bold whitespace-nowrap">Điểm/câu:</span>
                    <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="10"
                        className="w-14 text-center border border-indigo-400 rounded p-1 outline-none text-xs font-bold bg-indigo-50 text-indigo-800"
                        value={point}
                        onChange={(e) => setPoint(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            )}
            <div className="flex items-center gap-1 w-full mt-0.5">
                <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 text-center text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold py-1 rounded shadow-sm transition-colors"
                >
                    Xong
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-center text-xs text-slate-500 hover:text-slate-700 font-medium py-1 px-1.5 rounded hover:bg-slate-100 transition-colors"
                    title="Hủy"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

const MatrixView: React.FC<MatrixViewProps> = ({ data, onUpdateMatrix, onDeleteRow, examName }) => {
    const pointsTNKQ = data.pointsConfig?.pointsTNKQ ?? 0.25;
    const pointsTL = data.pointsConfig?.pointsTL ?? 1.0;
    const rowEssayPoints = data.pointsConfig?.rowEssayPoints ?? {};
    const [editingCell, setEditingCell] = useState<EditingCellState>(null);
    const [editingNewCell, setEditingNewCell] = useState<EditingNewCellState>(null);
    const [showCompetencyGuide, setShowCompetencyGuide] = useState<boolean>(false);
    const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
    const [isEditingCustomNote, setIsEditingCustomNote] = useState<boolean>(false);
    const [customNoteDraft, setCustomNoteDraft] = useState<string>(data.customNote || '');

    const isNewFormat = data.matrixFormat === 'new_4part';
    const mcPoint = data.newPointsConfig?.mcPoint ?? 0.25;
    const tfPoint = data.newPointsConfig?.tfPoint ?? 0.25;
    const saPoint = data.newPointsConfig?.saPoint ?? 0.25;
    const essayPoint = data.newPointsConfig?.essayPoint ?? pointsTL;
    const useShortAnswer = data.newPointsConfig?.useShortAnswer !== false;
    const activeParts: ('mc' | 'tf' | 'sa' | 'essay')[] = useShortAnswer
        ? ['mc', 'tf', 'sa', 'essay']
        : ['mc', 'tf', 'essay'];

    const getRowNewFormatConfig = (rIdx: number): NewMatrixFormatRowConfig => {
        const existing = data.newFormatRows?.[rIdx];
        const row = data.matrix.rows[rIdx] || [];
        const defaultNL = getDefaultCompetencyForTopic(String(row[1] || ''), String(row[2] || ''));
        if (existing) {
            return existing;
        }
        // Fallback auto-convert from classic columns if not yet set
        const nbTn = parseInt(String(row[5] || '0'), 10) || 0;
        const nbTl = parseInt(String(row[6] || '0'), 10) || 0;
        const thTn = parseInt(String(row[7] || '0'), 10) || 0;
        const thTl = parseInt(String(row[8] || '0'), 10) || 0;
        const vdTn = parseInt(String(row[9] || '0'), 10) || 0;
        const vdTl = (parseInt(String(row[10] || '0'), 10) || 0) + (parseInt(String(row[12] || '0'), 10) || 0);
        const cfg = createEmptyNewFormatRow(defaultNL);
        cfg.mc.B.count = nbTn;
        cfg.mc.H.count = thTn;
        cfg.mc.VD.count = vdTn;
        cfg.essay.B.count = nbTl;
        cfg.essay.H.count = thTl;
        cfg.essay.VD.count = vdTl;
        return cfg;
    };

    const handleSwitchMatrixFormat = (format: 'classic' | 'new_4part') => {
        const newData: MatrixData = JSON.parse(JSON.stringify(data));
        newData.matrixFormat = format;
        if (format === 'new_4part' && !newData.newFormatRows) {
            newData.newFormatRows = {};
            newData.matrix.rows.forEach((_, idx) => {
                newData.newFormatRows![idx] = getRowNewFormatConfig(idx);
            });
        }
        handleUpdateMatrixWithSync(newData);
    };

    const handleToggleShortAnswer = (enabled: boolean) => {
        const newData: MatrixData = JSON.parse(JSON.stringify(data));
        if (!newData.newPointsConfig) newData.newPointsConfig = {};
        newData.newPointsConfig.useShortAnswer = enabled;

        if (!newData.newFormatRows) newData.newFormatRows = {};
        for (let i = 0; i < newData.matrix.rows.length; i++) {
            if (!newData.newFormatRows[i]) {
                newData.newFormatRows[i] = getRowNewFormatConfig(i);
            }
            const rowCfg = newData.newFormatRows[i];
            if (!enabled) {
                // Tự động đẩy số câu từ Trả lời ngắn / Điền khuyết sang câu hỏi Đúng – Sai cùng mức độ
                (['B', 'H', 'VD'] as const).forEach(lvl => {
                    const saCount = rowCfg.sa[lvl]?.count || 0;
                    if (saCount > 0) {
                        rowCfg.tf[lvl].count = (rowCfg.tf[lvl]?.count || 0) + saCount;
                        rowCfg.sa[lvl].count = 0;
                    }
                });
                if (rowCfg.subRowCells) {
                    Object.keys(rowCfg.subRowCells).forEach(k => {
                        if (k.includes('_sa_')) {
                            const sc = rowCfg.subRowCells![k];
                            const tfKey = k.replace('_sa_', '_tf_');
                            if (sc && sc.count > 0) {
                                if (rowCfg.subRowCells![tfKey]) {
                                    rowCfg.subRowCells![tfKey].count += sc.count;
                                } else {
                                    rowCfg.subRowCells![tfKey] = { ...sc };
                                }
                            }
                            delete rowCfg.subRowCells![k];
                        }
                    });
                }
            }
        }

        // Nếu bật lại Trả lời ngắn mà hiện tại tổng sa = 0 và tổng tf đang giữ phần cộng dồn (> 8), tự động tách trả lại
        if (enabled) {
            let totalSA = 0;
            let totalTF_B = 0;
            let totalTF_H = 0;
            for (let i = 0; i < newData.matrix.rows.length; i++) {
                const rc = newData.newFormatRows[i];
                totalSA += (rc.sa.B.count || 0) + (rc.sa.H.count || 0) + (rc.sa.VD.count || 0);
                totalTF_B += rc.tf.B.count || 0;
                totalTF_H += rc.tf.H.count || 0;
            }
            if (totalSA === 0 && (totalTF_B + totalTF_H > 8)) {
                let moveB = Math.floor(totalTF_B / 2);
                let moveH = Math.floor(totalTF_H / 2);
                for (let i = newData.matrix.rows.length - 1; i >= 0; i--) {
                    const rc = newData.newFormatRows[i];
                    if (moveB > 0 && rc.tf.B.count > 0) {
                        const take = Math.min(moveB, Math.ceil(rc.tf.B.count / 2));
                        rc.tf.B.count -= take;
                        rc.sa.B.count += take;
                        moveB -= take;
                    }
                    if (moveH > 0 && rc.tf.H.count > 0) {
                        const take = Math.min(moveH, Math.ceil(rc.tf.H.count / 2));
                        rc.tf.H.count -= take;
                        rc.sa.H.count += take;
                        moveH -= take;
                    }
                    // Clear custom subRowCells on _tf_ if counts were redistributed at row level
                    if (rc.subRowCells) {
                        Object.keys(rc.subRowCells).forEach(k => {
                            if (k.includes('_tf_')) delete rc.subRowCells![k];
                        });
                    }
                }
            }
        }

        handleUpdateMatrixWithSync(newData);
    };

    const handleNewFormatCellSave = (
        rowIndex: number,
        part: 'mc' | 'tf' | 'sa' | 'essay',
        level: 'B' | 'H' | 'VD',
        newCount: number,
        newCompetency: string,
        subRowId?: string,
        defaultSubRowIdForLevel?: string
    ) => {
        const newData: MatrixData = JSON.parse(JSON.stringify(data));
        if (!newData.newFormatRows) newData.newFormatRows = {};
        for (let i = 0; i < newData.matrix.rows.length; i++) {
            if (!newData.newFormatRows[i]) {
                newData.newFormatRows[i] = getRowNewFormatConfig(i);
            }
        }
        const rowCfg = newData.newFormatRows[rowIndex];
        const fallbackNL = getDefaultCompetencyForTopic(String(newData.matrix.rows[rowIndex]?.[1] || ''), String(newData.matrix.rows[rowIndex]?.[2] || ''));
        const suffix = `_${part}_${level}`;

        if (subRowId) {
            if (!rowCfg.subRowCells) rowCfg.subRowCells = {};
            const existingKeysForPartLevel = Object.keys(rowCfg.subRowCells).filter(k => k.endsWith(suffix));

            // Nếu chưa từng chia nhỏ theo từng dòng YCCĐ và đang sửa đúng dòng mặc định -> cập nhật trực tiếp
            if (existingKeysForPartLevel.length === 0 && subRowId === defaultSubRowIdForLevel) {
                rowCfg[part][level] = {
                    count: newCount,
                    competency: newCompetency || fallbackNL
                };
            } else {
                // Lưu riêng trên dòng YCCĐ / mức độ được chọn và cộng tổng lên Ma trận
                const cellKey = `${subRowId}${suffix}`;
                if (newCount > 0) {
                    rowCfg.subRowCells[cellKey] = {
                        count: newCount,
                        competency: newCompetency || fallbackNL
                    };
                } else {
                    delete rowCfg.subRowCells[cellKey];
                }

                const updatedKeys = Object.keys(rowCfg.subRowCells).filter(k => k.endsWith(suffix));
                const sumSubCounts = updatedKeys.reduce((acc, k) => acc + (rowCfg.subRowCells![k]?.count || 0), 0);
                const firstActiveNL = updatedKeys.map(k => rowCfg.subRowCells![k]?.competency).find(Boolean) || newCompetency || fallbackNL;
                rowCfg[part][level] = {
                    count: sumSubCounts,
                    competency: firstActiveNL
                };
            }
        } else {
            // Sửa từ Bảng Ma trận -> cập nhật tổng và xóa chia lẻ cũ của ô đó nếu có
            if (rowCfg.subRowCells) {
                Object.keys(rowCfg.subRowCells).forEach(k => {
                    if (k.endsWith(suffix)) delete rowCfg.subRowCells![k];
                });
            }
            rowCfg[part][level] = {
                count: newCount,
                competency: newCompetency || fallbackNL
            };
        }

        // Sync totals back to classic matrix & specification columns
        const totalB_TN = rowCfg.mc.B.count + rowCfg.tf.B.count + rowCfg.sa.B.count;
        const totalH_TN = rowCfg.mc.H.count + rowCfg.tf.H.count + rowCfg.sa.H.count;
        const totalVD_TN = rowCfg.mc.VD.count + rowCfg.tf.VD.count + rowCfg.sa.VD.count;
        const totalB_TL = rowCfg.essay.B.count;
        const totalH_TL = rowCfg.essay.H.count;
        const totalVD_TL = rowCfg.essay.VD.count;

        const mRow = newData.matrix.rows[rowIndex];
        if (mRow) {
            mRow[5] = totalB_TN > 0 ? totalB_TN.toString() : '';
            mRow[6] = totalB_TL > 0 ? totalB_TL.toString() : '';
            mRow[7] = totalH_TN > 0 ? totalH_TN.toString() : '';
            mRow[8] = totalH_TL > 0 ? totalH_TL.toString() : '';
            mRow[9] = totalVD_TN > 0 ? totalVD_TN.toString() : '';
            mRow[10] = totalVD_TL > 0 ? totalVD_TL.toString() : '';
        }
        const sRow = newData.specifications?.rows?.[rowIndex];
        if (sRow) {
            sRow[5] = `${totalB_TN}-${totalB_TL}`;
            sRow[6] = `${totalH_TN}-${totalH_TL}`;
            sRow[7] = `${totalVD_TN}-${totalVD_TL}`;
        }

        handleUpdateMatrixWithSync(newData);
        setEditingNewCell(null);
    };

    const handleUpdateMatrixWithSync = (newData: MatrixData) => {
        try {
            syncCriteriaFromMatrixData(newData, examName);
        } catch (e) {
            console.error('Failed to sync criteria from matrix:', e);
        }
        onUpdateMatrix(newData);
    };

    useEffect(() => {
        if (data?.specifications?.rows) {
            try {
                syncCriteriaFromMatrixData(data, examName);
            } catch (e) {
                console.error('Failed initial criteria sync:', e);
            }
        }
    }, [data, examName]);

    const getRowPointsTL = (rIdx: number) => {
        return rowEssayPoints[rIdx] ?? pointsTL;
    };

    const handleUpdatePointsTL = (newVal: number) => {
        const val = isNaN(newVal) || newVal <= 0 ? 1.0 : newVal;
        const newData = JSON.parse(JSON.stringify(data));
        if (!newData.pointsConfig) newData.pointsConfig = {};
        newData.pointsConfig.pointsTL = val;
        handleUpdateMatrixWithSync(newData);
    };

    const handleUpdateRowEssayPoints = (rIdx: number, newVal: number) => {
        const val = isNaN(newVal) || newVal <= 0 ? pointsTL : newVal;
        const newData = JSON.parse(JSON.stringify(data));
        if (!newData.pointsConfig) newData.pointsConfig = {};
        if (!newData.pointsConfig.rowEssayPoints) newData.pointsConfig.rowEssayPoints = {};
        newData.pointsConfig.rowEssayPoints[rIdx] = val;
        handleUpdateMatrixWithSync(newData);
    };

    // Determine if it is a Final Exam
    const isFinalExam = /cuối\s+k[ìỳ]/i.test(examName);

    // --- Dynamic Weight Calculation Logic ---
    let sumSoTietChecked = 0; // Total periods ALREADY EXAMINED
    let sumSoTietUnchecked = 0; // Total periods NEW
    let totalSoTietAll = 0;

    data.matrix.rows.forEach(r => {
        const st = parseFloat(String(r[4]) || '0');
        const examined = parseFloat(String(r[14]) || '0'); // Column 14 is now numeric
        
        // Validation: examined cannot exceed total
        const validExamined = Math.min(Math.max(examined, 0), st);
        const validNew = Math.max(st - validExamined, 0);

        totalSoTietAll += st;
        sumSoTietChecked += validExamined;
        sumSoTietUnchecked += validNew;
    });

    // Calculate Target Score for Old Pool (Min 30%, Max 40%)
    let targetPercentOld = 0;
    if (totalSoTietAll > 0) {
        if (sumSoTietChecked > 0 && sumSoTietUnchecked === 0) {
            targetPercentOld = 100;
        } else if (sumSoTietChecked === 0) {
            targetPercentOld = 0;
        } else {
            // Natural ratio based purely on periods
            const naturalPercent = (sumSoTietChecked / totalSoTietAll) * 100;
            // Clamp strictly between 30% and 40% for mixed exams
            targetPercentOld = Math.max(30, Math.min(40, naturalPercent));
        }
    }
    const targetPercentNew = 100 - targetPercentOld;

    // Calculate ACTUAL percentages for Note display
    const actualPercentOld = totalSoTietAll > 0 ? (sumSoTietChecked / totalSoTietAll) * 100 : 0;
    const actualPercentNew = totalSoTietAll > 0 ? (sumSoTietUnchecked / totalSoTietAll) * 100 : 0;

    // Helper to get weighted row percent for display
    const getWeightedRowPercent = (row: any[]) => {
        const st = parseFloat(String(row[4]) || '0');
        const examined = parseFloat(String(row[14]) || '0');
        
        const validExamined = Math.min(Math.max(examined, 0), st);
        const validNew = Math.max(st - validExamined, 0);
        
        if (totalSoTietAll === 0) return '0.0';

        let percentFromOld = 0;
        let percentFromNew = 0;

        if (sumSoTietChecked > 0) {
            percentFromOld = (validExamined / sumSoTietChecked) * targetPercentOld;
        }
        if (sumSoTietUnchecked > 0) {
            percentFromNew = (validNew / sumSoTietUnchecked) * targetPercentNew;
        }

        return (percentFromOld + percentFromNew).toFixed(1);
    };
    // ----------------------------------------

    // Group rows by Main Topic -> Sub Topic
    const groupedRows = data.matrix.rows.reduce((acc, row, index) => {
        const mainTopic = row[1];
        const subTopic = row[2];
        
        let lastMainGroup = acc[acc.length - 1];
        if (lastMainGroup && lastMainGroup[0][0].row[1] === mainTopic) {
            let lastSubGroup = lastMainGroup[lastMainGroup.length - 1];
            if (lastSubGroup && lastSubGroup[0].row[2] === subTopic) {
                lastSubGroup.push({row: row as unknown as string[], index});
            } else {
                lastMainGroup.push([{row: row as unknown as string[], index}]);
            }
        } else {
            acc.push([[{row: row as unknown as string[], index}]]);
        }
        return acc;
    }, [] as {row: string[], index: number}[][][]);

    // Calculate totals based on columns 5-12 (Question Counts)
    const matrixTotals = Array(15).fill(0);

    data.matrix.rows.forEach(row => {
        for (let i = 5; i <= 12; i++) {
            matrixTotals[i] += parseInt(String(row[i]), 10) || 0;
        }
    });

    // Indices: 5:NB_TN, 6:NB_TL, 7:TH_TN, 8:TH_TL, 9:VD_TN, 10:VD_TL, 11:VDC_TN, 12:VDC_TL
    let nbPoints = 0;
    let thPoints = 0;
    let vdPoints = 0;
    let vdcPoints = 0;

    data.matrix.rows.forEach((row, rIdx) => {
        const rowPointsTL = getRowPointsTL(rIdx);
        nbPoints += (parseInt(String(row[5]) || '0') * pointsTNKQ) + (parseInt(String(row[6]) || '0') * rowPointsTL);
        thPoints += (parseInt(String(row[7]) || '0') * pointsTNKQ) + (parseInt(String(row[8]) || '0') * rowPointsTL);
        vdPoints += (parseInt(String(row[9]) || '0') * pointsTNKQ) + (parseInt(String(row[10]) || '0') * rowPointsTL);
        vdcPoints += (parseInt(String(row[11]) || '0') * pointsTNKQ) + (parseInt(String(row[12]) || '0') * rowPointsTL);
    });
    
    const totalTestPoints = nbPoints + thPoints + vdPoints + vdcPoints; 

    // Calculate percentage based on 10-point scale (standard exam)
    const calculatePercentage = (points: number) => (points / 10 * 100);
    const nb_percent = calculatePercentage(nbPoints);
    const th_percent = calculatePercentage(thPoints);
    const vd_percent = calculatePercentage(vdPoints);
    const vdc_percent = calculatePercentage(vdcPoints);

    // --- Calculate Question Positions ---
    const positionMap: Record<string, string> = {};
    let tnkqCounter = 1;
    let tlCounter = 1;

    // 1. Process TNKQ (Columns: 5, 7, 9, 11)
    [5, 7, 9, 11].forEach(colIdx => {
        data.matrix.rows.forEach((row, rIdx) => {
            const count = parseInt(String(row[colIdx]) || '0');
            if (count > 0) {
                const start = tnkqCounter;
                const end = tnkqCounter + count - 1;
                positionMap[`${rIdx}-${colIdx}`] = start === end ? `Câu ${start}` : `Câu ${start}-${end}`;
                tnkqCounter += count;
            }
        });
    });

    // 2. Process TL (Columns: 6, 8, 10, 12)
    [6, 8, 10, 12].forEach(colIdx => {
        data.matrix.rows.forEach((row, rIdx) => {
            const count = parseInt(String(row[colIdx]) || '0');
            if (count > 0) {
                const start = tlCounter;
                const end = tlCounter + count - 1;
                positionMap[`${rIdx}-${colIdx}`] = start === end ? `Câu ${start} (TL)` : `Câu ${start}-${end} (TL)`;
                tlCounter += count;
            }
        });
    });

    // 3. Process New 4-Part Format Question Positions (by row and level B, H, VD)
    const newFormatPosMap: Record<string, string[]> = {};
    const partShortLabel: Record<'mc' | 'tf' | 'sa' | 'essay', string> = {
        mc: 'NLC',
        tf: 'Đ-S',
        sa: 'TLN',
        essay: 'TL'
    };
    activeParts.forEach(pKey => {
        let pCounter = 1;
        (['B', 'H', 'VD'] as const).forEach(lKey => {
            data.matrix.rows.forEach((_, rIdx) => {
                const cfg = getRowNewFormatConfig(rIdx);
                const c = cfg[pKey][lKey]?.count || 0;
                if (c > 0) {
                    const start = pCounter;
                    const end = pCounter + c - 1;
                    const prefix = pKey === 'tf' ? 'Ý' : 'Câu';
                    const rangeStr = start === end ? `${prefix} ${start} (${partShortLabel[pKey]})` : `${prefix} ${start}-${end} (${partShortLabel[pKey]})`;
                    const mapKey = `${rIdx}-${lKey}`;
                    if (!newFormatPosMap[mapKey]) newFormatPosMap[mapKey] = [];
                    newFormatPosMap[mapKey].push(rangeStr);
                    pCounter += c;
                }
            });
        });
    });


    const handleQuestionCellSave = (
        rowIndex: number,
        colIndex: number,
        newCount: number,
        newTLPoint?: number
    ) => {
        const newData = JSON.parse(JSON.stringify(data));
        const countStr = newCount > 0 ? newCount.toString() : '';

        // Update Matrix Value
        newData.matrix.rows[rowIndex][colIndex] = countStr;

        // Sync Specifications string
        if (newData.specifications?.rows?.[rowIndex]) {
            const specRow = newData.specifications.rows[rowIndex];
            const parsePart = (val: any) => {
                const parts = (val ? String(val) : '0-0').split('-').map(n => parseInt(n.trim(), 10) || 0);
                return [parts[0] || 0, parts[1] || 0];
            };

            let [nb_tn, nb_tl] = parsePart(specRow[5]);
            let [th_tn, th_tl] = parsePart(specRow[6]);
            let [vd_tn, vd_tl] = parsePart(specRow[7]);
            let [vdc_tn, vdc_tl] = parsePart(specRow[8]);

            if (colIndex === 5) nb_tn = newCount;
            if (colIndex === 6) nb_tl = newCount;
            if (colIndex === 7) th_tn = newCount;
            if (colIndex === 8) th_tl = newCount;
            if (colIndex === 9) vd_tn = newCount;
            if (colIndex === 10) vd_tl = newCount;
            if (colIndex === 11) vdc_tn = newCount;
            if (colIndex === 12) vdc_tl = newCount;

            specRow[5] = `${nb_tn}-${nb_tl}`;
            specRow[6] = `${th_tn}-${th_tl}`;
            specRow[7] = `${vd_tn}-${vd_tl}`;
            specRow[8] = `${vdc_tn}-${vdc_tl}`;
        }

        // Update essay points if custom TL point was provided
        if (newTLPoint !== undefined && !isNaN(newTLPoint) && newTLPoint > 0) {
            if (!newData.pointsConfig) newData.pointsConfig = {};
            if (!newData.pointsConfig.rowEssayPoints) newData.pointsConfig.rowEssayPoints = {};
            newData.pointsConfig.rowEssayPoints[rowIndex] = newTLPoint;
        }

        handleUpdateMatrixWithSync(newData);
        setEditingCell(null);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
        const newData = JSON.parse(JSON.stringify(data));
        
        if (colIndex === 4) { // So Tiet Change
            const newSoTiet = parseFloat(newValue) || 0;
            newData.matrix.rows[rowIndex][4] = newSoTiet.toString();
            // Validate "Examined" column to not exceed new Total
            const currentExamined = parseInt(newData.matrix.rows[rowIndex][14] || '0', 10);
            if (currentExamined > newSoTiet) {
                newData.matrix.rows[rowIndex][14] = Math.floor(newSoTiet).toString();
            }
            handleUpdateMatrixWithSync(newData);
            setEditingCell(null);
            return;
        }
        
        if (colIndex === 14) { // "So tiet da thi" Change (INTEGER)
             const soTiet = parseFloat(newData.matrix.rows[rowIndex][4] || '0');
             let examined = parseInt(newValue, 10); // Changed to parseInt
             if (isNaN(examined) || examined < 0) examined = 0;
             if (examined > soTiet) examined = Math.floor(soTiet); // Cap at total (floored)
             
             newData.matrix.rows[rowIndex][14] = examined.toString();
             handleUpdateMatrixWithSync(newData);
             setEditingCell(null); // Close input on blur/enter
             return;
        }
        
        const count = parseInt(newValue, 10);
        handleQuestionCellSave(rowIndex, colIndex, isNaN(count) ? 0 : Math.max(0, count));
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, groupIndex: number) => {
        setDraggedGroupIndex(groupIndex);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', groupIndex.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent, targetGroupIndex: number) => {
        e.preventDefault();
        if (draggedGroupIndex === null || draggedGroupIndex === targetGroupIndex) return;

        // 1. Reorder the groupedRows array
        const newGroups = [...groupedRows];
        const [movedGroup] = newGroups.splice(draggedGroupIndex, 1);
        newGroups.splice(targetGroupIndex, 0, movedGroup);

        // 2. Flatten back to rows and availableCounts
        const newMatrixRows: string[][] = [];
        const newSpecRows: string[][] = [];
        const newAvailableCounts: any[] = [];

        let currentSTT = 1;

        newGroups.forEach(mainGroup => {
            mainGroup.forEach(subGroup => {
                subGroup.forEach(item => {
                    const originalIdx = item.index;
                    
                    // Copy original data
                    const originalMatrixRow = data.matrix.rows[originalIdx];
                    const originalSpecRow = data.specifications.rows[originalIdx];
                    
                    // Update STT column (Index 0)
                    const updatedMatrixRow = [...originalMatrixRow];
                    updatedMatrixRow[0] = currentSTT.toString();

                    const updatedSpecRow = [...originalSpecRow];
                    updatedSpecRow[0] = currentSTT.toString();

                    newMatrixRows.push(updatedMatrixRow);
                    newSpecRows.push(updatedSpecRow);
                    newAvailableCounts.push(data.availableCounts[originalIdx]);
                    
                    currentSTT++;
                });
            });
        });

        // 3. Update Parent Data
        const newData: MatrixData = {
            ...data,
            matrix: { rows: newMatrixRows },
            specifications: { rows: newSpecRows },
            availableCounts: newAvailableCounts
        };

        handleUpdateMatrixWithSync(newData);
        setDraggedGroupIndex(null);
    };

    // --- YCCĐ (Mức độ đánh giá) Checkbox & Dynamic Item Handlers ---
    const STANDARD_LEVELS = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];

    interface YccdSection {
        levelTitle: string;
        items: { id: string; text: string; checked: boolean }[];
    }

    const parseYccdHtml = (htmlContent: string): YccdSection[] => {
        if (!htmlContent) return [];
        // Match sections by <strong> tags
        const regex = /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi;
        const sections: YccdSection[] = [];
        let match;

        while ((match = regex.exec(htmlContent)) !== null) {
            const levelTitle = match[1].trim();
            const bodyHtml = match[2];
            const items: { id: string; text: string; checked: boolean }[] = [];

            // Extract each <div ...>...</div>
            const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
            let divMatch;
            let idx = 0;
            while ((divMatch = divRegex.exec(bodyHtml)) !== null) {
                const attrs = divMatch[1];
                const text = divMatch[2].trim();
                const isUnchecked = /data-unchecked="true"/i.test(attrs);
                items.push({
                    id: `${levelTitle}-${idx++}`,
                    text: text,
                    checked: !isUnchecked
                });
            }

            sections.push({
                levelTitle,
                items
            });
        }

        // If no <strong> level tag found, create a fallback section
        if (sections.length === 0 && htmlContent.trim()) {
            const items: { id: string; text: string; checked: boolean }[] = [];
            const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
            let divMatch;
            let idx = 0;
            while ((divMatch = divRegex.exec(htmlContent)) !== null) {
                const attrs = divMatch[1];
                const text = divMatch[2].trim();
                const isUnchecked = /data-unchecked="true"/i.test(attrs);
                items.push({
                    id: `default-${idx++}`,
                    text: text,
                    checked: !isUnchecked
                });
            }
            if (items.length > 0) {
                sections.push({ levelTitle: '', items });
            } else {
                const lines = htmlContent.split('\n').map(l => l.trim()).filter(Boolean);
                lines.forEach(line => {
                    items.push({
                        id: `default-${idx++}`,
                        text: line,
                        checked: true
                    });
                });
                if (items.length > 0) {
                    sections.push({ levelTitle: '', items });
                }
            }
        }

        return sections;
    };

    const serializeYccdSections = (sections: YccdSection[]): string => {
        let result = '';
        sections.forEach((sec, sIdx) => {
            if (sec.levelTitle) {
                const marginTopClass = sIdx === 0 ? '' : 'mt-2';
                result += `<strong class="block font-semibold ${marginTopClass}">${sec.levelTitle}</strong>`;
            }
            sec.items.forEach(it => {
                const uncheckedAttr = !it.checked ? ' data-unchecked="true"' : '';
                result += `<div class="pl-2"${uncheckedAttr}>${it.text}</div>`;
            });
        });
        return result;
    };

    const handleToggleYccd = (rowIndex: number, sectionIdx: number, itemIdx: number) => {
        const currentReq = data.specifications.rows[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);
        if (sections[sectionIdx]?.items[itemIdx]) {
            sections[sectionIdx].items[itemIdx].checked = !sections[sectionIdx].items[itemIdx].checked;
            const newHtml = serializeYccdSections(sections);
            const newData = JSON.parse(JSON.stringify(data));
            newData.specifications.rows[rowIndex][4] = newHtml;
            handleUpdateMatrixWithSync(newData);
        }
    };

    const handleAddYccd = (rowIndex: number, sectionIdx: number, newText: string) => {
        const trimmed = newText.trim();
        if (!trimmed) return;
        const currentReq = data.specifications.rows[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);
        if (sections[sectionIdx]) {
            const formattedText = trimmed.startsWith('–') || trimmed.startsWith('-') ? trimmed : `– ${trimmed}`;
            sections[sectionIdx].items.push({
                id: `${sections[sectionIdx].levelTitle}-${Date.now()}`,
                text: formattedText,
                checked: true
            });
            const newHtml = serializeYccdSections(sections);
            const newData = JSON.parse(JSON.stringify(data));
            newData.specifications.rows[rowIndex][4] = newHtml;
            handleUpdateMatrixWithSync(newData);

            const lessonName = data.specifications.rows[rowIndex]?.[3] || data.matrix?.rows?.[rowIndex]?.[3] || '';
            const lvlCode = getLevelCodeFromTitle(sections[sectionIdx].levelTitle);
            const grade = detectGradeFromLessonOrContext(lessonName, examName);
            if (grade && lessonName) {
                try {
                    addCustomCriterion(grade, lessonName, lvlCode, trimmed);
                } catch (e) {
                    console.error('Error recording add to criteriaStore:', e);
                }
            }
        }
    };

    const handleUpdateYccd = (rowIndex: number, sectionIdx: number, itemIdx: number, updatedText: string) => {
        const trimmed = updatedText.trim();
        if (!trimmed) return;
        const currentReq = data.specifications.rows[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);
        const itemToUpdate = sections[sectionIdx]?.items[itemIdx];
        if (itemToUpdate) {
            const oldText = itemToUpdate.text;
            const lessonName = data.specifications.rows[rowIndex]?.[3] || data.matrix?.rows?.[rowIndex]?.[3] || '';
            const lvlCode = getLevelCodeFromTitle(sections[sectionIdx].levelTitle);
            const grade = detectGradeFromLessonOrContext(lessonName, examName);

            if (grade && lessonName) {
                try {
                    updateCustomCriterion(grade, lessonName, lvlCode, oldText, trimmed);
                } catch (e) {
                    console.error('Error updating criterion in criteriaStore:', e);
                }
            }

            itemToUpdate.text = trimmed.startsWith('–') || trimmed.startsWith('-') ? trimmed : `– ${trimmed}`;
            const newHtml = serializeYccdSections(sections);
            const newData = JSON.parse(JSON.stringify(data));
            newData.specifications.rows[rowIndex][4] = newHtml;
            handleUpdateMatrixWithSync(newData);
        }
        setEditingYccdFor(null);
        setEditingYccdText('');
    };

    const handleDeleteYccd = (rowIndex: number, sectionIdx: number, itemIdx: number) => {
        const currentReq = data.specifications.rows[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);
        const itemToDelete = sections[sectionIdx]?.items[itemIdx];
        if (itemToDelete) {
            const lessonName = data.specifications.rows[rowIndex]?.[3] || data.matrix?.rows?.[rowIndex]?.[3] || '';
            const lvlCode = getLevelCodeFromTitle(sections[sectionIdx].levelTitle);
            const grade = detectGradeFromLessonOrContext(lessonName, examName);

            if (grade && lessonName) {
                try {
                    deleteCustomCriterion(grade, lessonName, lvlCode, itemToDelete.text);
                } catch (e) {
                    console.error('Error recording deletion in criteriaStore:', e);
                }
            }

            sections[sectionIdx].items.splice(itemIdx, 1);
            const newHtml = serializeYccdSections(sections);
            const newData = JSON.parse(JSON.stringify(data));
            newData.specifications.rows[rowIndex][4] = newHtml;
            handleUpdateMatrixWithSync(newData);
        }
    };

    const handleAddLevel = (rowIndex: number, levelTitle: string) => {
        const trimmed = levelTitle.trim();
        if (!trimmed) return;
        const currentReq = data.specifications?.rows?.[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);

        // Check if already exists (case-insensitive)
        const existingIdx = sections.findIndex(s => s.levelTitle.trim().toLowerCase() === trimmed.toLowerCase());
        if (existingIdx !== -1) {
            setAddingLevelForRow(null);
            setAddingYccdFor({ rowIndex, sectionIdx: existingIdx });
            return;
        }

        const newSection: YccdSection = {
            levelTitle: trimmed,
            items: []
        };

        // Standard level pedagogical order in Vietnamese curriculum
        const standardOrder = ['nhận biết', 'thông hiểu', 'vận dụng', 'vận dụng cao'];
        const levelKey = trimmed.toLowerCase();
        const standardIdx = standardOrder.indexOf(levelKey);

        let insertIdx = sections.length;
        if (standardIdx !== -1) {
            for (let i = 0; i < sections.length; i++) {
                const secKey = sections[i].levelTitle.trim().toLowerCase();
                const secStdIdx = standardOrder.indexOf(secKey);
                if (secStdIdx !== -1 && secStdIdx > standardIdx) {
                    insertIdx = i;
                    break;
                }
            }
        }

        sections.splice(insertIdx, 0, newSection);
        const newHtml = serializeYccdSections(sections);

        const newData = JSON.parse(JSON.stringify(data));
        if (!newData.specifications) newData.specifications = { rows: [] };
        if (!newData.specifications.rows[rowIndex]) {
            newData.specifications.rows[rowIndex] = [
                (rowIndex + 1).toString(),
                newData.matrix.rows[rowIndex]?.[1] || '',
                newData.matrix.rows[rowIndex]?.[2] || '',
                newData.matrix.rows[rowIndex]?.[3] || '',
                '',
                '0-0', '0-0', '0-0', '0-0'
            ];
        }
        newData.specifications.rows[rowIndex][4] = newHtml;
        handleUpdateMatrixWithSync(newData);

        setAddingLevelForRow(null);
        setCustomLevelName('');
        // Automatically focus inline input to add first YCCĐ for this level
        setAddingYccdFor({ rowIndex, sectionIdx: insertIdx });
        setNewYccdText('');
    };

    const handleDeleteLevel = (rowIndex: number, sectionIdx: number) => {
        const currentReq = data.specifications?.rows?.[rowIndex]?.[4] || '';
        const sections = parseYccdHtml(currentReq);
        if (sections[sectionIdx]) {
            sections.splice(sectionIdx, 1);
            const newHtml = serializeYccdSections(sections);
            const newData = JSON.parse(JSON.stringify(data));
            if (newData.specifications?.rows?.[rowIndex]) {
                newData.specifications.rows[rowIndex][4] = newHtml;
                handleUpdateMatrixWithSync(newData);
            }
        }
        if (addingYccdFor?.rowIndex === rowIndex && addingYccdFor?.sectionIdx === sectionIdx) {
            setAddingYccdFor(null);
            setNewYccdText('');
        }
    };

    const [addingYccdFor, setAddingYccdFor] = useState<{ rowIndex: number; sectionIdx: number } | null>(null);
    const [newYccdText, setNewYccdText] = useState('');
    const [editingYccdFor, setEditingYccdFor] = useState<{ rowIndex: number; sectionIdx: number; itemIdx: number } | null>(null);
    const [editingYccdText, setEditingYccdText] = useState('');
    const [addingLevelForRow, setAddingLevelForRow] = useState<number | null>(null);
    const [customLevelName, setCustomLevelName] = useState('');

    type NewSpecSubRowItem = {
        subRowId: string;
        sectionIdx: number;
        levelKey: 'B' | 'H' | 'VD';
        displayTitle: string;
        rawTitle: string;
        items: { id: string; text: string; checked: boolean; sectionIdx: number; itemIdx: number }[];
    };

    const mapTitleToNewLevel = (rawTitle: string): { levelKey: 'B' | 'H' | 'VD'; displayTitle: string } => {
        const lower = (rawTitle || '').trim().toLowerCase();
        if (lower.startsWith('nhận biết') || lower.startsWith('biết') || lower.startsWith('- biết')) {
            return { levelKey: 'B', displayTitle: '- Biết:' };
        }
        if (lower.startsWith('thông hiểu') || lower.startsWith('hiểu') || lower.startsWith('- hiểu')) {
            return { levelKey: 'H', displayTitle: '- Hiểu:' };
        }
        return { levelKey: 'VD', displayTitle: '- Vận dụng:' };
    };

    const buildNewSpecSubRows = (rowIndex: number): NewSpecSubRowItem[] => {
        const req = String(data.specifications?.rows?.[rowIndex]?.[4] || '');
        const yccdSections = parseYccdHtml(req);

        const levelDefs: { levelKey: 'B' | 'H' | 'VD'; displayTitle: string; rawTitle: string }[] = [
            { levelKey: 'B', displayTitle: '- Biết:', rawTitle: 'Nhận biết' },
            { levelKey: 'H', displayTitle: '- Hiểu:', rawTitle: 'Thông hiểu' },
            { levelKey: 'VD', displayTitle: '- Vận dụng:', rawTitle: 'Vận dụng' }
        ];

        const grouped: Record<'B' | 'H' | 'VD', NewSpecSubRowItem> = {
            B: { subRowId: 'header_0', sectionIdx: -1, levelKey: 'B', displayTitle: '- Biết:', rawTitle: 'Nhận biết', items: [] },
            H: { subRowId: 'header_1', sectionIdx: -1, levelKey: 'H', displayTitle: '- Hiểu:', rawTitle: 'Thông hiểu', items: [] },
            VD: { subRowId: 'header_2', sectionIdx: -1, levelKey: 'VD', displayTitle: '- Vận dụng:', rawTitle: 'Vận dụng', items: [] }
        };

        yccdSections.forEach((section, sIdx) => {
            const { levelKey, displayTitle } = mapTitleToNewLevel(section.levelTitle);
            if (grouped[levelKey].sectionIdx === -1) {
                grouped[levelKey].sectionIdx = sIdx;
                grouped[levelKey].rawTitle = section.levelTitle || displayTitle;
            }
            section.items.forEach((it, iIdx) => {
                grouped[levelKey].items.push({
                    ...it,
                    sectionIdx: sIdx,
                    itemIdx: iIdx
                });
            });
        });

        return levelDefs.map(d => grouped[d.levelKey]);
    };

    const renderSpecRow = (row: string[], rowIndex: number, rowspanMain: number | null, rowspanSub: number | null) => {
        const [stt, main, sub, lesson, req, nb_raw, th_raw, vd_raw, vdc_raw] = row;
        
        const [nb_tn, nb_tl] = (String(nb_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [th_tn, th_tl] = (String(th_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [vd_tn, vd_tl] = (String(vd_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [vdc_tn, vdc_tl] = (String(vdc_raw)||'0-0').split('-').map(s=>parseInt(s)||0);

        const avail = data.availableCounts?.[rowIndex] || { NB:{TN:0,TL:0}, TH:{TN:0,TL:0}, VD:{TN:0,TL:0}, VDC:{TN:0,TL:0} };
        
        // Helper to collect positions for this row
        const getPositions = () => {
            const posGroups: Record<string, string[]> = { NB: [], TH: [], VD: [] };
            
            const posNB_TN = positionMap[`${rowIndex}-5`]; if(posNB_TN) posGroups.NB.push(posNB_TN.replace('Câu ', ''));
            const posNB_TL = positionMap[`${rowIndex}-6`]; if(posNB_TL) posGroups.NB.push(posNB_TL.replace('Câu ', ''));
            
            const posTH_TN = positionMap[`${rowIndex}-7`]; if(posTH_TN) posGroups.TH.push(posTH_TN.replace('Câu ', ''));
            const posTH_TL = positionMap[`${rowIndex}-8`]; if(posTH_TL) posGroups.TH.push(posTH_TL.replace('Câu ', ''));
            
            const posVD_TN = positionMap[`${rowIndex}-9`]; if(posVD_TN) posGroups.VD.push(posVD_TN.replace('Câu ', ''));
            const posVD_TL = positionMap[`${rowIndex}-10`]; if(posVD_TL) posGroups.VD.push(posVD_TL.replace('Câu ', ''));

            const parts = [];
            if (posGroups.NB.length > 0) parts.push(`NB: Câu ${posGroups.NB.join(', ')}`);
            if (posGroups.TH.length > 0) parts.push(`TH: Câu ${posGroups.TH.join(', ')}`);
            if (posGroups.VD.length > 0) parts.push(`VD: Câu ${posGroups.VD.join(', ')}`);
            
            return parts;
        };
        const positions = getPositions();

        // Helper to render cell with count and MAX AVAILABLE
        const renderCell = (count: number, max: number, type: 'TN' | 'TL', colIndex: number) => {
            const isEditing = editingCell?.table === 'spec' && editingCell.row === rowIndex && editingCell.col === colIndex;
            const isTLColumn = colIndex === 10;
            const currentTLPoint = isTLColumn ? getRowPointsTL(rowIndex) : pointsTL;
            
            return (
                <td className="bg-white hover:bg-sky-50 p-2 border border-slate-300 text-center w-24 align-middle transition-colors relative">
                    {isEditing ? (
                        <QuestionCellEditor
                            initialCount={count}
                            isTLColumn={isTLColumn}
                            initialTLPoint={currentTLPoint}
                            onSave={(newCount, newPoint) => handleQuestionCellSave(rowIndex, colIndex, newCount, newPoint)}
                            onCancel={() => setEditingCell(null)}
                        />
                    ) : (
                        <div 
                            className="cursor-pointer flex flex-col items-center justify-center group/cell py-0.5"
                            onClick={() => setEditingCell({ table: 'spec', row: rowIndex, col: colIndex })}
                            title={isTLColumn ? "Nhấn để điều chỉnh số câu và điểm tương ứng" : "Nhấn để sửa số câu"}
                        >
                            <span className={`font-semibold text-lg ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{count}</span>
                            <span className="text-xs text-gray-400" title="Số câu có sẵn trong ngân hàng">/ {max}</span>
                            {isTLColumn && count > 0 && (
                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 mt-1 transition-colors">
                                    {currentTLPoint}đ/câu
                                </span>
                            )}
                        </div>
                    )}
                </td>
            );
        };

        const yccdSections = parseYccdHtml(req);

        // Chế độ Mẫu mới (2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ):
        // Mỗi đơn vị kiến thức chia thành 3 dòng <tr> ứng với 3 mức độ (- Biết:, - Hiểu:, - Vận dụng:)
        if (isNewFormat) {
            const subRows = buildNewSpecSubRows(rowIndex);
            const lessonSpan = subRows.length;
            const rowCfg = getRowNewFormatConfig(rowIndex);
            const defaultNL = getDefaultCompetencyForTopic(main, sub);
            const parts = activeParts;
            const levels: ('B' | 'H' | 'VD')[] = ['B', 'H', 'VD'];

            return (
                <React.Fragment key={`spec-new-frag-${rowIndex}`}>
                    {subRows.map((subRow, subIdx) => {
                        const isFirstSubRow = subIdx === 0;
                        const isAddingInThisLevel =
                            addingYccdFor?.rowIndex === rowIndex && addingYccdFor?.sectionIdx === subRow.sectionIdx && subRow.sectionIdx !== -1;

                        return (
                            <tr key={`spec-new-${rowIndex}-${subRow.subRowId}`} className="hover:bg-slate-50/70">
                                {isFirstSubRow && (
                                    <td
                                        rowSpan={lessonSpan}
                                        className="bg-white border border-slate-400 p-2 text-center align-top font-medium text-slate-700"
                                    >
                                        {stt}
                                    </td>
                                )}
                                {isFirstSubRow && rowspanMain !== null && (
                                    <td
                                        rowSpan={rowspanMain}
                                        className="bg-white align-top text-left border border-slate-400 p-2 font-semibold text-slate-900"
                                    >
                                        {main}
                                    </td>
                                )}
                                {isFirstSubRow && rowspanSub !== null && (
                                    <td
                                        rowSpan={rowspanSub}
                                        className="bg-white align-top text-left border border-slate-400 p-2 text-slate-800"
                                    >
                                        {sub}
                                    </td>
                                )}
                                {isFirstSubRow && (
                                    <td
                                        rowSpan={lessonSpan}
                                        className="bg-white text-left align-top border border-slate-400 p-2 text-xs text-slate-700"
                                    >
                                        {lesson}
                                    </td>
                                )}

                                {/* Cột Yêu cầu cần đạt: Mỗi dòng mức độ (- Biết:, - Hiểu:, - Vận dụng:) chứa các YCCĐ của mức độ đó */}
                                <td className="bg-white text-left border border-slate-400 px-2.5 py-2 min-w-[340px] align-top">
                                    <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                                        <span className="font-bold text-slate-900 text-sm">{subRow.displayTitle}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (subRow.sectionIdx === -1) {
                                                    handleAddLevel(rowIndex, subRow.rawTitle);
                                                } else {
                                                    setAddingYccdFor({ rowIndex, sectionIdx: subRow.sectionIdx });
                                                    setNewYccdText('');
                                                }
                                            }}
                                            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-normal py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                            title={`Thêm YCCĐ vào mục ${subRow.displayTitle}`}
                                        >
                                            <Plus size={12} />
                                            <span>Thêm YCCĐ</span>
                                        </button>
                                    </div>

                                    {subRow.items.length > 0 ? (
                                        <div className="space-y-1 pl-1">
                                            {subRow.items.map(item => {
                                                const sIdx = item.sectionIdx;
                                                const iIdx = item.itemIdx;
                                                const isEditingThis =
                                                    editingYccdFor?.rowIndex === rowIndex &&
                                                    editingYccdFor?.sectionIdx === sIdx &&
                                                    editingYccdFor?.itemIdx === iIdx;

                                                if (isEditingThis) {
                                                    return (
                                                        <div key={item.id} className="flex items-center gap-1.5">
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={editingYccdText}
                                                                onChange={(e) => setEditingYccdText(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleUpdateYccd(rowIndex, sIdx, iIdx, editingYccdText);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingYccdFor(null);
                                                                        setEditingYccdText('');
                                                                    }
                                                                }}
                                                                className="flex-1 text-xs border border-blue-400 rounded px-2 py-1 outline-none bg-white"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateYccd(rowIndex, sIdx, iIdx, editingYccdText)}
                                                                className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 font-medium cursor-pointer"
                                                            >
                                                                Lưu
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingYccdFor(null);
                                                                    setEditingYccdText('');
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={item.id} className="group/item flex items-start gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.checked}
                                                            onChange={() => handleToggleYccd(rowIndex, sIdx, iIdx)}
                                                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"
                                                            title={item.checked ? 'Đang đưa vào bản đặc tả (Nhấn để ẩn khi in)' : 'Đang ẩn khi in (Nhấn để bật lại)'}
                                                        />
                                                        <span
                                                            onDoubleClick={() => {
                                                                setEditingYccdFor({ rowIndex, sectionIdx: sIdx, itemIdx: iIdx });
                                                                setEditingYccdText(item.text.replace(/^[–\-*•]\s*/, ''));
                                                            }}
                                                            className={`flex-1 leading-snug text-[13px] ${
                                                                item.checked ? 'text-slate-800' : 'line-through text-slate-400'
                                                            }`}
                                                        >
                                                            {item.text}
                                                        </span>
                                                        <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingYccdFor({ rowIndex, sectionIdx: sIdx, itemIdx: iIdx });
                                                                    setEditingYccdText(item.text.replace(/^[–\-*•]\s*/, ''));
                                                                }}
                                                                className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 cursor-pointer"
                                                                title="Sửa YCCĐ này"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteYccd(rowIndex, sIdx, iIdx)}
                                                                className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer"
                                                                title="Xóa dòng YCCĐ này"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs pl-1">...</span>
                                    )}

                                    {isAddingInThisLevel && (
                                        <div className="flex items-center gap-1.5 mt-1.5 pl-1">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newYccdText}
                                                onChange={(e) => setNewYccdText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddYccd(rowIndex, subRow.sectionIdx, newYccdText);
                                                        setAddingYccdFor(null);
                                                        setNewYccdText('');
                                                    } else if (e.key === 'Escape') {
                                                        setAddingYccdFor(null);
                                                        setNewYccdText('');
                                                    }
                                                }}
                                                placeholder="Nhập nội dung YCCĐ mới..."
                                                className="flex-1 text-xs border border-blue-400 rounded px-2 py-1 outline-none bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAddYccd(rowIndex, subRow.sectionIdx, newYccdText);
                                                    setAddingYccdFor(null);
                                                    setNewYccdText('');
                                                }}
                                                className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 font-medium cursor-pointer"
                                            >
                                                Lưu
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAddingYccdFor(null);
                                                    setNewYccdText('');
                                                }}
                                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    )}
                                </td>

                                {/* 12 cột Số câu hỏi ở các mức độ đánh giá: chỉ hiển thị (n) và (NL) ở đúng dòng mức độ tương ứng */}
                                {parts.map(partKey =>
                                    levels.map(lvlKey => {
                                        const isMatchingLevelRow = lvlKey === subRow.levelKey;
                                        const cCount = isMatchingLevelRow ? (rowCfg[partKey][lvlKey]?.count || 0) : 0;
                                        const cNL = rowCfg[partKey][lvlKey]?.competency || defaultNL;

                                        const isEditingThis =
                                            editingNewCell?.table === 'spec' &&
                                            editingNewCell.row === rowIndex &&
                                            editingNewCell.part === partKey &&
                                            editingNewCell.level === lvlKey &&
                                            editingNewCell.subRowId === subRow.subRowId;

                                        return (
                                            <td
                                                key={`spec-new-${subRow.subRowId}-${partKey}-${lvlKey}`}
                                                className="bg-white hover:bg-indigo-50/60 p-1 border border-slate-400 text-center align-middle transition-colors relative min-w-[48px]"
                                            >
                                                {isEditingThis ? (
                                                    <NewFormatCellEditor
                                                        initialCount={rowCfg[partKey][lvlKey]?.count || 0}
                                                        initialCompetency={cNL}
                                                        onSave={(newC, newNL) =>
                                                            handleNewFormatCellSave(
                                                                rowIndex,
                                                                partKey,
                                                                lvlKey,
                                                                newC,
                                                                newNL
                                                            )
                                                        }
                                                        onCancel={() => setEditingNewCell(null)}
                                                    />
                                                ) : (
                                                    <div
                                                        onClick={() =>
                                                            setEditingNewCell({
                                                                table: 'spec',
                                                                row: rowIndex,
                                                                part: partKey,
                                                                level: lvlKey,
                                                                subRowId: subRow.subRowId
                                                            })
                                                        }
                                                        className="cursor-pointer flex flex-col items-center justify-center py-0.5 min-h-[26px]"
                                                        title="Nhấn để nhập số câu (n) và chọn năng lực (NLa - NLe)"
                                                    >
                                                        {cCount > 0 ? (
                                                            <>
                                                                <span className="font-bold text-xs text-slate-900 leading-tight">({cCount})</span>
                                                                <span className="text-[10px] font-semibold text-indigo-700 leading-tight">
                                                                    ({cNL})
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-transparent select-none text-[10px]">.</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })
                                )}
                            </tr>
                        );
                    })}
                </React.Fragment>
            );
        }

        return (
            <tr key={`spec-${rowIndex}`} className="hover:bg-slate-50 group">
                <td className="bg-white relative border border-slate-300 p-2 text-center align-middle">
                    <span className="group-hover:opacity-0 transition-opacity">{stt}</span>
                </td>
                {rowspanMain && <td className="bg-white align-top text-left border border-slate-300 p-2 font-medium" rowSpan={rowspanMain}>{main}</td>}
                {rowspanSub && <td className="bg-white align-top text-left border border-slate-300 p-2" rowSpan={rowspanSub}>{sub}</td>}
                <td className="bg-white text-left align-middle border border-slate-300 p-2 text-sm">{lesson}</td>
                <td className="bg-white text-left text-sm border border-slate-300 p-2 min-w-[360px]">
                    {yccdSections.length === 0 ? (
                        <div className="text-slate-400 italic mb-2">Chưa có mức độ đánh giá nào</div>
                    ) : (
                        <div className="space-y-2">
                            {yccdSections.map((section, sIdx) => (
                                <div key={`sec-${sIdx}`} className="yccd-section">
                                    {section.levelTitle && (
                                        <div className="flex items-center justify-between font-semibold text-slate-800 text-sm mt-1 mb-1 bg-slate-100/70 px-2 py-0.5 rounded">
                                            <span>
                                                {isNewFormat
                                                    ? (section.levelTitle.toLowerCase().startsWith('nhận biết')
                                                        ? 'Biết:'
                                                        : section.levelTitle.toLowerCase().startsWith('thông hiểu')
                                                        ? 'Hiểu:'
                                                        : section.levelTitle.toLowerCase().startsWith('vận dụng')
                                                        ? 'Vận dụng:'
                                                        : section.levelTitle)
                                                    : section.levelTitle}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAddingYccdFor({ rowIndex, sectionIdx: sIdx });
                                                        setNewYccdText('');
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-normal py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                                    title={`Thêm yêu cầu cần đạt mới cho mục ${section.levelTitle}`}
                                                >
                                                    <Plus size={13} />
                                                    <span>Thêm YCCĐ</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLevel(rowIndex, sIdx)}
                                                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                    title={`Xoá mức độ đánh giá "${section.levelTitle}"`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1 pl-1">
                                        {section.items.map((item, iIdx) => {
                                            const isEditingThis = editingYccdFor?.rowIndex === rowIndex && editingYccdFor?.sectionIdx === sIdx && editingYccdFor?.itemIdx === iIdx;

                                            if (isEditingThis) {
                                                return (
                                                    <div key={item.id} className="my-1 p-1.5 bg-blue-50/90 border border-blue-300 rounded flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={editingYccdText}
                                                            onChange={(e) => setEditingYccdText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateYccd(rowIndex, sIdx, iIdx, editingYccdText);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingYccdFor(null);
                                                                    setEditingYccdText('');
                                                                }
                                                            }}
                                                            className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none bg-white focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateYccd(rowIndex, sIdx, iIdx, editingYccdText)}
                                                            disabled={!editingYccdText.trim()}
                                                            className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 font-medium cursor-pointer disabled:opacity-50"
                                                        >
                                                            Lưu
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingYccdFor(null);
                                                                setEditingYccdText('');
                                                            }}
                                                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                                            title="Hủy"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                            <div
                                                key={item.id}
                                                className={`group/item flex items-start gap-2 p-1 rounded transition-colors ${
                                                    item.checked
                                                        ? 'hover:bg-slate-100/60'
                                                        : 'bg-slate-50/80 opacity-60 text-slate-400'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={item.checked}
                                                    onChange={() => handleToggleYccd(rowIndex, sIdx, iIdx)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                    title={item.checked ? "Đã chọn ra trong đề (Click để bỏ chọn)" : "Chưa chọn ra trong đề (Click để chọn)"}
                                                />
                                                <span
                                                    onClick={() => handleToggleYccd(rowIndex, sIdx, iIdx)}
                                                    className={`cursor-pointer flex-1 leading-snug select-none text-[13px] ${
                                                        item.checked ? 'text-slate-800' : 'line-through text-slate-400'
                                                    }`}
                                                >
                                                    {item.text}
                                                </span>
                                                <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingYccdFor({ rowIndex, sectionIdx: sIdx, itemIdx: iIdx });
                                                            setEditingYccdText(item.text.replace(/^[–\-*•]\s*/, ''));
                                                        }}
                                                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                                        title="Sửa yêu cầu cần đạt này"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteYccd(rowIndex, sIdx, iIdx)}
                                                        className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                        title="Xoá yêu cầu cần đạt này"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );})}

                                        {section.items.length === 0 && !(addingYccdFor?.rowIndex === rowIndex && addingYccdFor?.sectionIdx === sIdx) && (
                                            <div className="text-xs text-slate-400 italic py-1 pl-1">
                                                Chưa có YCCĐ. Nhấn "+ Thêm YCCĐ" để thêm.
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline Add Input for this Section */}
                                    {addingYccdFor?.rowIndex === rowIndex && addingYccdFor?.sectionIdx === sIdx && (
                                        <div className="mt-2 pl-2 pr-1 flex items-center gap-1.5 bg-blue-50/60 p-1.5 rounded border border-blue-200">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newYccdText}
                                                onChange={(e) => setNewYccdText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddYccd(rowIndex, sIdx, newYccdText);
                                                        setAddingYccdFor(null);
                                                        setNewYccdText('');
                                                    } else if (e.key === 'Escape') {
                                                        setAddingYccdFor(null);
                                                        setNewYccdText('');
                                                    }
                                                }}
                                                placeholder={`Nhập nội dung YCCĐ cho "${section.levelTitle || 'mục này'}" (nhấn Enter để lưu)...`}
                                                className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAddYccd(rowIndex, sIdx, newYccdText);
                                                    setAddingYccdFor(null);
                                                    setNewYccdText('');
                                                }}
                                                className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 font-medium cursor-pointer"
                                            >
                                                Lưu
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAddingYccdFor(null);
                                                    setNewYccdText('');
                                                }}
                                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                                title="Hủy"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Inline Add Level (Mức độ đánh giá) Form / Trigger */}
                    {addingLevelForRow === rowIndex ? (
                        <div className="mt-2.5 p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between font-semibold text-indigo-900">
                                <span>Chọn hoặc thêm mức độ đánh giá:</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddingLevelForRow(null);
                                        setCustomLevelName('');
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    title="Đóng"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {STANDARD_LEVELS.map(lvl => {
                                    const isExisting = yccdSections.some(s => s.levelTitle.trim().toLowerCase() === lvl.toLowerCase());
                                    return (
                                        <button
                                            key={lvl}
                                            type="button"
                                            disabled={isExisting}
                                            onClick={() => handleAddLevel(rowIndex, lvl)}
                                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                                isExisting
                                                    ? 'bg-slate-200/80 text-slate-400 cursor-not-allowed border border-slate-200'
                                                    : 'bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-300 shadow-xs cursor-pointer'
                                            }`}
                                            title={isExisting ? `Mức độ "${lvl}" đã có trong bài này` : `Thêm mức độ "${lvl}"`}
                                        >
                                            + {lvl} {isExisting && <span className="text-[10px] opacity-75">(Đã có)</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1.5 border-t border-indigo-100">
                                <input
                                    type="text"
                                    placeholder="Hoặc nhập tên mức độ khác..."
                                    value={customLevelName}
                                    onChange={(e) => setCustomLevelName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddLevel(rowIndex, customLevelName);
                                        } else if (e.key === 'Escape') {
                                            setAddingLevelForRow(null);
                                            setCustomLevelName('');
                                        }
                                    }}
                                    className="flex-1 bg-white border border-indigo-300 rounded px-2 py-1 outline-none text-xs focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleAddLevel(rowIndex, customLevelName)}
                                    disabled={!customLevelName.trim()}
                                    className="bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium whitespace-nowrap cursor-pointer"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddingLevelForRow(rowIndex);
                                    setCustomLevelName('');
                                }}
                                className="text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 border border-dashed border-indigo-300 hover:border-indigo-400 px-2.5 py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors w-full cursor-pointer group"
                                title="Thêm mức độ đánh giá mới (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao...)"
                            >
                                <Plus size={13} className="text-indigo-500 group-hover:text-indigo-700" />
                                <span>Thêm mức độ đánh giá</span>
                            </button>
                        </div>
                    )}

                    {positions.length > 0 && !isNewFormat && (
                        <div className="mt-3 pt-2 border-t border-dashed border-gray-300 text-xs text-blue-700">
                            <strong>Vị trí câu hỏi:</strong>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                {positions.map((p, idx) => (
                                    <span key={idx} className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </td>
                
                {isNewFormat ? (
                    (() => {
                        const rowCfg = getRowNewFormatConfig(rowIndex);
                        const defaultNL = getDefaultCompetencyForTopic(main, sub);
                        const parts: ('mc' | 'tf' | 'sa' | 'essay')[] = ['mc', 'tf', 'sa', 'essay'];
                        const levels: ('B' | 'H' | 'VD')[] = ['B', 'H', 'VD'];
                        return parts.map(partKey =>
                            levels.map(lvlKey => {
                                const cell = rowCfg[partKey][lvlKey];
                                const cCount = cell?.count || 0;
                                const cNL = cell?.competency || defaultNL;
                                const isEditingThis =
                                    editingNewCell?.table === 'spec' &&
                                    editingNewCell.row === rowIndex &&
                                    editingNewCell.part === partKey &&
                                    editingNewCell.level === lvlKey;
                                return (
                                    <td
                                        key={`spec-new-${partKey}-${lvlKey}`}
                                        className="bg-white hover:bg-indigo-50/60 p-1.5 border border-slate-300 text-center align-middle transition-colors relative min-w-[54px]"
                                    >
                                        {isEditingThis ? (
                                            <NewFormatCellEditor
                                                initialCount={cCount}
                                                initialCompetency={cNL}
                                                onSave={(newC, newNL) => handleNewFormatCellSave(rowIndex, partKey, lvlKey, newC, newNL)}
                                                onCancel={() => setEditingNewCell(null)}
                                            />
                                        ) : (
                                            <div
                                                onClick={() => setEditingNewCell({ table: 'spec', row: rowIndex, part: partKey, level: lvlKey })}
                                                className="cursor-pointer flex flex-col items-center justify-center py-1 min-h-[42px]"
                                                title="Nhấn để nhập số câu (n) và chọn năng lực (NLa - NLe)"
                                            >
                                                {cCount > 0 ? (
                                                    <>
                                                        <span className="font-bold text-sm text-slate-900">({cCount})</span>
                                                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 mt-0.5">
                                                            ({cNL})
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                );
                            })
                        );
                    })()
                ) : (
                    <>
                        {/* Specific Columns: NB(TN), TH(TN), VD(TL) */}
                        {renderCell(nb_tn, avail.NB.TN, 'TN', 5)}
                        {renderCell(th_tn, avail.TH.TN, 'TN', 7)}
                        {renderCell(vd_tl, avail.VD.TL, 'TL', 10)}
                    </>
                )}
            </tr>
        );
    };

    // Totals for New 4-Part Format
    const newTotals = {
        mc: { B: 0, H: 0, VD: 0 },
        tf: { B: 0, H: 0, VD: 0 },
        sa: { B: 0, H: 0, VD: 0 },
        essay: { B: 0, H: 0, VD: 0 }
    };
    let newPointsMC = 0;
    let newPointsTF = 0;
    let newPointsSA = 0;
    let newPointsEssay = 0;
    let newPointsB = 0;
    let newPointsH = 0;
    let newPointsVD = 0;

    data.matrix.rows.forEach((_, rIdx) => {
        const cfg = getRowNewFormatConfig(rIdx);
        const rEssayPt = getRowPointsTL(rIdx);

        (['B', 'H', 'VD'] as const).forEach(lvl => {
            newTotals.mc[lvl] += cfg.mc[lvl].count || 0;
            newTotals.tf[lvl] += cfg.tf[lvl].count || 0;
            newTotals.sa[lvl] += cfg.sa[lvl].count || 0;
            newTotals.essay[lvl] += cfg.essay[lvl].count || 0;
        });

        const rowPtB = (cfg.mc.B.count * mcPoint) + (cfg.tf.B.count * tfPoint) + (cfg.sa.B.count * saPoint) + (cfg.essay.B.count * rEssayPt);
        const rowPtH = (cfg.mc.H.count * mcPoint) + (cfg.tf.H.count * tfPoint) + (cfg.sa.H.count * saPoint) + (cfg.essay.H.count * rEssayPt);
        const rowPtVD = (cfg.mc.VD.count * mcPoint) + (cfg.tf.VD.count * tfPoint) + (cfg.sa.VD.count * saPoint) + (cfg.essay.VD.count * rEssayPt);

        newPointsB += rowPtB;
        newPointsH += rowPtH;
        newPointsVD += rowPtVD;

        newPointsMC += (cfg.mc.B.count + cfg.mc.H.count + cfg.mc.VD.count) * mcPoint;
        newPointsTF += (cfg.tf.B.count + cfg.tf.H.count + cfg.tf.VD.count) * tfPoint;
        newPointsSA += (cfg.sa.B.count + cfg.sa.H.count + cfg.sa.VD.count) * saPoint;
        newPointsEssay += (cfg.essay.B.count + cfg.essay.H.count + cfg.essay.VD.count) * rEssayPt;
    });

    const newTotalCountB = newTotals.mc.B + newTotals.tf.B + newTotals.sa.B + newTotals.essay.B;
    const newTotalCountH = newTotals.mc.H + newTotals.tf.H + newTotals.sa.H + newTotals.essay.H;
    const newTotalCountVD = newTotals.mc.VD + newTotals.tf.VD + newTotals.sa.VD + newTotals.essay.VD;
    const newGrandTotalPoints = newPointsB + newPointsH + newPointsVD;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* MATRIX FORMAT SWITCHER & THCS COMPETENCY REFERENCE BAR */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mr-1">
                        <Layers size={16} className="text-indigo-600" />
                        Mẫu cấu trúc Ma trận:
                    </span>
                    <button
                        type="button"
                        onClick={() => handleSwitchMatrixFormat('classic')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !isNewFormat
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-indigo-50'
                        }`}
                    >
                        Mẫu chuẩn (TNKQ & Tự luận)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMatrixFormat('new_4part')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isNewFormat
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50'
                        }`}
                    >
                        Mẫu mới (Nhiều lựa chọn • Đúng–Sai {useShortAnswer ? '• Trả lời ngắn ' : ''}• Tự luận + Năng lực THCS)
                    </button>
                    {isNewFormat && (
                        <label
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none ${
                                useShortAnswer
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                            title="Bỏ tích nếu môn học không dùng câu hỏi Điền khuyết / Trả lời ngắn (Hệ thống sẽ tự động đẩy toàn bộ số câu này sang Đúng – Sai)"
                        >
                            <input
                                type="checkbox"
                                checked={useShortAnswer}
                                onChange={(e) => handleToggleShortAnswer(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Có phần Trả lời ngắn / Điền khuyết</span>
                        </label>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setShowCompetencyGuide(prev => !prev)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <BookOpen size={14} />
                    {showCompetencyGuide ? 'Ẩn Bảng năng lực Tin học THCS' : 'Xem Bảng năng lực Tin học THCS (NLa – NLe)'}
                </button>
            </div>

            {/* COLLAPSIBLE THCS COMPETENCY TABLE (IMAGE 3) */}
            {showCompetencyGuide && (
                <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between">
                        <h4 className="text-sm font-bold">
                            2.2. Yêu cầu cần đạt về Năng lực Tin học ở cấp Trung học cơ sở (CTGDPT 2018)
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShowCompetencyGuide(false)}
                            className="text-white/80 hover:text-white cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-100 text-slate-800">
                                    <th className="border border-slate-300 p-2.5 w-36 text-center font-bold">Thành phần năng lực</th>
                                    <th className="border border-slate-300 p-2.5 text-left font-bold">Biểu hiện</th>
                                </tr>
                            </thead>
                            <tbody>
                                {THCS_COMPETENCIES.map(nl => (
                                    <tr key={nl.code} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-2.5 text-center align-top">
                                            <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 font-extrabold border border-indigo-200">
                                                {nl.code}
                                            </span>
                                            <div className="text-[11px] text-slate-500 mt-1 font-medium">{nl.shortName}</div>
                                        </td>
                                        <td className="border border-slate-300 p-2.5 text-slate-700 leading-relaxed">
                                            {nl.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 1. MATRIX TABLE: NEW 4-PART FORMAT VS CLASSIC FORMAT */}
            {isNewFormat ? (
                <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                    <table className="w-full border-collapse matrix-table text-xs sm:text-sm bg-white">
                        <caption className="p-4 bg-gray-50 border-b border-gray-200">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <span className="text-lg font-bold text-slate-800">1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</span>
                                <div className="flex flex-wrap items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm text-xs">
                                    <span className="text-slate-600">Nhiều lựa chọn: <b>{mcPoint}đ</b></span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-600">Đúng–Sai: <b>{tfPoint}đ/ý</b></span>
                                    {useShortAnswer && (
                                        <>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-600">Trả lời ngắn: <b>{saPoint}đ</b></span>
                                        </>
                                    )}
                                    <span className="text-slate-300">|</span>
                                    <span className="font-semibold text-slate-700">Tự luận:</span>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0.25"
                                        max="5.0"
                                        className="w-14 p-0.5 border border-indigo-400 rounded text-center font-bold text-indigo-700 outline-none"
                                        value={pointsTL}
                                        onChange={(e) => handleUpdatePointsTL(parseFloat(e.target.value))}
                                    />
                                    <span className="text-slate-500">đ/câu</span>
                                </div>
                            </div>
                        </caption>
                        <thead>
                            <tr className="bg-gray-100 text-gray-800 font-bold text-xs">
                                <th rowSpan={4} className="border border-slate-400 p-2 w-10">TT</th>
                                <th rowSpan={4} className="border border-slate-400 p-2 min-w-[130px]">Chủ đề/<br/>Chương</th>
                                <th rowSpan={4} className="border border-slate-400 p-2 min-w-[150px]">Nội dung/đơn vị kiến thức</th>
                                <th rowSpan={4} className="border border-slate-400 p-2 min-w-[120px]">Bài</th>
                                <th rowSpan={4} className="border border-slate-400 p-1.5 w-14">Số tiết</th>
                                <th rowSpan={4} className="border border-slate-400 p-1.5 w-28 bg-orange-50/70 text-orange-950" title="Nhập số tiết đã kiểm tra (Giữa kì) để hệ thống tự động giảm tỷ lệ và gợi ý số lượng câu hỏi phù hợp">
                                    Đã kiểm tra<br/>
                                    <span className="text-[10px] font-normal text-orange-800">(Số tiết &amp; câu)</span>
                                </th>
                                <th colSpan={useShortAnswer ? 12 : 9} className="border border-slate-400 p-2 bg-indigo-50/60">Mức độ đánh giá</th>
                                <th colSpan={3} rowSpan={3} className="border border-slate-400 p-2 bg-amber-50/70">Tổng</th>
                                <th rowSpan={4} className="border border-slate-400 p-2 w-20 bg-emerald-50/60">Tỷ lệ<br/>% điểm</th>
                            </tr>
                            <tr className="bg-gray-100 text-gray-800 font-bold text-xs">
                                <th colSpan={useShortAnswer ? 9 : 6} className="border border-slate-400 p-1.5 bg-sky-50/70">TNKQ</th>
                                <th colSpan={3} rowSpan={2} className="border border-slate-400 p-1.5 bg-purple-50/70">Tự luận</th>
                            </tr>
                            <tr className="bg-gray-100 text-gray-800 font-semibold text-xs">
                                <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">Nhiều lựa chọn</th>
                                <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">"Đúng – Sai"</th>
                                {useShortAnswer && (
                                    <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">Trả lời ngắn</th>
                                )}
                            </tr>
                            <tr className="bg-gray-50 text-gray-700 font-bold text-[11px]">
                                {/* Nhiều lựa chọn */}
                                <th className="border border-slate-400 p-1.5">Biết</th>
                                <th className="border border-slate-400 p-1.5">Hiểu</th>
                                <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                {/* Đúng - Sai */}
                                <th className="border border-slate-400 p-1.5">Biết</th>
                                <th className="border border-slate-400 p-1.5">Hiểu</th>
                                <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                {/* Trả lời ngắn */}
                                {useShortAnswer && (
                                    <>
                                        <th className="border border-slate-400 p-1.5">Biết</th>
                                        <th className="border border-slate-400 p-1.5">Hiểu</th>
                                        <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                    </>
                                )}
                                {/* Tự luận */}
                                <th className="border border-slate-400 p-1.5">Biết</th>
                                <th className="border border-slate-400 p-1.5">Hiểu</th>
                                <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                {/* Tổng */}
                                <th className="border border-slate-400 p-1.5 bg-amber-50/50">Biết</th>
                                <th className="border border-slate-400 p-1.5 bg-amber-50/50">Hiểu</th>
                                <th className="border border-slate-400 p-1.5 bg-amber-50/50">Vận dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedRows.map((mainGroup, mIdx) => {
                                const mainRowSpan = mainGroup.reduce((a, b) => a + b.length, 0);
                                return (
                                    <React.Fragment key={`new-m-${mIdx}`}>
                                        {mainGroup.map((subGroup, sIdx) => (
                                            <React.Fragment key={`new-s-${sIdx}`}>
                                                {subGroup.map((item, iIdx) => {
                                                    const row = item.row;
                                                    const isMainFirst = sIdx === 0 && iIdx === 0;
                                                    const isSubFirst = iIdx === 0;
                                                    const subRowSpan = subGroup.length;
                                                    const rowCfg = getRowNewFormatConfig(item.index);
                                                    const defaultNL = getDefaultCompetencyForTopic(row[1], row[2]);
                                                    const rEssayPt = getRowPointsTL(item.index);

                                                    const rowSumB = rowCfg.mc.B.count + rowCfg.tf.B.count + rowCfg.sa.B.count + rowCfg.essay.B.count;
                                                    const rowSumH = rowCfg.mc.H.count + rowCfg.tf.H.count + rowCfg.sa.H.count + rowCfg.essay.H.count;
                                                    const rowSumVD = rowCfg.mc.VD.count + rowCfg.tf.VD.count + rowCfg.sa.VD.count + rowCfg.essay.VD.count;
                                                    const rowTotalQuestions = rowSumB + rowSumH + rowSumVD;

                                                    const rowPoints =
                                                        (rowCfg.mc.B.count + rowCfg.mc.H.count + rowCfg.mc.VD.count) * mcPoint +
                                                        (rowCfg.tf.B.count + rowCfg.tf.H.count + rowCfg.tf.VD.count) * tfPoint +
                                                        (rowCfg.sa.B.count + rowCfg.sa.H.count + rowCfg.sa.VD.count) * saPoint +
                                                        (rowCfg.essay.B.count + rowCfg.essay.H.count + rowCfg.essay.VD.count) * rEssayPt;
                                                    const rowPct = calculatePercentage(rowPoints);

                                                    const rowSoTiet = parseFloat(String(row[4]) || '0') || 0;
                                                    const examinedPeriods = parseInt(String(row[14]) || '0', 10) || 0;
                                                    const rowTargetPercentStr = getWeightedRowPercent(row);
                                                    const rowTargetPercentVal = parseFloat(rowTargetPercentStr) || 0;
                                                    const naturalPercentVal = totalSoTietAll > 0 ? (rowSoTiet / totalSoTietAll) * 100 : 0;
                                                    const targetRowPoints = (rowTargetPercentVal / 100) * 10;
                                                    const suggestedQuestionCount = mcPoint > 0 ? Math.max(0, Math.round(targetRowPoints / mcPoint)) : 0;

                                                    const parts = activeParts;
                                                    const levels: ('B' | 'H' | 'VD')[] = ['B', 'H', 'VD'];

                                                    return (
                                                        <tr key={`new-r-${item.index}`} className="hover:bg-slate-50 group">
                                                            <td className="bg-white relative border border-slate-300 p-1.5 text-center text-gray-500">
                                                                <span className="group-hover:opacity-0 transition-opacity">{row[0]}</span>
                                                                <button onClick={() => onDeleteRow(item.index)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-all z-10">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                            {isMainFirst && (
                                                                <td className="bg-white align-top text-left border border-slate-300 p-2 font-medium" rowSpan={mainRowSpan}>
                                                                    {row[1]}
                                                                </td>
                                                            )}
                                                            {isSubFirst && (
                                                                <td className="bg-white align-top text-left border border-slate-300 p-2" rowSpan={subRowSpan}>
                                                                    {row[2]}
                                                                </td>
                                                            )}
                                                            <td className="bg-white text-left border border-slate-300 p-2 text-xs">
                                                                <div>{row[3]}</div>
                                                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                                                    <span
                                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                                                            examinedPeriods > 0
                                                                                ? 'bg-orange-50 text-orange-800 border-orange-200'
                                                                                : 'bg-sky-50 text-sky-700 border-sky-200'
                                                                        }`}
                                                                        title="Tỷ lệ % điểm mục tiêu dựa trên số tiết và giảm trừ bài đã thi"
                                                                    >
                                                                        {examinedPeriods > 0 && Math.round(naturalPercentVal) > Math.round(rowTargetPercentVal)
                                                                            ? `${Math.round(naturalPercentVal)}% ➝ giảm còn ${rowTargetPercentStr}%`
                                                                            : `Mục tiêu: ${rowTargetPercentStr}%`}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td
                                                                className="bg-white text-center cursor-pointer hover:bg-sky-50 border border-slate-300 p-1.5 text-xs font-semibold text-slate-800"
                                                                onClick={() => setEditingCell({ table: 'matrix', row: item.index, col: 4 })}
                                                                title="Nhấn để sửa số tiết của bài"
                                                            >
                                                                {editingCell?.table === 'matrix' && editingCell.row === item.index && editingCell.col === 4 ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        className="w-full text-center border border-sky-400 rounded p-0.5 outline-none"
                                                                        defaultValue={row[4]}
                                                                        onBlur={(e) => handleCellChange(item.index, 4, e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleCellChange(item.index, 4, e.currentTarget.value);
                                                                            if (e.key === 'Escape') setEditingCell(null);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        <span>{row[4]}</span>
                                                                        <span className="text-[10px] font-normal text-slate-400">tiết</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td
                                                                className={`text-center cursor-pointer hover:bg-orange-50 border border-slate-300 p-1.5 text-xs transition-colors ${
                                                                    examinedPeriods > 0 ? 'bg-orange-50/40' : 'bg-white'
                                                                }`}
                                                                onClick={() => setEditingCell({ table: 'matrix', row: item.index, col: 14 })}
                                                                title="Nhấn để nhập số tiết đã kiểm tra (Giữa kì). Những bài đã kiểm tra sẽ được giảm tỷ lệ để ưu tiên bài mới."
                                                            >
                                                                {editingCell?.table === 'matrix' && editingCell.row === item.index && editingCell.col === 14 ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="number"
                                                                        step="1"
                                                                        min="0"
                                                                        max={rowSoTiet}
                                                                        className="w-full text-center border border-orange-400 rounded p-0.5 outline-none font-bold text-orange-800 bg-white"
                                                                        defaultValue={row[14] || '0'}
                                                                        onBlur={(e) => handleCellChange(item.index, 14, e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleCellChange(item.index, 14, e.currentTarget.value);
                                                                            if (e.key === 'Escape') setEditingCell(null);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-0.5 leading-tight">
                                                                        <span className={`font-bold ${examinedPeriods > 0 ? 'text-orange-700' : 'text-slate-400'}`}>
                                                                            {examinedPeriods > 0 ? `${examinedPeriods} tiết đã KT` : '0 tiết'}
                                                                        </span>
                                                                        <span
                                                                            className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100 whitespace-nowrap"
                                                                            title={`Tỷ lệ mục tiêu ${rowTargetPercentStr}% (~${formatDiem(targetRowPoints)}đ)`}
                                                                        >
                                                                            Gợi ý: ~{suggestedQuestionCount} câu ({formatDiem(targetRowPoints)}đ)
                                                                        </span>
                                                                        <span className={`text-[10px] font-medium whitespace-nowrap ${rowTotalQuestions > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                                                            Đang chọn: {rowTotalQuestions} câu
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* 12 Assessment Cells */}
                                                            {parts.map(partKey =>
                                                                levels.map(lvlKey => {
                                                                    const cell = rowCfg[partKey][lvlKey];
                                                                    const cCount = cell?.count || 0;
                                                                    const cNL = cell?.competency || defaultNL;
                                                                    const isEditingThis =
                                                                        editingNewCell?.table === 'matrix' &&
                                                                        editingNewCell.row === item.index &&
                                                                        editingNewCell.part === partKey &&
                                                                        editingNewCell.level === lvlKey;

                                                                    return (
                                                                        <td
                                                                            key={`m-cell-${partKey}-${lvlKey}`}
                                                                            className="bg-white hover:bg-indigo-50/70 border border-slate-300 p-1 text-center relative min-w-[46px]"
                                                                        >
                                                                            {isEditingThis ? (
                                                                                <NewFormatCellEditor
                                                                                    initialCount={cCount}
                                                                                    initialCompetency={cNL}
                                                                                    onSave={(newC, newNL) => handleNewFormatCellSave(item.index, partKey, lvlKey, newC, newNL)}
                                                                                    onCancel={() => setEditingNewCell(null)}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    onClick={() => setEditingNewCell({ table: 'matrix', row: item.index, part: partKey, level: lvlKey })}
                                                                                    className="cursor-pointer flex flex-col items-center justify-center py-1 min-h-[34px]"
                                                                                    title="Nhấn để nhập số câu/lệnh hỏi (n) và chọn năng lực (NL)"
                                                                                >
                                                                                    {cCount > 0 ? (
                                                                                        <span className="font-bold text-slate-900">{cCount}</span>
                                                                                    ) : (
                                                                                        <span className="text-slate-300">-</span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })
                                                            )}

                                                            {/* Tổng Biết, Hiểu, Vận dụng */}
                                                            <td className="bg-amber-50/30 border border-slate-300 p-1.5 text-center font-bold text-slate-800">
                                                                {rowSumB > 0 ? rowSumB : '-'}
                                                            </td>
                                                            <td className="bg-amber-50/30 border border-slate-300 p-1.5 text-center font-bold text-slate-800">
                                                                {rowSumH > 0 ? rowSumH : '-'}
                                                            </td>
                                                            <td className="bg-amber-50/30 border border-slate-300 p-1.5 text-center font-bold text-slate-800">
                                                                {rowSumVD > 0 ? rowSumVD : '-'}
                                                            </td>

                                                            {/* Tỷ lệ % điểm */}
                                                            <td className="bg-emerald-50/30 border border-slate-300 p-1.5 text-center font-bold text-emerald-800">
                                                                {rowPct > 0 ? `${rowPct.toFixed(0)}%` : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot className="font-bold bg-slate-50 text-xs sm:text-sm">
                            <tr>
                                <td colSpan={4} className="text-center p-2 border border-slate-400">Tổng số câu/lệnh hỏi</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-sky-50/40" title="Tổng số tiết toàn ma trận">{totalSoTietAll} tiết</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-orange-50/40 text-orange-800" title="Tổng số tiết đã kiểm tra">{sumSoTietChecked} tiết đã KT</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.B || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.H || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.VD || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.B || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.H || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.VD || ''}</td>
                                {useShortAnswer && (
                                    <>
                                        <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.B || ''}</td>
                                        <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.H || ''}</td>
                                        <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.VD || ''}</td>
                                    </>
                                )}
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.B || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.H || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.VD || ''}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{newTotalCountB}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{newTotalCountH}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{newTotalCountVD}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-emerald-50">{newTotalCountB + newTotalCountH + newTotalCountVD}</td>
                            </tr>
                            <tr>
                                <td colSpan={6} className="text-center p-2 border border-slate-400">Tổng số điểm</td>
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsMC)}</td>
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsTF)}</td>
                                {useShortAnswer && (
                                    <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsSA)}</td>
                                )}
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsEssay)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{formatDiem(newPointsB)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{formatDiem(newPointsH)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{formatDiem(newPointsVD)}</td>
                                <td className="border border-slate-400 p-1.5 text-center text-indigo-700 bg-emerald-50">{formatDiem(newGrandTotalPoints)}</td>
                            </tr>
                            <tr>
                                <td colSpan={6} className="text-center p-2 border border-slate-400">Tỷ lệ %</td>
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsMC * 10).toFixed(0)}</td>
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsTF * 10).toFixed(0)}</td>
                                {useShortAnswer && (
                                    <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsSA * 10).toFixed(0)}</td>
                                )}
                                <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsEssay * 10).toFixed(0)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{(newPointsB * 10).toFixed(0)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{(newPointsH * 10).toFixed(0)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-amber-50">{(newPointsVD * 10).toFixed(0)}</td>
                                <td className="border border-slate-400 p-1.5 text-center bg-emerald-50">{(newGrandTotalPoints * 10).toFixed(0)}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                <table className="w-full border-collapse matrix-table text-sm bg-white">
                    <caption className="p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <span className="text-lg font-bold text-slate-800">KHUNG MA TRẬN ĐỀ KIỂM TRA</span>
                            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm text-xs">
                                <span className="font-semibold text-slate-700">Điểm mỗi câu Tự luận (Vận dụng):</span>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0.25"
                                    max="5.0"
                                    className="w-16 p-1 border border-indigo-400 rounded text-center font-bold text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={pointsTL}
                                    onChange={(e) => handleUpdatePointsTL(parseFloat(e.target.value))}
                                />
                                <span className="text-slate-500 font-medium">điểm/câu</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-500">TNKQ: <b>{pointsTNKQ}đ</b></span>
                            </div>
                        </div>
                    </caption>
                    <thead>
                        <tr className="bg-gray-100 text-gray-700">
                            <th rowSpan={2} className="border border-slate-300 p-2">TT</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Chương/chủ đề</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Nội dung/đơn vị kiến thức</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Bài</th>
                            <th rowSpan={2} className="border border-slate-300 p-2 w-16">Số tiết</th>
                            <th rowSpan={2} className="border border-slate-300 p-2 w-28 bg-orange-50/70 text-orange-950" title="Nhập số tiết đã kiểm tra (Giữa kỳ)">Đã kiểm tra<br/><span className="text-[10px] font-normal text-orange-800">(Số tiết &amp; câu)</span></th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-green-50">Nhận biết</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-blue-50">Thông hiểu</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-yellow-50">Vận dụng</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Tổng % điểm</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-700 text-xs">
                            <th className="border border-slate-300 p-2 bg-green-50">TNKQ<br/><span className="text-[10px] text-gray-400 font-normal">({pointsTNKQ}đ)</span></th>
                            <th className="border border-slate-300 p-2 bg-green-50">TL<br/><span className="text-[10px] text-gray-400 font-normal">({pointsTL}đ)</span></th>
                            <th className="border border-slate-300 p-2 bg-blue-50">TNKQ<br/><span className="text-[10px] text-gray-400 font-normal">({pointsTNKQ}đ)</span></th>
                            <th className="border border-slate-300 p-2 bg-blue-50">TL<br/><span className="text-[10px] text-gray-400 font-normal">({pointsTL}đ)</span></th>
                            <th className="border border-slate-300 p-2 bg-yellow-50">TNKQ<br/><span className="text-[10px] text-gray-400 font-normal">({pointsTNKQ}đ)</span></th>
                            <th className="border border-slate-300 p-2 bg-yellow-50 font-bold text-indigo-700">TL<br/><span className="text-[10px] text-indigo-600 font-medium">(tùy chỉnh đ)</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.map((mainGroup, mIdx) => {
                            const mainRowSpan = mainGroup.reduce((a, b) => a + b.length, 0);

                            return (
                                <React.Fragment key={mIdx}>
                                    {mainGroup.map((subGroup, sIdx) => {
                                        return (
                                            <React.Fragment key={sIdx}>
                                                {subGroup.map((item, iIdx) => {
                                                    const row = item.row;
                                                    const isMainFirst = sIdx === 0 && iIdx === 0;
                                                    const isSubFirst = iIdx === 0;
                                                    const subRowSpan = subGroup.length;
                                                    const examinedPeriods = parseFloat(String(row[14]) || '0');
                                                    
                                                    // Calculate Actual Score Percent
                                                    const rowTnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
                                                    const rowTl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
                                                    const rowTotalQuestions = rowTnkq + rowTl;
                                                    const rowPointTL = getRowPointsTL(item.index);
                                                    const rowPoints = (rowTnkq * pointsTNKQ) + (rowTl * rowPointTL);
                                                    const rowScorePercent = calculatePercentage(rowPoints);

                                                    // Calculate Weighted Target Percent based on Pool logic
                                                    const rowTargetPercent = getWeightedRowPercent(row);
                                                    const rowTargetPercentVal = parseFloat(rowTargetPercent) || 0;
                                                    const targetRowPoints = (rowTargetPercentVal / 100) * 10;
                                                    const suggestedQuestionCount = pointsTNKQ > 0 ? Math.max(0, Math.round(targetRowPoints / pointsTNKQ)) : 0;

                                                    return (
                                                        <tr key={item.index} className="hover:bg-slate-50 group">
                                                            <td className="bg-white relative border border-slate-300 p-2 text-center text-gray-500">
                                                                <span className="group-hover:opacity-0 transition-opacity">{row[0]}</span>
                                                                <button onClick={() => onDeleteRow(item.index)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-all z-10">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                            {isMainFirst && (
                                                                <td 
                                                                    className={`bg-white align-top text-left border border-slate-300 p-2 font-medium relative hover:bg-indigo-50 transition-colors ${draggedGroupIndex === mIdx ? 'opacity-50' : ''}`} 
                                                                    rowSpan={mainRowSpan}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, mIdx)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDrop(e, mIdx)}
                                                                    style={{ cursor: 'move' }}
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        <div className="mt-1 text-slate-400 group-hover:text-indigo-500">
                                                                            <GripVertical size={16} />
                                                                        </div>
                                                                        <span>{row[1]}</span>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            
                                                            {/* SubTopic Column */}
                                                            {isSubFirst && (
                                                                <td className="bg-white align-top text-left border border-slate-300 p-2" rowSpan={subRowSpan}>
                                                                    <div>{row[2]}</div>
                                                                </td>
                                                            )}

                                                            <td className="bg-white text-left border border-slate-300 p-2">
                                                                <span>{row[3]}</span>
                                                                <span className="ml-1 text-xs text-blue-600 font-semibold" title="Tỷ lệ % mục tiêu dựa trên phân bổ số tiết">({rowTargetPercent}%)</span>
                                                            </td>
                                                            <td className="bg-white text-center cursor-pointer hover:bg-sky-50 border border-slate-300 p-2" onClick={() => setEditingCell({ table: 'matrix', row: item.index, col: 4 })}>
                                                                {editingCell?.table === 'matrix' && editingCell.row === item.index && editingCell.col === 4 ? (
                                                                    <input autoFocus type="number" className="w-full text-center border border-sky-400 rounded p-1 outline-none" defaultValue={row[4]} onBlur={(e) => handleCellChange(item.index, 4, e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') handleCellChange(item.index, 4, e.currentTarget.value); if (e.key === 'Escape') setEditingCell(null);}} />
                                                                ) : row[4]}
                                                            </td>
                                                            <td className={`text-center cursor-pointer hover:bg-orange-50 border border-slate-300 p-2 ${examinedPeriods > 0 ? 'bg-orange-50/40' : 'bg-white'}`} onClick={() => setEditingCell({ table: 'matrix', row: item.index, col: 14 })}>
                                                                {editingCell?.table === 'matrix' && editingCell.row === item.index && editingCell.col === 14 ? (
                                                                    <input 
                                                                        autoFocus 
                                                                        type="number" 
                                                                        step="1"
                                                                        className="w-full text-center border border-sky-400 rounded p-1 outline-none" 
                                                                        defaultValue={row[14]} 
                                                                        onBlur={(e) => handleCellChange(item.index, 14, e.target.value)} 
                                                                        onKeyDown={(e) => {if (e.key === 'Enter') handleCellChange(item.index, 14, e.currentTarget.value); if (e.key === 'Escape') setEditingCell(null);}} 
                                                                    />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-0.5 text-xs leading-tight">
                                                                        <span className={`font-bold ${examinedPeriods > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                                                                            {examinedPeriods > 0 ? `${parseInt(String(row[14]) || '0', 10)} tiết đã KT` : '0 tiết'}
                                                                        </span>
                                                                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 whitespace-nowrap">
                                                                            Gợi ý: ~{suggestedQuestionCount} câu ({formatDiem(targetRowPoints)}đ)
                                                                        </span>
                                                                        <span className={`text-[10px] whitespace-nowrap ${rowTotalQuestions > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                                                                            Đang chọn: {rowTotalQuestions} câu
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                             {[5,6,7,8,9,10].map(ci => {
                                                                  const cau = parseInt(String(row[ci]) || "0");
                                                                  const isEditing = editingCell?.table === 'matrix' && editingCell.row === item.index && editingCell.col === ci;
                                                                  const isTLColumn = ci === 10;
                                                                  const currentTLPoint = isTLColumn ? getRowPointsTL(item.index) : pointsTL;

                                                                  return (
                                                                      <td 
                                                                          key={ci} 
                                                                          className={`bg-white border border-slate-300 p-2 text-center hover:bg-sky-50 transition-colors relative ${cau>0?"text-gray-900 font-medium":"text-gray-300"}`} 
                                                                      >
                                                                          {isEditing ? (
                                                                              <QuestionCellEditor
                                                                                  initialCount={cau}
                                                                                  isTLColumn={isTLColumn}
                                                                                  initialTLPoint={currentTLPoint}
                                                                                  onSave={(newCount, newPoint) => handleQuestionCellSave(item.index, ci, newCount, newPoint)}
                                                                                  onCancel={() => setEditingCell(null)}
                                                                              />
                                                                          ) : (
                                                                              <div 
                                                                                  onClick={() => setEditingCell({ table: 'matrix', row: item.index, col: ci })}
                                                                                  className="cursor-pointer flex flex-col items-center justify-center group/cell py-0.5"
                                                                                  title={isTLColumn ? "Nhấn để điều chỉnh số câu và điểm tương ứng" : "Nhấn để sửa số câu"}
                                                                              >
                                                                                  <span className="font-semibold text-sm">{cau > 0 ? `${cau} Câu` : "-"}</span>
                                                                                  {isTLColumn && cau > 0 && (
                                                                                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 mt-1 transition-colors">
                                                                                          {currentTLPoint}đ/câu
                                                                                      </span>
                                                                                  )}
                                                                              </div>
                                                                          )}
                                                                      </td>
                                                                  );
                                                             })}
                                                            
                                                            {/* Total % Score Column */}
                                                            <td className="bg-white border border-slate-300 p-2 text-center">
                                                                {rowScorePercent > 0 ? <span className="font-bold text-gray-700">{rowScorePercent.toFixed(1)}%</span> : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="font-bold bg-slate-50 text-sm">
                        <tr>
                            <td colSpan={4} className="text-right p-2 border border-slate-300">Tổng điểm / Số tiết</td>
                            <td className="border border-slate-300 p-2 text-center bg-sky-50/40">{totalSoTietAll} tiết</td>
                            <td className="border border-slate-300 p-2 text-center bg-orange-50/40 text-orange-800">{sumSoTietChecked} tiết đã KT</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(nbPoints)}</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(thPoints)}</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(vdPoints)}</td>
                            <td className="border border-slate-300 p-2 text-center text-primary">{formatDiem(totalTestPoints)}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-right p-2 border border-slate-300">Tỉ lệ điểm (%)</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{nb_percent.toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{th_percent.toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{vd_percent.toFixed(0)}%</td>
                            <td className="border border-slate-300 p-2 text-center">100%</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-right p-2 border border-slate-300">Tỉ lệ chung (%)</td>
                            <td colSpan={4} className="border border-slate-300 p-2 text-center">{(nb_percent + th_percent).toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{(vd_percent).toFixed(0)}%</td>
                            <td className="border border-slate-300 p-2 text-center">100%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            )}

            {/* * Ghi chú Section (hiển thị ngay dưới Bảng Ma trận và được xuất ra file Word) */}
            {(() => {
                const notesSummary = buildMatrixNotesSummary(data, examName);
                const noteItems = notesSummary?.items || notesSummary?.topicItems || [];
                if (noteItems.length === 0) return null;

                return (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm text-sm text-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                                <span className="text-red-600 text-lg leading-none">*</span>
                                <span>Ghi chú:</span>
                                <span className="text-xs font-normal text-slate-500 ml-1">
                                    (Tự động tính theo số tiết, cột Đã kiểm tra và xuất kèm vào file Word)
                                </span>
                            </h4>
                            <div className="flex items-center gap-2">
                                {data.customNote && !isEditingCustomNote && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newData = JSON.parse(JSON.stringify(data));
                                            delete newData.customNote;
                                            setCustomNoteDraft('');
                                            handleUpdateMatrixWithSync(newData);
                                        }}
                                        className="text-xs text-slate-500 hover:text-red-600 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        Khôi phục tự động
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isEditingCustomNote) {
                                            const defaultLines = data.customNote
                                                ? data.customNote
                                                : noteItems.map(it => `${it.lineText || it.formattedLine}\n   + Chi tiết: ${(it.lessonDetails || []).join('; ')}`).join('\n');
                                            setCustomNoteDraft(defaultLines);
                                            setIsEditingCustomNote(true);
                                        } else {
                                            setIsEditingCustomNote(false);
                                        }
                                    }}
                                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Pencil size={12} />
                                    <span>{isEditingCustomNote ? 'Đóng chỉnh sửa' : 'Tùy chỉnh ghi chú'}</span>
                                </button>
                            </div>
                        </div>

                        {isEditingCustomNote ? (
                            <div className="space-y-2.5 bg-white p-3 rounded-lg border border-indigo-200">
                                <textarea
                                    rows={5}
                                    value={customNoteDraft}
                                    onChange={(e) => setCustomNoteDraft(e.target.value)}
                                    placeholder="Nhập nội dung ghi chú tùy chỉnh (ví dụ: Chủ đề 1: 75% giảm còn 30% - giữ 10)..."
                                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingCustomNote(false)}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newData = JSON.parse(JSON.stringify(data));
                                            newData.customNote = customNoteDraft.trim() || undefined;
                                            handleUpdateMatrixWithSync(newData);
                                            setIsEditingCustomNote(false);
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                                    >
                                        <Check size={14} />
                                        <span>Lưu ghi chú</span>
                                    </button>
                                </div>
                            </div>
                        ) : data.customNote && data.customNote.trim() ? (
                            <div className="bg-white rounded-lg border border-amber-200/80 p-3.5 space-y-1.5 whitespace-pre-line font-medium text-slate-800">
                                {data.customNote}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-amber-200/80 p-3.5 space-y-2.5">
                                <div className="space-y-1.5">
                                    {noteItems.map((it, idx) => (
                                        <div key={idx} className="pb-1.5 border-b border-slate-100 last:border-none last:pb-0">
                                            <div className="font-bold text-slate-900 text-sm">
                                                {it.lineText || it.formattedLine}
                                            </div>
                                            {(it.lessonDetails || []).length > 0 && (
                                                <div className="text-xs text-slate-600 mt-0.5 pl-3 border-l-2 border-indigo-200">
                                                    Chi tiết bài: {(it.lessonDetails || []).join(' • ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {notesSummary.hasExamined && (
                                    <div className="pt-2 border-t border-amber-200/70 text-xs text-slate-700 flex flex-wrap gap-x-6 gap-y-1 bg-amber-50/40 p-2 rounded">
                                        <div>
                                            <span className="font-bold text-orange-800">- Nội dung đã kiểm tra (Giữa kì):</span>{' '}
                                            {notesSummary.totalExaminedPeriods}/{notesSummary.totalPeriods} tiết ({(notesSummary.actualOldPercent || 0).toFixed(1)}% thời lượng)
                                            {' ➝ '}Giảm tỷ lệ còn <b>{(notesSummary.realizedOldPercent || 0).toFixed(1)}%</b> (mục tiêu {(notesSummary.targetOldPercent || 0).toFixed(0)}%).
                                        </div>
                                        <div>
                                            <span className="font-bold text-emerald-800">- Nội dung mới:</span>{' '}
                                            {notesSummary.totalNewPeriods}/{notesSummary.totalPeriods} tiết ({(notesSummary.actualNewPercent || 0).toFixed(1)}% thời lượng)
                                            {' ➝ '}Tỷ lệ điểm <b>{(notesSummary.realizedNewPercent || 0).toFixed(1)}%</b> (mục tiêu {(notesSummary.targetNewPercent || 0).toFixed(0)}%).
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}
            
            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm mt-8">
                <table className="w-full border-collapse matrix-table text-sm bg-white">
                     <caption className="text-lg font-bold text-slate-800 p-4 bg-gray-50 text-left border-b border-gray-200">
                        {isNewFormat ? '2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ' : 'BẢNG ĐẶC TẢ ĐỀ KIỂM TRA'}
                     </caption>
                     {isNewFormat ? (
                         <thead>
                             <tr className="bg-gray-100 text-gray-800 font-bold text-xs">
                                 <th rowSpan={4} className="border border-slate-400 p-2 w-10">TT</th>
                                 <th rowSpan={4} className="border border-slate-400 p-2 min-w-[130px]">Chủ đề/<br/>Chương</th>
                                 <th rowSpan={4} className="border border-slate-400 p-2 min-w-[150px]">Nội dung/đơn vị kiến thức</th>
                                 <th rowSpan={4} className="border border-slate-400 p-2 min-w-[110px]">Bài</th>
                                 <th rowSpan={4} className="border border-slate-400 p-2 min-w-[340px]">Yêu cầu cần đạt</th>
                                 <th colSpan={useShortAnswer ? 12 : 9} className="border border-slate-400 p-2 bg-indigo-50/60">Số câu hỏi ở các mức độ đánh giá</th>
                             </tr>
                             <tr className="bg-gray-100 text-gray-800 font-bold text-xs">
                                 <th colSpan={useShortAnswer ? 9 : 6} className="border border-slate-400 p-1.5 bg-sky-50/70">TNKQ</th>
                                 <th colSpan={3} rowSpan={2} className="border border-slate-400 p-1.5 bg-purple-50/70">Tự luận</th>
                             </tr>
                             <tr className="bg-gray-100 text-gray-800 font-semibold text-xs">
                                 <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">Nhiều lựa chọn</th>
                                 <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">"Đúng – Sai"</th>
                                 {useShortAnswer && (
                                     <th colSpan={3} className="border border-slate-400 p-1.5 italic bg-white">Trả lời ngắn</th>
                                 )}
                             </tr>
                             <tr className="bg-gray-50 text-gray-700 font-bold text-[11px]">
                                 <th className="border border-slate-400 p-1.5">Biết</th>
                                 <th className="border border-slate-400 p-1.5">Hiểu</th>
                                 <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                 <th className="border border-slate-400 p-1.5">Biết</th>
                                 <th className="border border-slate-400 p-1.5">Hiểu</th>
                                 <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                 {useShortAnswer && (
                                     <>
                                         <th className="border border-slate-400 p-1.5">Biết</th>
                                         <th className="border border-slate-400 p-1.5">Hiểu</th>
                                         <th className="border border-slate-400 p-1.5">Vận dụng</th>
                                     </>
                                 )}
                                 <th className="border border-slate-400 p-1.5">Biết</th>
                                 <th className="border border-slate-400 p-1.5">Hiểu</th>
                                 <th className="border border-slate-400 p-1.5">Vận dụng</th>
                             </tr>
                         </thead>
                     ) : (
                         <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border border-slate-300 p-2">TT</th>
                                <th className="border border-slate-300 p-2">Chương/Chủ đề</th>
                                <th className="border border-slate-300 p-2">Nội dung/đơn vị kiến thức</th>
                                <th className="border border-slate-300 p-2">Bài</th>
                                <th className="border border-slate-300 p-2 w-[400px]">Mức độ đánh giá</th>
                                <th className="border border-slate-300 p-2 w-24 text-center">Nhận biết<br/>(TNKQ)</th>
                                <th className="border border-slate-300 p-2 w-24 text-center">Thông hiểu<br/>(TNKQ)</th>
                                <th className="border border-slate-300 p-2 w-24 text-center">Vận dụng<br/>(TL)</th>
                            </tr>
                         </thead>
                     )}
                     <tbody>
                        {groupedRows.map((mainGroup, mIdx) => (
                             <React.Fragment key={mIdx}>
                                {mainGroup.map((subGroup, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                         {subGroup.map((item, iIdx) => {
                                             const isMainFirst = sIdx === 0 && iIdx === 0;
                                             const isSubFirst = iIdx === 0;
                                             const mainRowSpan = isNewFormat
                                                 ? mainGroup.reduce((a, b) => a + b.reduce((s, it) => s + buildNewSpecSubRows(it.index).length, 0), 0)
                                                 : mainGroup.reduce((a, b) => a + b.length, 0);
                                             const subRowSpan = isNewFormat
                                                 ? subGroup.reduce((s, it) => s + buildNewSpecSubRows(it.index).length, 0)
                                                 : subGroup.length;
                                             return renderSpecRow(data.specifications.rows[item.index] as unknown as string[], item.index, isMainFirst ? mainRowSpan : null, isSubFirst ? subRowSpan : null)
                                         })}
                                    </React.Fragment>
                                ))}
                             </React.Fragment>
                        ))}
                     </tbody>
                     {isNewFormat && (
                         <tfoot className="font-bold bg-slate-50 text-xs sm:text-sm">
                             <tr>
                                 <td colSpan={5} className="text-center p-2 border border-slate-400">Tổng số câu</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.B || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.H || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.mc.VD || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.B || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.H || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.tf.VD || ''}</td>
                                 {useShortAnswer && (
                                     <>
                                         <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.B || ''}</td>
                                         <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.H || ''}</td>
                                         <td className="border border-slate-400 p-1.5 text-center">{newTotals.sa.VD || ''}</td>
                                     </>
                                 )}
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.B || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.H || ''}</td>
                                 <td className="border border-slate-400 p-1.5 text-center">{newTotals.essay.VD || ''}</td>
                             </tr>
                             <tr>
                                 <td colSpan={5} className="text-center p-2 border border-slate-400">Tổng số điểm</td>
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsMC)}</td>
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsTF)}</td>
                                 {useShortAnswer && (
                                     <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsSA)}</td>
                                 )}
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{formatDiem(newPointsEssay)}</td>
                             </tr>
                             <tr>
                                 <td colSpan={5} className="text-center p-2 border border-slate-400">Tỉ lệ %</td>
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsMC * 10).toFixed(0)}</td>
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsTF * 10).toFixed(0)}</td>
                                 {useShortAnswer && (
                                     <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsSA * 10).toFixed(0)}</td>
                                 )}
                                 <td colSpan={3} className="border border-slate-400 p-1.5 text-center">{(newPointsEssay * 10).toFixed(0)}</td>
                             </tr>
                         </tfoot>
                     )}
                </table>
            </div>
        </div>
    );
};

export default MatrixView;