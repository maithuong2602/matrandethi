import { describe, it, expect } from 'vitest';
import { 
  CANONICAL_REQUIREMENTS, 
  CANONICAL_TOPICS, 
  CANONICAL_SUBTOPICS,
  generateCoverageReport,
  generateLegacyDiffReport,
  getCurriculumSourceVersionReport,
  LEGAL_DOCUMENTS_REGISTRY
} from '../data/curriculum/index';
import { CURRICULUM } from '../data/curriculum';
import { REQUIREMENTS_DATA } from '../data/matrixConstants';

describe('TASK 004B: Curriculum Source Verification & Legal Provenance Tests', () => {

  // TEST 1: Mọi verified requirement phải có source.documentId
  it('TEST 1: Mọi verified requirement phải có source.documentId hợp lệ (32/2018/TT-BGDĐT)', () => {
    const verifiedReqs = CANONICAL_REQUIREMENTS.filter(r => r.sourceStatus === 'verified');
    expect(verifiedReqs.length).toBe(138);

    verifiedReqs.forEach(r => {
      expect(r.source).toBeDefined();
      expect(r.source?.documentId).toBe('32/2018/TT-BGDĐT');
      expect(r.source?.documentTitle).toContain('Thông tư số 32/2018/TT-BGDĐT');
    });
  });

  // TEST 2: Mọi verified requirement phải có source locator
  it('TEST 2: Mọi verified requirement phải có source locator rõ ràng, định danh chính xác', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(r.source?.sourceLocator).toBeDefined();
      expect(r.source?.sourceLocator).toBe(`TT32/2018-${r.id}`);
    });
  });

  // TEST 3: Không verified requirement nào có matchStatus NOT_FOUND
  it('TEST 3: Không verified requirement nào có matchStatus NOT_FOUND', () => {
    const notFound = CANONICAL_REQUIREMENTS.filter(r => r.source?.matchStatus === 'NOT_FOUND');
    expect(notFound.length).toBe(0);
  });

  // TEST 4: Không verified requirement nào có matchStatus AMBIGUOUS
  it('TEST 4: Không verified requirement nào có matchStatus AMBIGUOUS', () => {
    const ambiguous = CANONICAL_REQUIREMENTS.filter(r => r.source?.matchStatus === 'AMBIGUOUS');
    expect(ambiguous.length).toBe(0);
  });

  // TEST 5: Requirement source grade phải khớp grade
  it('TEST 5: Requirement source grade phải khớp trường grade', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(r.source?.gradeSection).toBe(`Lớp ${r.grade}`);
    });
  });

  // TEST 6: Requirement source topic phải khớp topic
  it('TEST 6: Requirement source topic phải khớp trường topicName', () => {
    CANONICAL_REQUIREMENTS.forEach(r => {
      expect(r.source?.topicSection).toBe(r.topicName);
    });
  });

  // TEST 7: Không duplicate official source mapping ngoài trường hợp được giải thích
  it('TEST 7: Không duplicate official source mapping (mỗi sourceLocator là duy nhất)', () => {
    const locators = CANONICAL_REQUIREMENTS.map(r => r.source?.sourceLocator).filter(Boolean);
    const uniqueLocators = new Set(locators);
    expect(uniqueLocators.size).toBe(locators.length);
    expect(locators.length).toBe(138);
  });

  // TEST 8: Golden Requirements có provenance cố định
  it('TEST 8: Golden Requirements có provenance cố định, không thể suy biến', () => {
    const golden6 = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH6-A-001');
    expect(golden6?.source?.documentId).toBe('32/2018/TT-BGDĐT');
    expect(golden6?.source?.sourceLocator).toBe('TT32/2018-TH6-A-001');
    expect(golden6?.source?.officialBulletText).toBe('Phân biệt được thông tin với vật mang tin.');
    expect(golden6?.source?.matchStatus).toBe('EXACT_MATCH');
    expect(golden6?.source?.verificationStatus).toBe('verified_against_official_source');

    const golden7 = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH7-C-001');
    expect(golden7?.source?.documentId).toBe('32/2018/TT-BGDĐT');
    expect(golden7?.source?.sourceLocator).toBe('TT32/2018-TH7-C-001');
    expect(golden7?.source?.officialBulletText).toBe('Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).');
    expect(golden7?.source?.matchStatus).toBe('EXACT_MATCH');
    expect(golden7?.source?.verificationStatus).toBe('verified_against_official_source');

    const golden8 = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH8-A-001');
    expect(golden8?.source?.documentId).toBe('32/2018/TT-BGDĐT');
    expect(golden8?.source?.sourceLocator).toBe('TT32/2018-TH8-A-001');
    expect(golden8?.source?.officialBulletText).toBe('Trình bày được sơ lược lịch sử phát triển máy tính.');
    expect(golden8?.source?.matchStatus).toBe('EXACT_MATCH');
    expect(golden8?.source?.verificationStatus).toBe('verified_against_official_source');

    const golden9 = CANONICAL_REQUIREMENTS.find(r => r.id === 'TH9-F-001');
    expect(golden9?.source?.documentId).toBe('32/2018/TT-BGDĐT');
    expect(golden9?.source?.sourceLocator).toBe('TT32/2018-TH9-F-001');
    expect(golden9?.source?.officialBulletText).toBe('Nêu được quy trình con người giao bài toán cho máy tính giải quyết.');
    expect(golden9?.source?.matchStatus).toBe('EXACT_MATCH');
    expect(golden9?.source?.verificationStatus).toBe('verified_against_official_source');
  });

  // TEST 9: Coverage Report phân biệt verified / manual review / not found
  it('TEST 9: Coverage Report phân biệt rõ ràng: verified / manual review / not found', () => {
    const report = generateCoverageReport(CANONICAL_REQUIREMENTS, CANONICAL_TOPICS, CANONICAL_SUBTOPICS);
    
    expect(report.totalVerifiedAgainstOfficialSource).toBe(138);
    expect(report.totalNeedsManualReview).toBe(0);
    expect(report.totalSourceNotFound).toBe(0);

    // Từng khối lớp
    expect(report.byGrade[6].verifiedAgainstSourceCount).toBe(41);
    expect(report.byGrade[7].verifiedAgainstSourceCount).toBe(37);
    expect(report.byGrade[8].verifiedAgainstSourceCount).toBe(32);
    expect(report.byGrade[9].verifiedAgainstSourceCount).toBe(28);
  });

  // TEST 10: Legacy Diff vẫn hoạt động
  it('TEST 10: Legacy Diff vẫn hoạt động chính xác sau khi bổ sung provenance', () => {
    const diff = generateLegacyDiffReport(CANONICAL_REQUIREMENTS, CURRICULUM, REQUIREMENTS_DATA);
    expect(diff.totalCanonical).toBe(138);
    expect(diff.matchedCount).toBeGreaterThan(50);
    expect(diff.items.length).toBeGreaterThan(0);
  });

  // TEST PHỤ: Kiểm tra Báo cáo Phiên bản nguồn pháp lý
  it('Xác minh Báo cáo phiên bản văn bản quy phạm pháp luật (TT 32/2018 và các Thông tư sửa đổi)', () => {
    const versionReport = getCurriculumSourceVersionReport();
    expect(versionReport.baseDocument).toContain('32/2018/TT-BGDĐT');
    expect(versionReport.relevantAmendmentsChecked.length).toBe(3);
    expect(versionReport.amendmentsAffectingInformatics.length).toBe(0);
    expect(versionReport.currentCanonicalBasis).toContain('32/2018/TT-BGDĐT');
  });
});
