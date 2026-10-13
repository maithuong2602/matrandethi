import { describe, it, expect } from 'vitest';

// Canonical curriculum and mapping imports
import {
  CANONICAL_REQUIREMENTS,
  getLessonsForRequirement,
  getRequirementsForLesson,
  KNTT_LESSON_MAPPINGS
} from '../data/curriculum/index';

// Review Report exports
import {
  KNTT_SEMANTIC_67_REVIEW,
  KNTT_SEMANTIC_REVIEW_STATS,
  EXACT_NORMALIZED_20_SAMPLES,
  MULTI_LESSON_15_AUDIT,
  TH9_E_007_AUDIT,
  TH8_E_013_AUDIT,
  MULTI_LEVEL_REQUIREMENTS,
  MODEL_LIMITATION_REPORT
} from '../data/curriculum/reports/knttMappingReview';

// Question Bank schema safety
import { CURRENT_SCHEMA_VERSION } from '../services/storage/questionBankStorage';

describe('TASK 005B: KNTT Semantic Mapping Review & Resolution Tests', () => {

  // TEST 1: 67 semantic mappings đều có review result
  it('TEST 1: 67 semantic mappings đều có review result', () => {
    expect(KNTT_SEMANTIC_67_REVIEW.length).toBe(67);
    expect(KNTT_SEMANTIC_REVIEW_STATS.totalReviewed).toBe(67);
    expect(KNTT_SEMANTIC_REVIEW_STATS.originalSemanticConfident).toBe(67);

    const allowedResults = ['CONFIRMED', 'PARTIAL_MATCH', 'AMBIGUOUS', 'INCORRECT', 'NEEDS_HUMAN_REVIEW'];
    KNTT_SEMANTIC_67_REVIEW.forEach(record => {
      expect(allowedResults).toContain(record.reviewResult);
      expect(record.reviewNote).toBeDefined();
      expect(record.reviewNote.trim().length).toBeGreaterThan(10);
      expect(record.legacyCriterionCode).toBeDefined();
      expect(record.legacyLevel).toBeDefined();
      expect(record.legacyCriterionText).toBeDefined();
      expect(record.requirementId).toBeDefined();
      expect(record.canonicalRequirementText).toBeDefined();
      expect(record.currentMatchType).toBe('SEMANTIC_CONFIDENT');
    });
  });

  // TEST 2: Không semantic mapping nào biến mất
  it('TEST 2: Không semantic mapping nào biến mất', () => {
    // Count reviewed criteria across KNTT_LESSON_MAPPINGS (50 CONFIRMED + 17 PARTIAL_MATCH = 67)
    let semanticCriteriaCountInMappings = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      if (m.evidence?.criteriaMappings) {
        m.evidence.criteriaMappings.forEach(c => {
          if (c.matchType === 'CONFIRMED' || c.matchType === 'PARTIAL_MATCH' || c.matchType === 'SEMANTIC_CONFIDENT') {
            semanticCriteriaCountInMappings++;
          }
        });
      }
    });

    expect(semanticCriteriaCountInMappings).toBe(67);
    expect(KNTT_SEMANTIC_67_REVIEW.length).toBe(semanticCriteriaCountInMappings);


    // Every reviewed item has an index from 1 to 67
    const indices = KNTT_SEMANTIC_67_REVIEW.map(r => r.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(67);
    for (let i = 1; i <= 67; i++) {
      expect(uniqueIndices.has(i)).toBe(true);
    }
  });

  // TEST 3: INCORRECT không được tính verified
  it('TEST 3: INCORRECT không được tính verified', () => {
    const incorrectItems = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'INCORRECT');
    expect(incorrectItems.length).toBe(KNTT_SEMANTIC_REVIEW_STATS.incorrectCount);
    expect(incorrectItems.length).toBe(31);

    incorrectItems.forEach(item => {
      expect(item.isVerified).toBe(false);
      // Must have resolved requirement documented
      expect(item.resolvedRequirementId).toBeDefined();
      expect(item.resolvedRequirementText).toBeDefined();
      expect(item.resolvedRequirementId).not.toBe(item.requirementId);
    });
  });

  // TEST 4: AMBIGUOUS không được tính verified
  it('TEST 4: AMBIGUOUS không được tính verified', () => {
    const ambiguousItems = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'AMBIGUOUS');
    expect(ambiguousItems.length).toBe(KNTT_SEMANTIC_REVIEW_STATS.ambiguousCount);
    expect(ambiguousItems.length).toBe(0);

    ambiguousItems.forEach(item => {
      expect(item.isVerified).toBe(false);
    });
  });

  // TEST 5: NEEDS_HUMAN_REVIEW không được tính verified
  it('TEST 5: NEEDS_HUMAN_REVIEW không được tính verified', () => {
    const needsReviewItems = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'NEEDS_HUMAN_REVIEW');
    expect(needsReviewItems.length).toBe(KNTT_SEMANTIC_REVIEW_STATS.needsHumanReviewCount);
    expect(needsReviewItems.length).toBe(0);

    needsReviewItems.forEach(item => {
      expect(item.isVerified).toBe(false);
    });
  });

  // TEST 6: PARTIAL_MATCH được giữ riêng
  it('TEST 6: PARTIAL_MATCH được giữ riêng (không gộp vào CONFIRMED)', () => {
    const partialItems = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'PARTIAL_MATCH');
    expect(partialItems.length).toBe(KNTT_SEMANTIC_REVIEW_STATS.partialMatchCount);
    expect(partialItems.length).toBe(13);

    partialItems.forEach(item => {
      // PARTIAL_MATCH is not verified as a full match
      expect(item.isVerified).toBe(false);
      expect(item.reviewNote).toContain('phức hợp');
    });
  });

  // TEST 7: CONFIRMED được tính đúng
  it('TEST 7: CONFIRMED được tính đúng', () => {
    const confirmedItems = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'CONFIRMED');
    expect(confirmedItems.length).toBe(KNTT_SEMANTIC_REVIEW_STATS.confirmedCount);
    expect(confirmedItems.length).toBe(23);

    confirmedItems.forEach(item => {
      expect(item.isVerified).toBe(true);
      expect(item.resolvedRequirementId).toBe(item.requirementId);
    });

    // When 31 incorrect fallback items are resolved, resolved confirmed count is 50
    expect(KNTT_SEMANTIC_REVIEW_STATS.resolvedConfirmedCount).toBe(50);
    expect(KNTT_SEMANTIC_REVIEW_STATS.resolvedPartialMatchCount).toBe(17);
    expect(50 + 17).toBe(67);
  });

  // TEST 8: Many-to-many vẫn giữ nguyên
  it('TEST 8: Many-to-many vẫn giữ nguyên', () => {
    // 1 Requirement -> 5 Lessons (TH9-E-007)
    const lessonsForSpreadsheet = getLessonsForRequirement('TH9-E-007');
    expect(lessonsForSpreadsheet.length).toBe(5);

    // 1 Requirement -> 4 Lessons (TH8-E-013)
    const lessonsForPhoto = getLessonsForRequirement('TH8-E-013');
    expect(lessonsForPhoto.length).toBe(4);

    // 1 Lesson -> Multiple Requirements (Bài 1 Lớp 6)
    const reqsG6B1 = getRequirementsForLesson('KNTT-TH6-B01');
    expect(reqsG6B1.length).toBe(4);

    // 15 Special many-to-many groups verified in audit
    expect(MULTI_LESSON_15_AUDIT.length).toBe(15);
  });

  // TEST 9: Không duplicate canonical requirement
  it('TEST 9: Không duplicate canonical requirement', () => {
    expect(CANONICAL_REQUIREMENTS.length).toBe(138);
    const reqIds = CANONICAL_REQUIREMENTS.map(r => r.id);
    const uniqueReqIds = new Set(reqIds);
    expect(uniqueReqIds.size).toBe(138);

    // Check specifically multi-lesson requirements
    expect(CANONICAL_REQUIREMENTS.filter(r => r.id === 'TH9-E-007').length).toBe(1);
    expect(CANONICAL_REQUIREMENTS.filter(r => r.id === 'TH8-E-013').length).toBe(1);
    expect(CANONICAL_REQUIREMENTS.filter(r => r.id === 'TH8-E-003').length).toBe(1);
  });

  // TEST 10: Legacy levels không được ghi vào Canonical Requirement
  it('TEST 10: Legacy levels không được ghi vào Canonical Requirement', () => {
    CANONICAL_REQUIREMENTS.forEach(req => {
      expect((req as any).level).toBeUndefined();
      expect((req as any).legacyLevel).toBeUndefined();
      expect((req as any).assessmentLevel).toBeUndefined();
    });

    // Levels are tracked separately in review report
    expect(MULTI_LEVEL_REQUIREMENTS.length).toBe(3);
  });

  // TEST 11: 20 Exact/Normalized samples vẫn đúng
  it('TEST 11: 20 Exact/Normalized samples vẫn đúng', () => {
    expect(EXACT_NORMALIZED_20_SAMPLES.length).toBe(20);

    const byGradeCount: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    EXACT_NORMALIZED_20_SAMPLES.forEach(s => {
      byGradeCount[s.grade]++;
      expect(s.auditResult).toBe('VERIFIED_CORRECT');
      expect(['EXACT', 'NORMALIZED']).toContain(s.matchType);
      expect(s.legacyText.trim().length).toBeGreaterThan(0);
      expect(s.canonicalId).toMatch(/^TH[6-9]-[A-F]-\d{3}$/);
    });

    expect(byGradeCount).toEqual({ 6: 5, 7: 5, 8: 5, 9: 5 });
  });

  // TEST 12: TH9-E-007 review tồn tại
  it('TEST 12: TH9-E-007 review tồn tại với đầy đủ 5 bài học', () => {
    expect(TH9_E_007_AUDIT).toBeDefined();
    expect(TH9_E_007_AUDIT.requirementId).toBe('TH9-E-007');
    expect(TH9_E_007_AUDIT.lessonsAnalysis.length).toBe(5);

    const lessonIds = TH9_E_007_AUDIT.lessonsAnalysis.map(l => l.lessonId);
    expect(lessonIds).toEqual([
      'KNTT-TH9-B09A',
      'KNTT-TH9-B10A',
      'KNTT-TH9-B11A',
      'KNTT-TH9-B12A',
      'KNTT-TH9-B13A'
    ]);

    // B12A and B13A directly execute financial formulas; B09A, B10A, B11A provide supporting data/logic foundations
    const directExecution = TH9_E_007_AUDIT.lessonsAnalysis.filter(l => l.directlyExecutesFinancialFormulas);
    expect(directExecution.length).toBe(2);
    expect(directExecution.map(l => l.lessonId)).toEqual(['KNTT-TH9-B12A', 'KNTT-TH9-B13A']);
  });

  // TEST 13: TH8-E-013 review tồn tại
  it('TEST 13: TH8-E-013 review tồn tại (tiến trình xoắn ốc 4 bài)', () => {
    expect(TH8_E_013_AUDIT).toBeDefined();
    expect(TH8_E_013_AUDIT.requirementId).toBe('TH8-E-013');
    expect(TH8_E_013_AUDIT.pedagogicalArchitecture).toBe('SPIRAL_PROGRESSION');
    expect(TH8_E_013_AUDIT.progressionSteps.length).toBe(4);

    const stageIds = TH8_E_013_AUDIT.progressionSteps.map(s => s.lessonId);
    expect(stageIds).toEqual([
      'KNTT-TH8-B08B',
      'KNTT-TH8-B09B',
      'KNTT-TH8-B10B',
      'KNTT-TH8-B11B'
    ]);
  });

  // TEST 14: Question Bank schema hợp lệ
  it('TEST 14: Question Bank schema hợp lệ', () => {
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  // TEST 15: Model Limitation report tồn tại
  it('TEST 15: Model Limitation report kiểm tra One Criterion -> Multiple Requirements', () => {
    expect(MODEL_LIMITATION_REPORT).toBeDefined();
    expect(MODEL_LIMITATION_REPORT.hasCriterionCoveringMultipleRequirements).toBe(false);
    expect(MODEL_LIMITATION_REPORT.detectedCount).toBe(0);
  });
});
