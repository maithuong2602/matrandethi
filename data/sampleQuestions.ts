import { ExerciseQuestion } from '../types';

/**
 * Danh sách câu hỏi mẫu khởi tạo cho Ngân hàng câu hỏi
 * Tuân thủ cấu trúc ExerciseQuestion hiện tại của hệ thống.
 */
export const SAMPLE_QUESTIONS: ExerciseQuestion[] = [
  {
    id: 'sample_th6_nb_01',
    category: 'mc',
    level: 'NB',
    criteria: '1.1',
    content: 'Vật nào sau đây được coi là vật mang tin trong đời sống hàng ngày?',
    mcType: 'multiple-choice',
    questionType: 'multiple-choice',
    options: [
      { id: 'A', text: 'Cuốn sách giáo khoa Tin học 6', isCorrect: true },
      { id: 'B', text: 'Tiếng còi xe máy trên đường', isCorrect: false },
      { id: 'C', text: 'Ánh nắng mặt trời buổi sáng', isCorrect: false },
      { id: 'D', text: 'Cơn gió mùa đông bắc', isCorrect: false }
    ],
    answer: 'A',
    points: 0.25
  },
  {
    id: 'sample_th6_th_01',
    category: 'mc',
    level: 'TH',
    criteria: '1.2',
    content: 'Phát biểu nào sau đây nêu đúng mối quan hệ giữa thông tin và dữ liệu?',
    mcType: 'multiple-choice',
    questionType: 'multiple-choice',
    options: [
      { id: 'A', text: 'Thông tin là ý nghĩa được rút ra từ dữ liệu sau quá trình xử lí của con người hoặc máy tính', isCorrect: true },
      { id: 'B', text: 'Dữ liệu và thông tin là hai khái niệm hoàn toàn đồng nhất, không có sự khác biệt', isCorrect: false },
      { id: 'C', text: 'Dữ liệu chỉ bao gồm các con số, không thể là hình ảnh hoặc âm thanh', isCorrect: false },
      { id: 'D', text: 'Thông tin luôn có trước dữ liệu trong mọi quy trình xử lí', isCorrect: false }
    ],
    answer: 'A',
    points: 0.25
  }
];
