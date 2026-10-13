import { describe, it, expect } from 'vitest';

// Canonical curriculum and mapping imports
import {
  CANONICAL_REQUIREMENTS,
  KNTT_LESSON_MAPPINGS,
  getLessonById,
  validateKNTTMappings,
  generateKNTTCoverageReport,
  resolveCriterionMappingSafe,
  CurriculumRequirement
} from '../data/curriculum/index';

// Review Report exports (Source of truth for TASK 005B resolutions)
import {
  KNTT_SEMANTIC_67_REVIEW,
  KNTT_SEMANTIC_REVIEW_STATS
} from '../data/curriculum/reports/knttMappingReview';

// Legacy curriculum source for integrity checks
import { CURRICULUM } from '../data/curriculum';

// Storage schema safety
import { CURRENT_SCHEMA_VERSION } from '../services/storage/questionBankStorage';

describe('TASK 005C: Apply Reviewed Mapping Resolutions Tests', () => {

  // TEST 1: 31/31 resolution đã được apply runtime
  it('TEST 1: 31/31 resolution đã được apply runtime', () => {
    const incorrectReviewRecords = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'INCORRECT');
    expect(incorrectReviewRecords.length).toBe(31);

    incorrectReviewRecords.forEach(rev => {
      const lesson = getLessonById(rev.lessonId);
      expect(lesson).toBeDefined();

      const criterionEvidence = lesson!.evidence?.criteriaMappings?.find(
        c => c.legacyCriteriaText.trim() === rev.legacyCriterionText.trim()
      );
      expect(criterionEvidence).toBeDefined();
      // Must equal resolvedRequirementId, NOT the old incorrect requirementId
      expect(criterionEvidence!.canonicalRequirementId).toBe(rev.resolvedRequirementId);
      expect(criterionEvidence!.matchType).toBe(rev.resolvedMatchType);
      expect(criterionEvidence!.canonicalRequirementId).not.toBe(rev.requirementId);
    });
  });

  // TEST 2: Không runtime criterion mapping nào còn trỏ tới old incorrectRequirementId
  it('TEST 2: Không runtime criterion mapping nào còn trỏ tới old incorrectRequirementId', () => {
    const incorrectReviewRecords = KNTT_SEMANTIC_67_REVIEW.filter(r => r.reviewResult === 'INCORRECT');

    incorrectReviewRecords.forEach(rev => {
      const lesson = getLessonById(rev.lessonId);
      const criterionEvidence = lesson!.evidence?.criteriaMappings?.find(
        c => c.legacyCriteriaText.trim() === rev.legacyCriterionText.trim()
      );
      expect(criterionEvidence).toBeDefined();
      expect(criterionEvidence!.canonicalRequirementId).not.toBe(rev.requirementId);
    });
  });

  // TEST 3: Runtime và review report nhất quán
  it('TEST 3: Runtime và review report nhất quán (mọi resolvedRequirementId = canonicalRequirementId runtime)', () => {
    KNTT_SEMANTIC_67_REVIEW.forEach(rev => {
      const lesson = getLessonById(rev.lessonId);
      expect(lesson).toBeDefined();

      const criterionEvidence = lesson!.evidence?.criteriaMappings?.find(
        c => c.legacyCriteriaText.trim() === rev.legacyCriterionText.trim()
      );
      expect(criterionEvidence).toBeDefined();
      expect(criterionEvidence!.canonicalRequirementId).toBe(rev.resolvedRequirementId);
      expect(criterionEvidence!.matchType).toBe(rev.resolvedMatchType);
    });
  });

  // TEST 4: Grade 6 B03-1.2 → TH6-A-008
  it('TEST 4: Grade 6 B03-1.2 → TH6-A-008 (KHÔNG TH6-A-007)', () => {
    const b03 = getLessonById('KNTT-TH6-B03');
    expect(b03).toBeDefined();

    const c12 = b03!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '1.2');
    expect(c12).toBeDefined();
    expect(c12!.canonicalRequirementId).toBe('TH6-A-008');
    expect(c12!.canonicalRequirementId).not.toBe('TH6-A-007');
    expect(c12!.matchType).toBe('PARTIAL_MATCH');
  });

  // TEST 5: Grade 7 B04 mapping 4 criteria đúng 4 YCCĐ
  it('TEST 5: Grade 7 B04 mapping 4 criteria đúng 4 YCCĐ (TH7-C-002..TH7-C-005)', () => {
    const b04 = getLessonById('KNTT-TH7-B04');
    expect(b04).toBeDefined();

    const c12 = b04!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '1.2');
    const c13 = b04!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '1.3');
    const c21 = b04!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '2.1');
    const c31 = b04!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '3.1');

    expect(c12?.canonicalRequirementId).toBe('TH7-C-002');
    expect(c13?.canonicalRequirementId).toBe('TH7-C-003');
    expect(c21?.canonicalRequirementId).toBe('TH7-C-004');
    expect(c31?.canonicalRequirementId).toBe('TH7-C-005');

    // All must be CONFIRMED
    expect(c12?.matchType).toBe('CONFIRMED');
    expect(c13?.matchType).toBe('CONFIRMED');
    expect(c21?.matchType).toBe('CONFIRMED');
    expect(c31?.matchType).toBe('CONFIRMED');
  });

  // TEST 6: Grade 8 B05-2.2 → TH8-E-002
  it('TEST 6: Grade 8 B05-2.2 → TH8-E-002 (KHÔNG TH8-E-001)', () => {
    const b05 = getLessonById('KNTT-TH8-B05');
    expect(b05).toBeDefined();

    const c22 = b05!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '2.2');
    expect(c22).toBeDefined();
    expect(c22!.canonicalRequirementId).toBe('TH8-E-002');
    expect(c22!.canonicalRequirementId).not.toBe('TH8-E-001');
    expect(c22!.matchType).toBe('CONFIRMED');
  });

  // TEST 7: Grade 8 B05-3.1 → TH8-E-004
  it('TEST 7: Grade 8 B05-3.1 → TH8-E-004 (KHÔNG TH8-E-001)', () => {
    const b05 = getLessonById('KNTT-TH8-B05');
    expect(b05).toBeDefined();

    const c31 = b05!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '3.1');
    expect(c31).toBeDefined();
    expect(c31!.canonicalRequirementId).toBe('TH8-E-004');
    expect(c31!.canonicalRequirementId).not.toBe('TH8-E-001');
    expect(c31!.matchType).toBe('CONFIRMED');
  });

  // TEST 8: Grade 9 B03-2.2 → TH9-C-002
  it('TEST 8: Grade 9 B03-2.2 → TH9-C-002 (KHÔNG TH9-C-001)', () => {
    const b03 = getLessonById('KNTT-TH9-B03');
    expect(b03).toBeDefined();

    const c22 = b03!.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '2.2');
    expect(c22).toBeDefined();
    expect(c22!.canonicalRequirementId).toBe('TH9-C-002');
    expect(c22!.canonicalRequirementId).not.toBe('TH9-C-001');
    expect(c22!.matchType).toBe('CONFIRMED');
  });

  // TEST 9: Fallback candidates[0] không còn được dùng để silently resolve ambiguous semantic mapping
  it('TEST 9: Fallback candidates[0] không còn được dùng - resolveCriterionMappingSafe enforces FAIL-SAFE', () => {
    const mockCandidates: CurriculumRequirement[] = [
      {
        id: 'TH7-A-001',
        subject: 'tinhoc',
        grade: 7,
        topicId: 'TH-A',
        topicName: 'Máy tính và cộng đồng',
        subTopicId: 'TH7-A-S01',
        subTopicName: 'Thiết bị vào - ra',
        requirementText: 'Biết và nhận ra được các thiết bị vào ra trong mô hình thiết bị máy tính...',
        sourceStatus: 'verified'
      },
      {
        id: 'TH7-A-003',
        subject: 'tinhoc',
        grade: 7,
        topicId: 'TH-A',
        topicName: 'Máy tính và cộng đồng',
        subTopicId: 'TH7-A-S01',
        subTopicName: 'Thiết bị vào - ra',
        requirementText: 'Nêu được ví dụ cụ thể về những thao tác không đúng cách sẽ gây ra lỗi...',
        sourceStatus: 'verified'
      }
    ];

    // Ambiguous non-matching criterion with multiple candidates must NEVER return mockCandidates[0]
    const ambiguousResult = resolveCriterionMappingSafe('Một tiêu chí không rõ ràng chưa qua kiểm định', mockCandidates);
    expect(ambiguousResult.canonicalRequirementId).toBe('');
    expect(ambiguousResult.canonicalRequirementId).not.toBe(mockCandidates[0].id);
    expect(ambiguousResult.matchType).toBe('NEEDS_REVIEW');
  });

  // TEST 10: Uncertain mapping trả trạng thái an toàn
  it('TEST 10: Uncertain mapping trả trạng thái an toàn (UNMAPPED hoặc NEEDS_REVIEW)', () => {
    // Empty candidates
    const emptyResult = resolveCriterionMappingSafe('Tiêu chí bất kỳ', []);
    expect(emptyResult.matchType).toBe('UNMAPPED');
    expect(emptyResult.canonicalRequirementId).toBe('');

    // Empty text
    const emptyTextResult = resolveCriterionMappingSafe('', CANONICAL_REQUIREMENTS);
    expect(emptyTextResult.matchType).toBe('UNMAPPED');
    expect(emptyTextResult.canonicalRequirementId).toBe('');

    // Unknown unverified criterion
    const unknownResult = resolveCriterionMappingSafe('Nội dung hoàn toàn không tồn tại trong chương trình', CANONICAL_REQUIREMENTS);
    expect(unknownResult.matchType).toBe('NEEDS_REVIEW');
    expect(unknownResult.canonicalRequirementId).toBe('');
  });

  // TEST 11: 50 CONFIRMED count đúng sau resolution
  it('TEST 11: 50 CONFIRMED count đúng sau resolution', () => {
    let confirmedCount = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      m.evidence?.criteriaMappings?.forEach(c => {
        if (c.matchType === 'CONFIRMED') confirmedCount++;
      });
    });
    expect(confirmedCount).toBe(50);
    expect(confirmedCount).toBe(KNTT_SEMANTIC_REVIEW_STATS.resolvedConfirmedCount);
  });

  // TEST 12: 17 PARTIAL_MATCH count đúng
  it('TEST 12: 17 PARTIAL_MATCH count đúng', () => {
    let partialCount = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      m.evidence?.criteriaMappings?.forEach(c => {
        if (c.matchType === 'PARTIAL_MATCH') partialCount++;
      });
    });
    expect(partialCount).toBe(17);
    expect(partialCount).toBe(KNTT_SEMANTIC_REVIEW_STATS.resolvedPartialMatchCount);

    // Verify the 4 specific partial matches after fix
    const b03_12 = getLessonById('KNTT-TH6-B03')?.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '1.2');
    const b15_32 = getLessonById('KNTT-TH7-B15')?.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '3.2');
    const b16_25 = getLessonById('KNTT-TH7-B16')?.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '2.5');
    const b16_33 = getLessonById('KNTT-TH7-B16')?.evidence?.criteriaMappings?.find(c => c.legacyCriteriaCode === '3.3');

    expect(b03_12?.matchType).toBe('PARTIAL_MATCH');
    expect(b15_32?.matchType).toBe('PARTIAL_MATCH');
    expect(b16_25?.matchType).toBe('PARTIAL_MATCH');
    expect(b16_33?.matchType).toBe('PARTIAL_MATCH');
  });

  // TEST 13: INCORRECT = 0
  it('TEST 13: INCORRECT = 0 trong runtime mapping', () => {
    let incorrectCount = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      m.evidence?.criteriaMappings?.forEach(c => {
        if ((c.matchType as string) === 'INCORRECT') incorrectCount++;
      });
    });
    expect(incorrectCount).toBe(0);
  });

  // TEST 14: AMBIGUOUS/NEEDS_REVIEW không bị tự động tính verified
  it('TEST 14: AMBIGUOUS/NEEDS_REVIEW không bị tự động tính verified', () => {
    let ambiguousOrNeedsReviewCount = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      m.evidence?.criteriaMappings?.forEach(c => {
        if (c.matchType === 'AMBIGUOUS' || c.matchType === 'NEEDS_REVIEW') {
          ambiguousOrNeedsReviewCount++;
        }
      });
    });
    // In clean runtime mapping, all criteria are verified (EXACT, NORMALIZED, CONFIRMED, PARTIAL_MATCH)
    expect(ambiguousOrNeedsReviewCount).toBe(0);

    const validation = validateKNTTMappings();
    expect(validation.isValid).toBe(true);
    expect(validation.issues.filter(i => i.code === 'AMBIGUOUS_MAPPING').length).toBe(0);
  });

  // TEST 15: Canonical Requirement count vẫn = 138
  it('TEST 15: Canonical Requirement count vẫn = 138', () => {
    expect(CANONICAL_REQUIREMENTS.length).toBe(138);
    const uniqueIds = new Set(CANONICAL_REQUIREMENTS.map(r => r.id));
    expect(uniqueIds.size).toBe(138);
  });

  // TEST 16: KNTT lessons vẫn = 75
  it('TEST 16: KNTT lessons vẫn = 75', () => {
    expect(KNTT_LESSON_MAPPINGS.length).toBe(75);
    const uniqueLessonIds = new Set(KNTT_LESSON_MAPPINGS.map(m => m.lessonId));
    expect(uniqueLessonIds.size).toBe(75);
  });

  // TEST 17: Legacy criteria vẫn = 163
  it('TEST 17: Legacy criteria vẫn = 163', () => {
    let totalLegacy = 0;
    ['6', '7', '8', '9'].forEach(g => {
      const gMap = CURRICULUM.criteriaData[g] || {};
      Object.values(gMap).forEach(lvlMap => {
        Object.values(lvlMap).forEach(arr => {
          totalLegacy += (arr as string[]).length;
        });
      });
    });
    expect(totalLegacy).toBe(163);

    let runtimeCriteriaMapped = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      runtimeCriteriaMapped += m.evidence?.criteriaMappings?.length || 0;
    });
    expect(runtimeCriteriaMapped).toBe(163);
  });

  // TEST 18: Question Bank schemaVersion hợp lệ
  it('TEST 18: Question Bank schemaVersion hợp lệ', () => {
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  // TEST 19: Coverage report tính đúng tất cả các chỉ số sau resolution
  it('TEST 19: Coverage report tính đúng tất cả các chỉ số sau resolution', () => {
    const report = generateKNTTCoverageReport();
    expect(report.totalLessons).toBe(75);
    expect(report.mappedLessons).toBe(75);
    expect(report.unmappedLessons).toBe(0);
    expect(report.totalCanonicalRequirements).toBe(138);
    expect(report.mappedCanonicalRequirements).toBe(138);
    expect(report.totalLegacyCriteria).toBe(163);
    expect(report.exactCriteriaCount).toBe(92);
    expect(report.normalizedCriteriaCount).toBe(4);
    expect(report.confirmedCriteriaCount).toBe(50);
    expect(report.partialMatchCriteriaCount).toBe(17);
    expect(report.ambiguousCriteriaCount).toBe(0);
    expect(report.unmappedCriteriaCount).toBe(0);
  });
});
