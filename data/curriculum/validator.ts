import { 
  CurriculumTopic, 
  CurriculumSubTopic, 
  CurriculumRequirement, 
  CurriculumValidationResult, 
  CurriculumValidationError 
} from './types';

export const REQUIREMENT_ID_REGEX = /^TH[6-9]-[A-G]-\d{3}$/;
export const TOPIC_ID_REGEX = /^TH-[A-G]$/;
export const SUBTOPIC_ID_REGEX = /^TH[6-9]-[A-G]-S\d{2}$/;

/**
 * Validates canonical curriculum entities against CTGDPT 2018 standards and integrity constraints.
 * Pure diagnostic validator - does not mutate data.
 */
export function validateCanonicalCurriculum(
  topics: ReadonlyArray<CurriculumTopic>,
  subtopics: ReadonlyArray<CurriculumSubTopic>,
  requirements: ReadonlyArray<CurriculumRequirement>
): CurriculumValidationResult {
  const errors: CurriculumValidationError[] = [];
  const warnings: string[] = [];

  const topicIds = new Set<string>();
  const subtopicIds = new Set<string>();
  const requirementIds = new Set<string>();

  // 1. Validate Topics
  topics.forEach(t => {
    if (!t.id || !TOPIC_ID_REGEX.test(t.id)) {
      errors.push({
        type: 'invalid_id_naming_convention',
        message: `Mã chủ đề (topicId) "${t.id}" không đúng quy tắc đặt tên (VD: TH-A).`,
        targetId: t.id
      });
    }

    if (topicIds.has(t.id)) {
      errors.push({
        type: 'duplicate_topic_id',
        message: `Trùng lặp mã chủ đề (topicId): "${t.id}".`,
        targetId: t.id
      });
    }
    topicIds.add(t.id);

    if (!t.name || t.name.trim().length === 0) {
      warnings.push(`Chủ đề "${t.id}" có tên rỗng hoặc chỉ chứa khoảng trắng.`);
    }
  });

  // 2. Validate SubTopics
  subtopics.forEach(st => {
    if (!st.id || !SUBTOPIC_ID_REGEX.test(st.id)) {
      errors.push({
        type: 'invalid_id_naming_convention',
        message: `Mã mạch nội dung con (subTopicId) "${st.id}" không đúng quy tắc đặt tên (VD: TH6-A-S01).`,
        targetId: st.id
      });
    }

    if (subtopicIds.has(st.id)) {
      errors.push({
        type: 'duplicate_subtopic_id',
        message: `Trùng lặp mã mạch nội dung con (subTopicId): "${st.id}".`,
        targetId: st.id
      });
    }
    subtopicIds.add(st.id);

    if (!topicIds.has(st.topicId)) {
      errors.push({
        type: 'nonexistent_topic_reference',
        message: `Subtopic "${st.id}" tham chiếu đến topicId không tồn tại: "${st.topicId}".`,
        targetId: st.id
      });
    }

    if (![6, 7, 8, 9].includes(st.grade)) {
      errors.push({
        type: 'invalid_grade',
        message: `Subtopic "${st.id}" có khối lớp không hợp lệ: "${st.grade}".`,
        targetId: st.id
      });
    }
  });

  // 3. Validate Requirements
  requirements.forEach(req => {
    // Check ID naming convention
    if (!req.id || !REQUIREMENT_ID_REGEX.test(req.id)) {
      errors.push({
        type: 'invalid_id_naming_convention',
        message: `Mã YCCĐ (requirementId) "${req.id}" không đúng quy tắc chuẩn (VD: TH6-A-001).`,
        targetId: req.id
      });
    }

    // Check Duplicate ID
    if (requirementIds.has(req.id)) {
      errors.push({
        type: 'duplicate_requirement_id',
        message: `Trùng lặp mã YCCĐ (requirementId): "${req.id}".`,
        targetId: req.id
      });
    }
    requirementIds.add(req.id);

    // Check Grade
    if (!req.grade || ![6, 7, 8, 9].includes(req.grade)) {
      errors.push({
        type: 'invalid_grade',
        message: `YCCĐ "${req.id}" không có khối lớp hoặc khối lớp ngoài phạm vi 6-9: "${req.grade}".`,
        targetId: req.id
      });
    }

    // Check Topic ID presence and existence
    if (!req.topicId) {
      errors.push({
        type: 'missing_topic_id',
        message: `YCCĐ "${req.id}" thiếu trường topicId.`,
        targetId: req.id
      });
    } else if (!topicIds.has(req.topicId)) {
      errors.push({
        type: 'nonexistent_topic_reference',
        message: `YCCĐ "${req.id}" tham chiếu topicId không tồn tại: "${req.topicId}".`,
        targetId: req.id
      });
    }

    // Check Subtopic ID presence and existence
    if (!req.subTopicId) {
      errors.push({
        type: 'missing_subtopic_id',
        message: `YCCĐ "${req.id}" thiếu trường subTopicId.`,
        targetId: req.id
      });
    } else if (!subtopicIds.has(req.subTopicId)) {
      errors.push({
        type: 'nonexistent_subtopic_reference',
        message: `YCCĐ "${req.id}" tham chiếu subTopicId không tồn tại: "${req.subTopicId}".`,
        targetId: req.id
      });
    }

    // Check requirementText empty
    if (!req.requirementText || req.requirementText.trim().length === 0) {
      errors.push({
        type: 'empty_requirement_text',
        message: `YCCĐ "${req.id}" có nội dung yêu cầu cần đạt (requirementText) bị rỗng.`,
        targetId: req.id
      });
    }

    // Check consistency between ID grade/topic and requirement fields
    if (req.id && REQUIREMENT_ID_REGEX.test(req.id)) {
      const match = req.id.match(/^TH([6-9])-([A-G])-\d{3}$/);
      if (match) {
        const idGrade = parseInt(match[1]);
        const idTopicCode = match[2];
        if (req.grade !== idGrade) {
          warnings.push(`YCCĐ "${req.id}" có khối lớp "${req.grade}" không khớp tiền tố ID "${idGrade}".`);
        }
        if (req.topicId !== `TH-${idTopicCode}`) {
          warnings.push(`YCCĐ "${req.id}" có topicId "${req.topicId}" không khớp tiền tố ID "TH-${idTopicCode}".`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
