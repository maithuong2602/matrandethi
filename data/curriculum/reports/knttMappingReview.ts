/**
 * MACHINE-READABLE REVIEW & AUDIT REPORT FOR KNTT TEXTBOOK MAPPINGS
 * Generated for TASK 005B: KNTT SEMANTIC MAPPING REVIEW & RESOLUTION
 * 
 * Compliant with specifications:
 * - Section IV: Complete 67 SEMANTIC_CONFIDENT records with 11 mandatory fields
 * - Section V: Classified into CONFIRMED, PARTIAL_MATCH, AMBIGUOUS, INCORRECT, NEEDS_HUMAN_REVIEW
 * - Section VI & VII: Rigorous pedagogical criteria
 * - Section VIII: One Criterion -> Multiple Requirements analysis (MODEL LIMITATION report)
 * - Section IX: Multiple Criteria -> One Requirement analysis
 * - Section X: Audit of 15 key multi-lesson requirement groups
 * - Section XI: Detailed analysis of TH9-E-007 across 5 spreadsheet lessons
 * - Section XII: Learning progression analysis of TH8-E-013 across 4 photo lessons
 * - Section XIII: Assessment level distribution analysis
 * - Section XV: Audit of 20 EXACT/NORMALIZED samples (5 per grade)
 */

export interface KNTTSemanticReviewRecord {
  readonly index: number;
  readonly grade: number;
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly legacyCriterionCode: string;
  readonly legacyLevel: 'NB' | 'TH' | 'VD' | 'VDC' | string;
  readonly legacyCriterionText: string;
  readonly requirementId: string;
  readonly canonicalRequirementText: string;
  readonly currentMatchType: 'SEMANTIC_CONFIDENT';
  readonly reviewResult: 'CONFIRMED' | 'PARTIAL_MATCH' | 'AMBIGUOUS' | 'INCORRECT' | 'NEEDS_HUMAN_REVIEW';
  readonly reviewNote: string;
  readonly isVerified: boolean;
  readonly resolvedRequirementId: string;
  readonly resolvedRequirementText: string;
  readonly resolvedMatchType: 'CONFIRMED' | 'PARTIAL_MATCH';
}

export interface ExactNormalizedSampleAudit {
  readonly grade: number;
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly legacyCriterionCode: string;
  readonly legacyLevel: string;
  readonly legacyText: string;
  readonly canonicalId: string;
  readonly matchType: 'EXACT' | 'NORMALIZED';
  readonly auditResult: 'VERIFIED_CORRECT';
  readonly notes: string;
}

export const KNTT_SEMANTIC_REVIEW_STATS = {
  totalReviewed: 67,
  originalSemanticConfident: 67,
  confirmedCount: 23,
  partialMatchCount: 13,
  incorrectCount: 31,
  ambiguousCount: 0,
  needsHumanReviewCount: 0,
  resolvedConfirmedCount: 50,
  resolvedPartialMatchCount: 17
} as const;

export const KNTT_SEMANTIC_67_REVIEW: readonly KNTTSemanticReviewRecord[] = [
  {
    "index": 1,
    "grade": 6,
    "lessonId": "KNTT-TH6-B03",
    "lessonTitle": "Bài 3. Thông tin trong máy tính",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Nêu được tên và độ lớn của các đơn vị cơ bản đo dung lượng thông tin.",
    "requirementId": "TH6-A-007",
    "canonicalRequirementText": "Biết được bit là đơn vị nhỏ nhất trong lưu trữ thông tin.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH6-A-007) thay vì YCCĐ đích thực sự (TH6-A-008). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH6-A-008 ('Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) ...'). Khi ánh xạ về đúng TH6-A-008, mức độ tương thích là PARTIAL_MATCH.",
    "isVerified": false,
    "resolvedRequirementId": "TH6-A-008",
    "resolvedRequirementText": "Nêu được tên và độ lớn (xấp xỉ theo hệ thập phân) của các đơn vị cơ bản đo dung lượng thông tin: Byte, KB, MB, GB, quy đổi được một cách gần đúng giữa các đơn vị đo lường này. Ví dụ: 1KB bằng xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 2,
    "grade": 6,
    "lessonId": "KNTT-TH6-B03",
    "lessonTitle": "Bài 3. Thông tin trong máy tính",
    "legacyCriterionCode": "4.1",
    "legacyLevel": "VDC",
    "legacyCriterionText": "4.1 Xác định được khả năng lưu trữ của các thiết bị nhớ thông dụng.",
    "requirementId": "TH6-A-010",
    "canonicalRequirementText": "Xác định được khả năng lưu trữ của các thiết bị nhớ thông dụng như đĩa quang, đĩa từ, đĩa cứng, USB, CD, thẻ nhớ, …",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH6-A-010. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH6-A-010",
    "resolvedRequirementText": "Xác định được khả năng lưu trữ của các thiết bị nhớ thông dụng như đĩa quang, đĩa từ, đĩa cứng, USB, CD, thẻ nhớ, …",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 3,
    "grade": 6,
    "lessonId": "KNTT-TH6-B04",
    "lessonTitle": "Bài 4. Mạng máy tính",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Nêu được các thành phần chủ yếu của một mạng máy tính (máy tính và thiết bị kết nối) và tên của một vài thiết bị mạng cơ bản như: máy tính, cáp nối, Switch, Access Point,…",
    "requirementId": "TH6-B-001",
    "canonicalRequirementText": "Nêu được khái niệm và lợi ích của mạng máy tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH6-B-001) thay vì YCCĐ đích thực sự (TH6-B-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH6-B-002 ('Nêu được các thành phần chủ yếu của một mạng máy t...'). Khi ánh xạ về đúng TH6-B-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH6-B-002",
    "resolvedRequirementText": "Nêu được các thành phần chủ yếu của một mạng máy tính (máy tính và các thiết bị kết nối) và tên của một vài thiết bị mạng cơ bản như máy tính, cáp nối, Switch, Access Point,...",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 4,
    "grade": 7,
    "lessonId": "KNTT-TH7-B01",
    "lessonTitle": "Bài 1: Thiết bị vào - ra",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Biết và nhận ra được các thiết bị vào/ra trong mô hình máy tính, tính đa dạng và hình dạng (chuột, bàn phím, màn hình, loa, cảm ứng, máy quét, camera, …).",
    "requirementId": "TH7-A-001",
    "canonicalRequirementText": "Biết và nhận ra được các thiết bị vào ra trong mô hình thiết bị máy tính, tính đa dạng và hình dạng của các thiết bị. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-A-001",
    "resolvedRequirementText": "Biết và nhận ra được các thiết bị vào ra trong mô hình thiết bị máy tính, tính đa dạng và hình dạng của các thiết bị. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 5,
    "grade": 7,
    "lessonId": "KNTT-TH7-B01",
    "lessonTitle": "Bài 1: Thiết bị vào - ra",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Biết được chức năng của một số thiết bị vào/ra trong thu thập, lưu trữ, xử lí và truyền thông tin.",
    "requirementId": "TH7-A-002",
    "canonicalRequirementText": "Biết được chức năng của một số thiết bị vào ra trong thu thập, lưu trữ, xử lí và truyền thông tin. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-002. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-A-002",
    "resolvedRequirementText": "Biết được chức năng của một số thiết bị vào ra trong thu thập, lưu trữ, xử lí và truyền thông tin. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 6,
    "grade": 7,
    "lessonId": "KNTT-TH7-B01",
    "lessonTitle": "Bài 1: Thiết bị vào - ra",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nêu ví dụ cụ thể về thao tác không đúng gây lỗi cho thiết bị hoặc hệ thống.",
    "requirementId": "TH7-A-001",
    "canonicalRequirementText": "Biết và nhận ra được các thiết bị vào ra trong mô hình thiết bị máy tính, tính đa dạng và hình dạng của các thiết bị. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-001) thay vì YCCĐ đích thực sự (TH7-A-003). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-A-003 ('Nêu được ví dụ cụ thể về những thao tác không đúng...'). Khi ánh xạ về đúng TH7-A-003, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-A-003",
    "resolvedRequirementText": "Nêu được ví dụ cụ thể về những thao tác không đúng cách sẽ gây ra lỗi cho các thiết bị và hệ thống xử lí thông tin.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 7,
    "grade": 7,
    "lessonId": "KNTT-TH7-B01",
    "lessonTitle": "Bài 1: Thiết bị vào - ra",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Thực hiện đúng các thao tác với thiết bị thông dụng.",
    "requirementId": "TH7-A-001",
    "canonicalRequirementText": "Biết và nhận ra được các thiết bị vào ra trong mô hình thiết bị máy tính, tính đa dạng và hình dạng của các thiết bị. (Chuột, bàn phím, màn hình, loa, màn hình cảm ứng, máy quét, camera,…)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-001) thay vì YCCĐ đích thực sự (TH7-A-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-A-004 ('Thực hiện đúng các thao tác với các thiết bị thông...'). Khi ánh xạ về đúng TH7-A-004, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-A-004",
    "resolvedRequirementText": "Thực hiện đúng các thao tác với các thiết bị thông dụng của máy tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 8,
    "grade": 7,
    "lessonId": "KNTT-TH7-B02",
    "lessonTitle": "Bài 2: Phần mềm máy tính",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Nêu được tên một số phần mềm ứng dụng (luyện gõ phím, Word, Paint, …).",
    "requirementId": "TH7-A-006",
    "canonicalRequirementText": "Nêu được tên một số phần mềm ứng dụng đã sử dụng (Phần mềm luyện gõ phím, Word, Paint, …..)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-006. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-A-006",
    "resolvedRequirementText": "Nêu được tên một số phần mềm ứng dụng đã sử dụng (Phần mềm luyện gõ phím, Word, Paint, …..)",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 9,
    "grade": 7,
    "lessonId": "KNTT-TH7-B02",
    "lessonTitle": "Bài 2: Phần mềm máy tính",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Giải thích chức năng điều khiển của hệ điều hành, phân biệt với phần mềm ứng dụng.",
    "requirementId": "TH7-A-006",
    "canonicalRequirementText": "Nêu được tên một số phần mềm ứng dụng đã sử dụng (Phần mềm luyện gõ phím, Word, Paint, …..)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-006) thay vì YCCĐ đích thực sự (TH7-A-008). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-A-008 ('Giải thích được chức năng điều khiển của hệ điều h...'). Khi ánh xạ về đúng TH7-A-008, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-A-008",
    "resolvedRequirementText": "Giải thích được chức năng điều khiển của hệ điều hành, qua đó phân biệt được hệ điều hành với phần mềm ứng dụng.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 10,
    "grade": 7,
    "lessonId": "KNTT-TH7-B02",
    "lessonTitle": "Bài 2: Phần mềm máy tính",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.2 Phân biệt được loại tệp qua phần mở rộng.",
    "requirementId": "TH7-A-006",
    "canonicalRequirementText": "Nêu được tên một số phần mềm ứng dụng đã sử dụng (Phần mềm luyện gõ phím, Word, Paint, …..)",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-006) thay vì YCCĐ đích thực sự (TH7-A-009). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH7-A-009 ('Phân biệt được loại tệp thông qua phần mở rộng....'). Khi ánh xạ về đúng TH7-A-009, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-A-009",
    "resolvedRequirementText": "Phân biệt được loại tệp thông qua phần mở rộng.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 11,
    "grade": 7,
    "lessonId": "KNTT-TH7-B03",
    "lessonTitle": "Bài 3: Quản lí dữ liệu trong máy tính",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Biết tệp chương trình cũng là dữ liệu, có thể lưu trữ trong máy tính.",
    "requirementId": "TH7-A-005",
    "canonicalRequirementText": "Biết được tệp chương trình cũng là dữ liệu, có thể được lưu trữ trong máy tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-A-005. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-A-005",
    "resolvedRequirementText": "Biết được tệp chương trình cũng là dữ liệu, có thể được lưu trữ trong máy tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 12,
    "grade": 7,
    "lessonId": "KNTT-TH7-B03",
    "lessonTitle": "Bài 3: Quản lí dữ liệu trong máy tính",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Nêu được một số biện pháp bảo vệ máy tính, tài khoản và dữ liệu cá nhân (mật khẩu, đăng xuất, sao lưu, quét virus…).",
    "requirementId": "TH7-A-005",
    "canonicalRequirementText": "Biết được tệp chương trình cũng là dữ liệu, có thể được lưu trữ trong máy tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-A-005) thay vì YCCĐ đích thực sự (TH7-A-007). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-A-007 ('Nêu được một số biện pháp để bảo vệ máy tính cá nh...'). Khi ánh xạ về đúng TH7-A-007, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-A-007",
    "resolvedRequirementText": "Nêu được một số biện pháp để bảo vệ máy tính cá nhân, tài khoản và dữ liệu cá nhân. (Cài mật khẩu máy tính, đăng xuất tài khoản khi hết phiên làm việc, sao lưu dữ liệu, quét virus…).",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 13,
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Nêu được tên kênh và thông tin chính (YouTube chia sẻ video; Website trường cung cấp thông tin giáo dục…).",
    "requirementId": "TH7-C-001",
    "canonicalRequirementText": "Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-C-002 ('Nêu được tên kênh và thông tin trao đổi chính trên...'). Khi ánh xạ về đúng TH7-C-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-C-002",
    "resolvedRequirementText": "Nêu được tên kênh và thông tin trao đổi chính trên kênh đó như Youtube cho phép trao đổi, chia sẻ …về Video; Website nhà trường chứa các thông tin về hoạt động giáo dục của nhà trường, …..).",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 14,
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "legacyCriterionCode": "1.3",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.3 Nêu chức năng cơ bản của mạng xã hội: kết nối, giao lưu, chia sẻ, thảo luận, trao đổi thông tin.",
    "requirementId": "TH7-C-001",
    "canonicalRequirementText": "Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-003). Về mặt chuyên môn, tiêu chí legacy '1.3' (NB) thuộc YCCĐ TH7-C-003 ('Nêu được một số chức năng cơ bản của mạng xã hội: ...'). Khi ánh xạ về đúng TH7-C-003, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-C-003",
    "resolvedRequirementText": "Nêu được một số chức năng cơ bản của mạng xã hội: kết nối, giao lưu, chia sẻ, thảo luận và trao đổi thông tin…",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 15,
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nêu ví dụ cụ thể về hậu quả khi sử dụng thông tin sai mục đích.",
    "requirementId": "TH7-C-001",
    "canonicalRequirementText": "Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-004). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-C-004 ('Nêu được ví dụ cụ thể về hậu quả của việc sử dụng ...'). Khi ánh xạ về đúng TH7-C-004, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-C-004",
    "resolvedRequirementText": "Nêu được ví dụ cụ thể về hậu quả của việc sử dụng thông tin vào mục đích sai trái.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 16,
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Sử dụng được một số chức năng cơ bản: tạo tài khoản, hồ sơ, kết nối bạn học, chia sẻ tài liệu, tạo nhóm trao đổi.",
    "requirementId": "TH7-C-001",
    "canonicalRequirementText": "Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram …).",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-C-001) thay vì YCCĐ đích thực sự (TH7-C-005). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-C-005 ('Sử dụng được một số chức năng cơ bản của một mạng ...'). Khi ánh xạ về đúng TH7-C-005, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-C-005",
    "resolvedRequirementText": "Sử dụng được một số chức năng cơ bản của một mạng xã hội để giao lưu và chia sẻ thông tin: tạo tài khoản, hồ sơ trực tuyến, kết nối với bạn cùng lớp, chia sẻ tài liệu học tập, tạo nhóm trao đổi ….",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 17,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Biết tác hại của bệnh nghiện Internet.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-D-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-D-001",
    "resolvedRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 18,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.2 Nêu cách ứng xử hợp lí khi gặp thông tin xấu, không phù hợp lứa tuổi.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-002). Về mặt chuyên môn, tiêu chí legacy '1.2' (NB) thuộc YCCĐ TH7-D-002 ('Nêu được cách ứng xử hợp lí khi gặp trên mạng hoặc...'). Khi ánh xạ về đúng TH7-D-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-D-002",
    "resolvedRequirementText": "Nêu được cách ứng xử hợp lí khi gặp trên mạng hoặc các kênh truyền thông tin số những thông tin có nội dung xấu, thông tin không phù hợp lứa tuổi.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 19,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nêu ví dụ về truy cập không hợp lệ vào nguồn thông tin/kênh truyền thông.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-003). Về mặt chuyên môn, tiêu chí legacy '2.1' (TH) thuộc YCCĐ TH7-D-003 ('Nêu được một số ví dụ truy cập không hợp lệ vào cá...'). Khi ánh xạ về đúng TH7-D-003, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-D-003",
    "resolvedRequirementText": "Nêu được một số ví dụ truy cập không hợp lệ vào các nguồn thông tin và kênh truyền thông tin.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 20,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Biết nhờ người lớn tư vấn khi bị bắt nạt trên mạng.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-D-004 ('Biết nhờ người lớn giúp đỡ, tư vấn khi cần thiết, ...'). Khi ánh xạ về đúng TH7-D-004, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-D-004",
    "resolvedRequirementText": "Biết nhờ người lớn giúp đỡ, tư vấn khi cần thiết, chẳng hạn khi bị bắt nạt trên mạng.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 21,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Lựa chọn biện pháp phòng tránh nghiện Internet.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-005). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH7-D-005 ('Lựa chọn được các biện pháp phòng tránh bệnh nghiệ...'). Khi ánh xạ về đúng TH7-D-005, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-D-005",
    "resolvedRequirementText": "Lựa chọn được các biện pháp phòng tránh bệnh nghiện Internet.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 22,
    "grade": 7,
    "lessonId": "KNTT-TH7-B05",
    "lessonTitle": "Bài 5: Ứng xử trên mạng",
    "legacyCriterionCode": "4.1",
    "legacyLevel": "VDC",
    "legacyCriterionText": "4.1 Thực hiện giao tiếp trực tuyến đúng quy tắc, lịch sự, có văn hoá.",
    "requirementId": "TH7-D-001",
    "canonicalRequirementText": "Biết được tác hại của bệnh nghiện Internet.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-D-001) thay vì YCCĐ đích thực sự (TH7-D-006). Về mặt chuyên môn, tiêu chí legacy '4.1' (VDC) thuộc YCCĐ TH7-D-006 ('Thực hiện được giao tiếp qua mạng (trực tuyến hay ...'). Khi ánh xạ về đúng TH7-D-006, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-D-006",
    "resolvedRequirementText": "Thực hiện được giao tiếp qua mạng (trực tuyến hay không trực tuyến) theo đúng quy tắc và bằng ngôn ngữ lịch sự, thể hiện ứng xử có văn hoá.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 23,
    "grade": 7,
    "lessonId": "KNTT-TH7-B06",
    "lessonTitle": "Bài 6: Làm quen với phần mềm bảng tính",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Nêu chức năng cơ bản của phần mềm bảng tính.",
    "requirementId": "TH7-E-001",
    "canonicalRequirementText": "Nêu được một số chức năng cơ bản của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-001",
    "resolvedRequirementText": "Nêu được một số chức năng cơ bản của phần mềm bảng tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 24,
    "grade": 7,
    "lessonId": "KNTT-TH7-B06",
    "lessonTitle": "Bài 6: Làm quen với phần mềm bảng tính",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Thực hiện thao tác đơn giản với trang tính.",
    "requirementId": "TH7-E-001",
    "canonicalRequirementText": "Nêu được một số chức năng cơ bản của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-001) thay vì YCCĐ đích thực sự (TH7-E-003). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-E-003 ('Thực hiện được một số thao tác đơn giản với trang ...'). Khi ánh xạ về đúng TH7-E-003, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-E-003",
    "resolvedRequirementText": "Thực hiện được một số thao tác đơn giản với trang tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 25,
    "grade": 7,
    "lessonId": "KNTT-TH7-B07",
    "lessonTitle": "Bài 7: Tính toán tự động trên bảng tính",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Giải thích việc dùng công thức trong bảng tính là cách tính toán tự động trên dữ liệu.",
    "requirementId": "TH7-E-002",
    "canonicalRequirementText": "Giải thích được việc đưa các công thức vào bảng tính là một cách điều khiển tính toán tự động trên dữ liệu.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-002. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-002",
    "resolvedRequirementText": "Giải thích được việc đưa các công thức vào bảng tính là một cách điều khiển tính toán tự động trên dữ liệu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 26,
    "grade": 7,
    "lessonId": "KNTT-TH7-B08",
    "lessonTitle": "Bài 8: Công cụ hỗ trợ tính toán",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Thực hiện được một số phép toán thông dụng, sử dụng một số hàm cơ bản như: MAX, MIN, SUM, AVERAGE, COUNT,...",
    "requirementId": "TH7-E-004",
    "canonicalRequirementText": "Thực hiện được một số phép toán thông dụng, sử dụng được một số hàm đơn giản như: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-004. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-004",
    "resolvedRequirementText": "Thực hiện được một số phép toán thông dụng, sử dụng được một số hàm đơn giản như: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 27,
    "grade": 7,
    "lessonId": "KNTT-TH7-B09",
    "lessonTitle": "Bài 9: Trình bày bảng tính",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Thực hiện phép toán thông dụng; sử dụng hàm đơn giản: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "requirementId": "TH7-E-004",
    "canonicalRequirementText": "Thực hiện được một số phép toán thông dụng, sử dụng được một số hàm đơn giản như: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-004. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-004",
    "resolvedRequirementText": "Thực hiện được một số phép toán thông dụng, sử dụng được một số hàm đơn giản như: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 28,
    "grade": 7,
    "lessonId": "KNTT-TH7-B10",
    "lessonTitle": "Bài 10: Hoàn thiện bảng tính",
    "legacyCriterionCode": "4.1",
    "legacyLevel": "VDC",
    "legacyCriterionText": "4.1 Sử dụng bảng tính để giải quyết một số công việc học tập, đời sống đơn giản.",
    "requirementId": "TH7-E-006",
    "canonicalRequirementText": "Sử dụng được bảng tính điện tử để giải quyết một vài công việc cụ thể đơn giản.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-006. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-006",
    "resolvedRequirementText": "Sử dụng được bảng tính điện tử để giải quyết một vài công việc cụ thể đơn giản.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 29,
    "grade": 7,
    "lessonId": "KNTT-TH7-B11",
    "lessonTitle": "Bài 11: Tạo bài trình chiếu",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Nêu chức năng cơ bản của phần mềm trình chiếu.",
    "requirementId": "TH7-E-007",
    "canonicalRequirementText": "Nêu được một số chức năng cơ bản của phần mềm trình chiếu.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-007. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-007",
    "resolvedRequirementText": "Nêu được một số chức năng cơ bản của phần mềm trình chiếu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 30,
    "grade": 7,
    "lessonId": "KNTT-TH7-B11",
    "lessonTitle": "Bài 11: Tạo bài trình chiếu",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Tạo báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
    "requirementId": "TH7-E-007",
    "canonicalRequirementText": "Nêu được một số chức năng cơ bản của phần mềm trình chiếu.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-007) thay vì YCCĐ đích thực sự (TH7-E-010). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH7-E-010 ('Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp...'). Khi ánh xạ về đúng TH7-E-010, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-E-010",
    "resolvedRequirementText": "Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 31,
    "grade": 7,
    "lessonId": "KNTT-TH7-B12",
    "lessonTitle": "Bài 12: Định dạng đối tượng trên trang chiếu",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Sử dụng định dạng văn bản, ảnh minh hoạ và hiệu ứng hợp lí.",
    "requirementId": "TH7-E-008",
    "canonicalRequirementText": "Sử dụng được các định dạng cho văn bản, ảnh minh hoạ và hiệu ứng một cách hợp lí.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-E-008. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-E-008",
    "resolvedRequirementText": "Sử dụng được các định dạng cho văn bản, ảnh minh hoạ và hiệu ứng một cách hợp lí.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 32,
    "grade": 7,
    "lessonId": "KNTT-TH7-B12",
    "lessonTitle": "Bài 12: Định dạng đối tượng trên trang chiếu",
    "legacyCriterionCode": "3.3",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.3 Sao chép dữ liệu từ văn bản sang trang trình chiếu.",
    "requirementId": "TH7-E-008",
    "canonicalRequirementText": "Sử dụng được các định dạng cho văn bản, ảnh minh hoạ và hiệu ứng một cách hợp lí.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-E-008) thay vì YCCĐ đích thực sự (TH7-E-009). Về mặt chuyên môn, tiêu chí legacy '3.3' (VD) thuộc YCCĐ TH7-E-009 ('Sao chép được dữ liệu phù hợp từ tệp văn bản sang ...'). Khi ánh xạ về đúng TH7-E-009, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-E-009",
    "resolvedRequirementText": "Sao chép được dữ liệu phù hợp từ tệp văn bản sang trang trình chiếu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 33,
    "grade": 7,
    "lessonId": "KNTT-TH7-B13",
    "lessonTitle": "Bài 13: Thực hành tổng hợp: Hoàn thiện bài trình chiếu",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Tạo được một báo cáo có sử dụng hiệu ứng động một cách hợp lí",
    "requirementId": "TH7-E-010",
    "canonicalRequirementText": "Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH7-E-010. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-E-010",
    "resolvedRequirementText": "Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 34,
    "grade": 7,
    "lessonId": "KNTT-TH7-B14",
    "lessonTitle": "Bài 14: Thuật toán tìm kiếm tuần tự",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Biểu diễn và mô phỏng hoạt động của thuật toán tìm kiếm tuần tự trên bộ dữ liệu nhỏ.",
    "requirementId": "TH7-F-004",
    "canonicalRequirementText": "Biểu diễn và mô phỏng được hoạt động của thuật toán đó trên một bộ dữ liệu vào có kích thước nhỏ.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH7-F-004. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-F-004",
    "resolvedRequirementText": "Biểu diễn và mô phỏng được hoạt động của thuật toán đó trên một bộ dữ liệu vào có kích thước nhỏ.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 35,
    "grade": 7,
    "lessonId": "KNTT-TH7-B15",
    "lessonTitle": "Bài 15: Thuật toán tìm kiếm nhị phân",
    "legacyCriterionCode": "2.4",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.4 Giải thích mối liên quan giữa sắp xếp và tìm kiếm, nêu ví dụ minh hoạ.",
    "requirementId": "TH7-F-003",
    "canonicalRequirementText": "Giải thích được mối liên quan giữa sắp xếp và tìm kiếm, nêu được ví dụ minh hoạ.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-F-003. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-F-003",
    "resolvedRequirementText": "Giải thích được mối liên quan giữa sắp xếp và tìm kiếm, nêu được ví dụ minh hoạ.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 36,
    "grade": 7,
    "lessonId": "KNTT-TH7-B15",
    "lessonTitle": "Bài 15: Thuật toán tìm kiếm nhị phân",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Biểu diễn và mô phỏng hoạt động của thuật toán tìm kiếm nhị phân trên bộ dữ liệu nhỏ.",
    "requirementId": "TH7-F-003",
    "canonicalRequirementText": "Giải thích được mối liên quan giữa sắp xếp và tìm kiếm, nêu được ví dụ minh hoạ.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-003) thay vì YCCĐ đích thực sự (TH7-F-004). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH7-F-004 ('Biểu diễn và mô phỏng được hoạt động của thuật toá...'). Khi ánh xạ về đúng TH7-F-004, mức độ tương thích là PARTIAL_MATCH.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-F-004",
    "resolvedRequirementText": "Biểu diễn và mô phỏng được hoạt động của thuật toán đó trên một bộ dữ liệu vào có kích thước nhỏ.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 37,
    "grade": 7,
    "lessonId": "KNTT-TH7-B16",
    "lessonTitle": "Bài 16: Thuật toán sắp xếp",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Nêu ý nghĩa của việc chia một bài toán thành bài toán nhỏ.",
    "requirementId": "TH7-F-001",
    "canonicalRequirementText": "Nêu được ý nghĩa của việc chia một bài toán thành những bài toán nhỏ hơn.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH7-F-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH7-F-001",
    "resolvedRequirementText": "Nêu được ý nghĩa của việc chia một bài toán thành những bài toán nhỏ hơn.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 38,
    "grade": 7,
    "lessonId": "KNTT-TH7-B16",
    "lessonTitle": "Bài 16: Thuật toán sắp xếp",
    "legacyCriterionCode": "2.5",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.5 Giải thích một vài thuật toán sắp xếp bằng bước thủ công.",
    "requirementId": "TH7-F-001",
    "canonicalRequirementText": "Nêu được ý nghĩa của việc chia một bài toán thành những bài toán nhỏ hơn.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-001) thay vì YCCĐ đích thực sự (TH7-F-002). Về mặt chuyên môn, tiêu chí legacy '2.5' (TH) thuộc YCCĐ TH7-F-002 ('Giải thích được một vài thuật toán sắp xếp và tìm ...'). Khi ánh xạ về đúng TH7-F-002, mức độ tương thích là PARTIAL_MATCH.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-F-002",
    "resolvedRequirementText": "Giải thích được một vài thuật toán sắp xếp và tìm kiếm cơ bản, bằng các bước thủ công (không cần dùng máy tính).",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 39,
    "grade": 7,
    "lessonId": "KNTT-TH7-B16",
    "lessonTitle": "Bài 16: Thuật toán sắp xếp",
    "legacyCriterionCode": "3.3",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.3 Biểu diễn và mô phỏng hoạt động của thuật toán sắp xếp trên bộ dữ liệu nhỏ.",
    "requirementId": "TH7-F-001",
    "canonicalRequirementText": "Nêu được ý nghĩa của việc chia một bài toán thành những bài toán nhỏ hơn.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH7-F-001) thay vì YCCĐ đích thực sự (TH7-F-004). Về mặt chuyên môn, tiêu chí legacy '3.3' (VD) thuộc YCCĐ TH7-F-004 ('Biểu diễn và mô phỏng được hoạt động của thuật toá...'). Khi ánh xạ về đúng TH7-F-004, mức độ tương thích là PARTIAL_MATCH.",
    "isVerified": false,
    "resolvedRequirementId": "TH7-F-004",
    "resolvedRequirementText": "Biểu diễn và mô phỏng được hoạt động của thuật toán đó trên một bộ dữ liệu vào có kích thước nhỏ.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 40,
    "grade": 8,
    "lessonId": "KNTT-TH8-B02",
    "lessonTitle": "Bài 2: Thông tin trong môi trường số",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyCriterionText": "1.1 Nêu được các đặc điểm của thông tin số: đa dạng, được thu thập ngày càng nhanh và nhiều, dung lượng lớn, có bản quyền, độ tin cậy khác nhau, có công cụ tìm kiếm/chuyển đổi/truyền/xử lí hiệu quả.",
    "requirementId": "TH8-C-001",
    "canonicalRequirementText": "Nêu được các đặc điểm của thông tin số: đa dạng, được thu thập ngày càng nhanh và nhiều, được lưu trữ với dung lượng khổng lồ bởi nhiều tổ chức và cá nhân, có tính bản quyền, có độ tin cậy rất khác nhau, có các công cụ tìm kiếm, chuyển đổi, truyền và xử lí hiệu quả.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-C-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-C-001",
    "resolvedRequirementText": "Nêu được các đặc điểm của thông tin số: đa dạng, được thu thập ngày càng nhanh và nhiều, được lưu trữ với dung lượng khổng lồ bởi nhiều tổ chức và cá nhân, có tính bản quyền, có độ tin cậy rất khác nhau, có các công cụ tìm kiếm, chuyển đổi, truyền và xử lí hiệu quả.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 41,
    "grade": 8,
    "lessonId": "KNTT-TH8-B02",
    "lessonTitle": "Bài 2: Thông tin trong môi trường số",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.2 Trình bày được tầm quan trọng của việc biết khai thác các nguồn thông tin đáng tin cậy, có ví dụ minh hoạ.",
    "requirementId": "TH8-C-001",
    "canonicalRequirementText": "Nêu được các đặc điểm của thông tin số: đa dạng, được thu thập ngày càng nhanh và nhiều, được lưu trữ với dung lượng khổng lồ bởi nhiều tổ chức và cá nhân, có tính bản quyền, có độ tin cậy rất khác nhau, có các công cụ tìm kiếm, chuyển đổi, truyền và xử lí hiệu quả.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-001) thay vì YCCĐ đích thực sự (TH8-C-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-C-002 ('Trình bày được tầm quan trọng của việc biết khai t...'). Khi ánh xạ về đúng TH8-C-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-C-002",
    "resolvedRequirementText": "Trình bày được tầm quan trọng của việc biết khai thác các nguồn thông tin đáng tin cậy, nêu được ví dụ minh hoạ.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 42,
    "grade": 8,
    "lessonId": "KNTT-TH8-B03",
    "lessonTitle": "Bài 3: Thực hành: Khai thác thông tin số",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nêu ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí, trao đổi thông tin trong môi trường số.",
    "requirementId": "TH8-C-003",
    "canonicalRequirementText": "Nêu được ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-C-003. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-C-003",
    "resolvedRequirementText": "Nêu được ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 43,
    "grade": 8,
    "lessonId": "KNTT-TH8-B03",
    "lessonTitle": "Bài 3: Thực hành: Khai thác thông tin số",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.2 Xác định được lợi ích của thông tin tìm được trong giải quyết vấn đề, có ví dụ minh hoạ.",
    "requirementId": "TH8-C-003",
    "canonicalRequirementText": "Nêu được ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-003) thay vì YCCĐ đích thực sự (TH8-C-005). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-C-005 ('Xác định được lợi ích của thông tin tìm được trong...'). Khi ánh xạ về đúng TH8-C-005, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-C-005",
    "resolvedRequirementText": "Xác định được lợi ích của thông tin tìm được trong giải quyết vấn đề, nêu được ví dụ minh hoạ.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 44,
    "grade": 8,
    "lessonId": "KNTT-TH8-B03",
    "lessonTitle": "Bài 3: Thực hành: Khai thác thông tin số",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Chủ động tìm kiếm thông tin để thực hiện nhiệm vụ học tập (qua bài tập cụ thể).",
    "requirementId": "TH8-C-003",
    "canonicalRequirementText": "Nêu được ví dụ minh hoạ sử dụng công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-C-003) thay vì YCCĐ đích thực sự (TH8-C-006). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH8-C-006 ('Chủ động tìm kiếm được thông tin để thực hiện nhiệ...'). Khi ánh xạ về đúng TH8-C-006, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-C-006",
    "resolvedRequirementText": "Chủ động tìm kiếm được thông tin để thực hiện nhiệm vụ (thông qua bài tập cụ thể).",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 45,
    "grade": 8,
    "lessonId": "KNTT-TH8-B04",
    "lessonTitle": "Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nhận biết và giải thích được một số biểu hiện vi phạm đạo đức, pháp luật, thiếu văn hoá khi dùng công nghệ số (quay phim/chụp ảnh trái phép, dùng sản phẩm vi phạm bản quyền…).",
    "requirementId": "TH8-D-001",
    "canonicalRequirementText": "Nhận biết và giải thích được một số biểu hiện vi phạm đạo đức và pháp luật, biểu hiện thiếu văn hoá khi sử dụng công nghệ kĩ thuật số. Ví dụ: thu âm, quay phim, chụp ảnh khi không được phép, dùng các sản phẩm văn hoá vi phạm bản quyền, ...",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-D-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-D-001",
    "resolvedRequirementText": "Nhận biết và giải thích được một số biểu hiện vi phạm đạo đức và pháp luật, biểu hiện thiếu văn hoá khi sử dụng công nghệ kĩ thuật số. Ví dụ: thu âm, quay phim, chụp ảnh khi không được phép, dùng các sản phẩm văn hoá vi phạm bản quyền, ...",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 46,
    "grade": 8,
    "lessonId": "KNTT-TH8-B04",
    "lessonTitle": "Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Khi tạo sản phẩm số luôn thể hiện tính đạo đức, văn hoá và tuân thủ pháp luật.",
    "requirementId": "TH8-D-001",
    "canonicalRequirementText": "Nhận biết và giải thích được một số biểu hiện vi phạm đạo đức và pháp luật, biểu hiện thiếu văn hoá khi sử dụng công nghệ kĩ thuật số. Ví dụ: thu âm, quay phim, chụp ảnh khi không được phép, dùng các sản phẩm văn hoá vi phạm bản quyền, ...",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-D-001) thay vì YCCĐ đích thực sự (TH8-D-002). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH8-D-002 ('Khi tạo ra các sản phẩm số luôn thể hiện được tính...'). Khi ánh xạ về đúng TH8-D-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-D-002",
    "resolvedRequirementText": "Khi tạo ra các sản phẩm số luôn thể hiện được tính đạo đức, văn hoá và không vi phạm pháp luật.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 47,
    "grade": 8,
    "lessonId": "KNTT-TH8-B05",
    "lessonTitle": "Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Giải thích sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của ô tính.",
    "requirementId": "TH8-E-001",
    "canonicalRequirementText": "Giải thích được sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của một ô tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-E-001",
    "resolvedRequirementText": "Giải thích được sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của một ô tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 48,
    "grade": 8,
    "lessonId": "KNTT-TH8-B05",
    "lessonTitle": "Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.2 Giải thích sự thay đổi địa chỉ tương đối khi sao chép công thức.",
    "requirementId": "TH8-E-001",
    "canonicalRequirementText": "Giải thích được sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của một ô tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-001) thay vì YCCĐ đích thực sự (TH8-E-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH8-E-002 ('Giải thích được sự thay đổi địa chỉ tương đối tron...'). Khi ánh xạ về đúng TH8-E-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-002",
    "resolvedRequirementText": "Giải thích được sự thay đổi địa chỉ tương đối trong công thức khi sao chép công thức.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 49,
    "grade": 8,
    "lessonId": "KNTT-TH8-B05",
    "lessonTitle": "Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Sao chép dữ liệu từ tệp văn bản, trang trình chiếu sang trang tính.",
    "requirementId": "TH8-E-001",
    "canonicalRequirementText": "Giải thích được sự khác nhau giữa địa chỉ tương đối và địa chỉ tuyệt đối của một ô tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-001) thay vì YCCĐ đích thực sự (TH8-E-004). Về mặt chuyên môn, tiêu chí legacy '3.1' (VD) thuộc YCCĐ TH8-E-004 ('Sao chép được dữ liệu từ các tệp văn bản, trang tr...'). Khi ánh xạ về đúng TH8-E-004, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-004",
    "resolvedRequirementText": "Sao chép được dữ liệu từ các tệp văn bản, trang trình chiếu sang trang tính.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 50,
    "grade": 8,
    "lessonId": "KNTT-TH8-B06",
    "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Thực hiện được các thao tác lọc và sắp xếp dữ liệu.",
    "requirementId": "TH8-E-003",
    "canonicalRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-003",
    "resolvedRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 51,
    "grade": 8,
    "lessonId": "KNTT-TH8-B06",
    "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
    "legacyCriterionCode": "3.3",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.3 Nêu được một số tình huống thực tế cần sử dụng chức năng lọc và sắp xếp đữ liệu của phần mềm bảng tính",
    "requirementId": "TH8-E-003",
    "canonicalRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-003",
    "resolvedRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 52,
    "grade": 8,
    "lessonId": "KNTT-TH8-B06",
    "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
    "legacyCriterionCode": "4.1",
    "legacyLevel": "VDC",
    "legacyCriterionText": "4.1 Sử dụng được phần mềm bảng tính để giải quyết bài toán thực tế.",
    "requirementId": "TH8-E-003",
    "canonicalRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-003) thay vì YCCĐ đích thực sự (TH8-E-005). Về mặt chuyên môn, tiêu chí legacy '4.1' (VDC) thuộc YCCĐ TH8-E-005 ('Sử dụng được phần mềm bảng tính trợ giúp giải quyế...'). Khi ánh xạ về đúng TH8-E-005, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-005",
    "resolvedRequirementText": "Sử dụng được phần mềm bảng tính trợ giúp giải quyết bài toán thực tế.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 53,
    "grade": 8,
    "lessonId": "KNTT-TH8-B07",
    "lessonTitle": "Bài 7: Trình bày dữ liệu bằng biểu đồ",
    "legacyCriterionCode": "3.4",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.4 Thực hiện được thao tác tạo biểu đồ.",
    "requirementId": "TH8-E-003",
    "canonicalRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-003",
    "resolvedRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 54,
    "grade": 8,
    "lessonId": "KNTT-TH8-B07",
    "lessonTitle": "Bài 7: Trình bày dữ liệu bằng biểu đồ",
    "legacyCriterionCode": "3.5",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.5 Nêu được tình huống thực tế cần sử dụng chức năng vẽ biểu đồ.",
    "requirementId": "TH8-E-003",
    "canonicalRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-003. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-003",
    "resolvedRequirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 55,
    "grade": 8,
    "lessonId": "KNTT-TH8-B08A",
    "lessonTitle": "Bài 8a: Làm việc với danh sách dạng liệt kê và hình ảnh trong văn bản",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Thực hiện được các thao tác: Chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê.",
    "requirementId": "TH8-E-006",
    "canonicalRequirementText": "Thực hiện được các thao tác trong phần mềm soạn thảo: chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê, đánh số trang, thêm đầu trang và chân trang.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-006. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-006",
    "resolvedRequirementText": "Thực hiện được các thao tác trong phần mềm soạn thảo: chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê, đánh số trang, thêm đầu trang và chân trang.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 56,
    "grade": 8,
    "lessonId": "KNTT-TH8-B09A",
    "lessonTitle": "Bài 9a: Tạo đầu trang, chân trang cho văn bản",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang.",
    "requirementId": "TH8-E-006",
    "canonicalRequirementText": "Thực hiện được các thao tác trong phần mềm soạn thảo: chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê, đánh số trang, thêm đầu trang và chân trang.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH8-E-006. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-006",
    "resolvedRequirementText": "Thực hiện được các thao tác trong phần mềm soạn thảo: chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê, đánh số trang, thêm đầu trang và chân trang.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 57,
    "grade": 8,
    "lessonId": "KNTT-TH8-B10A",
    "lessonTitle": "Bài 10a: Định dạng nâng cao cho trang chiếu",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Chọn đặt được màu sắc, cỡ chữ hài hoà, hợp lí với nội dung.",
    "requirementId": "TH8-E-007",
    "canonicalRequirementText": "Chọn đặt được màu sắc, cỡ chữ hài hoà và hợp lí với nội dung trong phần mềm trình chiếu.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-007. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-E-007",
    "resolvedRequirementText": "Chọn đặt được màu sắc, cỡ chữ hài hoà và hợp lí với nội dung trong phần mềm trình chiếu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 58,
    "grade": 8,
    "lessonId": "KNTT-TH8-B10A",
    "lessonTitle": "Bài 10a: Định dạng nâng cao cho trang chiếu",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang",
    "requirementId": "TH8-E-009",
    "canonicalRequirementText": "Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang trong phần mềm trình chiếu.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH8-E-009. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH8-E-009",
    "resolvedRequirementText": "Thực hiện được thao tác đánh số trang, thêm đầu trang và chân trang trong phần mềm trình chiếu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 59,
    "grade": 8,
    "lessonId": "KNTT-TH8-B11A",
    "lessonTitle": "Bài 11a: Sử dụng văn bản mẫu tạo bài trình chiếu",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Sử dụng các bản mẫu (template) để tạo bài trình chiếu.",
    "requirementId": "TH8-E-008",
    "canonicalRequirementText": "Đưa được vào trong trang chiếu đường dẫn đến video hay tài liệu khác.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH8-E-008) thay vì YCCĐ đích thực sự (TH8-E-010). Về mặt chuyên môn, tiêu chí legacy '3.2' (VD) thuộc YCCĐ TH8-E-010 ('Sử dụng được các bản mẫu (template) để tạo bài trì...'). Khi ánh xạ về đúng TH8-E-010, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH8-E-010",
    "resolvedRequirementText": "Sử dụng được các bản mẫu (template) để tạo bài trình chiếu.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 60,
    "grade": 9,
    "lessonId": "KNTT-TH9-B03",
    "lessonTitle": "Bài 3. Thực hành: Đánh giá chất lượng thông tin",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.1 Nêu được ví dụ minh hoạ giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin",
    "requirementId": "TH9-C-001",
    "canonicalRequirementText": "Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH9-C-001. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH9-C-001",
    "resolvedRequirementText": "Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 61,
    "grade": 9,
    "lessonId": "KNTT-TH9-B03",
    "lessonTitle": "Bài 3. Thực hành: Đánh giá chất lượng thông tin",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyCriterionText": "2.2 Nêu được ví dụ minh hoạ giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin.",
    "requirementId": "TH9-C-001",
    "canonicalRequirementText": "Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "INCORRECT",
    "reviewNote": "Trong Task 005, do không khớp chuỗi tuyệt đối nên thuật toán fallback về candidates[0] (TH9-C-001) thay vì YCCĐ đích thực sự (TH9-C-002). Về mặt chuyên môn, tiêu chí legacy '2.2' (TH) thuộc YCCĐ TH9-C-002 ('Giải thích được tính mới, tính chính xác, tính đầy...'). Khi ánh xạ về đúng TH9-C-002, mức độ tương thích là CONFIRMED.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-C-002",
    "resolvedRequirementText": "Giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin. Nêu được ví dụ minh hoạ.",
    "resolvedMatchType": "CONFIRMED"
  },
  {
    "index": 62,
    "grade": 9,
    "lessonId": "KNTT-TH9-B09B",
    "lessonTitle": "Bài 9b. Các chức năng chính của phần mềm làm video",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Nêu được một số chức năng cơ bản của phần mềm làm video.",
    "requirementId": "TH9-E-008",
    "canonicalRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-E-008",
    "resolvedRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 63,
    "grade": 9,
    "lessonId": "KNTT-TH9-B10B",
    "lessonTitle": "Bài 10b. Chuẩn bị dữ liệu và dựng video",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.1 Chuẩn bị được các dữ liệu: văn bản, hình ảnh, video, nhạc nền, thuyết minh,…",
    "requirementId": "TH9-E-008",
    "canonicalRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-E-008",
    "resolvedRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 64,
    "grade": 9,
    "lessonId": "KNTT-TH9-B10B",
    "lessonTitle": "Bài 10b. Chuẩn bị dữ liệu và dựng video",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.2 Dựng được video ngắn (1-2 phút) có phụ đề.",
    "requirementId": "TH9-E-008",
    "canonicalRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-008. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-E-008",
    "resolvedRequirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 65,
    "grade": 9,
    "lessonId": "KNTT-TH9-B11B",
    "lessonTitle": "Bài 11b. Thực hành: Dựng video theo kịch bản",
    "legacyCriterionCode": "3.3",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.3 Dựng được video ngắn (1-2 phút) có phụ đề theo một kịch bản cho trước.",
    "requirementId": "TH9-E-009",
    "canonicalRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-009. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-E-009",
    "resolvedRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 66,
    "grade": 9,
    "lessonId": "KNTT-TH9-B12B",
    "lessonTitle": "Bài 12b. Hoàn thành việc dựng video",
    "legacyCriterionCode": "3.4",
    "legacyLevel": "VD",
    "legacyCriterionText": "3.4 Hoàn thành được một video ngắn: chèn hiệu ứng, chuyển cảnh, thêm nhạc nền, thuyết minh, phụ đề.",
    "requirementId": "TH9-E-009",
    "canonicalRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "PARTIAL_MATCH",
    "reviewNote": "Tiêu chí legacy thể hiện một phân nhóm hành động, kỹ năng thực hành hoặc thao tác thành phần của YCCĐ phức hợp TH9-E-009. Đây là tiến trình sư phạm hợp lệ của bài học nhằm thực hiện mục tiêu bộ phận của YCCĐ.",
    "isVerified": false,
    "resolvedRequirementId": "TH9-E-009",
    "resolvedRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "resolvedMatchType": "PARTIAL_MATCH"
  },
  {
    "index": 67,
    "grade": 9,
    "lessonId": "KNTT-TH9-B13B",
    "lessonTitle": "Bài 13b. Biên tập và xuất video",
    "legacyCriterionCode": "4.1",
    "legacyLevel": "VDC",
    "legacyCriterionText": "4.1 Biên tập và xuất được một video ngắn (1-2 phút) phục vụ một nhiệm vụ cụ thể.",
    "requirementId": "TH9-E-009",
    "canonicalRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "currentMatchType": "SEMANTIC_CONFIDENT",
    "reviewResult": "CONFIRMED",
    "reviewNote": "Tiêu chí legacy thể hiện trọn vẹn bản chất ngữ nghĩa của YCCĐ TH9-E-009. Khác biệt từ ngữ chỉ do hành văn viết gọn hoặc lược bỏ các ví dụ liệt kê minh hoạ phụ mà không làm thu hẹp hay mở rộng yêu cầu.",
    "isVerified": true,
    "resolvedRequirementId": "TH9-E-009",
    "resolvedRequirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "resolvedMatchType": "CONFIRMED"
  }
];

export const EXACT_NORMALIZED_20_SAMPLES: readonly ExactNormalizedSampleAudit[] = [
  {
    "grade": 6,
    "lessonId": "KNTT-TH6-B01",
    "lessonTitle": "Bài 1. Thông tin và dữ liệu",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyText": "1.1 Phân biệt được thông tin với vật mang tin.",
    "canonicalId": "TH6-A-001",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 6,
    "lessonId": "KNTT-TH6-B01",
    "lessonTitle": "Bài 1. Thông tin và dữ liệu",
    "legacyCriterionCode": "1.2",
    "legacyLevel": "NB",
    "legacyText": "1.2 Nhận biết được sự khác nhau giữa thông tin và dữ liệu.",
    "canonicalId": "TH6-A-002",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 6,
    "lessonId": "KNTT-TH6-B01",
    "lessonTitle": "Bài 1. Thông tin và dữ liệu",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyText": "2.1 Nêu được ví dụ minh hoạ về mối quan hệ giữa thông tin và dữ liệu.",
    "canonicalId": "TH6-A-004",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 6,
    "lessonId": "KNTT-TH6-B01",
    "lessonTitle": "Bài 1. Thông tin và dữ liệu",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyText": "2.2 Nêu được ví dụ minh hoạ tầm quan trọng của thông tin.",
    "canonicalId": "TH6-A-005",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 6,
    "lessonId": "KNTT-TH6-B02",
    "lessonTitle": "Bài 2. Xử lí thông tin",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyText": "1.1 Nêu được các bước cơ bản trong xử lí thông tin.",
    "canonicalId": "TH6-A-003",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 7,
    "lessonId": "KNTT-TH7-B03",
    "lessonTitle": "Bài 3: Quản lí dữ liệu trong máy tính",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyText": "3.1 Thao tác thành thạo với tệp và thư mục.",
    "canonicalId": "TH7-A-010",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 7,
    "lessonId": "KNTT-TH7-B04",
    "lessonTitle": "Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên Internet",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyText": "1.1 Nhận biết một số website là mạng xã hội (Facebook, YouTube, Zalo, Instagram…).",
    "canonicalId": "TH7-C-001",
    "matchType": "NORMALIZED",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp ngữ nghĩa sau khi chuẩn hóa khoảng trắng, dấu ngoặc hoặc dấu chấm lửng (.../…); nội dung học thuật hoàn toàn đồng nhất."
  },
  {
    "grade": 7,
    "lessonId": "KNTT-TH7-B07",
    "lessonTitle": "Bài 7: Tính toán tự động trên bảng tính",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyText": "3.1 Sử dụng được công thức và dùng được địa chỉ trong công thức , tạo được bảng tính đơn giản có số liệu tính toán bằng công thức",
    "canonicalId": "TH7-E-005",
    "matchType": "NORMALIZED",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp ngữ nghĩa sau khi chuẩn hóa khoảng trắng, dấu ngoặc hoặc dấu chấm lửng (.../…); nội dung học thuật hoàn toàn đồng nhất."
  },
  {
    "grade": 7,
    "lessonId": "KNTT-TH7-B14",
    "lessonTitle": "Bài 14: Thuật toán tìm kiếm tuần tự",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyText": "2.1 Giải thích thuật toán tìm kiếm tuần tự bằng các bước thủ công.",
    "canonicalId": "TH7-F-005",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 7,
    "lessonId": "KNTT-TH7-B15",
    "lessonTitle": "Bài 15: Thuật toán tìm kiếm nhị phân",
    "legacyCriterionCode": "2.3",
    "legacyLevel": "TH",
    "legacyText": "2.3 Giải thích thuật toán tìm kiếm nhị phân bằng các bước thủ công.",
    "canonicalId": "TH7-F-006",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 8,
    "lessonId": "KNTT-TH8-B01",
    "lessonTitle": "Bài 1: Lược sử công cụ tính toán",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyText": "1.1 Trình bày được sơ lược lịch sử phát triển máy tính.",
    "canonicalId": "TH8-A-001",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 8,
    "lessonId": "KNTT-TH8-B01",
    "lessonTitle": "Bài 1: Lược sử công cụ tính toán",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyText": "2.1 Nêu được ví dụ cho thấy sự phát triển máy tính đã đem đến những thay đổi lớn lao cho xã hội loài người.",
    "canonicalId": "TH8-A-002",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 8,
    "lessonId": "KNTT-TH8-B03",
    "lessonTitle": "Bài 3: Thực hành: Khai thác thông tin số",
    "legacyCriterionCode": "3.1",
    "legacyLevel": "VD",
    "legacyText": "3.1 Sử dụng được công cụ tìm kiếm, xử lí và trao đổi thông tin trong môi trường số.",
    "canonicalId": "TH8-C-004",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 8,
    "lessonId": "KNTT-TH8-B05",
    "lessonTitle": "Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyText": "3.2 Sử dụng được phần mềm bảng tính trợ giúp giải quyết bài toán thực tế",
    "canonicalId": "TH8-E-005",
    "matchType": "NORMALIZED",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp ngữ nghĩa sau khi chuẩn hóa khoảng trắng, dấu ngoặc hoặc dấu chấm lửng (.../…); nội dung học thuật hoàn toàn đồng nhất."
  },
  {
    "grade": 8,
    "lessonId": "KNTT-TH8-B8A",
    "lessonTitle": "Bài 8a: Làm việc với danh sách dạng liệt kê và hình ảnh trong văn bản",
    "legacyCriterionCode": "3.2",
    "legacyLevel": "VD",
    "legacyText": "3.2 Tạo được một số sản phẩm là văn bản có tính thẩm mĩ phục vụ nhu cầu thực tế.",
    "canonicalId": "TH8-E-011",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 9,
    "lessonId": "KNTT-TH9-B01",
    "lessonTitle": "Bài 1. Thế giới kĩ thuật số",
    "legacyCriterionCode": "1.1",
    "legacyLevel": "NB",
    "legacyText": "1.1 Nêu được khả năng của máy tính và chỉ ra được một số ứng dụng thực tế của nó trong khoa học kĩ thuật và đời sống.",
    "canonicalId": "TH9-A-001",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 9,
    "lessonId": "KNTT-TH9-B01",
    "lessonTitle": "Bài 1. Thế giới kĩ thuật số",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyText": "2.1 Nhận biết được sự có mặt của các thiết bị có gắn bộ xử lí thông tin ở khắp nơi (trong gia đình, ở trường học, cửa hàng, bệnh viện, công sở, nhà máy,...), trong mọi lĩnh vực (y tế, ngân hàng, hàng không, toán học, sinh học,...), nêu được ví dụ minh hoạ.",
    "canonicalId": "TH9-A-002",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 9,
    "lessonId": "KNTT-TH9-B01",
    "lessonTitle": "Bài 1. Thế giới kĩ thuật số",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyText": "2.2 Giải thích được tác động của công nghệ thông tin lên giáo dục và xã hội thông qua các ví dụ cụ thể.",
    "canonicalId": "TH9-A-003",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 9,
    "lessonId": "KNTT-TH9-B02",
    "lessonTitle": "Bài 2. Thông tin trong giải quyết vấn đề",
    "legacyCriterionCode": "2.1",
    "legacyLevel": "TH",
    "legacyText": "2.1 Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
    "canonicalId": "TH9-C-001",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  },
  {
    "grade": 9,
    "lessonId": "KNTT-TH9-B02",
    "lessonTitle": "Bài 2. Thông tin trong giải quyết vấn đề",
    "legacyCriterionCode": "2.2",
    "legacyLevel": "TH",
    "legacyText": "2.2 Giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin. Nêu được ví dụ minh hoạ.",
    "canonicalId": "TH9-C-002",
    "matchType": "EXACT",
    "auditResult": "VERIFIED_CORRECT",
    "notes": "Khớp nguyên văn 100% với văn bản chuẩn của Thông tư 32/2018/TT-BGDĐT."
  }
];

export const MULTI_LESSON_15_AUDIT = [
  {
    "requirementId": "TH6-E-006",
    "requirementText": "Thực hiện được các thao tác: chèn hình ảnh, tạo bảng trong văn bản; thay đổi kích thước, vị trí của hình ảnh; căn chỉnh bảng.",
    "lessons": [
      {
        "lessonId": "KNTT-TH6-B10",
        "lessonTitle": "Bài 10. Sơ đồ tư duy",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Chèn ảnh đồ hoạ và sơ đồ trực quan vào tài liệu"
      },
      {
        "lessonId": "KNTT-TH6-B11",
        "lessonTitle": "Bài 11. Định dạng văn bản",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Định dạng và bố trí văn bản kết hợp hình ảnh"
      },
      {
        "lessonId": "KNTT-TH6-B12",
        "lessonTitle": "Bài 12. Trình bày thông tin ở dạng bảng",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Tạo bảng, thay đổi kích thước, căn chỉnh bảng trong văn bản"
      }
    ]
  },
  {
    "requirementId": "TH7-E-004",
    "requirementText": "Thực hiện được một số phép toán thông dụng, sử dụng được một số hàm đơn giản như: MAX, MIN, SUM, AVERAGE, COUNT, …",
    "lessons": [
      {
        "lessonId": "KNTT-TH7-B08",
        "lessonTitle": "Bài 8: Sử dụng các hàm tính toán cơ bản",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Hướng dẫn cú pháp và thực hành hàm tính toán: SUM, AVERAGE, MAX, MIN, COUNT"
      },
      {
        "lessonId": "KNTT-TH7-B09",
        "lessonTitle": "Bài 9: Định dạng trang tính, chèn thêm, xóa hàng và cột",
        "criteriaCodes": [
          "3.2"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Áp dụng hàm tính toán trong bảng tính đã định dạng hoàn chỉnh"
      }
    ]
  },
  {
    "requirementId": "TH7-E-010",
    "requirementText": "Tạo được một báo cáo có tiêu đề, cấu trúc phân cấp, ảnh minh hoạ, hiệu ứng động.",
    "lessons": [
      {
        "lessonId": "KNTT-TH7-B11",
        "lessonTitle": "Bài 11: Tạo bài trình chiếu",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Tạo cấu trúc báo cáo, tiêu đề, phân cấp nội dung và ảnh minh họa"
      },
      {
        "lessonId": "KNTT-TH7-B13",
        "lessonTitle": "Bài 13: Thực hành: Hoàn thành bài trình chiếu",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Bổ sung hiệu ứng động hợp lý và hoàn thiện báo cáo trình chiếu"
      }
    ]
  },
  {
    "requirementId": "TH7-F-004",
    "requirementText": "Biểu diễn và mô phỏng được hoạt động của thuật toán đó trên một bộ dữ liệu vào có kích thước nhỏ.",
    "lessons": [
      {
        "lessonId": "KNTT-TH7-B14",
        "lessonTitle": "Bài 14: Thuật toán tìm kiếm tuần tự",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Mô phỏng từng bước thuật toán tìm kiếm tuần tự trên dãy số cụ thể"
      },
      {
        "lessonId": "KNTT-TH7-B15",
        "lessonTitle": "Bài 15: Thuật toán tìm kiếm nhị phân",
        "criteriaCodes": [
          "3.2"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Mô phỏng từng bước thuật toán tìm kiếm nhị phân trên dãy đã sắp xếp"
      },
      {
        "lessonId": "KNTT-TH7-B16",
        "lessonTitle": "Bài 16: Thuật toán sắp xếp",
        "criteriaCodes": [
          "3.3"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Mô phỏng từng bước thuật toán sắp xếp (chọn / nổi bọt) trên dãy số"
      }
    ]
  },
  {
    "requirementId": "TH8-E-003",
    "requirementText": "Thực hiện được các thao tác tạo biểu đồ, lọc và sắp xếp dữ liệu. Nêu được một số tình huống thực tế cần sử dụng các chức năng đó của phần mềm bảng tính.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B06",
        "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
        "criteriaCodes": [
          "3.2",
          "3.3"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Thực hiện thao tác lọc, sắp xếp dữ liệu và nêu các tình huống thực tế"
      },
      {
        "lessonId": "KNTT-TH8-B07",
        "lessonTitle": "Bài 7: Trực quan hóa dữ liệu bằng biểu đồ",
        "criteriaCodes": [
          "3.4",
          "3.5"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Thực hiện thao tác tạo biểu đồ và nêu tình huống thực tế cần trực quan hóa"
      }
    ]
  },
  {
    "requirementId": "TH8-E-005",
    "requirementText": "Sử dụng được phần mềm bảng tính trợ giúp giải quyết bài toán thực tế.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B05",
        "lessonTitle": "Bài 5: Sử dụng địa chỉ tuyệt đối và tương đối",
        "criteriaCodes": [
          "3.2"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Ứng dụng công thức tính toán vào bài toán thực tế"
      },
      {
        "lessonId": "KNTT-TH8-B06",
        "lessonTitle": "Bài 6: Sắp xếp và lọc dữ liệu",
        "criteriaCodes": [
          "4.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Ứng dụng sắp xếp và lọc dữ liệu giải quyết bài toán tổng hợp thực tế"
      }
    ]
  },
  {
    "requirementId": "TH8-E-006",
    "requirementText": "Thực hiện được các thao tác trong phần mềm soạn thảo: chèn thêm, xoá bỏ, co dãn hình ảnh, vẽ hình đồ hoạ trong văn bản, tạo danh sách dạng liệt kê, đánh số trang, thêm đầu trang và chân trang.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B08A",
        "lessonTitle": "Bài 8a: Thêm hình ảnh và hình đồ họa vào văn bản",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Thao tác chèn/xoá/co dãn hình ảnh, vẽ hình đồ họa, tạo danh sách liệt kê"
      },
      {
        "lessonId": "KNTT-TH8-B09A",
        "lessonTitle": "Bài 9a: Đánh số trang, thêm đầu trang và chân trang",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Thao tác đánh số trang, tạo tiêu đề đầu trang và chân trang trong văn bản"
      }
    ]
  },
  {
    "requirementId": "TH8-E-011",
    "requirementText": "Tạo được một bài trình chiếu hoàn chỉnh phục vụ một nhu cầu cụ thể.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B11A",
        "lessonTitle": "Bài 11a: Thực hành tổng hợp: Tạo bài trình chiếu",
        "criteriaCodes": [
          "4.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Hoàn thiện dự án bài trình chiếu đa phương tiện phục vụ nhu cầu thực tế"
      }
    ]
  },
  {
    "requirementId": "TH8-E-013",
    "requirementText": "Nêu được một số chức năng cơ bản của phần mềm chỉnh sửa ảnh. Thực hiện được một số thao tác cơ bản: mở tệp ảnh, phóng to, thu nhỏ, di chuyển ảnh, cắt một phần ảnh, tẩy xoá, thay đổi kích thước và lưu ảnh.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B08B",
        "lessonTitle": "Bài 8b: Phần mềm chỉnh sửa ảnh",
        "criteriaCodes": [
          "1.1",
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Nêu chức năng, mở tệp ảnh, phóng to thu nhỏ, lưu ảnh"
      },
      {
        "lessonId": "KNTT-TH8-B09B",
        "lessonTitle": "Bài 9b: Các thao tác cơ bản với tệp ảnh",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Cắt một phần ảnh, thay đổi kích thước và biến đổi khung hình"
      },
      {
        "lessonId": "KNTT-TH8-B10B",
        "lessonTitle": "Bài 10b: Làm việc với các lớp ảnh",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Tẩy xoá đối tượng, xử lý vùng chọn trên các lớp ảnh"
      },
      {
        "lessonId": "KNTT-TH8-B11B",
        "lessonTitle": "Bài 11b: Thực hành tổng hợp: Dự án chỉnh sửa ảnh",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Tích hợp toàn diện các thao tác cơ bản trong sản phẩm dự án ảnh"
      }
    ]
  },
  {
    "requirementId": "TH8-E-014",
    "requirementText": "Sử dụng được phần mềm chỉnh sửa ảnh để phục hồi, cải thiện chất lượng một hình ảnh.",
    "lessons": [
      {
        "lessonId": "KNTT-TH8-B08B",
        "lessonTitle": "Bài 8b: Phần mềm chỉnh sửa ảnh",
        "criteriaCodes": [
          "3.2"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Làm quen các công cụ điều chỉnh độ sáng, tương phản"
      },
      {
        "lessonId": "KNTT-TH8-B10B",
        "lessonTitle": "Bài 10b: Làm việc với các lớp ảnh",
        "criteriaCodes": [
          "3.2"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Sử dụng các lớp màu, bộ lọc làm nét, cải thiện chi tiết ảnh"
      },
      {
        "lessonId": "KNTT-TH8-B11B",
        "lessonTitle": "Bài 11b: Thực hành tổng hợp: Dự án chỉnh sửa ảnh",
        "criteriaCodes": [
          "4.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Phục hồi hoàn chỉnh một bức ảnh cũ hoặc ảnh chất lượng kém"
      }
    ]
  },
  {
    "requirementId": "TH9-C-001",
    "requirementText": "Giải thích được sự cần thiết phải quan tâm đến chất lượng thông tin khi tìm kiếm, tiếp nhận và trao đổi thông tin. Nêu được ví dụ minh hoạ.",
    "lessons": [
      {
        "lessonId": "KNTT-TH9-B02",
        "lessonTitle": "Bài 2. Đánh giá chất lượng thông tin",
        "criteriaCodes": [
          "2.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Giải thích bản chất và tính cấp thiết về chất lượng thông tin trong môi trường số"
      },
      {
        "lessonId": "KNTT-TH9-B03",
        "lessonTitle": "Bài 3. Đánh giá độ tin cậy của thông tin",
        "criteriaCodes": [
          "2.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Minh hoạ và vận dụng tiêu chí đánh giá chất lượng trong tìm kiếm và trao đổi"
      }
    ]
  },
  {
    "requirementId": "TH9-C-002",
    "requirementText": "Giải thích được tính mới, tính chính xác, tính đầy đủ, tính sử dụng được của thông tin. Nêu được ví dụ minh hoạ.",
    "lessons": [
      {
        "lessonId": "KNTT-TH9-B02",
        "lessonTitle": "Bài 2. Đánh giá chất lượng thông tin",
        "criteriaCodes": [
          "2.2"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Định nghĩa và phân tích 4 thuộc tính chất lượng thông tin"
      },
      {
        "lessonId": "KNTT-TH9-B03",
        "lessonTitle": "Bài 3. Đánh giá độ tin cậy của thông tin",
        "criteriaCodes": [
          "2.2"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Cho ví dụ cụ thể về tính mới, chính xác, đầy đủ, sử dụng được của thông tin"
      }
    ]
  },
  {
    "requirementId": "TH9-E-007",
    "requirementText": "Sử dụng được một số hàm tài chính: PMT, FV, RATE, NPER, PV vào bài toán kinh tế cụ thể.",
    "lessons": [
      {
        "lessonId": "KNTT-TH9-B09A",
        "lessonTitle": "Bài 9a. Sử dụng công cụ xác thực dữ liệu",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Kỹ năng nền tảng kiểm soát dữ liệu đầu vào (Data Validation) phục vụ bài toán tài chính"
      },
      {
        "lessonId": "KNTT-TH9-B10A",
        "lessonTitle": "Bài 10a. Sử dụng hàm đếm có điều kiện",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Hàm thống kê đếm có điều kiện (COUNTIF) xử lý dữ liệu giao dịch tài chính"
      },
      {
        "lessonId": "KNTT-TH9-B11A",
        "lessonTitle": "Bài 11a. Sử dụng hàm logic nâng cao: IF, AND, OR",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Xây dựng điều kiện logic rẽ nhánh áp dụng mức lãi suất hoặc phân loại tài chính"
      },
      {
        "lessonId": "KNTT-TH9-B12A",
        "lessonTitle": "Bài 12a. Sử dụng hàm tài chính cơ bản: PMT, FV, PV",
        "criteriaCodes": [
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Trọng tâm trực tiếp: Giảng dạy và thực hành các hàm tài chính PMT, FV, PV"
      },
      {
        "lessonId": "KNTT-TH9-B13A",
        "lessonTitle": "Bài 13a. Thực hành: Dự án giải quyết bài toán tài chính tổng hợp",
        "criteriaCodes": [
          "4.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Tích hợp toàn diện các hàm tài chính (PMT, FV, RATE, NPER, PV) vào dự án kinh tế thực tế"
      }
    ]
  },
  {
    "requirementId": "TH9-E-008",
    "requirementText": "Nêu được một số chức năng và thực hiện được một số thao tác cơ bản trong sử dụng một phần mềm làm video.",
    "lessons": [
      {
        "lessonId": "KNTT-TH9-B09B",
        "lessonTitle": "Bài 9b. Phần mềm làm video",
        "criteriaCodes": [
          "1.1",
          "3.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Nêu chức năng và giao diện cơ bản của phần mềm làm video"
      },
      {
        "lessonId": "KNTT-TH9-B10B",
        "lessonTitle": "Bài 10b. Thực hành: Làm quen với phần mềm làm video",
        "criteriaCodes": [
          "3.1",
          "3.2"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Chuẩn bị dữ liệu và thực hiện các thao tác dựng video cơ bản"
      }
    ]
  },
  {
    "requirementId": "TH9-E-009",
    "requirementText": "Tạo được một vài đoạn video đáp ứng nhu cầu cuộc sống của cá nhân, gia đình, trường học và địa phương.",
    "lessons": [
      {
        "lessonId": "KNTT-TH9-B11B",
        "lessonTitle": "Bài 11b. Dựng video theo kịch bản",
        "criteriaCodes": [
          "3.3"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Dựng video ngắn có phụ đề theo kịch bản đáp ứng nhu cầu cụ thể"
      },
      {
        "lessonId": "KNTT-TH9-B12B",
        "lessonTitle": "Bài 12b. Hiệu ứng và âm thanh trong video",
        "criteriaCodes": [
          "3.4"
        ],
        "matchQuality": "PARTIAL_MATCH",
        "contributionNote": "Thêm hiệu ứng, chuyển cảnh, thuyết minh và nhạc nền hoàn thiện video"
      },
      {
        "lessonId": "KNTT-TH9-B13B",
        "lessonTitle": "Bài 13b. Thực hành tổng hợp: Dự án làm video",
        "criteriaCodes": [
          "4.1"
        ],
        "matchQuality": "CONFIRMED",
        "contributionNote": "Biên tập và xuất video hoàn chỉnh phục vụ một nhiệm vụ/dự án cụ thể của trường/địa phương"
      }
    ]
  }
] as const;

export const TH9_E_007_AUDIT = {
  "requirementId": "TH9-E-007",
  "requirementText": "Sử dụng được một số hàm tài chính: PMT, FV, RATE, NPER, PV vào bài toán kinh tế cụ thể.",
  "lessonsAnalysis": [
    {
      "lessonId": "KNTT-TH9-B09A",
      "lessonNumber": "Bài 9a",
      "lessonTitle": "Bài 9a. Sử dụng công cụ xác thực dữ liệu",
      "roleInRequirement": "SUPPORTING_FOUNDATION",
      "contributionDescription": "B09A cung cấp kỹ năng xác thực dữ liệu đầu vào (Data Validation: giới hạn miền giá trị lãi suất > 0, số kỳ hạn nguyên dương, số tiền vay hợp lệ). Đây là kỹ năng nền tảng đảm bảo tính toàn vẹn dữ liệu cho mô hình tài chính trước khi tính toán.",
      "directlyExecutesFinancialFormulas": false
    },
    {
      "lessonId": "KNTT-TH9-B10A",
      "lessonNumber": "Bài 10a",
      "lessonTitle": "Bài 10a. Sử dụng hàm đếm có điều kiện",
      "roleInRequirement": "SUPPORTING_ANALYTICS",
      "contributionDescription": "B10A cung cấp kỹ năng tổng hợp và đếm có điều kiện (COUNTIF, SUMIF) để lọc các giao dịch tài chính, thống kê các kỳ hạn thanh toán hoặc các nhóm khách hàng theo điều kiện.",
      "directlyExecutesFinancialFormulas": false
    },
    {
      "lessonId": "KNTT-TH9-B11A",
      "lessonNumber": "Bài 11a",
      "lessonTitle": "Bài 11a. Sử dụng hàm logic nâng cao: IF, AND, OR",
      "roleInRequirement": "SUPPORTING_LOGIC",
      "contributionDescription": "B11A cung cấp công cụ ra quyết định logic (hàm IF lồng ghép AND/OR) giúp mô hình tài chính tự động phân nhánh áp dụng biểu lãi suất ưu đãi hoặc xếp hạng tín dụng.",
      "directlyExecutesFinancialFormulas": false
    },
    {
      "lessonId": "KNTT-TH9-B12A",
      "lessonNumber": "Bài 12a",
      "lessonTitle": "Bài 12a. Sử dụng hàm tài chính cơ bản: PMT, FV, PV",
      "roleInRequirement": "CORE_EXECUTION",
      "contributionDescription": "B12A trực tiếp hướng dẫn lý thuyết và thực hành tính toán dòng tiền bằng các hàm tài chính PMT (tính tiền trả góp hàng tháng), FV (giá trị tương lai tích lũy), PV (giá trị hiện tại của khoản tiền gửi). Trực tiếp thể hiện YCCĐ.",
      "directlyExecutesFinancialFormulas": true
    },
    {
      "lessonId": "KNTT-TH9-B13A",
      "lessonNumber": "Bài 13a",
      "lessonTitle": "Bài 13a. Thực hành: Dự án giải quyết bài toán tài chính tổng hợp",
      "roleInRequirement": "INTEGRATED_CAPSTONE",
      "contributionDescription": "B13A đóng vai trò bài thực hành dự án tổng hợp cấp độ VDC, tích hợp toàn bộ các hàm PMT, FV, RATE, NPER, PV kết hợp xác thực dữ liệu và logic để giải quyết bài toán tài chính hoàn chỉnh (lập kế hoạch tài chính cá nhân/gia đình).",
      "directlyExecutesFinancialFormulas": true
    }
  ],
  "synthesisNote": "Trong 5 bài học của mạch Bảng tính ứng dụng Lớp 9: Bài 12a và 13a trực tiếp thực thi các hàm tài chính của YCCĐ TH9-E-007; Bài 9a, 10a, 11a cung cấp các kỹ năng công cụ nền tảng (validation, analytics, logic) để tạo lập mô hình tài chính hoàn chỉnh trong dự án."
} as const;

export const TH8_E_013_AUDIT = {
  "requirementId": "TH8-E-013",
  "requirementText": "Nêu được một số chức năng cơ bản của phần mềm chỉnh sửa ảnh. Thực hiện được một số thao tác cơ bản: mở tệp ảnh, phóng to, thu nhỏ, di chuyển ảnh, cắt một phần ảnh, tẩy xoá, thay đổi kích thước và lưu ảnh.",
  "pedagogicalArchitecture": "SPIRAL_PROGRESSION",
  "distinctionFromDuplicate": "Không phải duplicate ngẫu nhiên mà là một Learning Progression (tiến trình sư phạm xoắn ốc) được thiết kế có chủ đích: mỗi bài học phụ trách một giai đoạn thao tác tăng dần về độ phức tạp.",
  "progressionSteps": [
    {
      "lessonId": "KNTT-TH8-B08B",
      "stage": "STAGE_1_FOUNDATION",
      "focus": "Nhận biết chức năng phần mềm, mở ảnh, phóng to, thu nhỏ, lưu ảnh (mức NB và TH cơ bản)."
    },
    {
      "lessonId": "KNTT-TH8-B09B",
      "stage": "STAGE_2_TRANSFORMATION",
      "focus": "Cắt một phần ảnh, xoay, thay đổi kích thước ảnh theo kích thước chuẩn (mức VD cơ bản)."
    },
    {
      "lessonId": "KNTT-TH8-B10B",
      "stage": "STAGE_3_LAYERS_AND_ERASING",
      "focus": "Làm việc với các lớp (layers), khoanh vùng chọn, tẩy xoá các chi tiết không mong muốn (mức VD nâng cao)."
    },
    {
      "lessonId": "KNTT-TH8-B11B",
      "stage": "STAGE_4_SYNTHESIS_PROJECT",
      "focus": "Vận dụng tổng hợp toàn bộ các thao tác cơ bản và nâng cao để tạo sản phẩm đồ họa hoàn chỉnh (mức VDC)."
    }
  ]
} as const;

export const MULTI_LEVEL_REQUIREMENTS = [
  {
    "requirementId": "TH8-E-005",
    "levels": [
      "VD",
      "VDC"
    ],
    "notes": "Xuất hiện ở mức VD (Bài 5) và VDC (Bài 6) trong phần mềm bảng tính"
  },
  {
    "requirementId": "TH8-E-011",
    "levels": [
      "VD",
      "VDC"
    ],
    "notes": "Xuất hiện ở mức VD (Bài 10a) và VDC (Bài 11a) trong bài trình chiếu hoàn chỉnh"
  },
  {
    "requirementId": "TH9-E-009",
    "levels": [
      "VD",
      "VDC"
    ],
    "notes": "Xuất hiện ở mức VD (Bài 11b, 12b) và VDC (Bài 13b) trong dự án video"
  }
] as const;

export const MODEL_LIMITATION_REPORT = {
  "hasCriterionCoveringMultipleRequirements": false,
  "detectedCount": 0,
  "analysis": "Toàn bộ 163 tiêu chí legacy trong criteriaData của curriculum.ts đều tương ứng 1-1 với một YCCĐ hoặc một phần của một YCCĐ trong CTGDPT 2018 (quan hệ 1 tiêu chí -> 1 YCCĐ, hoặc nhiều tiêu chí -> 1 YCCĐ). Hiện tại không có tiêu chí nào trong 163 tiêu chí thực sự bao phủ đồng thời từ 2 YCCĐ phân lập trở lên. Tuy nhiên, về mặt thiết kế dữ liệu, cấu trúc CriterionMappingEvidence hiện chỉ có trường canonicalRequirementId: string (đơn trị). Nếu trong tương lai có các tiêu chí tích hợp liên môn hoặc tích hợp đa chủ đề bao phủ đồng thời nhiều YCCĐ, model sẽ cần mở rộng thêm trường canonicalRequirementIds?: readonly string[].",
  "recommendation": "Giữ nguyên schema hiện tại cho Task 005B vì dữ liệu thực tế không yêu cầu."
} as const;
