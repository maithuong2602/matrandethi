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

// Helper to parse text into labelled parts (a, b, c, d...)
const parseParts = (text: string) => {
    const parts: { label: string, content: string }[] = [];
    const lines = text.split(/\n/);
    let currentLabel = '';
    let currentContent = '';
    
    // Regex to match start of lines like "a)", "a.", "1.", "Bước 1:", "-", "+", "a - 0.5đ:", "a -"
    const labelRegex = /^\s*([a-z]\s*[-–](?:\s*\d+(?:[\.,]\d+)?[đd]?:?)?|[a-z][\)\.]|[0-9][\)\.]|-|\+|Bước \d+:?)(.*)/i;
    
    lines.forEach(line => {
        const match = line.match(labelRegex);
        if (match) {
            if (currentLabel || currentContent) {
                parts.push({ label: currentLabel, content: currentContent.trim() });
            }
            currentLabel = match[1];
            currentContent = match[2];
        } else {
            currentContent += (currentContent ? '\n' : '') + line;
        }
    });
    // Push the last accumulated part
    if (currentLabel || currentContent) {
        parts.push({ label: currentLabel, content: currentContent.trim() });
    }
    
    // Fallback: If no labels found but text exists, treat as one block
    if (parts.length === 0 && text.trim()) {
        parts.push({ label: '', content: text.trim() });
    }
    
    return parts;
};

export const generateExamWordHtml = (questions: any[], headerInfo: any) => {
    const tracNghiemQuestions = questions.filter(q => q.category !== 'essay');
    const tuLuanQuestions = questions.filter(q => q.category === 'essay');

    const totalTracNghiemPoints = tracNghiemQuestions.reduce((sum, q) => sum + (q.points || 0.25), 0);
    const totalTuLuanPoints = tuLuanQuestions.reduce((sum, q) => sum + (q.points || 1.0), 0);
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Check if tenKyThi already has year info, if not append it
    let tenKyThiFull = headerInfo.tenKyThi.toUpperCase();
    if (!tenKyThiFull.includes("NĂM HỌC")) {
        // Typically append current school year if missing
    }

    // CSS Definitions
    const css = `
        <style>
            @page Section1 {
                size: 21cm 29.7cm;
                margin: 1.5cm 2cm 1.5cm 2cm;
                mso-page-orientation: portrait;
                mso-footer: f1;
            }
            @page Section2 {
                size: 21cm 29.7cm;
                margin: 1.5cm 2cm 1.5cm 2cm;
                mso-page-orientation: portrait;
                mso-footer: f2;
                mso-page-numbers-start: 1;
            }
            div.Section1 { page: Section1; }
            div.Section2 { page: Section2; }
            
            body { 
                font-family: 'Times New Roman', serif; 
                font-size: 13pt; 
                line-height: 1.3;
            }
            table { 
                border-collapse: collapse; 
                width: 100%;
            }
            th, td {
                word-wrap: break-word;
            }
            p { 
                margin: 3pt 0; 
                text-align: justify;
                word-wrap: break-word;
            }
            p.MsoFooter, li.MsoFooter, div.MsoFooter {
                margin: 0cm;
                margin-bottom: .0001pt;
                mso-pagination: widow-orphan;
                font-size: 11.0pt;
                text-align: right;
                font-style: italic;
            }
        </style>
    `;

    // ---------------- SECTION 1: EXAM HEADER & CONTENT ----------------
    // New Header Format: 1 Table, 2 Columns, No Border
    const examHeaderHtml = `
        <table style="width:100%; border: none; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 13pt; margin-bottom: 15pt;">
            <tr>
                <!-- Column 1: Left -->
                <td style="border: none; width: 40%; text-align: center; vertical-align: top; padding: 0;">
                    <p style="margin:0; text-transform: uppercase; font-size: 13pt;">${headerInfo.donVi}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; margin-bottom: 5pt;">TRƯỜNG ${headerInfo.tenTruong}</p>
                    <div style="margin-top: 5px;">
                        <span style="font-weight: bold; font-size: 13pt;">ĐỀ CHÍNH THỨC</span>
                    </div>
                </td>
                
                <!-- Column 2: Right -->
                <td style="border: none; width: 60%; text-align: center; vertical-align: top; padding: 0;">
                    <p style="margin:0; font-weight: bold; text-transform: uppercase;">${tenKyThiFull}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase;">MÔN: ${headerInfo.monHoc}</p>
                    <p style="margin:0; font-style: italic;">Thời gian: ${headerInfo.thoiGian} (không kể thời gian giao đề)</p>
                    <p style="margin:0; font-style: italic;">(Đề có <span style='mso-field-code:" SECTIONPAGES "'></span> trang)</p>
                    <p style="margin:0; text-align: right; font-weight: bold; margin-top: 5pt; padding-right: 15pt;">Mã đề: ${headerInfo.maDe || '...........'}</p>
                </td>
            </tr>
        </table>

        <div style="margin-bottom: 15pt;">
            <p style="margin: 0;">&nbsp;</p>
            <p style="margin: 0; font-weight: bold; font-size: 13pt;">Họ và tên: .................................................................................... Lớp: .............................</p>
        </div>
    `;

    // Exam Content (MC + Essay)
    let examBodyHtml = '';
    
    // Part 1: Trac Nghiem
    if (tracNghiemQuestions.length > 0) {
        // Answer Grid matching the image provided (14 columns)
        let answerGridHtml = `
            <div style="margin-top:12pt; margin-bottom:5pt;">
                <h3 style="font-size: 13pt; font-weight: bold; margin: 0;">Phần 1. Trắc nghiệm (${totalTracNghiemPoints.toFixed(1).replace('.',',')} điểm)</h3>
                <p style="font-size: 13pt; font-style: italic; margin: 3pt 0 5pt 0;">- Em hãy điền đáp án vào khung bên dưới cho câu trả lời đúng: (mỗi câu đúng 0,25 điểm)</p>
            </div>
            <table style="border-collapse: collapse; margin: 0 auto; width: 100%; table-layout: fixed;">`;
        const cols = 14; 
        const numTotalRows = Math.ceil(tracNghiemQuestions.length / cols);

        for (let i = 0; i < numTotalRows; i++) {
            // Row for Question Numbers
            answerGridHtml += '<tr>'; 
            for (let j = 0; j < cols; j++) {
                const num = i * cols + j + 1;
                if (num <= tracNghiemQuestions.length) {
                    answerGridHtml += `<td style="border: 1px solid black; text-align: center; font-weight: bold; padding: 5px 2px; font-size: 12pt;">Câu<br/>${num}</td>`;
                } else {
                    answerGridHtml += `<td style="border: 1px solid black; padding: 5px 2px;"></td>`; // Fill empty cells to keep grid structure
                }
            }
            answerGridHtml += '</tr>';
            
            // Row for Answers (Empty boxes)
            answerGridHtml += '<tr>';
            for (let j = 0; j < cols; j++) {
                answerGridHtml += `<td style="border: 1px solid black; height: 35px;"></td>`;
            }
            answerGridHtml += '</tr>';
        }
        answerGridHtml += '</table>';

        const questionContent = tracNghiemQuestions.map((q, index) => {
            const displayContent = (q.content || '').replace(/\n/g, '<br/>');
            let questionHtml = `<p style="margin-top: 6pt; margin-bottom: 0; font-size: 13pt; text-align: justify;"><strong>Câu ${index + 1}.</strong> ${displayContent}</p>`;
            if (q.options && q.options.length > 0) {
                // Modified heuristic: If any option is > 25 chars, assume it might wrap in a 2-col table, so switch to vertical.
                // This prevents the "rớt dòng" (orphan word) issue in table cells.
                const allShort = q.options.every((opt: any) => (opt.text || '').trim().length < 25);
                let optionsHtml = '';
                
                if (allShort) {
                    // Two Columns (Table)
                    optionsHtml = '<table style="width: 100%; border: none; border-collapse: collapse; table-layout: fixed; margin-left: 0.5cm;">';
                    for (let i = 0; i < q.options.length; i += 2) {
                        const opt1 = q.options[i];
                        const opt2 = q.options[i + 1];
                        optionsHtml += `<tr>
                            <td style="width: 50%; vertical-align: top; padding: 2pt 5pt 2pt 0; font-size: 13pt;"><strong>${opt1.id}.</strong> ${opt1.text}</td>
                            <td style="width: 50%; vertical-align: top; padding: 2pt 0 2pt 5pt; font-size: 13pt;">${opt2 ? `<strong>${opt2.id}.</strong> ${opt2.text}` : ''}</td>
                        </tr>`;
                    }
                    optionsHtml += '</table>';
                } else {
                    // Vertical List (No Table - prevents cell wrapping issues)
                    optionsHtml = '<div style="margin-left: 0.5cm;">' + q.options.map((opt: any) => {
                        return `<p style="padding: 2px 0; font-size: 13pt; margin:0; text-align: justify;"><strong>${opt.id}.</strong> ${opt.text}</p>`;
                    }).join('') + '</div>';
                }
                questionHtml += optionsHtml;
            }
            return questionHtml;
        }).join('');
        
        examBodyHtml += answerGridHtml + questionContent;
    }

    // Part 2: Tu Luan
    if (tuLuanQuestions.length > 0) {
        const questionContent = tuLuanQuestions.map((q, index) => {
            const pointsStr = (q.points || 1.0).toFixed(1).replace('.', ',');
            const lines = (q.content || '').split('\n');
            const firstLine = lines[0] || '';
            const remainingLines = lines.slice(1);

            let questionTextHtml = `<p style="margin-bottom: 3pt; font-size: 13pt; text-align: justify;">
                <strong>Câu ${index + tracNghiemQuestions.length + 1} (${pointsStr} điểm):</strong> ${firstLine}
            </p>`;
            
            if (remainingLines.length > 0) {
                // Explicit new lines for multi-part questions to ensure "xuống hàng"
                questionTextHtml += remainingLines.map(line => 
                    `<p style="margin: 3pt 0 3pt 15pt; font-size: 13pt; text-align: justify;">${line}</p>`
                ).join('');
            }
            
            let dotLines = '';
            for(let i=0; i<6; i++) {
                dotLines += `<div style="border-bottom: 1px dotted black; height: 24px; width: 100%; margin-bottom: 4px;">&nbsp;</div>`;
            }

            return `<div style="margin-top: 10pt;">
                        ${questionTextHtml}
                        ${dotLines}
                    </div>`;
        }).join('');

        examBodyHtml += `
            <h3 style="font-size: 13.5pt; text-align:left; font-weight:bold; margin-top: 15pt;">Phần 2. Tự luận (${totalTuLuanPoints.toFixed(1).replace('.',',')} điểm)</h3>
            ${questionContent}
        `;
    }

    // ---------------- SECTION 2: GRADING GUIDE ----------------
    const totalQuestions = tracNghiemQuestions.length + tuLuanQuestions.length;
    const totalPoints = totalTracNghiemPoints + totalTuLuanPoints;
    const currentYearVal = new Date().getFullYear();
    const nextYearVal = currentYearVal + 1;

    let gradingGuideHeader = `
        <table style="width:100%; border: none; font-family: 'Times New Roman', serif; font-size: 13pt; margin-bottom: 15pt;">
            <tr>
                <td style="text-align: center; width: 45%; vertical-align: top;">
                    <p style="margin:0; text-transform: uppercase; font-size: 13pt;">${headerInfo.donVi}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt;">TRƯỜNG ${headerInfo.tenTruong}</p>
                </td>
                <td style="text-align: center; width: 55%; vertical-align: top;">
                    <p style="margin:0; font-weight: bold; text-transform: uppercase;">HƯỚNG DẪN CHẤM ${headerInfo.tenKyThi}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase;">MÔN: ${headerInfo.monHoc}</p>
                    <p style="margin:0; font-style: italic;">(Hướng dẫn chấm gồm có <span style='mso-field-code:" SECTIONPAGES "'></span> trang)</p>
                </td>
            </tr>
        </table>
    `;

    // Grading Table Header
    let gradingTableStart = `
        <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 13pt;">
            <thead>
                <tr style="font-weight: bold; text-align: center;">
                    <td style="border: 1px solid black; padding: 5px; width: 15%;">Phần</td>
                    <td style="border: 1px solid black; padding: 5px; width: 70%;">Đáp án</td>
                    <td style="border: 1px solid black; padding: 5px; width: 15%;">Điểm</td>
                </tr>
            </thead>
            <tbody>
    `;

    // MC Section (Grading Guide)
    let mcSectionHtml = '';
    if (tracNghiemQuestions.length > 0) {
        // Generate nested grid for MC answers - 14 columns to match Question Paper
        const mcCols = 14; 
        const mcRows = Math.ceil(tracNghiemQuestions.length / mcCols);
        
        let mcGrid = `<table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; margin: 0 auto;">`;
        for (let r = 0; r < mcRows; r++) {
            // Row: Numbers
            mcGrid += `<tr>`;
            for (let c = 0; c < mcCols; c++) {
                const idx = r * mcCols + c;
                if (idx < tracNghiemQuestions.length) {
                    mcGrid += `<td style="border: 1px solid black; font-weight: bold; padding: 2px; background-color: #f0f0f0;">${idx + 1}</td>`;
                } else {
                    mcGrid += `<td style="border: 1px solid black; padding: 2px;"></td>`;
                }
            }
            mcGrid += `</tr>`;
            // Row: Answers
            mcGrid += `<tr>`;
            for (let c = 0; c < mcCols; c++) {
                const idx = r * mcCols + c;
                if (idx < tracNghiemQuestions.length) {
                    const q = tracNghiemQuestions[idx];
                    const correctOpt = q.options?.find((o: any) => o.isCorrect);
                    mcGrid += `<td style="border: 1px solid black; padding: 2px;">${correctOpt ? correctOpt.id : ''}</td>`;
                } else {
                    mcGrid += `<td style="border: 1px solid black; padding: 2px;"></td>`;
                }
            }
            mcGrid += `</tr>`;
        }
        mcGrid += `</table>`;

        mcSectionHtml = `
            <tr>
                <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; vertical-align: middle;">
                    Trắc nghiệm: ${totalTracNghiemPoints.toFixed(1).replace('.',',')} điểm
                    <br/><span style="font-weight: normal; font-style: italic; font-size: 11pt;">(mỗi câu trả lời đúng được 0.25 đ)</span>
                </td>
                <td style="border: 1px solid black; padding: 10px; vertical-align: middle;">
                    ${mcGrid}
                </td>
                <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; vertical-align: middle;">
                    ${totalTracNghiemPoints.toFixed(1).replace('.',',')}đ
                </td>
            </tr>
        `;
    }

    // Essay Section (Grading Guide)
    let essaySectionHtml = '';
    if (tuLuanQuestions.length > 0) {
        const rowspan = tuLuanQuestions.length; 
        
        tuLuanQuestions.forEach((q, index) => {
            const isFirst = index === 0;
            const qLabel = `Câu ${index + tracNghiemQuestions.length + 1}`;
            
            // Parsing Logic: Split by a), b), c) or -, +
            let rawAnswer = q.answer || '';
            
            // PRE-PROCESSING to handle single-line answers
            // Remove header if present
            rawAnswer = rawAnswer.replace(/^HƯỚNG DẪN CHẤM:?\s*/i, '');
            
            // 1. Handle semicolon-separated lists: "; b..." -> "\nb..."
            // Pattern: semicolon + whitespace + (letter/digit + separator)
            // Separator can be ) . - – :
            rawAnswer = rawAnswer.replace(/;\s*(?=(?:[a-z]|[0-9]{1,2})\s*[\)\.\-–:])/gi, '\n');
            
            // 2. Handle specific format "x - 0.xd" which might lack semicolons sometimes or relying on space
            // E.g. "content a - 0.5d: ..."
            // Look for space followed by letter + hyphen + digit + d
            rawAnswer = rawAnswer.replace(/(\s+)(?=[a-z]\s*[-–]\s*\d+(?:[\.,]\d+)?[đd])/gi, '\n');

            const questionParts = parseParts(q.content);
            const answerParts = parseParts(rawAnswer);
            
            // Build the Nested Table for content (2 Cols: Request | Guide)
            let nestedTableRows = '';
            
            // Case 1: Detailed parts found in Answer (e.g. a)... b)...)
            if (answerParts.length > 1) {
                answerParts.forEach((ansPart, idx) => {
                    // Try to find matching question part label (e.g. "a)") to display in Col 1
                    // If not found, just use the Answer label as the requirement key.
                    // Normalize labels for matching (remove special chars)
                    const normAnsLabel = ansPart.label.replace(/[^a-z0-9]/gi, '');
                    const qPart = questionParts.find(qp => qp.label.replace(/[^a-z0-9]/gi, '') === normAnsLabel) || { content: '' };
                    
                    // Col 1 Content
                    let col1Text = `<b>${ansPart.label}</b>`;
                    if (qPart.content) {
                        col1Text += ` ${qPart.content}`; 
                    }
                    
                    // Col 2 Content: Replace newlines with <br/> for correct display
                    const ansContent = ansPart.content.replace(/\n/g, '<br/>');

                    nestedTableRows += `
                        <tr>
                            <td style="border: 1px dotted #ccc; padding: 4px; width: 35%; vertical-align: top; text-align: justify;">${col1Text}</td>
                            <td style="border: 1px dotted #ccc; padding: 4px; width: 65%; vertical-align: top; text-align: justify;">
                                <div>${ansContent}</div>
                            </td>
                        </tr>
                    `;
                });
            } else {
                // Case 2: Single block answer (No a, b, c detected)
                const ansContent = rawAnswer.replace(/\n/g, '<br/>');
                nestedTableRows = `
                    <tr>
                        <td style="border: none; padding: 4px; vertical-align: top; text-align: justify;" colspan="2">
                            <div>${ansContent}</div>
                        </td>
                    </tr>
                `;
            }

            essaySectionHtml += `<tr>`;
            if (isFirst) {
                essaySectionHtml += `
                    <td rowspan="${rowspan}" style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; vertical-align: top;">
                        Tự luận: ${totalTuLuanPoints.toFixed(1).replace('.',',')} điểm
                    </td>
                `;
            }
            essaySectionHtml += `
                <td style="border: 1px solid black; padding: 5px; vertical-align: top;">
                    <div style="border-bottom: 1px solid #000; margin-bottom: 5px; padding-bottom: 2px;">
                        <span style="font-weight: bold; text-decoration: underline;">${qLabel}:</span> ${q.content.split('\n')[0].substring(0, 100)}...
                    </div>
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                        ${nestedTableRows}
                    </table>
                </td>
                <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle;">
                    ${(q.points || 1.0).toFixed(1).replace('.',',')}đ
                </td>
            `;
            essaySectionHtml += `</tr>`;
        });
    }

    // Footer Row
    let gradingFooterRow = `
        <tr>
            <td colspan="2" style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold;">
                Tổng số câu: ${totalQuestions} câu (TN + TL)
            </td>
            <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold;">
                ${totalPoints.toFixed(1).replace('.',',')}đ
            </td>
        </tr>
    `;

    let gradingTableEnd = `</tbody></table>`;
    
    let gradingFooterText = `
        <div style="text-align: center; margin-top: 15px; font-weight: bold;">---Hết---</div>
        <div style="margin-top: 10px; font-style: italic; font-size: 11pt;">
            | Học sinh có thể trình bày theo cách khác, hợp lí, chính xác thì cho điểm tối đa.
        </div>
    `;

    // 3. Document Structure
    return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>De Thi</title>
            ${css}
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
        </head>
        <body>
            <div class="Section1">
                ${examHeaderHtml}
                ${examBodyHtml}
                <br/><p style="text-align: center; font-weight: bold; margin-top: 20px;">---HẾT---</p>
                <br clear=all style='mso-special-character:line-break;page-break-before:always;mso-break-type:section-break'>
            </div>
            
            <div class="Section2">
                ${gradingGuideHeader}
                ${gradingTableStart}
                ${mcSectionHtml}
                ${essaySectionHtml}
                ${gradingFooterRow}
                ${gradingTableEnd}
                ${gradingFooterText}
            </div>
            
            <!-- Footer Definitions -->
            <div style='mso-element:footer' id='f1'>
                <p class=MsoFooter>
                    Trang <span style='mso-field-code:" PAGE "'></span>/<span style='mso-field-code:" SECTIONPAGES "'></span>
                </p>
            </div>
            <div style='mso-element:footer' id='f2'>
                <p class=MsoFooter>
                    Trang <span style='mso-field-code:" PAGE "'></span>/<span style='mso-field-code:" SECTIONPAGES "'></span>
                </p>
            </div>
        </body>
    </html>`;
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
    let keyHtml = `<div style="font-family: 'Times New Roman', serif; font-size: 14pt; margin: 0 auto; max-width: 800px; page-break-before: always;"><h1 style="text-align: center;">ANSWER KEYS</h1></div>
                <div style="font-family: 'Times New Roman', serif; font-size: 13pt; margin: 0 auto; max-width: 800px;">`;
    let answers = ``;
    questions.forEach((q, index) => {
        const num = index + 1;
        // Check for MC questions (excluding essay type if mixed)
        if (q.category !== 'essay' && q.options && q.options.length > 0) {
            // Only for single choice usually, but Azota supports basic key list
            const correctOpt = q.options.find((opt: any) => opt.isCorrect);
            if (correctOpt) {
                // Assuming options have ID 'A', 'B', 'C', 'D' or similar
                answers += `<p style="font-size: 13pt;">${num}. ${correctOpt.id}</p>`;
            }
        }
    });
    return keyHtml + answers + '</div>';
};
