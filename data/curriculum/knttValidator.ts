import {
  TextbookLessonMapping,
  KNTTValidationResult,
  KNTTValidationIssue,
  KNTTCoverageReport,
  KNTTGradeCoverage,
  KNTTMultiLessonRequirement,
  GradeLevel
} from './types';
import { CANONICAL_REQUIREMENTS } from './requirements';
import { CURRICULUM } from '../curriculum';
import { KNTT_LESSON_MAPPINGS } from './knttMapping';

/**
 * Validates KNTT textbook mappings against canonical curriculum and legacy data.
 * Checks all 10 conditions specified in TASK 005 Section XVII:
 * 1. duplicate lessonId
 * 2. mapping to non-existent lesson
 * 3. mapping to non-existent requirementId
 * 4. grade mismatch between lesson and requirement
 * 5. invalid bookSeries (not 'KNTT')
 * 6. empty requirementIds
 * 7. duplicate requirementId within same mapping
 * 8. unmapped lesson
 * 9. ambiguous mapping
 * 10. orphan legacy criterion
 */
export function validateKNTTMappings(
  mappings: readonly TextbookLessonMapping[] = KNTT_LESSON_MAPPINGS
): KNTTValidationResult {
  const issues: KNTTValidationIssue[] = [];

  const canonicalReqMap = new Map<string, typeof CANONICAL_REQUIREMENTS[0]>();
  CANONICAL_REQUIREMENTS.forEach(r => canonicalReqMap.set(r.id, r));

  // Build lookup of all valid lessons in CURRICULUM.lessonData
  const validCurriculumLessons = new Map<string, { grade: number; title: string }>();
  Object.entries(CURRICULUM.lessonData).forEach(([gStr, list]) => {
    const g = parseInt(gStr, 10);
    list.forEach(title => {
      validCurriculumLessons.set(`${g}_${title.trim()}`, { grade: g, title: title.trim() });
    });
  });

  // Track lessonIds to detect duplicates
  const seenLessonIds = new Set<string>();

  mappings.forEach(m => {
    // Check 1: Duplicate lessonId
    if (seenLessonIds.has(m.lessonId)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_LESSON_ID',
        message: `Trùng lặp lessonId: "${m.lessonId}". Mỗi bài học phải có ID duy nhất.`,
        lessonId: m.lessonId
      });
    } else {
      seenLessonIds.add(m.lessonId);
    }

    // Check 5: Invalid bookSeries
    if (m.bookSeries !== 'KNTT') {
      issues.push({
        severity: 'error',
        code: 'INVALID_BOOK_SERIES',
        message: `Sai bộ sách: "${m.bookSeries}". TASK 005 chỉ hỗ trợ bookSeries = "KNTT".`,
        lessonId: m.lessonId
      });
    }

    // Check 2: Mapping to non-existent lesson in curriculum.ts
    const key = `${m.grade}_${m.lessonTitle.trim()}`;
    if (!validCurriculumLessons.has(key)) {
      issues.push({
        severity: 'error',
        code: 'NONEXISTENT_LESSON',
        message: `Bài học "${m.lessonTitle}" (khối ${m.grade}) không tồn tại trong lessonData của curriculum.ts.`,
        lessonId: m.lessonId
      });
    }

    // Check 6: Empty requirementIds
    if (!m.requirementIds || m.requirementIds.length === 0) {
      issues.push({
        severity: 'error',
        code: 'EMPTY_REQUIREMENTS',
        message: `Bài học "${m.lessonId}" không có bất kì YCCĐ nào được liên kết.`,
        lessonId: m.lessonId
      });
    }

    // Check 7: Duplicate requirementId in same mapping
    if (m.requirementIds) {
      const seenReqsInLesson = new Set<string>();
      m.requirementIds.forEach(reqId => {
        if (seenReqsInLesson.has(reqId)) {
          issues.push({
            severity: 'error',
            code: 'DUPLICATE_REQUIREMENT_IN_LESSON',
            message: `YCCĐ "${reqId}" bị trùng lặp trong cùng bài học "${m.lessonId}".`,
            lessonId: m.lessonId,
            requirementId: reqId
          });
        }
        seenReqsInLesson.add(reqId);

        // Check 3: Mapping to non-existent requirementId
        const req = canonicalReqMap.get(reqId);
        if (!req) {
          issues.push({
            severity: 'error',
            code: 'NONEXISTENT_REQUIREMENT',
            message: `YCCĐ "${reqId}" được ánh xạ tới bài "${m.lessonId}" không tồn tại trong Canonical Curriculum.`,
            lessonId: m.lessonId,
            requirementId: reqId
          });
        } else {
          // Check 4: Grade mismatch
          if (req.grade !== m.grade) {
            issues.push({
              severity: 'error',
              code: 'GRADE_MISMATCH',
              message: `Bất đồng khối lớp: Bài học "${m.lessonId}" thuộc Lớp ${m.grade}, nhưng YCCĐ "${reqId}" thuộc Lớp ${req.grade}.`,
              lessonId: m.lessonId,
              requirementId: reqId
            });
          }
        }
      });
    }

    // Check 8: Unmapped lesson
    if (m.mappingStatus === 'unmapped') {
      issues.push({
        severity: 'warning',
        code: 'UNMAPPED_LESSON',
        message: `Bài học "${m.lessonId}" đang ở trạng thái unmapped.`,
        lessonId: m.lessonId
      });
    }

    // Check 9: Ambiguous mapping in evidence
    if (m.evidence?.criteriaMappings) {
      m.evidence.criteriaMappings.forEach(c => {
        if (c.matchType === 'AMBIGUOUS' || c.matchType === 'NEEDS_REVIEW') {
          issues.push({
            severity: 'warning',
            code: 'AMBIGUOUS_MAPPING',
            message: `Tiêu chí "${c.legacyCriteriaText}" trong bài "${m.lessonId}" có ánh xạ chưa chắc chắn (${c.matchType}).`,
            lessonId: m.lessonId,
            requirementId: c.canonicalRequirementId
          });
        }
      });
    }

  });

  // Check 10: Orphan legacy criterion (criteria in criteriaData not mapped in evidence)
  const mappedEvidenceTexts = new Set<string>();
  mappings.forEach(m => {
    m.evidence?.criteriaMappings?.forEach(c => {
      mappedEvidenceTexts.add(`${m.grade}_${m.lessonTitle.trim()}_${c.legacyCriteriaText.trim()}`);
    });
  });

  const grades = [6, 7, 8, 9] as const;
  grades.forEach(g => {
    const gCritMap = CURRICULUM.criteriaData[g.toString()] || {};
    Object.entries(gCritMap).forEach(([lTitle, lvlMap]) => {
      Object.values(lvlMap).forEach(critList => {
        (critList as string[]).forEach(cText => {
          const critKey = `${g}_${lTitle.trim()}_${cText.trim()}`;
          if (!mappedEvidenceTexts.has(critKey)) {
            issues.push({
              severity: 'warning',
              code: 'ORPHAN_LEGACY_CRITERION',
              message: `Tiêu chí legacy "${cText}" của bài "${lTitle}" (Lớp ${g}) chưa có trong evidence ánh xạ.`
            });
          }
        });
      });
    });
  });

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    issues
  };
}

/**
 * Generates comprehensive coverage report for KNTT textbook mappings.
 * Reports on Sections XIII, XIV, and XV.
 */
export function generateKNTTCoverageReport(
  mappings: readonly TextbookLessonMapping[] = KNTT_LESSON_MAPPINGS
): KNTTCoverageReport {
  const grades: GradeLevel[] = [6, 7, 8, 9];
  const byGrade: Record<GradeLevel, KNTTGradeCoverage> = {} as any;

  const allMappedReqIds = new Set<string>();
  const reqToLessonsMap = new Map<string, TextbookLessonMapping[]>();

  let totalExact = 0;
  let totalNormalized = 0;
  let totalSemantic = 0;
  let totalConfirmed = 0;
  let totalPartial = 0;
  let totalAmbiguous = 0;
  let totalUnmappedCrit = 0;
  let totalLegacyCriteriaCount = 0;

  grades.forEach(g => {
    const gLessons = mappings.filter(m => m.grade === g);
    const gMappedReqIds = new Set<string>();

    let gExact = 0;
    let gNormalized = 0;
    let gSemantic = 0;
    let gConfirmed = 0;
    let gPartial = 0;
    let gAmbiguous = 0;
    let gUnmappedCrit = 0;

    gLessons.forEach(l => {
      l.requirementIds.forEach(rid => {
        allMappedReqIds.add(rid);
        gMappedReqIds.add(rid);

        if (!reqToLessonsMap.has(rid)) {
          reqToLessonsMap.set(rid, []);
        }
        reqToLessonsMap.get(rid)!.push(l);
      });

      if (l.evidence?.criteriaMappings) {
        l.evidence.criteriaMappings.forEach(c => {
          totalLegacyCriteriaCount++;
          if (c.matchType === 'EXACT') {
            gExact++;
            totalExact++;
          } else if (c.matchType === 'NORMALIZED') {
            gNormalized++;
            totalNormalized++;
          } else if (c.matchType === 'CONFIRMED') {
            gConfirmed++;
            totalConfirmed++;
            gSemantic++;
            totalSemantic++;
          } else if (c.matchType === 'PARTIAL_MATCH') {
            gPartial++;
            totalPartial++;
            gSemantic++;
            totalSemantic++;
          } else if (c.matchType === 'SEMANTIC_CONFIDENT') {
            gSemantic++;
            totalSemantic++;
          } else if (c.matchType === 'AMBIGUOUS' || c.matchType === 'NEEDS_REVIEW') {
            gAmbiguous++;
            totalAmbiguous++;
          } else if (c.matchType === 'UNMAPPED') {
            gUnmappedCrit++;
            totalUnmappedCrit++;
          }
        });
      }
    });

    const mappedLessonsCount = gLessons.filter(l => l.mappingStatus === 'verified' && l.requirementIds.length > 0).length;
    const unmappedLessonsCount = gLessons.length - mappedLessonsCount;

    byGrade[g] = {
      grade: g,
      totalLessons: gLessons.length,
      mappedLessons: mappedLessonsCount,
      unmappedLessons: unmappedLessonsCount,
      canonicalRequirementsReferenced: gMappedReqIds.size,
      exactCriteriaCount: gExact,
      normalizedCriteriaCount: gNormalized,
      semanticConfidentCriteriaCount: gSemantic,
      confirmedCriteriaCount: gConfirmed,
      partialMatchCriteriaCount: gPartial,
      ambiguousCriteriaCount: gAmbiguous,
      unmappedCriteriaCount: gUnmappedCrit
    };
  });

  const totalLessons = mappings.length;
  const mappedLessons = mappings.filter(m => m.mappingStatus === 'verified' && m.requirementIds.length > 0).length;
  const unmappedLessons = totalLessons - mappedLessons;

  const totalCanonicalRequirements = CANONICAL_REQUIREMENTS.length;
  const mappedCanonicalRequirements = allMappedReqIds.size;
  const unmappedCanonicalRequirements = totalCanonicalRequirements - mappedCanonicalRequirements;

  // Unmapped canonical requirements list
  const unmappedRequirements = CANONICAL_REQUIREMENTS
    .filter(r => !allMappedReqIds.has(r.id))
    .map(r => r.id);

  // Multi-lesson requirements (Section XV)
  const multiLessonRequirements: KNTTMultiLessonRequirement[] = [];
  reqToLessonsMap.forEach((lessons, reqId) => {
    if (lessons.length > 1) {
      const canonical = CANONICAL_REQUIREMENTS.find(r => r.id === reqId);
      multiLessonRequirements.push({
        requirementId: reqId,
        requirementText: canonical?.requirementText || '',
        grade: canonical?.grade || lessons[0].grade,
        lessonIds: lessons.map(l => l.lessonId),
        lessonTitles: lessons.map(l => l.lessonTitle)
      });
    }
  });

  multiLessonRequirements.sort((a, b) => a.requirementId.localeCompare(b.requirementId));

  return {
    totalLessons,
    mappedLessons,
    unmappedLessons,
    totalCanonicalRequirements,
    mappedCanonicalRequirements,
    unmappedCanonicalRequirements,
    totalLegacyCriteria: totalLegacyCriteriaCount,
    exactCriteriaCount: totalExact,
    normalizedCriteriaCount: totalNormalized,
    semanticConfidentCriteriaCount: totalSemantic,
    confirmedCriteriaCount: totalConfirmed,
    partialMatchCriteriaCount: totalPartial,
    ambiguousCriteriaCount: totalAmbiguous,
    unmappedCriteriaCount: totalUnmappedCrit,
    byGrade,
    multiLessonRequirements,
    unmappedRequirements,
    orphanCriteria: []
  };

}
