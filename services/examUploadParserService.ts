import { ExerciseQuestion, SavedExamDossier, QuestionSubtype, getQuestionSubtype } from '../types';
import { cleanQuestionContentForWord } from '../utils';

export interface ParsedExamResult {
    success: boolean;
    error?: string;
    title?: string;
    grade?: string;
    headerInfo: {
        donVi?: string;
        tenTruong?: string;
        tenKyThi?: string;
        monHoc?: string;
        thoiGian?: string;
        maDe?: string;
        [key: string]: any;
    };
    questions: ExerciseQuestion[];
    variants?: any[];
    matrixData?: any;
    stats: {
        totalQuestions: number;
        singleChoiceCount: number;
        multipleAnswerCount: number;
        trueFalseCount: number;
        shortAnswerCount: number;
        essayCount: number;
        questionsWithAnswer: number;
        totalPoints: number;
    };
    sourceType: 'doc_html' | 'json' | 'plain_text';
}

/**
 * Chuẩn hóa mức độ nhận thức (NB, TH, VD, VDC)
 */
export const normalizeLevelTag = (raw: string): 'NB' | 'TH' | 'VD' | 'VDC' => {
    const u = (raw || '').trim().toUpperCase();
    if (u === 'NB' || u.includes('NHẬN BIẾT') || u === 'BIẾT') return 'NB';
    if (u === 'TH' || u.includes('THÔNG HIỂU') || u === 'HIỂU') return 'TH';
    if (u === 'VDC' || u.includes('VẬN DỤNG CAO')) return 'VDC';
    if (u === 'VD' || u.includes('VẬN DỤNG')) return 'VD';
    return 'NB';
};

/**
 * Trích xuất khối lớp (6, 7, 8, 9) từ văn bản
 */
export const detectGradeFromText = (text: string): string => {
    if (!text) return '8';
    const match = text.match(/(?:LỚP|KHÓI|KHỐI|K|TIN\s*HỌC|TIN)\s*([6-9])/i);
    if (match) return match[1];
    return '8';
};

/**
 * Bóc tách các thẻ phân loại [NB - 1.1], [Trắc nghiệm 1 đáp án], (Bài X: ...) ra khỏi nội dung câu hỏi
 */
export const extractTagsFromQuestionStem = (rawStem: string) => {
    let s = (rawStem || '').trim();
    let level: 'NB' | 'TH' | 'VD' | 'VDC' = 'NB';
    let criteria = '';
    let lesson = '';
    let subtype: QuestionSubtype | undefined = undefined;
    let points: number | undefined = undefined;

    // Bóc tách điểm số e.g. (1,0 điểm) hoặc (0,25 điểm) hoặc (1.5 điểm)
    const pointsMatch = s.match(/\((\d+(?:[.,]\d+)?)\s*điểm\)/i);
    if (pointsMatch) {
        points = parseFloat(pointsMatch[1].replace(',', '.'));
        s = s.replace(pointsMatch[0], '').trim();
    }

    let matched = true;
    while (matched) {
        matched = false;

        // Bóc tiền tố Câu X. hoặc Câu X: hoặc Bài X:
        const cauMatch = s.match(/^(?:(?:Câu|Bài)\s*\d+[\s.:\-)]\s*)+/i);
        if (cauMatch) {
            s = s.slice(cauMatch[0].length).trim();
            matched = true;
        }

        // Bóc thẻ loại câu hỏi e.g. [Trắc nghiệm 1 đáp án], [Đúng - Sai], [Tự luận]
        const typeMatch = s.match(/^\[\s*(Trắc\s*nghiệm\s*1\s*đáp\s*án|Trắc\s*nghiệm\s*nhiều\s*đáp\s*án|Đúng\s*[-–/]\s*Sai|Nhiều\s*đáp\s*án|Tự\s*luận|Trả\s*lời\s*ngắn|TN|TL)\s*\]\s*/i);
        if (typeMatch) {
            const rawType = typeMatch[1].toLowerCase();
            if (rawType.includes('tự luận') || rawType === 'tl') subtype = 'essay';
            else if (rawType.includes('đúng') && rawType.includes('sai')) subtype = 'true-false';
            else if (rawType.includes('nhiều')) subtype = 'multiple-answer';
            else if (rawType.includes('ngắn')) subtype = 'short-answer';
            else subtype = 'single-choice';
            s = s.slice(typeMatch[0].length).trim();
            matched = true;
        }

        // Bóc thẻ mức độ và tiêu chí e.g. [NB - 1.1] hoặc [TH] hoặc [VD: 2.1]
        const lvlCritMatch = s.match(/^\[\s*(NB|TH|VD|VDC|Nhận\s*biết|Thông\s*hiểu|Vận\s*dụng\s*cao|Vận\s*dụng)(?:\s*[-–:|,]\s*(\d+\.\d+))?\s*\]\s*/i);
        if (lvlCritMatch) {
            level = normalizeLevelTag(lvlCritMatch[1]);
            if (lvlCritMatch[2]) criteria = lvlCritMatch[2].trim();
            s = s.slice(lvlCritMatch[0].length).trim();
            matched = true;
        }

        // Bóc tiêu chí riêng e.g. [1.1]
        const critOnlyMatch = s.match(/^\[\s*(\d+\.\d+)\s*\]\s*/);
        if (critOnlyMatch) {
            criteria = critOnlyMatch[1].trim();
            if (criteria.startsWith('1.')) level = 'NB';
            else if (criteria.startsWith('2.')) level = 'TH';
            else if (criteria.startsWith('3.')) level = 'VD';
            else if (criteria.startsWith('4.')) level = 'VDC';
            s = s.slice(critOnlyMatch[0].length).trim();
            matched = true;
        }

        // Bóc thẻ bài học e.g. (Bài 1: Lược sử công cụ tính toán)
        const lessonMatch = s.match(/^\(\s*(Bài\s*\d+[^)]*)\)\s*/i);
        if (lessonMatch) {
            lesson = lessonMatch[1].trim();
            s = s.slice(lessonMatch[0].length).trim();
            matched = true;
        }

        // Dọn dẹp dấu phân cách còn sót ở đầu câu (e.g. : hoặc . hoặc -)
        if (/^[:.\-)]\s*/.test(s)) {
            s = s.replace(/^[:.\-)]\s*/, '').trim();
            matched = true;
        }
    }

    return {
        cleanStem: s.trim(),
        level,
        criteria,
        lesson,
        subtype,
        points
    };
};

/**
 * Trích xuất bảng đáp án trắc nghiệm đơn (Phần I), Đúng-Sai (Phần II) và Tự luận (Phần III) từ Section 2
 */
export const extractAnswersFromSection2Html = (doc: Document) => {
    const singleChoiceMap = new Map<number, string>();
    const trueFalseMap = new Map<number, { [key: string]: boolean }>();
    const essayMap = new Map<number, { answer: string; points?: number }>();

    // Tìm tất cả các bảng trong Section 2 hoặc toàn bộ document
    const tables = Array.from(doc.querySelectorAll('table'));

    tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length < 2) return;

        // 1. Kiểm tra bảng đáp án trắc nghiệm 1 đáp án:
        // Hàng 1 chứa các số 1, 2, 3... Hàng 2 chứa A, B, C, D...
        for (let r = 0; r < rows.length - 1; r++) {
            const row1Cells = Array.from(rows[r].querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
            const row2Cells = Array.from(rows[r + 1].querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');

            if (row1Cells.length >= 1 && row1Cells.length === row2Cells.length) {
                // Kiểm tra xem row1 có phải toàn số câu không (e.g. 1, 2, 3 hoặc Câu 1, Câu 2...)
                const isNumRow = row1Cells.every(c => /^(?:Câu\s*)?\d+$/i.test(c.replace(/[\n\r]/g, '')));
                const isAnsRow = row2Cells.every(c => /^[A-D](?:\s*,\s*[A-D])*$/i.test(c) || c === 'Đ' || c === 'S' || c === '');

                if (isNumRow && isAnsRow) {
                    row1Cells.forEach((cNum, idx) => {
                        const numMatch = cNum.match(/\d+/);
                        const ans = row2Cells[idx].toUpperCase().trim();
                        if (numMatch && ans) {
                            const qNum = parseInt(numMatch[0], 10);
                            singleChoiceMap.set(qNum, ans);
                        }
                    });
                }
            }
        }

        // 2. Kiểm tra bảng đáp án Đúng - Sai:
        // Cột 1: "Câu 13", Cột 2: "A: Đúng; B: Đúng; C: Sai; D: Đúng" hoặc "a: Đúng; b: Sai; ..."
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length >= 2) {
                const col1 = cells[0].textContent?.trim() || '';
                const col2 = cells[1].textContent?.trim() || '';

                const cauMatch = col1.match(/Câu\s*(\d+)/i);
                if (cauMatch) {
                    const qNum = parseInt(cauMatch[1], 10);
                    // Kiểm tra xem col2 có chứa Đúng/Sai không
                    if (/Đúng|Sai/i.test(col2)) {
                        const tfEntry: { [key: string]: boolean } = {};
                        // Bóc các ý: A: Đúng; B: Đúng... hoặc a: Đúng; b: Sai...
                        const partMatches = col2.matchAll(/([a-dA-D])\s*[:.)\-]\s*(Đúng|Sai|Đ|S)/gi);
                        let foundParts = 0;
                        for (const pm of partMatches) {
                            const key = pm[1].toLowerCase();
                            const val = /Đúng|Đ/i.test(pm[2]);
                            tfEntry[key] = val;
                            foundParts++;
                        }
                        if (foundParts >= 2) {
                            trueFalseMap.set(qNum, tfEntry);
                        }
                    } else if (cells.length >= 3 && /điểm/i.test(cells[2].textContent || '')) {
                        // 3. Có thể là dòng tự luận
                        const ptsMatch = cells[2].textContent?.match(/(\d+(?:[.,]\d+)?)\s*đ/i);
                        const points = ptsMatch ? parseFloat(ptsMatch[1].replace(',', '.')) : 1.0;
                        essayMap.set(qNum, {
                            answer: col2,
                            points
                        });
                    }
                }
            }
        });
    });

    return { singleChoiceMap, trueFalseMap, essayMap };
};

/**
 * Trích xuất câu hỏi từ HTML Document (Word .doc)
 */
export const parseQuestionsFromWordHtml = (doc: Document): {
    headerInfo: ParsedExamResult['headerInfo'];
    questions: ExerciseQuestion[];
} => {
    const headerInfo: ParsedExamResult['headerInfo'] = {};

    // 1. Trích xuất thông tin đầu trang (Header table)
    const allTables = Array.from(doc.querySelectorAll('table'));
    if (allTables.length > 0) {
        const topTable = allTables[0];
        const cells = Array.from(topTable.querySelectorAll('td'));
        if (cells.length >= 2) {
            const leftText = cells[0].textContent || '';
            const rightText = cells[1].textContent || '';

            // Đơn vị & Trường
            const leftLines = leftText.split('\n').map(l => l.trim()).filter(Boolean);
            if (leftLines.length > 0) {
                headerInfo.donVi = leftLines[0];
                const schoolLines = leftLines.slice(1).filter(l => !/ĐỀ\s*(?:CHÍNH\s*THỨC|DÀNH\s*CHO|THI)/i.test(l));
                headerInfo.tenTruong = schoolLines.join(' ').trim() || leftLines[1] || '';
            }

            // Tên kỳ thi, Môn, Thời gian, Mã đề
            const examMatch = rightText.match(/(KIỂM TRA[^\n]+|LỚP\s*\d+[^\n]+)/i);
            if (examMatch) headerInfo.tenKyThi = examMatch[1].trim();

            const monMatch = rightText.match(/MÔN\s*:\s*([^\n\r]+)/i);
            if (monMatch) headerInfo.monHoc = monMatch[1].trim();

            const timeMatch = rightText.match(/Thời\s*gian\s*:\s*([^\n\r]+)/i);
            if (timeMatch) headerInfo.thoiGian = timeMatch[1].trim();

            const codeMatch = rightText.match(/Mã\s*đề\s*:\s*(\w+)/i);
            if (codeMatch) headerInfo.maDe = codeMatch[1].trim();
        }
    }

    // 2. Trích xuất bảng đáp án từ Section 2
    const { singleChoiceMap, trueFalseMap, essayMap } = extractAnswersFromSection2Html(doc);

    // 3. Tách Section 1 (Đề thi) và Section 2 (Hướng dẫn chấm)
    let examContainer: Element = doc.body;
    const section1Div = doc.querySelector('div.Section1');
    if (section1Div) {
        examContainer = section1Div;
    }

    // 4. Quét toàn bộ các đoạn văn bản / phần tử trong examContainer để bóc tách từng câu hỏi
    const questions: ExerciseQuestion[] = [];
    const rawElements = Array.from(examContainer.querySelectorAll('p, table, h3, h4, div'));
    // Lọc bỏ các div bao bọc có chứa phần tử con p hoặc table để tránh trùng lặp
    const elements = rawElements.filter(el => {
        if (el.tagName.toLowerCase() === 'div' && el.querySelector('p, table')) {
            return false;
        }
        return true;
    });

    let currentSectionType: QuestionSubtype = 'single-choice';
    let currentQuestion: Partial<ExerciseQuestion> | null = null;
    let currentQNum: number | null = null;
    let currentOptions: { id: string; text: string; isCorrect: boolean }[] = [];
    let currentScenarioText = '';
    let isExamFinished = false;

    const finalizeCurrentQuestion = () => {
        if (!currentQuestion || !currentQNum) return;

        const qNum = currentQNum;
        let qType = currentQuestion.questionType || currentSectionType;
        let category: 'mc' | 'essay' = qType === 'essay' ? 'essay' : 'mc';

        // Áp dụng đáp án từ Section 2 nếu có
        if (qType === 'single-choice' || qType === 'multiple-answer') {
            const correctLetter = singleChoiceMap.get(qNum);
            if (correctLetter && currentOptions.length > 0) {
                currentOptions.forEach(opt => {
                    opt.isCorrect = opt.id.toUpperCase() === correctLetter;
                });
                currentQuestion.answer = correctLetter;
            } else if (currentOptions.some(o => o.isCorrect)) {
                const correctIds = currentOptions.filter(o => o.isCorrect).map(o => o.id);
                currentQuestion.answer = correctIds.join(', ');
                if (correctIds.length > 1) {
                    qType = 'multiple-answer';
                }
            }
        } else if (qType === 'true-false') {
            const tfData = trueFalseMap.get(qNum);
            if (tfData && currentOptions.length > 0) {
                currentOptions.forEach(opt => {
                    const k = opt.id.toLowerCase();
                    if (k in tfData) {
                        opt.isCorrect = tfData[k];
                    }
                });
                currentQuestion.answer = currentOptions.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            } else if (currentOptions.some(o => o.isCorrect)) {
                currentQuestion.answer = currentOptions.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            }
        } else if (qType === 'essay') {
            const esData = essayMap.get(qNum);
            if (esData) {
                currentQuestion.answer = esData.answer;
                if (esData.points) currentQuestion.points = esData.points;
            }
        }

        // Điểm mặc định
        if (!currentQuestion.points) {
            currentQuestion.points = qType === 'essay' ? 1.0 : 0.25;
        }

        const cleanStem = cleanQuestionContentForWord(currentQuestion.content || '').trim();

        questions.push({
            id: `uploaded_${Date.now()}_${qNum}_${Math.random().toString(36).substring(2, 6)}`,
            category,
            questionType: qType,
            level: currentQuestion.level || 'NB',
            criteria: currentQuestion.criteria || '',
            lesson: currentQuestion.lesson || '',
            content: cleanStem,
            options: currentOptions.length > 0 ? currentOptions : undefined,
            answer: currentQuestion.answer || '',
            points: currentQuestion.points
        });

        currentQuestion = null;
        currentQNum = null;
        currentOptions = [];
    };

    // Duyệt qua các phần tử để bóc tách
    elements.forEach(el => {
        if (isExamFinished) return;

        const text = (el.textContent || '').trim();
        if (!text) return;

        // Bỏ qua / kết thúc khi gặp HƯỚNG DẪN CHẤM hoặc HẾT
        if (/HƯỚNG\s*DẪN\s*CHẤM/i.test(text) || /^---\s*HẾT\s*---/i.test(text)) {
            finalizeCurrentQuestion();
            isExamFinished = true;
            return;
        }

        // Nhận diện phân phần đề thi (PHẦN I, PHẦN II, PHẦN III)
        if (/PHẦN\s*I\b.*TRẮC\s*NGHIỆM\s*1\s*ĐÁP\s*ÁN/i.test(text)) {
            currentSectionType = 'single-choice';
            return;
        }
        if (/PHẦN\s*II\b.*ĐÚNG\s*[-–/]\s*SAI/i.test(text)) {
            currentSectionType = 'true-false';
            return;
        }
        if (/PHẦN\s*III\b.*TRẢ\s*LỜI\s*NGẮN/i.test(text)) {
            currentSectionType = 'short-answer';
            return;
        }
        if (/PHẦN\s*(?:III|IV)\b.*TỰ\s*LUẬN/i.test(text)) {
            currentSectionType = 'essay';
            return;
        }

        // Bỏ qua các dòng hướng dẫn làm bài hoặc dòng thông tin học sinh
        if (/^Mỗi\s*câu\s*hỏi\s*thí\s*sinh|Trong\s*mỗi\s*ý\s*a\)|Thí\s*sinh\s*trình\s*bày|Họ\s*và\s*tên\s*học\s*sinh/i.test(text)) {
            return;
        }

        // Bắt tình huống (e.g. Tình huống 1: ...)
        const scenarioMatch = text.match(/^Tình\s*huống\s*\d*\s*[:.]\s*(.+)$/i);
        if (scenarioMatch) {
            currentScenarioText = scenarioMatch[1].trim();
            return;
        }

        // Nhận diện bắt đầu câu hỏi mới (e.g. Câu 1. hoặc Câu 1: hoặc Câu 13.)
        const cauMatch = text.match(/^(?:<strong>|<b>)?\s*(?:Câu|Bài)\s*(\d+)[\s.:\-)]\s*(.+)?/i);
        if (cauMatch) {
            finalizeCurrentQuestion();

            currentQNum = parseInt(cauMatch[1], 10);
            const rawRemainder = cauMatch[2] || '';
            const tagInfo = extractTagsFromQuestionStem(rawRemainder);

            let initialContent = tagInfo.cleanStem;
            if (currentScenarioText) {
                initialContent = `Tình huống: ${currentScenarioText}\n${initialContent}`;
                currentScenarioText = '';
            }

            let determinedSubtype = tagInfo.subtype || currentSectionType;
            if (currentQNum >= 13 && currentQNum <= 28 && currentSectionType === 'true-false') {
                determinedSubtype = 'true-false';
            }

            currentQuestion = {
                content: initialContent,
                level: tagInfo.level,
                criteria: tagInfo.criteria,
                lesson: tagInfo.lesson,
                questionType: determinedSubtype,
                points: tagInfo.points
            };
            return;
        }

        // Nếu đang trong 1 câu hỏi, kiểm tra xem el có phải là bảng chứa lựa chọn A, B, C, D không
        if (currentQuestion) {
            if (el.tagName.toLowerCase() === 'table') {
                // Kiểm tra các ô trong bảng xem có chứa A., B., C., D. không
                const cells = Array.from(el.querySelectorAll('td'));
                const cellTexts = cells.map(c => ({
                    html: c.innerHTML,
                    text: c.textContent?.trim() || '',
                    hasGreen: /color:\s*green|color:\s*#16a34a|background-color:\s*#dcfce7/i.test(c.getAttribute('style') || '')
                }));

                const hasOptions = cellTexts.some(c => /^[A-D][.)]/.test(c.text));
                if (hasOptions) {
                    cellTexts.forEach(c => {
                        const optMatch = c.text.match(/^([A-D])[.)]\s*(.+)$/);
                        if (optMatch) {
                            const optId = optMatch[1].toUpperCase();
                            const optText = optMatch[2].trim();
                            currentOptions.push({
                                id: optId,
                                text: optText,
                                isCorrect: c.hasGreen
                            });
                        }
                    });
                    return;
                }
            }

            // Kiểm tra lựa chọn trắc nghiệm A., B., C., D. hoặc a), b), c), d) trong thẻ p / div
            const optMatch = text.match(/^([A-Da-d])\s*[.)\-]\s*(.+)$/);
            if (optMatch) {
                const optLetter = optMatch[1];
                const optText = optMatch[2].trim();
                const hasGreen = /color:\s*green|color:\s*#16a34a|background-color:\s*#dcfce7/i.test(el.getAttribute('style') || '');
                const hasStar = text.startsWith('*');

                const isLower = optLetter >= 'a' && optLetter <= 'd';
                const optId = isLower ? optLetter.toLowerCase() : optLetter.toUpperCase();

                if (isLower && currentQuestion.questionType !== 'true-false') {
                    currentQuestion.questionType = 'true-false';
                }

                currentOptions.push({
                    id: optId,
                    text: optText,
                    isCorrect: hasGreen || hasStar
                });
                return;
            }

            // Nếu không phải lựa chọn và câu hỏi chưa có đủ nội dung, gom thêm dòng văn bản vào stem
            if (currentOptions.length === 0 && !/^PHẦN/i.test(text)) {
                if (currentQuestion.content) {
                    currentQuestion.content += '\n' + text;
                } else {
                    currentQuestion.content = text;
                }
            }
        }
    });

    finalizeCurrentQuestion();

    return { headerInfo, questions };
};

/**
 * Trích xuất câu hỏi từ Plain Text / Markdown / Pasted Text
 */
export const parseQuestionsFromPlainText = (rawText: string): {
    headerInfo: ParsedExamResult['headerInfo'];
    questions: ExerciseQuestion[];
} => {
    const headerInfo: ParsedExamResult['headerInfo'] = {};
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. Quét tìm headerInfo từ các dòng đầu
    lines.slice(0, 15).forEach(line => {
        if (/^(?:UBND|SỞ|PHÒNG)\s+/i.test(line)) headerInfo.donVi = line;
        if (/TRƯỜNG\s+/i.test(line)) headerInfo.tenTruong = line;
        if (/KIỂM\s*TRA/i.test(line)) headerInfo.tenKyThi = line;
        if (/MÔN\s*:/i.test(line)) headerInfo.monHoc = line.replace(/MÔN\s*:\s*/i, '').trim();
        if (/Thời\s*gian\s*:/i.test(line)) headerInfo.thoiGian = line.replace(/Thời\s*gian\s*:\s*/i, '').trim();
        if (/Mã\s*đề\s*:/i.test(line)) headerInfo.maDe = line.replace(/Mã\s*đề\s*:\s*/i, '').trim();
    });

    // 2. Tách phần BẢNG ĐÁP ÁN nếu có ở cuối
    const answerKeyMap = new Map<number, string>();
    const tfAnswerKeyMap = new Map<number, { [key: string]: boolean }>();

    const answerKeyIdx = lines.findIndex(l => /^(?:BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM)/i.test(l));
    if (answerKeyIdx >= 0) {
        const answerLines = lines.slice(answerKeyIdx);
        answerLines.forEach(al => {
            // Dạng 1: 1.A, 2.B, 3.C... hoặc 1-A 2-B
            const mcPairs = al.matchAll(/(\d+)\s*[:.)\-]\s*([A-D])/gi);
            for (const m of mcPairs) {
                answerKeyMap.set(parseInt(m[1], 10), m[2].toUpperCase());
            }

            // Dạng 2: Câu 13: a-Đ, b-S, c-Đ, d-S hoặc A: Đúng; B: Đúng...
            const tfMatch = al.match(/Câu\s*(\d+)\s*[:.)\-]\s*(.+)/i);
            if (tfMatch) {
                const qNum = parseInt(tfMatch[1], 10);
                const tfRest = tfMatch[2];
                const parts = tfRest.matchAll(/([a-dA-D])\s*[:.)\-]\s*(Đúng|Sai|Đ|S)/gi);
                const tfObj: { [key: string]: boolean } = {};
                let count = 0;
                for (const p of parts) {
                    tfObj[p[1].toLowerCase()] = /Đúng|Đ/i.test(p[2]);
                    count++;
                }
                if (count >= 2) {
                    tfAnswerKeyMap.set(qNum, tfObj);
                }
            }
        });
    }

    // 3. Tách các khối câu hỏi bằng Regex
    const contentToParse = (answerKeyIdx >= 0 ? lines.slice(0, answerKeyIdx) : lines).join('\n');
    const questionBlocks = contentToParse
        .split(/(?=(?:^|\n)\s*(?:(?:\[[^\]]+\]\s*)*(?:Câu\s*\d+|Bài\s*\d+)[\s.:\)]|(?:Tình\s*huống\s*\d*[\s.:])))/i)
        .map(b => b.trim())
        .filter(Boolean);

    const questions: ExerciseQuestion[] = [];
    let scenarioText = '';

    questionBlocks.forEach((block, bIdx) => {
        const blockLines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (blockLines.length === 0) return;

        const firstLine = blockLines[0];

        // Nếu là khối Tình huống
        if (/^Tình\s*huống\s*\d*\s*[:.]/i.test(firstLine)) {
            scenarioText = firstLine.replace(/^Tình\s*huống\s*\d*\s*[:.]\s*/i, '').trim();
            return;
        }

        const cauMatch = firstLine.match(/^(?:Câu|Bài)\s*(\d+)[\s.:\-)]\s*(.+)?/i);
        // Nếu không khớp Câu hoặc Bài, và cũng không phải Tình huống thì bỏ qua (có thể là phần header bị sót)
        if (!cauMatch) {
            return;
        }
        const qNum = parseInt(cauMatch[1], 10);
        const rawRemainder = cauMatch[2] || '';

        const tagInfo = extractTagsFromQuestionStem(rawRemainder);
        let stem = tagInfo.cleanStem;
        if (scenarioText) {
            stem = `Tình huống: ${scenarioText}\n${stem}`;
            scenarioText = '';
        }

        const options: { id: string; text: string; isCorrect: boolean }[] = [];
        let isEssay = tagInfo.subtype === 'essay' || /(?:TL|Tự\s*luận)/i.test(firstLine);

        // Quét các dòng sau để tìm lựa chọn
        for (let i = 1; i < blockLines.length; i++) {
            const line = blockLines[i];
            const optMatch = line.match(/^(\*?)\s*([A-Da-d])\s*[.)\-]\s*(.+)$/);
            if (optMatch) {
                const hasStar = Boolean(optMatch[1]);
                const letter = optMatch[2];
                const optText = optMatch[3].trim();
                const isLower = letter >= 'a' && letter <= 'd';
                options.push({
                    id: isLower ? letter.toLowerCase() : letter.toUpperCase(),
                    text: optText,
                    isCorrect: hasStar
                });
            } else if (options.length === 0) {
                stem += '\n' + line;
            }
        }

        let qType: QuestionSubtype = tagInfo.subtype || (options.length > 0 ? (options.some(o => o.id >= 'a' && o.id <= 'd') ? 'true-false' : 'single-choice') : (isEssay ? 'essay' : 'single-choice'));
        let category: 'mc' | 'essay' = qType === 'essay' ? 'essay' : 'mc';
        let answer = '';

        // Ghép đáp án từ AnswerKeyMap
        if (qType === 'single-choice' || qType === 'multiple-answer') {
            const ansKey = answerKeyMap.get(qNum);
            if (ansKey && options.length > 0) {
                options.forEach(o => { o.isCorrect = o.id === ansKey; });
                answer = ansKey;
            } else if (options.some(o => o.isCorrect)) {
                const correctIds = options.filter(o => o.isCorrect).map(o => o.id);
                answer = correctIds.join(', ');
                if (correctIds.length > 1) qType = 'multiple-answer';
            }
        } else if (qType === 'true-false') {
            const tfKey = tfAnswerKeyMap.get(qNum);
            if (tfKey && options.length > 0) {
                options.forEach(o => {
                    const k = o.id.toLowerCase();
                    if (k in tfKey) o.isCorrect = tfKey[k];
                });
                answer = options.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            } else if (options.some(o => o.isCorrect)) {
                answer = options.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            }
        }

        const points = tagInfo.points || (qType === 'essay' ? 1.0 : 0.25);

        questions.push({
            id: `uploaded_${Date.now()}_${qNum}_${Math.random().toString(36).substring(2, 6)}`,
            category,
            questionType: qType,
            level: tagInfo.level,
            criteria: tagInfo.criteria,
            lesson: tagInfo.lesson,
            content: stem,
            options: options.length > 0 ? options : undefined,
            answer,
            points
        });
    });

    return { headerInfo, questions };
};

/**
 * Hàm phân tích chính: Nhận diện và chuyển đổi tệp đề thi tải lên thành cấu trúc chuẩn
 */
export const parseUploadedExam = (rawContent: string, fileName?: string): ParsedExamResult => {
    if (!rawContent || !rawContent.trim()) {
        return {
            success: false,
            error: 'Nội dung tệp rỗng hoặc không đọc được dữ liệu.',
            headerInfo: {},
            questions: [],
            stats: {
                totalQuestions: 0,
                singleChoiceCount: 0,
                multipleAnswerCount: 0,
                trueFalseCount: 0,
                shortAnswerCount: 0,
                essayCount: 0,
                questionsWithAnswer: 0,
                totalPoints: 0
            },
            sourceType: 'plain_text'
        };
    }

    // Xóa BOM (\ufeff) nếu có
    const content = rawContent.replace(/^\ufeff/, '').trim();

    // 1. Thử phân tích JSON (nếu người dùng tải lên file JSON đề thi hoặc ngân hàng)
    if (content.startsWith('{') || content.startsWith('[')) {
        try {
            const parsedJson = JSON.parse(content);
            let questions: ExerciseQuestion[] = [];
            let headerInfo: any = {};
            let variants: any[] | undefined = undefined;
            let matrixData: any = undefined;
            let title = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Đề thi tải lên';
            let grade = '8';

            if (parsedJson && Array.isArray(parsedJson.questions)) {
                // Định dạng SavedExamDossier hoặc { questions: [...] }
                questions = parsedJson.questions;
                headerInfo = parsedJson.headerInfo || {};
                variants = parsedJson.variants;
                matrixData = parsedJson.matrixData;
                if (parsedJson.title) title = parsedJson.title;
                if (parsedJson.grade) grade = String(parsedJson.grade);
            } else if (Array.isArray(parsedJson)) {
                if (parsedJson.length > 0 && parsedJson[0].questions && parsedJson[0].title) {
                    // Mảng dossier
                    const first = parsedJson[0];
                    questions = first.questions;
                    headerInfo = first.headerInfo || {};
                    variants = first.variants;
                    matrixData = first.matrixData;
                    title = first.title;
                    grade = String(first.grade || '8');
                } else {
                    // Mảng questions trực tiếp
                    questions = parsedJson;
                }
            } else if (parsedJson && parsedJson.exams && Array.isArray(parsedJson.exams) && parsedJson.exams.length > 0) {
                // Ngân hàng đề thi
                const first = parsedJson.exams[0];
                questions = first.questions;
                headerInfo = first.headerInfo || {};
                variants = first.variants;
                matrixData = first.matrixData;
                title = first.title;
                grade = String(first.grade || '8');
            }

            if (questions.length > 0) {
                return buildSuccessResult(questions, headerInfo, 'json', title, grade, variants, matrixData);
            }
        } catch {
            // Không phải JSON, tiếp tục xử lý HTML hoặc văn bản
        }
    }

    // 2. Thử phân tích HTML (Word .doc hoặc HTML export)
    const isHtml = /<html|<table|<div|<p\b/i.test(content);
    if (isHtml && typeof DOMParser !== 'undefined') {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const { headerInfo, questions } = parseQuestionsFromWordHtml(doc);

            if (questions.length > 0) {
                const title = headerInfo.tenKyThi || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Đề thi Word');
                const grade = detectGradeFromText(`${headerInfo.monHoc || ''} ${headerInfo.tenKyThi || ''} ${fileName || ''}`);
                return buildSuccessResult(questions, headerInfo, 'doc_html', title, grade);
            }
        } catch {
            // Tiếp tục fallback văn bản thường
        }
    }

    // 3. Fallback: Phân tích dạng văn bản có cấu trúc
    const { headerInfo, questions } = parseQuestionsFromPlainText(content);
    if (questions.length > 0) {
        const title = headerInfo.tenKyThi || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Đề thi nhập liệu');
        const grade = detectGradeFromText(`${headerInfo.monHoc || ''} ${headerInfo.tenKyThi || ''} ${fileName || ''}`);
        return buildSuccessResult(questions, headerInfo, 'plain_text', title, grade);
    }

    return {
        success: false,
        error: 'Không tìm thấy câu hỏi hợp lệ trong tệp tải lên. Vui lòng kiểm tra định dạng (Word .doc, JSON hoặc văn bản theo cú pháp Câu 1, Câu 2...).',
        headerInfo: {},
        questions: [],
        stats: {
            totalQuestions: 0,
            singleChoiceCount: 0,
            multipleAnswerCount: 0,
            trueFalseCount: 0,
            shortAnswerCount: 0,
            essayCount: 0,
            questionsWithAnswer: 0,
            totalPoints: 0
        },
        sourceType: 'plain_text'
    };
};

/**
 * Helper tạo đối tượng kết quả phân tích thành công
 */
const buildSuccessResult = (
    questions: ExerciseQuestion[],
    headerInfo: ParsedExamResult['headerInfo'],
    sourceType: ParsedExamResult['sourceType'],
    title: string,
    grade: string,
    variants?: any[],
    matrixData?: any
): ParsedExamResult => {
    // Chuẩn hóa điểm
    const singleChoiceCount = questions.filter(q => getQuestionSubtype(q) === 'single-choice').length;
    const multipleAnswerCount = questions.filter(q => getQuestionSubtype(q) === 'multiple-answer').length;
    const trueFalseCount = questions.filter(q => getQuestionSubtype(q) === 'true-false').length;
    const shortAnswerCount = questions.filter(q => getQuestionSubtype(q) === 'short-answer').length;
    const essayCount = questions.filter(q => getQuestionSubtype(q) === 'essay').length;

    let questionsWithAnswer = 0;
    let totalPoints = 0;

    questions.forEach(q => {
        if (q.answer && q.answer.trim()) questionsWithAnswer++;
        totalPoints += q.points || (q.category === 'essay' ? 1.0 : 0.25);
    });

    return {
        success: true,
        title,
        grade,
        headerInfo,
        questions,
        variants,
        matrixData,
        stats: {
            totalQuestions: questions.length,
            singleChoiceCount,
            multipleAnswerCount,
            trueFalseCount,
            shortAnswerCount,
            essayCount,
            questionsWithAnswer,
            totalPoints: Math.round(totalPoints * 100) / 100
        },
        sourceType
    };
};
