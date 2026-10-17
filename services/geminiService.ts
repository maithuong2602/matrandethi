import { GoogleGenAI, Type } from "@google/genai";
import { ExamReviewResult } from "../types";
import { 
    getActiveApiKey, 
    rotateToNextAvailableKey, 
    saveApiKeyPool, 
    isOfflineFallbackEnabled, 
    FALLBACK_MODELS 
} from "./apiKeyService";
import { 
    generateOfflineQuestions, 
    generateOfflineEssayRubric, 
    generateOfflineExamReview 
} from "./offlineQuestionGenerator";

export const getCustomApiKey = (): string => {
    return getActiveApiKey();
};

export const setCustomApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        const trimmed = key.trim();
        localStorage.setItem('gemini_api_key', trimmed);
        if (trimmed) {
            saveApiKeyPool([trimmed]);
        }
    }
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const getGeminiModel = (): string => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gemini_model');
        if (stored) return stored;
    }
    return DEFAULT_GEMINI_MODEL;
};

const getGenAIClientWithKey = (explicitKey?: string) => {
    const apiKey = explicitKey || getActiveApiKey();
    return new GoogleGenAI({ apiKey });
};

/**
 * HÀM THỰC THI FAIL-SAFE CHO MỌI CUỘC GỌI AI:
 * 1. Tự động thử nghiệm các API key trong danh sách xoay vòng nếu gặp lỗi 429 hoặc 401/403.
 * 2. Tự động hạ bậc (fallback) sang các model khả dụng khác nếu model chính gặp sự cố.
 * 3. Nếu toàn bộ key lỗi, hết hạn ngạch hoặc không có Internet: Tự động kích hoạt bộ sinh ngoại tuyến (Offline Engine).
 * => KHÔNG BAO GIỜ LÀM GIÁN ĐOẠN HOẶC BÁO LỖI KHÔNG TẠO ĐƯỢC CÂU HỎI.
 */
async function callGeminiWithFailover<T>(
    operation: (ai: GoogleGenAI, model: string) => Promise<T>,
    fallbackAction: () => T
): Promise<T> {
    const currentKey = getActiveApiKey();
    
    // Nếu chưa cấu hình bất kỳ API Key nào
    if (!currentKey || !currentKey.trim()) {
        if (isOfflineFallbackEnabled()) {
            console.info('[geminiService] Chưa có API key. Kích hoạt Bộ sinh câu hỏi Sư phạm Thông minh (Offline Fallback Engine).');
            return fallbackAction();
        }
        throw new Error('Chưa cấu hình API Key và chế độ Offline Fallback đã bị tắt.');
    }

    const currentModel = getGeminiModel();
    const modelsToTry = [currentModel, ...FALLBACK_MODELS.filter(m => m !== currentModel)];
    let activeKey = currentKey;

    for (const model of modelsToTry) {
        try {
            const ai = getGenAIClientWithKey(activeKey);
            return await operation(ai, model);
        } catch (err: any) {
            const errMsg = err?.message || String(err);
            console.warn(`[geminiService] Model ${model} gặp lỗi:`, errMsg);

            // Kiểm tra lỗi hạn ngạch (429) hoặc lỗi xác thực (401, 403) để xoay key
            const isQuotaError = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota');
            const isAuthError = errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('API_KEY_INVALID');

            if (isQuotaError || isAuthError) {
                const nextKey = rotateToNextAvailableKey(activeKey, isQuotaError ? 'rate_limited' : 'invalid');
                if (nextKey && nextKey !== activeKey) {
                    activeKey = nextKey;
                    console.info('[geminiService] Đã xoay sang API Key dự phòng khả dụng tiếp theo.');
                    try {
                        const aiNext = getGenAIClientWithKey(activeKey);
                        return await operation(aiNext, model);
                    } catch (retryErr) {
                        console.warn('[geminiService] Key dự phòng cũng gặp sự cố, tiếp tục kiểm tra...', retryErr);
                    }
                }
            }
        }
    }

    // Nếu tất cả API key và model đều không phản hồi thành công
    if (isOfflineFallbackEnabled()) {
        console.warn('[geminiService] Tất cả API Key/Model đều không khả dụng. Chuyển sang Bộ sinh Dự phòng Thông minh (Offline Engine).');
        return fallbackAction();
    }

    throw new Error('Lỗi kết nối máy chủ AI và chế độ dự phòng đã tắt.');
}

export const generateQuestion = async (topic: string, level: string): Promise<string> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: `Create a multiple choice question about "${topic}" at level "${level}" in Vietnamese. 
                REQUIREMENTS: 
                1. Every option text MUST end with a period (.). 
                2. Distractors must have high noise and be highly plausible to increase difficulty.
                Format as JSON with fields: question, options (array), correctIndex.`,
                config: {
                    responseMimeType: "application/json"
                }
            });
            return response.text || "{}";
        },
        () => {
            const fallback = generateOfflineQuestions('7', topic, level, topic, 1, 'multiple-choice')[0];
            return JSON.stringify({
                question: fallback.content,
                options: fallback.options.map((o: any) => o.text),
                correctIndex: fallback.options.findIndex((o: any) => o.isCorrect)
            });
        }
    );
};

export const standardizeQuestionText = async (rawText: string): Promise<string> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: `Standardize the following raw question text into a structured JSON format with 'question', 'options', 'correctAnswer'.
                IMPORTANT: Ensure every option text ends with a period (.). 
                Raw Text:\n${rawText}`,
                config: {
                    responseMimeType: "application/json"
                }
            });
            return response.text || "{}";
        },
        () => {
            return JSON.stringify({
                question: rawText.replace(/^[A-D\d\.\:\s]+/, ''),
                options: ["Phương án A.", "Phương án B.", "Phương án C.", "Phương án D."],
                correctAnswer: "A"
            });
        }
    );
};

export const parseQuestionsWithAI = async (
    text: string, 
    grade?: string, 
    lesson?: string,
    pdfBase64?: string
): Promise<any[]> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            let contextInstruction = "";
            if (grade && lesson) {
                contextInstruction = `
                CONTEXT CONSTRAINT:
                - Target Grade: ${grade}
                - Target Lesson/Topic: "${lesson}"
                - TASK: Analyze the raw text or attached PDF and EXTRACT ONLY questions that are semantically relevant to the content of "${lesson}".
                - FILTERING: If a question clearly belongs to a different lesson, chapter, or subject, DO NOT include it in the output array. Ignore header texts, introduction texts, or unrelated footer texts.
                `;
            }

            const prompt = `You are an expert exam editor. Parse the following questions (from provided text or attached PDF document) into a structured JSON array.
            
            ${contextInstruction}

            The questions may contain:
            1. Multiple Choice Questions (4 options A, B, C, D with single correct answer).
            2. True/False Questions (Phần II - 4 statements a, b, c, d where each is evaluated as True or False).
            3. Short Answer Questions (Phần III - Trả lời ngắn, no choices, student writes answer).
            4. Essay Questions (Tự luận).
            
            Return a JSON array where each object has the following properties:
            - "category": "mc" or "essay".
            - "questionType": "multiple-choice" | "multiple-answer" | "true-false" | "short-answer" | "essay".
            - "content": The main question text/stem.
            - "level": "NB" (Nhận biết), "TH" (Thông hiểu), "VD" (Vận dụng), or "VDC" (Vận dụng cao).
            - "criteria": The criteria code (e.g. "1.1", "2.3") if present at the start of the question numbering, otherwise empty string "".
            - "options": For multiple-choice or true-false: Array of objects with "id" ("A","B","C","D" for mc; "a","b","c","d" for true-false), "text" (MUST end with period "."), and "isCorrect" (boolean). For short-answer and essay, options should be empty array [].
            - "answer": For short-answer, fill-in-the-blank, or essay: the answer string. For single-choice mc: the letter ID (e.g. "A").
            - "mcType": "multiple-choice", "multiple-answer", or "fill-blank".

            ${text ? `Raw Text to Parse:\n${text}` : 'Please extract all questions directly from the attached PDF document.'}
            `;

            const contents: any[] = [];
            if (pdfBase64) {
                const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
                contents.push({
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: cleanBase64
                    }
                });
            }
            contents.push(prompt);

            const response = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: {
                    responseMimeType: "application/json"
                }
            });
            
            const result = JSON.parse(response.text || "[]");
            return Array.isArray(result) ? result : [];
        },
        () => {
            return generateOfflineQuestions(grade || '7', lesson || 'Tin học', 'NB', lesson || '', 3, 'multiple-choice');
        }
    );
};

export const generateSingleQuestion = async (
    grade: string,
    lesson: string,
    level: string,
    criteriaText: string
): Promise<any> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            const prompt = `Bạn là một chuyên gia giáo dục môn Tin học theo chương trình GDPT 2018. Hãy tạo 1 câu hỏi trắc nghiệm khách quan (4 lựa chọn) cho môn Tin học.
            
            Thông tin yêu cầu:
            - Khối lớp: ${grade}
            - Bài học: "${lesson}"
            - Mức độ nhận thức: ${level} (NB=Nhận biết, TH=Thông hiểu, VD=Vận dụng, VDC=Vận dụng cao)
            - Yêu cầu cần đạt/Tiêu chí: "${criteriaText}"

            Yêu cầu đầu ra:
            - Câu hỏi phải rõ ràng, ngắn gọn, chuẩn sư phạm, bám sát sách giáo khoa.
            - 4 lựa chọn A, B, C, D - chỉ có duy nhất 1 đáp án đúng.
            - Mỗi lựa chọn trong 'options' PHẢI kết thúc bằng dấu chấm (.).
            - Các phương án nhiễu phải có tính nhiễu tốt, phản ánh các lỗi sai phổ biến của học sinh.
            - Trả về định dạng JSON chính xác:
            {
                "content": "Nội dung câu hỏi...",
                "options": [
                    { "id": "A", "text": "Phương án A.", "isCorrect": false },
                    { "id": "B", "text": "Phương án B.", "isCorrect": true },
                    { "id": "C", "text": "Phương án C.", "isCorrect": false },
                    { "id": "D", "text": "Phương án D.", "isCorrect": false }
                ]
            }
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            content: { type: Type.STRING },
                            options: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        text: { type: Type.STRING },
                                        isCorrect: { type: Type.BOOLEAN }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return JSON.parse(response.text || "{}");
        },
        () => {
            const qs = generateOfflineQuestions(grade, lesson, level, criteriaText, 1, 'multiple-choice');
            return qs[0] || {};
        }
    );
};

export const generateBulkQuestions = async (
    grade: string,
    lesson: string,
    level: string,
    criteriaText: string,
    quantity: number,
    questionType: string = 'multiple-choice',
    pdfBase64?: string
): Promise<any[]> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            let typeInstruction = "";
            let jsonSchemaNote = "";
            let extraConstraints = "";

            switch (questionType) {
                case 'true-false':
                    typeInstruction = "câu hỏi trắc nghiệm Đúng/Sai đơn lẻ (mỗi câu hỏi là MỘT nhận định hoàn chỉnh độc lập để học sinh xác định Đúng hoặc Sai)";
                    jsonSchemaNote = `Định dạng Đúng/Sai: 'category'='mc', 'questionType'='true-false', 'mcType'='multiple-choice'. 
                    'content': Là DUY NHẤT MỘT nhận định/phát biểu hoàn chỉnh, ngắn gọn, rõ nghĩa để học sinh chọn Đúng hoặc Sai. TUYỆT ĐỐI KHÔNG chia thành các ý con a, b, c, d. TUYỆT ĐỐI KHÔNG có các lựa chọn A, B, C, D.
                    'options': [
                        {"id": "Đúng", "text": "Đúng", "isCorrect": true},
                        {"id": "Sai", "text": "Sai", "isCorrect": false}
                    ] (trong đó đúng 1 lựa chọn có 'isCorrect'=true).
                    'answer': 'Đúng' hoặc 'Sai' (trùng khớp với lựa chọn có isCorrect=true).`;
                    extraConstraints = `
                    QUY ĐỊNH CÂU HỎI ĐÚNG / SAI:
                    - KHÔNG tạo một câu gồm 4 mệnh đề a, b, c, d.
                    - Mỗi mệnh đề phải được tách thành MỘT CÂU HỎI ĐỘC LẬP.
                    - Mỗi câu chỉ có DUY NHẤT MỘT nhận định hoàn chỉnh để học sinh xác định Đúng hoặc Sai.
                    - Không có các phương án A, B, C, D hoặc a, b, c, d.
                    - 'answer' là "Đúng" hoặc "Sai".
                    `;
                    break;

                case 'short-answer':
                    typeInstruction = "câu hỏi trắc nghiệm Trả lời ngắn (Định dạng Phần III mới của Bộ GD&ĐT)";
                    jsonSchemaNote = `'category'='mc', 'questionType'='short-answer'. 'options' là mảng rỗng []. 'answer' chứa đáp án số hoặc cụm từ ngắn gọn chính xác mà học sinh phải điền vào (ví dụ: '1024', 'RAM', '15').`;
                    extraConstraints = `
                    QUY ĐỊNH CÂU HỎI TRẢ LỜI NGẮN (PHẦN III):
                    - Câu hỏi yêu cầu học sinh tính toán, xác định giá trị, đếm số lượng, hoặc nêu thuật ngữ then chốt.
                    - Câu trả lời phải ngắn gọn, tường minh, không dài dòng.
                    `;
                    break;

                case 'fill-blank':
                    typeInstruction = "câu hỏi điền khuyết (yêu cầu điền từ/cụm từ còn thiếu vào chỗ trống)";
                    jsonSchemaNote = "Điền khuyết: 'options' rỗng, 'answer' chứa đáp án đúng.";
                    break;

                case 'essay':
                    typeInstruction = "câu hỏi Tự luận có barem thang điểm chi tiết";
                    jsonSchemaNote = "Tự luận: 'options' rỗng. 'category' là 'essay', 'questionType'='essay'.";
                    extraConstraints = `
                    ĐẶC BIỆT QUAN TRỌNG CHO CÂU HỎI TỰ LUẬN:
                    1. Thời lượng: Nội dung câu hỏi vừa sức cho học sinh làm trong 5-7 phút.
                    2. Cấu trúc: Câu hỏi BẮT BUỘC chia thành 4 ý nhỏ (a, b, c, d) hoặc 4 bước thực hiện rõ ràng.
                    3. Trường 'content': Ghi nội dung câu hỏi và các ý a, b, c, d xuống dòng rõ ràng.
                    4. Trường 'answer': HƯỚNG DẪN CHẤM chi tiết tương ứng cho từng ý kèm điểm cụ thể (ví dụ: a - 0.25đ: nội dung...; b - 0.25đ: nội dung...).
                    `;
                    break;

                case 'multiple-answer':
                    typeInstruction = "câu hỏi trắc nghiệm có nhiều đáp án đúng (từ 2 đáp án đúng trở lên trong 4 lựa chọn A, B, C, D)";
                    jsonSchemaNote = `Trắc nghiệm nhiều đáp án: 'category'='mc', 'questionType'='multiple-answer', 'mcType'='multiple-answer'. 'options' có đúng 4 phần tử với id là 'A', 'B', 'C', 'D'. BẮT BUỘC có từ 2 phương án trở lên có 'isCorrect'=true. 'answer' là chuỗi các đáp án đúng cách nhau bởi dấu phẩy (ví dụ: 'A, C' hoặc 'B, D'). Mọi text trong options PHẢI kết thúc bằng dấu chấm (.).`;
                    extraConstraints = `
                    QUY ĐỊNH CÂU HỎI TRẮC NGHIỆM NHIỀU ĐÁP ÁN:
                    - Câu hỏi yêu cầu học sinh lựa chọn các phương án đúng.
                    - Có 4 lựa chọn A, B, C, D. Phải có từ 2 đến 3 đáp án đúng ('isCorrect'=true) và ít nhất 1 đáp án sai để phân loại.
                    `;
                    break;

                default: // multiple-choice
                    typeInstruction = "câu hỏi trắc nghiệm khách quan nhiều lựa chọn (4 lựa chọn A, B, C, D - 1 đáp án đúng)";
                    jsonSchemaNote = `Trắc nghiệm: 'category'='mc', 'questionType'='multiple-choice'. 'options' có đúng 4 phần tử với id là 'A', 'B', 'C', 'D'. Đúng 1 phương án có isCorrect=true, 3 phương án còn lại isCorrect=false. Mọi text trong options PHẢI kết thúc bằng dấu chấm (.).`;
                    break;
            }

            let pdfInstruction = "";
            const contents: any[] = [];

            if (pdfBase64) {
                const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
                contents.push({
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: cleanBase64
                    }
                });
                pdfInstruction = `
                ĐẶC BIỆT QUAN TRỌNG - NGUỒN TƯ LIỆU TỪ TÀI LIỆU PDF ĐÍNH KÈM:
                - Bạn PHẢI đọc toàn bộ nội dung trong tài liệu PDF được đính kèm ở trên.
                - BẮT BUỘC biên soạn các câu hỏi DỰA TRỰC TIẾP trên kiến thức có trong tài liệu này.
                `;
            }

            const prompt = `Bạn là một chuyên gia giáo dục và khảo thí môn Tin học (chương trình GDPT 2018).
            Hãy biên soạn ${quantity} ${typeInstruction} cho học sinh.
            
            Thông tin yêu cầu:
            - Khối lớp: ${grade}
            - Bài học: "${lesson}"
            - Mức độ nhận thức: ${level} (NB=Nhận biết, TH=Thông hiểu, VD=Vận dụng, VDC=Vận dụng cao)
            - Yêu cầu cần đạt/Tiêu chí: "${criteriaText}"

            ${extraConstraints}
            ${pdfInstruction}

            Yêu cầu kỹ thuật sư phạm:
            - Các câu hỏi phải rõ ràng, ngắn gọn, chuẩn xác, bám sát thực tế giảng dạy môn Tin học.
            - Lời dẫn câu hỏi phải tự nhiên, linh hoạt, đi thẳng vào kiến thức. TUYỆT ĐỐI KHÔNG dùng các cụm từ như "Theo bài học...", "Theo SGK...".
            - Phương án nhiễu có độ nhiễu cao, phân loại học sinh tốt.
            - ${jsonSchemaNote}
            - Trả về danh sách (JSON array) các đối tượng câu hỏi.
            `;

            contents.push(prompt);

            const response = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING },
                                category: { type: Type.STRING },
                                questionType: { type: Type.STRING },
                                answer: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            text: { type: Type.STRING },
                                            isCorrect: { type: Type.BOOLEAN }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const parsed = JSON.parse(response.text || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            // Fallback nếu AI trả về mảng rỗng
            return generateOfflineQuestions(grade, lesson, level, criteriaText, quantity, questionType);
        },
        () => {
            return generateOfflineQuestions(grade, lesson, level, criteriaText, quantity, questionType);
        }
    );
};

export const generateEssayRubric = async (questionContent: string, maxPoints: number = 1.0): Promise<string> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            const ptsStr = maxPoints.toFixed(1).replace('.', ',');
            const prompt = `Bạn là giáo viên Tin học. Hãy tạo "Hướng dẫn chấm" (Đáp án và thang điểm) chi tiết chuẩn hóa theo dạng bảng cho câu hỏi tự luận sau:
            
            Câu hỏi: "${questionContent}"
            Tổng điểm câu hỏi: ${ptsStr} điểm.
            
            Yêu cầu định dạng bắt buộc:
            1. Phân tích cấu trúc câu hỏi: chia đáp án thành 2 đến 4 tiêu chí/bước giải cụ thể đánh dấu lần lượt là a), b), c), d).
            2. Mỗi ý PHẢI nằm trên 1 dòng riêng biệt: a) [Nội dung] - [điểm] điểm.
            3. Tổng điểm các ý thành phần BẮT BUỘC cộng lại đúng bằng ${ptsStr} điểm.
            4. Chỉ xuất danh sách các dòng a), b), c)...
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });

            const text = response.text?.trim() || "";
            return text || generateOfflineEssayRubric(questionContent, maxPoints);
        },
        () => {
            return generateOfflineEssayRubric(questionContent, maxPoints);
        }
    );
};

export const reviewExamWithAI = async (
    questions: any[],
    grade: string,
    examName: string
): Promise<ExamReviewResult> => {
    return callGeminiWithFailover(
        async (ai, model) => {
            const prompt = `Bạn là Chủ tịch Hội đồng thẩm định đề thi môn Tin học cấp THCS/THPT (Bộ GD&ĐT).
            Hãy tiến hành rà soát, phản biện và thẩm định đề thi sau đây:
            
            Thông tin kỳ thi:
            - Tên kỳ thi/Đề: "${examName}"
            - Khối lớp: ${grade}
            - Số lượng câu hỏi: ${questions.length}

            Danh sách câu hỏi cần thẩm định:
            ${JSON.stringify(questions.map((q, idx) => ({
                cau: idx + 1,
                bai: q.lesson,
                mucDo: q.level,
                loai: q.questionType || q.category,
                noiDung: q.content,
                cacLuaChon: q.options?.map((o: any) => `${o.id}: ${o.text} (${o.isCorrect ? 'ĐÚNG' : 'SAI'})`),
                dapAn: q.answer
            })), null, 2)}

            Yêu cầu thẩm định chi tiết:
            1. Đánh giá tính chính xác khoa học, thuật ngữ Tin học GDPT 2018.
            2. Kiểm tra độ nhiễu của các phương án sai.
            3. Kiểm tra tính trùng lặp nội dung.
            4. Kiểm tra phân bổ mức độ nhận thức (NB, TH, VD, VDC).
            5. Đưa ra điểm đánh giá chất lượng đề (0-100), ưu điểm, nhược điểm, khuyến nghị.
            6. Đánh giá từng câu cụ thể: "good", "warning", "error".

            Trả về định dạng JSON:
            {
                "overallScore": 90,
                "verdict": "Đề thi đạt chuẩn chất lượng sư phạm...",
                "strengths": ["Ưu điểm 1", "Ưu điểm 2"],
                "weaknesses": ["Hạn chế 1"],
                "recommendations": ["Khuyến nghị 1"],
                "questionAnalyses": [
                    {
                        "questionIndex": 1,
                        "status": "good",
                        "comment": "Câu hỏi chuẩn xác."
                    }
                ]
            }
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const result = JSON.parse(response.text || "{}");
            return {
                overallScore: result.overallScore || 90,
                verdict: result.verdict || "Đề thi đã được thẩm định cơ bản đạt yêu cầu GDPT 2018.",
                strengths: Array.isArray(result.strengths) && result.strengths.length > 0 ? result.strengths : ['Đề bám sát chương trình GDPT 2018.'],
                weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
                recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
                questionAnalyses: Array.isArray(result.questionAnalyses) ? result.questionAnalyses : []
            };
        },
        () => {
            return generateOfflineExamReview(questions, grade, examName);
        }
    );
};

export const autoFillMissingQuestions = async (
    neededItems: { lesson: string; level: string; count: number; questionType?: string; criteriaText?: string }[],
    grade: string,
    onProgress?: (completed: number, total: number, message: string) => void
): Promise<any[]> => {
    const generatedPool: any[] = [];
    let completed = 0;
    const total = neededItems.length;

    for (const item of neededItems) {
        if (item.count <= 0) continue;
        const msg = `Đang sinh ${item.count} câu [${item.level}] cho "${item.lesson}"...`;
        if (onProgress) onProgress(completed, total, msg);

        try {
            const qs = await generateBulkQuestions(
                grade,
                item.lesson,
                item.level,
                item.criteriaText || item.lesson,
                item.count,
                item.questionType || 'multiple-choice'
            );
            
            qs.forEach((q: any) => {
                generatedPool.push({
                    ...q,
                    lesson: item.lesson,
                    level: item.level,
                    criteria: item.criteriaText ? item.criteriaText.slice(0, 3) : '',
                    points: q.category === 'essay' ? 1.0 : 0.25,
                    uniqueId: Math.random()
                });
            });
        } catch (err) {
            console.error(`Failed to auto-fill for ${item.lesson}:`, err);
            // Kích hoạt ngay bộ sinh dự phòng nếu có lỗi đột xuất
            const fallbackQs = generateOfflineQuestions(
                grade, 
                item.lesson, 
                item.level, 
                item.criteriaText || item.lesson, 
                item.count, 
                item.questionType || 'multiple-choice'
            );
            fallbackQs.forEach((q: any) => {
                generatedPool.push({
                    ...q,
                    lesson: item.lesson,
                    level: item.level,
                    criteria: item.criteriaText ? item.criteriaText.slice(0, 3) : '',
                    points: q.category === 'essay' ? 1.0 : 0.25,
                    uniqueId: Math.random()
                });
            });
        }
        completed++;
    }

    if (onProgress) onProgress(total, total, `Hoàn thành tự động sinh ${generatedPool.length} câu hỏi!`);
    return generatedPool;
};
