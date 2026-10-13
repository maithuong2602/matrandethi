export type GradeLevel = 6 | 7 | 8 | 9;

export type TopicCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type RequirementSourceStatus = 'verified' | 'existing_unverified' | 'source_required';

export type SourceVerificationStatus = 
  | 'verified_against_official_source'
  | 'needs_manual_review'
  | 'source_not_found';

export type SourceMatchStatus = 
  | 'EXACT_MATCH'
  | 'NORMALIZED_MATCH'
  | 'TEXT_DIFFERENCE'
  | 'AMBIGUOUS'
  | 'NOT_FOUND';

export interface RequirementSourceProvenance {
  readonly documentId: string;       // e.g. "32/2018/TT-BGDĐT"
  readonly documentTitle: string;    // "Chương trình Giáo dục phổ thông - Môn Tin học"
  readonly issuedDate?: string;      // "2018-12-26"
  readonly effectiveDate?: string;   // "2019-02-15"
  readonly section?: string;         // e.g. "Mục IV. Yêu cầu cần đạt"
  readonly gradeSection: string;     // e.g. "Lớp 6"
  readonly topicSection: string;     // e.g. "Chủ đề A: Máy tính và cộng đồng"
  readonly subTopicSection: string;  // e.g. "1. Thông tin và dữ liệu"
  readonly sourceLocator: string;    // e.g. "TT32/2018-TH6-A-001"
  readonly officialBulletText: string; // Exact text from official document
  readonly matchStatus: SourceMatchStatus;
  readonly verificationStatus: SourceVerificationStatus;
}

export interface CurriculumTopic {
  readonly id: string; // e.g. 'TH-A'
  readonly code: TopicCode;
  readonly name: string; // e.g. 'Máy tính và cộng đồng'
  readonly description?: string;
}

export interface CurriculumSubTopic {
  readonly id: string; // e.g. 'TH6-A-S01'
  readonly grade: GradeLevel;
  readonly topicId: string; // e.g. 'TH-A'
  readonly code: string; // e.g. '1' or 'S01'
  readonly name: string; // e.g. 'Thông tin và dữ liệu'
}

export interface CurriculumRequirement {
  readonly id: string; // e.g. 'TH6-A-001'
  readonly subject: 'tinhoc';
  readonly grade: GradeLevel;
  readonly topicId: string; // references CurriculumTopic.id
  readonly topicName: string;
  readonly subTopicId: string; // references CurriculumSubTopic.id
  readonly subTopicName: string;
  readonly requirementText: string;
  readonly sourceStatus: RequirementSourceStatus;
  readonly source?: RequirementSourceProvenance;
  readonly metadata?: {
    readonly notes?: string;
    readonly legacyCriteriaCode?: string; // e.g. '1.1' from curriculum.ts for reference
  };
}

export type BookSeries = 'KNTT' | 'CD' | 'CTST';

export type MappingStatus = 'verified' | 'needs_review' | 'unmapped';

export type CriteriaMatchType =
  | 'EXACT'
  | 'NORMALIZED'
  | 'SEMANTIC_CONFIDENT'
  | 'CONFIRMED'
  | 'PARTIAL_MATCH'
  | 'AMBIGUOUS'
  | 'NEEDS_REVIEW'
  | 'UNMAPPED';

export type SemanticReviewResult =
  | 'CONFIRMED'
  | 'PARTIAL_MATCH'
  | 'AMBIGUOUS'
  | 'INCORRECT'
  | 'NEEDS_HUMAN_REVIEW';

export interface CriterionMappingEvidence {
  readonly legacyLevel?: 'NB' | 'TH' | 'VD' | 'VDC' | string;
  readonly legacyCriteriaCode?: string;
  readonly legacyCriteriaText: string;
  readonly canonicalRequirementId: string;
  readonly matchType: CriteriaMatchType;
  readonly notes?: string;
}

export interface TextbookLessonMapping {
  readonly id: string;
  readonly bookSeries: 'KNTT';
  readonly grade: GradeLevel;
  readonly lessonId: string;
  readonly lessonNumber?: string;
  readonly lessonTitle: string;
  readonly requirementIds: readonly string[];
  readonly mappingStatus: MappingStatus;
  readonly evidence?: {
    readonly criteriaMappings?: readonly CriterionMappingEvidence[];
    readonly legacyCriteriaCodes?: readonly string[];
    readonly notes?: string;
  };
}

export interface KNTTValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly code:
    | 'DUPLICATE_LESSON_ID'
    | 'NONEXISTENT_LESSON'
    | 'NONEXISTENT_REQUIREMENT'
    | 'GRADE_MISMATCH'
    | 'INVALID_BOOK_SERIES'
    | 'EMPTY_REQUIREMENTS'
    | 'DUPLICATE_REQUIREMENT_IN_LESSON'
    | 'UNMAPPED_LESSON'
    | 'AMBIGUOUS_MAPPING'
    | 'ORPHAN_LEGACY_CRITERION';
  readonly message: string;
  readonly lessonId?: string;
  readonly requirementId?: string;
}

export interface KNTTValidationResult {
  readonly isValid: boolean;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly issues: readonly KNTTValidationIssue[];
}

export interface KNTTGradeCoverage {
  readonly grade: GradeLevel;
  readonly totalLessons: number;
  readonly mappedLessons: number;
  readonly unmappedLessons: number;
  readonly canonicalRequirementsReferenced: number;
  readonly exactCriteriaCount: number;
  readonly normalizedCriteriaCount: number;
  readonly semanticConfidentCriteriaCount: number;
  readonly confirmedCriteriaCount: number;
  readonly partialMatchCriteriaCount: number;
  readonly ambiguousCriteriaCount: number;
  readonly unmappedCriteriaCount: number;
}

export interface KNTTMultiLessonRequirement {
  readonly requirementId: string;
  readonly requirementText: string;
  readonly grade: GradeLevel;
  readonly lessonIds: readonly string[];
  readonly lessonTitles: readonly string[];
}

export interface KNTTCoverageReport {
  readonly totalLessons: number;
  readonly mappedLessons: number;
  readonly unmappedLessons: number;
  readonly totalCanonicalRequirements: number;
  readonly mappedCanonicalRequirements: number;
  readonly unmappedCanonicalRequirements: number;
  readonly totalLegacyCriteria: number;
  readonly exactCriteriaCount: number;
  readonly normalizedCriteriaCount: number;
  readonly semanticConfidentCriteriaCount: number;
  readonly confirmedCriteriaCount: number;
  readonly partialMatchCriteriaCount: number;
  readonly ambiguousCriteriaCount: number;
  readonly unmappedCriteriaCount: number;
  readonly byGrade: Record<GradeLevel, KNTTGradeCoverage>;
  readonly multiLessonRequirements: readonly KNTTMultiLessonRequirement[];
  readonly unmappedRequirements: readonly string[];
  readonly orphanCriteria: readonly string[];
}



export interface CurriculumValidationError {
  readonly type: 'duplicate_requirement_id' | 'duplicate_topic_id' | 'duplicate_subtopic_id' | 'invalid_grade' | 'missing_topic_id' | 'missing_subtopic_id' | 'empty_requirement_text' | 'nonexistent_topic_reference' | 'nonexistent_subtopic_reference' | 'invalid_id_naming_convention';
  readonly message: string;
  readonly targetId?: string;
}

export interface CurriculumValidationResult {
  readonly isValid: boolean;
  readonly errors: CurriculumValidationError[];
  readonly warnings: string[];
}

export interface GradeCoverageStats {
  readonly grade: GradeLevel;
  readonly topicsCount: number;
  readonly subtopicsCount: number;
  readonly requirementsCount: number;
  readonly verifiedCount: number;
  readonly unverifiedCount: number;
  readonly sourceRequiredCount: number;
  readonly verifiedAgainstSourceCount: number;
  readonly needsManualReviewCount: number;
  readonly sourceNotFoundCount: number;
}

export interface CurriculumCoverageReport {
  readonly totalTopics: number;
  readonly totalSubtopics: number;
  readonly totalRequirements: number;
  readonly totalVerified: number;
  readonly totalUnverified: number;
  readonly totalSourceRequired: number;
  readonly totalVerifiedAgainstOfficialSource: number;
  readonly totalNeedsManualReview: number;
  readonly totalSourceNotFound: number;
  readonly byGrade: Record<GradeLevel, GradeCoverageStats>;
}

export type DiffStatus = 
  | 'MATCHED'
  | 'ONLY_IN_CURRICULUM_TS'
  | 'ONLY_IN_MATRIX_CONSTANTS'
  | 'TEXT_DIFFERENCE'
  | 'AMBIGUOUS_MATCH'
  | 'UNMAPPED';

export interface LegacyDiffItem {
  readonly canonicalId?: string;
  readonly canonicalText?: string;
  readonly legacyText?: string;
  readonly legacySource?: 'curriculum.ts' | 'matrixConstants.ts';
  readonly grade: GradeLevel;
  readonly status: DiffStatus;
  readonly details?: string;
}

export interface LegacyDiffReport {
  readonly totalCanonical: number;
  readonly matchedCount: number;
  readonly onlyInCurriculumCount: number;
  readonly onlyInMatrixCount: number;
  readonly textDifferenceCount: number;
  readonly ambiguousCount: number;
  readonly unmappedCount: number;
  readonly items: LegacyDiffItem[];
}
