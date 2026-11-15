import { SavedExamDossier, ExamAuditEntry } from '../types';
import { getCurrentUser } from './authService';

export const SIMILAR_EXAMS_STORAGE_KEY = 'matrandethi_saved_similar_exams';
const MAX_AUDIT_LOG_ENTRIES = 10;

type SimilarExamChangeListener = () => void;
const listeners: Set<SimilarExamChangeListener> = new Set();

const notifyListeners = () => {
    listeners.forEach(cb => {
        try { cb(); } catch (e) { console.error(e); }
    });
};

export const subscribeSimilarExamChange = (callback: SimilarExamChangeListener): (() => void) => {
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
};

/**
 * Lấy danh sách đề thi trong KHO ĐỀ TƯƠNG TỰ / BIẾN THỂ AI (kho riêng biệt với đề gốc)
 */
export const getSavedSimilarExams = (): SavedExamDossier[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(SIMILAR_EXAMS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch (err) {
        console.error('[similarExamService] Lỗi khi đọc Kho đề tương tự:', err);
    }
    return [];
};

/**
 * Lưu toàn bộ danh sách đề thi tương tự vào localStorage
 */
export const saveAllSimilarExams = (exams: SavedExamDossier[]): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SIMILAR_EXAMS_STORAGE_KEY, JSON.stringify(exams));
    }
    notifyListeners();
};

/**
 * Tìm đề thi tương tự theo ID
 */
export const getSimilarExamById = (id: string): SavedExamDossier | undefined => {
    const list = getSavedSimilarExams();
    return list.find(e => e.id === id);
};

/**
 * Lưu hoặc cập nhật 1 hồ sơ đề thi tương tự vào Kho riêng biệt
 */
export const saveSimilarExamDossier = (dossierData: Partial<SavedExamDossier>): SavedExamDossier => {
    const exams = getSavedSimilarExams();
    const currentUser = getCurrentUser();
    const now = new Date().toISOString();

    let target: SavedExamDossier;
    const existingIdx = dossierData.id ? exams.findIndex(e => e.id === dossierData.id) : -1;

    if (existingIdx >= 0) {
        const existing = exams[existingIdx];
        const updateLog: ExamAuditEntry = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            timestamp: now,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'updated',
            comment: 'Cập nhật đề thi trong Kho đề tương tự'
        };

        target = {
            ...existing,
            ...dossierData,
            updatedAt: now,
            auditLog: [...(existing.auditLog || []), updateLog].slice(-MAX_AUDIT_LOG_ENTRIES)
        } as SavedExamDossier;

        exams[existingIdx] = target;
    } else {
        const id = dossierData.id || ('similar_exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
        const createLog: ExamAuditEntry = {
            id: 'log_' + Date.now(),
            timestamp: now,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'created',
            comment: 'Lưu đề mới vào Kho đề tương tự (AI Generated)'
        };

        target = {
            id,
            title: dossierData.title || `ĐỀ TƯƠNG TỰ - ${new Date().toLocaleDateString('vi-VN')}`,
            grade: dossierData.grade || '7',
            status: dossierData.status || 'approved',
            createdAt: now,
            updatedAt: now,
            createdBy: currentUser.name,
            creatorRole: currentUser.role,
            auditLog: [createLog],
            questions: dossierData.questions || [],
            variants: dossierData.variants || [],
            matrixData: dossierData.matrixData || null,
            headerInfo: dossierData.headerInfo || {},
            teacherName: dossierData.teacherName || currentUser.name,
            ...dossierData
        } as SavedExamDossier;

        exams.unshift(target);
    }

    saveAllSimilarExams(exams);
    return target;
};

/**
 * Xóa 1 đề thi khỏi Kho đề tương tự
 */
export const deleteSimilarExamDossier = (id: string): void => {
    const exams = getSavedSimilarExams();
    const filtered = exams.filter(e => e.id !== id);
    saveAllSimilarExams(filtered);
};

/**
 * Nhân bản 1 đề thi trong Kho đề tương tự
 */
export const duplicateSimilarExamDossier = (id: string): SavedExamDossier | null => {
    const existing = getSimilarExamById(id);
    if (!existing) return null;

    const cloned = JSON.parse(JSON.stringify(existing)) as SavedExamDossier;
    return saveSimilarExamDossier({
        ...cloned,
        id: undefined,
        title: `${existing.title} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

/**
 * Xuất Kho đề tương tự ra file JSON
 */
export const exportSimilarExamBankJson = (singleId?: string): string => {
    const all = getSavedSimilarExams();
    const list = singleId ? all.filter(e => e.id === singleId) : all;
    return JSON.stringify(
        {
            format: 'matrandethi-similar-exam-bank',
            version: 1,
            exportedAt: new Date().toISOString(),
            examCount: list.length,
            exams: list
        },
        null,
        2
    );
};

/**
 * Nhập file JSON vào Kho đề tương tự
 */
export const importSimilarExamBankJson = (
    jsonString: string
): { success: boolean; addedCount: number; updatedCount: number; error?: string } => {
    try {
        const parsed = JSON.parse(jsonString);
        let incoming: SavedExamDossier[] = [];

        if (Array.isArray(parsed)) {
            incoming = parsed;
        } else if (parsed && Array.isArray(parsed.exams)) {
            incoming = parsed.exams;
        } else if (parsed && parsed.id && parsed.title && Array.isArray(parsed.questions)) {
            incoming = [parsed];
        } else {
            return {
                success: false,
                addedCount: 0,
                updatedCount: 0,
                error: 'Tệp JSON không đúng định dạng Kho đề tương tự.'
            };
        }

        const currentExams = getSavedSimilarExams();
        const map = new Map<string, SavedExamDossier>();
        currentExams.forEach(e => map.set(e.id, e));

        let addedCount = 0;
        let updatedCount = 0;

        incoming.forEach(item => {
            if (!item || !item.title) return;
            const itemId = item.id || ('similar_exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
            if (map.has(itemId)) {
                map.set(itemId, { ...map.get(itemId)!, ...item });
                updatedCount++;
            } else {
                map.set(itemId, { ...item, id: itemId });
                addedCount++;
            }
        });

        const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );

        saveAllSimilarExams(merged);
        return { success: true, addedCount, updatedCount };
    } catch (err: any) {
        return {
            success: false,
            addedCount: 0,
            updatedCount: 0,
            error: err.message || 'Lỗi khi đọc file JSON.'
        };
    }
};
