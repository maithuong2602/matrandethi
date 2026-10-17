import { GoogleGenAI } from "@google/genai";
import { ApiKeyItem, ApiSystemConfig } from "../types";

const STORAGE_KEYS_POOL = 'matrandethi_api_keys_pool';
const STORAGE_LEGACY_KEY = 'gemini_api_key';
const STORAGE_FALLBACK_SETTING = 'matrandethi_enable_offline_fallback';
const STORAGE_SELECTED_MODEL = 'gemini_model';

export const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash'
];

/**
 * Trả về danh sách tất cả các API key đã được lưu
 */
export const getApiKeyPool = (): ApiKeyItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_POOL);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Backward compatibility: migrate legacy single key if present
    const legacy = localStorage.getItem(STORAGE_LEGACY_KEY);
    if (legacy && legacy.trim()) {
      const initialItem: ApiKeyItem = {
        id: 'key_1',
        key: legacy.trim(),
        label: 'Khóa API Chính',
        status: 'active'
      };
      localStorage.setItem(STORAGE_KEYS_POOL, JSON.stringify([initialItem]));
      return [initialItem];
    }
  } catch (e) {
    console.error('[apiKeyService] Error parsing api key pool:', e);
  }
  return [];
};

/**
 * Lưu danh sách API key (hỗ trợ nhập nhiều key cách nhau bằng dòng mới hoặc dấu phẩy)
 */
export const saveApiKeyPool = (keys: (string | ApiKeyItem)[]): void => {
  if (typeof window === 'undefined') return;

  const sanitized: ApiKeyItem[] = keys
    .map((item, idx) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return {
          id: `key_${idx + 1}_${Date.now()}`,
          key: trimmed,
          label: `Khóa ${idx + 1}`,
          status: 'unknown' as const
        };
      }
      return item.key.trim() ? item : null;
    })
    .filter((x): x is ApiKeyItem => Boolean(x));

  localStorage.setItem(STORAGE_KEYS_POOL, JSON.stringify(sanitized));

  // Sync the first active key into legacy storage for any 3rd party or old references
  if (sanitized.length > 0) {
    localStorage.setItem(STORAGE_LEGACY_KEY, sanitized[0].key);
  } else {
    localStorage.removeItem(STORAGE_LEGACY_KEY);
  }
};

/**
 * Lấy API key khả dụng hiện tại (ưu tiên key đang active, fallback sang env)
 */
export const getActiveApiKey = (): string => {
  const pool = getApiKeyPool();
  const activeItem = pool.find(k => k.status === 'active') || pool.find(k => k.status !== 'invalid') || pool[0];
  if (activeItem && activeItem.key) {
    return activeItem.key;
  }
  // Fallback to process.env if in Vite dev/build
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  }
  return '';
};

/**
 * Đánh dấu trạng thái lỗi cho 1 key và chuyển sang key tiếp theo trong danh sách (Key Rotation)
 */
export const rotateToNextAvailableKey = (failedKey?: string, reason: 'rate_limited' | 'invalid' = 'rate_limited'): string | null => {
  const pool = getApiKeyPool();
  if (pool.length === 0) return null;

  let changed = false;
  if (failedKey) {
    const target = pool.find(k => k.key === failedKey);
    if (target) {
      target.status = reason;
      target.errorCount = (target.errorCount || 0) + 1;
      changed = true;
    }
  }

  // Find another key that isn't invalid or rate_limited
  const next = pool.find(k => k.key !== failedKey && k.status !== 'invalid');
  if (next) {
    next.status = 'active';
    changed = true;
  }

  if (changed && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS_POOL, JSON.stringify(pool));
    if (next) {
      localStorage.setItem(STORAGE_LEGACY_KEY, next.key);
    }
  }

  return next ? next.key : null;
};

/**
 * Kiểm tra xem chế độ Dự phòng Thông minh (Offline Fallback) có được bật không
 * Mặc định: Luôn BẬT (true) để không bao giờ xảy ra tình trạng không tạo được câu hỏi.
 */
export const isOfflineFallbackEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_FALLBACK_SETTING);
  if (stored === null) return true; // Default TRUE
  return stored === 'true';
};

export const setOfflineFallbackEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_FALLBACK_SETTING, String(enabled));
  }
};

/**
 * Kiểm tra trực tiếp tính khả dụng của một API Key (Health check)
 */
export const testGeminiApiKey = async (apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const start = Date.now();
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Khóa API đang để trống.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: FALLBACK_MODELS[0],
      contents: 'Ping. Trả về đúng từ "PONG".',
    });

    const latencyMs = Date.now() - start;
    if (response.text && response.text.length > 0) {
      return { 
        success: true, 
        message: `Kết nối thành công! Phản hồi sau ${latencyMs}ms.`, 
        latencyMs 
      };
    }
    return { success: false, message: 'Không nhận được dữ liệu phản hồi từ máy chủ Gemini.' };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
      return { success: false, message: 'Khóa API đã hết hạn ngạch truy vấn (Rate limit / Quota exceeded - 429).' };
    }
    if (errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('API_KEY_INVALID')) {
      return { success: false, message: 'Khóa API không hợp lệ hoặc đã bị vô hiệu hóa (401/403).' };
    }
    return { success: false, message: `Lỗi kết nối: ${errMsg.slice(0, 100)}` };
  }
};
