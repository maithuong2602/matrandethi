import React, { useState } from 'react';
import { MatrixData } from '../types';
import { formatDiem } from '../utils';
import { Trash2, GripVertical } from 'lucide-react';

interface MatrixViewProps {
    data: MatrixData;
    onUpdateMatrix: (newData: MatrixData) => void;
    onDeleteRow: (index: number) => void;
    onEditPercentage?: () => void;
    examName: string; // Added to check for Final Exam
}

const MatrixView: React.FC<MatrixViewProps> = ({ data, onUpdateMatrix, onDeleteRow, examName }) => {
    const pointsTNKQ = 0.25;
    const pointsTL = 1.0;
    const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
    const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);

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
    const nbPoints = (matrixTotals[5] * pointsTNKQ) + (matrixTotals[6] * pointsTL);
    const thPoints = (matrixTotals[7] * pointsTNKQ) + (matrixTotals[8] * pointsTL);
    const vdPoints = (matrixTotals[9] * pointsTNKQ) + (matrixTotals[10] * pointsTL);
    const vdcPoints = (matrixTotals[11] * pointsTNKQ) + (matrixTotals[12] * pointsTL);
    
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
            onUpdateMatrix(newData);
            setEditingCell(null);
            return;
        }
        
        if (colIndex === 14) { // "So tiet da thi" Change (INTEGER)
             const soTiet = parseFloat(newData.matrix.rows[rowIndex][4] || '0');
             let examined = parseInt(newValue, 10); // Changed to parseInt
             if (isNaN(examined) || examined < 0) examined = 0;
             if (examined > soTiet) examined = Math.floor(soTiet); // Cap at total (floored)
             
             newData.matrix.rows[rowIndex][14] = examined.toString();
             onUpdateMatrix(newData);
             setEditingCell(null); // Close input on blur/enter
             return;
        }
        
        // Spec Counts Change
        const specRow = newData.specifications.rows[rowIndex];
        
        let [nb_tn, nb_tl]   = (String(specRow[5]) || '0-0').split('-').map(n => n.trim());
        let [th_tn, th_tl]   = (String(specRow[6]) || '0-0').split('-').map(n => n.trim());
        let [vd_tn, vd_tl]   = (String(specRow[7]) || '0-0').split('-').map(n => n.trim());
        let [vdc_tn, vdc_tl] = (String(specRow[8]) || '0-0').split('-').map(n => n.trim());

        // Update Matrix Value first
        newData.matrix.rows[rowIndex][colIndex] = newValue;

        // Sync Specifications string
        if (colIndex === 5) nb_tn = newValue;
        if (colIndex === 6) nb_tl = newValue;
        if (colIndex === 7) th_tn = newValue;
        if (colIndex === 8) th_tl = newValue;
        if (colIndex === 9) vd_tn = newValue;
        if (colIndex === 10) vd_tl = newValue;
        if (colIndex === 11) vdc_tn = newValue;
        if (colIndex === 12) vdc_tl = newValue;

        specRow[5] = `${nb_tn}-${nb_tl}`;
        specRow[6] = `${th_tn}-${th_tl}`;
        specRow[7] = `${vd_tn}-${vd_tl}`;
        specRow[8] = `${vdc_tn}-${vdc_tl}`;

        onUpdateMatrix(newData);
        setEditingCell(null);
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

        onUpdateMatrix(newData);
        setDraggedGroupIndex(null);
    };

    const renderSpecRow = (row: string[], rowIndex: number, rowspanMain: number | null, rowspanSub: number | null) => {
        const [stt, main, sub, lesson, req, nb_raw, th_raw, vd_raw, vdc_raw] = row;
        
        const [nb_tn, nb_tl] = (String(nb_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [th_tn, th_tl] = (String(th_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [vd_tn, vd_tl] = (String(vd_raw)||'0-0').split('-').map(s=>parseInt(s)||0);
        const [vdc_tn, vdc_tl] = (String(vdc_raw)||'0-0').split('-').map(s=>parseInt(s)||0);

        const avail = data.availableCounts[rowIndex] || { NB:{TN:0,TL:0}, TH:{TN:0,TL:0}, VD:{TN:0,TL:0}, VDC:{TN:0,TL:0} };
        
        // Helper to collect positions for this row
        const getPositions = () => {
            const parts = [];
            // Order: NB, TH, VD, VDC
            const posNB_TN = positionMap[`${rowIndex}-5`]; if(posNB_TN) parts.push(`NB: ${posNB_TN}`);
            const posNB_TL = positionMap[`${rowIndex}-6`]; if(posNB_TL) parts.push(`NB: ${posNB_TL}`);
            
            const posTH_TN = positionMap[`${rowIndex}-7`]; if(posTH_TN) parts.push(`TH: ${posTH_TN}`);
            const posTH_TL = positionMap[`${rowIndex}-8`]; if(posTH_TL) parts.push(`TH: ${posTH_TL}`);
            
            const posVD_TN = positionMap[`${rowIndex}-9`]; if(posVD_TN) parts.push(`VD: ${posVD_TN}`);
            const posVD_TL = positionMap[`${rowIndex}-10`]; if(posVD_TL) parts.push(`VD: ${posVD_TL}`);

            const posVDC_TN = positionMap[`${rowIndex}-11`]; if(posVDC_TN) parts.push(`VDC: ${posVDC_TN}`);
            const posVDC_TL = positionMap[`${rowIndex}-12`]; if(posVDC_TL) parts.push(`VDC: ${posVDC_TL}`);
            
            return parts;
        };
        const positions = getPositions();

        // Helper to render cell with count and MAX AVAILABLE
        const renderCell = (count: number, max: number, type: 'TN' | 'TL', colIndex: number) => {
            const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
            
            return (
                <td className="bg-white cursor-pointer hover:bg-sky-50 p-2 border border-slate-300 text-center w-24 align-middle" onClick={() => setEditingCell({row: rowIndex, col: colIndex})}>
                    {isEditing ? (
                        <div className="flex flex-col items-center">
                            <input 
                                autoFocus 
                                type="number" 
                                className="w-full text-center border border-sky-400 rounded p-1 outline-none text-sm" 
                                defaultValue={count} 
                                onBlur={(e) => handleCellChange(rowIndex, colIndex, e.target.value)} 
                                onKeyDown={(e) => {if (e.key === 'Enter') handleCellChange(rowIndex, colIndex, e.currentTarget.value); if (e.key === 'Escape') setEditingCell(null);}} 
                            />
                            <span className="text-[10px] text-slate-400 mt-1">Kho: {max}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <span className={`font-semibold text-lg ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{count}</span>
                            <span className="text-xs text-gray-400" title="Số câu có sẵn trong ngân hàng">/ {max}</span>
                        </div>
                    )}
                </td>
            );
        };

        return (
            <tr key={`spec-${rowIndex}`} className="hover:bg-slate-50 group">
                <td className="bg-white relative border border-slate-300 p-2 text-center align-middle">
                    <span className="group-hover:opacity-0 transition-opacity">{stt}</span>
                </td>
                {rowspanMain && <td className="bg-white align-top text-left border border-slate-300 p-2 font-medium" rowSpan={rowspanMain}>{main}</td>}
                {rowspanSub && <td className="bg-white align-top text-left border border-slate-300 p-2" rowSpan={rowspanSub}>{sub}</td>}
                <td className="bg-white text-left align-middle border border-slate-300 p-2 text-sm">{lesson}</td>
                <td className="bg-white text-left text-sm border border-slate-300 p-2 min-w-[350px]">
                    <div dangerouslySetInnerHTML={{__html: req}} />
                    {positions.length > 0 && (
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
                
                {/* Specific Columns: NB(TN), TH(TN), VD(TL), VDC(TL) */}
                {renderCell(nb_tn, avail.NB.TN, 'TN', 5)}
                {renderCell(th_tn, avail.TH.TN, 'TN', 7)}
                {renderCell(vd_tl, avail.VD.TL, 'TL', 10)}
                {renderCell(vdc_tl, avail.VDC.TL, 'TL', 12)}
            </tr>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                <table className="w-full border-collapse matrix-table text-sm bg-white">
                    <caption className="text-lg font-bold text-slate-800 p-4 bg-gray-50 text-left border-b border-gray-200">KHUNG MA TRẬN ĐỀ KIỂM TRA</caption>
                    <thead>
                        <tr className="bg-gray-100 text-gray-700">
                            <th rowSpan={2} className="border border-slate-300 p-2">TT</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Chương/chủ đề</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Nội dung/đơn vị kiến thức</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Bài</th>
                            <th rowSpan={2} className="border border-slate-300 p-2 w-16">Số tiết</th>
                            <th rowSpan={2} className="border border-slate-300 p-2 w-20" title="Nhập số tiết đã thi (Giữa kỳ)">Số tiết<br/>đã thi</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-green-50">Nhận biết</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-blue-50">Thông hiểu</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-yellow-50">Vận dụng</th>
                            <th colSpan={2} className="border border-slate-300 p-2 bg-red-50">Vận dụng cao</th>
                            <th rowSpan={2} className="border border-slate-300 p-2">Tổng % điểm</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-700 text-xs">
                            <th className="border border-slate-300 p-2 bg-green-50">TNKQ</th><th className="border border-slate-300 p-2 bg-green-50">TL</th>
                            <th className="border border-slate-300 p-2 bg-blue-50">TNKQ</th><th className="border border-slate-300 p-2 bg-blue-50">TL</th>
                            <th className="border border-slate-300 p-2 bg-yellow-50">TNKQ</th><th className="border border-slate-300 p-2 bg-yellow-50">TL</th>
                            <th className="border border-slate-300 p-2 bg-red-50">TNKQ</th><th className="border border-slate-300 p-2 bg-red-50">TL</th>
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
                                                    const rowPoints = (rowTnkq * pointsTNKQ) + (rowTl * pointsTL);
                                                    const rowScorePercent = calculatePercentage(rowPoints);

                                                    // Calculate Weighted Target Percent based on Pool logic
                                                    const rowTargetPercent = getWeightedRowPercent(row);

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
                                                            <td className="bg-white text-center cursor-pointer hover:bg-sky-50 border border-slate-300 p-2" onClick={() => setEditingCell({row: item.index, col: 4})}>
                                                                {editingCell?.row === item.index && editingCell?.col === 4 ? (
                                                                    <input autoFocus type="number" className="w-full text-center border border-sky-400 rounded p-1 outline-none" defaultValue={row[4]} onBlur={(e) => handleCellChange(item.index, 4, e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') handleCellChange(item.index, 4, e.currentTarget.value); if (e.key === 'Escape') setEditingCell(null);}} />
                                                                ) : row[4]}
                                                            </td>
                                                            <td className="bg-white text-center cursor-pointer hover:bg-sky-50 border border-slate-300 p-2" onClick={() => setEditingCell({row: item.index, col: 14})}>
                                                                {editingCell?.row === item.index && editingCell?.col === 14 ? (
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
                                                                    <span className={examinedPeriods > 0 ? 'text-gray-800' : 'text-gray-300'}>{parseInt(String(row[14]) || '0', 10)}</span>
                                                                )}
                                                            </td>
                                                            {[5,6,7,8,9,10,11,12].map(ci => {
                                                                 const cau = parseInt(String(row[ci]) || '0');
                                                                 const isTNKQ = ci % 2 !== 0; // 5(TN), 6(TL), 7(TN)...
                                                                 const diem = cau * (isTNKQ ? pointsTNKQ : pointsTL);
                                                                 return <td key={ci} className={`bg-white border border-slate-300 p-2 text-center ${cau>0?'text-gray-900 font-medium':'text-gray-300'}`}>{cau > 0 ? `${cau} Câu` : ''}</td>
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
                            <td colSpan={6} className="text-right p-2 border border-slate-300">Tổng điểm</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(nbPoints)}</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(thPoints)}</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(vdPoints)}</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{formatDiem(vdcPoints)}</td>
                            <td className="border border-slate-300 p-2 text-center text-primary">{formatDiem(totalTestPoints)}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-right p-2 border border-slate-300">Tỉ lệ điểm (%)</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{nb_percent.toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{th_percent.toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{vd_percent.toFixed(0)}%</td>
                            <td colSpan={2} className="border border-slate-300 p-2 text-center">{vdc_percent.toFixed(0)}%</td>
                            <td className="border border-slate-300 p-2 text-center">100%</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="text-right p-2 border border-slate-300">Tỉ lệ chung (%)</td>
                            <td colSpan={4} className="border border-slate-300 p-2 text-center">{(nb_percent + th_percent).toFixed(0)}%</td>
                            <td colSpan={4} className="border border-slate-300 p-2 text-center">{(vd_percent + vdc_percent).toFixed(0)}%</td>
                            <td className="border border-slate-300 p-2 text-center">100%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Note Section for Final Exams */}
            {isFinalExam && sumSoTietChecked > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-sm text-gray-800">
                    <h4 className="font-bold mb-3 text-base flex items-center gap-2">
                        <span className="text-red-500">*</span> Ghi chú phân bổ tỷ lệ:
                    </h4>
                    <ul className="space-y-2 list-none pl-0">
                        <li className="flex items-start gap-2">
                            <span className="font-medium min-w-[150px]">Nội dung đã thi:</span> 
                            <span>Chiếm <b>{actualPercentOld.toFixed(1)}%</b> thời lượng thực tế <span className="mx-2">➝</span> Giảm trọng số còn <b>{targetPercentOld.toFixed(1)}%</b> điểm số toàn bài.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-medium min-w-[150px]">Nội dung mới:</span> 
                            <span>Chiếm <b>{actualPercentNew.toFixed(1)}%</b> thời lượng thực tế <span className="mx-2">➝</span> Trọng số là <b>{targetPercentNew.toFixed(1)}%</b> điểm số toàn bài.</span>
                        </li>
                    </ul>
                </div>
            )}
            
            <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm mt-8">
                <table className="w-full border-collapse matrix-table text-sm bg-white">
                     <caption className="text-lg font-bold text-slate-800 p-4 bg-gray-50 text-left border-b border-gray-200">BẢNG ĐẶC TẢ ĐỀ KIỂM TRA</caption>
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
                            <th className="border border-slate-300 p-2 w-24 text-center">Vận dụng cao<br/>(TL)</th>
                        </tr>
                     </thead>
                     <tbody>
                        {groupedRows.map((mainGroup, mIdx) => (
                             <React.Fragment key={mIdx}>
                                {mainGroup.map((subGroup, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                         {subGroup.map((item, iIdx) => {
                                             const isMainFirst = sIdx === 0 && iIdx === 0;
                                             const isSubFirst = iIdx === 0;
                                             const mainRowSpan = mainGroup.reduce((a, b) => a + b.length, 0);
                                             const subRowSpan = subGroup.length;
                                             return renderSpecRow(data.specifications.rows[item.index] as unknown as string[], item.index, isMainFirst ? mainRowSpan : null, isSubFirst ? subRowSpan : null)
                                         })}
                                    </React.Fragment>
                                ))}
                             </React.Fragment>
                        ))}
                     </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatrixView;