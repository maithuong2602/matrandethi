import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// KNTT Mapping and Canonical imports
import {
  KNTT_LESSON_MAPPINGS,
  getRequirementsForLesson,
  getRequirementsForLessonTitle,
  getLessonsForRequirement,
  getLessonById,
  getLessonByTitle,
  getMappingsByGrade,
  getAllKNTTMappings,
  validateKNTTMappings,
  generateKNTTCoverageReport,
  CANONICAL_REQUIREMENTS,
  TextbookLessonMapping
} from '../data/curriculum/index';

// Legacy curriculum data
import { CURRICULUM } from '../data/curriculum';

// Storage schema safety
import { CURRENT_SCHEMA_VERSION } from '../services/storage/questionBankStorage';

// UI components for non-regression render tests
import QuestionManager from '../pages/QuestionManager';
import MatrixBuilder from '../pages/MatrixBuilder';
import ExamGenerator from '../pages/ExamGenerator';

describe('TASK 005: KNTT Textbook Lesson Mapping Engine & Adapter Layer', () => {

  // TEST 1: Mọi KNTT lessonId unique
  it('TEST 1: Mọi KNTT lessonId unique', () => {
    const lessonIds = KNTT_LESSON_MAPPINGS.map(m => m.lessonId);
    const uniqueIds = new Set(lessonIds);
    expect(uniqueIds.size).toBe(lessonIds.length);
    expect(lessonIds.length).toBe(75);

    // Also check lessonId naming convention: KNTT-TH{grade}-B{number}
    lessonIds.forEach(id => {
      expect(/^KNTT-TH[6-9]-B\d{2}[A-B]?$/.test(id)).toBe(true);
    });
  });

  // TEST 2: Mọi mapped requirementId tồn tại trong Canonical Curriculum
  it('TEST 2: Mọi mapped requirementId tồn tại trong Canonical Curriculum', () => {
    const validCanonicalIds = new Set(CANONICAL_REQUIREMENTS.map(r => r.id));
    expect(validCanonicalIds.size).toBe(138);

    KNTT_LESSON_MAPPINGS.forEach(mapping => {
      expect(mapping.requirementIds.length).toBeGreaterThan(0);
      mapping.requirementIds.forEach(reqId => {
        expect(validCanonicalIds.has(reqId)).toBe(true);
      });
    });
  });

  // TEST 3: Grade lesson = grade requirement
  it('TEST 3: Grade lesson = grade requirement', () => {
    const reqGradeMap = new Map<string, number>();
    CANONICAL_REQUIREMENTS.forEach(r => reqGradeMap.set(r.id, r.grade));

    KNTT_LESSON_MAPPINGS.forEach(mapping => {
      mapping.requirementIds.forEach(reqId => {
        const reqGrade = reqGradeMap.get(reqId);
        expect(reqGrade).toBe(mapping.grade);
      });
    });
  });

  // TEST 4: getRequirementsForLesson trả đúng
  it('TEST 4: getRequirementsForLesson trả đúng canonical requirements', () => {
    // Check Lesson 1 Grade 6
    const reqsG6B1 = getRequirementsForLesson('KNTT-TH6-B01');
    expect(reqsG6B1.length).toBe(4);
    expect(reqsG6B1.map(r => r.id)).toEqual(['TH6-A-001', 'TH6-A-002', 'TH6-A-004', 'TH6-A-005']);
    reqsG6B1.forEach(r => expect(r.grade).toBe(6));

    // Check non-existent lesson
    const nonexistent = getRequirementsForLesson('KNTT-TH6-B99');
    expect(nonexistent).toEqual([]);
  });

  // TEST 5: getLessonsForRequirement trả đúng
  it('TEST 5: getLessonsForRequirement trả đúng danh sách bài học', () => {
    // TH6-A-001 is taught in Bài 1 Lớp 6
    const lessonsForA001 = getLessonsForRequirement('TH6-A-001');
    expect(lessonsForA001.length).toBe(1);
    expect(lessonsForA001[0].lessonId).toBe('KNTT-TH6-B01');

    // Non-existent requirement
    const empty = getLessonsForRequirement('TH6-Z-999');
    expect(empty).toEqual([]);
  });

  // TEST 6: Many-to-many hoạt động
  it('TEST 6: Many-to-many hoạt động (1 bài nhiều YCCĐ và 1 YCCĐ nhiều bài)', () => {
    // 1 Lesson -> Multiple Requirements:
    // Bài 1 Lớp 6 (KNTT-TH6-B01) có 4 YCCĐ
    const lessonMapping = getLessonById('KNTT-TH6-B01');
    expect(lessonMapping).toBeDefined();
    expect(lessonMapping!.requirementIds.length).toBe(4);

    // 1 Requirement -> Multiple Lessons:
    // TH9-E-007 (bảng tính tài chính) xuất hiện trong cả 5 bài (Bài 9a, 10a, 11a, 12a, 13a)
    const lessonsForSpreadsheet = getLessonsForRequirement('TH9-E-007');
    expect(lessonsForSpreadsheet.length).toBe(5);
    const lessonIds = lessonsForSpreadsheet.map(l => l.lessonId);
    expect(lessonIds).toContain('KNTT-TH9-B09A');
    expect(lessonIds).toContain('KNTT-TH9-B10A');
    expect(lessonIds).toContain('KNTT-TH9-B11A');
    expect(lessonIds).toContain('KNTT-TH9-B12A');
    expect(lessonIds).toContain('KNTT-TH9-B13A');

    // TH8-E-013 (phần mềm chỉnh sửa ảnh) xuất hiện trong 4 bài (Bài 8b, 9b, 10b, 11b)
    const lessonsForPhoto = getLessonsForRequirement('TH8-E-013');
    expect(lessonsForPhoto.length).toBe(4);
    const photoLessonIds = lessonsForPhoto.map(l => l.lessonId);
    expect(photoLessonIds).toEqual(['KNTT-TH8-B08B', 'KNTT-TH8-B09B', 'KNTT-TH8-B10B', 'KNTT-TH8-B11B']);
  });

  // TEST 7: Validator phát hiện invalid requirement
  it('TEST 7: Validator phát hiện invalid requirement', () => {
    const invalidMapping: TextbookLessonMapping = {
      id: 'KNTT-TH6-B01',
      bookSeries: 'KNTT',
      grade: 6,
      lessonId: 'KNTT-TH6-B01',
      lessonNumber: 'Bài 1',
      lessonTitle: 'Bài 1. Thông tin và dữ liệu',
      requirementIds: ['TH6-INVALID-999'],
      mappingStatus: 'verified'
    };

    const result = validateKNTTMappings([invalidMapping]);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'NONEXISTENT_REQUIREMENT')).toBe(true);
  });

  // TEST 8: Validator phát hiện invalid lesson
  it('TEST 8: Validator phát hiện invalid lesson', () => {
    const invalidLesson: TextbookLessonMapping = {
      id: 'KNTT-TH6-B99',
      bookSeries: 'KNTT',
      grade: 6,
      lessonId: 'KNTT-TH6-B99',
      lessonNumber: 'Bài 99',
      lessonTitle: 'Bài 99. Bài học không tồn tại',
      requirementIds: ['TH6-A-001'],
      mappingStatus: 'verified'
    };

    const result = validateKNTTMappings([invalidLesson]);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'NONEXISTENT_LESSON')).toBe(true);
  });

  // TEST 9: Validator phát hiện grade mismatch
  it('TEST 9: Validator phát hiện grade mismatch', () => {
    const mismatchMapping: TextbookLessonMapping = {
      id: 'KNTT-TH6-B01',
      bookSeries: 'KNTT',
      grade: 6,
      lessonId: 'KNTT-TH6-B01',
      lessonNumber: 'Bài 1',
      lessonTitle: 'Bài 1. Thông tin và dữ liệu',
      requirementIds: ['TH9-A-001'], // Grade 9 requirement in Grade 6 lesson
      mappingStatus: 'verified'
    };

    const result = validateKNTTMappings([mismatchMapping]);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'GRADE_MISMATCH')).toBe(true);
  });

  // TEST 10: Coverage report tính đúng
  it('TEST 10: Coverage report tính đúng các chỉ số toàn diện', () => {
    const report = generateKNTTCoverageReport();
    expect(report.totalLessons).toBe(75);
    expect(report.mappedLessons).toBe(75);
    expect(report.unmappedLessons).toBe(0);

    expect(report.totalCanonicalRequirements).toBe(138);
    expect(report.mappedCanonicalRequirements).toBe(138);
    expect(report.unmappedCanonicalRequirements).toBe(0);

    expect(report.byGrade[6].totalLessons).toBe(17);
    expect(report.byGrade[7].totalLessons).toBe(16);
    expect(report.byGrade[8].totalLessons).toBe(20);
    expect(report.byGrade[9].totalLessons).toBe(22);

    expect(report.byGrade[6].canonicalRequirementsReferenced).toBe(41);
    expect(report.byGrade[7].canonicalRequirementsReferenced).toBe(37);
    expect(report.byGrade[8].canonicalRequirementsReferenced).toBe(32);
    expect(report.byGrade[9].canonicalRequirementsReferenced).toBe(28);

    expect(report.multiLessonRequirements.length).toBeGreaterThan(0);
    expect(report.unmappedRequirements).toEqual([]);
  });

  // TEST 11: Legacy criteria không bị silently dropped
  it('TEST 11: Legacy criteria không bị silently dropped (đầy đủ 163 criteria trong evidence)', () => {
    let legacyCriteriaInSource = 0;
    const grades = ['6', '7', '8', '9'];
    grades.forEach(g => {
      const gCritMap = CURRICULUM.criteriaData[g] || {};
      Object.values(gCritMap).forEach(lvlMap => {
        Object.values(lvlMap).forEach(arr => {
          legacyCriteriaInSource += (arr as string[]).length;
        });
      });
    });
    expect(legacyCriteriaInSource).toBe(163);

    // Count criteria mapped in evidence
    let mappedCriteriaInEvidence = 0;
    KNTT_LESSON_MAPPINGS.forEach(m => {
      mappedCriteriaInEvidence += m.evidence?.criteriaMappings?.length || 0;
    });
    expect(mappedCriteriaInEvidence).toBe(163);

    // Running standard validation must yield 0 orphan criteria errors
    const valResult = validateKNTTMappings();
    expect(valResult.issues.filter(i => i.code === 'ORPHAN_LEGACY_CRITERION')).toHaveLength(0);
  });

  // TEST 12: Ambiguous mapping không bị coi verified
  it('TEST 12: Ambiguous mapping không bị coi verified (phải được gắn cờ cảnh báo)', () => {
    const mockMappingWithAmbiguity: TextbookLessonMapping = {
      id: 'KNTT-TH6-B01',
      bookSeries: 'KNTT',
      grade: 6,
      lessonId: 'KNTT-TH6-B01',
      lessonNumber: 'Bài 1',
      lessonTitle: 'Bài 1. Thông tin và dữ liệu',
      requirementIds: ['TH6-A-001'],
      mappingStatus: 'needs_review',
      evidence: {
        criteriaMappings: [
          {
            legacyCriteriaText: 'Tiêu chí mập mờ',
            canonicalRequirementId: 'TH6-A-001',
            matchType: 'AMBIGUOUS',
            notes: 'Mơ hồ cần đánh giá'
          }
        ]
      }
    };

    const result = validateKNTTMappings([mockMappingWithAmbiguity]);
    expect(result.issues.some(i => i.code === 'AMBIGUOUS_MAPPING')).toBe(true);
  });

  // TEST 13: Một YCCĐ xuất hiện nhiều bài không tạo duplicate Canonical Requirement
  it('TEST 13: Một YCCĐ xuất hiện nhiều bài không tạo duplicate Canonical Requirement', () => {
    // Verify TH9-E-007 appears in 5 lessons but only ONCE in CANONICAL_REQUIREMENTS
    const matchingReqs = CANONICAL_REQUIREMENTS.filter(r => r.id === 'TH9-E-007');
    expect(matchingReqs.length).toBe(1);

    const lessons = getLessonsForRequirement('TH9-E-007');
    expect(lessons.length).toBe(5);
  });

  // TEST 14: Canonical Curriculum vẫn 138 requirements
  it('TEST 14: Canonical Curriculum vẫn 138 requirements', () => {
    expect(CANONICAL_REQUIREMENTS.length).toBe(138);
    const byGradeCount = { 6: 0, 7: 0, 8: 0, 9: 0 };
    CANONICAL_REQUIREMENTS.forEach(r => {
      byGradeCount[r.grade]++;
    });
    expect(byGradeCount).toEqual({ 6: 41, 7: 37, 8: 32, 9: 28 });
  });

  // TEST 15: Question Bank schemaVersion hợp lệ
  it('TEST 15: Question Bank schemaVersion hợp lệ', () => {
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  // TEST 16: QuestionManager vẫn render bình thường
  it('TEST 16: QuestionManager vẫn render', () => {
    render(<QuestionManager />);
    expect(screen.getByText(/Quản Lý Câu Hỏi/i)).toBeInTheDocument();
  });


  // TEST 17: Matrix vẫn render bình thường
  it('TEST 17: Matrix vẫn render', () => {
    render(<MatrixBuilder />);
    expect(screen.getByText(/Trình quản lý ma trận đề/i)).toBeInTheDocument();
  });

  // TEST 18: Exam Generator vẫn render bình thường
  it('TEST 18: Exam Generator vẫn render', () => {
    render(<ExamGenerator />);
    expect(screen.getByText(/Tạo Đề Thi/i)).toBeInTheDocument();
  });


  // GOLDEN MAPPING TESTS (Section XIX)
  describe('GOLDEN MAPPING TESTS', () => {
    it('Golden Grade 6: Khóa Bài 1 (KNTT-TH6-B01)', () => {
      const b1 = getLessonById('KNTT-TH6-B01');
      expect(b1).toBeDefined();
      expect(b1!.bookSeries).toBe('KNTT');
      expect(b1!.grade).toBe(6);
      expect(b1!.lessonTitle).toBe('Bài 1. Thông tin và dữ liệu');
      expect(b1!.requirementIds).toEqual(['TH6-A-001', 'TH6-A-002', 'TH6-A-004', 'TH6-A-005']);
      expect(b1!.mappingStatus).toBe('verified');
    });

    it('Golden Grade 7: Khóa Bài 1 (KNTT-TH7-B01)', () => {
      const b1 = getLessonById('KNTT-TH7-B01');
      expect(b1).toBeDefined();
      expect(b1!.bookSeries).toBe('KNTT');
      expect(b1!.grade).toBe(7);
      expect(b1!.lessonTitle).toBe('Bài 1: Thiết bị vào - ra');
      expect(b1!.requirementIds).toEqual(['TH7-A-001', 'TH7-A-002', 'TH7-A-003', 'TH7-A-004']);
      expect(b1!.mappingStatus).toBe('verified');
    });

    it('Golden Grade 8: Khóa Bài 8b và YCCĐ đa bài TH8-E-013', () => {
      const b8b = getLessonById('KNTT-TH8-B08B');
      expect(b8b).toBeDefined();
      expect(b8b!.bookSeries).toBe('KNTT');
      expect(b8b!.grade).toBe(8);
      expect(b8b!.lessonTitle).toBe('Bài 8b: Phần mềm chỉnh sửa ảnh');
      expect(b8b!.requirementIds).toEqual(['TH8-E-013', 'TH8-E-014']);
      expect(b8b!.mappingStatus).toBe('verified');

      // Khóa quan hệ đa bài của TH8-E-013
      const lessons = getLessonsForRequirement('TH8-E-013');
      expect(lessons.map(l => l.lessonId)).toEqual([
        'KNTT-TH8-B08B',
        'KNTT-TH8-B09B',
        'KNTT-TH8-B10B',
        'KNTT-TH8-B11B'
      ]);
    });

    it('Golden Grade 9: Khóa Bài 9a và YCCĐ đa bài TH9-E-007', () => {
      const b9a = getLessonById('KNTT-TH9-B09A');
      expect(b9a).toBeDefined();
      expect(b9a!.bookSeries).toBe('KNTT');
      expect(b9a!.grade).toBe(9);
      expect(b9a!.lessonTitle).toBe('Bài 9a. Sử dụng công cụ xác thực dữ liệu');
      expect(b9a!.requirementIds).toEqual(['TH9-E-007']);
      expect(b9a!.mappingStatus).toBe('verified');

      // Khóa quan hệ đa bài của TH9-E-007
      const lessons = getLessonsForRequirement('TH9-E-007');
      expect(lessons.map(l => l.lessonId)).toEqual([
        'KNTT-TH9-B09A',
        'KNTT-TH9-B10A',
        'KNTT-TH9-B11A',
        'KNTT-TH9-B12A',
        'KNTT-TH9-B13A'
      ]);
    });
  });

  // Lookup helper functions test
  describe('Helper Lookup Functions', () => {
    it('getLessonByTitle and getRequirementsForLessonTitle works', () => {
      const m = getLessonByTitle('Bài 1. Thông tin và dữ liệu', 6);
      expect(m?.lessonId).toBe('KNTT-TH6-B01');

      const reqs = getRequirementsForLessonTitle('Bài 1. Thông tin và dữ liệu', 6);
      expect(reqs.length).toBe(4);
    });

    it('getMappingsByGrade returns exact count per grade', () => {
      expect(getMappingsByGrade(6)).toHaveLength(17);
      expect(getMappingsByGrade(7)).toHaveLength(16);
      expect(getMappingsByGrade(8)).toHaveLength(20);
      expect(getMappingsByGrade(9)).toHaveLength(22);
    });

    it('getAllKNTTMappings returns all 75 mappings', () => {
      expect(getAllKNTTMappings()).toHaveLength(75);
    });
  });
});
