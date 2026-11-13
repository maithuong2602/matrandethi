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

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const getGeminiModel = (): string => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gemini_model');
        if (stored) return stored;
    }
    return DEFAULT_GEMINI_MODEL;
};

/**
 * Bộ giải mã JSON an toàn (Safe JSON Parser & Truncated Stream Recovery):
 * Khắc phục triệt để lỗi "Unterminated string in JSON at position ..." khi Gemini sinh chuỗi quá dài
 * hoặc bị ngắt giữa chừng (maxOutputTokens / lặp ký tự).
 * Tự động thu hồi toàn bộ các đối tượng câu hỏi { ... } đã hoàn chỉnh trước vị trí bị ngắt.
 */
function safeParseJsonArray(rawText: string | undefined): any[] {
    if (!rawText) return [];
    let cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    // Thu gọn chuỗi ký tự lặp bất thường (>30 lần liên tiếp) do lỗi lặp token của LLM
    cleaned = cleaned.replace(/(.)\1{40,}/g, '$1$1$1');

    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
    } catch (_firstErr) {
        // Phục hồi các object JSON hoàn chỉnh ở cấp phần tử mảng [{...}, {...}, ...]
        const startBracket = cleaned.indexOf('[');
        if (startBracket !== -1) {
            const recovered: any[] = [];
            let depth = 0;
            let inString = false;
            let escapeNext = false;
            let objStart = -1;

            for (let i = startBracket + 1; i < cleaned.length; i++) {
                const ch = cleaned[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (ch === '\\' && inString) {
                    escapeNext = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === '{') {
                        if (depth === 0) objStart = i;
                        depth++;
                    } else if (ch === '}') {
                        depth--;
                        if (depth === 0 && objStart !== -1) {
                            const candidate = cleaned.slice(objStart, i + 1);
                            try {
                                recovered.push(JSON.parse(candidate));
                            } catch {
                                // Bỏ qua phần tử lỗi
                            }
                            objStart = -1;
                        }
                    }
                }
            }
            if (recovered.length > 0) {
                console.info(`[geminiService] Đã phục hồi an toàn ${recovered.length} câu hỏi từ chuỗi JSON bị ngắt.`);
                return recovered;
            }
        }
    }
    return [];
}

function safeParseJsonObject(rawText: string | undefined): any {
    if (!rawText) return {};
    const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/(.)\1{40,}/g, '$1$1$1')
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const arr = safeParseJsonArray(`[${cleaned}]`);
        return arr[0] || {};
    }
}

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

            // Kiểm tra lỗi hạn ngạch (429), lỗi máy chủ quá tải tạm thời (503) hoặc lỗi xác thực (401, 403)
            const isQuotaError = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota');
            const isAuthError = errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('API_KEY_INVALID');
            const isServerOverloaded = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('overloaded');

            if (isServerOverloaded) {
                await new Promise(resolve => setTimeout(resolve, 600));
                try {
                    const aiRetry = getGenAIClientWithKey(activeKey);
                    return await operation(aiRetry, model);
                } catch {
                    // Chuyển sang model tiếp theo trong FALLBACK_MODELS
                }
            }

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

export const parseStructuredTextQuestions = (rawText: string): any[] => {
    if (!rawText || !rawText.trim()) return [];
    const cleanedLines = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\*\*/g, '')
        .split('\n')
        .filter(line => !/^\s*(?:PHẦN\s+[I|V|X|\d]+|[I|V|X]+\.\s*(?:TRẮC\s*NGHIỆM|TỰ\s*LUẬN)|---\s*|Tiếp\s*tục\s*tương\s*tự)/i.test(line.trim()));

    // Gộp dòng "Tình huống X: ..." và dòng "Câu Y. Xác định tính đúng hoặc sai..." liền kề thành 1 khối duy nhất
    const mergedLines: string[] = [];
    for (let i = 0; i < cleanedLines.length; i++) {
        const cur = cleanedLines[i].trim();
        if (/^(?:\[[^\]]+\]\s*)*Tình\s*huống\s*\d*\s*[:.]/i.test(cur)) {
            let leadingTags = '';
            const leadMatch = cur.match(/^((?:\[[^\]]+\]\s*)+)/);
            if (leadMatch) leadingTags = leadMatch[1].trim() + ' ';
            let combinedScenario = leadingTags + cur.replace(/^(?:\[[^\]]+\]\s*)*Tình\s*huống\s*\d*\s*[:.]\s*/i, '').trim();
            while (i + 1 < cleanedLines.length) {
                const nextLine = cleanedLines[i + 1].trim();
                if (!nextLine) {
                    i++;
                    continue;
                }
                if (/^(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai/i.test(nextLine)) {
                    i++;
                    break;
                }
                if (/^(?:Câu\s*\d+|Bài\s*\d+)\s*[.):\-]?\s*(.+)$/i.test(nextLine)) {
                    const restAfterCau = nextLine.replace(/^(?:Câu\s*\d+|Bài\s*\d+)\s*[.):\-]?\s*/i, '').trim();
                    const cleanedRest = restAfterCau.replace(/^Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai\s*của\s*các\s*phát\s*biểu\s*sau\s*[:.]?\s*/i, '').trim();
                    if (cleanedRest) {
                        combinedScenario += ' ' + cleanedRest;
                    }
                    i++;
                    break;
                }
                if (/^\*?[A-Da-d][.)]\s+/.test(nextLine)) {
                    break;
                }
                combinedScenario += ' ' + nextLine;
                i++;
            }
            mergedLines.push(`Câu 1: [TF_SCENARIO] ${combinedScenario}`);
        } else {
            mergedLines.push(cleanedLines[i]);
        }
    }

    const cleanedRaw = mergedLines.join('\n');

    const blocks = cleanedRaw
        .split(/(?=(?:^|\n)\s*(?:(?:\[\s*(?:TL|Tự\s*luận|NB|TH|VD|VDC)[^\]]*\]\s*)*(?:Câu\s*\d+|Bài\s*\d+)|\d+\s*[.):]))/i)
        .map(b => b.trim())
        .filter(Boolean);

    const targetBlocks = blocks.length > 0 ? blocks : [cleanedRaw.trim()];
    const parsed: any[] = [];

    const normalizeLevelTag = (rawLvl: string): 'NB' | 'TH' | 'VD' | 'VDC' => {
        const u = rawLvl.trim().toUpperCase();
        if (u === 'NB' || u.includes('NHẬN BIẾT') || u === 'BIẾT') return 'NB';
        if (u === 'TH' || u.includes('THÔNG HIỂU') || u === 'HIỂU') return 'TH';
        if (u === 'VDC' || u.includes('VẬN DỤNG CAO')) return 'VDC';
        if (u === 'VD' || u.includes('VẬN DỤNG')) return 'VD';
        return 'NB';
    };

    targetBlocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        let stem = lines[0];
        let explicitAnswer = '';
        let isExplicitEssay = /(?:^|\n)\s*(?:Hướng\s*dẫn\s*chấm|HDC)\s*[:=]/i.test(block);
        let isScenarioTF = false;
        let level: 'NB' | 'TH' | 'VD' | 'VDC' = 'NB';
        let criteria = '';

        // Bóc tách nhãn nếu đặt trước hoặc sau chữ "Câu X:"
        const stripLeadingTags = (input: string): string => {
            let s = input.trim();
            let matched = true;
            while (matched) {
                matched = false;
                const cauPrefix = s.match(/^(?:Câu\s*\d+|Bài\s*\d+|\d+)\s*[.):\-]?\s*/i);
                if (cauPrefix) {
                    s = s.slice(cauPrefix[0].length).trim();
                    matched = true;
                }
                if (s.startsWith('[TF_SCENARIO]')) {
                    isScenarioTF = true;
                    s = s.replace(/^\[TF_SCENARIO\]\s*/, '').trim();
                    matched = true;
                }
                const essayTag = s.match(/^(?:\[\s*(?:TL|Tự\s*luận)\s*\]|\(\s*(?:TL|Tự\s*luận)\s*\))\s*/i);
                if (essayTag) {
                    isExplicitEssay = true;
                    s = s.slice(essayTag[0].length).trim();
                    matched = true;
                }
                const lvlCritMatch = s.match(/^(?:\[\s*(NB|TH|VD|VDC|Nhận\s*biết|Thông\s*hiểu|Vận\s*dụng\s*cao|Vận\s*dụng|Biết|Hiểu)(?:\s*[-–:|,]\s*(\d+\.\d+))?\s*\]|\(\s*(NB|TH|VD|VDC|Nhận\s*biết|Thông\s*hiểu|Vận\s*dụng\s*cao|Vận\s*dụng|Biết|Hiểu)(?:\s*[-–:|,]\s*(\d+\.\d+))?\s*\))\s*/i);
                if (lvlCritMatch) {
                    level = normalizeLevelTag(lvlCritMatch[1] || lvlCritMatch[3]);
                    if (lvlCritMatch[2] || lvlCritMatch[4]) {
                        criteria = (lvlCritMatch[2] || lvlCritMatch[4]).trim();
                    }
                    s = s.slice(lvlCritMatch[0].length).trim();
                    matched = true;
                }
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
            }
            return s;
        };

        stem = stripLeadingTags(stem)
            .replace(/^Tình\s*huống\s*\d*\s*[:.]\s*/i, '')
            .replace(/\s*(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai\s*của\s*các\s*phát\s*biểu\s*sau\s*[:.]?\s*$/i, '')
            .trim();
        stem = stripLeadingTags(stem);

        const optLines: string[] = [];
        let inAnswerSection = false;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (/^(?:Câu\s*\d+\s*[.):\-]?\s*)?Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai/i.test(line)) {
                isScenarioTF = true;
                continue;
            }
            const ansMatch = line.match(/^(?:Đáp\s*án|ĐA|Trả\s*lời|Hướng\s*dẫn\s*chấm|HDC)\s*[:=]?\s*(.*)$/i);
            if (ansMatch && (/^(?:Đáp\s*án|ĐA|Trả\s*lời|Hướng\s*dẫn\s*chấm|HDC)\s*[:=]/i.test(line) || /^(?:Hướng\s*dẫn\s*chấm|HDC)\s*$/i.test(line))) {
                if (/^(?:Hướng\s*dẫn\s*chấm|HDC)/i.test(line)) {
                    isExplicitEssay = true;
                }
                explicitAnswer = (ansMatch[1] || '').trim();
                inAnswerSection = true;
                continue;
            }
            if (inAnswerSection) {
                explicitAnswer = explicitAnswer ? `${explicitAnswer}\n${line}` : line;
                continue;
            }
            if (!isExplicitEssay && (/^\*?[A-Da-d][.)]\s*/.test(line) || /^[A-Da-d][.)]\s*\*/.test(line))) {
                optLines.push(line);
            } else if (optLines.length === 0) {
                const cleanedCont = line.replace(/^Xác\s*định\s*tính\s*đúng\s*hoặc\s*sai\s*của\s*các\s*phát\s*biểu\s*sau\s*[:.]?\s*/i, '').trim();
                if (cleanedCont) {
                    stem += (stem ? '\n' : '') + cleanedCont;
                }
            }
        }

        // Kiểm tra câu hỏi Đúng/Sai dạng Tình huống + 4 phát biểu a), b), c), d)
        const hasLowercaseParen = optLines.length >= 2 && optLines.every(l => /^\*?[a-d]\)/i.test(l) && (/^\*?[a-d]\)/.test(l) || isScenarioTF));
        const hasInlineTfInOptions = optLines.some(l => /(?:\[\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\)|[-–:]\s*(?:Đúng|Sai)\s*$)/i.test(l));
        const hasTfAnswerPattern = /[a-d]\s*[-–:=)]\s*(?:Đúng|Sai|Đ|S)/i.test(explicitAnswer) || /^(?:(?:Đúng|Sai|Đ|S)\s*[,;-]\s*){2,}(?:Đúng|Sai|Đ|S)$/i.test(explicitAnswer);

        if (optLines.length >= 2 && (isScenarioTF || hasInlineTfInOptions || hasTfAnswerPattern || hasLowercaseParen)) {
            const subIds = ['a', 'b', 'c', 'd'];
            const options = subIds.map((id, idx) => {
                const rawLine = optLines[idx] || '';
                const hasStar = rawLine.startsWith('*') || /^[A-Da-d][.)]\s*\*/.test(rawLine);
                const inlineTf = rawLine.match(/(?:\[\s*(\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(\*?Đúng|\*?Sai|Đ|S)\s*\)|[-–:]\s*(Đúng|Sai)\s*$)\s*$/i);
                let isCorrect = hasStar;

                if (inlineTf) {
                    const tfToken = (inlineTf[1] || inlineTf[2] || inlineTf[3] || '').replace('*', '').trim().toLowerCase();
                    isCorrect = tfToken.startsWith('đ') || tfToken === 'true';
                } else if (explicitAnswer) {
                    const pairMatch = explicitAnswer.match(new RegExp(`${id}\\s*[-–:=)]\\s*(Đúng|Sai|Đ|S)`, 'i'));
                    if (pairMatch) {
                        isCorrect = pairMatch[1].trim().toLowerCase().startsWith('đ');
                    } else {
                        const seqTokens = explicitAnswer.split(/[,;\s-]+/).map(s => s.trim().toLowerCase()).filter(s => ['đúng', 'sai', 'đ', 's'].includes(s));
                        if (seqTokens[idx]) {
                            isCorrect = seqTokens[idx].startsWith('đ');
                        }
                    }
                }

                const cleanText = rawLine
                    .replace(/^\*\s*/, '')
                    .replace(/^[A-Da-d][.)]\s*\*?\s*/, '')
                    .replace(/(?:\[\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(?:\*?Đúng|\*?Sai|Đ|S)\s*\)|[-–:]\s*(?:Đúng|Sai)\s*$)\s*$/i, '')
                    .trim();

                return { id, text: cleanText, isCorrect };
            });

            const answerSummary = options.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            parsed.push({
                category: 'mc',
                questionType: 'true-false',
                mcType: 'true-false',
                level,
                criteria,
                content: stem,
                options,
                answer: answerSummary
            });
            return;
        }

        // Kiểm tra câu hỏi Đúng/Sai 1 nhận định (VD: có [Đúng]/[Sai] hoặc *Đúng/*Sai ở cuối câu hoặc dòng Đáp án: Đúng/Sai)
        const tfInlineMatch = stem.match(/(?:\[\s*(\*?Đúng|\*?Sai|Đ|S)\s*\]|\(\s*(\*?(?:Đúng|Sai))\s*\))\s*$/i);
        if (optLines.length === 0 && (tfInlineMatch || /^(?:Đúng|Sai|Đ|S)$/i.test(explicitAnswer))) {
            const rawTf = (tfInlineMatch ? (tfInlineMatch[1] || tfInlineMatch[2]) : explicitAnswer).replace('*', '').trim().toLowerCase();
            const isTrue = rawTf.startsWith('đ') || rawTf === 'true';
            if (tfInlineMatch) {
                stem = stem.slice(0, tfInlineMatch.index).trim();
            }
            parsed.push({
                category: 'mc',
                questionType: 'true-false',
                mcType: 'multiple-choice',
                level,
                criteria,
                content: stem,
                options: [
                    { id: 'Đúng', text: 'Đúng', isCorrect: isTrue },
                    { id: 'Sai', text: 'Sai', isCorrect: !isTrue }
                ],
                answer: isTrue ? 'Đúng' : 'Sai'
            });
            return;
        }

        if (optLines.length >= 2) {
            const explicitLetters = explicitAnswer
                .toUpperCase()
                .split(/[,;\s]+/)
                .filter(x => ['A', 'B', 'C', 'D'].includes(x));

            const options = ['A', 'B', 'C', 'D'].map((id, idx) => {
                const rawLine = optLines[idx] || '';
                const hasStar = rawLine.startsWith('*') || /^[A-Da-d][.)]\s*\*/.test(rawLine);
                const cleanText = rawLine
                    .replace(/^\*\s*/, '')
                    .replace(/^[A-Da-d][.)]\s*\*?\s*/, '')
                    .trim();
                const isCorrect = hasStar || explicitLetters.includes(id);
                return { id, text: cleanText, isCorrect };
            });

            if (!options.some(o => o.isCorrect)) {
                options[0].isCorrect = true;
            }

            const correctIds = options.filter(o => o.isCorrect).map(o => o.id);
            const isMulti = correctIds.length > 1;
            parsed.push({
                category: 'mc',
                questionType: isMulti ? 'multiple-answer' : 'multiple-choice',
                mcType: isMulti ? 'multiple-answer' : 'multiple-choice',
                level,
                criteria,
                content: stem,
                options,
                answer: correctIds.join(', ')
            });
            return;
        }

        if (isExplicitEssay) {
            parsed.push({
                category: 'essay',
                questionType: 'essay',
                level,
                criteria,
                content: stem,
                options: [],
                answer: explicitAnswer
            });
            return;
        }

        if (explicitAnswer) {
            parsed.push({
                category: 'mc',
                questionType: 'short-answer',
                mcType: 'fill-blank',
                level,
                criteria,
                content: stem,
                options: [],
                answer: explicitAnswer
            });
        }
    });

    return parsed;
};

export const parseQuestionsWithAI = async (
    text: string, 
    grade?: string, 
    lesson?: string,
    pdfBase64?: string
): Promise<any[]> => {
    // Nếu là văn bản thuần có đánh dấu *A., *B. hoặc Đáp án: ... hoặc Hướng dẫn chấm:, ưu tiên bóc tách tức thì (< 5ms) nếu không đính kèm PDF
    if (!pdfBase64 && text && (/(?:^|\n)\s*\*?[A-Da-d][.)]\s+/m.test(text) || /(?:Đáp\s*án|ĐA|Hướng\s*dẫn\s*chấm|HDC)\s*[:=]/i.test(text) || /\[\s*(?:TL|Tự\s*luận|Đúng|Sai|Đ|S)\s*\]/i.test(text))) {
        const directParsed = parseStructuredTextQuestions(text);
        if (directParsed.length > 0) {
            return directParsed;
        }
    }

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

            IMPORTANT ANSWER DETECTION RULES:
            - An asterisk (*) before an option letter (e.g. "*A. ...", "*B. ...") or after the option letter (e.g. "A. *...") ALWAYS marks that option as the correct answer ("isCorrect": true). Strip the "*" from the option text.
            - A line like "Đáp án: B" or "ĐA: A, C" also marks the correct answer(s).
            - For True/False statements, "[Đúng]" / "[Đ]" / "*Đúng" means True, and "[Sai]" / "[S]" / "*Sai" means False.

            The questions may contain:
            1. Multiple Choice Questions (4 options A, B, C, D with single correct answer).
            2. True/False Questions (Phần II - statements evaluated as True or False).
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
                    responseMimeType: "application/json",
                    temperature: 0.3,
                    maxOutputTokens: 8192
                }
            });
            
            const result = safeParseJsonArray(response.text);
            if (result.length > 0) return result;
            throw new Error("Empty or unparsable JSON array from model");
        },
        () => {
            const offlineParsed = parseStructuredTextQuestions(text);
            if (offlineParsed.length > 0) return offlineParsed;
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
                    temperature: 0.35,
                    maxOutputTokens: 2048
                }
            });

            return safeParseJsonObject(response.text);
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
                    typeInstruction = "câu hỏi trắc nghiệm Đúng/Sai theo Tình huống (mỗi câu gồm 1 Tình huống cụ thể bám sát tài liệu nguồn và 4 phát biểu a, b, c, d để học sinh xác định Đúng hoặc Sai)";
                    jsonSchemaNote = `Định dạng Đúng/Sai theo Tình huống: 'category'='mc', 'questionType'='true-false', 'mcType'='true-false'. 
                    'content': Mô tả tình huống cụ thể, đủ thông tin để học sinh phân tích, ĐƯỢC XÂY DỰNG TRỰC TIẾP TỪ KIẾN THỨC, DỮ KIỆN, VÍ DỤ TRONG TÀI LIỆU NGUỒN / BÀI HỌC "${lesson}" và Tiêu chí "${criteriaText}" (không ghi tiền tố 'Tình huống 1:' hay 'Câu 1.' vì hệ thống sẽ tự động đánh số khi in đề).
                    'options': Mảng gồm ĐÚNG 4 phát biểu với id lần lượt là 'a', 'b', 'c', 'd' xoay quanh và khai thác trực tiếp tình huống ở trên:
                    [
                        {"id": "a", "text": "Phát biểu thứ nhất bám sát tình huống và tài liệu nguồn.", "isCorrect": true},
                        {"id": "b", "text": "Phát biểu thứ hai bám sát tình huống và tài liệu nguồn.", "isCorrect": false},
                        {"id": "c", "text": "Phát biểu thứ ba bám sát tình huống và tài liệu nguồn.", "isCorrect": true},
                        {"id": "d", "text": "Phát biểu thứ tư bám sát tình huống và tài liệu nguồn.", "isCorrect": false}
                    ] (trong đó 'isCorrect'=true nếu phát biểu Đúng, 'isCorrect'=false nếu phát biểu Sai).
                    'answer': Chuỗi tóm tắt đáp án dạng 'a-Đ, b-S, c-Đ, d-S'.`;
                    extraConstraints = `
                    QUY ĐỊNH BẮT BUỘC CHO CÂU HỎI ĐÚNG / SAI THEO TÌNH HUỐNG:
                    - Nội dung Tình huống ('content') và cả 4 phát biểu a, b, c, d BẮT BUỘC phải bám sát 100% vào nguồn tài liệu cung cấp (File PDF đính kèm nếu có, hoặc nội dung kiến thức trọng tâm của bài "${lesson}" và yêu cầu cần đạt "${criteriaText}").
                    - Tuyệt đối KHÔNG dùng tình huống chung chung hoặc ngoài phạm vi bài học. Mỗi câu hỏi phải là một tình huống cụ thể khác nhau khai thác các khía cạnh/ví dụ thực tế trong nguồn tài liệu.
                    - Kèm theo đúng 4 phát biểu a, b, c, d trong mảng 'options' (với id là 'a', 'b', 'c', 'd') có cả phát biểu Đúng (isCorrect: true) và phát biểu Sai (isCorrect: false) để học sinh phân tích dựa trên tình huống đó.
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
                    typeInstruction = "câu hỏi Tự luận (gồm 1 lời dẫn/bối cảnh bài toán và ĐỦ 4 ý nhỏ a, b, c, d) kèm Hướng dẫn chấm dạng bảng 4 ý chi tiết";
                    jsonSchemaNote = `Tự luận: 'options' rỗng []. 'category' là 'essay', 'questionType'='essay'. 'content' gồm lời dẫn bài toán trên dòng đầu, tiếp theo là ĐỦ 4 dòng bắt đầu bằng 'a) ', 'b) ', 'c) ', 'd) '. 'answer' là Hướng dẫn chấm gồm ĐỦ 4 dòng bắt đầu bằng 'a) ', 'b) ', 'c) ', 'd) ' kèm thang điểm từng ý (0,25 điểm/ý, tổng 1,0 điểm) để phần mềm tự động dựng Bảng Hướng dẫn chấm 2 cột.`;
                    extraConstraints = `
                    ĐẶC BIỆT QUAN TRỌNG CHO CÂU HỎI TỰ LUẬN (ĐỦ 4 Ý a, b, c, d & HƯỚNG DẪN CHẤM DẠNG BẢNG):
                    1. Thời lượng: Nội dung câu hỏi vừa sức cho học sinh làm trong 5-7 phút, khai thác trực tiếp từ tài liệu nguồn và Yêu cầu cần đạt.
                    2. Cấu trúc trường 'content' (BẮT BUỘC ĐỦ 4 Ý a, b, c, d):
                       - Dòng đầu tiên: Nêu tình huống / bối cảnh / đề bài tự luận rõ ràng.
                       - 4 dòng tiếp theo: Chia câu hỏi thành ĐÚNG 4 ý nhỏ đánh dấu lần lượt là:
                         a) <Yêu cầu / câu hỏi ý a>
                         b) <Yêu cầu / câu hỏi ý b>
                         c) <Yêu cầu / câu hỏi ý c>
                         d) <Yêu cầu / câu hỏi ý d>
                    3. Cấu trúc trường 'answer' (ĐỂ TỰ ĐỘNG HIỂN THỊ BẢNG HƯỚNG DẪN CHẤM 2 CỘT):
                       - BẮT BUỘC chia thành ĐÚNG 4 dòng tương ứng với 4 ý a), b), c), d) của câu hỏi, mỗi dòng kết thúc bằng thang điểm (0,25 điểm mỗi ý, tổng 1,0 điểm):
                         a) <Nội dung đáp án chuẩn xác của ý a> - 0,25 điểm.
                         b) <Nội dung đáp án chuẩn xác của ý b> - 0,25 điểm.
                         c) <Nội dung đáp án chuẩn xác của ý c> - 0,25 điểm.
                         d) <Nội dung đáp án chuẩn xác của ý d> - 0,25 điểm.
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
                    temperature: 0.35,
                    maxOutputTokens: 8192
                }
            });

            const parsed = safeParseJsonArray(response.text);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            throw new Error("Model returned empty or invalid JSON array");
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
            const partPt = (maxPoints / 4).toFixed(2).replace(/\.?0+$/, (m) => m.includes('.') ? ',0' : '').replace('.', ',');
            const unitPtStr = (maxPoints * 0.25).toFixed(2).replace('.', ',');
            const prompt = `Bạn là chuyên gia khảo thí môn Tin học. Hãy tạo "Hướng dẫn chấm" (Đáp án và thang điểm) chi tiết chuẩn hóa cho câu hỏi tự luận sau để hệ thống tự động dựng BẢNG HƯỚNG DẪN CHẤM 2 CỘT (Cột 1: Ý hỏi a, b, c, d | Cột 2: Nội dung đáp án & Điểm):
            
            Câu hỏi:
            """
            ${questionContent}
            """
            Tổng điểm câu hỏi: ${ptsStr} điểm.
            
            Yêu cầu định dạng BẮT BUỘC (KHÔNG dùng bảng Markdown, chỉ xuất đúng 4 dòng a, b, c, d):
            1. Chia đáp án thành ĐÚNG 4 ý thành phần tương ứng lần lượt với 4 ý a), b), c), d) của câu hỏi.
            2. Mỗi ý BẮT BUỘC nằm trên 1 dòng riêng biệt theo đúng cú pháp:
               a) [Nội dung đáp án chi tiết của ý a] - ${unitPtStr} điểm.
               b) [Nội dung đáp án chi tiết của ý b] - ${unitPtStr} điểm.
               c) [Nội dung đáp án chi tiết của ý c] - ${unitPtStr} điểm.
               d) [Nội dung đáp án chi tiết của ý d] - ${unitPtStr} điểm.
            3. Tổng điểm 4 ý a), b), c), d) BẮT BUỘC cộng lại đúng bằng ${ptsStr} điểm.
            4. Chỉ xuất 4 dòng a), b), c), d), không thêm lời dẫn hay ký tự Markdown (**).
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
