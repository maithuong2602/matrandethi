import { ExerciseQuestion, QuestionCurriculumAttachment } from '../../types';
import { 
  CANONICAL_REQUIREMENTS, 
  getLessonById, 
  getLessonByTitle, 
  KNTT_LESSON_MAPPINGS,
  TextbookLessonMapping
} from '../../data/curriculum/index';
import { normalizeTextForComparison } from '../../data/curriculum/reports';
import { 
  QUESTION_BANK_STORAGE_KEY, 
  QuestionBankStoragePayload, 
  isLocalStorageAvailable,
  isValidQuestion
} from '../storage/questionBankStorage';
import { createSafetySnapshot } from '../backup/questionBankBackup';

/**
 * TASK 006A: QUESTION BANK CANONICAL MIGRATION ENGINE & DRY RUN
 * 
 * Provides dry-run analysis and resolution pipeline to simulate attaching
 * CTGDPT 2018 Canonical Requirements (YCCĐ) to existing Question Bank questions
 * WITHOUT mutating user data, changing CURRENT_SCHEMA_VERSION, or saving to storage.
 */

export type MigrationStatus = 
  | 'AUTO_RESOLVED' 
  | 'NEEDS_REVIEW' 
  | 'UNMAPPED' 
  | 'ERROR';

export type MigrationMethod = 
  | 'exact_criterion' 
  | 'lesson_level_unique' 
  | 'single_requirement_lesson' 
  | 'semantic_suggestion' 
  | 'none';

/**
 * Architecture Proposal for Schema v2 Curriculum Attachment
 * (Design preview only - NOT activated in runtime Question Bank in Task 006A)
 */
export interface QuestionCurriculumAttachmentProposal {
  readonly requirementId?: string;
  readonly mappingStatus: 'verified' | 'auto_resolved' | 'needs_review' | 'unmapped';
  readonly mappingMethod: MigrationMethod;
  readonly confidence?: number;
  readonly sourceLessonId?: string;
  readonly sourceCriterionCode?: string;
  readonly notes?: string;
}

export interface QuestionMigrationPreview {
  readonly questionId: string;
  readonly currentData: {
    readonly grade?: number;
    readonly lesson?: string;
    readonly level?: string;
    readonly criteria?: string;
    readonly content?: string;
  };
  readonly proposedRequirementId?: string;
  readonly status: MigrationStatus;
  readonly method: MigrationMethod;
  readonly candidateRequirementIds: readonly string[];
  readonly confidence?: number;
  readonly reason: string;
  readonly sourceLessonId?: string;
  readonly sourceCriterionCode?: string;
}

export interface MigrationPreviewValidationError {
  readonly questionId: string;
  readonly code:
    | 'NONEXISTENT_REQUIREMENT'
    | 'GRADE_MISMATCH'
    | 'NONEXISTENT_LESSON'
    | 'CANDIDATE_GRADE_MISMATCH'
    | 'DUPLICATE_QUESTION_ID'
    | 'AUTO_RESOLVED_MISSING_REQUIREMENT'
    | 'NEEDS_REVIEW_MISSING_CANDIDATES'
    | 'UNMAPPED_HAS_PROPOSED_REQUIREMENT'
    | 'METHOD_STATUS_MISMATCH'
    | 'SILENT_FIRST_CANDIDATE_SELECTION';
  readonly message: string;
}

export interface MigrationPreviewValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly MigrationPreviewValidationError[];
}

export interface MigrationPreviewReport {
  readonly totalQuestions: number;
  readonly autoResolved: number;
  readonly needsReview: number;
  readonly unmapped: number;
  readonly errors: number;
  readonly byGrade: Record<number, {
    readonly total: number;
    readonly autoResolved: number;
    readonly needsReview: number;
    readonly unmapped: number;
    readonly errors: number;
  }>;
  readonly byMethod: Record<MigrationMethod, number>;
  readonly questions: readonly QuestionMigrationPreview[];
  readonly candidateDistribution: Record<string, number>;
  readonly validationResult: MigrationPreviewValidationResult;
}

export interface MigrationContext {
  readonly defaultGrade?: number;
  readonly defaultLesson?: string;
}

// Canonical requirement lookup cache
const canonicalReqMap = new Map<string, typeof CANONICAL_REQUIREMENTS[0]>();
CANONICAL_REQUIREMENTS.forEach(r => canonicalReqMap.set(r.id, r));

/**
 * Normalizes question assessment level (e.g. 'Nhận biết' -> 'NB', 'NB' -> 'NB')
 */
export function normalizeQuestionLevel(rawLevel?: string): 'NB' | 'TH' | 'VD' | 'VDC' | undefined {
  if (!rawLevel) return undefined;
  const upper = rawLevel.trim().toUpperCase();
  if (['NB', 'TH', 'VD', 'VDC'].includes(upper)) {
    return upper as 'NB' | 'TH' | 'VD' | 'VDC';
  }
  const norm = normalizeTextForComparison(rawLevel);
  if (norm.includes('nhan biet')) return 'NB';
  if (norm.includes('thong hieu')) return 'TH';
  if (norm.includes('van dung cao')) return 'VDC';
  if (norm.includes('van dung')) return 'VD';
  return undefined;
}

/**
 * Extracts question grade from metadata or heuristic patterns
 * RULE 7: Không dùng question.id regex làm canonical truth cho grade.
 * Ưu tiên bài học (lesson) và context trước khi xét ID.
 */
export function extractQuestionGrade(
  question: ExerciseQuestion,
  context?: MigrationContext
): number | undefined {
  // 1. Direct grade property
  if (typeof (question as any).grade === 'number') {
    return (question as any).grade;
  }
  // 2. Extracted from question's own lesson string (ưu tiên cao nhất theo Rule 7)
  const ownLesson = (question as any).lesson;
  if (ownLesson) {
    const lMatch = ownLesson.match(/(?:Tin\s*học\s*|TH|Lớp\s*|L)(\d)/i);
    if (lMatch) {
      const parsed = parseInt(lMatch[1], 10);
      if (parsed >= 6 && parsed <= 9) return parsed;
    }
  }
  // 3. Extracted from question ID (question's own identifier)
  const idMatch = question.id.match(/(?:th|grade|lop|l)(\d)/i);
  if (idMatch) {
    const parsed = parseInt(idMatch[1], 10);
    if (parsed >= 6 && parsed <= 9) return parsed;
  }
  // 4. Context default grade (fallback)
  if (typeof context?.defaultGrade === 'number') {
    return context.defaultGrade;
  }
  // 5. Context default lesson (fallback)
  if (context?.defaultLesson) {
    const lMatch = context.defaultLesson.match(/(?:Tin\s*học\s*|TH|Lớp\s*|L)(\d)/i);
    if (lMatch) {
      const parsed = parseInt(lMatch[1], 10);
      if (parsed >= 6 && parsed <= 9) return parsed;
    }
  }
  return undefined;
}

/**
 * Finds KNTT lesson mapping matching question lesson metadata
 */
export function findLessonMappingForQuestion(
  lessonRaw?: string,
  grade?: number
): TextbookLessonMapping | undefined {
  if (!lessonRaw || lessonRaw.trim() === '') return undefined;
  const trimmed = lessonRaw.trim();

  // Try direct ID lookup (e.g. 'KNTT-TH7-B04')
  const byId = getLessonById(trimmed);
  if (byId) return byId;

  // Try title lookup with optional grade
  const byTitle = getLessonByTitle(trimmed, grade as any);
  if (byTitle) return byTitle;

  // Try fuzzy matching by lesson number pattern (e.g. 'Bài 1', 'Bài 01', 'Lesson 1')
  const numMatch = trimmed.match(/(?:Bài|Lesson|B)\s*(\d+[A-B]?)/i);
  if (numMatch && grade) {
    const padded = numMatch[1].padStart(2, '0').toUpperCase();
    const candidateId = `KNTT-TH${grade}-B${padded}`;
    const directNumLesson = getLessonById(candidateId);
    if (directNumLesson) return directNumLesson;
  }

  // Khớp theo tiêu đề bài học chuẩn hóa (e.g. "Tin học 6 - Bài 1: Thông tin và dữ liệu")
  const normRaw = normalizeTextForComparison(trimmed);
  const matched = KNTT_LESSON_MAPPINGS.find(m => {
    if (grade !== undefined && m.grade !== grade) return false;
    const normTitle = normalizeTextForComparison(m.lessonTitle);
    return normRaw.includes(normTitle) || normTitle.includes(normRaw);
  });
  if (matched) return matched;

  return undefined;
}

/**
 * Resolves a single Question to its Canonical Requirement migration preview.
 * 
 * Strict Multi-Level Hierarchy (Section VI):
 * LEVEL 1: Exact Criterion Resolution (Lesson + Criterion Code verified in Task 005C)
 * LEVEL 2: Lesson + Level Resolution (Single unique requirement at that level)
 * LEVEL 3: Single-Requirement Lesson Resolution (Lesson has exactly 1 requirement)
 * LEVEL 4: Semantic Assistance (NEEDS_REVIEW with ranked candidates; never auto-verified)
 * FAIL-SAFE: Never chooses candidates[0] or first candidate!
 */
export function resolveQuestionCanonicalRequirement(
  question: ExerciseQuestion,
  context?: MigrationContext
): QuestionMigrationPreview {
  const grade = extractQuestionGrade(question, context);
  const lessonRaw = (question as any).lesson || context?.defaultLesson;
  const level = normalizeQuestionLevel(question.level);
  const criteriaCode = question.criteria ? question.criteria.trim() : undefined;
  const content = question.content || '';

  const currentData = {
    grade,
    lesson: lessonRaw,
    level,
    criteria: criteriaCode,
    content: content.substring(0, 100)
  };

  // FAIL-SAFE 0: Grade Conflict giữa Question ID và Lesson (Rule 7 & Rule 8)
  const idMatch = question.id.match(/(?:th|grade|lop|l)(\d)/i);
  if (idMatch && grade !== undefined) {
    const idGrade = parseInt(idMatch[1], 10);
    if (idGrade >= 6 && idGrade <= 9 && idGrade !== grade) {
      return {
        questionId: question.id,
        currentData,
        status: 'ERROR',
        method: 'none',
        candidateRequirementIds: [],
        reason: `Xung đột khối lớp (Grade Conflict): Mã câu hỏi mang ký hiệu Lớp ${idGrade} nhưng bài học thuộc Lớp ${grade}. Theo Rule 7 & 8, hệ thống không tự đoán mà gắn cờ để giáo viên kiểm định.`
      };
    }
  }

  // FAIL-SAFE 1: Missing Lesson Metadata
  if (!lessonRaw || lessonRaw.trim() === '') {
    return {
      questionId: question.id,
      currentData,
      status: 'UNMAPPED',
      method: 'none',
      candidateRequirementIds: [],
      reason: 'Thiếu thông tin bài học (lesson) để xác định YCCĐ tương ứng.'
    };
  }

  // Lookup Lesson Mapping
  const lessonMapping = findLessonMappingForQuestion(lessonRaw, grade);
  if (!lessonMapping) {
    return {
      questionId: question.id,
      currentData,
      status: 'UNMAPPED',
      method: 'none',
      candidateRequirementIds: [],
      reason: `Bài học "${lessonRaw}" không tồn tại trong danh mục SGK Kết nối tri thức.`
    };
  }

  // FAIL-SAFE 2: Grade Mismatch
  if (grade !== undefined && grade !== lessonMapping.grade) {
    return {
      questionId: question.id,
      currentData,
      status: 'ERROR',
      method: 'none',
      candidateRequirementIds: [],
      reason: `Bất đồng khối lớp: Câu hỏi khai báo Lớp ${grade} nhưng bài học [${lessonMapping.lessonTitle}] thuộc Lớp ${lessonMapping.grade}.`
    };
  }

  const lessonEvidenceMappings = lessonMapping.evidence?.criteriaMappings || [];

  // =========================================================================
  // LEVEL 1: EXACT CRITERION RESOLUTION
  // =========================================================================
  if (criteriaCode) {
    // Look for exact criterion code within the lesson's verified evidence
    const matchedEvidence = lessonEvidenceMappings.find(
      c => c.legacyCriteriaCode?.trim() === criteriaCode ||
           c.legacyCriteriaText.trim().startsWith(criteriaCode)
    );

    if (matchedEvidence) {
      const targetReqId = matchedEvidence.canonicalRequirementId;

      // SAFETY CASE: TH9-E-007 Financial Functions Progression Check (Section X)
      // B09A (Validation), B10A (COUNTIF), B11A (Logic) are foundational/supporting skills,
      // NOT direct financial formulas (PMT, FV, RATE, NPER, PV).
      if (targetReqId === 'TH9-E-007' && ['KNTT-TH9-B09A', 'KNTT-TH9-B10A', 'KNTT-TH9-B11A'].includes(lessonMapping.lessonId)) {
        return {
          questionId: question.id,
          currentData,
          status: 'NEEDS_REVIEW',
          method: 'semantic_suggestion',
          candidateRequirementIds: ['TH9-E-007'],
          confidence: 0.5,
          sourceLessonId: lessonMapping.lessonId,
          sourceCriterionCode: criteriaCode,
          reason: `Bài học [${lessonMapping.lessonTitle}] là kỹ năng hỗ trợ nền tảng (validation/thống kê/logic), không trực tiếp thực thi hàm tài chính PMT/FV/PV của TH9-E-007. Cần giáo viên thẩm định xem câu hỏi có thuộc nội dung dự án tài chính hay chỉ là kỹ năng công cụ.`
        };
      }

      // SECTION IX: PARTIAL_MATCH Policy
      // Mapping KNTT có 17 PARTIAL_MATCH. Khi attach Question:
      // Không mặc nhiên coi PARTIAL_MATCH = Question VERIFIED/AUTO_RESOLVED nếu evidence không đủ.
      if (matchedEvidence.matchType === 'PARTIAL_MATCH') {
        const hasSpecificEvidence = content && content.trim().length >= 10;
        if (!hasSpecificEvidence) {
          return {
            questionId: question.id,
            currentData,
            status: 'NEEDS_REVIEW',
            method: 'semantic_suggestion',
            candidateRequirementIds: [targetReqId],
            confidence: 0.65,
            sourceLessonId: lessonMapping.lessonId,
            sourceCriterionCode: criteriaCode,
            reason: `Tiêu chí legacy [${criteriaCode}] là PARTIAL_MATCH với YCCĐ ${targetReqId}. Nội dung câu hỏi chưa đủ bằng chứng chi tiết để khẳng định đánh giá trọn vẹn YCCĐ. Cần giáo viên xác nhận.`
          };
        }
      }

      // Safe Auto-Resolve via verified criterion
      return {
        questionId: question.id,
        currentData,
        proposedRequirementId: targetReqId,
        status: 'AUTO_RESOLVED',
        method: 'exact_criterion',
        candidateRequirementIds: [targetReqId],
        confidence: (matchedEvidence.matchType === 'EXACT' || matchedEvidence.matchType === 'CONFIRMED') ? 1.0 : 0.85,
        sourceLessonId: lessonMapping.lessonId,
        sourceCriterionCode: criteriaCode,
        reason: `Khớp chính xác tiêu chí legacy [${criteriaCode}] đã được kiểm định về YCCĐ ${targetReqId} (${matchedEvidence.matchType}).`
      };
    }
  }

  // =========================================================================
  // LEVEL 2: LESSON + LEVEL RESOLUTION
  // =========================================================================
  if (level) {
    // Filter criteria in this lesson matching question level
    const levelMatchingCriteria = lessonEvidenceMappings.filter(
      c => normalizeQuestionLevel(c.legacyLevel) === level
    );

    const uniqueReqIdsAtLevel = Array.from(
      new Set(levelMatchingCriteria.map(c => c.canonicalRequirementId).filter(Boolean))
    );

    // ONLY auto-resolve if exactly ONE canonical requirement corresponds to this level in this lesson
    if (uniqueReqIdsAtLevel.length === 1) {
      const singleReqId = uniqueReqIdsAtLevel[0];

      // Safety check for TH9-E-007 supporting lessons
      if (singleReqId === 'TH9-E-007' && ['KNTT-TH9-B09A', 'KNTT-TH9-B10A', 'KNTT-TH9-B11A'].includes(lessonMapping.lessonId)) {
        return {
          questionId: question.id,
          currentData,
          status: 'NEEDS_REVIEW',
          method: 'semantic_suggestion',
          candidateRequirementIds: ['TH9-E-007'],
          confidence: 0.5,
          sourceLessonId: lessonMapping.lessonId,
          reason: `Bài học [${lessonMapping.lessonTitle}] là kỹ năng hỗ trợ, không thể tự động gán YCCĐ tài chính TH9-E-007 ở mức ${level}.`
        };
      }

      return {
        questionId: question.id,
        currentData,
        proposedRequirementId: singleReqId,
        status: 'AUTO_RESOLVED',
        method: 'lesson_level_unique',
        candidateRequirementIds: [singleReqId],
        confidence: 0.9,
        sourceLessonId: lessonMapping.lessonId,
        reason: `Bài học [${lessonMapping.lessonTitle}] ở mức [${level}] chỉ có duy nhất 1 YCCĐ hợp lệ (${singleReqId}).`
      };
    } else if (uniqueReqIdsAtLevel.length > 1) {
      // Multiple requirements at this level -> MUST NOT choose candidates[0]!
      return {
        questionId: question.id,
        currentData,
        status: 'NEEDS_REVIEW',
        method: 'semantic_suggestion',
        candidateRequirementIds: uniqueReqIdsAtLevel,
        confidence: 0.6,
        sourceLessonId: lessonMapping.lessonId,
        reason: `Bài học [${lessonMapping.lessonTitle}] ở mức [${level}] có ${uniqueReqIdsAtLevel.length} YCCĐ ứng viên khác nhau (${uniqueReqIdsAtLevel.join(', ')}). Cần giáo viên thẩm định để chọn YCCĐ chính xác.`
      };
    }
  }

  // =========================================================================
  // LEVEL 3: SINGLE-REQUIREMENT LESSON RESOLUTION
  // =========================================================================
  if (lessonMapping.requirementIds.length === 1) {
    const singleReqId = lessonMapping.requirementIds[0];

    // Safety check for TH9-E-007 supporting lessons
    if (singleReqId === 'TH9-E-007' && ['KNTT-TH9-B09A', 'KNTT-TH9-B10A', 'KNTT-TH9-B11A'].includes(lessonMapping.lessonId)) {
      return {
        questionId: question.id,
        currentData,
        status: 'NEEDS_REVIEW',
        method: 'semantic_suggestion',
        candidateRequirementIds: ['TH9-E-007'],
        confidence: 0.5,
        sourceLessonId: lessonMapping.lessonId,
        reason: `Bài học [${lessonMapping.lessonTitle}] là kỹ năng công cụ nền tảng, không thể blanket attach YCCĐ tài chính TH9-E-007 mà không có bằng chứng tiêu chí.`
      };
    }

    return {
      questionId: question.id,
      currentData,
      proposedRequirementId: singleReqId,
      status: 'AUTO_RESOLVED',
      method: 'single_requirement_lesson',
      candidateRequirementIds: [singleReqId],
      confidence: 0.85,
      sourceLessonId: lessonMapping.lessonId,
      reason: `Toàn bộ bài học [${lessonMapping.lessonTitle}] chỉ liên kết duy nhất 1 YCCĐ (${singleReqId}) trong CTGDPT 2018.`
    };
  }

  // =========================================================================
  // LEVEL 4: SEMANTIC ASSISTANCE (NEEDS_REVIEW - Never Auto-Verified)
  // =========================================================================
  const allLessonCandidates = [...lessonMapping.requirementIds];

  if (allLessonCandidates.length > 0) {
    return {
      questionId: question.id,
      currentData,
      status: 'NEEDS_REVIEW',
      method: 'semantic_suggestion',
      candidateRequirementIds: allLessonCandidates,
      confidence: 0.5,
      sourceLessonId: lessonMapping.lessonId,
      reason: `Bài học [${lessonMapping.lessonTitle}] có ${allLessonCandidates.length} YCCĐ ứng viên (${allLessonCandidates.join(', ')}). Chưa có đủ siêu dữ liệu (tiêu chí hoặc mức độ duy nhất) để tự động định danh.`
    };
  }

  // =========================================================================
  // FAIL-SAFE: NO CANDIDATES
  // =========================================================================
  return {
    questionId: question.id,
    currentData,
    status: 'UNMAPPED',
    method: 'none',
    candidateRequirementIds: [],
    reason: `Không tìm thấy bất kỳ YCCĐ nào trong bài học [${lessonMapping.lessonTitle}].`
  };
}

/**
 * Validates migration preview results against all 10 integrity rules in Section XXIII
 */
export function validateMigrationPreview(
  previews: readonly QuestionMigrationPreview[]
): MigrationPreviewValidationResult {
  const errors: MigrationPreviewValidationError[] = [];
  const seenQuestionIds = new Set<string>();

  previews.forEach(p => {
    // 5. Duplicate questionId
    if (seenQuestionIds.has(p.questionId)) {
      errors.push({
        questionId: p.questionId,
        code: 'DUPLICATE_QUESTION_ID',
        message: `Trùng lặp questionId: "${p.questionId}".`
      });
    } else {
      seenQuestionIds.add(p.questionId);
    }

    // 6. AUTO_RESOLVED nhưng không có requirementId
    if (p.status === 'AUTO_RESOLVED' && (!p.proposedRequirementId || p.proposedRequirementId.trim() === '')) {
      errors.push({
        questionId: p.questionId,
        code: 'AUTO_RESOLVED_MISSING_REQUIREMENT',
        message: `Câu hỏi "${p.questionId}" có trạng thái AUTO_RESOLVED nhưng không có proposedRequirementId.`
      });
    }

    // 8. UNMAPPED nhưng lại có proposedRequirementId
    if (p.status === 'UNMAPPED' && p.proposedRequirementId) {
      errors.push({
        questionId: p.questionId,
        code: 'UNMAPPED_HAS_PROPOSED_REQUIREMENT',
        message: `Câu hỏi "${p.questionId}" có trạng thái UNMAPPED nhưng lại chứa proposedRequirementId: "${p.proposedRequirementId}".`
      });
    }

    // 7. Check candidateRequirementIds when NEEDS_REVIEW
    if (p.status === 'NEEDS_REVIEW' && p.candidateRequirementIds.length === 0) {
      errors.push({
        questionId: p.questionId,
        code: 'NEEDS_REVIEW_MISSING_CANDIDATES',
        message: `Câu hỏi "${p.questionId}" có trạng thái NEEDS_REVIEW nhưng danh sách candidateRequirementIds lại rỗng.`
      });
    }

    // 9. Method không phù hợp status
    if (p.status === 'AUTO_RESOLVED' && p.method === 'none') {
      errors.push({
        questionId: p.questionId,
        code: 'METHOD_STATUS_MISMATCH',
        message: `Câu hỏi "${p.questionId}" có trạng thái AUTO_RESOLVED nhưng method là "none".`
      });
    }

    // 1. Proposed requirement không tồn tại trong Canonical Curriculum
    if (p.proposedRequirementId) {
      const canonical = canonicalReqMap.get(p.proposedRequirementId);
      if (!canonical) {
        errors.push({
          questionId: p.questionId,
          code: 'NONEXISTENT_REQUIREMENT',
          message: `YCCĐ "${p.proposedRequirementId}" được gán cho câu hỏi "${p.questionId}" không tồn tại trong Canonical Curriculum.`
        });
      } else {
        // 2. Grade mismatch giữa Question và Proposed Requirement
        if (p.currentData.grade !== undefined && canonical.grade !== p.currentData.grade) {
          errors.push({
            questionId: p.questionId,
            code: 'GRADE_MISMATCH',
            message: `Bất đồng khối lớp: Câu hỏi "${p.questionId}" thuộc Lớp ${p.currentData.grade} nhưng YCCĐ "${p.proposedRequirementId}" thuộc Lớp ${canonical.grade}.`
          });
        }
      }
    }

    // 4. Candidate requirement sai grade
    p.candidateRequirementIds.forEach(candId => {
      const candCanonical = canonicalReqMap.get(candId);
      if (!candCanonical) {
        errors.push({
          questionId: p.questionId,
          code: 'NONEXISTENT_REQUIREMENT',
          message: `Candidate YCCĐ "${candId}" của câu hỏi "${p.questionId}" không tồn tại trong Canonical Curriculum.`
        });
      } else if (p.currentData.grade !== undefined && candCanonical.grade !== p.currentData.grade) {
        errors.push({
          questionId: p.questionId,
          code: 'CANDIDATE_GRADE_MISMATCH',
          message: `Candidate YCCĐ "${candId}" thuộc Lớp ${candCanonical.grade}, không khớp với khối lớp ${p.currentData.grade} của câu hỏi "${p.questionId}".`
        });
      }
    });

    // 3. Lesson không tồn tại khi status không phải UNMAPPED hoặc ERROR
    if (p.currentData.lesson && p.status !== 'UNMAPPED' && p.status !== 'ERROR') {
      const lessonMapping = findLessonMappingForQuestion(p.currentData.lesson, p.currentData.grade);
      if (!lessonMapping) {
        errors.push({
          questionId: p.questionId,
          code: 'NONEXISTENT_LESSON',
          message: `Bài học "${p.currentData.lesson}" của câu hỏi "${p.questionId}" không tồn tại trong danh mục SGK Kết nối tri thức.`
        });
      }
    }

    // 10. Check that resolver never silently fell back to candidate[0]
    // If status is AUTO_RESOLVED with multiple candidateRequirementIds
    if (p.candidateRequirementIds.length > 1 && p.status === 'AUTO_RESOLVED') {
      errors.push({
        questionId: p.questionId,
        code: 'SILENT_FIRST_CANDIDATE_SELECTION',
        message: `Phát hiện lỗi nguy hiểm: Câu hỏi "${p.questionId}" có nhiều candidateRequirementIds (${p.candidateRequirementIds.join(', ')}) nhưng lại ở trạng thái AUTO_RESOLVED.`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Runs Migration Dry Run on a list of ExerciseQuestions.
 * 
 * GUARANTEES (Sections I, XIII, XV, XVI):
 * - IMMUTABLE: Never mutates the input array or question objects.
 * - ZERO STORAGE IMPACT: Never saves to localStorage, never calls saveQuestionBank().
 * - NO SCHEMA BUMP: CURRENT_SCHEMA_VERSION remains 1.
 */
export function runQuestionBankMigrationDryRun(
  questions: readonly ExerciseQuestion[],
  context?: MigrationContext
): MigrationPreviewReport {
  // Defensive clone to guarantee zero input mutation
  const previews: QuestionMigrationPreview[] = questions.map(q => {
    // Pass read-only shallow copy to avoid any side-effects
    return resolveQuestionCanonicalRequirement({ ...q }, context);
  });

  const byGrade: Record<number, {
    total: number;
    autoResolved: number;
    needsReview: number;
    unmapped: number;
    errors: number;
  }> = {
    6: { total: 0, autoResolved: 0, needsReview: 0, unmapped: 0, errors: 0 },
    7: { total: 0, autoResolved: 0, needsReview: 0, unmapped: 0, errors: 0 },
    8: { total: 0, autoResolved: 0, needsReview: 0, unmapped: 0, errors: 0 },
    9: { total: 0, autoResolved: 0, needsReview: 0, unmapped: 0, errors: 0 }
  };

  const byMethod: Record<MigrationMethod, number> = {
    exact_criterion: 0,
    lesson_level_unique: 0,
    single_requirement_lesson: 0,
    semantic_suggestion: 0,
    none: 0
  };

  const candidateDistribution: Record<string, number> = {};

  let autoResolved = 0;
  let needsReview = 0;
  let unmapped = 0;
  let errors = 0;

  previews.forEach(p => {
    if (p.status === 'AUTO_RESOLVED') autoResolved++;
    else if (p.status === 'NEEDS_REVIEW') needsReview++;
    else if (p.status === 'UNMAPPED') unmapped++;
    else if (p.status === 'ERROR') errors++;

    byMethod[p.method] = (byMethod[p.method] || 0) + 1;

    if (p.proposedRequirementId) {
      candidateDistribution[p.proposedRequirementId] = (candidateDistribution[p.proposedRequirementId] || 0) + 1;
    }

    const g = p.currentData.grade;
    if (g && byGrade[g]) {
      byGrade[g].total++;
      if (p.status === 'AUTO_RESOLVED') byGrade[g].autoResolved++;
      else if (p.status === 'NEEDS_REVIEW') byGrade[g].needsReview++;
      else if (p.status === 'UNMAPPED') byGrade[g].unmapped++;
      else if (p.status === 'ERROR') byGrade[g].errors++;
    }
  });

  const validationResult = validateMigrationPreview(previews);

  return {
    totalQuestions: questions.length,
    autoResolved,
    needsReview,
    unmapped,
    errors,
    byGrade,
    byMethod,
    questions: previews,
    candidateDistribution,
    validationResult
  };
}

/**
 * TASK 006B: Chuyển đổi một câu hỏi ExerciseQuestion sang Schema v2 với Canonical Curriculum Attachment.
 * 
 * NGUYÊN TẮC BẢO VỆ DỮ LIỆU & SƯ PHẠM (TASK 006B):
 * 1. IDEMPOTENT (Rule 12): Dữ liệu đã là V2 không migrate lại.
 * 2. TEACHER MANUAL OVERRIDE (Rule 6): Mapping thủ công của giáo viên (manual + verified) có ưu tiên
 *    tuyệt đối cao nhất, không bị migration engine ghi đè.
 * 3. NO QUESTION ID REGENERATION (Rule 10): Giữ nguyên 100% question ID, không sinh lại ID.
 * 4. 100% LEGACY PRESERVATION (Rule 9): Toàn bộ các trường legacy (id, content, options, answer,
 *    points, lesson, level, criteria) được bảo toàn nguyên vẹn.
 * 5. ONLY AUTO_RESOLVED GETS REQUIREMENT_ID (Rule 4): Chỉ câu hỏi giải quyết chắc chắn mới nhận requirementId.
 * 6. NO FAKE REQUIREMENT_ID (Rule 5): NEEDS_REVIEW và UNMAPPED không được có requirementId giả.
 * 7. GRADE CONFLICT SAFETY (Rules 7 & 8): Không đoán grade, bất đồng grade -> ERROR / UNMAPPED.
 * 8. REGRESSION SAFETY (Rule 14): Bảo vệ TH9-E-007 (financial) và TH8-E-013 (image progression).
 */
export function migrateQuestionToV2(
  question: ExerciseQuestion,
  context?: MigrationContext
): ExerciseQuestion {
  // RULE 6: Mapping do giáo viên xác nhận thủ công (manual + verified) có ưu tiên cao nhất
  if (question.curriculum) {
    if (question.curriculum.mappingMethod === 'manual' || question.curriculum.mappingStatus === 'verified') {
      return { ...question };
    }
    // RULE 12: Idempotent - Nếu đã có attachment hợp lệ thì giữ nguyên
    if (
      question.curriculum.mappingStatus === 'auto_resolved' ||
      question.curriculum.mappingStatus === 'needs_review' ||
      question.curriculum.mappingStatus === 'unmapped'
    ) {
      return { ...question };
    }
  }

  // Preserve 100% legacy fields (Rule 9 & 10)
  const legacyClone: ExerciseQuestion = { ...question };

  // Resolve canonical curriculum attachment
  const preview = resolveQuestionCanonicalRequirement(question, context);

  let curriculumAttachment: QuestionCurriculumAttachment;

  // RULE 4: Chỉ AUTO_RESOLVED mới được tự động nhận requirementId
  if (preview.status === 'AUTO_RESOLVED' && preview.proposedRequirementId) {
    curriculumAttachment = {
      requirementId: preview.proposedRequirementId,
      mappingStatus: 'auto_resolved',
      mappingMethod: preview.method,
      candidateRequirementIds: [...preview.candidateRequirementIds],
      confidence: preview.confidence,
      sourceLessonId: preview.sourceLessonId,
      sourceCriterionCode: preview.sourceCriterionCode,
      notes: preview.reason
    };
  } else if (preview.status === 'NEEDS_REVIEW') {
    // RULE 5: NEEDS_REVIEW không được có canonical requirementId giả
    curriculumAttachment = {
      requirementId: undefined,
      mappingStatus: 'needs_review',
      mappingMethod: preview.method,
      candidateRequirementIds: [...preview.candidateRequirementIds],
      confidence: preview.confidence,
      sourceLessonId: preview.sourceLessonId,
      sourceCriterionCode: preview.sourceCriterionCode,
      notes: preview.reason
    };
  } else {
    // UNMAPPED or ERROR: RULE 5: UNMAPPED không được có canonical requirementId giả
    curriculumAttachment = {
      requirementId: undefined,
      mappingStatus: 'unmapped',
      mappingMethod: 'none',
      candidateRequirementIds: [],
      notes: preview.reason
    };
  }

  return {
    ...legacyClone,
    curriculum: curriculumAttachment
  };
}

export interface MigrationExecutionOptions {
  context?: MigrationContext;
  createSnapshotFn?: typeof createSafetySnapshot;
  storageKey?: string;
  trigger?: string;
}

export interface MigrationExecutionResult {
  success: boolean;
  status: 'migrated' | 'aborted' | 'rollback' | 'already_v2';
  schemaVersion: number;
  data: ExerciseQuestion[];
  snapshotId?: string;
  snapshotCreated?: boolean;
  aborted?: boolean;
  rollbackPerformed?: boolean;
  readBackVerified?: boolean;
  migratedCount?: number;
  report?: MigrationPreviewReport;
  error?: string;
}

/**
 * Thực thi quy trình di chuyển an toàn toàn vẹn (Atomic Migration Pipeline) từ Schema v1 sang Schema v2:
 * 
 * QUY TRÌNH BẮT BUỘC (Rule 2 & Rule 3):
 * V1 → Safety Snapshot → migrate in-memory → validate V2 → save → read-back verify → rollback nếu lỗi.
 * 
 * Snapshot thất bại hoặc QuotaExceeded → ABORT MIGRATION, tuyệt đối không thay đổi Question Bank.
 */
export function executeQuestionBankMigrationV1ToV2(
  options?: MigrationExecutionOptions
): MigrationExecutionResult {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: [],
      aborted: true,
      snapshotCreated: false,
      error: 'localStorage không khả dụng để thực hiện migration an toàn.'
    };
  }

  const storageKey = options?.storageKey || QUESTION_BANK_STORAGE_KEY;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: [],
      aborted: true,
      snapshotCreated: false,
      error: 'Không tìm thấy dữ liệu Question Bank để migration.'
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: [],
      aborted: true,
      snapshotCreated: false,
      error: 'Dữ liệu trong storage bị lỗi cú pháp JSON. Không thể migration, giữ nguyên storage.'
    };
  }

  // RULE 12: Idempotent - Nếu đã là Schema v2 thì không migrate lại
  if (parsed.schemaVersion === 2) {
    return {
      success: true,
      status: 'already_v2',
      schemaVersion: 2,
      data: parsed.questions || [],
      migratedCount: 0
    };
  }

  if (parsed.schemaVersion !== 1) {
    return {
      success: false,
      status: 'aborted',
      schemaVersion: parsed.schemaVersion,
      data: parsed.questions || [],
      aborted: true,
      snapshotCreated: false,
      error: `Chỉ hỗ trợ migration từ Schema v1 sang v2. Schema hiện tại là: ${parsed.schemaVersion}`
    };
  }

  const v1Questions: ExerciseQuestion[] = parsed.questions || [];

  // =========================================================================
  // BƯỚC 1: SAFETY SNAPSHOT TRƯỚC MIGRATION (RULE 2 & RULE 3)
  // =========================================================================
  const snapshotFn = options?.createSnapshotFn || createSafetySnapshot;
  const snapshotRes = snapshotFn(v1Questions, options?.trigger || 'SCHEMA_V2_MIGRATION', 1);

  if (!snapshotRes.success || !snapshotRes.snapshotId) {
    // RULE 3: Snapshot thất bại hoặc QuotaExceeded → ABORT MIGRATION, tuyệt đối không thay đổi Question Bank
    console.error('[MigrationV2] Không thể tạo Safety Snapshot, ABORT MIGRATION:', snapshotRes.error);
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: v1Questions,
      aborted: true,
      snapshotCreated: false,
      error: `ABORT MIGRATION: Không thể tạo Safety Snapshot trước khi nâng cấp Schema v2 (${snapshotRes.error}). Toàn bộ Question Bank được bảo vệ nguyên vẹn 100%.`
    };
  }

  const snapshotId = snapshotRes.snapshotId;

  // =========================================================================
  // BƯỚC 2: MIGRATE IN-MEMORY
  // =========================================================================
  let migratedQuestions: ExerciseQuestion[];
  let previewReport: MigrationPreviewReport;
  try {
    previewReport = runQuestionBankMigrationDryRun(v1Questions, options?.context);
    if (!previewReport.validationResult.isValid) {
      throw new Error(previewReport.validationResult.errors[0].message);
    }
    migratedQuestions = v1Questions.map(q => migrateQuestionToV2(q, options?.context));
  } catch (migErr: any) {
    console.error('[MigrationV2] Lỗi in-memory migration:', migErr);
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: v1Questions,
      aborted: true,
      snapshotId,
      snapshotCreated: true,
      error: `Lỗi tính toán migration in-memory: ${migErr?.message || migErr}. Storage không bị thay đổi.`
    };
  }

  // =========================================================================
  // BƯỚC 3: VALIDATE V2 TOÀN DIỆN TRƯỚC KHI GHI
  // =========================================================================
  if (migratedQuestions.length !== v1Questions.length) {
    return {
      success: false,
      status: 'aborted',
      schemaVersion: 1,
      data: v1Questions,
      aborted: true,
      snapshotId,
      snapshotCreated: true,
      error: 'Số lượng câu hỏi sau khi migrate không khớp với dữ liệu gốc! Aborting.'
    };
  }

  for (let i = 0; i < migratedQuestions.length; i++) {
    const orig = v1Questions[i];
    const mig = migratedQuestions[i];

    // Kiểm tra Question ID preservation (Rule 10)
    if (mig.id !== orig.id) {
      return {
        success: false,
        status: 'aborted',
        schemaVersion: 1,
        data: v1Questions,
        aborted: true,
        snapshotId,
        snapshotCreated: true,
        error: `Phát hiện ID câu hỏi bị thay đổi tại vị trí ${i}: "${orig.id}" -> "${mig.id}". Aborting.`
      };
    }

    // Kiểm tra legacy fields preservation (Rule 9)
    if (mig.content !== orig.content || mig.level !== orig.level || mig.category !== orig.category) {
      return {
        success: false,
        status: 'aborted',
        schemaVersion: 1,
        data: v1Questions,
        aborted: true,
        snapshotId,
        snapshotCreated: true,
        error: `Phát hiện dữ liệu nội dung câu hỏi "${orig.id}" bị thay đổi! Aborting.`
      };
    }

    // Kiểm tra Rule 5: NEEDS_REVIEW / UNMAPPED không được có requirementId giả
    if (mig.curriculum) {
      if ((mig.curriculum.mappingStatus === 'needs_review' || mig.curriculum.mappingStatus === 'unmapped') && mig.curriculum.requirementId) {
        return {
          success: false,
          status: 'aborted',
          schemaVersion: 1,
          data: v1Questions,
          aborted: true,
          snapshotId,
          snapshotCreated: true,
          error: `Vi phạm nguyên tắc an toàn: Câu hỏi "${mig.id}" có status "${mig.curriculum.mappingStatus}" nhưng lại mang requirementId giả "${mig.curriculum.requirementId}". Aborting.`
        };
      }
    }
  }

  // =========================================================================
  // BƯỚC 4: SAVE V2 TO STORAGE
  // =========================================================================
  const v2Payload: QuestionBankStoragePayload = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    questions: migratedQuestions,
    metadata: {
      totalCount: migratedQuestions.length,
      appVersion: '2.0.0',
      migratedFromVersion: 1,
      migratedAt: new Date().toISOString(),
      safetySnapshotId: snapshotId
    }
  };

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(v2Payload));
  } catch (writeErr: any) {
    // Ghi storage thất bại (ví dụ QuotaExceeded) -> ROLLBACK VỀ V1
    console.error('[MigrationV2] Ghi storage thất bại, tiến hành rollback về V1:', writeErr);
    try {
      window.localStorage.setItem(storageKey, raw);
    } catch {
      // rollback fallback
    }
    return {
      success: false,
      status: 'rollback',
      schemaVersion: 1,
      data: v1Questions,
      snapshotId,
      snapshotCreated: true,
      rollbackPerformed: true,
      error: `Không thể ghi Schema v2 vào storage (${writeErr?.message || writeErr}). Đã rollback về Schema v1 an toàn.`
    };
  }

  // =========================================================================
  // BƯỚC 5: READ-BACK VERIFY & ROLLBACK NẾU LỖI (RULE 2)
  // =========================================================================
  try {
    const readBack = window.localStorage.getItem(storageKey);
    if (!readBack) {
      throw new Error('Read-back rỗng sau khi ghi.');
    }
    const readBackJson = JSON.parse(readBack);
    if (readBackJson.schemaVersion !== 2 || !Array.isArray(readBackJson.questions) || readBackJson.questions.length !== migratedQuestions.length) {
      throw new Error('Dữ liệu read-back không khớp với Schema v2 mong đợi.');
    }
    // Verify question IDs
    for (let i = 0; i < readBackJson.questions.length; i++) {
      if (readBackJson.questions[i].id !== migratedQuestions[i].id) {
        throw new Error(`Read-back verify thất bại: ID câu hỏi thứ ${i} không khớp.`);
      }
    }
  } catch (verifyErr: any) {
    // Read-back verification thất bại -> ROLLBACK VỀ V1
    console.error('[MigrationV2] Read-back verify thất bại, tiến hành rollback về V1:', verifyErr);
    try {
      window.localStorage.setItem(storageKey, raw);
    } catch {
      // rollback fallback
    }
    return {
      success: false,
      status: 'rollback',
      schemaVersion: 1,
      data: v1Questions,
      snapshotId,
      snapshotCreated: true,
      rollbackPerformed: true,
      readBackVerified: false,
      error: `Read-back verify sau khi ghi Schema v2 thất bại (${verifyErr?.message || verifyErr}). Đã rollback về Schema v1.`
    };
  }

  // MIGRATION THÀNH CÔNG TOÀN DIỆN
  return {
    success: true,
    status: 'migrated',
    schemaVersion: 2,
    data: migratedQuestions,
    snapshotId,
    snapshotCreated: true,
    migratedCount: migratedQuestions.length,
    readBackVerified: true,
    report: previewReport
  };
}

/**
 * Alias cho resolveQuestionCanonicalRequirement
 */
export const resolveQuestionCurriculum = resolveQuestionCanonicalRequirement;

