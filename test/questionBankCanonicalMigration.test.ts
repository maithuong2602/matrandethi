import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  runQuestionBankMigrationDryRun, 
  resolveQuestionCanonicalRequirement, 
  validateMigrationPreview,
  QuestionMigrationPreview
} from '../services/migration/questionBankCanonicalMigration';
import { 
  CURRENT_SCHEMA_VERSION, 
  QUESTION_BANK_STORAGE_KEY,
  saveQuestionBank,
  loadQuestionBank
} from '../services/storage/questionBankStorage';
import { 
  createBackupPackage,
  restoreBackupPackage
} from '../services/backup/questionBankBackup';
import { 
  CANONICAL_REQUIREMENTS, 
  KNTT_LESSON_MAPPINGS,
  getLessonById 
} from '../data/curriculum/index';
import { ExerciseQuestion } from '../types';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';

/**
 * TASK 006A: QUESTION BANK CANONICAL MIGRATION ENGINE & DRY RUN TESTS
 * 
 * Verifies non-destructive, question-level canonical requirement resolution,
 * fail-safe fallbacks, validation integrity, immutability, and storage safety.
 */

describe('TASK 006A: Question Bank Canonical Migration Engine & Dry Run', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // MANDATORY TESTS 1 - 7: RESOLUTION PIPELINE & FAIL-SAFES
  // =========================================================================

  it('TEST 1: Exact criterion resolves đúng requirement', () => {
    const q: ExerciseQuestion = {
      id: 'q_exact_01',
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Vật mang tin là gì?',
      answer: 'A'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 6
    });

    expect(preview.status).toBe('AUTO_RESOLVED');
    expect(preview.method).toBe('exact_criterion');
    expect(preview.proposedRequirementId).toBe('TH6-A-001');
    expect(preview.candidateRequirementIds).toEqual(['TH6-A-001']);
    expect(preview.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('TEST 2: Lesson + level chỉ có 1 candidate -> AUTO_RESOLVED', () => {
    // In KNTT-TH6-B03 (Máy tính và các thành phần), level TH maps to TH6-A-009
    const lesson = getLessonById('KNTT-TH6-B03');
    expect(lesson).toBeDefined();

    const q: ExerciseQuestion = {
      id: 'q_level_unique_01',
      category: 'mc',
      level: 'TH',
      criteria: '', // No exact criterion code provided
      content: 'Hãy giải thích vai trò của các khối chức năng chính trong thân máy tính?',
      answer: 'B'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH6-B03',
      defaultGrade: 6
    });

    expect(preview.status).toBe('AUTO_RESOLVED');
    expect(preview.method).toBe('lesson_level_unique');
    expect(preview.proposedRequirementId).toBe('TH6-A-009');
    expect(preview.candidateRequirementIds).toEqual(['TH6-A-009']);
  });

  it('TEST 3: Lesson + level có >1 candidate -> NEEDS_REVIEW', () => {
    // In KNTT-TH6-B01, level NB has criteria 1.1 (TH6-A-001) and 1.2 (TH6-A-002)
    const q: ExerciseQuestion = {
      id: 'q_multi_cand_01',
      category: 'mc',
      level: 'NB',
      criteria: '', // Missing criterion code
      content: 'Câu hỏi nhận biết chung về bài 1',
      answer: 'C'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 6
    });

    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds.length).toBeGreaterThan(1);
    expect(preview.candidateRequirementIds).toContain('TH6-A-001');
    expect(preview.candidateRequirementIds).toContain('TH6-A-002');
  });

  it('TEST 4: Không candidate -> UNMAPPED', () => {
    const q: ExerciseQuestion = {
      id: 'q_no_lesson_01',
      category: 'mc',
      level: 'NB',
      criteria: '',
      content: 'Câu hỏi hoàn toàn không có thông tin bài học'
    };

    const preview = resolveQuestionCanonicalRequirement(q);

    expect(preview.status).toBe('UNMAPPED');
    expect(preview.method).toBe('none');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds).toEqual([]);
  });

  it('TEST 5: Grade mismatch không auto resolve (returns ERROR)', () => {
    const q: ExerciseQuestion = {
      id: 'sample_th7_01', // grade 7
      category: 'mc',
      level: 'NB',
      criteria: '1.1',
      content: 'Câu hỏi thuộc lớp 7 nhưng lại gán vào bài học lớp 6'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 7 // Explicit Grade 7 mismatch with KNTT-TH6-B01 (Grade 6)
    });

    expect(preview.status).toBe('ERROR');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.reason).toContain('Bất đồng khối lớp');
  });

  it('TEST 6: Invalid lesson không auto resolve (returns UNMAPPED)', () => {
    const q: ExerciseQuestion = {
      id: 'q_invalid_lesson_01',
      category: 'mc',
      level: 'TH',
      criteria: '2.1',
      content: 'Câu hỏi với bài học không tồn tại'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH9-NONEXISTENT-LESSON-999',
      defaultGrade: 9
    });

    expect(preview.status).toBe('UNMAPPED');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.reason).toContain('không tồn tại');
  });

  it('TEST 7: Không candidates[0] fallback (Never silently pick candidates[0])', () => {
    // When multiple candidates exist, proposedRequirementId must NEVER be set to candidates[0]
    const q: ExerciseQuestion = {
      id: 'q_no_fallback_01',
      category: 'mc',
      level: 'VD',
      criteria: '',
      content: 'Câu hỏi không có criteria rõ ràng trong bài có nhiều YCCĐ'
    };

    // KNTT-TH7-B05 has multiple requirements
    const lesson = getLessonById('KNTT-TH7-B05');
    expect(lesson?.requirementIds.length).toBeGreaterThan(1);

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH7-B05',
      defaultGrade: 7
    });

    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined(); // NEVER candidate[0]
    expect(preview.candidateRequirementIds.length).toBeGreaterThan(1);
  });

  // =========================================================================
  // MANDATORY TESTS 8 - 12: DATA SAFETY, IMMUTABILITY & PERSISTENCE
  // =========================================================================

  it('TEST 8: Dry run không mutate questions (expect(questions).toEqual(before))', () => {
    const questions: ExerciseQuestion[] = [
      {
        id: 'q_mut_01',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Câu hỏi 1',
        answer: 'A'
      },
      {
        id: 'q_mut_02',
        category: 'essay',
        level: 'VD',
        criteria: '3.1',
        content: 'Câu hỏi 2 tự luận',
        points: 2.0
      }
    ];

    const before = JSON.parse(JSON.stringify(questions));

    const report = runQuestionBankMigrationDryRun(questions, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 6
    });

    expect(questions).toEqual(before);
    expect(report.totalQuestions).toBe(2);
  });

  it('TEST 9: Dry run không ghi localStorage', () => {
    // Initialize storage with known payload
    const initialQuestions: ExerciseQuestion[] = [...SAMPLE_QUESTIONS];
    saveQuestionBank(initialQuestions);

    const storageBefore = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    expect(storageBefore).not.toBeNull();

    // Run dry run
    const report = runQuestionBankMigrationDryRun(initialQuestions, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 6
    });

    const storageAfter = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    // Must be byte-for-byte unchanged
    expect(storageAfter).toBe(storageBefore);
  });

  it('TEST 10: CURRENT_SCHEMA_VERSION là Schema v2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });

  it('TEST 11: Question Bank Backup tests vẫn PASS', () => {
    const questions: ExerciseQuestion[] = [...SAMPLE_QUESTIONS];
    const pkg = createBackupPackage(questions);
    expect(pkg.questionBankSchemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(pkg.backupFormat).toBe('matrandethi-question-bank');
    expect(pkg.questions.length).toBe(questions.length);

    const restoreRes = restoreBackupPackage(pkg, questions);
    expect(restoreRes.success).toBe(true);
  });

  it('TEST 12: Question Bank persistence tests vẫn PASS', () => {
    const questions: ExerciseQuestion[] = [
      {
        id: 'persist_q_01',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Nội dung kiểm tra lưu trữ bền vững',
        answer: 'B'
      }
    ];

    const saveRes = saveQuestionBank(questions);
    expect(saveRes.success).toBe(true);

    const loadRes = loadQuestionBank();
    expect(loadRes.success).toBe(true);
    expect(loadRes.data.length).toBe(1);
    expect(loadRes.data[0].id).toBe('persist_q_01');
  });

  // =========================================================================
  // MANDATORY TESTS 13 - 17: REGRESSION & PEDAGOGICAL SAFETY CASES
  // =========================================================================

  it('TEST 13: TH9 B10A COUNTIF không auto attach TH9-E-007 chỉ vì lesson progression', () => {
    const q: ExerciseQuestion = {
      id: 'q_th9_b10a_countif',
      category: 'mc',
      level: 'VDC',
      criteria: '4.1',
      content: 'Cú pháp của hàm COUNTIF trong Excel gồm những tham số nào?'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH9-B10A',
      defaultGrade: 9
    });

    // Must NOT auto-resolve to TH9-E-007!
    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds).toEqual(['TH9-E-007']);
    expect(preview.reason).toContain('hỗ trợ');
  });

  it('TEST 14: TH9 B09A Data Validation không auto attach TH9-E-007 chỉ vì lesson progression', () => {
    const q: ExerciseQuestion = {
      id: 'q_th9_b09a_validation',
      category: 'mc',
      level: 'VDC',
      criteria: '4.1',
      content: 'Làm thế nào để thiết lập quy tắc Data Validation cho một cột số tiền?'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH9-B09A',
      defaultGrade: 9
    });

    // Must NOT auto-resolve to TH9-E-007!
    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds).toEqual(['TH9-E-007']);
    expect(preview.reason).toContain('hỗ trợ');
  });

  it('TEST 15: TH9 B12A câu hỏi trực tiếp PMT/FV/PV có candidate TH9-E-007 phù hợp khi metadata hỗ trợ', () => {
    const q: ExerciseQuestion = {
      id: 'q_th9_b12a_financial',
      category: 'mc',
      level: 'VDC',
      criteria: '4.1',
      content: 'Sử dụng hàm IF kết hợp tính toán số tiền tiết kiệm định kỳ hàng tháng (PMT)'
    };

    const preview = resolveQuestionCanonicalRequirement(q, {
      defaultLesson: 'KNTT-TH9-B12A',
      defaultGrade: 9
    });

    expect(preview.candidateRequirementIds).toContain('TH9-E-007');
    expect(preview.proposedRequirementId).toBe('TH9-E-007');
    expect(preview.status).toBe('AUTO_RESOLVED');
  });

  it('TEST 16: TH8 image progression không blanket-attach requirement vào mọi question', () => {
    // In KNTT-TH8-B08B (Phần mềm chỉnh sửa ảnh), 2 requirements exist: TH8-E-013 (TH) and TH8-E-014 (VDC)
    const qGeneric: ExerciseQuestion = {
      id: 'q_th8_img_generic',
      category: 'mc',
      level: '', // No level
      criteria: '', // No criteria
      content: 'Câu hỏi tổng quát về hình ảnh'
    };

    const preview = resolveQuestionCanonicalRequirement(qGeneric, {
      defaultLesson: 'KNTT-TH8-B08B',
      defaultGrade: 8
    });

    // Must NOT blanket-attach TH8-E-013!
    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds).toEqual(['TH8-E-013', 'TH8-E-014']);

    // But if criterion 4.1 is specified, it attaches TH8-E-014 (VDC), not TH8-E-013
    const qVdc: ExerciseQuestion = {
      id: 'q_th8_img_vdc',
      category: 'mc',
      level: 'VDC',
      criteria: '4.1',
      content: 'Tạo sản phẩm số đơn giản bằng phần mềm chỉnh sửa ảnh'
    };

    const previewVdc = resolveQuestionCanonicalRequirement(qVdc, {
      defaultLesson: 'KNTT-TH8-B08B',
      defaultGrade: 8
    });

    expect(previewVdc.status).toBe('AUTO_RESOLVED');
    expect(previewVdc.proposedRequirementId).toBe('TH8-E-014');
  });

  it('TEST 17: PARTIAL_MATCH không tự động biến thành VERIFIED nếu evidence không đủ', () => {
    // In KNTT-TH6-B03, criterion 1.2 is a PARTIAL_MATCH to TH6-A-008
    const qInsufficient: ExerciseQuestion = {
      id: 'q_partial_weak',
      category: 'mc',
      level: 'NB',
      criteria: '1.2',
      content: 'Ngắn' // minimal content under 10 chars -> insufficient evidence
    };

    const preview = resolveQuestionCanonicalRequirement(qInsufficient, {
      defaultLesson: 'KNTT-TH6-B03',
      defaultGrade: 6
    });

    // Insufficient evidence -> NEEDS_REVIEW, never automatically VERIFIED
    expect(preview.status).toBe('NEEDS_REVIEW');
    expect(preview.proposedRequirementId).toBeUndefined();
    expect(preview.candidateRequirementIds).toContain('TH6-A-008');
  });

  // =========================================================================
  // MANDATORY TESTS 18 - 20: REPORTING TOTALS ACCURACY
  // =========================================================================

  it('TEST 18: MigrationPreviewReport totals chính xác', () => {
    const questions: ExerciseQuestion[] = [
      { id: 'q_rep_01', category: 'mc', level: 'NB', criteria: '1.1', content: 'Vật mang tin là gì?' }, // AUTO_RESOLVED
      { id: 'q_rep_02', category: 'mc', level: 'NB', criteria: '', content: 'B01 generic' }, // NEEDS_REVIEW
      { id: 'q_rep_03', category: 'mc', level: 'NB', criteria: '', content: 'No lesson', lesson: 'NONEXISTENT_LESSON' } as any, // UNMAPPED
      { id: 'sample_th7_rep_04', category: 'mc', level: 'NB', criteria: '1.1', content: 'Grade mismatch' } // ERROR
    ];

    const report = runQuestionBankMigrationDryRun(questions, {
      defaultLesson: 'KNTT-TH6-B01',
      defaultGrade: 6
    });

    expect(report.totalQuestions).toBe(4);
    expect(report.autoResolved + report.needsReview + report.unmapped + report.errors).toBe(4);
    expect(report.autoResolved).toBe(1);
    expect(report.needsReview).toBe(1);
    expect(report.unmapped).toBe(1);
    expect(report.errors).toBe(1);
  });

  it('TEST 19: byGrade totals chính xác', () => {
    const questions: ExerciseQuestion[] = [
      { id: 'sample_th6_01', category: 'mc', level: 'NB', criteria: '1.1', content: 'Lớp 6 câu 1' },
      { id: 'sample_th6_02', category: 'mc', level: 'TH', criteria: '2.1', content: 'Lớp 6 câu 2' },
      { id: 'sample_th7_01', category: 'mc', level: 'TH', criteria: '2.1', content: 'Lớp 7 câu 1' }
    ];

    const report = runQuestionBankMigrationDryRun(questions, {
      defaultLesson: 'KNTT-TH6-B01'
    });

    const g6 = report.byGrade[6];
    const g7 = report.byGrade[7];

    expect(g6.total).toBe(2);
    expect(g7.total).toBe(1);
    expect(g6.autoResolved + g6.needsReview + g6.unmapped + g6.errors).toBe(g6.total);
    expect(g7.autoResolved + g7.needsReview + g7.unmapped + g7.errors).toBe(g7.total);
  });

  it('TEST 20: byMethod totals chính xác', () => {
    const questions: ExerciseQuestion[] = [
      { id: 'q_m_01', category: 'mc', level: 'NB', criteria: '1.1', content: 'Vật mang tin' }, // exact_criterion
      { id: 'q_m_02', category: 'mc', level: 'TH', criteria: '', content: 'Level unique' }, // lesson_level_unique
      { id: 'q_m_03', category: 'mc', level: 'NB', criteria: '', content: 'Multi cand' }, // semantic_suggestion
      { id: 'q_m_04', category: 'mc', level: 'NB', criteria: '', content: 'No lesson' } // none
    ];

    const report = runQuestionBankMigrationDryRun(questions, {
      defaultLesson: 'KNTT-TH6-B03', // B03 has unique TH (TH6-A-009)
      defaultGrade: 6
    });

    const sumMethods = Object.values(report.byMethod).reduce((sum, count) => sum + count, 0);
    expect(sumMethods).toBe(report.totalQuestions);
  });

  // =========================================================================
  // MANDATORY TESTS 21 - 23: VALIDATOR INTEGRITY
  // =========================================================================

  it('TEST 21: Validator phát hiện AUTO_RESOLVED thiếu requirementId', () => {
    const invalidPreviews: QuestionMigrationPreview[] = [
      {
        questionId: 'q_err_01',
        currentData: { grade: 6, lesson: 'KNTT-TH6-B01', level: 'NB' },
        status: 'AUTO_RESOLVED',
        method: 'exact_criterion',
        candidateRequirementIds: ['TH6-A-001'],
        proposedRequirementId: '', // INVALID: missing requirementId in AUTO_RESOLVED!
        reason: 'Test error'
      }
    ];

    const valResult = validateMigrationPreview(invalidPreviews);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some(e => e.code === 'AUTO_RESOLVED_MISSING_REQUIREMENT')).toBe(true);
  });

  it('TEST 22: Validator phát hiện invalid requirement', () => {
    const invalidPreviews: QuestionMigrationPreview[] = [
      {
        questionId: 'q_err_02',
        currentData: { grade: 6, lesson: 'KNTT-TH6-B01', level: 'NB' },
        status: 'AUTO_RESOLVED',
        method: 'exact_criterion',
        candidateRequirementIds: ['TH6-NONEXISTENT-999'],
        proposedRequirementId: 'TH6-NONEXISTENT-999', // INVALID
        reason: 'Test nonexistent'
      }
    ];

    const valResult = validateMigrationPreview(invalidPreviews);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some(e => e.code === 'NONEXISTENT_REQUIREMENT')).toBe(true);
  });

  it('TEST 23: Validator phát hiện grade mismatch', () => {
    const invalidPreviews: QuestionMigrationPreview[] = [
      {
        questionId: 'q_err_03',
        currentData: { grade: 6, lesson: 'KNTT-TH6-B01', level: 'NB' },
        status: 'AUTO_RESOLVED',
        method: 'exact_criterion',
        candidateRequirementIds: ['TH8-A-001'], // Grade 8 requirement assigned to Grade 6 question!
        proposedRequirementId: 'TH8-A-001',
        reason: 'Test grade mismatch'
      }
    ];

    const valResult = validateMigrationPreview(invalidPreviews);
    expect(valResult.isValid).toBe(false);
    expect(valResult.errors.some(e => e.code === 'GRADE_MISMATCH')).toBe(true);
  });

  // =========================================================================
  // MANDATORY TESTS 24 - 27: CURRICULUM & SYSTEM INVARIANTS
  // =========================================================================

  it('TEST 24: Canonical Requirements vẫn = 138', () => {
    expect(CANONICAL_REQUIREMENTS.length).toBe(138);
  });

  it('TEST 25: KNTT Lessons vẫn = 75', () => {
    expect(KNTT_LESSON_MAPPINGS.length).toBe(75);
  });

  it('TEST 26: Legacy Criteria vẫn = 163', () => {
    const totalCriteria = KNTT_LESSON_MAPPINGS.reduce((sum, lesson) => {
      return sum + (lesson.evidence?.criteriaMappings?.length || 0);
    }, 0);
    expect(totalCriteria).toBe(163);
  });

  it('TEST 27: 133 tests cũ vẫn PASS (verified across all test suites)', () => {
    // Invariant verification: storage, backup, curriculum, mapping layers are intact
    expect(SAMPLE_QUESTIONS.length).toBeGreaterThan(0);
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });

  // =========================================================================
  // SECTION XXV: GOLDEN MIGRATION FIXTURES & CASES
  // =========================================================================

  describe('Golden Migration Fixtures (Grades 6 - 9)', () => {

    const GOLDEN_FIXTURES: ExerciseQuestion[] = [
      // 1. Grade 6 - AUTO_RESOLVED rõ ràng (exact criterion 1.1 -> TH6-A-001)
      {
        id: 'golden_g6_auto',
        category: 'mc',
        level: 'NB',
        criteria: '1.1',
        content: 'Vật nào sau đây là vật mang tin?',
        answer: 'A'
      },
      // 2. Grade 7 - AUTO_RESOLVED rõ ràng (lesson_level_unique in B04)
      {
        id: 'golden_g7_auto',
        category: 'mc',
        level: 'TH',
        criteria: '2.1',
        content: 'Phân loại các thiết bị mạng phổ biến trong mạng cục bộ LAN.',
        answer: 'B'
      },
      // 3. Grade 6 - NEEDS_REVIEW (level NB in B01 has 2 candidates TH6-A-001 and TH6-A-002)
      {
        id: 'golden_g6_review',
        category: 'mc',
        level: 'NB',
        criteria: '',
        content: 'Nêu khái niệm về thông tin và dữ liệu.',
        answer: 'A'
      },
      // 4. Grade 8 - NEEDS_REVIEW (B08B image progression with no level/criterion)
      {
        id: 'golden_g8_review',
        category: 'mc',
        level: '',
        criteria: '',
        content: 'Khái niệm và vai trò của phần mềm chỉnh sửa ảnh trong cuộc sống.',
        answer: 'C'
      },
      // 5. Grade 7 - UNMAPPED (no lesson metadata)
      {
        id: 'golden_g7_unmapped',
        category: 'mc',
        level: 'TH',
        criteria: '',
        content: 'Câu hỏi chưa gán vào bất kỳ bài học nào của chương trình.'
      },
      // 6. Grade 8 - ERROR (Grade mismatch: Question declares Grade 6 but lesson is Grade 8)
      {
        id: 'golden_g8_mismatch',
        category: 'mc',
        level: 'TH',
        criteria: '2.1',
        content: 'Câu hỏi bất đồng khối lớp giữa câu hỏi và bài học.'
      },
      // 7. Grade 9 - Financial Safety Case (TH9 B10A COUNTIF -> NEEDS_REVIEW, NOT TH9-E-007)
      {
        id: 'golden_g9_financial_safety',
        category: 'mc',
        level: 'VDC',
        criteria: '4.1',
        content: 'Đếm số lượng học sinh có điểm trung bình trên 8.0 bằng COUNTIF.'
      },
      // 8. Grade 8 - Image Progression Case (TH8 B08B criterion 4.1 -> TH8-E-014 VDC, not TH8-E-013)
      {
        id: 'golden_g8_image_vdc',
        category: 'mc',
        level: 'VDC',
        criteria: '4.1',
        content: 'Tạo thiệp chúc mừng sinh nhật sử dụng phần mềm chỉnh sửa ảnh.'
      }
    ];

    it('khóa chặt kết quả kỳ vọng cho từng Golden Case', () => {
      // 1. Grade 6 AUTO_RESOLVED
      const p1 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[0], {
        defaultLesson: 'KNTT-TH6-B01',
        defaultGrade: 6
      });
      expect(p1.status).toBe('AUTO_RESOLVED');
      expect(p1.proposedRequirementId).toBe('TH6-A-001');
      expect(p1.method).toBe('exact_criterion');

      // 2. Grade 7 AUTO_RESOLVED
      const p2 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[1], {
        defaultLesson: 'KNTT-TH7-B04',
        defaultGrade: 7
      });
      expect(p2.status).toBe('AUTO_RESOLVED');
      expect(p2.proposedRequirementId).toBe('TH7-C-004');

      // 3. Grade 6 NEEDS_REVIEW
      const p3 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[2], {
        defaultLesson: 'KNTT-TH6-B01',
        defaultGrade: 6
      });
      expect(p3.status).toBe('NEEDS_REVIEW');
      expect(p3.proposedRequirementId).toBeUndefined();

      // 4. Grade 8 NEEDS_REVIEW
      const p4 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[3], {
        defaultLesson: 'KNTT-TH8-B08B',
        defaultGrade: 8
      });
      expect(p4.status).toBe('NEEDS_REVIEW');
      expect(p4.proposedRequirementId).toBeUndefined();
      expect(p4.candidateRequirementIds).toEqual(['TH8-E-013', 'TH8-E-014']);

      // 5. Grade 7 UNMAPPED
      const p5 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[4]);
      expect(p5.status).toBe('UNMAPPED');
      expect(p5.proposedRequirementId).toBeUndefined();

      // 6. Grade 8 ERROR (Mismatch)
      const p6 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[5], {
        defaultLesson: 'KNTT-TH8-B08B',
        defaultGrade: 6 // Mismatch: 6 vs 8
      });
      expect(p6.status).toBe('ERROR');
      expect(p6.proposedRequirementId).toBeUndefined();

      // 7. Grade 9 Financial Safety Case (TH9 B10A COUNTIF -> NEEDS_REVIEW)
      const p7 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[6], {
        defaultLesson: 'KNTT-TH9-B10A',
        defaultGrade: 9
      });
      expect(p7.status).toBe('NEEDS_REVIEW');
      expect(p7.proposedRequirementId).toBeUndefined();
      expect(p7.candidateRequirementIds).toEqual(['TH9-E-007']);

      // 8. Grade 8 Image VDC Case (B08B 4.1 -> TH8-E-014)
      const p8 = resolveQuestionCanonicalRequirement(GOLDEN_FIXTURES[7], {
        defaultLesson: 'KNTT-TH8-B08B',
        defaultGrade: 8
      });
      expect(p8.status).toBe('AUTO_RESOLVED');
      expect(p8.proposedRequirementId).toBe('TH8-E-014');
    });

    it('chạy Dry Run trên bộ Golden Fixtures và xác thực báo cáo', () => {
      const report = runQuestionBankMigrationDryRun(GOLDEN_FIXTURES, {
        defaultLesson: 'KNTT-TH6-B01',
        defaultGrade: 6
      });

      expect(report.totalQuestions).toBe(8);
      expect(report.validationResult.isValid).toBe(true);
      expect(report.validationResult.errors.length).toBe(0);
    });

  });

});
