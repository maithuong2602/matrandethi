import { CurriculumTopic, CurriculumSubTopic } from './types';

export const CANONICAL_TOPICS: ReadonlyArray<CurriculumTopic> = Object.freeze([
  {
    id: 'TH-A',
    code: 'A',
    name: 'Chủ đề A. Máy tính và cộng đồng',
    description: 'Tìm hiểu về máy tính, dữ liệu, phần cứng, phần mềm và vai trò của máy tính trong đời sống xã hội.'
  },
  {
    id: 'TH-B',
    code: 'B',
    name: 'Chủ đề B. Mạng máy tính và Internet',
    description: 'Kiến thức về mạng máy tính, Internet và các dịch vụ mạng.'
  },
  {
    id: 'TH-C',
    code: 'C',
    name: 'Chủ đề C. Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
    description: 'Kỹ năng và phương pháp tìm kiếm, thu thập, lưu trữ và trao đổi thông tin trong môi trường số.'
  },
  {
    id: 'TH-D',
    code: 'D',
    name: 'Chủ đề D. Đạo đức, pháp luật và văn hoá trong môi trường số',
    description: 'Quy tắc ứng xử, an toàn thông tin, đạo đức và pháp luật khi tham gia thế giới số.'
  },
  {
    id: 'TH-E',
    code: 'E',
    name: 'Chủ đề E. Ứng dụng tin học',
    description: 'Sử dụng các phần mềm ứng dụng: soạn thảo, bảng tính, trình chiếu, chỉnh sửa ảnh, video, mô phỏng.'
  },
  {
    id: 'TH-F',
    code: 'F',
    name: 'Chủ đề F. Giải quyết vấn đề với sự trợ giúp của máy tính',
    description: 'Tư duy thuật toán, cấu trúc dữ liệu cơ bản và lập trình trực quan.'
  },
  {
    id: 'TH-G',
    code: 'G',
    name: 'Chủ đề G. Hướng nghiệp với tin học',
    description: 'Tìm hiểu về các ngành nghề liên quan đến tin học và ứng dụng công nghệ thông tin.'
  }
]);

export const CANONICAL_SUBTOPICS: ReadonlyArray<CurriculumSubTopic> = Object.freeze([
  // --- GRADE 6 ---
  { id: 'TH6-A-S01', grade: 6, topicId: 'TH-A', code: 'S01', name: '1. Thông tin và dữ liệu' },
  { id: 'TH6-A-S02', grade: 6, topicId: 'TH-A', code: 'S02', name: '2. Biểu diễn thông tin và lưu trữ dữ liệu trong máy tính' },
  { id: 'TH6-B-S01', grade: 6, topicId: 'TH-B', code: 'S01', name: 'Giới thiệu về mạng máy tính và Internet' },
  { id: 'TH6-C-S01', grade: 6, topicId: 'TH-C', code: 'S01', name: 'World Wide Web, thư điện tử và công cụ tìm kiếm thông tin' },
  { id: 'TH6-D-S01', grade: 6, topicId: 'TH-D', code: 'S01', name: 'Đề phòng một số tác hại khi tham gia Internet' },
  { id: 'TH6-E-S01', grade: 6, topicId: 'TH-E', code: 'S01', name: '1. Soạn thảo văn bản cơ bản' },
  { id: 'TH6-E-S02', grade: 6, topicId: 'TH-E', code: 'S02', name: '2. Sơ đồ tư duy và phần mềm sơ đồ tư duy' },
  { id: 'TH6-F-S01', grade: 6, topicId: 'TH-F', code: 'S01', name: 'Khái niệm thuật toán và biểu diễn thuật toán' },

  // --- GRADE 7 ---
  { id: 'TH7-A-S01', grade: 7, topicId: 'TH-A', code: 'S01', name: '1. Sơ lược về các thành phần của máy tính' },
  { id: 'TH7-A-S02', grade: 7, topicId: 'TH-A', code: 'S02', name: '2. Khái niệm hệ điều hành và phần mềm ứng dụng' },
  { id: 'TH7-C-S01', grade: 7, topicId: 'TH-C', code: 'S01', name: 'Mạng xã hội và một số kênh trao đổi thông tin thông dụng trên Internet' },
  { id: 'TH7-D-S01', grade: 7, topicId: 'TH-D', code: 'S01', name: 'Văn hoá ứng xử qua phương tiện truyền thông số' },
  { id: 'TH7-E-S01', grade: 7, topicId: 'TH-E', code: 'S01', name: '1. Bảng tính điện tử cơ bản' },
  { id: 'TH7-E-S02', grade: 7, topicId: 'TH-E', code: 'S02', name: '2. Phần mềm trình chiếu cơ bản' },
  { id: 'TH7-F-S01', grade: 7, topicId: 'TH-F', code: 'S01', name: 'Một số thuật toán sắp xếp và tìm kiếm cơ bản' },

  // --- GRADE 8 ---
  { id: 'TH8-A-S01', grade: 8, topicId: 'TH-A', code: 'S01', name: 'Sơ lược về lịch sử phát triển máy tính' },
  { id: 'TH8-C-S01', grade: 8, topicId: 'TH-C', code: 'S01', name: '1. Đặc điểm của thông tin trong môi trường số' },
  { id: 'TH8-C-S02', grade: 8, topicId: 'TH-C', code: 'S02', name: '2. Thông tin với giải quyết vấn đề' },
  { id: 'TH8-D-S01', grade: 8, topicId: 'TH-D', code: 'S01', name: 'Đạo đức và văn hoá trong sử dụng công nghệ kĩ thuật số' },
  { id: 'TH8-E-S01', grade: 8, topicId: 'TH-E', code: 'S01', name: '1. Xử lí và trực quan hoá dữ liệu bằng bảng tính điện tử' },
  { id: 'TH8-E-S02', grade: 8, topicId: 'TH-E', code: 'S02', name: '2. Chủ đề con (lựa chọn): Soạn thảo văn bản và phần mềm trình chiếu nâng cao' },
  { id: 'TH8-E-S03', grade: 8, topicId: 'TH-E', code: 'S03', name: '3. Chủ đề con (lựa chọn): Làm quen với phần mềm chỉnh sửa ảnh' },
  { id: 'TH8-F-S01', grade: 8, topicId: 'TH-F', code: 'S01', name: 'Lập trình trực quan' },
  { id: 'TH8-G-S01', grade: 8, topicId: 'TH-G', code: 'S01', name: 'Tin học và ngành nghề' },

  // --- GRADE 9 ---
  { id: 'TH9-A-S01', grade: 9, topicId: 'TH-A', code: 'S01', name: 'Vai trò của máy tính trong đời sống' },
  { id: 'TH9-C-S01', grade: 9, topicId: 'TH-C', code: 'S01', name: 'Đánh giá chất lượng thông tin trong giải quyết vấn đề' },
  { id: 'TH9-D-S01', grade: 9, topicId: 'TH-D', code: 'S01', name: 'Một số vấn đề pháp lí về sử dụng dịch vụ Internet' },
  { id: 'TH9-E-S01', grade: 9, topicId: 'TH-E', code: 'S01', name: '1. Phần mềm mô phỏng và khám phá tri thức' },
  { id: 'TH9-E-S02', grade: 9, topicId: 'TH-E', code: 'S02', name: '2. Trình bày thông tin trong trao đổi và hợp tác' },
  { id: 'TH9-E-S03', grade: 9, topicId: 'TH-E', code: 'S03', name: '3. Chủ đề con (lựa chọn): Sử dụng bảng tính điện tử nâng cao' },
  { id: 'TH9-E-S04', grade: 9, topicId: 'TH-E', code: 'S04', name: '4. Chủ đề con (lựa chọn): Làm quen với phần mềm làm video' },
  { id: 'TH9-F-S01', grade: 9, topicId: 'TH-F', code: 'S01', name: 'Giải bài toán bằng máy tính' },
  { id: 'TH9-G-S01', grade: 9, topicId: 'TH-G', code: 'S01', name: 'Tin học và định hướng nghề nghiệp' }
]);
