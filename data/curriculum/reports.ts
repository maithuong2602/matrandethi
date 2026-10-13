import { 
  GradeLevel, 
  CurriculumRequirement, 
  CurriculumTopic, 
  CurriculumSubTopic, 
  CurriculumCoverageReport, 
  GradeCoverageStats, 
  LegacyDiffReport, 
  LegacyDiffItem, 
  DiffStatus 
} from './types';
import { CurriculumData } from '../../types';

/**
 * Generates structured coverage metrics by grade for Canonical Curriculum.
 */
export function generateCoverageReport(
  requirements: ReadonlyArray<CurriculumRequirement>,
  topics: ReadonlyArray<CurriculumTopic>,
  subtopics: ReadonlyArray<CurriculumSubTopic>
): CurriculumCoverageReport {
  const grades: GradeLevel[] = [6, 7, 8, 9];
  const byGrade: Record<GradeLevel, GradeCoverageStats> = {
    6: { grade: 6, topicsCount: 0, subtopicsCount: 0, requirementsCount: 0, verifiedCount: 0, unverifiedCount: 0, sourceRequiredCount: 0 },
    7: { grade: 7, topicsCount: 0, subtopicsCount: 0, requirementsCount: 0, verifiedCount: 0, unverifiedCount: 0, sourceRequiredCount: 0 },
    8: { grade: 8, topicsCount: 0, subtopicsCount: 0, requirementsCount: 0, verifiedCount: 0, unverifiedCount: 0, sourceRequiredCount: 0 },
    9: { grade: 9, topicsCount: 0, subtopicsCount: 0, requirementsCount: 0, verifiedCount: 0, unverifiedCount: 0, sourceRequiredCount: 0 }
  };

  grades.forEach(g => {
    const gradeSubtopics = subtopics.filter(st => st.grade === g);
    const gradeTopicIds = new Set(gradeSubtopics.map(st => st.topicId));
    const gradeReqs = requirements.filter(r => r.grade === g);

    const verified = gradeReqs.filter(r => r.sourceStatus === 'verified').length;
    const unverified = gradeReqs.filter(r => r.sourceStatus === 'existing_unverified').length;
    const sourceRequired = gradeReqs.filter(r => r.sourceStatus === 'source_required').length;

    const verifiedAgainstSource = gradeReqs.filter(r => r.source?.verificationStatus === 'verified_against_official_source').length;
    const needsManualReview = gradeReqs.filter(r => r.source?.verificationStatus === 'needs_manual_review').length;
    const sourceNotFound = gradeReqs.filter(r => r.source?.verificationStatus === 'source_not_found').length;

    byGrade[g] = {
      grade: g,
      topicsCount: gradeTopicIds.size,
      subtopicsCount: gradeSubtopics.length,
      requirementsCount: gradeReqs.length,
      verifiedCount: verified,
      unverifiedCount: unverified,
      sourceRequiredCount: sourceRequired,
      verifiedAgainstSourceCount: verifiedAgainstSource,
      needsManualReviewCount: needsManualReview,
      sourceNotFoundCount: sourceNotFound
    };
  });

  return {
    totalTopics: topics.length,
    totalSubtopics: subtopics.length,
    totalRequirements: requirements.length,
    totalVerified: requirements.filter(r => r.sourceStatus === 'verified').length,
    totalUnverified: requirements.filter(r => r.sourceStatus === 'existing_unverified').length,
    totalSourceRequired: requirements.filter(r => r.sourceStatus === 'source_required').length,
    totalVerifiedAgainstOfficialSource: requirements.filter(r => r.source?.verificationStatus === 'verified_against_official_source').length,
    totalNeedsManualReview: requirements.filter(r => r.source?.verificationStatus === 'needs_manual_review').length,
    totalSourceNotFound: requirements.filter(r => r.source?.verificationStatus === 'source_not_found').length,
    byGrade
  };
}

/**
 * Normalizes text for comparison by removing bullet points, leading codes ("1.1", "2.1"),
 * punctuation, and excessive whitespaces.
 */
export function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[\d.]+\s*/, '') // remove "1.1 ", "2.1 "
    .replace(/^[-–—•\*\+]\s*/, '') // remove dashes/bullets
    .replace(/[\.\,\;\:\!\?\(\)\[\]\{\}\"\'“”‘’]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim();
}

/**
 * Generates a comparative Diff Report between the Canonical Curriculum and legacy data sources
 * (curriculum.ts and matrixConstants.ts).
 */
export function generateLegacyDiffReport(
  canonicalReqs: ReadonlyArray<CurriculumRequirement>,
  legacyCurriculum: CurriculumData,
  legacyRequirementsData: Record<string, any>
): LegacyDiffReport {
  const diffItems: LegacyDiffItem[] = [];
  const grades: GradeLevel[] = [6, 7, 8, 9];
  const gradeLabels: Record<GradeLevel, string> = { 6: 'Lớp 6', 7: 'Lớp 7', 8: 'Lớp 8', 9: 'Lớp 9' };

  // Track matched canonical items
  const matchedCanonicalIds = new Set<string>();

  // 1. Process legacy matrixConstants.ts
  grades.forEach(g => {
    const label = gradeLabels[g];
    const gradeObj = legacyRequirementsData[label] || {};

    Object.keys(gradeObj).forEach(topicName => {
      const subtopicsObj = gradeObj[topicName];
      Object.keys(subtopicsObj).forEach(subtopicName => {
        const rawContent = subtopicsObj[subtopicName] as string;
        const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        lines.forEach(line => {
          const lower = line.toLowerCase();
          // Skip header lines
          if (['nhận biết', 'thông hiểu', 'vận dụng', 'vận dụng cao'].some(lvl => lower.startsWith(lvl)) || lower.startsWith('thông qua')) {
            return;
          }

          const normLine = normalizeTextForComparison(line);
          if (!normLine) return;

          // Find candidate canonical requirements in the same grade
          const candidates = canonicalReqs.filter(r => r.grade === g);
          const exactMatches = candidates.filter(r => normalizeTextForComparison(r.requirementText) === normLine);

          if (exactMatches.length === 1) {
            const match = exactMatches[0];
            matchedCanonicalIds.add(match.id);
            diffItems.push({
              canonicalId: match.id,
              canonicalText: match.requirementText,
              legacyText: line,
              legacySource: 'matrixConstants.ts',
              grade: g,
              status: 'MATCHED'
            });
          } else if (exactMatches.length > 1) {
            diffItems.push({
              legacyText: line,
              legacySource: 'matrixConstants.ts',
              grade: g,
              status: 'AMBIGUOUS_MATCH',
              details: `Khớp với ${exactMatches.length} YCCĐ: ${exactMatches.map(m => m.id).join(', ')}`
            });
          } else {
            // Partial / similar check
            const partialMatches = candidates.filter(r => {
              const normReq = normalizeTextForComparison(r.requirementText);
              return normReq.includes(normLine) || normLine.includes(normReq);
            });

            if (partialMatches.length === 1) {
              const match = partialMatches[0];
              matchedCanonicalIds.add(match.id);
              diffItems.push({
                canonicalId: match.id,
                canonicalText: match.requirementText,
                legacyText: line,
                legacySource: 'matrixConstants.ts',
                grade: g,
                status: 'TEXT_DIFFERENCE',
                details: 'Khác biệt về từ ngữ, ký tự hoặc dấu câu'
              });
            } else if (partialMatches.length > 1) {
              diffItems.push({
                legacyText: line,
                legacySource: 'matrixConstants.ts',
                grade: g,
                status: 'AMBIGUOUS_MATCH',
                details: `Trùng lặp một phần với: ${partialMatches.map(m => m.id).join(', ')}`
              });
            } else {
              diffItems.push({
                legacyText: line,
                legacySource: 'matrixConstants.ts',
                grade: g,
                status: 'ONLY_IN_MATRIX_CONSTANTS'
              });
            }
          }
        });
      });
    });
  });

  // 2. Process legacy curriculum.ts (criteriaData)
  grades.forEach(g => {
    const criteriaObj = legacyCurriculum.criteriaData[String(g)] || {};

    Object.keys(criteriaObj).forEach(lessonName => {
      const levels = criteriaObj[lessonName];
      Object.keys(levels).forEach(levelKey => {
        levels[levelKey].forEach(rawCriteria => {
          const normCrit = normalizeTextForComparison(rawCriteria);
          if (!normCrit) return;

          const candidates = canonicalReqs.filter(r => r.grade === g);
          const exactMatches = candidates.filter(r => normalizeTextForComparison(r.requirementText) === normCrit);

          if (exactMatches.length === 1) {
            const match = exactMatches[0];
            matchedCanonicalIds.add(match.id);
            diffItems.push({
              canonicalId: match.id,
              canonicalText: match.requirementText,
              legacyText: `[${lessonName}][${levelKey}] ${rawCriteria}`,
              legacySource: 'curriculum.ts',
              grade: g,
              status: 'MATCHED'
            });
          } else if (exactMatches.length > 1) {
            diffItems.push({
              legacyText: `[${lessonName}][${levelKey}] ${rawCriteria}`,
              legacySource: 'curriculum.ts',
              grade: g,
              status: 'AMBIGUOUS_MATCH',
              details: `YCCĐ trùng lặp giữa nhiều bài SGK: ${exactMatches.map(m => m.id).join(', ')}`
            });
          } else {
            // Partial check
            const partialMatches = candidates.filter(r => {
              const normReq = normalizeTextForComparison(r.requirementText);
              return normReq.includes(normCrit) || normCrit.includes(normReq);
            });

            if (partialMatches.length >= 1) {
              const match = partialMatches[0];
              matchedCanonicalIds.add(match.id);
              diffItems.push({
                canonicalId: match.id,
                canonicalText: match.requirementText,
                legacyText: `[${lessonName}][${levelKey}] ${rawCriteria}`,
                legacySource: 'curriculum.ts',
                grade: g,
                status: 'TEXT_DIFFERENCE'
              });
            } else {
              diffItems.push({
                legacyText: `[${lessonName}][${levelKey}] ${rawCriteria}`,
                legacySource: 'curriculum.ts',
                grade: g,
                status: 'ONLY_IN_CURRICULUM_TS'
              });
            }
          }
        });
      });
    });
  });

  // 3. Check for Canonical items unmapped in legacy data
  canonicalReqs.forEach(req => {
    if (!matchedCanonicalIds.has(req.id)) {
      diffItems.push({
        canonicalId: req.id,
        canonicalText: req.requirementText,
        grade: req.grade,
        status: 'UNMAPPED',
        details: 'YCCĐ chuẩn chưa có mục ánh xạ tương ứng trong dữ liệu cũ'
      });
    }
  });

  return {
    totalCanonical: canonicalReqs.length,
    matchedCount: diffItems.filter(i => i.status === 'MATCHED').length,
    onlyInCurriculumCount: diffItems.filter(i => i.status === 'ONLY_IN_CURRICULUM_TS').length,
    onlyInMatrixCount: diffItems.filter(i => i.status === 'ONLY_IN_MATRIX_CONSTANTS').length,
    textDifferenceCount: diffItems.filter(i => i.status === 'TEXT_DIFFERENCE').length,
    ambiguousCount: diffItems.filter(i => i.status === 'AMBIGUOUS_MATCH').length,
    unmappedCount: diffItems.filter(i => i.status === 'UNMAPPED').length,
    items: diffItems
  };
}
