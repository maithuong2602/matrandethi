import { CANONICAL_REQUIREMENTS } from './requirements';
import { CANONICAL_TOPICS, CANONICAL_SUBTOPICS } from './topics';
import { CurriculumRequirement, CurriculumTopic, CurriculumSubTopic, GradeLevel } from './types';
import { CURRICULUM } from '../curriculum';
import { REQUIREMENTS_DATA, PREDEFINED_FOLDERS, TOPIC_PERCENTAGES } from '../matrixConstants';
import { normalizeTextForComparison } from './reports';

/**
 * LEGACY CURRICULUM ADAPTER (READ-ONLY BRIDGE)
 * 
 * Provides backwards-compatible bridge and querying interfaces between
 * existing codebase and the new Canonical CTGDPT 2018 Curriculum Data Model.
 * 
 * Guarantees zero breaking changes to existing MatrixBuilder, QuestionManager,
 * and ExamGenerator consumers.
 */

export function getCanonicalRequirementById(id: string): CurriculumRequirement | undefined {
  return CANONICAL_REQUIREMENTS.find(r => r.id === id);
}

export function getRequirementsByGrade(grade: GradeLevel): CurriculumRequirement[] {
  return CANONICAL_REQUIREMENTS.filter(r => r.grade === grade);
}

export function getRequirementsByTopic(topicId: string, grade?: GradeLevel): CurriculumRequirement[] {
  return CANONICAL_REQUIREMENTS.filter(r => r.topicId === topicId && (grade === undefined || r.grade === grade));
}

export function getRequirementsBySubTopic(subTopicId: string): CurriculumRequirement[] {
  return CANONICAL_REQUIREMENTS.filter(r => r.subTopicId === subTopicId);
}

export function getAllCanonicalTopics(): ReadonlyArray<CurriculumTopic> {
  return CANONICAL_TOPICS;
}

export function getAllCanonicalSubTopics(): ReadonlyArray<CurriculumSubTopic> {
  return CANONICAL_SUBTOPICS;
}

/**
 * Searches Canonical Requirements that match a given legacy criteria string.
 */
export function findCanonicalRequirementsForLegacyCriteria(
  criteriaText: string,
  grade: GradeLevel
): CurriculumRequirement[] {
  const normSearch = normalizeTextForComparison(criteriaText);
  if (!normSearch) return [];

  const gradeReqs = getRequirementsByGrade(grade);
  
  // 1. Exact match
  const exact = gradeReqs.filter(r => normalizeTextForComparison(r.requirementText) === normSearch);
  if (exact.length > 0) return exact;

  // 2. Partial containment match
  return gradeReqs.filter(r => {
    const normReq = normalizeTextForComparison(r.requirementText);
    return normReq.includes(normSearch) || normSearch.includes(normReq);
  });
}

/**
 * Accessor for existing legacy curriculum data (Read-only).
 */
export function getLegacyCurriculum(): typeof CURRICULUM {
  return CURRICULUM;
}

/**
 * Accessor for existing legacy matrix data (Read-only).
 */
export function getLegacyMatrixConstants() {
  return {
    REQUIREMENTS_DATA,
    PREDEFINED_FOLDERS,
    TOPIC_PERCENTAGES
  };
}
