import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Canonical curriculum imports (explicit from /index to avoid resolving to legacy curriculum.ts)
import { 
  CANONICAL_TOPICS, 
  CANONICAL_SUBTOPICS, 
  CANONICAL_REQUIREMENTS,
  validateCanonicalCurriculum,
  generateCoverageReport,
  generateLegacyDiffReport,
  REQUIREMENT_ID_REGEX,
  TOPIC_ID_REGEX,
  SUBTOPIC_ID_REGEX,
  CurriculumRequirement
} from '../data/curriculum/index';

// Legacy sources
import { CURRICULUM } from '../data/curriculum';
import { REQUIREMENTS_DATA, PREDEFINED_FOLDERS } from '../data/matrixConstants';
import { CURRENT_SCHEMA_VERSION, loadQuestionBank } from '../services/storage/questionBankStorage';

// Page components
import QuestionManager from '../pages/QuestionManager';
import MatrixBuilder from '../pages/MatrixBuilder';
import ExamGenerator from '../pages/ExamGenerator';

describe('TASK 004: Canonical Curriculum & YCCĐ Data Model Foundation', () => {

  // TEST 1: Mọi requirementId unique
  it('TEST 1: Mọi requirementId unique', () => {
    const ids = CANONICAL_REQUIREMENTS.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids.length).toBe(138);
  });

  // TEST 2: Mọi topicId hợp lệ
  it('TEST 2: Mọi topicId hợp lệ và tồn tại trong CANONICAL_TOPICS', () => {
    const validTopicIds = new Set(CANONICAL_TOPICS.map(t => t.id));
    expect(validTopicIds.size).toBe(7);

    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(validTopicIds.has(r.topicId)).toBe(true);
      expect(TOPIC_ID_REGEX.test(r.topicId)).toBe(true);
    });
  });

  // TEST 3: Mọi subTopicId hợp lệ
  it('TEST 3: Mọi subTopicId hợp lệ và tồn tại trong CANONICAL_SUBTOPICS', () => {
    const validSubTopicIds = new Set(CANONICAL_SUBTOPICS.map(st => st.id));
    expect(validSubTopicIds.size).toBe(33);

    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(validSubTopicIds.has(r.subTopicId)).toBe(true);
      expect(SUBTOPIC_ID_REGEX.test(r.subTopicId)).toBe(true);
    });
  });

  // TEST 4: Mọi requirement có grade 6–9
  it('TEST 4: Mọi requirement có grade 6–9', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect([6, 7, 8, 9]).toContain(r.grade);
    });
  });

  // TEST 5: Không requirementText nào rỗng
  it('TEST 5: Không requirementText nào rỗng', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(r.requirementText).toBeDefined();
      expect(r.requirementText.trim().length).toBeGreaterThan(0);
    });
  });

  // TEST 6: Không orphan requirement
  it('TEST 6: Không orphan requirement (liên kết đầy đủ topic và subtopic cùng khối)', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      const subtopic = CANONICAL_SUBTOPICS.find(st => st.id === r.subTopicId);
      expect(subtopic).toBeDefined();
      expect(subtopic?.grade).toBe(r.grade);
      expect(subtopic?.topicId).toBe(r.topicId);
    });
  });

  // TEST 7: Naming convention hợp lệ
  it('TEST 7: Naming convention hợp lệ (TH{grade}-{topicLetter}-{seq})', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(REQUIREMENT_ID_REGEX.test(r.id)).toBe(true);
      
      const match = r.id.match(/^TH([6-9])-([A-G])-(\d{3})$/);
      expect(match).not.toBeNull();
      if (match) {
        expect(parseInt(match[1])).toBe(r.grade);
        expect(`TH-${match[2]}`).toBe(r.topicId);
      }
    });
  });

  // TEST 8: Coverage report tính đúng
  it('TEST 8: Coverage report tính đúng số lượng và phân bổ theo khối', () => {
    const report = generateCoverageReport(CANONICAL_REQUIREMENTS, CANONICAL_TOPICS, CANONICAL_SUBTOPICS);

    expect(report.totalTopics).toBe(7);
    expect(report.totalSubtopics).toBe(33);
    expect(report.totalRequirements).toBe(138);
    expect(report.totalVerified).toBe(138);
    expect(report.totalUnverified).toBe(0);
    expect(report.totalSourceRequired).toBe(0);

    // Kiểm tra từng khối lớp
    expect(report.byGrade[6].requirementsCount).toBe(41);
    expect(report.byGrade[7].requirementsCount).toBe(37);
    expect(report.byGrade[8].requirementsCount).toBe(32);
    expect(report.byGrade[9].requirementsCount).toBe(28);
  });

  // TEST 9: Validator phát hiện duplicate ID
  it('TEST 9: Validator phát hiện duplicate ID', () => {
    const duplicateReqs: CurriculumRequirement[] = [
      ...CANONICAL_REQUIREMENTS,
      {
        id: 'TH6-A-001', // duplicate id
        subject: 'tinhoc',
        grade: 6,
        topicId: 'TH-A',
        topicName: 'Chủ đề A. Máy tính và cộng đồng',
        subTopicId: 'TH6-A-S01',
        subTopicName: '1. Thông tin và dữ liệu',
        requirementText: 'Câu bị trùng lặp ID',
        sourceStatus: 'verified'
      }
    ];

    const result = validateCanonicalCurriculum(CANONICAL_TOPICS, CANONICAL_SUBTOPICS, duplicateReqs);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'duplicate_requirement_id')).toBe(true);
  });

  // TEST 10: Validator phát hiện missing topic
  it('TEST 10: Validator phát hiện missing topic', () => {
    const invalidTopicReqs: CurriculumRequirement[] = [
      {
        id: 'TH6-A-999',
        subject: 'tinhoc',
        grade: 6,
        topicId: 'TH-NONEXISTENT', // topic không tồn tại
        topicName: 'Chủ đề lạ',
        subTopicId: 'TH6-A-S01',
        subTopicName: '1. Thông tin và dữ liệu',
        requirementText: 'Nội dung test',
        sourceStatus: 'verified'
      }
    ];

    const result = validateCanonicalCurriculum(CANONICAL_TOPICS, CANONICAL_SUBTOPICS, invalidTopicReqs);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'nonexistent_topic_reference')).toBe(true);
  });

  // TEST 11: Validator phát hiện missing subtopic
  it('TEST 11: Validator phát hiện missing subtopic', () => {
    const invalidSubtopicReqs: CurriculumRequirement[] = [
      {
        id: 'TH6-A-999',
        subject: 'tinhoc',
        grade: 6,
        topicId: 'TH-A',
        topicName: 'Chủ đề A',
        subTopicId: 'TH6-A-S99', // subtopic không tồn tại
        subTopicName: 'Mạch không tồn tại',
        requirementText: 'Nội dung test',
        sourceStatus: 'verified'
      }
    ];

    const result = validateCanonicalCurriculum(CANONICAL_TOPICS, CANONICAL_SUBTOPICS, invalidSubtopicReqs);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'nonexistent_subtopic_reference')).toBe(true);
  });

  // TEST 12: Legacy data vẫn load được
  it('TEST 12: Legacy data vẫn load được (curriculum.ts và matrixConstants.ts nguyên vẹn)', () => {
    expect(CURRICULUM).toBeDefined();
    expect(CURRICULUM.lessonData['6'].length).toBe(17);
    expect(CURRICULUM.criteriaData['6']['Bài 1. Thông tin và dữ liệu']).toBeDefined();

    expect(REQUIREMENTS_DATA).toBeDefined();
    expect(REQUIREMENTS_DATA['Lớp 6']['Chủ đề A. Máy tính và cộng đồng']).toBeDefined();
    expect(PREDEFINED_FOLDERS['Lớp 6'].length).toBe(6);
  });

  // TEST 13: QuestionManager vẫn render
  it('TEST 13: QuestionManager vẫn render bình thường', () => {
    const { unmount } = render(<QuestionManager />);
    expect(screen.getByText(/PHẦN 1: TRẮC NGHIỆM/i)).toBeInTheDocument();
    expect(screen.getByText(/Xuất JSON/i)).toBeInTheDocument();
    unmount();
  });

  // TEST 14: Matrix vẫn render
  it('TEST 14: Matrix vẫn render (MatrixBuilder)', () => {
    const { unmount } = render(<MatrixBuilder />);
    expect(screen.getByText(/Trình quản lý ma trận đề/i)).toBeInTheDocument();
    unmount();
  });

  // TEST 15: Exam Generator vẫn render
  it('TEST 15: Exam Generator vẫn render', () => {
    const { unmount } = render(<ExamGenerator />);
    expect(screen.getByText(/Tải lên Ngân hàng Câu hỏi/i)).toBeInTheDocument();
    unmount();
  });

  // TEST 16: Canonical Curriculum không làm thay đổi Question Bank storage schemaVersion hiện tại
  it('TEST 16: Canonical Curriculum không làm thay đổi Question Bank storage schemaVersion hiện tại', () => {
    // CURRENT_SCHEMA_VERSION hỗ trợ từ 1 trở lên
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);

    const loadResult = loadQuestionBank();
    expect(loadResult.success).toBe(true);
    expect(loadResult.data.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // GOLDEN DATA TEST (Section XVII)
  // =========================================================================
  describe('GOLDEN DATA TESTS: Xác nhận các bản ghi vàng không bị suy biến', () => {
    it('Golden Record 1: TH6-A-001 (Khối 6, Thông tin và vật mang tin)', () => {
      const rec = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH6-A-001');
      expect(rec).toBeDefined();
      expect(rec?.grade).toBe(6);
      expect(rec?.topicId).toBe('TH-A');
      expect(rec?.subTopicId).toBe('TH6-A-S01');
      expect(rec?.requirementText).toBe('Phân biệt được thông tin với vật mang tin.');
      expect(rec?.sourceStatus).toBe('verified');
    });

    it('Golden Record 2: TH7-C-001 (Khối 7, Mạng xã hội)', () => {
      const rec = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH7-C-001');
      expect(rec).toBeDefined();
      expect(rec?.grade).toBe(7);
      expect(rec?.topicId).toBe('TH-C');
      expect(rec?.subTopicId).toBe('TH7-C-S01');
      expect(rec?.requirementText).toBe('Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).');
      expect(rec?.sourceStatus).toBe('verified');
    });

    it('Golden Record 3: TH8-A-001 (Khối 8, Lịch sử máy tính)', () => {
      const rec = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH8-A-001');
      expect(rec).toBeDefined();
      expect(rec?.grade).toBe(8);
      expect(rec?.topicId).toBe('TH-A');
      expect(rec?.subTopicId).toBe('TH8-A-S01');
      expect(rec?.requirementText).toBe('Trình bày được sơ lược lịch sử phát triển máy tính.');
      expect(rec?.sourceStatus).toBe('verified');
    });

    it('Golden Record 4: TH9-F-001 (Khối 9, Giải bài toán bằng máy tính)', () => {
      const rec = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH9-F-001');
      expect(rec).toBeDefined();
      expect(rec?.grade).toBe(9);
      expect(rec?.topicId).toBe('TH-F');
      expect(rec?.subTopicId).toBe('TH9-F-S01');
      expect(rec?.requirementText).toBe('Nêu được quy trình con người giao bài toán cho máy tính giải quyết.');
      expect(rec?.sourceStatus).toBe('verified');
    });
  });

  // =========================================================================
  // DIFF REPORT TEST
  // =========================================================================
  it('Diff Report đối sánh Canonical với Legacy Data tạo ra kết quả hợp lệ', () => {
    const diff = generateLegacyDiffReport(CANONICAL_REQUIREMENTS, CURRICULUM, REQUIREMENTS_DATA);
    expect(diff.totalCanonical).toBe(138);
    expect(diff.matchedCount).toBeGreaterThan(50);
    expect(diff.items.length).toBeGreaterThan(0);
  });
});
