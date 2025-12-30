import { REQUIREMENTS_DATA } from './data/matrixConstants';
import { MatrixData, ExerciseQuestion } from './types';

export const getRequirementsHtml = (grade: string, mainTopic: string, subTopic: string): string => {
    const gradeNumberMatch = grade.match(/\d+/);
    if (!gradeNumberMatch) return '';
    const gradeKey = `Lớp ${gradeNumberMatch[0]}`;
    const gradeData = REQUIREMENTS_DATA[gradeKey];

    if (!gradeData || !gradeData[mainTopic] || !gradeData[mainTopic][subTopic]) {
        return '';
    }
    const requirementsText: string = gradeData[mainTopic][subTopic];
    
    const levelKeywords = ["nhận biết", "thông hiểu", "vận dụng", "vận dụng cao"];
    let isFirstLevel = true;
    
    return requirementsText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '';

        const coreText = trimmedLine.replace(/^[\d.]+\s*/, '').toLowerCase();
        const isLevel = levelKeywords.some(keyword => coreText.startsWith(keyword));
        
        if (isLevel) {
            const marginTopClass = isFirstLevel ? '' : 'mt-2';
            isFirstLevel = false;
            return `<strong class="block font-semibold ${marginTopClass}">${trimmedLine}</strong>`;
        } else {
            return `<div class="pl-2">${trimmedLine}</div>`;
        }
    }).join('');
};

export const formatDiem = (diem: number): string => {
    const scaled = Math.round(diem * 100);
    if (scaled % 100 === 0) {
        return (scaled / 100).toFixed(1).replace('.', ',');
    }
    return (scaled / 100).toString().replace('.', ',');
};

export const generateExamWordHtml = (questions: any[], headerInfo: any) => {
    const headerHtml = `
        <table style="width: 100%; border: none; margin-bottom: 20px; font-family: 'Times New Roman', serif;">
            <tr>
                <td style="text-align: center; vertical-align: top; width: 40%;">
                    <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${headerInfo.donVi}</p>
                    <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${headerInfo.tenTruong}</p>
                    <div style="border-bottom: 1px solid black; width: 40%; margin: 5px auto;"></div>
                </td>
                <td style="text-align: center; vertical-align: top; width: 60%;">
                    <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${headerInfo.tenKyThi}</p>
                    <p style="margin: 0; font-weight: bold; text-transform: uppercase;">MÔN: ${headerInfo.monHoc}</p>
                    <p style="margin: 0;">Thời gian làm bài: ${headerInfo.thoiGian}</p>
                    <p style="margin: 0; font-style: italic;">(Không kể thời gian phát đề)</p>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="text-align: left; padding-top: 15px; padding-left: 20px;">
                    <p style="margin: 5px 0;"><strong>Họ và tên thí sinh:</strong> ........................................................................ <strong>Số báo danh:</strong> .....................</p>
                    <p style="margin: 5px 0;"><strong>Mã đề: ${headerInfo.maDe || '.......'}</strong></p>
                </td>
            </tr>
        </table>
        <div style="border-bottom: 1px solid black; margin-bottom: 20px;"></div>
    `;

    let bodyHtml = '<div style="font-size: 13pt; line-height: 1.3;">';
    
    // Sort or Group questions if needed. Here assuming they are already sorted by the caller.
    const mcQuestions = questions.filter(q => q.category !== 'essay');
    const essayQuestions = questions.filter(q => q.category === 'essay');

    // Section I: MC
    if (mcQuestions.length > 0) {
        bodyHtml += '<p style="font-weight: bold; margin-top: 10px;">I. TRẮC NGHIỆM</p>';
        mcQuestions.forEach((q, idx) => {
            bodyHtml += `<div style="margin-bottom: 10px;">`;
            bodyHtml += `<p style="margin-bottom: 5px;"><strong>Câu ${idx + 1}:</strong> ${q.content}</p>`;
            
            if (q.image) {
                bodyHtml += `<p style="text-align: center;"><img src="${q.image}" style="max-width: 400px; max-height: 300px;" /></p>`;
            }

            if (q.options && q.options.length > 0) {
                bodyHtml += `<table style="width: 100%; border: none; margin-top: 5px;"><tr>`;
                q.options.forEach((opt: any, i: number) => {
                    const label = String.fromCharCode(65 + i); // A, B, C, D
                    bodyHtml += `<td style="vertical-align: top; padding-right: 10px; width: 25%;"><b>${label}.</b> ${opt.text}</td>`;
                });
                bodyHtml += `</tr></table>`;
            }
            bodyHtml += `</div>`;
        });
    }

    // Section II: Essay
    if (essayQuestions.length > 0) {
        bodyHtml += '<p style="font-weight: bold; margin-top: 20px;">II. TỰ LUẬN</p>';
        essayQuestions.forEach((q, idx) => {
            bodyHtml += `<div style="margin-bottom: 15px;">`;
            bodyHtml += `<p style="margin-bottom: 5px;"><strong>Câu ${idx + 1} (${q.points || 1.0} điểm):</strong> ${q.content}</p>`;
             if (q.image) {
                bodyHtml += `<p style="text-align: center;"><img src="${q.image}" style="max-width: 400px; max-height: 300px;" /></p>`;
            }
            bodyHtml += `</div>`;
        });
    }

    bodyHtml += '</div>';

    const gradingHtml = `
        <br/><br/>
        <div style="text-align: center; font-weight: bold;">--- HẾT ---</div>
    `;

    return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>Exam Paper</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 13pt; }
                table, td, tr { font-family: 'Times New Roman', serif; }
            </style>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                </w:WordDocument>
            </xml>
        </head>
        <body style="padding: 2cm 2cm 2cm 2cm;">
            ${headerHtml}
            ${bodyHtml}
            ${gradingHtml}
        </body>
        </html>
    `;
};

export const generatePrintHTML = (data: MatrixData, examName: string) => {
    // Extract Grade from examName to use in Title
    const gradeMatch = examName.match(/\d+/);
    const gradeStr = gradeMatch ? gradeMatch[0] : "";
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Determine exam type for logic branching
    const isFinalExam = /cuối\s+k[ìỳ]/i.test(examName);
    
    const matrixTitle = `KHUNG MA TRẬN ĐỀ KIỂM TRA MÔN TIN LỚP ${gradeStr} - ${examName.toUpperCase()} NĂM HỌC ${currentYear}-${nextYear}`;
    const specTitle = `BẢNG ĐẶC TẢ ĐỀ KIỂM TRA MÔN TIN LỚP ${gradeStr} - ${examName.toUpperCase()} NĂM HỌC ${currentYear}-${nextYear}`;
    const pointsTNKQ = 0.25;
    const pointsTL = 1.0;

    // Helper to format percentages: 40.0 -> "40", 40.5 -> "40,5"
    const formatPercent = (val: number): string => {
        const rounded = parseFloat(val.toFixed(1));
        if (rounded % 1 === 0) {
            return rounded.toFixed(0);
        }
        return rounded.toString().replace('.', ',');
    };

    // Calculate Position Map for Export
    const positionMap: Record<string, string> = {};
    let tnkqCounter = 1;
    let tlCounter = 1;

    // TNKQ: NB(5) -> TH(7) -> VD(9) -> VDC(11)
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

    // TL: NB(6) -> TH(8) -> VD(10) -> VDC(12)
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

    // CSS Definitions
    const css = `
        <style>
            @page Section1 {
                size: 29.7cm 21cm;
                margin: 1.5cm 2cm 1.5cm 2cm;
                mso-page-orientation: landscape;
            }
            div.Section1 {
                page: Section1;
            }
            body { 
                font-family: 'Times New Roman', Times, serif; 
                font-size: 11pt; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                table-layout: fixed; 
                margin-bottom: 20px;
            }
            caption { 
                font-size: 13pt; 
                font-weight: bold; 
                margin-bottom: 6pt; 
                text-align: center; 
                text-transform: uppercase; 
            }
            th, td { 
                border: 1px solid windowtext;
                padding: 4px; 
                text-align: center; 
                vertical-align: middle; 
                word-wrap: break-word; 
            }
            th { 
                font-weight: bold; 
                background-color: #f2f2f2; 
            }
            .text-left { text-align: left; }
            .align-top { vertical-align: top; }
            tfoot td { font-weight: bold; }
            
            /* Print Specifics */
            .page-break { page-break-after: always; }
            
            /* Column Width Helpers */
            .col-tt { width: 4%; }
            .col-chuong { width: 14%; }
            .col-noidung { width: 18%; }
            .col-sotiet { width: 6%; }
            .col-level { width: 8%; }
            .col-total { width: 8%; }
            .col-req { width: 44%; } /* Increased width since col-bai is gone */
            
            .position-tag {
                display: inline-block;
                margin-right: 5px;
                color: #0056b3;
                font-size: 10pt;
            }
        </style>
    `;

    // 1. Calculate Totals & Weights Logic
    let totalExamPoints = 0;
    let totalSoTiet = 0;
    
    let sumSoTietChecked = 0;
    let sumSoTietUnchecked = 0;

    data.matrix.rows.forEach(row => {
         const st = parseFloat(String(row[4]) || '0');
         const examined = parseFloat(String(row[14]) || '0');
         const validExamined = Math.min(Math.max(examined, 0), st);
         const validNew = Math.max(st - validExamined, 0);

         totalSoTiet += st;
         sumSoTietChecked += validExamined;
         sumSoTietUnchecked += validNew;

         const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
         const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
         totalExamPoints += (tnkq * pointsTNKQ) + (tl * pointsTL);
    });

    // Dynamic Weight Logic for Column Calculations (Target %)
    const MIN_CHECKED_RATIO = 0.3; // 30%
    const MAX_CHECKED_RATIO = 0.4; // 40%
    let weightChecked = 1.0;
    let weightUnchecked = 1.0;

    if (sumSoTietChecked > 0 && sumSoTietUnchecked > 0) {
        // Natural ratio
        const naturalCheckedRatio = sumSoTietChecked / totalSoTiet;
        let finalCheckedRatio = naturalCheckedRatio;

        // Apply Logic: If Final Exam -> Clamp. If Mid-term -> Use Natural.
        if (isFinalExam) {
            if (finalCheckedRatio > MAX_CHECKED_RATIO) finalCheckedRatio = MAX_CHECKED_RATIO;
            if (finalCheckedRatio < MIN_CHECKED_RATIO) finalCheckedRatio = MIN_CHECKED_RATIO;
        } 
        
        const finalUncheckedRatio = 1 - finalCheckedRatio;
        
        // Convert to multipliers relative to natural period count
        weightChecked = finalCheckedRatio;
        weightUnchecked = finalUncheckedRatio;
    }

    // ACTUAL Period Percentages
    const actualPercentChecked = totalSoTiet > 0 ? (sumSoTietChecked / totalSoTiet) * 100 : 0;
    const actualPercentUnchecked = totalSoTiet > 0 ? (sumSoTietUnchecked / totalSoTiet) * 100 : 0;
    
    // NEW: Calculate REALIZED POINTS Percentages for the Note (Matches actual distribution)
    let realizedPointsOld = 0;
    data.matrix.rows.forEach(row => {
         const st = parseFloat(String(row[4]) || '0');
         const examined = parseFloat(String(row[14]) || '0');
         const validExamined = Math.min(Math.max(examined, 0), st);
         const validNew = Math.max(st - validExamined, 0);
         
         const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
         const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
         const rowPoints = (tnkq * pointsTNKQ) + (tl * pointsTL);

         // Determine if purely old lesson (Strict logic matching MatrixBuilder)
         if (validExamined > 0 && validNew === 0) {
             realizedPointsOld += rowPoints;
         }
    });
    const notePercentOld = totalExamPoints > 0 ? (realizedPointsOld / totalExamPoints * 100) : 0;
    const notePercentNew = 100 - notePercentOld;

    // Helper to calculate target percent for a row (For Columns)
    const getRowTargetPercent = (row: any) => {
        const st = parseFloat(String(row[4])||'0');
        const examined = parseFloat(String(row[14])||'0');
        const validExamined = Math.min(Math.max(examined, 0), st);
        const validNew = Math.max(st - validExamined, 0);
        
        if (sumSoTietChecked > 0 && sumSoTietUnchecked > 0) {
            const pctFromOld = (validExamined / sumSoTietChecked) * weightChecked * 100;
            const pctFromNew = (validNew / sumSoTietUnchecked) * weightUnchecked * 100;
            return pctFromOld + pctFromNew;
        } else {
            // Standard mode
            return totalSoTiet > 0 ? (st / totalSoTiet) * 100 : 0;
        }
    };

    // 2. Group Rows
    const groupedByMainTopic = data.matrix.rows.reduce((acc: any, row) => {
        const main = row[1]; if(!acc[main]) acc[main] = [];
        acc[main].push(row);
        return acc;
    }, {});

    let matrixBodyHtml = '';
    let specBodyHtml = '';
    
    const matrixTotals = { cau: Array(15).fill(0), diem: Array(15).fill(0) };
    let specTotals = { nb: 0, th: 0, vd: 0, vdc: 0 };
    
    let stt = 1;

    Object.keys(groupedByMainTopic).forEach(mainTopic => {
        const rows = groupedByMainTopic[mainTopic];
        
        // Calculate Main Topic Stats
        let mainTopicPoints = 0;
        let mainTopicSoTiet = 0;
        let mainTopicWeightedPercent = 0;

        rows.forEach((row: any) => {
            const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
            const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
            mainTopicPoints += (tnkq * pointsTNKQ) + (tl * pointsTL);
            
            mainTopicSoTiet += parseFloat(String(row[4])||'0');
            mainTopicWeightedPercent += getRowTargetPercent(row);
        });

        // Display string for Main Topic Percent
        let mainTopicDisplay = `<b>${mainTopic}</b><br/>(${mainTopicSoTiet} tiết`;
        // Condition: Hide % if it's Final Exam
        if (!isFinalExam) {
            mainTopicDisplay += ` – ${mainTopicWeightedPercent.toFixed(1).replace('.', ',')}%`;
        }
        mainTopicDisplay += ')';
        
        // Use actual points for the Total column, but weighted % for the label column
        const mainTopicRealizedPercent = totalExamPoints > 0 ? (mainTopicPoints / totalExamPoints * 100) : 0;

        // Group by SubTopic
        const groupedBySubTopic = rows.reduce((acc: any, row: any) => {
             const sub = row[2]; if(!acc[sub]) acc[sub] = [];
             acc[sub].push(row);
             return acc;
        }, {});
        const subTopics = Object.keys(groupedBySubTopic);
        const mainRowspan = subTopics.length; 

        subTopics.forEach((subTopic, index) => {
            const subRows = groupedBySubTopic[subTopic];
            
            // SubTopic Stats
            const subCounts = Array(15).fill(0);
            let subSoTiet = 0;
            let subWeightedPercent = 0;
            
            const firstRow = subRows[0];
            const lessonName = firstRow[3]; // "Bài"

            const positionSummary: string[] = [];

            subRows.forEach((r: any) => {
                 subSoTiet += parseFloat(String(r[4]) || '0');
                 subWeightedPercent += getRowTargetPercent(r);

                 for (let k = 5; k <= 12; k++) { // NB, TH, VD, VDC
                     subCounts[k] += parseInt(String(r[k]) || '0');
                 }
                 
                 const originalIdx = data.matrix.rows.indexOf(r); 
                 
                 const posNB_TN = positionMap[`${originalIdx}-5`]; if(posNB_TN) positionSummary.push(`NB: ${posNB_TN}`);
                 const posNB_TL = positionMap[`${originalIdx}-6`]; if(posNB_TL) positionSummary.push(`NB: ${posNB_TL}`);
                 const posTH_TN = positionMap[`${originalIdx}-7`]; if(posTH_TN) positionSummary.push(`TH: ${posTH_TN}`);
                 const posTH_TL = positionMap[`${originalIdx}-8`]; if(posTH_TL) positionSummary.push(`TH: ${posTH_TL}`);
                 const posVD_TN = positionMap[`${originalIdx}-9`]; if(posVD_TN) positionSummary.push(`VD: ${posVD_TN}`);
                 const posVD_TL = positionMap[`${originalIdx}-10`]; if(posVD_TL) positionSummary.push(`VD: ${posVD_TL}`);
                 const posVDC_TN = positionMap[`${originalIdx}-11`]; if(posVDC_TN) positionSummary.push(`VDC: ${posVDC_TN}`);
                 const posVDC_TL = positionMap[`${originalIdx}-12`]; if(posVDC_TL) positionSummary.push(`VDC: ${posVDC_TL}`);
            });
            
            let contentDisplay = `${subTopic}<br/>(${subSoTiet} tiết`;
            // Condition: Hide % if it's Final Exam
            if (!isFinalExam) {
                contentDisplay += ` - ${subWeightedPercent.toFixed(1).replace('.', ',')}%`;
            }
            contentDisplay += ')';

            // --- MATRIX ROW ---
            matrixBodyHtml += '<tr>';
            matrixBodyHtml += `<td>${stt}</td>`;
            if (index === 0) {
                matrixBodyHtml += `<td class="text-left align-top" rowspan="${mainRowspan}">${mainTopicDisplay}</td>`;
            }
            matrixBodyHtml += `<td class="text-left">${contentDisplay}</td>`;
            
            // Counts & Points for 5-12
            for(let k=5; k<=12; k++){
                const val = subCounts[k];
                const isTNKQ = k % 2 !== 0;
                const pt = val * (isTNKQ ? pointsTNKQ : pointsTL);
                
                // Use Divs for Line Break
                let cellContent = '';
                if (val > 0) {
                    cellContent = `<div>${val} câu</div><div>${formatDiem(pt)}đ</div>`;
                }
                
                matrixBodyHtml += `<td>${cellContent}</td>`;
                
                matrixTotals.cau[k] += val;
                matrixTotals.diem[k] += pt;
            }
            
            // Merged Main Topic Score Column (Showing ACTUAL Score Percent)
            if (index === 0) {
                 matrixBodyHtml += `<td rowspan="${mainRowspan}"><b><div>${formatDiem(mainTopicPoints)}</div><div>${mainTopicRealizedPercent.toFixed(1).replace('.', ',')}%</div></b></td>`;
            }
            matrixBodyHtml += '</tr>';

            // --- SPEC ROW ---
            const reqHtml = getRequirementsHtml(gradeStr, mainTopic, subTopic);
            let formattedReq = reqHtml
                .replace(/<strong class="block font-semibold.*?"/g, '<p style="font-weight: bold; margin: 4px 0 2px 0;"')
                .replace(/<\/strong>/g, '</p>')
                .replace(/<div class="pl-2">/g, '<p style="margin: 0 0 0 10px;">')
                .replace(/<\/div>/g, '</p>');
            
            if (positionSummary.length > 0) {
                formattedReq += `<div style="margin-top:8px; border-top:1px dashed #ccc; padding-top:4px;"><i>Vị trí: </i><span style="color:#0056b3;">${positionSummary.join('; ')}</span></div>`;
            }

            specBodyHtml += '<tr>';
            specBodyHtml += `<td>${stt}</td>`;
            if (index === 0) {
                specBodyHtml += `<td class="text-left align-top" rowspan="${mainRowspan}"><b>${mainTopic}</b></td>`;
            }
            specBodyHtml += `<td class="text-left align-top"><b>${subTopic}</b></td>`;
            // REMOVED LESSON COLUMN FROM SPECIFICATION TABLE
            // specBodyHtml += `<td class="text-left align-top">${lessonName}</td>`;
            specBodyHtml += `<td class="text-left align-top">${formattedReq}</td>`;
            
            const renderCountPoints = (count: number, type: 'TN'|'TL') => {
                 const pt = count * (type === 'TN' ? pointsTNKQ : pointsTL);
                 return `<div>${count}</div><div>/ ${formatDiem(pt)}đ</div>`;
            };

            // NB(TN), TH(TN), VD(TL), VDC(TL)
            specBodyHtml += `<td>${renderCountPoints(subCounts[5], 'TN')}</td>`;
            specBodyHtml += `<td>${renderCountPoints(subCounts[7], 'TN')}</td>`;
            specBodyHtml += `<td>${renderCountPoints(subCounts[10], 'TL')}</td>`;
            specBodyHtml += `<td>${renderCountPoints(subCounts[12], 'TL')}</td>`;
            
            specBodyHtml += '</tr>';

            // Spec Totals (Matching the specific columns)
            specTotals.nb += subCounts[5];
            specTotals.th += subCounts[7];
            specTotals.vd += subCounts[10];
            specTotals.vdc += subCounts[12];
            
            stt++;
        });
    });

    // --- FOOTERS ---
    const nb_diem = matrixTotals.diem[5] + matrixTotals.diem[6];
    const th_diem = matrixTotals.diem[7] + matrixTotals.diem[8];
    const vd_diem = matrixTotals.diem[9] + matrixTotals.diem[10];
    const vdc_diem = matrixTotals.diem[11] + matrixTotals.diem[12];

    const nb_percent = totalExamPoints > 0 ? (nb_diem / totalExamPoints * 100) : 0;
    const th_percent = totalExamPoints > 0 ? (th_diem / totalExamPoints * 100) : 0;
    const vd_percent = totalExamPoints > 0 ? (vd_diem / totalExamPoints * 100) : 0;
    const vdc_percent = totalExamPoints > 0 ? (vdc_diem / totalExamPoints * 100) : 0;
    
    const nb_th_percent = nb_percent + th_percent;

    let matrixFooterHtml = `
        <tfoot>
            <tr>
                <td colspan="3"><b>Tổng</b></td>
                <td colspan="2"><b><div>${matrixTotals.cau[5] + matrixTotals.cau[6]} câu</div><div>${formatDiem(nb_diem)}đ</div></b></td>
                <td colspan="2"><b><div>${matrixTotals.cau[7] + matrixTotals.cau[8]} câu</div><div>${formatDiem(th_diem)}đ</div></b></td>
                <td colspan="2"><b><div>${matrixTotals.cau[9] + matrixTotals.cau[10]} câu</div><div>${formatDiem(vd_diem)}đ</div></b></td>
                <td colspan="2"><b><div>${matrixTotals.cau[11] + matrixTotals.cau[12]} câu</div><div>${formatDiem(vdc_diem)}đ</div></b></td>
                <td><b>${formatDiem(totalExamPoints)}</b></td>
            </tr>
            <tr>
                <td colspan="3"><b>Tỉ lệ điểm (%)</b></td>
                <td colspan="2"><b>${formatPercent(nb_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(th_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(vd_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(vdc_percent)}%</b></td>
                <td><b>100%</b></td>
            </tr>
            <tr>
                <td colspan="3"><b>Tỉ lệ chung (%)</b></td>
                <td colspan="4"><b>${formatPercent(nb_th_percent)}%</b></td>
                <td colspan="4"><b>${formatPercent(vd_percent + vdc_percent)}%</b></td>
                <td><b>100%</b></td>
            </tr>
        </tfoot>`;

    // Only counting the specific columns: NB_TN, TH_TN, VD_TL, VDC_TL
    let specFooterHtml = `
        <tfoot>
            <tr>
                <td colspan="4" class="text-left"><b>Tổng</b></td>
                <td><b>${specTotals.nb}</b></td><td><b>${specTotals.th}</b></td>
                <td><b>${specTotals.vd}</b></td><td><b>${specTotals.vdc}</b></td>
            </tr>
            <tr>
                <td colspan="4" class="text-left"><b>Tỉ lệ %</b></td>
                <td><b>${formatPercent(nb_percent)}%</b></td><td><b>${formatPercent(th_percent)}%</b></td>
                <td><b>${formatPercent(vd_percent)}%</b></td><td><b>${formatPercent(vdc_percent)}%</b></td>
            </tr>
        </tfoot>`;

    let matrixTableHtml = `
        <table>
            <caption>${matrixTitle}</caption>
            <colgroup>
                <col class="col-tt">
                <col class="col-chuong">
                <col class="col-noidung">
                <col class="col-level"> <col class="col-level">
                <col class="col-level"> <col class="col-level">
                <col class="col-level"> <col class="col-level">
                <col class="col-level"> <col class="col-level">
                <col class="col-total">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">TT</th>
                    <th rowspan="3">Chương/Chủ đề</th>
                    <th rowspan="3">Nội dung/Đơn vị kiến thức</th>
                    <th colspan="8">Mức độ nhận thức</th>
                    <th rowspan="3">Tổng % điểm</th>
                </tr>
                <tr>
                    <th colspan="2">Nhận biết</th>
                    <th colspan="2">Thông hiểu</th>
                    <th colspan="2">Vận dụng</th>
                    <th colspan="2">Vận dụng cao</th>
                </tr>
                <tr>
                    <th>TNKQ</th><th>TL</th>
                    <th>TNKQ</th><th>TL</th>
                    <th>TNKQ</th><th>TL</th>
                    <th>TNKQ</th><th>TL</th>
                </tr>
            </thead>
            <tbody>${matrixBodyHtml}</tbody>
            ${matrixFooterHtml}
        </table>`;
        
    // Add Note for Final Exam (UPDATED to use Realized Percentages)
    if (isFinalExam && sumSoTietChecked > 0) {
        matrixTableHtml += `
            <div style="margin-top: 15px; font-style: italic; font-size: 11pt;">
                <strong>* Ghi chú phân bổ tỷ lệ:</strong><br/>
                - Nội dung kiến thức đã thi giữa kì: Thực tế <b>${formatPercent(actualPercentChecked)}%</b> thời lượng &rarr; Giảm còn <b>${formatPercent(notePercentOld)}%</b> điểm số.<br/>
                - Nội dung kiến thức mới: Thực tế <b>${formatPercent(actualPercentUnchecked)}%</b> thời lượng &rarr; Chiếm <b>${formatPercent(notePercentNew)}%</b> điểm số.
            </div>
        `;
    }

    let specTableHtml = `
        <table>
            <colgroup>
                <col class="col-tt">
                <col class="col-chuong">
                <col class="col-noidung">
                <!-- Removed col-bai -->
                <col class="col-req">
                <col class="col-level"><col class="col-level"><col class="col-level"><col class="col-level">
            </colgroup>
            <caption>${specTitle}</caption>
            <thead>
                <tr>
                    <th rowspan="2">TT</th><th rowspan="2">Chương/Chủ đề</th>
                    <th rowspan="2">Nội dung/Đơn vị kiến thức</th>
                    <!-- Removed th Bai -->
                    <th rowspan="2">Mức độ đánh giá</th>
                    <th colspan="4">Số câu hỏi theo mức độ nhận thức</th>
                </tr>
                <tr>
                    <th>Nhận biết<br/>(TNKQ)</th><th>Thông hiểu<br/>(TNKQ)</th><th>Vận dụng<br/>(TL)</th><th>Vận dụng cao<br/>(TL)</th>
                </tr>
            </thead>
            <tbody>${specBodyHtml}</tbody>
            ${specFooterHtml}
        </table>`;

    return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>Ma Trận Đề Thi</title>
            ${css}
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                </w:WordDocument>
            </xml>
        </head>
        <body>
            <div class="Section1">
                ${matrixTableHtml}
                <br class="page-break"/>
                ${specTableHtml}
            </div>
        </body>
        </html>
    `;
};

export const generateAzotaKeyHtml = (questions: any[]) => {
    let html = `
    <html>
    <head><meta charset="utf-8"></head>
    <body>
    <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr><td>Cau</td><td>DapAn</td></tr>
    `;
    
    questions.forEach((q: any, idx: number) => {
        if (q.category !== 'essay') {
            const correctOpt = q.options?.find((o: any) => o.isCorrect);
            const ans = correctOpt ? String.fromCharCode(65 + q.options.indexOf(correctOpt)) : '';
            html += `<tr><td>${idx + 1}</td><td>${ans}</td></tr>`;
        }
    });
    
    html += `</table></body></html>`;
    return html;
};