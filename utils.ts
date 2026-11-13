import { REQUIREMENTS_DATA, getDefaultCompetencyForTopic, createEmptyNewFormatRow } from './data/matrixConstants';
import { MatrixData, ExerciseQuestion, NewMatrixFormatRowConfig } from './types';
import { CURRICULUM } from './data/curriculum';
import { syncSpecHtmlWithCustomStore, buildSpecHtmlFromMergedCriteria } from './services/criteriaService';

export const getRequirementsHtml = (grade: string, mainTopic: string, subTopic: string, lessonName?: string): string => {
    const gradeNumberMatch = grade.match(/\d+/);
    if (!gradeNumberMatch) return '';
    const gradeNum = gradeNumberMatch[0];

    // Nếu xác định được Bài học cụ thể, xây dựng YCCĐ trực tiếp từ getMergedCriteria(gradeNum, lessonName)
    // để đồng bộ tuyệt đối 100% với "Tạo bài tập / Quản lý câu hỏi" (bao gồm cả khi xóa YCCĐ).
    if (lessonName) {
        const lessonSpecHtml = buildSpecHtmlFromMergedCriteria(gradeNum, lessonName);
        if (lessonSpecHtml !== null) {
            return lessonSpecHtml;
        }
    }

    const gradeKey = `Lớp ${gradeNum}`;
    const gradeData = REQUIREMENTS_DATA[gradeKey];

    if (!gradeData || !gradeData[mainTopic] || !gradeData[mainTopic][subTopic]) {
        return syncSpecHtmlWithCustomStore('', gradeNum, subTopic, lessonName);
    }
    const requirementsText: string = gradeData[mainTopic][subTopic];
    
    const levelKeywords = ["nhận biết", "thông hiểu", "vận dụng", "vận dụng cao"];
    let isFirstLevel = true;
    
    const baseHtml = requirementsText.split('\n').map(line => {
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

    return syncSpecHtmlWithCustomStore(baseHtml, gradeNum, subTopic, lessonName);
};

export const formatDiem = (diem: number): string => {
    const scaled = Math.round(diem * 100);
    if (scaled % 100 === 0) {
        return (scaled / 100).toFixed(1).replace('.', ',');
    }
    return (scaled / 100).toString().replace('.', ',');
};

// Helper to parse text into labelled parts (a, b, c, d...)
export const parseParts = (text: string) => {
    const parts: { label: string, content: string }[] = [];
    const lines = (text || '').split(/\n/);
    let currentLabel = '';
    let currentContent = '';
    
    // Regex to match start of lines like "a)", "a.", "1.", "1)", "Bước 1:", "-", "+", "*", "a - 0.5đ:", "a -"
    const labelRegex = /^\s*([a-z]\s*[-–](?:\s*\d+(?:[\.,]\d+)?[đd]?:?)?|[a-z][\)\.]|[0-9]{1,2}[\)\.]|-|\+|\*|Bước \d+:?)(.*)/i;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const match = trimmed.match(labelRegex);
        if (match) {
            if (currentLabel || currentContent) {
                parts.push({ label: currentLabel, content: currentContent.trim() });
            }
            currentLabel = match[1].trim();
            currentContent = match[2].trim();
        } else {
            currentContent += (currentContent ? '\n' : '') + trimmed;
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

export const isQuestionForHskt = (
    q: any,
    hsktChecked: Record<string, boolean>,
    defaultGrade?: string
): boolean => {
    if (!hsktChecked || typeof hsktChecked !== 'object') return false;
    const hasAnyChecked = Object.values(hsktChecked).some(v => !!v);
    if (!hasAnyChecked) return false;
    if (!q) return false;

    const qCriteria = (q.criteria || '').trim();
    const qCode = qCriteria.split(' ')[0].replace(/[\.:]$/, '').trim();
    const qLesson = (q.lesson || '').trim();
    const qGrade = q.grade || defaultGrade || '6';
    const qLevel = q.level;

    // 1. Direct match if q.criteria itself was ticked (e.g. full text)
    if (qCriteria && hsktChecked[qCriteria]) return true;

    // 2. Composite key matches: `${lesson}:::${criteria}` or `${lesson}:::${code}`
    if (qLesson) {
        if (qCriteria && hsktChecked[`${qLesson}:::${qCriteria}`]) return true;
        if (qCode && hsktChecked[`${qLesson}:::${qCode}`]) return true;

        const normQLesson = qLesson.toLowerCase().replace(/[:.]/g, ' ').replace(/\s+/g, ' ').trim();
        for (const [k, v] of Object.entries(hsktChecked)) {
            if (!v) continue;
            if (k.includes(':::')) {
                const [kLesson, kCrit] = k.split(':::');
                const normKLesson = kLesson.toLowerCase().replace(/[:.]/g, ' ').replace(/\s+/g, ' ').trim();
                if (normKLesson === normQLesson || normKLesson.includes(normQLesson) || normQLesson.includes(normKLesson)) {
                    const kCode = kCrit.split(' ')[0].replace(/[\.:]$/, '').trim();
                    if (kCode === qCode || kCrit === qCriteria) return true;
                }
            }
        }
    }

    // 3. Curriculum Criteria Lookup: match against lesson's specific YCCĐ in CURRICULUM.criteriaData
    if (qCode && qLesson) {
        const findCriteriaList = (g: string): string[] | null => {
            const gData = CURRICULUM.criteriaData?.[g];
            if (!gData) return null;
            const normQLesson = qLesson.toLowerCase().replace(/[:.]/g, ' ').replace(/\s+/g, ' ').trim();
            const lessonKey = Object.keys(gData).find(k => {
                const normK = k.toLowerCase().replace(/[:.]/g, ' ').replace(/\s+/g, ' ').trim();
                return normK === normQLesson || normK.includes(normQLesson) || normQLesson.includes(normK);
            });
            if (!lessonKey) return null;
            const lessonObj = gData[lessonKey];
            if (qLevel && lessonObj[qLevel]) return lessonObj[qLevel];
            return Object.values(lessonObj).flat();
        };

        let criteriaList = findCriteriaList(qGrade);
        if (!criteriaList) {
            for (const g of ['6', '7', '8', '9']) {
                if (g !== qGrade) {
                    criteriaList = findCriteriaList(g);
                    if (criteriaList) break;
                }
            }
        }

        if (criteriaList && criteriaList.length > 0) {
            const matchedC = criteriaList.find((c: string) => {
                const cCode = c.split(' ')[0].replace(/[\.:]$/, '').trim();
                return cCode === qCode || c.startsWith(qCode);
            });
            if (matchedC) {
                if (hsktChecked[matchedC]) return true;
                if (qLesson && hsktChecked[`${qLesson}:::${matchedC}`]) return true;
            }
        }
    }

    return false;
};

export const getDefaultHsktQuestionIds = (questions: any[], headerInfo?: any): string[] => {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    let hsktChecked: Record<string, boolean> = {};
    let hasAnyHsktConfigured = false;
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem('hsktChecked');
            if (saved) {
                hsktChecked = JSON.parse(saved);
                hasAnyHsktConfigured = Object.values(hsktChecked).some(v => !!v);
            }
        }
    } catch { }

    const gradeFromHeader = headerInfo?.monHoc?.match(/\d+/)?.[0] || '6';
    if (hasAnyHsktConfigured) {
        const matched = questions.filter(q => isQuestionForHskt(q, hsktChecked, gradeFromHeader));
        if (matched.length > 0) {
            return matched.map(q => String(q.id));
        }
    }

    // Mặc định nếu chưa tích YCCĐ HSKT riêng: Tự động lấy các câu mức Nhận biết (NB) phù hợp với HSKT
    const nbQuestions = questions.filter(q => (q.level || 'NB').toUpperCase() === 'NB');
    if (nbQuestions.length >= 4) {
        return nbQuestions.map(q => String(q.id));
    }

    // Dự phòng nếu đề có ít hơn 4 câu NB: lấy thêm câu Thông hiểu (TH) cho đủ tối thiểu 50% số câu
    const thQuestions = questions.filter(q => (q.level || '').toUpperCase() === 'TH');
    const fallback = [...nbQuestions, ...thQuestions].slice(0, Math.max(4, Math.ceil(questions.length * 0.5)));
    return fallback.map(q => String(q.id));
};

export const generateHsktExamWordHtml = (
    hsktQuestions: any[],
    headerInfo: any,
    exportSection: 'both' | 'exam_only' | 'grading_only' = 'both'
) => {
    const headerWithHskt = {
        ...headerInfo,
        isHsktExam: true,
        exportSection
    };
    return generateExamWordHtml(hsktQuestions, headerWithHskt);
};

export const generateExamWordHtml = (questions: any[], headerInfo: any) => {
    const isHsktExam = Boolean(headerInfo?.isHsktExam);
    const exportSection: 'both' | 'exam_only' | 'grading_only' = headerInfo?.exportSection || 'both';

    const tracNghiemQuestions = questions.filter(q => q.category !== 'essay');
    const tuLuanQuestions = questions.filter(q => q.category === 'essay');

    const getMcQuestionPoint = (q: any) => {
        if (!isHsktExam && tracNghiemQuestions.length === 28 && (q.points === 1.0 || q.points === 0.5)) {
            return 0.25;
        }
        return q.points || 0.25;
    };

    const totalTracNghiemPoints = tracNghiemQuestions.reduce((sum, q) => sum + getMcQuestionPoint(q), 0);
    const totalTuLuanPoints = tuLuanQuestions.reduce((sum, q) => sum + (q.points || 1.0), 0);
    const unitMcPoint = tracNghiemQuestions.length > 0 ? getMcQuestionPoint(tracNghiemQuestions[0]) : 0.25;
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Format tenKyThi
    let tenKyThiFull = (headerInfo.tenKyThi || '').toUpperCase().trim();
    if (tenKyThiFull.startsWith("LỚP")) {
        tenKyThiFull = tenKyThiFull.replace(/LỚP\s*\d+\s*-\s*/, "KIỂM TRA ");
    }
    // Replace "NĂM HỌC 2026 2027" or "NĂM HỌC 2026 - 2027" with standard dash " - " or append if missing
    if (!tenKyThiFull.includes("NĂM HỌC")) {
        tenKyThiFull += ` - NĂM HỌC ${currentYear}–${nextYear}`;
    } else {
        // Ensure " - NĂM HỌC" if it just had space
        tenKyThiFull = tenKyThiFull.replace(/\s+NĂM HỌC/, ' - NĂM HỌC').replace(/(\d{4})\s*-\s*(\d{4})/, '$1–$2');
    }

    // Format school name for left header
    // In Vietnam official header: Line 1: TRƯỜNG TRUNG HỌC CƠ SỞ (hoặc cấp học), Line 2 (Underlined): TÊN TRƯỜNG (e.g. LÊ HỒNG PHONG)
    let schoolRaw = (headerInfo.tenTruong || '').trim();
    let schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
    let schoolNameUnderlined = schoolRaw;

    const schoolUpper = schoolRaw.toUpperCase();
    if (schoolUpper.includes('LÊ HỒNG PHONG')) {
        schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
        schoolNameUnderlined = 'LÊ HỒNG PHONG';
    } else if (schoolUpper.startsWith('TRƯỜNG TRUNG HỌC CƠ SỞ ')) {
        schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
        schoolNameUnderlined = schoolRaw.substring('TRƯỜNG TRUNG HỌC CƠ SỞ '.length).trim();
    } else if (schoolUpper.startsWith('TRƯỜNG THCS ')) {
        schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
        schoolNameUnderlined = schoolRaw.substring('TRƯỜNG THCS '.length).trim();
    } else if (schoolUpper.startsWith('TRUNG HỌC CƠ SỞ ')) {
        schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
        schoolNameUnderlined = schoolRaw.substring('TRUNG HỌC CƠ SỞ '.length).trim();
    } else if (schoolUpper.startsWith('THCS ')) {
        schoolTop = 'TRƯỜNG TRUNG HỌC CƠ SỞ';
        schoolNameUnderlined = schoolRaw.substring('THCS '.length).trim();
    } else if (schoolUpper.startsWith('TRƯỜNG ')) {
        schoolTop = 'TRƯỜNG';
        schoolNameUnderlined = schoolRaw.substring('TRƯỜNG '.length).trim();
    }

    // Format môn học: "MÔN: TIN HỌC – LỚP 7" hoặc "MON: TIN HỌC – LỚP 7"
    let monHocRaw = (headerInfo.monHoc || '').trim();
    let monHocFormatted = monHocRaw.toUpperCase();
    // Normalize "MÔN :" or "MON :" to "MÔN:"
    monHocFormatted = monHocFormatted.replace(/^MON\s*:\s*/i, 'MÔN: ').replace(/^MÔN\s*:\s*/i, 'MÔN: ');
    if (!monHocFormatted.startsWith('MÔN:')) {
        const matchGrade = monHocFormatted.match(/^(.*?)\s*(\d+)$/);
        if (matchGrade) {
            monHocFormatted = `MÔN: ${matchGrade[1].trim()} – LỚP ${matchGrade[2].trim()}`;
        } else {
            monHocFormatted = `MÔN: ${monHocFormatted}`;
        }
    } else {
        const pureName = monHocFormatted.replace(/^MÔN:\s*/i, '').trim();
        const matchGrade = pureName.match(/^(.*?)\s*(\d+)$/);
        if (matchGrade && !pureName.includes('LỚP')) {
            monHocFormatted = `MÔN: ${matchGrade[1].trim()} – LỚP ${matchGrade[2].trim()}`;
        }
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
            v\\:* { behavior: url(#default#VML); display: inline-block; }
        </style>
    `;

    const PAGE_NUM = `<!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>PAGE <span style='mso-element:field-separator'></span><![endif]--><span style='mso-no-proof:yes'></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->`;
    const TOTAL_PAGES = `<!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]--><span style='mso-no-proof:yes'></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->`;
    const SECTION_PAGES = `<!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>SECTIONPAGES <span style='mso-element:field-separator'></span><![endif]--><span style='mso-no-proof:yes'></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->`;

    // New Header Format: 1 Table, 2 Columns, Dotted Border
    const examHeaderHtml = `
        <table border="0" cellpadding="0" cellspacing="0" style="width:100%; border: 1px dotted black; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 13pt; margin-bottom: 15pt;">
            <tr>
                <!-- Column 1: Left -->
                <td style="border: 1px dotted black; width: 45%; text-align: center; vertical-align: top; padding: 6px;">
                    <p style="margin:0; text-transform: uppercase; font-size: 13pt; text-align: center;">${headerInfo.donVi || 'UBND PHƯỜNG HẢI CHÂU'}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; text-align: center; white-space: nowrap;">${schoolTop}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; text-align: center;">${schoolNameUnderlined}</p>
                    <div style="text-align: center; margin: 2pt 0 4pt 0; line-height: 1pt;">
                        <!--[if vml]>
                        <v:line from="0,0" to="70pt,0" strokeweight="0.67pt" strokecolor="black" style="position:relative;display:inline-block;"></v:line>
                        <![endif]-->
                        <!--[if !vml]-->
                        <span style="display: inline-block; width: 70pt; border-bottom: 0.67pt solid black; height: 1pt; vertical-align: middle;"></span>
                        <!--<![endif]-->
                    </div>
                    <div style="margin-top: 4px; text-align: center;">
                        <b style="font-weight: bold; font-size: 13pt;">${isHsktExam ? 'ĐỀ DÀNH CHO HSKT' : 'ĐỀ CHÍNH THỨC'}</b>
                    </div>
                </td>
                
                <!-- Column 2: Right -->
                <td style="border: 1px dotted black; width: 55%; text-align: center; vertical-align: top; padding: 6px;">
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; text-align: center;">${tenKyThiFull}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; text-align: center;">${monHocFormatted}</p>
                    <p style="margin:0; font-style: italic; font-size: 13pt; text-align: center;">Thời gian: ${headerInfo.thoiGian ? (headerInfo.thoiGian.includes('không kể') ? headerInfo.thoiGian : headerInfo.thoiGian + ' (không kể thời gian giao đề)') : '45 phút (không kể thời gian giao đề)'}</p>
                    <p style="margin:0; font-style: italic; font-size: 13pt; text-align: center;">(Đề có <!--[if supportFields]><span style='mso-element:field-begin'></span>SECTIONPAGES<span style='mso-element:field-separator'></span><![endif]-->02<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> trang)</p>
                    <p style="margin:0; text-align: center; font-weight: bold; font-size: 13pt; margin-top: 4pt;">Mã đề: ${headerInfo.maDe || '101'}${isHsktExam ? ' (HSKT)' : ''}</p>
                </td>
            </tr>
        </table>
    `;

    // Exam Content (MC + Essay)
    let examBodyHtml = '';

    // Student info line - exactly 1 balanced line with dots
    examBodyHtml += `
        <p style="margin-top: 12pt; margin-bottom: 10pt; font-family: 'Times New Roman', serif; font-size: 13pt; font-weight: bold;">
            Họ và tên học sinh: ............................................................................ Lớp: .........................
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15pt; font-family: 'Times New Roman', serif; font-size: 13pt;">
            <tr>
                <td style="border: 1px solid black; width: 30%; height: 2.5cm; vertical-align: top; padding: 5px; font-weight: bold;">
                    Điểm
                </td>
                <td style="border: 1px solid black; width: 70%; height: 2.5cm; vertical-align: top; padding: 5px; font-weight: bold;">
                    Nhận xét của giáo viên
                </td>
            </tr>
        </table>
    `;

    // Part 1: Trac Nghiem
    if (tracNghiemQuestions.length > 0) {
        // Answer Grid
        let answerGridHtml = `
            <div style="margin-top:5pt; margin-bottom:5pt;">
                <h3 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase;">PHẦN 1. TRẮC NGHIỆM (${formatDiem(totalTracNghiemPoints)} điểm)</h3>
                <p style="font-size: 13pt; font-style: italic; margin: 3pt 0 5pt 0;">- Em hãy điền đáp án vào khung bên dưới cho câu trả lời đúng: (mỗi câu đúng ${formatDiem(unitMcPoint)} điểm)</p>
            </div>
            <table style="border-collapse: collapse; margin: 0 auto; width: 100%; table-layout: fixed;">`;
        
        // Dynamically calculate columns (max 15 per row)
        let cols = 15;
        if (tracNghiemQuestions.length > 15) {
            let minEmpty = 15;
            let bestCols = 15;
            for (let c = 15; c >= 10; c--) {
                const rows = Math.ceil(tracNghiemQuestions.length / c);
                const empty = (rows * c) - tracNghiemQuestions.length;
                if (empty < minEmpty) {
                    minEmpty = empty;
                    bestCols = c;
                }
            }
            cols = bestCols;
        } else {
            cols = tracNghiemQuestions.length;
        }
        const numTotalRows = Math.ceil(tracNghiemQuestions.length / cols);

        for (let i = 0; i < numTotalRows; i++) {
            // Row for Question Numbers
            answerGridHtml += '<tr>'; 
            for (let j = 0; j < cols; j++) {
                const num = i * cols + j + 1;
                if (num <= tracNghiemQuestions.length) {
                    answerGridHtml += `<td width="${(100 / cols).toFixed(2)}%" style="border: 1px solid black; text-align: center; font-weight: bold; padding: 5px 2px; font-size: 12pt; width: ${100 / cols}%;">Câu<br/>${num}</td>`;
                } else {
                    answerGridHtml += `<td width="${(100 / cols).toFixed(2)}%" style="border: 1px solid black; padding: 5px 2px; width: ${100 / cols}%;">&nbsp;</td>`; // Fill empty cells to keep grid structure
                }
            }
            answerGridHtml += '</tr>';
            
            // Row for Answers (Empty boxes)
            answerGridHtml += '<tr>';
            for (let j = 0; j < cols; j++) {
                answerGridHtml += `<td width="${(100 / cols).toFixed(2)}%" style="border: 1px solid black; height: 35px; width: ${100 / cols}%;">&nbsp;</td>`;
            }
            answerGridHtml += '</tr>';
        }
        answerGridHtml += '</table>';

        let tfScenarioCounter = 0;
        const questionContent = tracNghiemQuestions.map((q, index) => {
            const displayContent = (q.content || '').replace(/\n/g, '<br/>');
            
            if (q.questionType === 'true-false') {
                const hasFourStatements = Array.isArray(q.options) && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase()));
                if (hasFourStatements) {
                    tfScenarioCounter++;
                    const cleanScenario = (q.content || '')
                        .replace(/^Tình\s*huống\s*\d*\s*[:.]\s*/i, '')
                        .replace(/\s*(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai\s*của\s*các\s*phát\s*biểu\s*sau\s*[:.]?\s*$/i, '')
                        .trim()
                        .replace(/\n/g, '<br/>');
                    const subStatementsHtml = '<div style="margin-left: 0.5cm;">' + q.options.map((opt: any, sIdx: number) => {
                        const subLabel = opt.id || ['a', 'b', 'c', 'd'][sIdx] || String.fromCharCode(97 + sIdx);
                        return `<p style="padding: 2pt 0; font-size: 13pt; margin: 0; text-align: justify;">${subLabel}) ${opt.text}</p>`;
                    }).join('') + '</div>';
                    return `
                        <p style="margin-top: 8pt; margin-bottom: 3pt; font-size: 13pt; text-align: justify;"><strong>Tình huống ${tfScenarioCounter}:</strong> ${cleanScenario}</p>
                        <p style="margin-top: 3pt; margin-bottom: 3pt; font-size: 13pt; text-align: justify;"><strong>Câu ${index + 1}.</strong> Xác định tính đúng hoặc sai của các phát biểu sau:</p>
                        ${subStatementsHtml}
                    `;
                }
                return `<p style="margin-top: 6pt; margin-bottom: 0; font-size: 13pt; text-align: justify;"><strong>Câu ${index + 1}.</strong> ${displayContent}</p>`;
            }

            let questionHtml = `<p style="margin-top: 6pt; margin-bottom: 0; font-size: 13pt; text-align: justify;"><strong>Câu ${index + 1}.</strong> ${displayContent}</p>`;

            if (q.options && q.options.length > 0) {
                // Modified heuristic: If any option is > 25 chars, assume it might wrap in a 2-col table, so switch to vertical.
                // This prevents the "rớt dòng" (orphan word) issue in table cells.
                const allShort = q.options.every((opt: any) => (opt.text || '').trim().length < 25);
                let optionsHtml = '';
                
                if (allShort) {
                    // Two Columns (Table)
                    optionsHtml = '<table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border: none; border-collapse: collapse; table-layout: fixed; margin-left: 0.5cm;">';
                    for (let i = 0; i < q.options.length; i += 2) {
                        const opt1 = q.options[i];
                        const opt2 = q.options[i + 1];
                        optionsHtml += `<tr>
                            <td style="border: none; width: 50%; vertical-align: top; padding: 2pt 5pt 2pt 0; font-size: 13pt;"><strong>${opt1.id}.</strong> ${opt1.text}</td>
                            <td style="border: none; width: 50%; vertical-align: top; padding: 2pt 0 2pt 5pt; font-size: 13pt;">${opt2 ? `<strong>${opt2.id}.</strong> ${opt2.text}` : ''}</td>
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
            <h3 style="font-size: 13pt; text-align:left; font-weight:bold; margin-top: 15pt; text-transform: uppercase;">PHẦN 2. TỰ LUẬN (${totalTuLuanPoints.toFixed(1).replace('.',',')} điểm)</h3>
            ${questionContent}
        `;
    }

    // ---------------- SECTION 2: GRADING GUIDE ----------------
    const totalQuestions = tracNghiemQuestions.length + tuLuanQuestions.length;
    const totalPoints = totalTracNghiemPoints + totalTuLuanPoints;

    let gradingGuideHeader = `
        <table style="width:100%; border: none; font-family: 'Times New Roman', serif; font-size: 13pt; margin-bottom: 15pt;">
            <tr>
                <td style="text-align: center; width: 45%; vertical-align: top;">
                    <p style="margin:0; text-transform: uppercase; font-size: 13pt; text-align: center;">${headerInfo.donVi || 'UBND PHƯỜNG HẢI CHÂU'}</p>
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; font-size: 13pt; text-align: center;">${schoolTop} ${schoolNameUnderlined}</p>
                </td>
                <td style="text-align: center; width: 55%; vertical-align: top;">
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">HƯỚNG DẪN CHẤM ${tenKyThiFull.replace(/LỚP\s*\d+\s*-\s*/, "KIỂM TRA ")}</p>
                    ${isHsktExam ? `<p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">(BIỂU MẪU CHẤM DÀNH CHO HỌC SINH KHUYẾT TẬT)</p>` : ''}
                    <p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">${monHocFormatted}</p>
                    <p style="margin:0; font-style: italic; text-align: center;">(Hướng dẫn chấm gồm có <!--[if supportFields]><span style='mso-element:field-begin'></span>SECTIONPAGES<span style='mso-element:field-separator'></span><![endif]-->01<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> trang)</p>
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
                    <td style="border: 1px solid black; padding: 5px; width: 70%;">Đáp án / Hướng dẫn chấm</td>
                    <td style="border: 1px solid black; padding: 5px; width: 15%;">Điểm</td>
                </tr>
            </thead>
            <tbody>
    `;

    // MC Section (Grading Guide)
    let mcSectionHtml = '';
    if (tracNghiemQuestions.length > 0) {
        // Generate nested grid for MC answers
        let mcCols = 15;
        if (tracNghiemQuestions.length > 15) {
            let minEmpty = 15;
            let bestCols = 15;
            for (let c = 15; c >= 10; c--) {
                const rows = Math.ceil(tracNghiemQuestions.length / c);
                const empty = (rows * c) - tracNghiemQuestions.length;
                if (empty < minEmpty) {
                    minEmpty = empty;
                    bestCols = c;
                }
            }
            mcCols = bestCols;
        } else {
            mcCols = tracNghiemQuestions.length;
        }
        const mcRows = Math.ceil(tracNghiemQuestions.length / mcCols);
        
        let mcGrid = `<table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; margin: 0 auto; table-layout: fixed;">`;
        for (let r = 0; r < mcRows; r++) {
            mcGrid += `<tr>`;
            for (let c = 0; c < mcCols; c++) {
                const idx = r * mcCols + c;
                if (idx < tracNghiemQuestions.length) {
                    mcGrid += `<td width="${(100 / mcCols).toFixed(2)}%" style="border: 1px solid black; font-weight: bold; padding: 2px; background-color: #f0f0f0; width: ${100 / mcCols}%;">${idx + 1}</td>`;
                } else {
                    mcGrid += `<td width="${(100 / mcCols).toFixed(2)}%" style="border: 1px solid black; padding: 2px; width: ${100 / mcCols}%;">&nbsp;</td>`;
                }
            }
            mcGrid += `</tr><tr>`;
            for (let c = 0; c < mcCols; c++) {
                const idx = r * mcCols + c;
                if (idx < tracNghiemQuestions.length) {
                    const q = tracNghiemQuestions[idx];
                    let correctOpt = '';
                    if (q.questionType === 'true-false') {
                        if (Array.isArray(q.options) && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase()))) {
                            correctOpt = q.options.map((o: any, sIdx: number) => `${o.id || ['a', 'b', 'c', 'd'][sIdx]}-${o.isCorrect ? 'Đ' : 'S'}`).join('<br/>');
                        } else {
                            correctOpt = q.answer === 'Sai' || q.options?.find((o: any) => o.isCorrect)?.id === 'Sai' ? 'S' : 'Đ';
                        }
                    } else {
                        correctOpt = q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ') || q.answer || '';
                    }
                    mcGrid += `<td width="${(100 / mcCols).toFixed(2)}%" style="border: 1px solid black; padding: 2px; width: ${100 / mcCols}%;">${correctOpt || ''}</td>`;
                } else {
                    mcGrid += `<td width="${(100 / mcCols).toFixed(2)}%" style="border: 1px solid black; padding: 2px; width: ${100 / mcCols}%;">&nbsp;</td>`;
                }
            }
            mcGrid += `</tr>`;
        }
        mcGrid += `</table>`;

        mcSectionHtml = `
            <tr>
                <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; vertical-align: middle;">
                    Trắc nghiệm:<br/>${formatDiem(totalTracNghiemPoints)} điểm
                    <br/><span style="font-weight: normal; font-style: italic; font-size: 11pt;">(mỗi câu trả lời đúng được ${formatDiem(unitMcPoint)} đ)</span>
                </td>
                <td style="border: 1px solid black; padding: 10px; vertical-align: middle;">
                    ${mcGrid}
                </td>
                <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; vertical-align: middle;">
                    ${formatDiem(totalTracNghiemPoints)}đ
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
            rawAnswer = rawAnswer.replace(/^HƯỚNG DẪN CHẤM:?\s*/i, '');
            rawAnswer = rawAnswer.replace(/;\s*(?=(?:[a-z]|[0-9]{1,2})\s*[\)\.\-–:])/gi, '\n');
            rawAnswer = rawAnswer.replace(/(\s+)(?=[a-z]\s*[-–]\s*\d+(?:[\.,]\d+)?[đd])/gi, '\n');

            const questionParts = parseParts(q.content);
            const answerParts = parseParts(rawAnswer);
            
            let nestedTableRows = '';
            
            if (answerParts.length > 1) {
                const getPartKey = (lbl: string) => {
                    const m = lbl.match(/([a-z]|[0-9]{1,2})/i);
                    return m ? m[1].toLowerCase() : lbl.replace(/[^a-z0-9]/gi, '').toLowerCase();
                };

                answerParts.forEach((ansPart, idx) => {
                    const ansKey = getPartKey(ansPart.label);
                    const qPart = questionParts.find(qp => getPartKey(qp.label) === ansKey) || { content: '' };
                    
                    let col1Label = ansPart.label.replace(/\s*[-–].*$/, '').trim();
                    if (col1Label && !col1Label.endsWith(')') && !col1Label.endsWith('.')) {
                        col1Label += ')';
                    }

                    let col1Text = col1Label ? `<b>${col1Label}</b>` : `<b>Ý ${idx + 1}:</b>`;
                    if (qPart.content) {
                        col1Text += ` ${qPart.content}`; 
                    } else if (!col1Label || col1Label === '-' || col1Label === '+' || col1Label === '*') {
                        col1Text = `<b>Ý ${idx + 1}</b>`;
                    }
                    
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
                        Tự luận:<br/>${formatDiem(totalTuLuanPoints)} điểm
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
                    ${formatDiem(q.points || 1.0)}đ
                </td>
            `;
            essaySectionHtml += `</tr>`;
        });
    }

    // Footer Row
    let gradingFooterRow = `
        <tr>
            <td colspan="2" style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold;">
                Tổng số câu: ${totalQuestions} câu (${tracNghiemQuestions.length} TN${tuLuanQuestions.length > 0 ? ` + ${tuLuanQuestions.length} TL` : ''})
            </td>
            <td style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold;">
                ${formatDiem(totalPoints)}đ
            </td>
        </tr>
    `;

    let gradingTableEnd = `</tbody></table>`;
    
    let hsktFooterNote = '';
    if (isHsktExam) {
        hsktFooterNote = `
            <div style="margin-top: 8px; font-style: italic; font-size: 11pt; text-align: center;">
                * Ghi chú: Giáo viên chấm linh hoạt, ghi nhận sự cố gắng và mức độ hoàn thành yêu cầu cần đạt của Học sinh khuyết tật theo quy định hiện hành.
            </div>
        `;
    }

    let gradingFooterText = `
        <div style="text-align: center; margin-top: 15px; font-weight: bold;">---Hết---</div>
        <div style="margin-top: 10px; font-style: italic; font-size: 11pt; text-align: center;">
            Học sinh có thể trình bày theo cách khác, hợp lí, chính xác thì cho điểm tối đa.
        </div>
        ${hsktFooterNote}
    `;

    const examSectionContent = `
        <div class="Section1">
            ${examHeaderHtml}
            ${examBodyHtml}
            <br/><p style="text-align: center; font-weight: bold; margin-top: 20px;">---HẾT---</p>
            ${exportSection === 'both' ? `<br clear=all style='mso-special-character:line-break;page-break-before:always;mso-break-type:section-break'>` : ''}
        </div>
    `;

    const gradingSectionContent = `
        ${exportSection === 'both' ? `<p style="page-break-before: always; margin: 0; padding: 0; font-size: 1pt;">&nbsp;</p>` : ''}
        <div class="${exportSection === 'both' ? 'Section2' : 'Section1'}">
            ${exportSection === 'both' ? `<br clear=all style='page-break-before:always'>` : ''}
            ${gradingGuideHeader}
            ${gradingTableStart}
            ${mcSectionHtml}
            ${essaySectionHtml}
            ${gradingFooterRow}
            ${gradingTableEnd}
            ${gradingFooterText}
        </div>
    `;

    // 3. Document Structure
    return `
        <html xmlns:v='urn:schemas-microsoft-com:vml' xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${isHsktExam ? 'De Thi HSKT' : 'De Thi'}</title>
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
            ${exportSection !== 'grading_only' ? examSectionContent : ''}
            ${exportSection !== 'exam_only' ? gradingSectionContent : ''}
            
            <!-- Footer Definitions -->
            <!--[if gte mso 9]>
            <div style='mso-element:footer' id='f1'>
                <p class=MsoFooter>
                    Trang ${PAGE_NUM}/${SECTION_PAGES}
                </p>
            </div>
            <div style='mso-element:footer' id='f2'>
                <p class=MsoFooter>
                    Trang ${PAGE_NUM}/${SECTION_PAGES}
                </p>
            </div>
            <![endif]-->
        </body>
    </html>`;
};

export interface MatrixTopicNoteItem {
    topicIndex: number;
    mainTopic: string;
    shortName: string;
    soTiet: number;
    examinedPeriods: number;
    newPeriods: number;
    questionCount: number;
    points: number;
    priorPercent: number;
    realizedPercent: number;
    targetPercent: number;
    status: 'reduced' | 'kept' | 'new' | 'adjusted';
    formattedLine: string;
    lineText: string;
    lessonDetails: string[];
}

export const buildMatrixNotesSummary = (data: MatrixData, examName: string = '') => {
    const isNewFormat = data.matrixFormat === 'new_4part';
    const pointsTNKQ = data.pointsConfig?.pointsTNKQ ?? 0.25;
    const pointsTL = data.pointsConfig?.pointsTL ?? 1.0;
    const rowEssayPoints = data.pointsConfig?.rowEssayPoints ?? {};
    const getRowPointsTL = (rIdx: number) => rowEssayPoints[rIdx] ?? pointsTL;

    const mcPt = data.newPointsConfig?.mcPoint ?? 0.25;
    const tfPt = data.newPointsConfig?.tfPoint ?? 0.25;
    const saPt = data.newPointsConfig?.saPoint ?? 0.25;
    const useShortAnswer = data.newPointsConfig?.useShortAnswer !== false;

    const fmtPct = (val: number): string => {
        const rounded = parseFloat(val.toFixed(1));
        if (rounded % 1 === 0) return rounded.toFixed(0);
        return rounded.toString().replace('.', ',');
    };

    const getRowCfg = (rIdx: number): NewMatrixFormatRowConfig => {
        const existing = data.newFormatRows?.[rIdx];
        const r = data.matrix.rows[rIdx] || [];
        const defNL = getDefaultCompetencyForTopic(String(r[1] || ''), String(r[2] || ''));
        if (existing) {
            const clone: NewMatrixFormatRowConfig = JSON.parse(JSON.stringify(existing));
            if (!useShortAnswer) {
                (['B', 'H', 'VD'] as const).forEach(lKey => {
                    const saC = clone.sa[lKey]?.count || 0;
                    if (saC > 0) {
                        clone.tf[lKey].count = (clone.tf[lKey]?.count || 0) + saC;
                        clone.sa[lKey].count = 0;
                    }
                });
            }
            return clone;
        }
        const cfg = createEmptyNewFormatRow(defNL);
        cfg.mc.B.count = parseInt(String(r[5] || '0'), 10) || 0;
        cfg.mc.H.count = parseInt(String(r[7] || '0'), 10) || 0;
        cfg.mc.VD.count = parseInt(String(r[9] || '0'), 10) || 0;
        cfg.essay.B.count = parseInt(String(r[6] || '0'), 10) || 0;
        cfg.essay.H.count = parseInt(String(r[8] || '0'), 10) || 0;
        cfg.essay.VD.count = (parseInt(String(r[10] || '0'), 10) || 0) + (parseInt(String(r[12] || '0'), 10) || 0);
        return cfg;
    };

    let totalSoTiet = 0;
    let sumSoTietChecked = 0;
    let sumSoTietUnchecked = 0;
    let grandPoints = 0;

    const rowStats = data.matrix.rows.map((row, rIdx) => {
        const st = parseFloat(String(row[4]) || '0');
        const rawExamined = parseFloat(String(row[14]) || '0');
        const examined = Math.min(Math.max(rawExamined, 0), st);
        const unexamined = Math.max(st - examined, 0);

        totalSoTiet += st;
        sumSoTietChecked += examined;
        sumSoTietUnchecked += unexamined;

        let qCount = 0;
        let pts = 0;
        const rEssayPt = getRowPointsTL(rIdx);

        if (isNewFormat) {
            const cfg = getRowCfg(rIdx);
            const mcC = cfg.mc.B.count + cfg.mc.H.count + cfg.mc.VD.count;
            const tfC = cfg.tf.B.count + cfg.tf.H.count + cfg.tf.VD.count;
            const saC = cfg.sa.B.count + cfg.sa.H.count + cfg.sa.VD.count;
            const esC = cfg.essay.B.count + cfg.essay.H.count + cfg.essay.VD.count;
            qCount = mcC + tfC + saC + esC;
            pts = mcC * mcPt + tfC * tfPt + saC * saPt + esC * rEssayPt;
        } else {
            const tnkq = (parseInt(String(row[5]) || '0') + parseInt(String(row[7]) || '0') + parseInt(String(row[9]) || '0') + parseInt(String(row[11]) || '0'));
            const tl = (parseInt(String(row[6]) || '0') + parseInt(String(row[8]) || '0') + parseInt(String(row[10]) || '0') + parseInt(String(row[12]) || '0'));
            qCount = tnkq + tl;
            pts = tnkq * pointsTNKQ + tl * rEssayPt;
        }

        grandPoints += pts;

        return {
            rIdx,
            mainTopic: String(row[1] || ''),
            subTopic: String(row[2] || ''),
            lesson: String(row[3] || ''),
            soTiet: st,
            examined,
            unexamined,
            qCount,
            pts
        };
    });

    // Calculate target weight for examined vs new pool
    let targetPercentOldPool = 0;
    if (totalSoTiet > 0) {
        if (sumSoTietChecked > 0 && sumSoTietUnchecked === 0) {
            targetPercentOldPool = 100;
        } else if (sumSoTietChecked === 0) {
            targetPercentOldPool = 0;
        } else {
            const naturalOld = (sumSoTietChecked / totalSoTiet) * 100;
            targetPercentOldPool = Math.min(35, naturalOld);
        }
    }
    const targetPercentNewPool = 100 - targetPercentOldPool;

    const getRowTargetPct = (st: number, examined: number, unexamined: number) => {
        if (totalSoTiet <= 0) return 0;
        if (sumSoTietChecked > 0 && sumSoTietUnchecked > 0) {
            const pOld = (examined / sumSoTietChecked) * targetPercentOldPool;
            const pNew = (unexamined / sumSoTietUnchecked) * targetPercentNewPool;
            return pOld + pNew;
        }
        return (st / totalSoTiet) * 100;
    };

    const topicGroups: Record<string, typeof rowStats> = {};
    rowStats.forEach(rs => {
        if (!topicGroups[rs.mainTopic]) topicGroups[rs.mainTopic] = [];
        topicGroups[rs.mainTopic].push(rs);
    });

    const topicKeys = Object.keys(topicGroups);
    const examinedTopicCount = topicKeys.filter(k => topicGroups[k].some(r => r.examined > 0)).length;

    const topicItems: MatrixTopicNoteItem[] = topicKeys.map((mainTopic, idx) => {
        const items = topicGroups[mainTopic];
        const tSoTiet = items.reduce((s, r) => s + r.soTiet, 0);
        const tExamined = items.reduce((s, r) => s + r.examined, 0);
        const tNew = items.reduce((s, r) => s + r.unexamined, 0);
        const tQuestions = items.reduce((s, r) => s + r.qCount, 0);
        const tPoints = items.reduce((s, r) => s + r.pts, 0);
        const tTargetPct = items.reduce((s, r) => s + getRowTargetPct(r.soTiet, r.examined, r.unexamined), 0);

        const realizedPct = grandPoints > 0 ? (tPoints / grandPoints) * 100 : tTargetPct;
        const naturalPct = totalSoTiet > 0 ? (tSoTiet / totalSoTiet) * 100 : 0;
        const midtermSharePct = sumSoTietChecked > 0 ? (tExamined / sumSoTietChecked) * 100 : naturalPct;

        // If at least 2 topics were examined in midterm (e.g., Chủ đề 1 = 75%, Chủ đề 2 = 25% of midterm), use midtermSharePct; otherwise use naturalPct
        const priorPct = (tExamined > 0 && examinedTopicCount >= 2) ? midtermSharePct : naturalPct;

        const shortMatch = mainTopic.match(/^(Chủ\s*đề\s*[^.:–\-]+)/i);
        const shortName = shortMatch ? shortMatch[1].trim() : `Chủ đề ${idx + 1}`;
        const fullLabel = mainTopic.toLowerCase().startsWith('chủ đề') ? mainTopic : `Chủ đề ${idx + 1} (${mainTopic})`;

        let status: 'reduced' | 'kept' | 'new' | 'adjusted' = 'kept';
        let formattedLine = '';

        if (sumSoTietChecked > 0) {
            if (tExamined > 0) {
                if (realizedPct < priorPct - 0.5) {
                    status = 'reduced';
                    formattedLine = `${fullLabel}: ${fmtPct(priorPct)}% giảm còn ${fmtPct(realizedPct)}% - giữ ${tQuestions}`;
                } else if (Math.abs(realizedPct - priorPct) <= 0.5) {
                    status = 'kept';
                    formattedLine = `${fullLabel}: ${fmtPct(priorPct)}% giữ nguyên – giữ ${tQuestions}`;
                } else {
                    status = 'adjusted';
                    formattedLine = `${fullLabel}: ${fmtPct(priorPct)}% điều chỉnh thành ${fmtPct(realizedPct)}% – giữ ${tQuestions}`;
                }
            } else {
                status = 'new';
                formattedLine = `${fullLabel}: ${fmtPct(realizedPct)}%`;
            }
        } else {
            if (Math.abs(realizedPct - naturalPct) <= 0.5) {
                status = 'kept';
                formattedLine = `${fullLabel}: ${fmtPct(realizedPct)}% giữ nguyên – giữ ${tQuestions}`;
            } else if (realizedPct < naturalPct - 0.5) {
                status = 'reduced';
                formattedLine = `${fullLabel}: ${fmtPct(naturalPct)}% giảm còn ${fmtPct(realizedPct)}% - giữ ${tQuestions}`;
            } else {
                status = 'adjusted';
                formattedLine = `${fullLabel}: ${fmtPct(realizedPct)}% – giữ ${tQuestions}`;
            }
        }

        const lessonDetails = items.map(r => {
            const rLabel = r.lesson || r.subTopic;
            const rRealPct = grandPoints > 0 ? (r.pts / grandPoints) * 100 : getRowTargetPct(r.soTiet, r.examined, r.unexamined);
            const ktText = r.examined > 0 ? `đã kiểm tra ${r.examined}/${r.soTiet} tiết (giảm tỷ lệ)` : `chưa kiểm tra (${r.soTiet} tiết mới)`;
            return `${rLabel}: ${r.soTiet} tiết (${ktText}) → chọn ${r.qCount} câu (${formatDiem(r.pts)}đ – ${fmtPct(rRealPct)}%)`;
        });

        return {
            topicIndex: idx + 1,
            mainTopic,
            shortName,
            soTiet: tSoTiet,
            examinedPeriods: tExamined,
            newPeriods: tNew,
            questionCount: tQuestions,
            points: tPoints,
            priorPercent: priorPct,
            realizedPercent: realizedPct,
            targetPercent: tTargetPct,
            status,
            formattedLine,
            lineText: formattedLine,
            lessonDetails
        };
    });

    const oldPoints = rowStats.filter(r => r.examined > 0).reduce((s, r) => s + (r.soTiet > 0 ? r.pts * (r.examined / r.soTiet) : 0), 0);
    const realizedOldPct = grandPoints > 0 ? (oldPoints / grandPoints) * 100 : targetPercentOldPool;
    const realizedNewPct = Math.max(0, 100 - realizedOldPct);
    const actualOldPct = totalSoTiet > 0 ? (sumSoTietChecked / totalSoTiet) * 100 : 0;
    const actualNewPct = totalSoTiet > 0 ? (sumSoTietUnchecked / totalSoTiet) * 100 : 0;

    const defaultLines = topicItems.map(t => t.formattedLine);

    return {
        totalSoTiet,
        sumSoTietChecked,
        sumSoTietUnchecked,
        totalPeriods: totalSoTiet,
        totalExaminedPeriods: sumSoTietChecked,
        totalNewPeriods: sumSoTietUnchecked,
        hasExamined: sumSoTietChecked > 0,
        grandPoints,
        actualOldPct,
        actualNewPct,
        actualOldPercent: actualOldPct,
        actualNewPercent: actualNewPct,
        realizedOldPct,
        realizedNewPct,
        realizedOldPercent: realizedOldPct,
        realizedNewPercent: realizedNewPct,
        targetOldPercent: targetPercentOldPool,
        targetNewPercent: targetPercentNewPool,
        topicItems,
        items: topicItems,
        defaultText: defaultLines.join('\n')
    };
};

export const generatePrintHTML = (data: MatrixData, examName: string) => {
    // Extract Grade from examName to use in Title
    const gradeMatch = examName.match(/\d+/);
    const gradeStr = gradeMatch ? gradeMatch[0] : "";
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Determine exam type for logic branching
    const isFinalExam = /cuối\s+k[ìỳ]/i.test(examName);
    
    const cleanExamName = examName.toUpperCase().replace(new RegExp(`^LỚP\\s*${gradeStr}\\s*-\\s*`, 'i'), '');
    const matrixTitle = `KHUNG MA TRẬN ĐỀ KIỂM TRA MÔN TIN LỚP ${gradeStr} - ${cleanExamName} NĂM HỌC ${currentYear}-${nextYear}`;
    const specTitle = `BẢNG ĐẶC TẢ ĐỀ KIỂM TRA MÔN TIN LỚP ${gradeStr} - ${cleanExamName} NĂM HỌC ${currentYear}-${nextYear}`;
    const pointsTNKQ = data.pointsConfig?.pointsTNKQ ?? 0.25;
    const pointsTL = data.pointsConfig?.pointsTL ?? 1.0;
    const rowEssayPoints = data.pointsConfig?.rowEssayPoints ?? {};
    const getRowPointsTL = (rIdx: number) => rowEssayPoints[rIdx] ?? pointsTL;

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

    // TL: NB(6) -> TH(8) -> VD(10) -> VDC(12) (đánh số Câu nối tiếp sau phần TNKQ)
    tlCounter = tnkqCounter;
    [6, 8, 10, 12].forEach(colIdx => {
        data.matrix.rows.forEach((row, rIdx) => {
            const count = parseInt(String(row[colIdx]) || '0');
            if (count > 0) {
                const start = tlCounter;
                const end = tlCounter + count - 1;
                positionMap[`${rIdx}-${colIdx}`] = start === end ? `Câu ${start}` : `Câu ${start}-${end}`;
                tlCounter += count;
            }
        });
    });

    // CSS Definitions
    const css = `
        <style>
            @page SectionMatrix {
                size: 29.7cm 21cm;
                margin: 1.5cm 2cm 1.5cm 2cm;
                mso-page-orientation: landscape;
            }
            div.SectionMatrix {
                page: SectionMatrix;
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

    data.matrix.rows.forEach((row, rIdx) => {
         const st = parseFloat(String(row[4]) || '0');
         const examined = parseFloat(String(row[14]) || '0');
         const validExamined = Math.min(Math.max(examined, 0), st);
         const validNew = Math.max(st - validExamined, 0);

         totalSoTiet += st;
         sumSoTietChecked += validExamined;
         sumSoTietUnchecked += validNew;

         const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
         const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
         const rowPointsTL = getRowPointsTL(rIdx);
         totalExamPoints += (tnkq * pointsTNKQ) + (tl * rowPointsTL);
    });

    // Dynamic Weight Logic for Column Calculations (Target %)
    const MIN_CHECKED_RATIO = 0.3; // 30%
    const MAX_CHECKED_RATIO = 0.35; // 35%
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
    data.matrix.rows.forEach((row, rIdx) => {
         const st = parseFloat(String(row[4]) || '0');
         const examined = parseFloat(String(row[14]) || '0');
         const validExamined = Math.min(Math.max(examined, 0), st);
         const validNew = Math.max(st - validExamined, 0);
         
         const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
         const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
         const rowPointsTL = getRowPointsTL(rIdx);
         const rowPoints = (tnkq * pointsTNKQ) + (tl * rowPointsTL);

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
            const originalIdx = data.matrix.rows.indexOf(row);
            const rowPointsTL = getRowPointsTL(originalIdx);
            const tnkq = (parseInt(String(row[5])||'0') + parseInt(String(row[7])||'0') + parseInt(String(row[9])||'0') + parseInt(String(row[11])||'0'));
            const tl = (parseInt(String(row[6])||'0') + parseInt(String(row[8])||'0') + parseInt(String(row[10])||'0') + parseInt(String(row[12])||'0'));
            mainTopicPoints += (tnkq * pointsTNKQ) + (tl * rowPointsTL);
            
            mainTopicSoTiet += parseFloat(String(row[4])||'0');
            mainTopicWeightedPercent += getRowTargetPercent(row);
        });

        // Display string for Main Topic
        let mainTopicDisplay = `<b>${mainTopic}</b>`;
        
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
            const subPoints = Array(15).fill(0);
            let subSoTiet = 0;
            let subWeightedPercent = 0;
            
            const firstRow = subRows[0];
            const lessonName = firstRow[3]; // "Bài"

            const posGroups: Record<string, string[]> = { NB: [], TH: [], VD: [] };

            subRows.forEach((r: any) => {
                 subSoTiet += parseFloat(String(r[4]) || '0');
                 subWeightedPercent += getRowTargetPercent(r);

                 const originalIdx = data.matrix.rows.indexOf(r);
                 const rowPointsTL = getRowPointsTL(originalIdx);

                 for (let k = 5; k <= 12; k++) { // NB, TH, VD, VDC
                     const c = parseInt(String(r[k]) || '0');
                     subCounts[k] += c;
                     const isTNKQ = k % 2 !== 0;
                     subPoints[k] += c * (isTNKQ ? pointsTNKQ : rowPointsTL);
                 } 
                 
                 const posNB_TN = positionMap[`${originalIdx}-5`]; if(posNB_TN) posGroups.NB.push(posNB_TN.replace('Câu ', ''));
                 const posNB_TL = positionMap[`${originalIdx}-6`]; if(posNB_TL) posGroups.NB.push(posNB_TL.replace('Câu ', ''));
                 const posTH_TN = positionMap[`${originalIdx}-7`]; if(posTH_TN) posGroups.TH.push(posTH_TN.replace('Câu ', ''));
                 const posTH_TL = positionMap[`${originalIdx}-8`]; if(posTH_TL) posGroups.TH.push(posTH_TL.replace('Câu ', ''));
                 const posVD_TN = positionMap[`${originalIdx}-9`]; if(posVD_TN) posGroups.VD.push(posVD_TN.replace('Câu ', ''));
                 const posVD_TL = positionMap[`${originalIdx}-10`]; if(posVD_TL) posGroups.VD.push(posVD_TL.replace('Câu ', ''));
            });
            
            const positionSummary: string[] = [];
            if (posGroups.NB.length > 0) positionSummary.push(`NB: Câu ${posGroups.NB.join(', ')}`);
            if (posGroups.TH.length > 0) positionSummary.push(`TH: Câu ${posGroups.TH.join(', ')}`);
            if (posGroups.VD.length > 0) positionSummary.push(`VD: Câu ${posGroups.VD.join(', ')}`);
            
            let contentDisplay = `${subTopic} (${subSoTiet} tiết)`;

            // --- MATRIX ROW ---
            matrixBodyHtml += '<tr>';
            matrixBodyHtml += `<td>${stt}</td>`;
            if (index === 0) {
                matrixBodyHtml += `<td class="text-left align-top" rowspan="${mainRowspan}">${mainTopicDisplay}</td>`;
            }
            matrixBodyHtml += `<td class="text-left">${contentDisplay}</td>`;
            
            // Counts & Points for 5-10
            for(let k=5; k<=10; k++){
                const val = subCounts[k];
                const isTNKQ = k % 2 !== 0;
                const pt = subPoints[k];
                
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
            // Merge customized specification row HTML across all lessons in this subTopic, fallback to getRequirementsHtml
            const customReqs = subRows
                .map((r: any) => {
                    const idx = data.matrix.rows.indexOf(r);
                    return idx >= 0 ? (data.specifications?.rows?.[idx]?.[4] || '') : '';
                })
                .filter(Boolean);
            const reqHtml = customReqs.length > 0 ? customReqs.join('') : getRequirementsHtml(gradeStr, mainTopic, subTopic);

            // Filter out unchecked YCCĐ items (marked with data-unchecked="true")
            let activeReqHtml = reqHtml;
            if (activeReqHtml.includes('data-unchecked="true"')) {
                activeReqHtml = activeReqHtml.replace(/<div[^>]*data-unchecked="true"[^>]*>[\s\S]*?<\/div>/gi, '');
            }

            // Chỉ giữ lại các mức độ và tiêu chí có câu hỏi được chọn trong đề
            const subTotalNB = subCounts[5] + subCounts[6];
            const subTotalTH = subCounts[7] + subCounts[8];
            const subTotalVD = subCounts[9] + subCounts[10];
            const subTotalVDC = subCounts[11] + subCounts[12];
            const hasAnySubQuestions = (subTotalNB + subTotalTH + subTotalVD + subTotalVDC) > 0;

            if (hasAnySubQuestions) {
                const keptByLevel: Record<'B' | 'H' | 'VD', number> = { B: 0, H: 0, VD: 0 };
                activeReqHtml = activeReqHtml.replace(
                    /<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]*?)(?=(?:<strong\b[^>]*>|$))/gi,
                    (_fullMatch, rawTitle, bodyHtml) => {
                        const lower = String(rawTitle || '').replace(/<[^>]*>/g, '').trim().toLowerCase();
                        let lvlKey: 'B' | 'H' | 'VD' = 'VD';
                        let lvlQuota = 0;
                        if (lower.startsWith('nhận biết') || lower.startsWith('biết') || lower.startsWith('- biết')) {
                            lvlKey = 'B';
                            lvlQuota = subTotalNB;
                        } else if (lower.startsWith('thông hiểu') || lower.startsWith('hiểu') || lower.startsWith('- hiểu')) {
                            lvlKey = 'H';
                            lvlQuota = subTotalTH;
                        } else {
                            lvlKey = 'VD';
                            lvlQuota = subTotalVD + subTotalVDC;
                        }
                        if (lvlQuota <= 0) return '';

                        const filteredBody = String(bodyHtml).replace(/<div[^>]*>[\s\S]*?<\/div>/gi, (divMatch) => {
                            keptByLevel[lvlKey]++;
                            return keptByLevel[lvlKey] <= lvlQuota ? divMatch : '';
                        });
                        return `<strong class="block font-semibold">${rawTitle}</strong>${filteredBody}`;
                    }
                );
            }

            // Remove empty level headers that have no <div> items under them
            activeReqHtml = activeReqHtml.replace(/<strong\b[^>]*>[\s\S]*?<\/strong>(?=\s*(?:<strong\b[^>]*>|$))/gi, '');

            let formattedReq = activeReqHtml
                .replace(/<strong class="block font-semibold.*?"/g, '<p style="font-weight: bold; margin: 4px 0 2px 0;"')
                .replace(/<strong\b[^>]*>/g, '<p style="font-weight: bold; margin: 4px 0 2px 0;">')
                .replace(/<\/strong>/g, '</p>')
                .replace(/<div class="pl-2"[^>]*>/g, '<p style="margin: 0 0 0 10px;">')
                .replace(/<div[^>]*>/g, '<p style="margin: 0 0 0 10px;">')
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
            
            const renderCountPoints = (count: number, pt: number) => {
                 return `<div>${count}</div><div>/ ${formatDiem(pt)}đ</div>`;
            };

            // NB(TN), TH(TN), VD(TL)
            const totalVdTlCount = subCounts[10] + subCounts[12];
            const totalVdTlPoints = subPoints[10] + subPoints[12];
            specBodyHtml += `<td>${renderCountPoints(subCounts[5], subPoints[5])}</td>`;
            specBodyHtml += `<td>${renderCountPoints(subCounts[7], subPoints[7])}</td>`;
            specBodyHtml += `<td>${renderCountPoints(totalVdTlCount, totalVdTlPoints)}</td>`;
            
            specBodyHtml += '</tr>';

            // Spec Totals (Matching the specific columns)
            specTotals.nb += subCounts[5];
            specTotals.th += subCounts[7];
            specTotals.vd += totalVdTlCount;
            specTotals.vdc += 0;
            
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
                <td><b>${formatDiem(totalExamPoints)}</b></td>
            </tr>
            <tr>
                <td colspan="3"><b>Tỉ lệ điểm (%)</b></td>
                <td colspan="2"><b>${formatPercent(nb_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(th_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(vd_percent)}%</b></td>
                <td><b>100%</b></td>
            </tr>
            <tr>
                <td colspan="3"><b>Tỉ lệ chung (%)</b></td>
                <td colspan="4"><b>${formatPercent(nb_th_percent)}%</b></td>
                <td colspan="2"><b>${formatPercent(vd_percent)}%</b></td>
                <td><b>100%</b></td>
            </tr>
        </tfoot>`;

    // Only counting the specific columns: NB_TN, TH_TN, VD_TL
    let specFooterHtml = `
        <tfoot>
            <tr>
                <td colspan="4" class="text-left"><b>Tổng</b></td>
                <td><b>${specTotals.nb}</b></td><td><b>${specTotals.th}</b></td>
                <td><b>${specTotals.vd}</b></td>
            </tr>
            <tr>
                <td colspan="4" class="text-left"><b>Tỉ lệ %</b></td>
                <td><b>${formatPercent(nb_percent)}%</b></td><td><b>${formatPercent(th_percent)}%</b></td>
                <td><b>${formatPercent(vd_percent)}%</b></td>
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
                <col class="col-total">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">TT</th>
                    <th rowspan="3">Chương/Chủ đề</th>
                    <th rowspan="3">Nội dung/Đơn vị kiến thức</th>
                    <th colspan="6">Mức độ nhận thức</th>
                    <th rowspan="3">Tổng % điểm</th>
                </tr>
                <tr>
                    <th colspan="2">Nhận biết</th>
                    <th colspan="2">Thông hiểu</th>
                    <th colspan="2">Vận dụng</th>
                </tr>
                <tr>
                    <th>TNKQ</th><th>TL</th>
                    <th>TNKQ</th><th>TL</th>
                    <th>TNKQ</th><th>TL</th>
                </tr>
            </thead>
            <tbody>${matrixBodyHtml}</tbody>
            ${matrixFooterHtml}
        </table>`;

    let specTableHtml = `
        <table>
            <colgroup>
                <col class="col-tt">
                <col class="col-chuong">
                <col class="col-noidung">
                <!-- Removed col-bai -->
                <col class="col-req">
                <col class="col-level"><col class="col-level"><col class="col-level">
            </colgroup>
            <caption>${specTitle}</caption>
            <thead>
                <tr>
                    <th rowspan="2">TT</th><th rowspan="2">Chương/Chủ đề</th>
                    <th rowspan="2">Nội dung/Đơn vị kiến thức</th>
                    <!-- Removed th Bai -->
                    <th rowspan="2">Mức độ đánh giá</th>
                    <th colspan="3">Số câu hỏi theo mức độ nhận thức</th>
                </tr>
                <tr>
                    <th>Nhận biết<br/>(TNKQ)</th><th>Thông hiểu<br/>(TNKQ)</th><th>Vận dụng<br/>(TL)</th>
                </tr>
            </thead>
            <tbody>${specBodyHtml}</tbody>
            ${specFooterHtml}
        </table>`;

    if (data.matrixFormat === 'new_4part') {
        const mcPt = data.newPointsConfig?.mcPoint ?? 0.25;
        const tfPt = data.newPointsConfig?.tfPoint ?? 0.25;
        const saPt = data.newPointsConfig?.saPoint ?? 0.25;
        const useShortAnswer = data.newPointsConfig?.useShortAnswer !== false;
        const activeParts: ('mc' | 'tf' | 'sa' | 'essay')[] = useShortAnswer
            ? ['mc', 'tf', 'sa', 'essay']
            : ['mc', 'tf', 'essay'];

        const getRowCfg = (rIdx: number): NewMatrixFormatRowConfig => {
            const existing = data.newFormatRows?.[rIdx];
            const r = data.matrix.rows[rIdx] || [];
            const defNL = getDefaultCompetencyForTopic(String(r[1] || ''), String(r[2] || ''));
            if (existing) return existing;
            const cfg = createEmptyNewFormatRow(defNL);
            cfg.mc.B.count = parseInt(String(r[5] || '0'), 10) || 0;
            cfg.mc.H.count = parseInt(String(r[7] || '0'), 10) || 0;
            cfg.mc.VD.count = parseInt(String(r[9] || '0'), 10) || 0;
            cfg.essay.B.count = parseInt(String(r[6] || '0'), 10) || 0;
            cfg.essay.H.count = parseInt(String(r[8] || '0'), 10) || 0;
            cfg.essay.VD.count = (parseInt(String(r[10] || '0'), 10) || 0) + (parseInt(String(r[12] || '0'), 10) || 0);
            return cfg;
        };

        // Tính vị trí câu hỏi cho Mẫu mới (new_4part) theo số thứ tự Câu liên tục trong đề (Câu 1, Câu 2, ... Câu 31)
        const newFormatPosMap: Record<string, { pKey: 'mc' | 'tf' | 'sa' | 'essay'; prefix: string; start: number; end: number }[]> = {};
        let globalQuestionCounter = 1;
        activeParts.forEach(pKey => {
            (['B', 'H', 'VD'] as const).forEach(lKey => {
                data.matrix.rows.forEach((_, rIdx) => {
                    const rawCfg = getRowCfg(rIdx);
                    let c = rawCfg[pKey][lKey]?.count || 0;
                    if (!useShortAnswer && pKey === 'tf') {
                        c += rawCfg.sa[lKey]?.count || 0;
                    }
                    if (!useShortAnswer && pKey === 'sa') {
                        c = 0;
                    }
                    if (c > 0) {
                        const start = globalQuestionCounter;
                        const end = globalQuestionCounter + c - 1;
                        const prefix = 'Câu';
                        const mapKey = `${rIdx}-${lKey}`;
                        if (!newFormatPosMap[mapKey]) newFormatPosMap[mapKey] = [];
                        newFormatPosMap[mapKey].push({ pKey, prefix, start, end });
                        globalQuestionCounter += c;
                    }
                });
            });
        });

        let newMatrixBody = '';
        let newSpecBody = '';
        const tot = {
            mc: { B: 0, H: 0, VD: 0 },
            tf: { B: 0, H: 0, VD: 0 },
            sa: { B: 0, H: 0, VD: 0 },
            essay: { B: 0, H: 0, VD: 0 }
        };
        let ptMC = 0, ptTF = 0, ptSA = 0, ptEssay = 0;
        let ptB = 0, ptH = 0, ptVD = 0;
        let newStt = 1;

        // Helper gom YCCĐ theo 3 mức độ (- Biết:, - Hiểu:, - Vận dụng:) cho Bản đặc tả (chỉ hiển thị tiêu chí được chọn ra đề)
        type PrintSpecSubRow = {
            subRowId: string;
            levelKey: 'B' | 'H' | 'VD';
            title: string;
            items: string[];
        };

        const parseReqToSpecSubRows = (
            reqHtmlStr: string,
            levelQuotas?: Record<'B' | 'H' | 'VD', number>
        ): PrintSpecSubRow[] => {
            const rawHtml = reqHtmlStr || '';
            const strongRegex = /<strong[^>]*>([\s\S]*?)<\/strong>/gi;
            const matches: { title: string; index: number; endIndex: number }[] = [];
            let m;
            while ((m = strongRegex.exec(rawHtml)) !== null) {
                matches.push({
                    title: m[1].trim(),
                    index: m.index,
                    endIndex: m.index + m[0].length
                });
            }

            const checkedItems: Record<'B' | 'H' | 'VD', string[]> = {
                B: [],
                H: [],
                VD: []
            };
            const allItems: Record<'B' | 'H' | 'VD', string[]> = {
                B: [],
                H: [],
                VD: []
            };

            matches.forEach((sec, sIdx) => {
                const nextStart = sIdx + 1 < matches.length ? matches[sIdx + 1].index : rawHtml.length;
                const block = rawHtml.substring(sec.endIndex, nextStart);
                const lower = sec.title.toLowerCase();
                const levelKey: 'B' | 'H' | 'VD' =
                    lower.startsWith('nhận biết') || lower.startsWith('biết') || lower.startsWith('- biết')
                        ? 'B'
                        : lower.startsWith('thông hiểu') || lower.startsWith('hiểu') || lower.startsWith('- hiểu')
                        ? 'H'
                        : 'VD';

                const divRegex = /<div\b([^>]*)>([\s\S]*?)<\/div>/gi;
                let dm;
                while ((dm = divRegex.exec(block)) !== null) {
                    const attrs = dm[1] || '';
                    const txt = dm[2].trim();
                    if (txt) {
                        if (!allItems[levelKey].includes(txt)) {
                            allItems[levelKey].push(txt);
                        }
                        if (!/data-unchecked="true"/i.test(attrs)) {
                            if (!checkedItems[levelKey].includes(txt)) {
                                checkedItems[levelKey].push(txt);
                            }
                        }
                    }
                }
            });

            const levelDefs: { k: 'B' | 'H' | 'VD'; t: string }[] = [
                { k: 'B', t: '- Biết:' },
                { k: 'H', t: '- Hiểu:' },
                { k: 'VD', t: '- Vận dụng:' }
            ];

            const totalQuotaInSub = levelQuotas
                ? (levelQuotas.B + levelQuotas.H + levelQuotas.VD)
                : 0;

            const activeRows = levelDefs
                .map((d, idx) => {
                    const quota = levelQuotas ? levelQuotas[d.k] : 0;
                    // Nếu đơn vị kiến thức có phân bổ câu hỏi trong đề, chỉ hiện những mức độ có câu hỏi được chọn (quota > 0)
                    if (totalQuotaInSub > 0 && quota <= 0) {
                        return null;
                    }
                    let items = checkedItems[d.k].length > 0 ? checkedItems[d.k] : allItems[d.k];
                    if (quota > 0 && items.length > quota) {
                        items = items.slice(0, quota);
                    }
                    if (items.length === 0 && totalQuotaInSub > 0 && quota <= 0) {
                        return null;
                    }
                    return {
                        subRowId: `header_${idx}`,
                        levelKey: d.k,
                        title: d.t,
                        items: items.length > 0 ? items : []
                    };
                })
                .filter((r): r is PrintSpecSubRow => r !== null && ((levelQuotas?.[r.levelKey] || 0) > 0 || r.items.length > 0));

            if (activeRows.length > 0) {
                return activeRows;
            }

            // Fallback nếu toàn bộ ma trận chưa nhập số câu nào
            return levelDefs
                .map((d, idx) => ({
                    subRowId: `header_${idx}`,
                    levelKey: d.k,
                    title: d.t,
                    items: allItems[d.k]
                }))
                .filter(r => r.items.length > 0);
        };

        Object.keys(groupedByMainTopic).forEach(mainTopic => {
            const rows = groupedByMainTopic[mainTopic];
            const groupedSub = rows.reduce((acc: any, r: any) => {
                const s = r[2]; if (!acc[s]) acc[s] = [];
                acc[s].push(r);
                return acc;
            }, {});
            const subs = Object.keys(groupedSub);
            const mainSpan = subs.length;

            let mainTopicSoTiet = 0;
            let mainTopicExamined = 0;
            rows.forEach((r: any) => {
                const st = parseFloat(String(r[4]) || '0');
                const ex = Math.min(Math.max(parseFloat(String(r[14]) || '0'), 0), st);
                mainTopicSoTiet += st;
                mainTopicExamined += ex;
            });

            // Tính tổng số dòng <tr> của Chủ đề trong Bảng đặc tả (chỉ giữ các mức độ & tiêu chí được chọn ra đề)
            const subSpecRowsMap: Record<string, PrintSpecSubRow[]> = {};
            let mainSpecRowSpan = 0;
            subs.forEach(subTopic => {
                const subRows = groupedSub[subTopic];
                const customReqs = subRows
                    .map((r: any) => {
                        const idx = data.matrix.rows.indexOf(r);
                        return idx >= 0 ? (data.specifications?.rows?.[idx]?.[4] || '') : '';
                    })
                    .filter(Boolean);
                const reqHtmlStr = customReqs.length > 0
                    ? customReqs.join('')
                    : getRequirementsHtml(gradeStr, mainTopic, subTopic);

                const subQuotas: Record<'B' | 'H' | 'VD', number> = { B: 0, H: 0, VD: 0 };
                subRows.forEach((r: any) => {
                    const origIdx = data.matrix.rows.indexOf(r);
                    const rawCfg = getRowCfg(origIdx);
                    (['B', 'H', 'VD'] as const).forEach(lKey => {
                        subQuotas[lKey] +=
                            (rawCfg.mc[lKey]?.count || 0) +
                            (rawCfg.tf[lKey]?.count || 0) +
                            (rawCfg.sa[lKey]?.count || 0) +
                            (rawCfg.essay[lKey]?.count || 0);
                    });
                });

                const parsedSubRows = parseReqToSpecSubRows(reqHtmlStr, subQuotas);
                subSpecRowsMap[subTopic] = parsedSubRows;
                mainSpecRowSpan += parsedSubRows.length;
            });

            subs.forEach((subTopic, sIdx) => {
                const subRows = groupedSub[subTopic];
                const defaultNL = getDefaultCompetencyForTopic(mainTopic, subTopic);
                const agg = createEmptyNewFormatRow(defaultNL);
                let subPts = 0;
                let subSoTiet = 0;
                let subExamined = 0;
                let subTargetPct = 0;
                const lessonLabels: string[] = [];

                const subPosRawByLevel: Record<'B' | 'H' | 'VD', { pKey: 'mc' | 'tf' | 'sa' | 'essay'; prefix: string; start: number; end: number }[]> = { B: [], H: [], VD: [] };

                subRows.forEach((r: any) => {
                    const origIdx = data.matrix.rows.indexOf(r);
                    const st = parseFloat(String(r[4]) || '0');
                    const ex = Math.min(Math.max(parseFloat(String(r[14]) || '0'), 0), st);
                    subSoTiet += st;
                    subExamined += ex;
                    subTargetPct += getRowTargetPercent(r);
                    if (r[3] && String(r[3]).trim() && String(r[3]).trim() !== subTopic) {
                        lessonLabels.push(`${String(r[3]).trim()} (${st} tiết)`);
                    }

                    (['B', 'H', 'VD'] as const).forEach(lKey => {
                        const posArr = newFormatPosMap[`${origIdx}-${lKey}`];
                        if (posArr && posArr.length > 0) {
                            subPosRawByLevel[lKey].push(...posArr);
                        }
                    });

                    const rawCfg = getRowCfg(origIdx);
                    const cfg: NewMatrixFormatRowConfig = JSON.parse(JSON.stringify(rawCfg));
                    if (!useShortAnswer) {
                        // Tự động đẩy số câu Trả lời ngắn / Điền khuyết sang Đúng – Sai nếu môn không dùng Điền khuyết
                        (['B', 'H', 'VD'] as const).forEach(lKey => {
                            const saC = cfg.sa[lKey].count || 0;
                            if (saC > 0) {
                                cfg.tf[lKey].count = (cfg.tf[lKey].count || 0) + saC;
                                cfg.sa[lKey].count = 0;
                            }
                        });
                    }
                    const rEssayPt = getRowPointsTL(origIdx);

                    (['mc', 'tf', 'sa', 'essay'] as const).forEach(pKey => {
                        (['B', 'H', 'VD'] as const).forEach(lKey => {
                            const c = cfg[pKey][lKey].count || 0;
                            agg[pKey][lKey].count += c;
                            if (cfg[pKey][lKey].competency) {
                                agg[pKey][lKey].competency = cfg[pKey][lKey].competency;
                            }
                            tot[pKey][lKey] += c;
                        });
                    });
                    if (cfg.subRowCells) {
                        if (!agg.subRowCells) agg.subRowCells = {};
                        Object.entries(cfg.subRowCells).forEach(([k, v]) => {
                            const targetKey = !useShortAnswer && k.includes('_sa_') ? k.replace('_sa_', '_tf_') : k;
                            if (!agg.subRowCells![targetKey]) {
                                agg.subRowCells![targetKey] = { ...v };
                            } else {
                                agg.subRowCells![targetKey].count += v.count || 0;
                            }
                        });
                    }

                    const rowPtB = cfg.mc.B.count * mcPt + cfg.tf.B.count * tfPt + cfg.sa.B.count * saPt + cfg.essay.B.count * rEssayPt;
                    const rowPtH = cfg.mc.H.count * mcPt + cfg.tf.H.count * tfPt + cfg.sa.H.count * saPt + cfg.essay.H.count * rEssayPt;
                    const rowPtVD = cfg.mc.VD.count * mcPt + cfg.tf.VD.count * tfPt + cfg.sa.VD.count * saPt + cfg.essay.VD.count * rEssayPt;

                    ptB += rowPtB; ptH += rowPtH; ptVD += rowPtVD;
                    ptMC += (cfg.mc.B.count + cfg.mc.H.count + cfg.mc.VD.count) * mcPt;
                    ptTF += (cfg.tf.B.count + cfg.tf.H.count + cfg.tf.VD.count) * tfPt;
                    ptSA += (cfg.sa.B.count + cfg.sa.H.count + cfg.sa.VD.count) * saPt;
                    ptEssay += (cfg.essay.B.count + cfg.essay.H.count + cfg.essay.VD.count) * rEssayPt;

                    subPts += rowPtB + rowPtH + rowPtVD;
                });

                const sumRowB = agg.mc.B.count + agg.tf.B.count + agg.sa.B.count + agg.essay.B.count;
                const sumRowH = agg.mc.H.count + agg.tf.H.count + agg.sa.H.count + agg.essay.H.count;
                const sumRowVD = agg.mc.VD.count + agg.tf.VD.count + agg.sa.VD.count + agg.essay.VD.count;
                const subPct = (subPts / 10) * 100;

                const mainTopicCellHtml = `<b>${mainTopic}</b>`;
                const subTopicCellHtml = `${subTopic} (${subSoTiet} tiết)`;

                newMatrixBody += '<tr>';
                newMatrixBody += `<td>${newStt}</td>`;
                if (sIdx === 0) {
                    newMatrixBody += `<td class="text-left align-top" rowspan="${mainSpan}">${mainTopicCellHtml}</td>`;
                }
                newMatrixBody += `<td class="text-left">${subTopicCellHtml}</td>`;
                activeParts.forEach(pKey => {
                    (['B', 'H', 'VD'] as const).forEach(lKey => {
                        const c = agg[pKey][lKey].count;
                        newMatrixBody += `<td>${c > 0 ? c : ''}</td>`;
                    });
                });
                newMatrixBody += `<td>${sumRowB > 0 ? sumRowB : ''}</td>`;
                newMatrixBody += `<td>${sumRowH > 0 ? sumRowH : ''}</td>`;
                newMatrixBody += `<td>${sumRowVD > 0 ? sumRowVD : ''}</td>`;
                newMatrixBody += `<td>${subPct > 0 ? formatPercent(subPct) + '%' : ''}</td>`;
                newMatrixBody += '</tr>';

                const formatMergedPositions = (items: { pKey: 'mc' | 'tf' | 'sa' | 'essay'; prefix: string; start: number; end: number }[]): string[] => {
                    const res: string[] = [];
                    activeParts.forEach(pKey => {
                        const partItems = items.filter(it => it.pKey === pKey).sort((a, b) => a.start - b.start);
                        if (partItems.length === 0) return;
                        const merged: { prefix: string; start: number; end: number }[] = [];
                        partItems.forEach(it => {
                            const last = merged[merged.length - 1];
                            if (last && last.end + 1 >= it.start) {
                                last.end = Math.max(last.end, it.end);
                            } else {
                                merged.push({ prefix: it.prefix, start: it.start, end: it.end });
                            }
                        });
                        merged.forEach(m => {
                            res.push(m.start === m.end ? `${m.prefix} ${m.start}` : `${m.prefix} ${m.start}-${m.end}`);
                        });
                    });
                    return res;
                };

                const subPosByLevel: Record<'B' | 'H' | 'VD', string[]> = {
                    B: formatMergedPositions(subPosRawByLevel.B),
                    H: formatMergedPositions(subPosRawByLevel.H),
                    VD: formatMergedPositions(subPosRawByLevel.VD)
                };

                // Specification Rows (mỗi mức độ - Biết:, - Hiểu:, - Vận dụng: là 1 dòng <tr> chứa toàn bộ YCCĐ của mức độ đó)
                const specSubRows = subSpecRowsMap[subTopic] || [];
                const subSpecSpan = specSubRows.length;

                specSubRows.forEach((sr, srIdx) => {
                    const levelPosList = subPosByLevel[sr.levelKey] || [];
                    const posHtml = levelPosList.length > 0
                        ? `<div style="margin-top: 3px; font-size: 10.5pt; color: #0056b3;"><i>* Vị trí câu hỏi: ${levelPosList.join('; ')}</i></div>`
                        : '';

                    newSpecBody += '<tr>';
                    if (srIdx === 0) {
                        newSpecBody += `<td class="align-top" rowspan="${subSpecSpan}">${newStt}</td>`;
                    }
                    if (sIdx === 0 && srIdx === 0) {
                        newSpecBody += `<td class="text-left align-top" rowspan="${mainSpecRowSpan}"><b>${mainTopic}</b></td>`;
                    }
                    if (srIdx === 0) {
                        newSpecBody += `<td class="text-left align-top" rowspan="${subSpecSpan}">${subTopic}</td>`;
                    }
                    const itemsHtml = sr.items.map(it => `<div>${it}</div>`).join('');
                    newSpecBody += `<td class="text-left align-top"><div><b>${sr.title}</b></div>${itemsHtml}${posHtml}</td>`;

                    activeParts.forEach(pKey => {
                        (['B', 'H', 'VD'] as const).forEach(lKey => {
                            let c = 0;
                            let nl = agg[pKey][lKey].competency || defaultNL;

                            if (lKey === sr.levelKey) {
                                c = agg[pKey][lKey].count;
                                nl = agg[pKey][lKey].competency || defaultNL;
                            }

                            newSpecBody += `<td>${c > 0 ? `<div>(${c})</div><div>(${nl})</div>` : ''}</td>`;
                        });
                    });
                    newSpecBody += '</tr>';
                });

                newStt++;
            });
        });

        const totCountB = tot.mc.B + tot.tf.B + tot.sa.B + tot.essay.B;
        const totCountH = tot.mc.H + tot.tf.H + tot.sa.H + tot.essay.H;
        const totCountVD = tot.mc.VD + tot.tf.VD + tot.sa.VD + tot.essay.VD;
        const grandPoints = ptB + ptH + ptVD;

        matrixTableHtml = `
            <table>
                <caption>1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ (${examName.toUpperCase()})</caption>
                <thead>
                    <tr>
                        <th rowspan="4">TT</th>
                        <th rowspan="4">Chủ đề/Chương</th>
                        <th rowspan="4">Nội dung/đơn vị kiến thức</th>
                        <th colspan="${useShortAnswer ? 12 : 9}">Mức độ đánh giá</th>
                        <th colspan="3" rowspan="3">Tổng</th>
                        <th rowspan="4">Tỷ lệ % điểm</th>
                    </tr>
                    <tr>
                        <th colspan="${useShortAnswer ? 9 : 6}">TNKQ</th>
                        <th colspan="3" rowspan="2">Tự luận</th>
                    </tr>
                    <tr>
                        <th colspan="3"><i>Nhiều lựa chọn</i></th>
                        <th colspan="3"><i>"Đúng – Sai"</i></th>
                        ${useShortAnswer ? '<th colspan="3"><i>Trả lời ngắn</i></th>' : ''}
                    </tr>
                    <tr>
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                        ${useShortAnswer ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                    </tr>
                </thead>
                <tbody>${newMatrixBody}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><b>Tổng số câu/lệnh hỏi</b></td>
                        <td><b>${tot.mc.B || ''}</b></td><td><b>${tot.mc.H || ''}</b></td><td><b>${tot.mc.VD || ''}</b></td>
                        <td><b>${tot.tf.B || ''}</b></td><td><b>${tot.tf.H || ''}</b></td><td><b>${tot.tf.VD || ''}</b></td>
                        ${useShortAnswer ? `<td><b>${tot.sa.B || ''}</b></td><td><b>${tot.sa.H || ''}</b></td><td><b>${tot.sa.VD || ''}</b></td>` : ''}
                        <td><b>${tot.essay.B || ''}</b></td><td><b>${tot.essay.H || ''}</b></td><td><b>${tot.essay.VD || ''}</b></td>
                        <td><b>${totCountB}</b></td><td><b>${totCountH}</b></td><td><b>${totCountVD}</b></td>
                        <td><b>${totCountB + totCountH + totCountVD}</b></td>
                    </tr>
                    <tr>
                        <td colspan="3"><b>Tổng số điểm</b></td>
                        <td colspan="3"><b>${formatDiem(ptMC)}</b></td>
                        <td colspan="3"><b>${formatDiem(ptTF)}</b></td>
                        ${useShortAnswer ? `<td colspan="3"><b>${formatDiem(ptSA)}</b></td>` : ''}
                        <td colspan="3"><b>${formatDiem(ptEssay)}</b></td>
                        <td><b>${formatDiem(ptB)}</b></td><td><b>${formatDiem(ptH)}</b></td><td><b>${formatDiem(ptVD)}</b></td>
                        <td><b>${formatDiem(grandPoints)}</b></td>
                    </tr>
                    <tr>
                        <td colspan="3"><b>Tỉ lệ %</b></td>
                        <td colspan="3"><b>${formatPercent(ptMC * 10)}</b></td>
                        <td colspan="3"><b>${formatPercent(ptTF * 10)}</b></td>
                        ${useShortAnswer ? `<td colspan="3"><b>${formatPercent(ptSA * 10)}</b></td>` : ''}
                        <td colspan="3"><b>${formatPercent(ptEssay * 10)}</b></td>
                        <td><b>${formatPercent(ptB * 10)}</b></td><td><b>${formatPercent(ptH * 10)}</b></td><td><b>${formatPercent(ptVD * 10)}</b></td>
                        <td><b>100%</b></td>
                    </tr>
                </tfoot>
            </table>`;

        specTableHtml = `
            <table>
                <caption>2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ (${examName.toUpperCase()})</caption>
                <thead>
                    <tr>
                        <th rowspan="4">TT</th>
                        <th rowspan="4">Chủ đề/Chương</th>
                        <th rowspan="4">Nội dung/đơn vị kiến thức</th>
                        <th rowspan="4" style="width: 34%;">Yêu cầu cần đạt</th>
                        <th colspan="${useShortAnswer ? 12 : 9}">Số câu hỏi ở các mức độ đánh giá</th>
                    </tr>
                    <tr>
                        <th colspan="${useShortAnswer ? 9 : 6}">TNKQ</th>
                        <th colspan="3" rowspan="2">Tự luận</th>
                    </tr>
                    <tr>
                        <th colspan="3"><i>Nhiều lựa chọn</i></th>
                        <th colspan="3"><i>"Đúng – Sai"</i></th>
                        ${useShortAnswer ? '<th colspan="3"><i>Trả lời ngắn</i></th>' : ''}
                    </tr>
                    <tr>
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                        ${useShortAnswer ? '<th>Biết</th><th>Hiểu</th><th>Vận dụng</th>' : ''}
                        <th>Biết</th><th>Hiểu</th><th>Vận dụng</th>
                    </tr>
                </thead>
                <tbody>${newSpecBody}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="4"><b>Tổng số câu</b></td>
                        <td><b>${tot.mc.B || ''}</b></td><td><b>${tot.mc.H || ''}</b></td><td><b>${tot.mc.VD || ''}</b></td>
                        <td><b>${tot.tf.B || ''}</b></td><td><b>${tot.tf.H || ''}</b></td><td><b>${tot.tf.VD || ''}</b></td>
                        ${useShortAnswer ? `<td><b>${tot.sa.B || ''}</b></td><td><b>${tot.sa.H || ''}</b></td><td><b>${tot.sa.VD || ''}</b></td>` : ''}
                        <td><b>${tot.essay.B || ''}</b></td><td><b>${tot.essay.H || ''}</b></td><td><b>${tot.essay.VD || ''}</b></td>
                    </tr>
                    <tr>
                        <td colspan="4"><b>Tổng số điểm</b></td>
                        <td colspan="3"><b>${formatDiem(ptMC)}</b></td>
                        <td colspan="3"><b>${formatDiem(ptTF)}</b></td>
                        ${useShortAnswer ? `<td colspan="3"><b>${formatDiem(ptSA)}</b></td>` : ''}
                        <td colspan="3"><b>${formatDiem(ptEssay)}</b></td>
                    </tr>
                    <tr>
                        <td colspan="4"><b>Tỉ lệ %</b></td>
                        <td colspan="3"><b>${formatPercent(ptMC * 10)}</b></td>
                        <td colspan="3"><b>${formatPercent(ptTF * 10)}</b></td>
                        ${useShortAnswer ? `<td colspan="3"><b>${formatPercent(ptSA * 10)}</b></td>` : ''}
                        <td colspan="3"><b>${formatPercent(ptEssay * 10)}</b></td>
                    </tr>
                </tfoot>
            </table>`;
    }

    // Thêm phần "* Ghi chú:" cụ thể dưới bảng Ma trận cho cả 2 định dạng (New 4-Part & Classic)
    const notesSummary = buildMatrixNotesSummary(data, examName);
    const customNoteRaw = (data.customNote || '').trim();
    const noteLinesToPrint = customNoteRaw
        ? customNoteRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        : notesSummary.defaultText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (noteLinesToPrint.length > 0) {
        const noteLinesHtml = noteLinesToPrint
            .map(line => `<p style="margin: 2pt 0 2pt 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; text-align: left;">${line}</p>`)
            .join('');
        matrixTableHtml += `
            <div style="margin-top: 8pt; margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; text-align: left;">
                <p style="margin: 0 0 3pt 12pt; font-weight: bold; font-size: 12pt; text-align: left;">* Ghi chú:</p>
                ${noteLinesHtml}
            </div>
        `;
    }

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
            <div class="SectionMatrix">
                ${matrixTableHtml}
            </div>
            <div class="SectionMatrix" style="page-break-before: always;">
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
        if (q.category !== 'essay' && q.options && q.options.length > 0) {
            const correctOpt = q.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id).join(', ');
            if (correctOpt) {
                answers += `<p style="font-size: 13pt;">${num}. ${correctOpt}</p>`;
            }
        } else if (q.answer) {
            answers += `<p style="font-size: 13pt;">${num}. ${q.answer}</p>`;
        }
    });
    return keyHtml + answers + '</div>';
};

// --- CHUYÊN NGHIỆP: BỘ TIỆN ÍCH TRỘN ĐỀ VÀ HỒ SƠ KHẢO THÍ ĐA MÃ ĐỀ ---

export const shuffleArray = <T>(array: T[]): T[] => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

export const generateExamVariants = (
    baseQuestions: any[],
    variantCodes: string[] = ['101', '102', '103', '104'],
    shuffleOptions: boolean = true
): any[] => {
    // Phân loại câu hỏi theo các phần theo quy định của Bộ GD&ĐT
    const part1 = baseQuestions.filter(q => (q.questionType === 'multiple-choice' || q.questionType === 'multiple-answer' || (!q.questionType && q.category !== 'essay' && q.options && q.options.length === 4 && q.options[0]?.id?.toUpperCase() === 'A')));
    const part2 = baseQuestions.filter(q => q.questionType === 'true-false');
    const part3 = baseQuestions.filter(q => q.questionType === 'short-answer' || q.mcType === 'fill-blank');
    const part4 = baseQuestions.filter(q => q.category === 'essay' || q.questionType === 'essay' || (!q.questionType && q.category === 'essay'));

    return variantCodes.map((code, codeIdx) => {
        let currentP1 = [...part1];
        let currentP2 = [...part2];
        let currentP3 = [...part3];
        let currentP4 = [...part4];

        // Mã đầu tiên (gốc) giữ nguyên thứ tự, các mã tiếp theo cũng không đảo câu hỏi để bám theo ma trận
        // if (codeIdx > 0) {
        //     currentP1 = shuffleArray(currentP1);
        //     currentP2 = shuffleArray(currentP2);
        //     currentP3 = shuffleArray(currentP3);
        // }

        // Hoán vị các phương án A, B, C, D của câu trắc nghiệm nhiều lựa chọn
        if (shuffleOptions && codeIdx > 0) {
            currentP1 = currentP1.map(q => {
                if (!q.options || q.options.length < 2) return q;
                const shuffledOpts = shuffleArray(q.options);
                const standardIds = ['A', 'B', 'C', 'D', 'E', 'F'];
                const remappedOpts = shuffledOpts.map((opt, idx) => ({
                    ...opt,
                    id: standardIds[idx] || opt.id
                }));
                const correctOpt = remappedOpts.find((o: any) => o.isCorrect);
                return {
                    ...q,
                    options: remappedOpts,
                    answer: correctOpt ? correctOpt.id : q.answer
                };
            });
        }

        const combined = [...currentP1, ...currentP2, ...currentP3, ...currentP4];
        
        // Tạo bảng đáp án chi tiết cho mã đề này
        const answerKey = combined.map((q, idx) => {
            const num = idx + 1;
            let ansStr = '';
            let qType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' = 'multiple-choice';

            if (q.questionType === 'true-false') {
                qType = 'true-false';
                if (q.answer === 'Sai' || q.options?.find((o: any) => o.isCorrect)?.id === 'Sai') {
                    ansStr = 'Sai';
                } else if (q.answer === 'Đúng' || q.options?.find((o: any) => o.isCorrect)?.id === 'Đúng') {
                    ansStr = 'Đúng';
                } else if (q.options && q.options.length > 2) {
                    ansStr = q.options.map((o: any) => `${o.id || 'x'}-${o.isCorrect ? 'Đ' : 'S'}`).join('; ');
                } else {
                    ansStr = q.answer || 'Đúng';
                }
            } else if (q.questionType === 'short-answer' || q.mcType === 'fill-blank') {
                qType = 'short-answer';
                ansStr = q.answer || '';
            } else if (q.category === 'essay' || q.questionType === 'essay') {
                qType = 'essay';
                ansStr = 'Xem HD chấm';
            } else {
                qType = 'multiple-choice';
                const correct = q.options?.find((o: any) => o.isCorrect);
                ansStr = correct ? correct.id : (q.answer || '');
            }

            return {
                number: num,
                answer: ansStr,
                points: q.points || (q.category === 'essay' ? 1.0 : 0.25),
                type: qType,
                details: q.answer
            };
        });

        return {
            code,
            questions: combined,
            answerKey
        };
    });
};

// Xuất bảng ma trận so sánh đáp án chéo giữa các mã đề (Cross-Reference Matrix)
export const generateMultiCodeAnswerKeyMatrixHtml = (
    variants: any[],
    headerInfo: any
): string => {
    if (!variants || variants.length === 0) return '';
    const maxQuestions = Math.max(...variants.map(v => v.questions.length));

    let headerRows = `<tr>
        <th style="border: 1px solid black; padding: 6px; background-color: #f0f0f0; text-align: center; width: 60px;">Câu</th>`;
    variants.forEach(v => {
        headerRows += `<th style="border: 1px solid black; padding: 6px; background-color: #e8f0fe; text-align: center; font-weight: bold;">Mã đề ${v.code}</th>`;
    });
    headerRows += `</tr>`;

    let dataRows = '';
    for (let i = 0; i < maxQuestions; i++) {
        const qNum = i + 1;
        const rowBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
        dataRows += `<tr style="background-color: ${rowBg};">
            <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">${qNum}</td>`;
        
        variants.forEach(v => {
            const keyItem = v.answerKey[i];
            const displayAns = keyItem ? keyItem.answer : '-';
            const isEssay = keyItem?.type === 'essay';
            const cellStyle = isEssay ? 'font-style: italic; color: #555;' : 'font-weight: bold; color: #004494;';
            dataRows += `<td style="border: 1px solid black; padding: 5px; text-align: center; ${cellStyle}">${displayAns}</td>`;
        });
        dataRows += `</tr>`;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Bảng Ma Trận Đáp Án Các Mã Đề - ${headerInfo.tenKyThi}</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 13pt; margin: 2cm; }
                table { border-collapse: collapse; width: 100%; margin-top: 15pt; }
                th, td { border: 1px solid black; }
                .title { text-align: center; font-weight: bold; font-size: 15pt; text-transform: uppercase; margin-bottom: 5pt; }
                .subtitle { text-align: center; font-style: italic; margin-bottom: 15pt; font-size: 12pt; }
            </style>
        </head>
        <body>
            <table style="width:100%; border: none; margin-bottom: 20pt;">
                <tr>
                    <td style="border: none; text-align: center; width: 45%;">
                        <p style="margin:0; text-transform: uppercase; text-align: center;">${headerInfo.donVi || 'PHÒNG GD&ĐT'}</p>
                        <p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">TRƯỜNG ${headerInfo.tenTruong || 'THCS'}</p>
                    </td>
                    <td style="border: none; text-align: center; width: 55%;">
                        <p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">${headerInfo.tenKyThi}</p>
                        <p style="margin:0; font-weight: bold; text-transform: uppercase; text-align: center;">MÔN: ${headerInfo.monHoc}</p>
                    </td>
                </tr>
            </table>

            <div class="title">BẢNG ĐỐI CHIẾU ĐÁP ÁN CÁC MÃ ĐỀ THI</div>
            <div class="subtitle">(Áp dụng cho các mã đề: ${variants.map(v => v.code).join(', ')})</div>

            <table>
                <thead>
                    ${headerRows}
                </thead>
                <tbody>
                    ${dataRows}
                </tbody>
            </table>

            <div style="margin-top: 25pt; display: flex; justify-content: space-between;">
                <div style="text-align: center; width: 40%;">
                    <p style="font-weight: bold; margin: 0;">TỔ TRƯỞNG CHUYÊN MÔN</p>
                    <p style="font-style: italic; margin-top: 5pt;">(Ký và ghi rõ họ tên)</p>
                </div>
                <div style="text-align: center; width: 40%;">
                    <p style="font-style: italic; margin: 0;">Ngày ..... tháng ..... năm 20...</p>
                    <p style="font-weight: bold; margin-top: 5pt;">NGƯỜI RA ĐỀ</p>
                    <p style="font-style: italic; margin-top: 5pt;">(Ký và ghi rõ họ tên)</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

export const extractHtmlParts = (fullHtml: string) => {
    const headMatch = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    let style = '';
    if (headMatch) {
        const styleMatch = headMatch[1].match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) style = styleMatch[1];
    }
    
    return {
        style,
        body: bodyMatch ? bodyMatch[1] : fullHtml
    };
};

// Xuất trọn bộ Hồ sơ Khảo thí đầy đủ (Ma trận + Bản đặc tả + Các mã đề + Barem chấm)
export const generateFullDossierHtml = (
    matrixData: MatrixData | null,
    variants: any[],
    headerInfo: any
): string => {
    let combinedStyles = '';
    
    let matrixHtml = '';
    if (matrixData) {
        const parts = extractHtmlParts(generatePrintHTML(matrixData, headerInfo.tenKyThi));
        combinedStyles += parts.style;
        matrixHtml = `
            <div style="text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 10pt; text-transform: uppercase;">
                PHẦN I. KHUNG MA TRẬN & BẢN ĐẶC TẢ ĐỀ KIỂM TRA
            </div>
            ${parts.body}
            <br clear=all style='mso-special-character:line-break;page-break-before:always'>
        `;
    }

    const examCodesHtml = variants.map((v, idx) => {
        const vHeader = { ...headerInfo, maDe: v.code };
        const parts = extractHtmlParts(generateExamWordHtml(v.questions, vHeader));
        if (idx === 0) combinedStyles += parts.style; // Style is identical for all variants
        
        let out = parts.body;
        if (idx < variants.length - 1) {
            out += `<br clear=all style='mso-special-character:line-break;page-break-before:always'>`;
        }
        return out;
    }).join('');

    const keyMatrixParts = extractHtmlParts(generateMultiCodeAnswerKeyMatrixHtml(variants, headerInfo));
    combinedStyles += keyMatrixParts.style;
    const answerKeyMatrixHtml = `
        <br clear=all style='mso-special-character:line-break;page-break-before:always'>
        ${keyMatrixParts.body}
    `;

    return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>HỒ SƠ KHẢO THÍ - ${headerInfo.tenKyThi} - ${headerInfo.monHoc}</title>
            <style>
                ${combinedStyles}
            </style>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
        </head>
        <body>
            ${matrixHtml}
            ${examCodesHtml}
            ${answerKeyMatrixHtml}
        </body>
        </html>
    `;
};
