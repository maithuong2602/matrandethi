import { ExerciseQuestion, QuestionSubtype, getQuestionSubtype, getQuestionSubtypeLabel } from '../types';
import { parseStructuredTextQuestions, callGeminiWithFailover, cleanTextbookReferences } from './geminiService';
import { generateOfflineQuestions } from './offlineQuestionGenerator';

export interface BankQuestion extends ExerciseQuestion {
    lesson: string;
    points?: number;
    uniqueId?: number;
}

/**
 * Định dạng nội dung phương án và đáp án của một câu hỏi gốc thành chuỗi văn bản rõ ràng
 */
export const formatQuestionOptionsAndAnswer = (q: ExerciseQuestion | BankQuestion): string => {
    const subtype = getQuestionSubtype(q);
    const lines: string[] = [];

    if (subtype === 'true-false') {
        if (Array.isArray(q.options) && q.options.some((o: any) => ['a', 'b', 'c', 'd'].includes(String(o.id || '').toLowerCase()))) {
            q.options.forEach((opt: any, i: number) => {
                const subId = opt.id || ['a', 'b', 'c', 'd'][i];
                lines.push(`  ${subId}) ${opt.text} [${opt.isCorrect ? 'Đúng' : 'Sai'}]`);
            });
            const ansStr = q.options.map((o: any) => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            lines.push(`  Đáp án: ${ansStr}`);
        } else {
            lines.push(`  Đáp án: ${q.answer || (q.options?.find(o => o.isCorrect)?.id === 'Sai' ? 'Sai' : 'Đúng')}`);
        }
    } else if (subtype === 'essay') {
        if (q.answer) {
            lines.push(`  Hướng dẫn chấm / Barem:`);
            const ansLines = q.answer.split('\n');
            ansLines.forEach(l => lines.push(`    ${l}`));
        }
    } else if (subtype === 'short-answer') {
        lines.push(`  Đáp án ngắn: ${q.answer || ''}`);
    } else {
        // single-choice hoặc multiple-answer
        if (Array.isArray(q.options) && q.options.length > 0) {
            q.options.forEach((opt: any, i: number) => {
                const optId = opt.id || String.fromCharCode(65 + i);
                const mark = opt.isCorrect ? '*' : '';
                lines.push(`  ${mark}${optId}. ${opt.text}`);
            });
            const correctIds = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ');
            lines.push(`  Đáp án: ${correctIds || q.answer || ''}`);
        } else if (q.answer) {
            lines.push(`  Đáp án: ${q.answer}`);
        }
    }

    return lines.join('\n');
};

/**
 * Sinh Prompt chuẩn sư phạm cho 01 câu hỏi đơn lẻ để giáo viên copy sang AI khác
 * (ChatGPT, Claude, Gemini, DeepSeek...) hoặc gọi AI nội bộ.
 * Chỉ thị AI giữ nguyên vị trí, mức độ, loại câu, YCCĐ và CHỈ ĐỔI NGỮ CẢNH với nguồn tài liệu được cung cấp.
 */
export const buildSimilarQuestionPrompt = (
    q: ExerciseQuestion | BankQuestion,
    index: number,
    customSourceContext?: string,
    grade?: string
): string => {
    const subtype = getQuestionSubtype(q);
    const subtypeLabel = getQuestionSubtypeLabel(subtype);
    const resolvedGrade = q.grade || grade || '8';
    const pointsStr = (q.points ?? (subtype === 'essay' ? 1.0 : 0.25)).toFixed(2).replace('.', ',');

    let typeSpecificRule = '';
    let sampleFormat = '';

    switch (subtype) {
        case 'true-false':
            typeSpecificRule = `- BẮT BUỘC DẠNG TRẮC NGHIỆM ĐÚNG/SAI THEO TÌNH HUỐNG:
  + Gồm 1 Tình huống thực tế ngắn gọn, súc tích (khoảng 2-4 dòng), tự chứa đầy đủ dữ kiện độc lập.
  + Kèm ĐÚNG 4 phát biểu a), b), c), d) xoay quanh tình huống đó.
  + PHÂN BỐ ĐÚNG/SAI LINH HOẠT, TUYỆT ĐỐI KHÔNG RẬP KHUÔN 2 ĐÚNG 2 SAI:
    Có thể thiết kế: 3 phát biểu Sai - 1 phát biểu Đúng (3S - 1Đ); hoặc 3 phát biểu Đúng - 1 phát biểu Sai (3Đ - 1S); hoặc 2 Đúng - 2 Sai với vị trí đảo ngẫu nhiên.
    Luôn đảm bảo có cả phát biểu Đúng và phát biểu Sai (tối thiểu 1 Đúng, tối thiểu 1 Sai).`;
            sampleFormat = `Câu ${index + 1}: [Đúng/Sai] [${q.level}] Tình huống: <Mô tả tình huống thực tế mới ngắn gọn>
Xác định tính đúng hoặc sai của các phát biểu sau:
a) <Phát biểu a mới> [Đúng hoặc Sai]
b) <Phát biểu b mới> [Đúng hoặc Sai]
c) <Phát biểu c mới> [Đúng hoặc Sai]
d) <Phát biểu d mới> [Đúng hoặc Sai]
Đáp án: a-Đ, b-S, c-Đ, d-S (hoặc tỷ lệ 3Đ-1S, 3S-1Đ, 2Đ-2S tương ứng)`;
            break;

        case 'multiple-answer':
            typeSpecificRule = `- BẮT BUỘC DẠNG TRẮC NGHIỆM NHIỀU ĐÁP ÁN ĐÚNG:
  + Gồm 1 câu hỏi dẫn dắt ngắn gọn, rõ ràng.
  + ĐÚNG 4 lựa chọn A, B, C, D. Mọi lựa chọn phải kết thúc bằng dấu chấm (.).
  + PHÂN BỐ SỐ ĐÁP ÁN ĐÚNG: Thiết kế ĐÚNG 2 hoặc ĐÚNG 3 đáp án đúng trong 4 phương án A, B, C, D (ví dụ: A và C đúng; hoặc B, C, D đúng).
  + Đánh dấu dấu sao (*) trước chữ cái của các đáp án đúng (ví dụ: *A. ... và *C. ...).`;
            sampleFormat = `Câu ${index + 1}: [Nhiều đáp án] [${q.level}] <Nội dung câu hỏi mới>
*A. <Lựa chọn A đúng>.
B. <Lựa chọn B sai>.
*C. <Lựa chọn C đúng>.
D. <Lựa chọn D sai>.
Đáp án: A, C`;
            break;

        case 'essay':
            typeSpecificRule = `- BẮT BUỘC DẠNG TỰ LUẬN 4 Ý (a, b, c, d) KÈM HƯỚNG DẪN CHẤM BẢNG 2 CỘT:
  + Dòng đầu tiên: Nêu bối cảnh / đề bài bài toán tự luận thực tế ngắn gọn.
  + ĐÚNG 4 ý hỏi đánh dấu: a) ..., b) ..., c) ..., d) ...
  + Hướng dẫn chấm: BẮT BUỘC gồm ĐÚNG 4 dòng tương ứng a), b), c), d) kèm biểu điểm chi tiết (mỗi ý 0,25 điểm, tổng 1,0 điểm).`;
            sampleFormat = `Câu ${index + 1}: [Tự luận] [${q.level}] <Bối cảnh đề bài mới>
a) <Yêu cầu ý a>
b) <Yêu cầu ý b>
c) <Yêu cầu ý c>
d) <Yêu cầu ý d>
Hướng dẫn chấm:
a) <Đáp án chuẩn ý a> - 0,25 điểm.
b) <Đáp án chuẩn ý b> - 0,25 điểm.
c) <Đáp án chuẩn ý c> - 0,25 điểm.
d) <Đáp án chuẩn ý d> - 0,25 điểm.`;
            break;

        case 'short-answer':
            typeSpecificRule = `- BẮT BUỘC DẠNG TRẢ LỜI NGẮN:
  + Câu hỏi ngắn gọn, yêu cầu tính toán, xác định giá trị, đếm số lượng hoặc nêu thuật ngữ then chốt.
  + Đáp án là một số hoặc cụm từ ngắn gọn chính xác.`;
            sampleFormat = `Câu ${index + 1}: [Trả lời ngắn] [${q.level}] <Nội dung câu hỏi mới>
Đáp án: <Giá trị số hoặc từ khóa ngắn gọn>`;
            break;

        default: // single-choice
            typeSpecificRule = `- BẮT BUỘC DẠNG TRẮC NGHIỆM 1 ĐÁP ÁN ĐÚNG:
  + Câu hỏi ngắn gọn, trực diện, không dài dòng nhiều chữ.
  + ĐÚNG 4 lựa chọn A, B, C, D - DUY NHẤT 1 đáp án đúng. Mọi lựa chọn kết thúc bằng dấu chấm (.).
  + Đánh dấu dấu sao (*) trước phương án đúng duy nhất.`;
            sampleFormat = `Câu ${index + 1}: [Trắc nghiệm 1 đáp án] [${q.level}] <Nội dung câu hỏi mới>
A. <Phương án A>.
*B. <Phương án B đúng>.
C. <Phương án C>.
D. <Phương án D>.
Đáp án: B`;
            break;
    }

    const contextSection = customSourceContext && customSourceContext.trim()
        ? `════════════════════════════════════════════════════════════════════════════════
NGUỒN TÀI LIỆU / NGỮ CẢNH CUNG CẤP (BẮT BUỘC KHAI THÁC LÀM NGỮ CẢNH CÂU MỚI):
${customSourceContext.trim()}
════════════════════════════════════════════════════════════════════════════════
LƯU Ý QUAN TRỌNG: Hãy sử dụng các sự kiện, thuật ngữ, số liệu, bài toán trong nguồn tài liệu trên để làm bối cảnh/ngữ cảnh mới cho câu hỏi. KHÔNG phát minh ra ngữ cảnh nằm ngoài tài liệu nếu tài liệu đã có đủ thông tin.`
        : `LƯU Ý: Vì giáo viên không cung cấp tài liệu nguồn riêng, hãy tự sáng tạo ngữ cảnh/tình huống thực tế đời sống mới lạ, gần gũi với học sinh THCS phù hợp với bài học "${q.lesson}".`;

    return `Bạn là một Chuyên gia khảo thí và sư phạm môn Tin học theo chương trình Giáo dục phổ thông 2018 (GDPT 2018).

NHIỆM VỤ:
Hãy tạo 01 CÂU HỎI MỚI TƯƠNG ĐƯƠNG (câu hỏi song song / biến thể bối cảnh) cho Câu ${index + 1} của đề thi môn Tin học Lớp ${resolvedGrade}.

THÔNG TIN CÂU HỎI GỐC CẦN BÁM THEO:
- Vị trí trong đề: Câu ${index + 1}
- Thể loại: ${subtypeLabel}
- Mức độ nhận thức: ${q.level} (NB: Nhận biết, TH: Thông hiểu, VD: Vận dụng, VDC: Vận dụng cao)
- Bài học: "${q.lesson}"
- Yêu cầu cần đạt (YCCĐ): "${q.criteria || 'Chuẩn kiến thức bài học'}"
- Thang điểm: ${pointsStr} điểm

NỘI DUNG CÂU HỎI GỐC:
${q.content}
${formatQuestionOptionsAndAnswer(q)}

${contextSection}

QUY TẮC SƯ PHẠM CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
1. GIỮ NGUYÊN HOÀN TOÀN:
   - Thể loại câu hỏi: "${subtypeLabel}".
   - Mức độ nhận thức: "${q.level}".
   - Chuẩn Yêu cầu cần đạt (YCCĐ): "${q.criteria || q.lesson}".
   - Khối lớp: Tin học ${resolvedGrade}.
2. CHỈ ĐỔI NGỮ CẢNH (CONTEXT):
   - Thay đổi bối cảnh, tình huống, bài toán, số liệu, tên nhân vật, thiết bị, phần mềm hoặc dữ kiện theo nguồn tài liệu cung cấp ở trên.
   - Nội dung câu hỏi và các phương án phải ngắn gọn, cô đọng, đi thẳng vào vấn đề. TUYỆT ĐỐI KHÔNG viết dài dòng lê thê nhiều chữ gây quá tải cho học sinh THCS.
3. TUYỆT ĐỐI KHÔNG THAM CHIẾU VỊ TRÍ SGK:
   - CẤM các cụm từ: "Trong bảng...", "Ở Hình X.Y...", "Trong SGK...", "Theo bài học...".
   - Câu hỏi phải hoàn toàn độc lập (self-contained), học sinh làm bài không có sách giáo khoa trước mặt.
${typeSpecificRule}

ĐỊNH DẠNG ĐẦU RA YÊU CẦU (BẮT BUỘC TRẢ VỀ THEO CÚ PHÁP CHUẨN DƯỚI ĐÂY ĐỂ PHẦN MỀM TỰ ĐỘNG PHÂN TÍCH VÀ THAY THẾ VÀO ĐỀ):
${sampleFormat}
`;
};

/**
 * Sinh Prompt cho TOÀN BỘ ĐỀ THI (hoặc phạm vi câu hỏi được chọn) để tạo đề tương tự hàng loạt
 * Giữ nguyên 100% vị trí, thứ tự câu hỏi từ Câu 1..N, thể loại và mức độ.
 */
export const buildBulkSimilarExamPrompt = (
    questions: BankQuestion[],
    customSourceContext?: string,
    scopeFilter: 'all' | 'NB' | 'TH' | 'VD' | 'VDC' | 'mc' | 'essay' = 'all',
    grade?: string
): string => {
    const resolvedGrade = grade || '8';

    // Lọc theo scopeFilter nếu có
    const filteredIndexedQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q }) => {
        if (scopeFilter === 'all') return true;
        if (['NB', 'TH', 'VD', 'VDC'].includes(scopeFilter)) return q.level === scopeFilter;
        if (scopeFilter === 'mc') return q.category !== 'essay';
        if (scopeFilter === 'essay') return q.category === 'essay';
        return true;
    });

    const contextSection = customSourceContext && customSourceContext.trim()
        ? `════════════════════════════════════════════════════════════════════════════════
NGUỒN TÀI LIỆU / CHỦ ĐỀ / NGỮ CẢNH MỚI CHO TOÀN ĐỀ (BẮT BUỘC KHAI THÁC):
${customSourceContext.trim()}
════════════════════════════════════════════════════════════════════════════════
LƯU Ý ĐẶC BIỆT: Hãy bám sát nguồn tài liệu trên để làm ngữ cảnh mới cho từng câu hỏi tương ứng trong đề thi.`
        : `LƯU Ý: Không có nguồn tài liệu riêng, hãy sáng tạo ngữ cảnh/tình huống thực tế đời sống mới lạ, gần gũi cho từng câu theo đúng chuẩn bài học.`;

    const questionsListText = filteredIndexedQuestions.map(({ q, idx }) => {
        const subtype = getQuestionSubtype(q);
        const subtypeLabel = getQuestionSubtypeLabel(subtype);
        const pts = (q.points ?? (subtype === 'essay' ? 1.0 : 0.25)).toFixed(2).replace('.', ',');

        return `--------------------------------------------------
[CÂU ${idx + 1}] (${pts} điểm)
- Thể loại: ${subtypeLabel}
- Mức độ: ${q.level}
- Bài học: "${q.lesson}"
- Yêu cầu cần đạt: "${q.criteria || 'Chuẩn kiến thức'}"
- Nội dung gốc:
${q.content}
${formatQuestionOptionsAndAnswer(q)}`;
    }).join('\n\n');

    return `Bạn là một Chuyên gia khảo thí và sư phạm môn Tin học theo chương trình Giáo dục phổ thông 2018 (GDPT 2018).

NHIỆM VỤ:
Hãy tạo một ĐỀ THI MỚI TƯƠNG ĐƯƠNG HÀNG LOẠT (Đề hoán vị ngữ cảnh / Đề song song) cho ${filteredIndexedQuestions.length} câu hỏi môn Tin học Lớp ${resolvedGrade} dưới đây.

${contextSection}

QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
1. GIỮ NGUYÊN 100% VỊ TRÍ VÀ THỨ TỰ CÂU HỎI:
   - Giữ nguyên số thứ tự từng câu (ví dụ: Câu 1 mới tương ứng Câu 1 gốc, Câu 2 mới tương ứng Câu 2 gốc, v.v.).
   - Tuyệt đối không nhảy cóc, không gộp câu, không bỏ sót bất kỳ câu nào.
2. GIỮ NGUYÊN HOÀN TOÀN THỂ LOẠI, MỨC ĐỘ VÀ YÊU CẦU CẦN ĐẠT CỦA TỪNG CÂU:
   - Nếu câu gốc là [Trắc nghiệm 1 đáp án] -> Tạo câu mới [Trắc nghiệm 1 đáp án] (4 lựa chọn A, B, C, D - duy nhất 1 đáp án đúng).
   - Nếu câu gốc là [Đúng/Sai] theo tình huống -> Tạo tình huống mới + 4 phát biểu a, b, c, d (tỷ lệ 3Đ-1S, 3S-1Đ hoặc 2Đ-2S linh hoạt).
   - Nếu câu gốc là [Nhiều đáp án] -> Tạo câu mới có 4 lựa chọn A, B, C, D với ĐÚNG 2 hoặc 3 đáp án đúng.
   - Nếu câu gốc là [Tự luận] -> Tạo câu tự luận mới gồm lời dẫn + 4 ý a, b, c, d kèm hướng dẫn chấm 4 ý chi tiết.
   - Giữ nguyên mức độ nhận thức (NB/TH/VD/VDC) và bài học của câu gốc.
3. CHỈ ĐỔI NGỮ CẢNH:
   - Thay đổi số liệu, tên biến, đối tượng, bối cảnh thực tế theo nguồn tài liệu cung cấp.
   - Câu hỏi ngắn gọn, trực diện, không dài dòng. Không tham chiếu SGK ("Trong SGK...", "Ở Hình X.Y...").

DANH SÁCH ${filteredIndexedQuestions.length} CÂU HỎI GỐC CẦN TẠO TƯƠNG TỰ:
${questionsListText}

ĐỊNH DẠNG ĐẦU RA YÊU CẦU (BẮT BUỘC TRẢ VỀ ĐỦ TỪNG CÂU THEO CÚ PHÁP CHUẨN SAU ĐỂ HỆ THỐNG PARSE VÀ THAY THẾ TỰ ĐỘNG VÀO ĐÚNG VỊ TRÍ ĐỀ THI):

Câu 1: [Trắc nghiệm 1 đáp án] [NB] <Nội dung câu 1...>
A. <Phương án A>.
*B. <Phương án B đúng>.
C. <Phương án C>.
D. <Phương án D>.
Đáp án: B

Câu 2: [Đúng/Sai] [TH] Tình huống: <Mô tả tình huống câu 2...>
Xác định tính đúng hoặc sai của các phát biểu sau:
a) <Phát biểu a> [Đúng]
b) <Phát biểu b> [Sai]
c) <Phát biểu c> [Đúng]
d) <Phát biểu d> [Sai]
Đáp án: a-Đ, b-S, c-Đ, d-S

(Tiếp tục lần lượt đến hết tất cả các câu theo danh sách ở trên...)
`;
};

/**
 * Phân tích văn bản kết quả từ AI khác dán vào, nhận diện từng câu hỏi
 * và thay thế vào ĐÚNG VỊ TRÍ trong danh sách câu hỏi đề thi (giữ nguyên vị trí 100%, giữ nguyên thang điểm).
 */
export const parseAndMapBulkSimilarQuestions = (
    rawText: string,
    currentQuestions: BankQuestion[],
    scopeIndices?: number[]
): {
    updatedQuestions: BankQuestion[];
    appliedCount: number;
    details: string[];
} => {
    if (!rawText || !rawText.trim() || !Array.isArray(currentQuestions) || currentQuestions.length === 0) {
        return { updatedQuestions: currentQuestions, appliedCount: 0, details: ['Văn bản rỗng hoặc danh sách câu hỏi không hợp lệ.'] };
    }

    // 1. Phân tích các khối câu hỏi trong văn bản
    // Cắt block theo regex "Câu \d+:" hoặc parseStructuredTextQuestions
    const parsedList = parseStructuredTextQuestions(rawText);

    if (parsedList.length === 0) {
        return { updatedQuestions: currentQuestions, appliedCount: 0, details: ['Không thể nhận diện câu hỏi nào từ văn bản đã dán. Vui lòng kiểm tra lại định dạng câu hỏi.'] };
    }

    // Trích xuất các nhãn "Câu X" xuất hiện trong văn bản gốc để xác định số thứ tự tường minh
    const questionHeaderMatches: { num: number; rawBlock: string }[] = [];
    const blockRegex = /(?:^|\n)\s*(?:(?:\[[^\]]*\]\s*)*)(?:Câu|Bài)\s*(\d+)\s*[:.]/gi;
    let match: RegExpExecArray | null;
    const indices: { num: number; index: number }[] = [];

    while ((match = blockRegex.exec(rawText)) !== null) {
        indices.push({
            num: parseInt(match[1], 10),
            index: match.index
        });
    }

    const updatedQuestions = [...currentQuestions];
    let appliedCount = 0;
    const details: string[] = [];

    // Nếu văn bản có chứa tường minh các số thứ tự Câu X (ví dụ: Câu 1, Câu 2...)
    if (indices.length >= parsedList.length && indices.length > 0) {
        parsedList.forEach((parsedQ, pIdx) => {
            const targetNum = indices[pIdx]?.num;
            if (targetNum !== undefined && targetNum >= 1 && targetNum <= updatedQuestions.length) {
                const targetIdx = targetNum - 1;
                const oldQ = updatedQuestions[targetIdx];

                const mergedQ: BankQuestion = {
                    ...oldQ,
                    content: parsedQ.content || oldQ.content,
                    options: parsedQ.options && parsedQ.options.length > 0 ? parsedQ.options : oldQ.options,
                    answer: parsedQ.answer || oldQ.answer,
                    level: parsedQ.level || oldQ.level,
                    criteria: parsedQ.criteria || oldQ.criteria,
                    lesson: parsedQ.lesson || oldQ.lesson,
                    category: parsedQ.category || oldQ.category,
                    questionType: parsedQ.questionType || oldQ.questionType,
                    mcType: parsedQ.mcType || oldQ.mcType,
                    points: oldQ.points, // Giữ nguyên 100% thang điểm
                    uniqueId: Math.random() // Unique ID mới để React render lại mượt mà
                };

                updatedQuestions[targetIdx] = mergedQ;
                appliedCount++;
                details.push(`Câu ${targetNum}: Đã thay thế thành công vào đúng vị trí.`);
            } else if (scopeIndices && scopeIndices[pIdx] !== undefined) {
                const targetIdx = scopeIndices[pIdx];
                if (targetIdx >= 0 && targetIdx < updatedQuestions.length) {
                    const oldQ = updatedQuestions[targetIdx];
                    const mergedQ: BankQuestion = {
                        ...oldQ,
                        content: parsedQ.content || oldQ.content,
                        options: parsedQ.options && parsedQ.options.length > 0 ? parsedQ.options : oldQ.options,
                        answer: parsedQ.answer || oldQ.answer,
                        level: parsedQ.level || oldQ.level,
                        criteria: parsedQ.criteria || oldQ.criteria,
                        lesson: parsedQ.lesson || oldQ.lesson,
                        category: parsedQ.category || oldQ.category,
                        questionType: parsedQ.questionType || oldQ.questionType,
                        mcType: parsedQ.mcType || oldQ.mcType,
                        points: oldQ.points,
                        uniqueId: Math.random()
                    };
                    updatedQuestions[targetIdx] = mergedQ;
                    appliedCount++;
                    details.push(`Câu ${targetIdx + 1}: Đã thay thế theo thứ tự danh mục.`);
                }
            }
        });
    } else {
        // Áp dụng tuần tự theo danh sách chỉ số (scopeIndices hoặc từ đầu mảng)
        const targetList = scopeIndices && scopeIndices.length > 0
            ? scopeIndices
            : currentQuestions.map((_, i) => i);

        parsedList.forEach((parsedQ, pIdx) => {
            if (pIdx < targetList.length) {
                const targetIdx = targetList[pIdx];
                const oldQ = updatedQuestions[targetIdx];

                const mergedQ: BankQuestion = {
                    ...oldQ,
                    content: parsedQ.content || oldQ.content,
                    options: parsedQ.options && parsedQ.options.length > 0 ? parsedQ.options : oldQ.options,
                    answer: parsedQ.answer || oldQ.answer,
                    level: parsedQ.level || oldQ.level,
                    criteria: parsedQ.criteria || oldQ.criteria,
                    lesson: parsedQ.lesson || oldQ.lesson,
                    category: parsedQ.category || oldQ.category,
                    questionType: parsedQ.questionType || oldQ.questionType,
                    mcType: parsedQ.mcType || oldQ.mcType,
                    points: oldQ.points,
                    uniqueId: Math.random()
                };

                updatedQuestions[targetIdx] = mergedQ;
                appliedCount++;
                details.push(`Câu ${targetIdx + 1}: Đã thay thế thành công.`);
            }
        });
    }

    return { updatedQuestions, appliedCount, details };
};

/**
 * Sinh câu hỏi tương tự trực tiếp bằng AI (Gemini hoặc Offline Engine dự phòng)
 */
export const generateSimilarQuestionDirectAI = async (
    q: BankQuestion,
    index: number,
    customSourceContext?: string,
    grade?: string
): Promise<BankQuestion> => {
    const prompt = buildSimilarQuestionPrompt(q, index, customSourceContext, grade);
    const subtype = getQuestionSubtype(q);
    const resolvedGrade = q.grade || grade || '8';

    return callGeminiWithFailover(
        async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    temperature: 0.35,
                    maxOutputTokens: 2048
                }
            });

            const text = response.text || '';
            const parsedList = parseStructuredTextQuestions(text);
            if (parsedList.length > 0) {
                const item = parsedList[0];
                return {
                    ...q,
                    content: cleanTextbookReferences(item.content),
                    options: Array.isArray(item.options) ? item.options.map((o: any) => ({ ...o, text: cleanTextbookReferences(o.text) })) : q.options,
                    answer: item.answer || q.answer,
                    points: q.points,
                    uniqueId: Math.random()
                };
            }
            throw new Error('AI không trả về đúng cấu trúc câu hỏi.');
        },
        () => {
            // Offline fallback
            const qs = generateOfflineQuestions(resolvedGrade, q.lesson, q.level, q.criteria || '', 1, subtype === 'true-false' ? 'true-false' : subtype === 'multiple-answer' ? 'multiple-answer' : subtype === 'essay' ? 'essay' : 'multiple-choice');
            const fallbackQ = qs[0] || {};
            return {
                ...q,
                content: cleanTextbookReferences(fallbackQ.content || q.content),
                options: Array.isArray(fallbackQ.options) ? fallbackQ.options.map((o: any) => ({ ...o, text: cleanTextbookReferences(o.text) })) : q.options,
                answer: fallbackQ.answer || q.answer,
                points: q.points,
                uniqueId: Math.random()
            };
        }
    );
};
