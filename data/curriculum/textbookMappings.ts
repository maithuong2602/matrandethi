import { TextbookLessonMapping } from './types';

/**
 * TEXTBOOK MAPPING ARCHITECTURE (PHASE 1 - FOUNDATION)
 * 
 * In Task 004, we establish the interface and architectural contract for mapping 
 * between Canonical Curriculum Requirements (YCCĐ chuẩn CTGDPT 2018) and textbook lessons.
 * 
 * Full multi-series mapping (KNTT, Cánh Diều, Chân Trời Sáng Tạo) will be 
 * systematically populated in Task 005.
 */

export interface TextbookSeriesMetadata {
  id: string; // 'KNTT' | 'CD' | 'CTST'
  name: string; // 'Kết nối tri thức với cuộc sống' | 'Cánh diều' | 'Chân trời sáng tạo'
  publisher: string;
}

export const SUPPORTED_TEXTBOOK_SERIES: ReadonlyArray<TextbookSeriesMetadata> = Object.freeze([
  {
    id: 'KNTT',
    name: 'Kết nối tri thức với cuộc sống',
    publisher: 'NXB Giáo dục Việt Nam'
  },
  {
    id: 'CD',
    name: 'Cánh diều',
    publisher: 'NXB Đại học Sư phạm / NXB ĐH Sư phạm TP.HCM'
  },
  {
    id: 'CTST',
    name: 'Chân trời sáng tạo',
    publisher: 'NXB Giáo dục Việt Nam'
  }
]);

/**
 * Initial reference textbook mappings (Sample architecture verification).
 * Full mapping deferred to Task 005 as explicitly instructed.
 */
export const SAMPLE_TEXTBOOK_MAPPINGS: ReadonlyArray<TextbookLessonMapping> = Object.freeze([
  {
    id: 'KNTT-TH6-B01',
    bookSeries: 'KNTT',
    grade: 6,
    lessonId: 'KNTT-TH6-B01',
    lessonNumber: 'Bài 1',
    lessonTitle: 'Bài 1. Thông tin và dữ liệu',
    requirementIds: ['TH6-A-001', 'TH6-A-002', 'TH6-A-004', 'TH6-A-005'],
    mappingStatus: 'verified'
  },
  {
    id: 'KNTT-TH6-B02',
    bookSeries: 'KNTT',
    grade: 6,
    lessonId: 'KNTT-TH6-B02',
    lessonNumber: 'Bài 2',
    lessonTitle: 'Bài 2. Xử lí thông tin',
    requirementIds: ['TH6-A-003', 'TH6-A-006'],
    mappingStatus: 'verified'
  }
]);

