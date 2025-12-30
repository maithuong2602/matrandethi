import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestion = async (topic: string, level: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a multiple choice question about "${topic}" at level "${level}" in Vietnamese. Format as JSON with fields: question, options (array), correctIndex.`,
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
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Standardize the following raw question text into a structured JSON format with 'question', 'options', 'correctAnswer'.\n\nRaw Text:\n${rawText}`,
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

export const parseQuestionsWithAI = async (text: string, grade?: string, lesson?: string): Promise<any[]> => {
    try {
        let contextInstruction = "";
        if (grade && lesson) {
            contextInstruction = `
            CONTEXT CONSTRAINT:
            - Target Grade: ${grade}
            - Target Lesson/Topic: "${lesson}"
            - TASK: Analyze the raw text and EXTRACT ONLY questions that are semantically relevant to the content of "${lesson}".
            - FILTERING: If a question clearly belongs to a different lesson, chapter, or subject, DO NOT include it in the output array. Ignore header texts, introduction texts, or unrelated footer texts.
            `;
        }

        const prompt = `You are an expert exam editor. Parse the following text (which contains a list of questions) into a structured JSON array.
        
        ${contextInstruction}

        The text may contain Multiple Choice Questions (MC) or Essay/Constructed Response Questions.
        
        Return a JSON array where each object has the following properties:
        - "category": "mc" or "essay".
        - "content": The main question text/stem.
        - "level": "NB" (Nhận biết), "TH" (Thông hiểu), "VD" (Vận dụng), or "VDC" (Vận dụng cao). If not explicitly stated, try to infer from the difficulty, or default to "NB".
        - "criteria": The criteria code (e.g. "1.1", "2.3") if present at the start of the question numbering (e.g. "Câu 1.1..."), otherwise return an empty string "".
        - "options": (For MC only) An array of 4 objects, each having "id" (must be "A", "B", "C", "D"), "text" (string) and "isCorrect" (boolean).
        - "answer": (For Essay, Fill-in-the-blank, or single-choice MC) The answer text, key, or the correct option ID (e.g., "A").
        - "mcType": (For MC only) "multiple-choice" (single correct), "multiple-answer" (multiple correct), or "fill-blank" (if it looks like a fill-in-the-blank question). Infer this based on the options and content.

        Raw Text to Parse:
        ${text}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
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
        const prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo 1 câu hỏi trắc nghiệm khách quan (4 lựa chọn) cho môn Tin học.
        
        Thông tin yêu cầu:
        - Khối lớp: ${grade}
        - Bài học: "${lesson}"
        - Mức độ nhận thức: ${level} (NB=Nhận biết, TH=Thông hiểu, VD=Vận dụng, VDC=Vận dụng cao)
        - Yêu cầu cần đạt/Tiêu chí: "${criteriaText}"

        Yêu cầu đầu ra:
        - Câu hỏi phải rõ ràng, ngắn gọn, phù hợp với tiêu chí.
        - 4 lựa chọn, chỉ có 1 đáp án đúng.
        - Trả về định dạng JSON chính xác như sau:
        {
            "content": "Nội dung câu hỏi...",
            "options": [
                { "id": "A", "text": "Lựa chọn A", "isCorrect": false },
                { "id": "B", "text": "Lựa chọn B", "isCorrect": true },
                { "id": "C", "text": "Lựa chọn C", "isCorrect": false },
                { "id": "D", "text": "Lựa chọn D", "isCorrect": false }
            ]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
    questionType: string = 'multiple-choice'
): Promise<any[]> => {
    try {
        let typeInstruction = "";
        let jsonSchemaNote = "";
        let extraConstraints = "";

        switch (questionType) {
            case 'true-false':
                typeInstruction = "câu hỏi trắc nghiệm có nhiều phương án đúng (4 lựa chọn a, b, c, d)";
                jsonSchemaNote = "Trắc nghiệm nhiều đáp án: 'options' có 4 phần tử. BẮT BUỘC phải có nhiều hơn 1 đáp án đúng (isCorrect=true).";
                break;
            case 'fill-blank':
                typeInstruction = "câu hỏi điền khuyết (yêu cầu điền từ/cụm từ còn thiếu vào chỗ trống)";
                jsonSchemaNote = "Điền khuyết: 'options' rỗng, 'answer' chứa đáp án đúng.";
                break;
            case 'essay':
                typeInstruction = "câu hỏi Tự luận";
                jsonSchemaNote = "Tự luận: 'options' rỗng. 'category' là 'essay'.";
                extraConstraints = `
                ĐẶC BIỆT QUAN TRỌNG CHO CÂU HỎI TỰ LUẬN:
                1. Thời lượng: Nội dung câu hỏi phải vừa sức để học sinh làm trong khoảng 5-7 phút. Không được quá dài dòng hay đánh đố.
                2. Cấu trúc: Câu hỏi BẮT BUỘC phải chia thành 4 ý nhỏ (a, b, c, d) hoặc 4 bước thực hiện rõ ràng để dễ chấm điểm.
                3. Nội dung trường 'content': Ghi rõ nội dung câu hỏi và các ý a, b, c, d xuống dòng.
                4. Nội dung trường 'answer': Phải là 'HƯỚNG DẪN CHẤM' chi tiết tương ứng cho 4 ý trên. (Ví dụ: a - 0.25đ: nội dung...; b - 0.25đ: nội dung...).
                `;
                break;
            default: // multiple-choice
                typeInstruction = "câu hỏi trắc nghiệm khách quan (4 lựa chọn, 1 đáp án đúng)";
                jsonSchemaNote = "Trắc nghiệm: 'options' có 4 phần tử, 1 cái có isCorrect=true.";
                break;
        }

        const prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo ${quantity} ${typeInstruction} cho môn Tin học.
        
        Thông tin yêu cầu:
        - Khối lớp: ${grade}
        - Bài học: "${lesson}"
        - Mức độ nhận thức: ${level} (NB=Nhận biết, TH=Thông hiểu, VD=Vận dụng, VDC=Vận dụng cao)
        - Yêu cầu cần đạt/Tiêu chí: "${criteriaText}"

        ${extraConstraints}

        Yêu cầu đầu ra chung:
        - Các câu hỏi phải rõ ràng, ngắn gọn, phù hợp với tiêu chí.
        - ${jsonSchemaNote}
        - options IDs must be "A", "B", "C", "D".
        - Trả về định dạng JSON là một danh sách (array) các đối tượng câu hỏi.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            content: { type: Type.STRING },
                            category: { type: Type.STRING, description: "Values: 'mc' or 'essay'" },
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
        const prompt = `Bạn là giáo viên Tin học. Hãy tạo "Hướng dẫn chấm" (Đáp án và thang điểm) cho câu hỏi tự luận sau.
        
        Câu hỏi: "${questionContent}"
        
        Yêu cầu:
        - Chia đáp án thành các ý nhỏ rõ ràng (gạch đầu dòng hoặc a, b, c).
        - Gán điểm thành phần cho từng ý (Ví dụ: 0.25 điểm, 0.5 điểm). Tổng điểm khoảng 1.0 đến 2.0 điểm.
        - Ngôn ngữ ngắn gọn, sư phạm, chính xác.
        - Không cần tiêu đề, chỉ cần nội dung hướng dẫn chấm.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error generating rubric:", error);
        return "Lỗi khi tạo hướng dẫn chấm.";
    }
};