import { GoogleGenAI, Type } from "@google/genai";
import { ExamReviewResult } from "../types";

export const getCustomApiKey = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
};

export const setCustomApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key', key.trim());
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

const getGenAIClient = () => {
    const userKey = getCustomApiKey();
    const envKey = (typeof process !== 'undefined' && process.env) 
        ? (process.env.API_KEY || process.env.GEMINI_API_KEY || '') 
        : '';
    const apiKey = userKey || envKey;
    return new GoogleGenAI({ apiKey });
};

export const generateQuestion = async (topic: string, level: string): Promise<string> => {
    try {
        const ai = getGenAIClient();
        const response = await ai.models.generateContent({
            model: getGeminiModel(),
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
    } catch (error) {
        console.error("Error generating question:", error);
        throw error;
    }
};

export const standardizeQuestionText = async (rawText: string): Promise<string> => {
    try {
        const ai = getGenAIClient();
        const response = await ai.models.generateContent({
            model: getGeminiModel(),
            contents: `Standardize the following raw question text into a structured JSON format with 'question', 'options', 'correctAnswer'.
            IMPORTANT: Ensure every option text ends with a period (.). 
            Raw Text:\n${rawText}`,
             config: {
                responseMimeType: "application/json"
            }
        });
        return response.text || "{}";
    } catch (error) {
        console.error("Error standardizing text:", error);
        throw error;
    }
};

export const parseQuestionsWithAI = async (
    text: string, 
    grade?: string, 
    lesson?: string,
    pdfBase64?: string
): Promise<any[]> => {
    try {
        const ai = getGenAIClient();
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
        - "questionType": "multiple-choice" | "true-false" | "short-answer" | "essay".
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
            model: getGeminiModel(),
            contents: contents,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const result = JSON.parse(response.text || "[]");
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error("Error parsing questions with AI:", error);
        return [];
    }
};

export const generateSingleQuestion = async (
    grade: string,
    lesson: string,
    level: string,
    criteriaText: string
): Promise<any> => {
    try {
        const ai = getGenAIClient();
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
            model: getGeminiModel(),
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
    } catch (error) {
        console.error("Error generating single question:", error);
        throw error;
    }
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
    try {
        const ai = getGenAIClient();
        let typeInstruction = "";
        let jsonSchemaNote = "";
        let extraConstraints = "";

        switch (questionType) {
            case 'true-false':
                typeInstruction = "câu hỏi trắc nghiệm Đúng/Sai (Định dạng Phần II mới của Bộ GD&ĐT)";
                jsonSchemaNote = `Định dạng Đúng/Sai chuẩn: 'category'='mc', 'questionType'='true-false'. 
                'content' là tình huống hoặc bài toán dẫn đề. 
                'options' có đúng 4 phần tử tương ứng với 4 nhận định độc lập a, b, c, d (id lần lượt là 'a', 'b', 'c', 'd').
                Trong mỗi phát biểu con, nếu phát biểu Đúng thì 'isCorrect'=true, nếu phát biểu Sai thì 'isCorrect'=false.
                Tất cả văn bản trong options PHẢI kết thúc bằng dấu chấm (.).`;
                extraConstraints = `
                QUY ĐỊNH CÂU HỎI ĐÚNG / SAI (PHẦN II):
                - Câu hỏi nêu ra một ngữ cảnh/bối cảnh/đoạn mã/bảng số liệu cụ thể.
                - 4 ý a), b), c), d) là 4 khẳng định liên quan trực tiếp đến ngữ cảnh đó.
                - Không được có ý nào mập mờ hoặc nửa đúng nửa sai.
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
            - TUYỆT ĐỐI KHÔNG bắt đầu câu hỏi bằng các cụm từ trích dẫn rập khuôn như: "Theo nội dung Bài...", "Dựa vào SGK...", "Theo tài liệu...", "Trong bài học...". Hãy diễn đạt câu hỏi một cách tự nhiên, linh hoạt và đi thẳng vào kiến thức.
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
            model: getGeminiModel(),
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            content: { type: Type.STRING },
                            category: { type: Type.STRING, description: "mc or essay" },
                            questionType: { type: Type.STRING, description: "multiple-choice, true-false, short-answer, essay" },
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

        const result = JSON.parse(response.text || "[]");
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error("Error generating bulk questions:", error);
        throw error;
    }
};

export const generateEssayRubric = async (questionContent: string): Promise<string> => {
    try {
        const ai = getGenAIClient();
        const prompt = `Bạn là giáo viên Tin học. Hãy tạo "Hướng dẫn chấm" (Đáp án và thang điểm) cho câu hỏi tự luận sau.
        
        Câu hỏi: "${questionContent}"
        
        Yêu cầu:
        - Chia đáp án thành các ý nhỏ rõ ràng (gạch đầu dòng hoặc a, b, c, d).
        - Gán điểm thành phần cho từng ý (Ví dụ: 0.25 điểm, 0.5 điểm). Tổng điểm khoảng 1.0 đến 2.0 điểm.
        - Ngôn ngữ ngắn gọn, sư phạm, chính xác.
        - Không cần tiêu đề, chỉ cần nội dung hướng dẫn chấm.
        `;

        const response = await ai.models.generateContent({
            model: getGeminiModel(),
            contents: prompt,
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error generating rubric:", error);
        return "Lỗi khi tạo hướng dẫn chấm.";
    }
};

// AI Reviewer / Thẩm định đề thi toàn diện
export const reviewExamWithAI = async (
    questions: any[],
    grade: string,
    examName: string
): Promise<ExamReviewResult> => {
    try {
        const ai = getGenAIClient();
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
        1. Đánh giá tính chính xác khoa học, thuật ngữ Tin học theo SGK chương trình GDPT 2018.
        2. Kiểm tra độ nhiễu của các phương án sai (có quá lộ liễu hay không, có phương án nào gây tranh cãi không).
        3. Kiểm tra tính trùng lặp nội dung giữa các câu hỏi trong cùng một đề thi.
        4. Kiểm tra phân bổ mức độ nhận thức (NB, TH, VD, VDC).
        5. Đưa ra điểm đánh giá chất lượng đề (thang điểm 100), nhận xét ưu điểm, nhược điểm, khuyến nghị cải thiện.
        6. Đánh giá từng câu cụ thể: "good" (đạt chuẩn), "warning" (cần chỉnh sửa nhẹ), "error" (sai kiến thức hoặc sai định dạng nghiêm trọng).

        Trả về định dạng JSON theo đúng schema sau:
        {
            "overallScore": 90,
            "verdict": "Đề thi đạt chuẩn chất lượng sư phạm...",
            "strengths": ["Ưu điểm 1", "Ưu điểm 2"],
            "weaknesses": ["Hạn chế 1", "Hạn chế 2"],
            "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"],
            "questionAnalyses": [
                {
                    "questionIndex": 1,
                    "status": "good",
                    "comment": "Câu hỏi chuẩn xác, phương án nhiễu tốt."
                }
            ]
        }
        `;

        const response = await ai.models.generateContent({
            model: getGeminiModel(),
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const result = JSON.parse(response.text || "{}");
        return {
            overallScore: result.overallScore || 85,
            verdict: result.verdict || "Đề thi đã được thẩm định cơ bản đạt yêu cầu.",
            strengths: Array.isArray(result.strengths) ? result.strengths : [],
            weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
            recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
            questionAnalyses: Array.isArray(result.questionAnalyses) ? result.questionAnalyses : []
        };
    } catch (error) {
        console.error("Error reviewing exam with AI:", error);
        throw error;
    }
};

// Tự động sinh câu hỏi bù đắp vào các ô ma trận còn thiếu
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
                    points: q.category === 'essay' ? 1.0 : (item.questionType === 'true-false' ? 1.0 : 0.25),
                    uniqueId: Math.random()
                });
            });
        } catch (err) {
            console.error(`Failed to auto-fill for ${item.lesson}:`, err);
        }
        completed++;
    }

    if (onProgress) onProgress(total, total, `Hoàn thành tự động sinh ${generatedPool.length} câu hỏi!`);
    return generatedPool;
};
