import { TextbookLessonMapping, GradeLevel, CriteriaMatchType, CurriculumRequirement } from './types';
import { CANONICAL_REQUIREMENTS } from './requirements';
import { normalizeTextForComparison } from './reports';
import { KNTT_SEMANTIC_67_REVIEW } from './reports/knttMappingReview';

/**
 * KẾT NỐI TRI THỨC VỚI CUỘC SỐNG (KNTT) - INFORMATICS 6-9 LESSON MAPPINGS
 * 
 * Official textbook implementation layer mapping CTGDPT 2018 Canonical Requirements
 * to KNTT textbook lessons across Grades 6, 7, 8, 9.
 * 
 * Total Lessons: 75
 * Total Legacy Criteria: 163 (92 EXACT, 4 NORMALIZED, 50 CONFIRMED, 17 PARTIAL_MATCH)
 * Total Canonical Requirements Referenced: 138/138 (100% full coverage)
 * 
 * All 67 semantic criteria were fully audited in TASK 005B and all 31 candidates[0]
 * fallback misallocations were resolved in TASK 005C with 0 runtime incorrect links.
 */
export const KNTT_LESSON_MAPPINGS: ReadonlyArray<TextbookLessonMapping> = Object.freeze(
[
  {
    "id": "KNTT-TH6-B01",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B01",
    "lessonNumber": "Bài 1",
    "lessonTitle": "Bài 1. Thông tin và dữ liệu",
    "requirementIds": [
      "TH6-A-001",
      "TH6-A-002",
      "TH6-A-004",
      "TH6-A-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Phân biệt được thông tin với vật mang tin.",
          "canonicalRequirementId": "TH6-A-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-A-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nhận biết được sự khác nhau giữa thông tin và dữ liệu.",
          "canonicalRequirementId": "TH6-A-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH6-A-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được ví dụ minh hoạ về mối quan hệ giữa thông tin và dữ liệu.",
          "canonicalRequirementId": "TH6-A-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-A-004"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Nêu được ví dụ minh hoạ tầm quan trọng của thông tin.",
          "canonicalRequirementId": "TH6-A-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH6-A-005"
        }
      ],
      "notes": "Bài học Bài 1 sách KNTT Tin học 6 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B02",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B02",
    "lessonNumber": "Bài 2",
    "lessonTitle": "Bài 2. Xử lí thông tin",
    "requirementIds": [
      "TH6-A-003",
      "TH6-A-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được các bước cơ bản trong xử lí thông tin.",
          "canonicalRequirementId": "TH6-A-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-A-003"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Giải thích được máy tính và các thiết bị số là công cụ hiệu quả để thu thập, lưu trữ, xử lí và truyền thông tin. Nêu được ví dụ minh hoạ cụ thể.",
          "canonicalRequirementId": "TH6-A-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH6-A-006"
        }
      ],
      "notes": "Bài học Bài 2 sách KNTT Tin học 6 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B03",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B03",
    "lessonNumber": "Bài 3",
    "lessonTitle": "Bài 3. Thông tin trong máy tính",
    "requirementIds": [
      "TH6-A-007",
      "TH6-A-008",
      "TH6-A-009",
      "TH6-A-010"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết được bit là đơn vị nhỏ nhất trong lưu trữ thông tin.",
          "canonicalRequirementId": "TH6-A-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-A-007"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được tên và độ lớn của các đơn vị cơ bản đo dung lượng thông tin.",
          "canonicalRequirementId": "TH6-A-008",
          "matchType": "PARTIAL_MATCH",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH6-A-008 (PARTIAL_MATCH): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH6-A-007) thay vì YCCĐ đích thực sự (TH6-A-008). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH6-A-008 ('Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) ...'). Khi ánh xạ về đúng TH6-A-008, mức độ tương thích là PARTIAL_MATCH."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích được có thể biểu diễn thông tin chỉ với hai kí hiệu 0 và 1.",
          "canonicalRequirementId": "TH6-A-009",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-A-009"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Xác định được khả năng lưu trữ của các thiết bị nhớ thông dụng.",
          "canonicalRequirementId": "TH6-A-010",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH6-A-010. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 3 sách KNTT Tin học 6 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B04",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B04",
    "lessonNumber": "Bài 4",
    "lessonTitle": "Bài 4. Mạng máy tính",
    "requirementIds": [
      "TH6-B-001",
      "TH6-B-002",
      "TH6-B-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được khái niệm và lợi ích của mạng máy tính.",
          "canonicalRequirementId": "TH6-B-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-B-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được các thành phần chủ yếu của một mạng máy tính (máy tính và thiết bị kết nối) và tên của một vài thiết bị mạng cơ bản như: máy tính, cáp nối, Switch, Access Point,…",
          "canonicalRequirementId": "TH6-B-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH6-B-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH6-B-001) thay vì YCCĐ đích thực sự (TH6-B-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH6-B-002 ('Nêu được các thành phần chủ yếu của một mạng máy t...'). Khi ánh xạ về đúng TH6-B-002, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được ví dụ cụ thể về trường hợp mạng không dây tiện dụng hơn mạng có dây.",
          "canonicalRequirementId": "TH6-B-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-B-004"
        }
      ],
      "notes": "Bài học Bài 4 sách KNTT Tin học 6 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B05",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B05",
    "lessonNumber": "Bài 5",
    "lessonTitle": "Bài 5. Internet",
    "requirementIds": [
      "TH6-B-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được các đặc điểm và ích lợi chính của Internet.",
          "canonicalRequirementId": "TH6-B-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-B-003"
        }
      ],
      "notes": "Bài học Bài 5 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B06",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B06",
    "lessonNumber": "Bài 6",
    "lessonTitle": "Bài 6. Mạng thông tin toàn cầu",
    "requirementIds": [
      "TH6-C-001",
      "TH6-C-002",
      "TH6-C-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Trình bày được sơ lược về các khái niệm WWW, website, địa chỉ của website, trình duyệt.",
          "canonicalRequirementId": "TH6-C-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-C-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Xem và nêu được những thông tin chính trên trang web cho trước.",
          "canonicalRequirementId": "TH6-C-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH6-C-002"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Tìm kiếm được thông tin trên một số trang web thông dụng như: tra từ điển, xem thời tiết, tin thời sự,... để phục vụ cho nhu cầu học tập và cuộc sống.",
          "canonicalRequirementId": "TH6-C-007",
          "matchType": "NORMALIZED",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH6-C-007"
        }
      ],
      "notes": "Bài học Bài 6 sách KNTT Tin học 6 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B07",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B07",
    "lessonNumber": "Bài 7",
    "lessonTitle": "Bài 7. Tìm kiếm thông tin trên Internet",
    "requirementIds": [
      "TH6-C-003",
      "TH6-C-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được công dụng của máy tìm kiếm.",
          "canonicalRequirementId": "TH6-C-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-C-003"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Xác định được từ khoá ứng với một mục đích tìm kiếm cho trước.",
          "canonicalRequirementId": "TH6-C-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-C-006"
        }
      ],
      "notes": "Bài học Bài 7 sách KNTT Tin học 6 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B08",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B08",
    "lessonNumber": "Bài 8",
    "lessonTitle": "Bài 8. Thư điện tử",
    "requirementIds": [
      "TH6-C-004",
      "TH6-C-005",
      "TH6-C-008"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết cách đăng kí tài khoản thư điện tử.",
          "canonicalRequirementId": "TH6-C-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-C-004"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được những ưu, nhược điểm cơ bản của dịch vụ thư điện tử so với các phương thức liên lạc khác.",
          "canonicalRequirementId": "TH6-C-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-C-005"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được một số thao tác cơ bản: tạo tài khoản email, đăng nhập tài khoản email, soạn thư, gửi thư, nhận thư, trả lời thư, chuyển tiếp thư và đăng xuất hộp thư trong một số tình huống thực tiễn.",
          "canonicalRequirementId": "TH6-C-008",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH6-C-008"
        }
      ],
      "notes": "Bài học Bài 8 sách KNTT Tin học 6 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B09",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B09",
    "lessonNumber": "Bài 9",
    "lessonTitle": "Bài 9. An toàn thông tin trên Internet",
    "requirementIds": [
      "TH6-D-001",
      "TH6-D-002",
      "TH6-D-003",
      "TH6-D-004",
      "TH6-D-005",
      "TH6-D-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "2.2",
        "2.3",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được một số tác hại và nguy cơ bị hại khi tham gia Internet.",
          "canonicalRequirementId": "TH6-D-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-D-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được một vài cách thông dụng để bảo vệ, chia sẻ thông tin của bản thân và tập thể sao cho an toàn và hợp pháp.",
          "canonicalRequirementId": "TH6-D-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH6-D-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu và thực hiện được một số biện pháp cơ bản để phòng ngừa tác hại khi tham gia Internet với sự hướng dẫn của giáo viên.",
          "canonicalRequirementId": "TH6-D-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-D-003"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Trình bày được tầm quan trọng của sự an toàn và hợp pháp của thông tin cá nhân và tập thể, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH6-D-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH6-D-004"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.3",
          "legacyCriteriaText": "2.3 Nhận diện được một số thông điệp (chẳng hạn email, yêu cầu kết bạn, lời mời tham gia câu lạc bộ,...) lừa đảo hoặc mang nội dung xấu.",
          "canonicalRequirementId": "TH6-D-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.3] và YCCĐ chuẩn TH6-D-005"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện được các thao tác để bảo vệ thông tin và tài khoản cá nhân.",
          "canonicalRequirementId": "TH6-D-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH6-D-006"
        }
      ],
      "notes": "Bài học Bài 9 sách KNTT Tin học 6 ánh xạ 6 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B10",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B10",
    "lessonNumber": "Bài 10",
    "lessonTitle": "Bài 10. Sơ đồ tư duy",
    "requirementIds": [
      "TH6-E-007",
      "TH6-E-008",
      "TH6-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích được lợi ích của sơ đồ tư duy, nêu được nhu cầu sử dụng phần mềm sơ đồ tư duy trong học tập và trao đổi thông tin.",
          "canonicalRequirementId": "TH6-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-E-007"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sắp xếp được một cách logic và trình bày được dưới dạng sơ đồ tư duy các ý tưởng, khái niệm.",
          "canonicalRequirementId": "TH6-E-008",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH6-E-008"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Sử dụng được phần mềm để tạo sơ đồ tư duy đơn giản phục vụ học tập và trao đổi thông tin.",
          "canonicalRequirementId": "TH6-E-009",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH6-E-009"
        }
      ],
      "notes": "Bài học Bài 10 sách KNTT Tin học 6 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B11",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B11",
    "lessonNumber": "Bài 11",
    "lessonTitle": "Bài 11. Định dạng văn bản",
    "requirementIds": [
      "TH6-E-001",
      "TH6-E-002",
      "TH6-E-003",
      "TH6-E-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "3.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nhận biết được tác dụng của công cụ căn lề, định dạng, tìm kiếm, thay thế trong phần mềm soạn thảo văn bản.",
          "canonicalRequirementId": "TH6-E-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-E-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được các chức năng đặc trưng của những phần mềm soạn thảo văn bản.",
          "canonicalRequirementId": "TH6-E-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH6-E-002"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện được việc định dạng văn bản, trình bày trang văn bản và in.",
          "canonicalRequirementId": "TH6-E-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH6-E-003"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Soạn thảo được văn bản phục vụ học tập và sinh hoạt hàng ngày.",
          "canonicalRequirementId": "TH6-E-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH6-E-006"
        }
      ],
      "notes": "Bài học Bài 11 sách KNTT Tin học 6 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B12",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B12",
    "lessonNumber": "Bài 12",
    "lessonTitle": "Bài 12. Trình bày thông tin ở dạng bảng",
    "requirementIds": [
      "TH6-E-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Trình bày được thông tin ở dạng bảng.",
          "canonicalRequirementId": "TH6-E-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.2] và YCCĐ chuẩn TH6-E-005"
        }
      ],
      "notes": "Bài học Bài 12 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B13",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B13",
    "lessonNumber": "Bài 13",
    "lessonTitle": "Bài 13. Thực hành: Tìm kiếm và thay thế",
    "requirementIds": [
      "TH6-E-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.3"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Sử dụng được công cụ tìm kiếm và thay thế của phần mềm soạn thảo.",
          "canonicalRequirementId": "TH6-E-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.3] và YCCĐ chuẩn TH6-E-004"
        }
      ],
      "notes": "Bài học Bài 13 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B14",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B14",
    "lessonNumber": "Bài 14",
    "lessonTitle": "Bài 14. Thực hành tổng hợp: Hoàn thiện sổ lưu niệm",
    "requirementIds": [
      "TH6-E-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Soạn thảo được văn bản phục vụ học tập và sinh hoạt hàng ngày.",
          "canonicalRequirementId": "TH6-E-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH6-E-006"
        }
      ],
      "notes": "Bài học Bài 14 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B15",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B15",
    "lessonNumber": "Bài 15",
    "lessonTitle": "Bài 15. Thuật toán",
    "requirementIds": [
      "TH6-F-001",
      "TH6-F-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được khái niệm thuật toán.",
          "canonicalRequirementId": "TH6-F-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH6-F-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được một vài ví dụ minh hoạ về thuật toán.",
          "canonicalRequirementId": "TH6-F-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH6-F-003"
        }
      ],
      "notes": "Bài học Bài 15 sách KNTT Tin học 6 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B16",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B16",
    "lessonNumber": "Bài 16",
    "lessonTitle": "Bài 16. Các cấu trúc điều khiển",
    "requirementIds": [
      "TH6-F-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Mô tả được thuật toán đơn giản có các cấu trúc tuần tự, rẽ nhánh và lặp dưới dạng liệt kê hoặc sơ đồ khối.",
          "canonicalRequirementId": "TH6-F-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH6-F-004"
        }
      ],
      "notes": "Bài học Bài 16 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH6-B17",
    "bookSeries": "KNTT",
    "grade": 6,
    "lessonId": "KNTT-TH6-B17",
    "lessonNumber": "Bài 17",
    "lessonTitle": "Bài 17. Chương trình máy tính",
    "requirementIds": [
      "TH6-F-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Biết được chương trình là mô tả một thuật toán để máy tính “hiểu” và thực hiện được.",
          "canonicalRequirementId": "TH6-F-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH6-F-002"
        }
      ],
      "notes": "Bài học Bài 17 sách KNTT Tin học 6 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B01",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B01",
    "lessonNumber": "Bài 1",
    "lessonTitle": "Bài 1: Thiết bị vào - ra",
    "requirementIds": [
      "TH7-A-001",
      "TH7-A-002",
      "TH7-A-003",
      "TH7-A-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết và nhận ra được các thiết bị vào/ra trong mô hình máy tính, tính đa dạng và hình dạng (chuột, bàn phím, màn hình, loa, cảm ứng, máy quét, camera, …).",
          "canonicalRequirementId": "TH7-A-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Biết được chức năng của một số thiết bị vào/ra trong thu thập, lưu trữ, xử lí và truyền thông tin.",
          "canonicalRequirementId": "TH7-A-002",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-002. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu ví dụ cụ thể về thao tác không đúng gây lỗi cho thiết bị hoặc hệ thống.",
          "canonicalRequirementId": "TH7-A-003",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-A-003 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-001) thay vì YCCĐ đích thực sự (TH7-A-003). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-A-003 ('Nêu được ví dụ cụ thể về những thao tác không đúng...'). Khi ánh xạ về đúng TH7-A-003, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện đúng các thao tác với thiết bị thông dụng.",
          "canonicalRequirementId": "TH7-A-004",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-A-004 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-001) thay vì YCCĐ đích thực sự (TH7-A-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-A-004 ('Thực hiện đúng các thao tác với các thiết bị thông...'). Khi ánh xạ về đúng TH7-A-004, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 1 sách KNTT Tin học 7 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B02",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B02",
    "lessonNumber": "Bài 2",
    "lessonTitle": "Bài 2: Phần mềm máy tính",
    "requirementIds": [
      "TH7-A-006",
      "TH7-A-008",
      "TH7-A-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được tên một số phần mềm ứng dụng (luyện gõ phím, Word, Paint, …).",
          "canonicalRequirementId": "TH7-A-006",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-006. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích chức năng điều khiển của hệ điều hành, phân biệt với phần mềm ứng dụng.",
          "canonicalRequirementId": "TH7-A-008",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-A-008 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-006) thay vì YCCĐ đích thực sự (TH7-A-008). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-A-008 ('Giải thích được chức năng điều khiển của hệ điều h...'). Khi ánh xạ về đúng TH7-A-008, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Phân biệt được loại tệp qua phần mở rộng.",
          "canonicalRequirementId": "TH7-A-009",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-A-009 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-006) thay vì YCCĐ đích thực sự (TH7-A-009). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH7-A-009 ('Phân biệt được loại tệp thông qua phần mở rộng....'). Khi ánh xạ về đúng TH7-A-009, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 2 sách KNTT Tin học 7 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B03",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B03",
    "lessonNumber": "Bài 3",
    "lessonTitle": "Bài 3: Quản lí dữ liệu trong máy tính",
    "requirementIds": [
      "TH7-A-005",
      "TH7-A-007",
      "TH7-A-010"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết tệp chương trình cũng là dữ liệu, có thể lưu trữ trong máy tính.",
          "canonicalRequirementId": "TH7-A-005",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-005. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được một số biện pháp bảo vệ máy tính, tài khoản và dữ liệu cá nhân (mật khẩu, đăng xuất, sao lưu, quét virus…).",
          "canonicalRequirementId": "TH7-A-007",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-A-007 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-005) thay vì YCCĐ đích thực sự (TH7-A-007). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-A-007 ('Nêu được một số biện pháp để bảo vệ máy tính cá nh...'). Khi ánh xạ về đúng TH7-A-007, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thao tác thành thạo với tệp và thư mục.",
          "canonicalRequirementId": "TH7-A-010",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH7-A-010"
        }
      ],
      "notes": "Bài học Bài 3 sách KNTT Tin học 7 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B04",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonNumber": "Bài 4",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "requirementIds": [
      "TH7-C-001",
      "TH7-C-002",
      "TH7-C-003",
      "TH7-C-004",
      "TH7-C-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "1.3",
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram…).",
          "canonicalRequirementId": "TH7-C-001",
          "matchType": "NORMALIZED",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH7-C-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được tên kênh và thông tin chính (YouTube chia sẻ video; Website trường cung cấp thông tin giáo dục…).",
          "canonicalRequirementId": "TH7-C-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-C-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-C-002 ('Nêu được tên kênh và thông tin trao đổi chính trên...'). Khi ánh xạ về đúng TH7-C-002, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.3",
          "legacyCriteriaText": "1.3 Nêu chức năng cơ bản của mạng xã hội: kết nối, giao lưu, chia sẻ, thảo luận, trao đổi thông tin.",
          "canonicalRequirementId": "TH7-C-003",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-C-003 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-003). Về mặt chuyên môn, tiêu chí legacy '1.3' (NB) thuộc YCCĐ TH7-C-003 ('Nêu được một số chức năng cơ bản của mạng xã hội: ...'). Khi ánh xạ về đúng TH7-C-003, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu ví dụ cụ thể về hậu quả khi sử dụng thông tin sai mục đích.",
          "canonicalRequirementId": "TH7-C-004",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-C-004 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-004). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-C-004 ('Nêu được ví dụ cụ thể về hậu quả của việc sử dụng ...'). Khi ánh xạ về đúng TH7-C-004, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sử dụng được một số chức năng cơ bản: tạo tài khoản, hồ sơ, kết nối bạn học, chia sẻ tài liệu, tạo nhóm trao đổi.",
          "canonicalRequirementId": "TH7-C-005",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-C-005 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-005). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-C-005 ('Sử dụng được một số chức năng cơ bản của một mạng ...'). Khi ánh xạ về đúng TH7-C-005, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 4 sách KNTT Tin học 7 ánh xạ 5 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B05",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonNumber": "Bài 5",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "requirementIds": [
      "TH7-D-001",
      "TH7-D-002",
      "TH7-D-003",
      "TH7-D-004",
      "TH7-D-005",
      "TH7-D-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "3.1",
        "3.2",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết tác hại của bệnh nghiện Internet.",
          "canonicalRequirementId": "TH7-D-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-D-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu cách ứng xử hợp lí khi gặp thông tin xấu, không phù hợp lứa tuổi.",
          "canonicalRequirementId": "TH7-D-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-D-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-D-002 ('Nêu được cách ứng xử hợp lí khi gặp trên mạng hoặc...'). Khi ánh xạ về đúng TH7-D-002, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu ví dụ về truy cập không hợp lệ vào nguồn thông tin/kênh truyền thông.",
          "canonicalRequirementId": "TH7-D-003",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-D-003 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-003). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-D-003 ('Nêu được một số ví dụ truy cập không hợp lệ vào cá...'). Khi ánh xạ về đúng TH7-D-003, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Biết nhờ người lớn tư vấn khi bị bắt nạt trên mạng.",
          "canonicalRequirementId": "TH7-D-004",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-D-004 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-D-004 ('Biết nhờ người lớn giúp đỡ, tư vấn khi cần thiết, ...'). Khi ánh xạ về đúng TH7-D-004, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Lựa chọn biện pháp phòng tránh nghiện Internet.",
          "canonicalRequirementId": "TH7-D-005",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-D-005 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-005). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH7-D-005 ('Lựa chọn được các biện pháp phòng tránh bệnh nghiệ...'). Khi ánh xạ về đúng TH7-D-005, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện giao tiếp trực tuyến đúng quy tắc, lịch sự, có văn hoá.",
          "canonicalRequirementId": "TH7-D-006",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-D-006 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-006). Về mặt chuyên môn, tiêu chí legacy '4.1' (VDC) thuộc YCCĐ TH7-D-006 ('Thực hiện được giao tiếp qua mạng (trực tuyến hay ...'). Khi ánh xạ về đúng TH7-D-006, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 5 sách KNTT Tin học 7 ánh xạ 6 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B06",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B06",
    "lessonNumber": "Bài 6",
    "lessonTitle": "Bài 6: Làm quen với phần mềm bảng tính",
    "requirementIds": [
      "TH7-E-001",
      "TH7-E-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu chức năng cơ bản của phần mềm bảng tính.",
          "canonicalRequirementId": "TH7-E-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện thao tác đơn giản với trang tính.",
          "canonicalRequirementId": "TH7-E-003",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-E-003 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-001) thay vì YCCĐ đích thực sự (TH7-E-003). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-E-003 ('Thực hiện được một số thao tác đơn giản với trang ...'). Khi ánh xạ về đúng TH7-E-003, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 6 sách KNTT Tin học 7 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B07",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B07",
    "lessonNumber": "Bài 7",
    "lessonTitle": "Bài 7: Tính toán tự động trên bảng tính",
    "requirementIds": [
      "TH7-E-002",
      "TH7-E-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích việc dùng công thức trong bảng tính là cách tính toán tự động trên dữ liệu.",
          "canonicalRequirementId": "TH7-E-002",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-002. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sử dụng được công thức và dùng được địa chỉ trong công thức , tạo được bảng tính đơn giản có số liệu tính toán bằng công thức",
          "canonicalRequirementId": "TH7-E-005",
          "matchType": "NORMALIZED",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH7-E-005"
        }
      ],
      "notes": "Bài học Bài 7 sách KNTT Tin học 7 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B08",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B08",
    "lessonNumber": "Bài 8",
    "lessonTitle": "Bài 8: Công cụ hỗ trợ tính toán",
    "requirementIds": [
      "TH7-E-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện được một số phép toán thông dụng, sử dụng một số hàm cơ bản như: MAX, MIN, SUM, AVERAGE, COUNT,...",
          "canonicalRequirementId": "TH7-E-004",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-004. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 8 sách KNTT Tin học 7 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B09",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B09",
    "lessonNumber": "Bài 9",
    "lessonTitle": "Bài 9: Trình bày bảng tính",
    "requirementIds": [
      "TH7-E-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Thực hiện phép toán thông dụng; sử dụng hàm đơn giản: MAX, MIN, SUM, AVERAGE, COUNT, …",
          "canonicalRequirementId": "TH7-E-004",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-004. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 9 sách KNTT Tin học 7 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B10",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B10",
    "lessonNumber": "Bài 10",
    "lessonTitle": "Bài 10: Hoàn thiện bảng tính",
    "requirementIds": [
      "TH7-E-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Sử dụng bảng tính để giải quyết một số công việc học tập, đời sống đơn giản.",
          "canonicalRequirementId": "TH7-E-006",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-006. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 10 sách KNTT Tin học 7 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B11",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B11",
    "lessonNumber": "Bài 11",
    "lessonTitle": "Bài 11: Tạo bài trình chiếu",
    "requirementIds": [
      "TH7-E-007",
      "TH7-E-010"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu chức năng cơ bản của phần mềm trình chiếu.",
          "canonicalRequirementId": "TH7-E-007",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-007. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Tạo báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
          "canonicalRequirementId": "TH7-E-010",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-E-010 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-007) thay vì YCCĐ đích thực sự (TH7-E-010). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-E-010 ('Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp...'). Khi ánh xạ về đúng TH7-E-010, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 11 sách KNTT Tin học 7 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B12",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B12",
    "lessonNumber": "Bài 12",
    "lessonTitle": "Bài 12: Định dạng đối tượng trên trang chiếu",
    "requirementIds": [
      "TH7-E-008",
      "TH7-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.2",
        "3.3"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Sử dụng định dạng văn bản, ảnh minh hoạ và hiệu ứng hợp lí.",
          "canonicalRequirementId": "TH7-E-008",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-008. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Sao chép dữ liệu từ văn bản sang trang trình chiếu.",
          "canonicalRequirementId": "TH7-E-009",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-E-009 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-008) thay vì YCCĐ đích thực sự (TH7-E-009). Về mặt chuyên môn, tiêu chí legacy '3.3' (VD) thuộc YCCĐ TH7-E-009 ('Sao chép được dữ liệu phù hợp từ tệp văn bản sang ...'). Khi ánh xạ về đúng TH7-E-009, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 12 sách KNTT Tin học 7 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B13",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B13",
    "lessonNumber": "Bài 13",
    "lessonTitle": "Bài 13: Thực hành tổng hợp: Hoàn thiện bài trình chiếu",
    "requirementIds": [
      "TH7-E-010"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Tạo được một báo cáo có sử dụng hiệu ứng động một cách hợp lí",
          "canonicalRequirementId": "TH7-E-010",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH7-E-010. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 13 sách KNTT Tin học 7 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B14",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B14",
    "lessonNumber": "Bài 14",
    "lessonTitle": "Bài 14: Thuật toán tìm kiếm tuần tự",
    "requirementIds": [
      "TH7-F-004",
      "TH7-F-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích thuật toán tìm kiếm tuần tự bằng các bước thủ công.",
          "canonicalRequirementId": "TH7-F-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH7-F-005"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Biểu diễn và mô phỏng hoạt động của thuật toán tìm kiếm tuần tự trên bộ dữ liệu nhỏ.",
          "canonicalRequirementId": "TH7-F-004",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH7-F-004. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 14 sách KNTT Tin học 7 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B15",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B15",
    "lessonNumber": "Bài 15",
    "lessonTitle": "Bài 15: Thuật toán tìm kiếm nhị phân",
    "requirementIds": [
      "TH7-F-003",
      "TH7-F-004",
      "TH7-F-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.3",
        "2.4",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.3",
          "legacyCriteriaText": "2.3 Giải thích thuật toán tìm kiếm nhị phân bằng các bước thủ công.",
          "canonicalRequirementId": "TH7-F-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.3] và YCCĐ chuẩn TH7-F-006"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.4",
          "legacyCriteriaText": "2.4 Giải thích mối liên quan giữa sắp xếp và tìm kiếm, nêu ví dụ minh hoạ.",
          "canonicalRequirementId": "TH7-F-003",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-F-003. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Biểu diễn và mô phỏng hoạt động của thuật toán tìm kiếm nhị phân trên bộ dữ liệu nhỏ.",
          "canonicalRequirementId": "TH7-F-004",
          "matchType": "PARTIAL_MATCH",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-F-004 (PARTIAL_MATCH): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-003) thay vì YCCĐ đích thực sự (TH7-F-004). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH7-F-004 ('Biểu diễn và mô phỏng được hoạt động của thuật toá...'). Khi ánh xạ về đúng TH7-F-004, mức độ tương thích là PARTIAL_MATCH."
        }
      ],
      "notes": "Bài học Bài 15 sách KNTT Tin học 7 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH7-B16",
    "bookSeries": "KNTT",
    "grade": 7,
    "lessonId": "KNTT-TH7-B16",
    "lessonNumber": "Bài 16",
    "lessonTitle": "Bài 16: Thuật toán sắp xếp",
    "requirementIds": [
      "TH7-F-001",
      "TH7-F-002",
      "TH7-F-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.5",
        "3.3"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu ý nghĩa của việc chia một bài toán thành bài toán nhỏ.",
          "canonicalRequirementId": "TH7-F-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-F-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.5",
          "legacyCriteriaText": "2.5 Giải thích một vài thuật toán sắp xếp bằng bước thủ công.",
          "canonicalRequirementId": "TH7-F-002",
          "matchType": "PARTIAL_MATCH",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-F-002 (PARTIAL_MATCH): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-001) thay vì YCCĐ đích thực sự (TH7-F-002). Về mặt chuyên môn, tiêu chí legacy '2.5' (TH) thuộc YCCĐ TH7-F-002 ('Giải thích được một vài thuật toán sắp xếp và tìm ...'). Khi ánh xạ về đúng TH7-F-002, mức độ tương thích là PARTIAL_MATCH."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Biểu diễn và mô phỏng hoạt động của thuật toán sắp xếp trên bộ dữ liệu nhỏ.",
          "canonicalRequirementId": "TH7-F-004",
          "matchType": "PARTIAL_MATCH",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH7-F-004 (PARTIAL_MATCH): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-001) thay vì YCCĐ đích thực sự (TH7-F-004). Về mặt chuyên môn, tiêu chí legacy '3.3' (VD) thuộc YCCĐ TH7-F-004 ('Biểu diễn và mô phỏng được hoạt động của thuật toá...'). Khi ánh xạ về đúng TH7-F-004, mức độ tương thích là PARTIAL_MATCH."
        }
      ],
      "notes": "Bài học Bài 16 sách KNTT Tin học 7 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B01",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B01",
    "lessonNumber": "Bài 1",
    "lessonTitle": "Bài 1: Lược sử công cụ tính toán",
    "requirementIds": [
      "TH8-A-001",
      "TH8-A-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Trình bày được sơ lược lịch sử phát triển máy tính.",
          "canonicalRequirementId": "TH8-A-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH8-A-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được ví dụ cho thấy sự phát triển máy tính đã đem đến những thay đổi lớn lao cho xã hội loài người.",
          "canonicalRequirementId": "TH8-A-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-A-002"
        }
      ],
      "notes": "Bài học Bài 1 sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B02",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B02",
    "lessonNumber": "Bài 2",
    "lessonTitle": "Bài 2: Thông tin trong môi trường số",
    "requirementIds": [
      "TH8-C-001",
      "TH8-C-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được các đặc điểm của thông tin số: đa dạng, được thu thập ngày càng nhanh và nhiều, dung lượng lớn, có bản quyền, độ tin cậy khác nhau, có công cụ tìm kiếm/chuyển đổi/truyền/xử lí hiệu quả.",
          "canonicalRequirementId": "TH8-C-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-C-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Trình bày được tầm quan trọng của việc biết khai thác các nguồn thông tin đáng tin cậy, có ví dụ minh hoạ.",
          "canonicalRequirementId": "TH8-C-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-C-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-001) thay vì YCCĐ đích thực sự (TH8-C-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-C-002 ('Trình bày được tầm quan trọng của việc biết khai t...'). Khi ánh xạ về đúng TH8-C-002, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 2 sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B03",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B03",
    "lessonNumber": "Bài 3",
    "lessonTitle": "Bài 3: Thực hành: Khai thác thông tin số",
    "requirementIds": [
      "TH8-C-003",
      "TH8-C-004",
      "TH8-C-005",
      "TH8-C-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "2.2",
        "3.1",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí, trao đổi thông tin trong môi trường số.",
          "canonicalRequirementId": "TH8-C-003",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-C-003. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Xác định được lợi ích của thông tin tìm được trong giải quyết vấn đề, có ví dụ minh hoạ.",
          "canonicalRequirementId": "TH8-C-005",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-C-005 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-003) thay vì YCCĐ đích thực sự (TH8-C-005). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-C-005 ('Xác định được lợi ích của thông tin tìm được trong...'). Khi ánh xạ về đúng TH8-C-005, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
          "canonicalRequirementId": "TH8-C-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH8-C-004"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Chủ động tìm kiếm thông tin để thực hiện nhiệm vụ học tập (qua bài tập cụ thể).",
          "canonicalRequirementId": "TH8-C-006",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-C-006 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-003) thay vì YCCĐ đích thực sự (TH8-C-006). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH8-C-006 ('Chủ động tìm kiếm được thông tin để thực hiện nhiệ...'). Khi ánh xạ về đúng TH8-C-006, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 3 sách KNTT Tin học 8 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B04",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B04",
    "lessonNumber": "Bài 4",
    "lessonTitle": "Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số",
    "requirementIds": [
      "TH8-D-001",
      "TH8-D-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nhận biết và giải thích được một số biểu hiện vi phạm đạo đức, pháp luật, thiếu văn hoá khi dùng công nghệ số (quay phim/chụp ảnh trái phép, dùng sản phẩm vi phạm bản quyền…).",
          "canonicalRequirementId": "TH8-D-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-D-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Khi tạo sản phẩm số luôn thể hiện tính đạo đức, văn hoá và tuân thủ pháp luật.",
          "canonicalRequirementId": "TH8-D-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-D-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-D-001) thay vì YCCĐ đích thực sự (TH8-D-002). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH8-D-002 ('Khi tạo ra các sản phẩm số luôn thể hiện được tính...'). Khi ánh xạ về đúng TH8-D-002, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 4 sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B05",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B05",
    "lessonNumber": "Bài 5",
    "lessonTitle": "Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế",
    "requirementIds": [
      "TH8-E-001",
      "TH8-E-002",
      "TH8-E-004",
      "TH8-E-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "2.2",
        "3.1",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của ô tính.",
          "canonicalRequirementId": "TH8-E-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Giải thích sự thay đổi địa chỉ tương đối khi sao chép công thức.",
          "canonicalRequirementId": "TH8-E-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-E-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-001) thay vì YCCĐ đích thực sự (TH8-E-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-E-002 ('Giải thích được sự thay đổi địa chỉ tương đối tron...'). Khi ánh xạ về đúng TH8-E-002, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sao chép dữ liệu từ tệp văn bản, trang trình chiếu sang trang tính.",
          "canonicalRequirementId": "TH8-E-004",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-E-004 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-001) thay vì YCCĐ đích thực sự (TH8-E-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH8-E-004 ('Sao chép được dữ liệu từ các tệp văn bản, trang tr...'). Khi ánh xạ về đúng TH8-E-004, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Sử dụng được phần mềm bảng tính trợ giúp giải quyết bài toán thực tế",
          "canonicalRequirementId": "TH8-E-005",
          "matchType": "NORMALIZED",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.2] và YCCĐ chuẩn TH8-E-005"
        }
      ],
      "notes": "Bài học Bài 5 sách KNTT Tin học 8 ánh xạ 4 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B06",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B06",
    "lessonNumber": "Bài 6",
    "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
    "requirementIds": [
      "TH8-E-003",
      "TH8-E-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.2",
        "3.3",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Thực hiện được các thao tác lọc và sắp xếp dữ liệu.",
          "canonicalRequirementId": "TH8-E-003",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Nêu được một số tình huống thực tế cần sử dụng chức năng lọc và sắp xếp đữ liệu của phần mềm bảng tính",
          "canonicalRequirementId": "TH8-E-003",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Sử dụng được phần mềm bảng tính để giải quyết bài toán thực tế.",
          "canonicalRequirementId": "TH8-E-005",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-E-005 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-003) thay vì YCCĐ đích thực sự (TH8-E-005). Về mặt chuyên môn, tiêu chí legacy '4.1' (VDC) thuộc YCCĐ TH8-E-005 ('Sử dụng được phần mềm bảng tính trợ giúp giải quyế...'). Khi ánh xạ về đúng TH8-E-005, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 6 sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B07",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B07",
    "lessonNumber": "Bài 7",
    "lessonTitle": "Bài 7: Trình bày dữ liệu bằng biểu đồ",
    "requirementIds": [
      "TH8-E-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.4",
        "3.5"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.4",
          "legacyCriteriaText": "3.4 Thực hiện được thao tác tạo biểu đồ.",
          "canonicalRequirementId": "TH8-E-003",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.5",
          "legacyCriteriaText": "3.5 Nêu được tình huống thực tế cần sử dụng chức năng vẽ biểu đồ.",
          "canonicalRequirementId": "TH8-E-003",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 7 sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B08A",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B08A",
    "lessonNumber": "Bài 8a",
    "lessonTitle": "Bài 8a: Làm việc với danh sách dạng liệt kê và hình ảnh trong văn bản",
    "requirementIds": [
      "TH8-E-006",
      "TH8-E-011"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện được các thao tác: Chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê.",
          "canonicalRequirementId": "TH8-E-006",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-006. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Tạo được một số sản phẩm là văn bản có tính thẩm mĩ phục vụ nhu cầu thực tế.",
          "canonicalRequirementId": "TH8-E-011",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.2] và YCCĐ chuẩn TH8-E-011"
        }
      ],
      "notes": "Bài học Bài 8a sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B08B",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B08B",
    "lessonNumber": "Bài 8b",
    "lessonTitle": "Bài 8b: Phần mềm chỉnh sửa ảnh",
    "requirementIds": [
      "TH8-E-013",
      "TH8-E-014"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được một vài chức năng chính và thực hiện được một số thao tác cơ bản với phần mềm chỉnh sửa ảnh.",
          "canonicalRequirementId": "TH8-E-013",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-E-013"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Tạo được một vài sản phẩm số đơn giản đáp ứng nhu cầu cá nhân, gia đình, trường học và địa phương.",
          "canonicalRequirementId": "TH8-E-014",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH8-E-014"
        }
      ],
      "notes": "Bài học Bài 8b sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B09A",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B09A",
    "lessonNumber": "Bài 9a",
    "lessonTitle": "Bài 9a: Tạo đầu trang, chân trang cho văn bản",
    "requirementIds": [
      "TH8-E-006",
      "TH8-E-011"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang.",
          "canonicalRequirementId": "TH8-E-006",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-006. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Tạo được một số sản phẩm là văn bản có tính thẩm mĩ phục vụ nhu cầu thực tế.",
          "canonicalRequirementId": "TH8-E-011",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH8-E-011"
        }
      ],
      "notes": "Bài học Bài 9a sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B09B",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B09B",
    "lessonNumber": "Bài 9b",
    "lessonTitle": "Bài 9b: Thay đổi khung hình, kích thước ảnh",
    "requirementIds": [
      "TH8-E-013",
      "TH8-E-014"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được một vài chức năng chính và thực hiện được một số thao tác cơ bản với phần mềm chỉnh sửa ảnh.",
          "canonicalRequirementId": "TH8-E-013",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-E-013"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Tạo được một vài sản phẩm số đơn giản đáp ứng nhu cầu cá nhân, gia đình, trường học và địa phương.",
          "canonicalRequirementId": "TH8-E-014",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH8-E-014"
        }
      ],
      "notes": "Bài học Bài 9b sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B10A",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B10A",
    "lessonNumber": "Bài 10a",
    "lessonTitle": "Bài 10a: Định dạng nâng cao cho trang chiếu",
    "requirementIds": [
      "TH8-E-007",
      "TH8-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Chọn đặt được màu sắc, cỡ chữ hài hoà, hợp lí với nội dung.",
          "canonicalRequirementId": "TH8-E-007",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-007. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang",
          "canonicalRequirementId": "TH8-E-009",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-009. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 10a sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B10B",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B10B",
    "lessonNumber": "Bài 10b",
    "lessonTitle": "Bài 10b: Thêm văn bản, tạo hiệu ứng cho ảnh",
    "requirementIds": [
      "TH8-E-013"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được một vài chức năng chính và thực hiện được một số thao tác cơ bản với phần mềm chỉnh sửa ảnh.",
          "canonicalRequirementId": "TH8-E-013",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-E-013"
        }
      ],
      "notes": "Bài học Bài 10b sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B11A",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B11A",
    "lessonNumber": "Bài 11a",
    "lessonTitle": "Bài 11a: Sử dụng văn bản mẫu tạo bài trình chiếu",
    "requirementIds": [
      "TH8-E-008",
      "TH8-E-010",
      "TH8-E-012"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.2",
        "3.3",
        "3.4"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Sử dụng các bản mẫu (template) để tạo bài trình chiếu.",
          "canonicalRequirementId": "TH8-E-010",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH8-E-010 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-008) thay vì YCCĐ đích thực sự (TH8-E-010). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH8-E-010 ('Sử dụng được các bản mẫu (template) để tạo bài trì...'). Khi ánh xạ về đúng TH8-E-010, mức độ tương thích là CONFIRMED."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Đưa được vào trong trang chiếu đường dẫn đến video hay tài liệu khác.",
          "canonicalRequirementId": "TH8-E-008",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.3] và YCCĐ chuẩn TH8-E-008"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.4",
          "legacyCriteriaText": "3.4 Tạo được các sản phẩm số phục vụ học tập, giao lưu và trao đổi thông tin trong phần mềm trình chiếu.",
          "canonicalRequirementId": "TH8-E-012",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.4] và YCCĐ chuẩn TH8-E-012"
        }
      ],
      "notes": "Bài học Bài 11a sách KNTT Tin học 8 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B11B",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B11B",
    "lessonNumber": "Bài 11b",
    "lessonTitle": "Bài 11b: Thực hành tổng hợp",
    "requirementIds": [
      "TH8-E-013"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được một vài chức năng chính và thực hiện được một số thao tác cơ bản với phần mềm chỉnh sửa ảnh.",
          "canonicalRequirementId": "TH8-E-013",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-E-013"
        }
      ],
      "notes": "Bài học Bài 11b sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B12",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B12",
    "lessonNumber": "Bài 12",
    "lessonTitle": "Bài 12: Từ thuật toán đến chương trình",
    "requirementIds": [
      "TH8-F-002",
      "TH8-F-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Hiểu được chương trình là dãy các lệnh điều khiển máy tính thực hiện một thuật toán.",
          "canonicalRequirementId": "TH8-F-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-F-002"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Mô tả được kịch bản đơn giản dưới dạng thuật toán và tạo được một chương trình đơn giản.",
          "canonicalRequirementId": "TH8-F-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH8-F-003"
        }
      ],
      "notes": "Bài học Bài 12 sách KNTT Tin học 8 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B13",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B13",
    "lessonNumber": "Bài 13",
    "lessonTitle": "Bài 13: Biểu diễn dữ liệu",
    "requirementIds": [
      "TH8-F-001"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được khái niệm hằng, biến, kiểu dữ liệu, biểu thức. Sử dụng được các khái niệm hằng, biến, kiểu dữ liệu, biểu thức ở các chương trình đơn giản trong môi trường lập trình trực quan.",
          "canonicalRequirementId": "TH8-F-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-F-001"
        }
      ],
      "notes": "Bài học Bài 13 sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B14",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B14",
    "lessonNumber": "Bài 14",
    "lessonTitle": "Bài 14: Cấu trúc điều khiển",
    "requirementIds": [
      "TH8-F-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Thể hiện được cấu trúc tuần tự, rẽ nhánh và lặp ở chương trình trong môi trường lập trình trực quan.",
          "canonicalRequirementId": "TH8-F-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH8-F-004"
        }
      ],
      "notes": "Bài học Bài 14 sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B15",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B15",
    "lessonNumber": "Bài 15",
    "lessonTitle": "Bài 15: Gỡ lỗi",
    "requirementIds": [
      "TH8-F-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Chạy thử, tìm lỗi và sửa được lỗi cho chương trình.",
          "canonicalRequirementId": "TH8-F-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH8-F-005"
        }
      ],
      "notes": "Bài học Bài 15 sách KNTT Tin học 8 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH8-B16",
    "bookSeries": "KNTT",
    "grade": 8,
    "lessonId": "KNTT-TH8-B16",
    "lessonNumber": "Bài 16",
    "lessonTitle": "Bài 16: Tin học với nghề nghiệp",
    "requirementIds": [
      "TH8-G-001",
      "TH8-G-002",
      "TH8-G-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được một số nghề nghiệp mà ứng dụng tin học sẽ làm tăng hiệu quả công việc.",
          "canonicalRequirementId": "TH8-G-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH8-G-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nêu được tên một số nghề thuộc lĩnh vực tin học và một số nghề liên quan đến ứng dụng tin học.",
          "canonicalRequirementId": "TH8-G-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH8-G-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nhận thức và trình bày được vấn đề bình đẳng giới trong việc sử dụng máy tính và trong ứng dụng tin học, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH8-G-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH8-G-003"
        }
      ],
      "notes": "Bài học Bài 16 sách KNTT Tin học 8 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B01",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B01",
    "lessonNumber": "Bài 1",
    "lessonTitle": "Bài 1. Thế giới kĩ thuật số",
    "requirementIds": [
      "TH9-A-001",
      "TH9-A-002",
      "TH9-A-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được khả năng của máy tính và chỉ ra được một số ứng dụng thực tế của nó trong khoa học kĩ thuật và đời sống.",
          "canonicalRequirementId": "TH9-A-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-A-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nhận biết được sự có mặt của các thiết bị có gắn bộ xử lí thông tin ở khắp nơi (trong gia đình, ở trường học, cửa hàng, bệnh viện, công sở, nhà máy,...), trong mọi lĩnh vực (y tế, ngân hàng, hàng không, toán học, sinh học,...), nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-A-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-A-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Giải thích được tác động của công nghệ thông tin lên giáo dục và xã hội thông qua các ví dụ cụ thể.",
          "canonicalRequirementId": "TH9-A-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH9-A-003"
        }
      ],
      "notes": "Bài học Bài 1 sách KNTT Tin học 9 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B02",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B02",
    "lessonNumber": "Bài 2",
    "lessonTitle": "Bài 2. Thông tin trong giải quyết vấn đề",
    "requirementIds": [
      "TH9-C-001",
      "TH9-C-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-C-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-C-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin. Nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-C-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH9-C-002"
        }
      ],
      "notes": "Bài học Bài 2 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B03",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B03",
    "lessonNumber": "Bài 3",
    "lessonTitle": "Bài 3. Thực hành: Đánh giá chất lượng thông tin",
    "requirementIds": [
      "TH9-C-001",
      "TH9-C-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được ví dụ minh hoạ giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin",
          "canonicalRequirementId": "TH9-C-001",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH9-C-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Nêu được ví dụ minh hoạ giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin.",
          "canonicalRequirementId": "TH9-C-002",
          "matchType": "CONFIRMED",
          "notes": "[RESOLVED in TASK 005B] Ánh xạ chính xác về TH9-C-002 (CONFIRMED): Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH9-C-001) thay vì YCCĐ đích thực sự (TH9-C-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH9-C-002 ('Giải thích được tính mới, tính chính xác, tính đầy...'). Khi ánh xạ về đúng TH9-C-002, mức độ tương thích là CONFIRMED."
        }
      ],
      "notes": "Bài học Bài 3 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B04",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B04",
    "lessonNumber": "Bài 4",
    "lessonTitle": "Bài 4. Một số vấn đề pháp lí về sử dụng dịch vụ Internet",
    "requirementIds": [
      "TH9-D-001",
      "TH9-D-002",
      "TH9-D-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được một số nội dung liên quan đến luật Công nghệ thông tin, nghị định về sử dụng dịch vụ Internet, các khía cạnh pháp lí của việc sở hữu, sử dụng và trao đổi thông tin.",
          "canonicalRequirementId": "TH9-D-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-D-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Trình bày được một số tác động tiêu cực của công nghệ kĩ thuật số đối với đời sống con người và xã hội, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-D-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-D-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Nêu được một số hành vi vi phạm pháp luật, trái đạo đức, thiếu văn hoá khi hoạt động trong môi trường số thông qua một vài ví dụ.",
          "canonicalRequirementId": "TH9-D-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH9-D-003"
        }
      ],
      "notes": "Bài học Bài 4 sách KNTT Tin học 9 ánh xạ 3 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B05",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B05",
    "lessonNumber": "Bài 5",
    "lessonTitle": "Bài 5. Tìm hiểu phần mềm mô phỏng",
    "requirementIds": [
      "TH9-E-003"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu được ví dụ phần mềm mô phỏng.",
          "canonicalRequirementId": "TH9-E-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-E-003"
        }
      ],
      "notes": "Bài học Bài 5 sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B06",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B06",
    "lessonNumber": "Bài 6",
    "lessonTitle": "Bài 6. Thực hành: Khai thác phần mềm mô phỏng",
    "requirementIds": [
      "TH9-E-001",
      "TH9-E-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được những kiến thức đã thu nhận từ việc khai thác một vài phần mềm mô phỏng.",
          "canonicalRequirementId": "TH9-E-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-E-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nhận biết được sự mô phỏng thế giới thực nhờ máy tính có thể giúp con người khám phá tri thức và giải quyết vấn đề.",
          "canonicalRequirementId": "TH9-E-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH9-E-002"
        }
      ],
      "notes": "Bài học Bài 6 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B07",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B07",
    "lessonNumber": "Bài 7",
    "lessonTitle": "Bài 7. Trình bày thông tin trong trao đổi và hợp tác",
    "requirementIds": [
      "TH9-E-004",
      "TH9-E-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Biết được khả năng đính kèm văn bản, ảnh, video, trang tính vào sơ đồ tư duy.",
          "canonicalRequirementId": "TH9-E-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-E-004"
        },
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Sử dụng được bài trình chiếu và sơ đồ tư duy trong trao đổi thông tin và hợp tác.",
          "canonicalRequirementId": "TH9-E-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-006"
        }
      ],
      "notes": "Bài học Bài 7 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B08",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B08",
    "lessonNumber": "Bài 8",
    "lessonTitle": "Bài 8. Thực hành: Sử dụng công cụ trực quan trình bày thông tin trong trao đổi và hợp tác",
    "requirementIds": [
      "TH9-E-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sử dụng được hình ảnh, biểu đồ, video trong trao đổi thông tin và hợp tác.",
          "canonicalRequirementId": "TH9-E-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH9-E-005"
        }
      ],
      "notes": "Bài học Bài 8 sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B09A",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B09A",
    "lessonNumber": "Bài 9a",
    "lessonTitle": "Bài 9a. Sử dụng công cụ xác thực dữ liệu",
    "requirementIds": [
      "TH9-E-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được dự án sử dụng bảng tính điện tử góp phần giải quyết một bài toán liên quan đến quản lí tài chính, dân số,... Ví dụ: quản lí chi tiêu của gia đình, quản lí thu chi quỹ lớp.",
          "canonicalRequirementId": "TH9-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-007"
        }
      ],
      "notes": "Bài học Bài 9a sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B10A",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B10A",
    "lessonNumber": "Bài 10a",
    "lessonTitle": "Bài 10a. Sử dụng hàm COUNTIF",
    "requirementIds": [
      "TH9-E-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được dự án sử dụng bảng tính điện tử góp phần giải quyết một bài toán liên quan đến quản lí tài chính, dân số,... Ví dụ: quản lí chi tiêu của gia đình, quản lí thu chi quỹ lớp.",
          "canonicalRequirementId": "TH9-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-007"
        }
      ],
      "notes": "Bài học Bài 10a sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B11A",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B11A",
    "lessonNumber": "Bài 11a",
    "lessonTitle": "Bài 11a. Sử dụng hàm SUMIF",
    "requirementIds": [
      "TH9-E-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được dự án sử dụng bảng tính điện tử góp phần giải quyết một bài toán liên quan đến quản lí tài chính, dân số,... Ví dụ: quản lí chi tiêu của gia đình, quản lí thu chi quỹ lớp.",
          "canonicalRequirementId": "TH9-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-007"
        }
      ],
      "notes": "Bài học Bài 11a sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B12A",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B12A",
    "lessonNumber": "Bài 12a",
    "lessonTitle": "Bài 12a. Sử dụng hàm IF",
    "requirementIds": [
      "TH9-E-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được dự án sử dụng bảng tính điện tử góp phần giải quyết một bài toán liên quan đến quản lí tài chính, dân số,... Ví dụ: quản lí chi tiêu của gia đình, quản lí thu chi quỹ lớp.",
          "canonicalRequirementId": "TH9-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-007"
        }
      ],
      "notes": "Bài học Bài 12a sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B13A",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B13A",
    "lessonNumber": "Bài 13a",
    "lessonTitle": "Bài 13a. Hoàn thiện bảng tính quản lí tài chính gia đình",
    "requirementIds": [
      "TH9-E-007"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Thực hiện được dự án sử dụng bảng tính điện tử góp phần giải quyết một bài toán liên quan đến quản lí tài chính, dân số,... Ví dụ: quản lí chi tiêu của gia đình, quản lí thu chi quỹ lớp.",
          "canonicalRequirementId": "TH9-E-007",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VDC 4.1] và YCCĐ chuẩn TH9-E-007"
        }
      ],
      "notes": "Bài học Bài 13a sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B09B",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B09B",
    "lessonNumber": "Bài 9b",
    "lessonTitle": "Bài 9b. Các chức năng chính của phần mềm làm video",
    "requirementIds": [
      "TH9-E-008"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Nêu được một số chức năng cơ bản của phần mềm làm video.",
          "canonicalRequirementId": "TH9-E-008",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 9b sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B10B",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B10B",
    "lessonNumber": "Bài 10b",
    "lessonTitle": "Bài 10b. Chuẩn bị dữ liệu và dựng video",
    "requirementIds": [
      "TH9-E-008",
      "TH9-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.1",
        "3.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Chuẩn bị được các dữ liệu: văn bản, hình ảnh, video, nhạc nền, thuyết minh,…",
          "canonicalRequirementId": "TH9-E-008",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.2",
          "legacyCriteriaText": "3.2 Dựng được video ngắn (1-2 phút) có phụ đề.",
          "canonicalRequirementId": "TH9-E-008",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 10b sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B11B",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B11B",
    "lessonNumber": "Bài 11b",
    "lessonTitle": "Bài 11b. Thực hành: Dựng video theo kịch bản",
    "requirementIds": [
      "TH9-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.3"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.3",
          "legacyCriteriaText": "3.3 Dựng được video ngắn (1-2 phút) có phụ đề theo một kịch bản cho trước.",
          "canonicalRequirementId": "TH9-E-009",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-009. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 11b sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B12B",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B12B",
    "lessonNumber": "Bài 12b",
    "lessonTitle": "Bài 12b. Hoàn thành việc dựng video",
    "requirementIds": [
      "TH9-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "3.4"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.4",
          "legacyCriteriaText": "3.4 Hoàn thành được một video ngắn: chèn hiệu ứng, chuyển cảnh, thêm nhạc nền, thuyết minh, phụ đề.",
          "canonicalRequirementId": "TH9-E-009",
          "matchType": "PARTIAL_MATCH",
          "notes": "[REVIEWED in TASK 005B] PARTIAL_MATCH: Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-009. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ."
        }
      ],
      "notes": "Bài học Bài 12b sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B13B",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B13B",
    "lessonNumber": "Bài 13b",
    "lessonTitle": "Bài 13b. Biên tập và xuất video",
    "requirementIds": [
      "TH9-E-009"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "4.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "VDC",
          "legacyCriteriaCode": "4.1",
          "legacyCriteriaText": "4.1 Biên tập và xuất được một video ngắn (1-2 phút) phục vụ một nhiệm vụ cụ thể.",
          "canonicalRequirementId": "TH9-E-009",
          "matchType": "CONFIRMED",
          "notes": "[REVIEWED in TASK 005B] CONFIRMED: Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH9-E-009. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu."
        }
      ],
      "notes": "Bài học Bài 13b sách KNTT Tin học 9 ánh xạ 1 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B14",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B14",
    "lessonNumber": "Bài 14",
    "lessonTitle": "Bài 14. Giải quyết vấn đề",
    "requirementIds": [
      "TH9-F-001",
      "TH9-F-002"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "2.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Nêu được quy trình con người giao bài toán cho máy tính giải quyết.",
          "canonicalRequirementId": "TH9-F-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-F-001"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Trình bày được quá trình giải quyết vấn đề và mô tả được giải pháp dưới dạng thuật toán (hoặc bằng phương pháp liệt kê các bước hoặc bằng sơ đồ khối).",
          "canonicalRequirementId": "TH9-F-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-F-002"
        }
      ],
      "notes": "Bài học Bài 14 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B15",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B15",
    "lessonNumber": "Bài 15",
    "lessonTitle": "Bài 15. Bài toán tin học",
    "requirementIds": [
      "TH9-F-003",
      "TH9-F-004"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "2.2"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích được trong quy trình giải quyết vấn đề có những bước (những vấn đề nhỏ hơn) có thể chuyển giao cho máy tính thực hiện, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-F-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-F-003"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Giải thích được khái niệm bài toán trong tin học là một nhiệm vụ có thể giao cho máy tính thực hiện, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-F-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH9-F-004"
        }
      ],
      "notes": "Bài học Bài 15 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B16",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B16",
    "lessonNumber": "Bài 16",
    "lessonTitle": "Bài 16. Thực hành: Lập chương trình máy tính",
    "requirementIds": [
      "TH9-F-005",
      "TH9-F-006"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "2.1",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Giải thích được chương trình là bản mô tả thuật toán bằng ngôn ngữ mà máy tính có thể “hiểu” và thực hiện.",
          "canonicalRequirementId": "TH9-F-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-F-005"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Sử dụng được cấu trúc tuần tự, rẽ nhánh, lặp trong mô tả thuật toán.",
          "canonicalRequirementId": "TH9-F-006",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH9-F-006"
        }
      ],
      "notes": "Bài học Bài 16 sách KNTT Tin học 9 ánh xạ 2 YCCĐ CTGDPT 2018."
    }
  },
  {
    "id": "KNTT-TH9-B17",
    "bookSeries": "KNTT",
    "grade": 9,
    "lessonId": "KNTT-TH9-B17",
    "lessonNumber": "Bài 17",
    "lessonTitle": "Bài 17. Tin học và thế giới nghề nghiệp",
    "requirementIds": [
      "TH9-G-001",
      "TH9-G-002",
      "TH9-G-003",
      "TH9-G-004",
      "TH9-G-005"
    ],
    "mappingStatus": "verified",
    "evidence": {
      "legacyCriteriaCodes": [
        "1.1",
        "1.2",
        "2.1",
        "2.2",
        "3.1"
      ],
      "criteriaMappings": [
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.1",
          "legacyCriteriaText": "1.1 Trình bày được công việc đặc thù và sản phẩm chính của người làm tin học trong ít nhất ba nhóm nghề.",
          "canonicalRequirementId": "TH9-G-001",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.1] và YCCĐ chuẩn TH9-G-001"
        },
        {
          "legacyLevel": "NB",
          "legacyCriteriaCode": "1.2",
          "legacyCriteriaText": "1.2 Nhận biết được đặc trưng cơ bản của nhóm nghề thuộc hướng Tin học ứng dụng và nhóm nghề thuộc hướng Khoa học máy tính.",
          "canonicalRequirementId": "TH9-G-002",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [NB 1.2] và YCCĐ chuẩn TH9-G-002"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.1",
          "legacyCriteriaText": "2.1 Nêu và giải thích được ý kiến cá nhân (thích hay không thích,...) về một nhóm nghề nào đó.",
          "canonicalRequirementId": "TH9-G-003",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.1] và YCCĐ chuẩn TH9-G-003"
        },
        {
          "legacyLevel": "TH",
          "legacyCriteriaCode": "2.2",
          "legacyCriteriaText": "2.2 Giải thích được cả nam và nữ đều có thể thích hợp với các ngành nghề trong lĩnh vực tin học, nêu được ví dụ minh hoạ.",
          "canonicalRequirementId": "TH9-G-004",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [TH 2.2] và YCCĐ chuẩn TH9-G-004"
        },
        {
          "legacyLevel": "VD",
          "legacyCriteriaCode": "3.1",
          "legacyCriteriaText": "3.1 Tìm hiểu được (thông qua Internet và những kênh thông tin khác) công việc ở một số doanh nghiệp, công ti có sử dụng nhân lực thuộc các nhóm ngành đã được giới thiệu.",
          "canonicalRequirementId": "TH9-G-005",
          "matchType": "EXACT",
          "notes": "Mối liên kết giữa tiêu chí cũ [VD 3.1] và YCCĐ chuẩn TH9-G-005"
        }
      ],
      "notes": "Bài học Bài 17 sách KNTT Tin học 9 ánh xạ 5 YCCĐ CTGDPT 2018."
    }
  }
]
);

// Pre-computed indexing maps for O(1) lookups
const lessonByIdMap = new Map<string, TextbookLessonMapping>();
const lessonByTitleMap = new Map<string, TextbookLessonMapping>();
const mappingsByGradeMap = new Map<GradeLevel, TextbookLessonMapping[]>();
const lessonsByRequirementIdMap = new Map<string, TextbookLessonMapping[]>();

// Initialize indices once at module load
KNTT_LESSON_MAPPINGS.forEach(mapping => {
  lessonByIdMap.set(mapping.lessonId, mapping);
  lessonByTitleMap.set(`${mapping.grade}_${mapping.lessonTitle.trim()}`, mapping);

  if (!mappingsByGradeMap.has(mapping.grade)) {
    mappingsByGradeMap.set(mapping.grade, []);
  }
  mappingsByGradeMap.get(mapping.grade)!.push(mapping);

  mapping.requirementIds.forEach(reqId => {
    if (!lessonsByRequirementIdMap.has(reqId)) {
      lessonsByRequirementIdMap.set(reqId, []);
    }
    lessonsByRequirementIdMap.get(reqId)!.push(mapping);
  });
});

/**
 * FAIL-SAFE RESOLVER FOR CRITERIA MAPPING
 * 
 * Guarantees that no unsafe fallback (such as candidates[0] or first candidate)
 * can ever silently map an ambiguous or unverified criterion to an arbitrary requirement.
 * 
 * Resolution policy:
 * 1. Single exact string match -> 'EXACT'
 * 2. Ambiguous multiple exact matches -> 'NEEDS_REVIEW' (FAIL-SAFE: returns empty requirementId)
 * 3. Verified in TASK 005B KNTT_SEMANTIC_67_REVIEW -> returns verified resolvedRequirementId
 * 4. Fallback -> 'NEEDS_REVIEW' or 'UNMAPPED' (FAIL-SAFE: returns empty requirementId)
 */
export function resolveCriterionMappingSafe(
  criterionText: string,
  candidateRequirements: readonly CurriculumRequirement[]
): {
  readonly canonicalRequirementId: string;
  readonly matchType: CriteriaMatchType;
  readonly notes?: string;
} {
  const normCriterion = normalizeTextForComparison(criterionText);
  if (!normCriterion || candidateRequirements.length === 0) {
    return {
      canonicalRequirementId: '',
      matchType: 'UNMAPPED',
      notes: 'Không có YCCĐ ứng viên hoặc tiêu chí rỗng'
    };
  }

  // 1. Exact match check
  const exact = candidateRequirements.filter(
    r => normalizeTextForComparison(r.requirementText) === normCriterion
  );
  if (exact.length === 1) {
    return {
      canonicalRequirementId: exact[0].id,
      matchType: 'EXACT',
      notes: 'Khớp chính xác nguyên văn 100%'
    };
  }
  if (exact.length > 1) {
    return {
      canonicalRequirementId: '',
      matchType: 'NEEDS_REVIEW',
      notes: `Phát hiện ${exact.length} YCCĐ khớp chính xác trùng lặp - Cần giáo viên rà soát (FAIL-SAFE)`
    };
  }

  // 2. Verified Resolution Source of Truth (TASK 005B)
  const reviewed = KNTT_SEMANTIC_67_REVIEW.find(
    r => normalizeTextForComparison(r.legacyCriterionText) === normCriterion
  );
  if (reviewed) {
    return {
      canonicalRequirementId: reviewed.resolvedRequirementId,
      matchType: reviewed.resolvedMatchType,
      notes: reviewed.reviewNote
    };
  }

  // 3. Fallback: FAIL-SAFE! Never take candidate[0]
  return {
    canonicalRequirementId: '',
    matchType: 'NEEDS_REVIEW',
    notes: 'Không tìm thấy khớp chính xác và chưa qua kiểm định chuyên môn - FAIL SAFE (Không gán candidate[0])'
  };
}

/**
 * Lookup all Canonical Requirements associated with a specific KNTT lessonId.
 */
export function getRequirementsForLesson(lessonId: string): readonly CurriculumRequirement[] {
  const mapping = lessonByIdMap.get(lessonId);
  if (!mapping) return [];
  const reqMap = new Map<string, CurriculumRequirement>();
  CANONICAL_REQUIREMENTS.forEach(r => reqMap.set(r.id, r));
  return mapping.requirementIds
    .map(id => reqMap.get(id))
    .filter((r): r is CurriculumRequirement => r !== undefined);
}

/**
 * Lookup all Canonical Requirements associated with a lesson by title and grade.
 */
export function getRequirementsForLessonTitle(
  lessonTitle: string,
  grade?: GradeLevel
): readonly CurriculumRequirement[] {
  const mapping = getLessonByTitle(lessonTitle, grade);
  if (!mapping) return [];
  return getRequirementsForLesson(mapping.lessonId);
}

/**
 * Lookup all KNTT lessons that teach/practice a specific Canonical Requirement (many-to-many reverse lookup).
 */
export function getLessonsForRequirement(requirementId: string): readonly TextbookLessonMapping[] {
  return lessonsByRequirementIdMap.get(requirementId) || [];
}

/**
 * Lookup KNTT lesson mapping by stable lessonId.
 */
export function getLessonById(lessonId: string): TextbookLessonMapping | undefined {
  return lessonByIdMap.get(lessonId);
}

/**
 * Lookup KNTT lesson mapping by lesson title and optional grade.
 */
export function getLessonByTitle(
  lessonTitle: string,
  grade?: GradeLevel
): TextbookLessonMapping | undefined {
  const trimmed = lessonTitle.trim();
  if (grade !== undefined) {
    const direct = lessonByTitleMap.get(`${grade}_${trimmed}`);
    if (direct) return direct;
  }
  return KNTT_LESSON_MAPPINGS.find(m => {
    if (grade !== undefined && m.grade !== grade) return false;
    return m.lessonTitle.trim() === trimmed || m.lessonTitle.includes(trimmed) || trimmed.includes(m.lessonTitle);
  });
}

/**
 * Get all KNTT lesson mappings for a specific grade.
 */
export function getMappingsByGrade(grade: GradeLevel): readonly TextbookLessonMapping[] {
  return mappingsByGradeMap.get(grade) || [];
}

/**
 * Get all 75 KNTT lesson mappings.
 */
export function getAllKNTTMappings(): readonly TextbookLessonMapping[] {
  return KNTT_LESSON_MAPPINGS;
}
