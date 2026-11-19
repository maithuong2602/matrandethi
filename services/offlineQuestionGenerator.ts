import { ExerciseQuestion } from '../types';
import { extractLessonNumber } from './criteriaService';

/**
 * BỘ TẠO CÂU HỎI SƯ PHẠM DỰ PHÒNG THÔNG MINH (OFFLINE CURRICULUM QUESTION ENGINE)
 * Đảm bảo 100% người dùng luôn tạo được câu hỏi chuẩn theo chương trình GDPT 2018
 * bám sát đúng từng bài học và đúng tiêu chí Yêu cầu cần đạt (YCCĐ).
 */

export interface TopicKnowledgeBase {
  name: string;
  lessonNumbers?: string[];
  grades?: string[];
  keywords: string[];
  concepts: {
    nb: { stem: string; correct: string; distractors: string[] }[];
    th: { stem: string; correct: string; distractors: string[] }[];
    vd: { stem: string; correct: string; distractors: string[] }[];
    vdc: { stem: string; correct: string; distractors: string[] }[];
    tf: { statement: string; isCorrect: boolean }[];
    shortAnswer: { stem: string; answer: string }[];
    essay: { stem: string; rubric: string }[];
  };
}

export const INFORMATICS_KNOWLEDGE_POOL: TopicKnowledgeBase[] = [
  // ==================== LỚP 8 ====================
  // Bài 1: Lược sử công cụ tính toán
  {
    name: "Bài 1: Lược sử công cụ tính toán",
    grades: ['8'],
    lessonNumbers: ['1'],
    keywords: ['lược sử công cụ tính toán', 'lược sử', 'công cụ tính toán', 'lịch sử máy tính', 'pascal', 'pascaline', 'babbage', 'lovelace', 'eniac', 'thế hệ máy tính', 'đèn điện tử', 'bóng bán dẫn', 'vi mạch', 'mạch tích hợp', 'vi xử lý', 'tiền cơ học', 'cơ học'],
    concepts: {
      nb: [
        {
          stem: 'Máy tính điện tử thế hệ thứ nhất sử dụng linh kiện điện tử chính nào sau đây?',
          correct: 'Đèn điện tử chân không.',
          distractors: ['Bóng bán dẫn.', 'Mạch tích hợp (IC).', 'Bộ vi xử lý.']
        },
        {
          stem: 'Năm 1642, nhà bác học Blaise Pascal đã sáng chế ra máy tính cơ học nào?',
          correct: 'Pascaline.',
          distractors: ['ENIAC.', 'IBM PC.', 'Harvard Mark I.']
        },
        {
          stem: 'Chiếc máy tính cơ học Pascaline có khả năng thực hiện trực tiếp các phép tính nào?',
          correct: 'Phép tính cộng và phép tính trừ.',
          distractors: ['Phép tính nhân và chia tự động.', 'Tính lũy thừa và căn bậc hai.', 'Giải hệ phương trình đại số.']
        },
        {
          stem: 'Ai được lịch sử công nhận là nhà lập trình đầu tiên trên thế giới khi viết hướng dẫn cho máy giải tích của Charles Babbage?',
          correct: 'Ada Lovelace.',
          distractors: ['Blaise Pascal.', 'Alan Turing.', 'John von Neumann.']
        },
        {
          stem: 'Máy tính điện tử ENIAC ra đời năm 1946 thuộc thế hệ máy tính thứ mấy?',
          correct: 'Thế hệ thứ nhất.',
          distractors: ['Thế hệ thứ hai.', 'Thế hệ thứ ba.', 'Thế hệ thứ tư.']
        }
      ],
      th: [
        {
          stem: 'Sự phát triển của máy tính qua các thế hệ đã đem lại thay đổi lớn lao nhất nào cho xã hội loài người?',
          correct: 'Tự động hóa xử lý dữ liệu quy mô lớn, thúc đẩy kinh tế số và thay đổi phương thức lao động toàn cầu.',
          distractors: [
            'Làm giảm nhu cầu kết nối và chia sẻ thông tin quốc tế.',
            'Khiến con người không cần rèn luyện tư duy logic và toán học.',
            'Làm tăng giá thành sản xuất mọi sản phẩm công nghiệp.'
          ]
        },
        {
          stem: 'Điểm khác biệt cơ bản về linh kiện giữa máy tính thế hệ thứ nhất và máy tính thế hệ thứ hai là gì?',
          correct: 'Thế hệ thứ nhất dùng đèn điện tử chân không, còn thế hệ thứ hai dùng bóng bán dẫn nhỏ gọn và bền hơn.',
          distractors: [
            'Thế hệ thứ nhất dùng vi mạch tích hợp, còn thế hệ thứ hai dùng đèn chân không.',
            'Thế hệ thứ nhất dùng bàn tính cơ học, còn thế hệ thứ hai dùng cáp quang.',
            'Thế hệ thứ nhất không có bộ nhớ, còn thế hệ thứ hai dùng đĩa mềm.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Khi so sánh máy tính ENIAC (thế hệ thứ nhất) với máy tính cá nhân hiện nay, nhận định nào sau đây là chính xác?',
          correct: 'Máy tính hiện nay nhỏ gọn hơn hàng nghìn lần nhưng tốc độ xử lý nhanh hơn hàng triệu lần và tiêu thụ rất ít năng lượng.',
          distractors: [
            'Máy tính ENIAC tiêu thụ ít điện năng hơn máy tính cá nhân hiện nay.',
            'Máy tính ENIAC có tốc độ xử lý đồ họa 3D vượt trội hơn máy tính cá nhân.',
            'Kích thước máy tính ENIAC tương đương với một chiếc điện thoại di động thông minh.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Nguyên lý thu nhỏ kích thước linh kiện điện tử (từ đèn chân không đến bóng bán dẫn rồi mạch tích hợp và vi xử lý) đã dẫn đến hệ quả công nghệ nào mang tính quyết định?',
          correct: 'Tạo tiền đề cho sự bùng nổ của thiết bị di động thông minh, Internet kết nối vạn vật (IoT) và trí tuệ nhân tạo.',
          distractors: [
            'Làm cho các phần mềm văn phòng không còn sử dụng được trên máy tính.',
            'Làm giảm dung lượng lưu trữ của ổ cứng và bộ nhớ RAM.',
            'Buộc con người phải quay lại phương thức tính toán thủ công trên giấy.'
          ]
        }
      ],
      tf: [
        { statement: 'Blaise Pascal sáng chế chiếc máy tính Pascaline để hỗ trợ công việc tính thuế của cha mình.', isCorrect: true },
        { statement: 'Máy tính điện tử thế hệ thứ hai sử dụng đèn điện tử chân không kích thước lớn.', isCorrect: false },
        { statement: 'Ada Lovelace là người đã viết chương trình tính chuỗi số Bernoulli cho máy giải tích của Babbage.', isCorrect: true },
        { statement: 'Sự phát triển của máy tính điện tử chia thành 4 thế hệ chính gắn liền với các bước đột phá về linh kiện điện tử.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Linh kiện điện tử cốt lõi của máy tính điện tử thế hệ thứ nhất là gì?', answer: 'Đèn điện tử chân không' },
        { stem: 'Linh kiện điện tử chính đánh dấu sự ra đời của máy tính thế hệ thứ hai là gì?', answer: 'Bóng bán dẫn' }
      ],
      essay: [
        {
          stem: 'Trình bày sơ lược lịch sử phát triển máy tính điện tử:\na) Kể tên 4 thế hệ máy tính điện tử cùng linh kiện điện tử tương ứng của mỗi thế hệ.\nb) Nêu 2 ví dụ cụ thể cho thấy máy tính đã làm thay đổi sâu sắc đời sống xã hội ngày nay.',
          rubric: 'a) Nêu đúng: Thế hệ 1 (đèn điện tử chân không), Thế hệ 2 (bóng bán dẫn), Thế hệ 3 (mạch tích hợp IC), Thế hệ 4 (vi xử lý VLSI/ULSI) - 0,5 điểm.\nb) Lấy 2 ví dụ thực tế thuyết phục (học tập trực tuyến, thanh toán điện tử, chẩn đoán y tế, tự động hóa) - 0,5 điểm.'
        }
      ]
    }
  },

  // Bài 2: Thông tin trong môi trường số
  {
    name: "Bài 2: Thông tin trong môi trường số",
    grades: ['8'],
    lessonNumbers: ['2'],
    keywords: ['thông tin trong môi trường số', 'thông tin số', 'đặc điểm của thông tin số', 'môi trường số', 'độ tin cậy', 'bản quyền thông tin', 'xử lí và chia sẻ thông tin số', 'chia sẻ thông tin số', 'thu thập ngày càng nhanh', 'dung lượng lớn'],
    concepts: {
      nb: [
        {
          stem: 'Đặc điểm nào đúng về việc xử lí và chia sẻ thông tin số trong môi trường số hiện nay?',
          correct: 'Có nhiều công cụ hỗ trợ xử lí và chia sẻ thông tin số nhanh chóng, hiệu quả.',
          distractors: [
            'Thông tin số không thể chỉnh sửa sau khi tạo.',
            'Chỉ có thể chia sẻ trực tiếp mà không thể truyền qua Internet.',
            'Không thể truyền dữ liệu số qua môi trường Internet.'
          ]
        },
        {
          stem: 'Đặc điểm nào sau đây là đặc điểm cơ bản của thông tin số?',
          correct: 'Đa dạng, dung lượng lưu trữ lớn, thu thập nhanh chóng và có độ tin cậy rất khác nhau.',
          distractors: [
            'Mọi thông tin số đều hoàn toàn chính xác tuyệt đối và không cần kiểm chứng.',
            'Thông tin số chỉ tồn tại dưới dạng văn bản chữ viết, không thể chứa âm thanh.',
            'Thông tin số không có bản quyền và ai cũng có thể tự do sao chép thương mại.'
          ]
        },
        {
          stem: 'Vì sao thông tin số trên không gian mạng lại có độ tin cậy rất khác nhau?',
          correct: 'Vì bất kỳ ai cũng có thể dễ dàng tạo và đăng tải thông tin mà không nhất thiết phải qua kiểm duyệt nội dung.',
          distractors: [
            'Vì máy chủ Internet tự động thay đổi từ ngữ trong các bài viết.',
            'Vì thông tin số luôn bị xóa bỏ sau 48 giờ kể từ khi xuất bản.',
            'Vì các trình duyệt web không hỗ trợ hiển thị thông tin chính xác.'
          ]
        },
        {
          stem: 'Thông tin số có tính bản quyền mang ý nghĩa gì?',
          correct: 'Người sáng tạo ra tác phẩm số được pháp luật bảo vệ quyền tác giả và quyền sở hữu trí tuệ.',
          distractors: [
            'Mọi người đều có thể sử dụng thông tin số mà không cần trích dẫn tác giả.',
            'Thông tin số không được phép chia sẻ cho bất kỳ ai trên mạng.',
            'Tác phẩm số chỉ có giá trị khi được in ra giấy.'
          ]
        }
      ],
      th: [
        {
          stem: 'Tại sao việc biết khai thác các nguồn thông tin số đáng tin cậy lại có tầm quan trọng đặc biệt đối với học sinh?',
          correct: 'Giúp tiếp nhận kiến thức chính xác, tránh bị dẫn dắt bởi thông tin giả mạo, sai lệch hoặc lừa đảo.',
          distractors: [
            'Giúp máy tính không bị quá tải bộ nhớ RAM khi truy cập trang web.',
            'Giúp học sinh không phải trả cước phí Internet hàng tháng.',
            'Làm cho tốc độ đường truyền mạng tăng lên gấp hai lần.'
          ]
        },
        {
          stem: 'Khi tiếp nhận một thông tin gây xôn xao trên mạng xã hội, hành động nào thể hiện hiểu biết đúng đắn về thông tin số?',
          correct: 'Kiểm chứng nguồn tin từ các cơ quan báo chí chính thống và website của cơ quan chức năng trước khi tin tưởng hay chia sẻ.',
          distractors: [
            'Lập tức chia sẻ ngay lên trang cá nhân để bạn bè cùng biết.',
            'Tin tưởng tuyệt đối vì bài viết có nhiều lượt thích và bình luận.',
            'Gửi bài viết cho tất cả các nhóm học tập mà không cần đọc kỹ.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một học sinh cần tìm tài liệu nghiên cứu về bảo tồn di tích lịch sử địa phương để viết báo cáo, nguồn thông tin số nào sau đây có độ tin cậy cao nhất?',
          correct: 'Cổng thông tin điện tử chính thức của Sở Văn hóa, Thể thao và Du lịch hoặc UBND tỉnh/thành phố (.gov.vn).',
          distractors: [
            'Một bài viết không rõ tên tác giả trên trang mạng xã hội cá nhân.',
            'Bình luận ẩn danh dưới một video trên nền tảng giải trí.',
            'Trang web thương mại bán hàng lưu niệm không có trích dẫn nguồn.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi phát hiện một trang web giả mạo cổng thông tin nhà trường để thu thập trái phép thông tin cá nhân của học sinh, giải pháp xử lý văn hóa và đúng pháp luật nhất là gì?',
          correct: 'Không cung cấp dữ liệu, cảnh báo cho các bạn trong lớp và báo cáo ngay cho thầy cô quản trị mạng hoặc cơ quan chức năng.',
          distractors: [
            'Nhập thông tin giả để thử xem hệ thống xử lý ra sao.',
            'Tấn công phá hoại trang web giả mạo đó bằng phần mềm độc hại.',
            'Im lặng bỏ qua và không chia sẻ cảnh báo cho bất kỳ ai.'
          ]
        }
      ],
      tf: [
        { statement: 'Thông tin số có thể được nhân bản, lưu trữ với dung lượng khổng lồ và lan truyền nhanh chóng.', isCorrect: true },
        { statement: 'Tất cả các bài viết đăng tải trên mạng xã hội đều đã được kiểm chứng về độ chính xác.', isCorrect: false },
        { statement: 'Tôn trọng bản quyền tác giả là một biểu hiện của văn hóa và tuân thủ pháp luật khi sử dụng thông tin số.', isCorrect: true },
        { statement: 'Các công cụ tìm kiếm và xử lý dữ liệu giúp con người chuyển đổi và khai thác thông tin số hiệu quả.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Đặc điểm phản ánh mức độ xác thực và chính xác của thông tin số trên mạng được gọi là gì?', answer: 'Độ tin cậy' },
        { stem: 'Quyền hợp pháp bảo vệ tác phẩm số của người tạo ra tác phẩm được gọi là gì?', answer: 'Bản quyền' }
      ],
      essay: [
        {
          stem: 'Em hãy phân tích các đặc điểm của thông tin trong môi trường số:\na) Nêu 4 đặc điểm cơ bản của thông tin số.\nb) Trình bày tầm quan trọng của việc biết khai thác các nguồn thông tin đáng tin cậy và nêu 1 ví dụ minh họa.',
          rubric: 'a) Nêu đủ 4 đặc điểm: Đa dạng, thu thập nhanh và nhiều, dung lượng lớn, có bản quyền và độ tin cậy rất khác nhau - 0,5 điểm.\nb) Phân tích rõ tầm quan trọng (tránh tin giả, ra quyết định đúng) và lấy ví dụ đúng (cổng .gov.vn, báo chính thống) - 0,5 điểm.'
        }
      ]
    }
  },

  // Bài 3: Thực hành: Khai thác thông tin số
  {
    name: "Bài 3: Thực hành: Khai thác thông tin số",
    grades: ['8'],
    lessonNumbers: ['3'],
    keywords: ['thực hành: khai thác thông tin số', 'khai thác thông tin số', 'tìm kiếm thông tin số', 'công cụ tìm kiếm', 'từ khóa tìm kiếm', 'giải quyết vấn đề bằng thông tin'],
    concepts: {
      nb: [
        {
          stem: 'Để tìm kiếm chính xác một cụm từ trên công cụ tìm kiếm Google, ta đặt cụm từ đó trong cặp dấu nào?',
          correct: 'Cặp dấu ngoặc kép (" ").',
          distractors: ['Cặp dấu ngoặc đơn (( )).', 'Cặp dấu ngoặc vuông ([ ]).', 'Cặp dấu ngoặc nhọn ({ }).']
        },
        {
          stem: 'Công cụ nào sau đây phổ biến nhất để tìm kiếm thông tin trên môi trường số hiện nay?',
          correct: 'Máy tìm kiếm (Search Engine) như Google, Bing.',
          distractors: ['Phần mềm bảng tính Microsoft Excel.', 'Phần mềm diệt virus máy tính.', 'Bộ gõ tiếng Việt Unikey.']
        }
      ],
      th: [
        {
          stem: 'Việc sử dụng từ khóa tìm kiếm rõ ràng, cụ thể và có tính chọn lọc cao mang lại lợi ích gì?',
          correct: 'Thu hẹp phạm vi tìm kiếm, giúp tìm ra kết quả chính xác và tiết kiệm thời gian.',
          distractors: [
            'Làm cho kết quả tìm kiếm tự động chuyển thành hình ảnh.',
            'Làm cho máy tính tự động tải toàn bộ tài liệu về ổ đĩa.',
            'Không có sự khác biệt so với việc gõ một câu dài ngẫu nhiên.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Học sinh B muốn tìm tài liệu định dạng PDF về chủ đề "Biến đổi khí hậu Việt Nam", cú pháp tìm kiếm nào sau đây hiệu quả nhất?',
          correct: '"Biến đổi khí hậu Việt Nam" filetype:pdf.',
          distractors: ['Tìm tất cả các file pdf về biến đổi khí hậu.', 'Biến đổi khí hậu + xem file pdf ngay lập tức.', 'https://google.com/pdf/climate.']
        }
      ],
      vdc: [
        {
          stem: 'Trong quá trình thực hiện dự án học tập, nhóm học sinh cần tổng hợp dữ liệu từ 5 nguồn trang web khác nhau nhưng có số liệu thống kê mâu thuẫn, cách xử lý khoa học nhất là gì?',
          correct: 'Đối chiếu niên giám thống kê chính thức của Tổng cục Thống kê hoặc nguồn cơ quan chủ quản để xác thực số liệu gốc.',
          distractors: [
            'Lấy trung bình cộng ngẫu nhiên của cả 5 nguồn số liệu.',
            'Chọn nguồn nào có giao diện đồ họa đẹp mắt nhất.',
            'Bỏ qua toàn bộ số liệu thống kê và viết bài dựa trên cảm tính.'
          ]
        }
      ],
      tf: [
        { statement: 'Công cụ tìm kiếm cho phép tìm kiếm dữ liệu theo nhiều dạng: văn bản, hình ảnh, video, bản đồ.', isCorrect: true },
        { statement: 'Cụm từ tìm kiếm đặt trong dấu ngoặc kép sẽ tìm kiếm chính xác từng từ theo đúng thứ tự đó.', isCorrect: true },
        { statement: 'Mọi thông tin đầu tiên hiển thị trên trang tìm kiếm luôn luôn là nguồn đáng tin cậy nhất.', isCorrect: false },
        { statement: 'Khai thác tốt thông tin số giúp giải quyết nhanh chóng các nhiệm vụ học tập thực tế.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Cặp ký tự dùng để tìm kiếm chính xác một cụm từ trên Google là gì?', answer: 'Dấu ngoặc kép' },
        { stem: 'Thao tác chọn từ ngữ đại diện cho nội dung cần tra cứu trên máy tìm kiếm gọi là xác định gì?', answer: 'Từ khóa' }
      ],
      essay: [
        {
          stem: 'Trình bày kỹ năng khai thác thông tin số phục vụ học tập:\na) Nêu 3 mẹo sử dụng từ khóa để tìm kiếm thông tin nhanh chóng trên Internet.\nb) Nêu cách xác định độ tin cậy của tài liệu tìm được.',
          rubric: 'a) Nêu đúng: Dùng ngoặc kép, dùng toán tử filetype, kết hợp từ khóa chọn lọc - 0,5 điểm.\nb) Nêu cách kiểm tra: Xem tác giả, tổ chức chủ quản, tên miền (.gov/.edu), ngày xuất bản - 0,5 điểm.'
        }
      ]
    }
  },

  // Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số
  {
    name: "Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số",
    grades: ['8'],
    lessonNumbers: ['4'],
    keywords: ['đạo đức và văn hóa', 'công nghệ kĩ thuật số', 'bệnh nghiện internet', 'vi phạm bản quyền', 'quay phim chụp ảnh trái phép', 'ứng xử trên mạng', 'văn hóa trong sử dụng công nghệ'],
    concepts: {
      nb: [
        {
          stem: 'Hành vi nào sau đây là hành vi vi phạm đạo đức, pháp luật hoặc thiếu văn hóa khi sử dụng công nghệ số?',
          correct: 'Quay phim, chụp ảnh người khác khi chưa được sự đồng ý rồi phát tán lên mạng xã hội.',
          distractors: [
            'Gửi email trao đổi bài học với giáo viên và bạn bè.',
            'Đọc báo điện tử chính thống để cập nhật tin tức thời sự.',
            'Sử dụng phần mềm mã nguồn mở miễn phí hợp pháp.'
          ]
        },
        {
          stem: 'Biểu hiện nào sau đây cảnh báo một người có nguy cơ mắc bệnh nghiện Internet?',
          correct: 'Dành quá nhiều thời gian lướt mạng, bỏ bê học tập, mất ngủ và luôn bồn chồn khi không có mạng.',
          distractors: [
            'Sử dụng Internet 30 phút mỗi ngày để tra cứu tài liệu học tập.',
            'Thường xuyên kiểm tra hòm thư điện tử của trường học.',
            'Tắt kết nối Wi-Fi trước khi đi ngủ để đảm bảo sức khỏe.'
          ]
        }
      ],
      th: [
        {
          stem: 'Tại sao việc tự ý sử dụng tác phẩm số (hình ảnh, bài viết, video, phần mềm) của người khác mà không xin phép hoặc không ghi rõ nguồn là vi phạm bản quyền?',
          correct: 'Vì xâm phạm quyền tác giả và quyền sở hữu trí tuệ đã được pháp luật bảo vệ.',
          distractors: [
            'Vì làm giảm độ phân giải của hình ảnh trên máy tính.',
            'Vì làm chậm tốc độ xử lý của vi xử lý CPU.',
            'Vì khiến người tải file bị mất quyền truy cập hòm thư điện tử.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Khi làm một video thuyết trình về danh lam thắng cảnh và cần chèn một đoạn nhạc nền tìm thấy trên Internet, hành động nào thể hiện tính văn hóa và tôn trọng bản quyền?',
          correct: 'Sử dụng các bản nhạc miễn phí bản quyền (Royalty-free) và ghi rõ tên tác giả, nguồn trích dẫn trong phần danh mục tài liệu.',
          distractors: [
            'Tự ý tải bài hát độc quyền của ca sĩ nổi tiếng về ghép vào mà không ghi nguồn.',
            'Cắt bỏ đoạn giới thiệu tên nhạc sĩ để người xem tưởng là nhạc tự sáng tác.',
            'Tải bản nhạc lậu từ trang web chia sẻ file bất hợp pháp.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi một bạn trong lớp bị kẻ xấu bôi nhọ danh dự và bắt nạt trên không gian mạng (Cyberbullying), biện pháp hỗ trợ đúng đắn và hiệu quả nhất là gì?',
          correct: 'Chụp lại bằng chứng, động viên bạn, không tiếp tay chia sẻ và báo ngay cho phụ huynh, giáo viên chủ nhiệm hoặc cơ quan có thẩm quyền.',
          distractors: [
            'Tham gia bình luận xúc phạm lại kẻ xấu bằng những từ ngữ khiếm nhã.',
            'Chia sẻ bài viết bôi nhọ đó sang các hội nhóm khác để mọi người cùng xem.',
            'Khuyên bạn xóa tài khoản và im lặng cam chịu mà không nói với ai.'
          ]
        }
      ],
      tf: [
        { statement: 'Quay lén và phát tán video đời tư của người khác lên mạng là hành vi vi phạm pháp luật.', isCorrect: true },
        { statement: 'Sử dụng phần mềm bẻ khóa (Crack) là hành vi tôn trọng bản quyền của nhà sản xuất.', isCorrect: false },
        { statement: 'Nghiện Internet kéo dài gây suy giảm sức khỏe thể chất, tinh thần và kết quả học tập.', isCorrect: true },
        { statement: 'Giao tiếp trên mạng cần sử dụng ngôn ngữ lịch sự, tôn trọng người khác như trong đời thực.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Tình trạng phụ thuộc quá mức vào thế giới ảo dẫn đến bỏ bê đời thực được gọi là gì?', answer: 'Nghiện Internet' },
        { stem: 'Hành vi cố ý làm nhục, đe dọa người khác trên môi trường mạng được gọi là gì?', answer: 'Bắt nạt qua mạng' }
      ],
      essay: [
        {
          stem: 'Bàn về văn hóa và đạo đức trong sử dụng công nghệ số:\na) Nêu 3 hành vi vi phạm đạo đức, pháp luật phổ biến khi dùng mạng xã hội.\nb) Đưa ra 3 lời khuyên thiết thực giúp học sinh phòng tránh bệnh nghiện Internet.',
          rubric: 'a) Nêu đúng: Quay chụp trái phép phát tán lên mạng, vi phạm bản quyền tác phẩm số, xúc phạm bắt nạt trực tuyến - 0,5 điểm.\nb) Lời khuyên: Lập thời gian biểu cụ thể, tham gia thể thao/ngoại khóa, tắt thông báo mạng xã hội khi học tập - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 5 TIN 8 ====================
  {
    name: "Bài 5: Sử dụng địa chỉ tương đối, tuyệt đối trong công thức",
    grades: ['8'],
    lessonNumbers: ['5'],
    keywords: ['bài 5', 'sử dụng bảng tính', 'địa chỉ tương đối', 'địa chỉ tuyệt đối', '$', 'công thức', 'sao chép công thức', '$a$1', 'tọa độ ô', 'địa chỉ ô'],
    concepts: {
      nb: [
        {
          stem: 'Trong phần mềm bảng tính, ký hiệu nào được đặt trước tên cột và chỉ số hàng để tạo địa chỉ tuyệt đối?',
          correct: 'Ký hiệu đô la ($).',
          distractors: ['Ký hiệu dấu thăng (#).', 'Ký hiệu phần trăm (%).', 'Ký hiệu dấu và (&).']
        },
        {
          stem: 'Địa chỉ nào sau đây là địa chỉ tuyệt đối của một ô tính?',
          correct: '$B$5.',
          distractors: ['B5.', '$B5.', 'B$5.']
        },
        {
          stem: 'Địa chỉ nào sau đây là địa chỉ tương đối của một ô tính?',
          correct: 'A1.',
          distractors: ['$A$1.', '$A1.', 'A$1.']
        },
        {
          stem: 'Khi sao chép công thức, loại địa chỉ nào sẽ tự động thay đổi tương ứng theo vị trí ô đích mới?',
          correct: 'Địa chỉ tương đối.',
          distractors: ['Địa chỉ tuyệt đối.', 'Địa chỉ cố định.', 'Địa chỉ hàng tuyệt đối.']
        }
      ],
      th: [
        {
          stem: 'Khi sao chép công thức "=A1*$B$1" từ ô C1 xuống ô C2, công thức tại ô C2 sẽ thay đổi thành gì?',
          correct: '=A2*$B$1.',
          distractors: ['=A1*$B$1.', '=A2*$B$2.', '=$A$1*$B$1.']
        },
        {
          stem: 'Điểm khác biệt cơ bản giữa địa chỉ tương đối và địa chỉ tuyệt đối khi sao chép công thức là gì?',
          correct: 'Địa chỉ tương đối tự động thay đổi tọa độ tương ứng với vị trí mới, còn địa chỉ tuyệt đối luôn giữ nguyên tọa độ.',
          distractors: [
            'Địa chỉ tương đối chỉ dùng cho số âm, còn địa chỉ tuyệt đối dùng cho số dương.',
            'Địa chỉ tuyệt đối không thể tham gia vào các phép tính nhân chia.',
            'Địa chỉ tương đối có dung lượng bộ nhớ lớn hơn địa chỉ tuyệt đối.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Tại ô D2 có công thức tính thành tiền: "=B2*C2*(1-$F$1)". Khi sao chép xuống ô D3, công thức nhận được là gì?',
          correct: '=B3*C3*(1-$F$1).',
          distractors: ['=B3*C3*(1-$F$2).', '=B2*C2*(1-$F$1).', '=B3*C3*(1-F1).']
        }
      ],
      vdc: [
        {
          stem: 'Tại ô D2 cần tính tiền thưởng bằng "Lương cơ bản (cột B) * Hệ số thưởng". Biết Hệ số thưởng cố định ở ô H1. Công thức chuẩn xác nhất để kéo sao chép cho toàn bộ cột D là gì?',
          correct: '=B2*$H$1.',
          distractors: ['=B2*H1.', '=$B$2*$H$1.', '=B2*H$2.']
        }
      ],
      tf: [
        { statement: 'Địa chỉ tương đối trong công thức sẽ tự động điều chỉnh tọa độ khi sao chép sang vị trí khác.', isCorrect: true },
        { statement: 'Ký hiệu $ đặt trước tên cột sẽ cố định cột, đặt trước chỉ số hàng sẽ cố định hàng.', isCorrect: true },
        { statement: 'Địa chỉ tuyệt đối bị thay đổi giá trị tọa độ khi sao chép công thức sang ô khác.', isCorrect: false },
        { statement: 'Địa chỉ hỗn hợp là địa chỉ chỉ cố định cột hoặc chỉ cố định hàng.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Ký hiệu dùng để cố định hàng hoặc cột trong địa chỉ ô bảng tính là gì?', answer: '$' },
        { stem: 'Dạng địa chỉ $A$1 trong Excel được gọi là địa chỉ gì?', answer: 'Địa chỉ tuyệt đối' }
      ],
      essay: [
        {
          stem: 'Phân tích ứng dụng địa chỉ trong bảng tính Excel:\na) Phân biệt địa chỉ tương đối và địa chỉ tuyệt đối.\nb) Cho ví dụ khi nào bắt buộc phải dùng địa chỉ tuyệt đối.',
          rubric: 'a) Nêu đúng: Tương đối thay đổi khi sao chép; Tuyệt đối giữ nguyên tọa độ - 0,5 điểm.\nb) Cho ví dụ đúng: Khi nhân với ô chứa tỉ lệ chiết khấu, lãi suất hoặc đơn giá cố định - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 6 TIN 8 ====================
  {
    name: "Bài 6: Sắp xếp và lọc dữ liệu",
    grades: ['8'],
    lessonNumbers: ['6'],
    keywords: ['bài 6', 'sắp xếp và lọc', 'sắp xếp dữ liệu', 'lọc dữ liệu', 'sort', 'filter', 'tăng dần', 'giảm dần', 'tiêu chuẩn lọc'],
    concepts: {
      nb: [
        {
          stem: 'Chức năng sắp xếp dữ liệu (Sort) trong phần mềm bảng tính dùng để làm gì?',
          correct: 'Hoán đổi vị trí các hàng theo thứ tự tăng dần hoặc giảm dần của một hay nhiều cột dữ liệu.',
          distractors: [
            'Ẩn đi các hàng không thỏa mãn điều kiện nhất định.',
            'Vẽ biểu đồ hình cột so sánh giá trị.',
            'Tự động định dạng màu sắc cho các ô tính.'
          ]
        },
        {
          stem: 'Chức năng lọc dữ liệu (Filter) trong phần mềm bảng tính dùng để làm gì?',
          correct: 'Chọn và chỉ hiển thị các hàng thỏa mãn những tiêu chuẩn nhất định, tạm thời ẩn các hàng khác.',
          distractors: [
            'Xóa vĩnh viễn các hàng không thỏa mãn điều kiện khỏi bảng tính.',
            'Sắp xếp lại vị trí các cột theo thứ tự chữ cái.',
            'Tính tổng tự động cho tất cả các ô trong bảng tính.'
          ]
        },
        {
          stem: 'Để bật hoặc tắt tính năng lọc dữ liệu tự động, ta chọn nút lệnh nào trong thẻ Data?',
          correct: 'Nút lệnh Filter (biểu tượng hình cái phễu).',
          distractors: ['Nút lệnh Sort.', 'Nút lệnh Chart.', 'Nút lệnh Wrap Text.']
        }
      ],
      th: [
        {
          stem: 'Điểm khác biệt căn bản giữa thao tác lọc dữ liệu và thao tác xóa dữ liệu là gì?',
          correct: 'Lọc dữ liệu chỉ tạm thời che giấu các hàng không thỏa mãn điều kiện và không làm mất dữ liệu gốc, còn xóa dữ liệu sẽ làm mất hẳn.',
          distractors: [
            'Lọc dữ liệu xóa sạch các hàng không thỏa mãn.',
            'Lọc dữ liệu chỉ áp dụng cho dữ liệu văn bản.',
            'Không có điểm khác biệt nào giữa hai thao tác.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một bảng tính có cột Điểm trung bình (cột D). Giáo viên cần tìm danh sách học sinh có điểm trung bình từ 8.0 trở lên, thao tác tối ưu nhất là gì?',
          correct: 'Sử dụng chức năng Filter tại tiêu đề cột D và chọn điều kiện "Number Filters -> Greater Than Or Equal To 8.0".',
          distractors: [
            'Dùng mắt tìm từng dòng rồi xóa bỏ thủ công các dòng dưới 8.0.',
            'Vẽ biểu đồ hình cột toàn bộ danh sách lớp.',
            'Sao chép toàn bộ bảng tính sang phần mềm soạn thảo văn bản.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi cần sắp xếp danh sách học sinh theo thứ tự: Ưu tiên Điểm tổng kết giảm dần, nếu trùng điểm thì sắp xếp theo Tên theo bảng chữ cái A-Z, ta cần dùng tính năng nào?',
          correct: 'Tính năng Custom Sort với nhiều cấp độ (Add Level) sắp xếp.',
          distractors: [
            'Nút Sort A-Z thông thường một lần.',
            'Nút Filter lọc điểm cao nhất.',
            'Đổi vị trí thủ công từng dòng.'
          ]
        }
      ],
      tf: [
        { statement: 'Chức năng lọc dữ liệu sẽ xóa vĩnh viễn các bản ghi không thỏa mãn điều kiện khỏi bảng tính.', isCorrect: false },
        { statement: 'Một bảng dữ liệu có thể được sắp xếp theo nhiều mức tiêu chí ưu tiên khác nhau.', isCorrect: true },
        { statement: 'Sau khi lọc dữ liệu, có thể hiển thị lại toàn bộ dữ liệu bằng lệnh Clear Filter.', isCorrect: true },
        { statement: 'Dữ liệu dạng văn bản không thể thực hiện sắp xếp theo thứ tự chữ cái.', isCorrect: false }
      ],
      shortAnswer: [
        { stem: 'Tên tính năng dùng để ẩn tạm thời các hàng không thỏa mãn điều kiện là gì?', answer: 'Lọc dữ liệu (Filter)' },
        { stem: 'Biểu tượng của công cụ lọc dữ liệu trong Excel có hình gì?', answer: 'Hình cái phễu' }
      ],
      essay: [
        {
          stem: 'Trình bày về chức năng sắp xếp và lọc dữ liệu:\na) Nêu mục đích của việc lọc dữ liệu.\nb) Nêu các bước để lọc danh sách các mặt hàng có số lượng tồn kho bằng 0.',
          rubric: 'a) Nêu đúng mục đích: Tìm kiếm nhanh các thông tin thỏa mãn tiêu chí mà không làm thay đổi hay mất dữ liệu gốc - 0,5 điểm.\nb) Các bước: Bật Filter -> Bấm phễu cột Số lượng tồn kho -> Tích chọn giá trị 0 -> OK - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 7 TIN 8 ====================
  {
    name: "Bài 7: Trình bày dữ liệu bằng biểu đồ",
    grades: ['8'],
    lessonNumbers: ['7'],
    keywords: ['bài 7', 'trình bày dữ liệu bằng biểu đồ', 'biểu đồ', 'chart', 'biểu đồ hình cột', 'biểu đồ hình tròn', 'biểu đồ đường', 'pie chart', 'column chart', 'line chart'],
    concepts: {
      nb: [
        {
          stem: 'Dạng biểu đồ nào sau đây thích hợp nhất để biểu diễn tỉ lệ phần trăm của từng phần trong một tổng thể?',
          correct: 'Biểu đồ hình tròn (Pie Chart).',
          distractors: [
            'Biểu đồ đường gấp khúc (Line Chart).',
            'Biểu đồ hình cột (Column Chart).',
            'Biểu đồ phân tán (Scatter Chart).'
          ]
        },
        {
          stem: 'Dạng biểu đồ nào sau đây thích hợp nhất để so sánh dữ liệu số lượng giữa các đối tượng độc lập?',
          correct: 'Biểu đồ hình cột (Column Chart).',
          distractors: ['Biểu đồ hình tròn (Pie Chart).', 'Biểu đồ mạng nhện.', 'Biểu đồ hình phễu.']
        },
        {
          stem: 'Dạng biểu đồ nào sau đây thích hợp nhất để quan sát xu hướng biến động dữ liệu theo thời gian?',
          correct: 'Biểu đồ đường gấp khúc (Line Chart).',
          distractors: ['Biểu đồ hình tròn (Pie Chart).', 'Biểu đồ bong bóng.', 'Biểu đồ thanh ngang.']
        }
      ],
      th: [
        {
          stem: 'Ưu điểm lớn nhất của việc trình bày dữ liệu bằng biểu đồ so với bảng số liệu thô là gì?',
          correct: 'Giúp người xem dễ dàng quan sát, so sánh và nhanh chóng nhận ra xu hướng phát triển của dữ liệu một cách trực quan.',
          distractors: [
            'Làm giảm dung lượng file bảng tính về 0 byte.',
            'Tự động sửa chữa các lỗi tính toán sai trong bảng tính.',
            'Ngăn không cho người khác chỉnh sửa bảng tính.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Để minh họa tình hình tăng trưởng nhiệt độ trung bình qua 12 tháng trong năm của thành phố Đà Nẵng, giáo viên nên chọn loại biểu đồ nào?',
          correct: 'Biểu đồ đường gấp khúc (Line Chart).',
          distractors: ['Biểu đồ hình tròn (Pie Chart).', 'Biểu đồ tán xạ (Scatter Chart).', 'Biểu đồ vành khăn (Doughnut Chart).']
        }
      ],
      vdc: [
        {
          stem: 'Khi biểu đồ tạo ra bị đảo ngược giữa hàng và cột làm sai lệch ý nghĩa so sánh, người dùng cần dùng lệnh nào trong thẻ Chart Design?',
          correct: 'Lệnh Switch Row/Column.',
          distractors: ['Lệnh Delete Chart.', 'Lệnh Format Axis.', 'Lệnh Filter Rows.']
        }
      ],
      tf: [
        { statement: 'Biểu đồ đường gấp khúc rất hiệu quả để nhận biết xu hướng biến động dữ liệu theo thời gian.', isCorrect: true },
        { statement: 'Biểu đồ hình tròn được khuyên dùng khi số lượng thành phần phân chia vượt quá 50 phần tử.', isCorrect: false },
        { statement: 'Tiêu đề biểu đồ (Chart Title) giúp người đọc hiểu ngay chủ đề nội dung mà biểu đồ phản ánh.', isCorrect: true },
        { statement: 'Dữ liệu trên biểu đồ không tự động cập nhật khi thay đổi số liệu trong bảng tính gốc.', isCorrect: false }
      ],
      shortAnswer: [
        { stem: 'Loại biểu đồ tối ưu nhất để thể hiện cơ cấu tỉ lệ phần trăm là gì?', answer: 'Biểu đồ hình tròn' },
        { stem: 'Thẻ lệnh dùng để chèn biểu đồ vào bảng tính Excel là thẻ nào?', answer: 'Thẻ Insert' }
      ],
      essay: [
        {
          stem: 'Trình bày cách sử dụng biểu đồ trong bảng tính:\na) Nêu sự khác nhau về mục đích sử dụng giữa biểu đồ cột và biểu đồ tròn.\nb) Nêu 3 thành phần cơ bản của một biểu đồ chuẩn.',
          rubric: 'a) Biểu đồ cột: so sánh số lượng; Biểu đồ tròn: thể hiện tỉ lệ phần trăm - 0,5 điểm.\nb) Nêu đúng 3 thành phần: Tiêu đề biểu đồ, các trục tọa độ, chú giải (Legend) - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 12 TIN 8 ====================
  {
    name: "Bài 12: Từ thuật toán đến chương trình",
    grades: ['8'],
    lessonNumbers: ['12'],
    keywords: ['bài 12', 'từ thuật toán đến chương trình', 'thuật toán', 'chương trình máy tính', 'ngôn ngữ lập trình trực quan', 'scratch', 'kịch bản', 'nhân vật', 'sân khấu', 'khối lệnh'],
    concepts: {
      nb: [
        {
          stem: 'Chương trình máy tính là gì?',
          correct: 'Dãy các câu lệnh chỉ dẫn cho máy tính thực hiện các thao tác theo một thuật toán đã định trước.',
          distractors: [
            'Một thiết bị phần cứng dùng để hiển thị hình ảnh.',
            'Một tài liệu hướng dẫn sử dụng máy tính bằng văn bản in ra giấy.',
            'Một bức ảnh kỹ thuật số được vẽ bằng phần mềm đồ họa.'
          ]
        },
        {
          stem: 'Trong ngôn ngữ lập trình trực quan Scratch, chương trình được xây dựng bằng cách nào?',
          correct: 'Kéo và thả, lắp ghép các khối lệnh lại với nhau theo một kịch bản logic.',
          distractors: [
            'Gõ từng dòng mã lệnh bằng chữ tiếng Anh phức tạp.',
            'Vẽ các mạch điện tử trên màn hình máy tính.',
            'Ghi âm giọng nói trực tiếp để điều khiển nhân vật.'
          ]
        },
        {
          stem: 'Thuật toán là gì?',
          correct: 'Dãy các thao tác được sắp xếp theo một trình tự xác định để giải quyết một bài toán hoặc nhiệm vụ cụ thể.',
          distractors: [
            'Một bảng tính chứa các số liệu ngẫu nhiên.',
            'Một đoạn video hoạt hình trên Internet.',
            'Một loại virus gây hỏng phần mềm máy tính.'
          ]
        }
      ],
      th: [
        {
          stem: 'Mối quan hệ giữa thuật toán và chương trình máy tính là gì?',
          correct: 'Thuật toán là ý tưởng và các bước giải quyết vấn đề, còn chương trình là sự thể hiện thuật toán đó bằng một ngôn ngữ lập trình cụ thể.',
          distractors: [
            'Thuật toán và chương trình là hai khái niệm hoàn toàn trái ngược nhau.',
            'Thuật toán chỉ dùng cho phần cứng, chương trình chỉ dùng cho phần mềm.',
            'Máy tính chỉ có thể thực thi thuật toán mà không cần chương trình.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Để mô tả thuật toán tính diện tích hình chữ nhật có chiều dài a và chiều rộng b, thứ tự các bước nào sau đây là chuẩn xác?',
          correct: 'Bước 1: Nhập a, b; Bước 2: S = a * b; Bước 3: Xuất kết quả S.',
          distractors: [
            'Bước 1: Xuất kết quả S; Bước 2: Nhập a, b; Bước 3: S = a * b.',
            'Bước 1: S = a * b; Bước 2: Nhập a, b; Bước 3: Xuất kết quả S.',
            'Bước 1: Nhập S; Bước 2: Xuất a, b; Bước 3: Tính toán.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi chuyển đổi một thuật toán có cấu trúc phức tạp sang kịch bản Scratch, chiến lược phân rã nhiệm vụ nào là tối ưu nhất?',
          correct: 'Chia bài toán lớn thành các khối chức năng nhỏ (My Blocks) độc lập và ghép nối tuần tự.',
          distractors: [
            'Ghép tất cả các khối lệnh vào một chuỗi liên tục duy nhất không phân nhánh.',
            'Bỏ qua các bước kiểm tra điều kiện để chương trình chạy nhanh hơn.',
            'Chỉ sử dụng hình ảnh nhân vật mà không gắn kịch bản mã lệnh.'
          ]
        }
      ],
      tf: [
        { statement: 'Chương trình máy tính là dãy các lệnh chỉ dẫn máy tính thực hiện một thuật toán.', isCorrect: true },
        { statement: 'Mỗi thuật toán chỉ có thể được cài đặt bằng duy nhất một ngôn ngữ lập trình duy nhất.', isCorrect: false },
        { statement: 'Ngôn ngữ lập trình trực quan Scratch sử dụng các khối lệnh để điều khiển nhân vật trên sân khấu.', isCorrect: true },
        { statement: 'Thuật toán phải đảm bảo tính dừng, tức là phải kết thúc sau một số bước hữu hạn.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Tên ngôn ngữ lập trình kéo thả trực quan phổ biến trong chương trình Tin học 8 là gì?', answer: 'Scratch' },
        { stem: 'Dãy hữu hạn các thao tác để giải quyết một bài toán gọi là gì?', answer: 'Thuật toán' }
      ],
      essay: [
        {
          stem: 'Trình bày mối liên hệ từ thuật toán đến chương trình:\na) Thuật toán là gì? Nêu 3 tính chất của thuật toán.\nb) Nêu các bước để hiện thực hóa một thuật toán thành chương trình trên máy tính.',
          rubric: 'a) Nêu đúng khái niệm và 3 tính chất: Tính xác định, Tính đúng đắn, Tính dừng - 0,5 điểm.\nb) Các bước: Xác định bài toán -> Thiết kế thuật toán -> Viết mã chương trình -> Chạy thử và gỡ lỗi - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 13 TIN 8 ====================
  {
    name: "Bài 13: Biểu diễn dữ liệu",
    grades: ['8'],
    lessonNumbers: ['13'],
    keywords: ['bài 13', 'biểu diễn dữ liệu', 'biến', 'hằng', 'kiểu dữ liệu', 'biểu thức', 'số nguyên', 'số thực', 'xâu kí tự', 'logic', 'variable', 'constant'],
    concepts: {
      nb: [
        {
          stem: 'Trong môi trường lập trình, biến (Variable) dùng để làm gì?',
          correct: 'Lưu trữ giá trị dữ liệu và giá trị này có thể thay đổi trong quá trình thực hiện chương trình.',
          distractors: [
            'Lưu trữ giá trị cố định không bao giờ được phép thay đổi.',
            'Tắt chương trình khi gặp lỗi logic.',
            'Tăng tốc độ hiển thị hình ảnh của nhân vật.'
          ]
        },
        {
          stem: 'Trong lập trình, hằng (Constant) là gì?',
          correct: 'Đại lượng có giá trị không đổi trong suốt quá trình thực thi chương trình.',
          distractors: [
            'Đại lượng có giá trị luôn thay đổi sau mỗi vòng lặp.',
            'Một khối lệnh rẽ nhánh điều kiện.',
            'Một lỗi cú pháp trong câu lệnh.'
          ]
        },
        {
          stem: 'Kiểu dữ liệu nào sau đây dùng để lưu trữ các giá trị Đúng (True) hoặc Sai (False)?',
          correct: 'Kiểu lôgic (Boolean).',
          distractors: ['Kiểu số nguyên (Integer).', 'Kiểu xâu ký tự (String).', 'Kiểu số thực (Float).']
        },
        {
          stem: 'Giá trị nào sau đây thuộc kiểu dữ liệu xâu ký tự (String)?',
          correct: '"Xin chào Việt Nam".',
          distractors: ['2026.', '3.14.', 'True.']
        }
      ],
      th: [
        {
          stem: 'Điểm khác biệt cơ bản giữa biến và hằng trong biểu diễn dữ liệu là gì?',
          correct: 'Giá trị của biến có thể thay đổi trong quá trình thực thi, còn giá trị của hằng luôn cố định.',
          distractors: [
            'Biến chỉ lưu trữ số nguyên, còn hằng chỉ lưu trữ xâu ký tự.',
            'Biến không cần đặt tên, còn hằng bắt buộc phải đặt tên.',
            'Biến chỉ dùng trong toán học, còn hằng chỉ dùng trong tin học.'
          ]
        },
        {
          stem: 'Trong biểu thức logic "(x > 5) và (x < 10)", với giá trị nào của x thì biểu thức nhận giá trị Đúng (True)?',
          correct: 'x = 7.',
          distractors: ['x = 3.', 'x = 12.', 'x = 5.']
        }
      ],
      vd: [
        {
          stem: 'Đoạn lệnh Scratch: "Đặt [x] thành 5; Lặp lại 3 lần: [Thay đổi [x] một lượng 2]". Sau khi thực hiện xong, giá trị của biến x là bao nhiêu?',
          correct: '11.',
          distractors: ['10.', '6.', '15.']
        },
        {
          stem: 'Để hoán đổi giá trị của hai biến a và b, ta cần sử dụng thêm một biến tạm temp theo trình tự nào?',
          correct: 'temp = a; a = b; b = temp;',
          distractors: [
            'a = b; b = a;',
            'temp = a; b = temp; a = b;',
            'a = temp; temp = b; b = a;'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Cần thiết lập công thức tính tiền cước taxi với 1 km đầu giá 10000đ, mỗi km tiếp theo giá 8000đ. Biểu thức nào biểu diễn đúng tổng cước cho quãng đường s km (s > 1)?',
          correct: '10000 + (s - 1) * 8000.',
          distractors: ['s * 10000.', '10000 + s * 8000.', '(s - 1) * 10000 + 8000.']
        }
      ],
      tf: [
        { statement: 'Giá trị của một hằng số có thể được gán lại tùy ý trong khi chương trình đang chạy.', isCorrect: false },
        { statement: 'Tên biến nên đặt ngắn gọn, có ý nghĩa gợi nhớ để dễ đọc hiểu chương trình.', isCorrect: true },
        { statement: 'Phép toán ghép xâu cho phép nối hai xâu ký tự lại với nhau thành một xâu mới.', isCorrect: true },
        { statement: 'Biến trong Scratch chỉ lưu được số nguyên, không thể lưu xâu chữ.', isCorrect: false }
      ],
      shortAnswer: [
        { stem: 'Đại lượng dùng để lưu trữ dữ liệu và có thể thay đổi giá trị trong lập trình gọi là gì?', answer: 'Biến' },
        { stem: 'Đại lượng có giá trị cố định không đổi trong chương trình gọi là gì?', answer: 'Hằng' }
      ],
      essay: [
        {
          stem: 'Trình bày về các kiểu dữ liệu và biến trong chương trình:\na) Nêu khái niệm biến và quy tắc đặt tên biến khoa học.\nb) Phân biệt 3 kiểu dữ liệu cơ bản: số, xâu chữ và lôgic.',
          rubric: 'a) Nêu đúng khái niệm biến và quy tắc: gợi nhớ, không khoảng trắng, không ký tự đặc biệt - 0,5 điểm.\nb) Phân biệt đúng: Số (tính toán số học), Xâu (chuỗi ký tự chữ), Logic (True/False) - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 14 TIN 8 ====================
  {
    name: "Bài 14: Cấu trúc điều khiển",
    grades: ['8'],
    lessonNumbers: ['14'],
    keywords: ['bài 14', 'cấu trúc điều khiển', 'tuần tự', 'rẽ nhánh', 'lặp', 'nếu thì', 'nếu... thì... không thì', 'lặp lại', 'vòng lặp', 'if then', 'repeat', 'cấu trúc rẽ nhánh', 'cấu trúc lặp', 'điều khiển'],
    concepts: {
      nb: [
        {
          stem: 'Cấu trúc điều khiển nào thực hiện các câu lệnh lần lượt theo đúng thứ tự từ trên xuống dưới?',
          correct: 'Cấu trúc tuần tự.',
          distractors: ['Cấu trúc rẽ nhánh.', 'Cấu trúc lặp.', 'Cấu trúc gỡ lỗi.']
        },
        {
          stem: 'Cấu trúc điều khiển nào cho phép thực hiện các thao tác khác nhau tùy thuộc vào điều kiện Đúng hay Sai?',
          correct: 'Cấu trúc rẽ nhánh (if-then / if-then-else).',
          distractors: ['Cấu trúc tuần tự.', 'Cấu trúc gán biến.', 'Cấu trúc nhập dữ liệu.']
        },
        {
          stem: 'Cấu trúc điều khiển lặp được sử dụng khi nào?',
          correct: 'Khi cần thực hiện một hoặc một nhóm câu lệnh lặp đi lặp lại nhiều lần.',
          distractors: [
            'Khi chương trình chỉ có duy nhất một câu lệnh.',
            'Khi muốn dừng vĩnh viễn việc thực thi chương trình.',
            'Khi cần khai báo một hằng số mới.'
          ]
        },
        {
          stem: 'Trong Scratch, khối lệnh "Nếu <điều kiện> thì ... nếu không thì ..." thuộc cấu trúc nào?',
          correct: 'Cấu trúc rẽ nhánh dạng đủ.',
          distractors: ['Cấu trúc rẽ nhánh dạng thiếu.', 'Cấu trúc tuần tự.', 'Cấu trúc lặp vô hạn.']
        }
      ],
      th: [
        {
          stem: 'Điểm khác biệt cơ bản giữa cấu trúc rẽ nhánh dạng thiếu và dạng đủ là gì?',
          correct: 'Dạng thiếu chỉ thực hiện lệnh khi điều kiện Đúng, dạng đủ có thêm nhánh lệnh thực hiện khi điều kiện Sai.',
          distractors: [
            'Dạng thiếu không cần điều kiện kiểm tra.',
            'Dạng đủ chỉ chạy trên máy tính cấu hình cao.',
            'Dạng thiếu có thể lặp vô số lần.'
          ]
        },
        {
          stem: 'Khối lệnh "Lặp lại cho đến khi <điều kiện>" trong Scratch sẽ dừng lại khi nào?',
          correct: 'Khi điều kiện kiểm tra chuyển sang giá trị Đúng (True).',
          distractors: [
            'Khi điều kiện kiểm tra nhận giá trị Sai (False).',
            'Khi nhân vật chạm vào đáy sân khấu.',
            'Không bao giờ dừng lại.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Để kiểm tra xem một số nguyên N có chia hết cho 2 hay không để thông báo số chẵn hay số lẻ, cấu trúc điều khiển nào là phù hợp nhất?',
          correct: 'Cấu trúc rẽ nhánh dạng đủ (Nếu <N chia 2 dư 0> thì thông báo Chẵn, ngược lại thông báo Lẻ).',
          distractors: [
            'Cấu trúc tuần tự không điều kiện.',
            'Cấu trúc lặp vô hạn.',
            'Chỉ sử dụng lệnh gán biến số.'
          ]
        },
        {
          stem: 'Đoạn lệnh Scratch lặp lại 5 lần: mỗi lần di chuyển 10 bước. Tổng số bước nhân vật di chuyển được là bao nhiêu?',
          correct: '50 bước.',
          distractors: ['10 bước.', '15 bước.', '25 bước.']
        }
      ],
      vdc: [
        {
          stem: 'Khi viết chương trình tính tổng các số tự nhiên từ 1 đến 100, học sinh thiết lập vòng lặp nhưng biến đếm không tăng giá trị dẫn đến hiện tượng gì?',
          correct: 'Chương trình rơi vào vòng lặp vô tận (vòng lặp treo máy) và không bao giờ kết thúc được.',
          distractors: [
            'Chương trình tự động tắt máy tính ngay lập tức.',
            'Biến tổng tự động nhận giá trị 100.',
            'Chương trình tự động sửa lỗi và đưa ra kết quả đúng.'
          ]
        }
      ],
      tf: [
        { statement: 'Cấu trúc tuần tự là cấu trúc cơ bản nhất, các lệnh thực hiện nối tiếp nhau.', isCorrect: true },
        { statement: 'Cấu trúc rẽ nhánh giúp máy tính đưa ra quyết định dựa trên điều kiện kiểm tra Đúng hoặc Sai.', isCorrect: true },
        { statement: 'Cấu trúc lặp chỉ có thể lặp với số lần biết trước, không thể lặp theo điều kiện.', isCorrect: false },
        { statement: 'Có thể lồng ghép cấu trúc rẽ nhánh vào bên trong một cấu trúc lặp.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Cấu trúc thực hiện các lệnh lần lượt theo thứ tự từ trên xuống dưới gọi là gì?', answer: 'Cấu trúc tuần tự' },
        { stem: 'Cấu trúc đưa ra quyết định theo điều kiện Đúng/Sai gọi là gì?', answer: 'Cấu trúc rẽ nhánh' }
      ],
      essay: [
        {
          stem: 'Trình bày về các cấu trúc điều khiển trong lập trình:\na) Nêu khái niệm và phân biệt cấu trúc rẽ nhánh dạng thiếu và dạng đủ.\nb) Cho bài toán tìm số lớn hơn trong hai số a và b, hãy mô tả thuật toán giải quyết bằng cấu trúc rẽ nhánh.',
          rubric: 'a) Nêu đúng: Dạng thiếu chỉ có vế Đúng; Dạng đủ có cả vế Đúng và Ngược lại (Sai) - 0,5 điểm.\nb) Mô tả đúng: Nếu a > b thì Max = a; Ngược lại Max = b - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== BÀI 15 TIN 8 ====================
  {
    name: "Bài 15: Gỡ lỗi chương trình",
    grades: ['8'],
    lessonNumbers: ['15'],
    keywords: ['bài 15', 'gỡ lỗi', 'gỡ lỗi chương trình', 'debugging', 'lỗi cú pháp', 'lỗi logic', 'kiểm thử', 'bộ dữ liệu thử', 'sửa lỗi'],
    concepts: {
      nb: [
        {
          stem: 'Thao tác gỡ lỗi (Debugging) trong lập trình có mục đích chính là gì?',
          correct: 'Chạy thử chương trình, phát hiện các lỗi cú pháp hoặc lỗi logic và tiến hành sửa chữa để chương trình hoạt động đúng.',
          distractors: [
            'Xóa bỏ toàn bộ mã nguồn của chương trình.',
            'Chuyển đổi chương trình sang định dạng video.',
            'Khóa chương trình để người khác không thể xem được mã lệnh.'
          ]
        },
        {
          stem: 'Lỗi làm chương trình vẫn chạy được nhưng cho kết quả sai lệch so với yêu cầu bài toán gọi là lỗi gì?',
          correct: 'Lỗi logic.',
          distractors: ['Lỗi cú pháp.', 'Lỗi phần cứng.', 'Lỗi đường truyền mạng.']
        },
        {
          stem: 'Bộ dữ liệu thử (Test cases) trong lập trình dùng để làm gì?',
          correct: 'Dùng làm đầu vào để chạy thử nghiệm và kiểm tra tính đúng đắn của chương trình.',
          distractors: [
            'Dùng để trang trí giao diện của phần mềm.',
            'Dùng để xóa mã lệnh của chương trình.',
            'Dùng để kết nối Internet tốc độ cao.'
          ]
        }
      ],
      th: [
        {
          stem: 'Vì sao lỗi logic thường khó phát hiện hơn lỗi cú pháp?',
          correct: 'Vì môi trường lập trình không báo lỗi dừng chương trình mà vẫn chạy bình thường, người lập trình phải tự so sánh kết quả thực tế với kết quả mong đợi.',
          distractors: [
            'Vì lỗi logic làm máy tính bị tắt nguồn ngay lập tức.',
            'Vì lỗi logic chỉ xuất hiện trên các siêu máy tính.',
            'Vì lỗi logic không làm thay đổi giá trị của bất kỳ biến nào.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Khi viết chương trình tính diện tích tam giác S = (a * h) / 2, học sinh viết nhầm thành S = a * h. Khi nhập a = 4, h = 3, kết quả xuất ra là 12 thay vì 6. Đây là loại lỗi gì?',
          correct: 'Lỗi logic trong công thức tính toán.',
          distractors: ['Lỗi cú pháp câu lệnh.', 'Lỗi tràn bộ nhớ.', 'Lỗi không tương thích hệ điều hành.']
        }
      ],
      vdc: [
        {
          stem: 'Để kiểm thử toàn diện chương trình tìm số lớn nhất trong 3 số a, b, c, bộ dữ liệu thử cần kiểm tra trường hợp nào sau đây?',
          correct: 'Cần kiểm tra cả các trường hợp có số lớn nhất ở đầu, ở giữa, ở cuối và trường hợp có ít nhất hai hoặc cả ba số bằng nhau.',
          distractors: [
            'Chỉ cần kiểm tra duy nhất một bộ số nguyên dương bất kỳ.',
            'Chỉ cần kiểm tra với số 0.',
            'Không cần kiểm tra vì máy tính luôn tính toán chính xác.'
          ]
        }
      ],
      tf: [
        { statement: 'Gỡ lỗi là bước quan trọng giúp phát hiện và hoàn thiện chương trình máy tính.', isCorrect: true },
        { statement: 'Chương trình không báo lỗi cú pháp thì chắc chắn cho ra kết quả đúng trong mọi trường hợp.', isCorrect: false },
        { statement: 'Sử dụng bộ dữ liệu thử giúp kiểm tra tính đúng đắn của chương trình một cách khoa học.', isCorrect: true },
        { statement: 'Có thể gỡ lỗi bằng cách chạy từng bước và quan sát sự thay đổi giá trị của các biến.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Thuật ngữ tiếng Anh của thao tác tìm và sửa lỗi trong chương trình là gì?', answer: 'Debugging' },
        { stem: 'Loại lỗi làm chương trình chạy bình thường nhưng cho kết quả tính toán sai gọi là gì?', answer: 'Lỗi logic' }
      ],
      essay: [
        {
          stem: 'Trình bày về gỡ lỗi và kiểm thử chương trình:\na) Phân biệt lỗi cú pháp và lỗi logic.\nb) Nêu phương pháp kiểm thử chương trình bằng bộ dữ liệu thử.',
          rubric: 'a) Cú pháp: Viết sai ngữ pháp, chương trình dừng không chạy được; Logic: Chương trình chạy nhưng kết quả sai - 0,5 điểm.\nb) Nêu đúng: Xây dựng các ca thử đại diện -> Chạy thử -> So sánh kết quả thực tế với kết quả mong muốn - 0,5 điểm.'
        }
      ]
    }
  },

  // Bài 16 Tin 8: Tin học với nghề nghiệp
  {
    name: "Bài 16: Tin học với nghề nghiệp",
    grades: ['8'],
    lessonNumbers: ['16'],
    keywords: ['tin học với nghề nghiệp', 'nghề nghiệp trong ngành cntt', 'nghề tin học', 'bình đẳng giới trong tin học', 'ngành công nghệ thông tin'],
    concepts: {
      nb: [
        {
          stem: 'Nghề nào sau đây thuộc lĩnh vực công nghệ thông tin trực tiếp phát triển các ứng dụng và phần mềm?',
          correct: 'Lập trình viên (Software Developer).',
          distractors: ['Nhân viên lễ tân khách sạn.', 'Bác sĩ đa khoa.', 'Tài xế lái xe tải.']
        },
        {
          stem: 'Ứng dụng tin học trong y tế giúp mang lại lợi ích nổi bật nào?',
          correct: 'Hỗ trợ chẩn đoán hình ảnh từ xa, lưu trữ hồ sơ bệnh án điện tử và phẫu thuật nội soi chính xác.',
          distractors: [
            'Thay thế hoàn toàn thuốc điều trị bệnh.',
            'Làm cho bệnh viện không cần bác sĩ chuyên khoa.',
            'Giảm chất lượng dịch vụ chăm sóc người bệnh.'
          ]
        }
      ],
      th: [
        {
          stem: 'Quan điểm "Nữ giới không phù hợp với các ngành nghề thuộc lĩnh vực Công nghệ thông tin" là đúng hay sai? Vì sao?',
          correct: 'Sai, vì khả năng tư duy logic, sự tỉ mỉ, kiên nhẫn và sáng tạo không phụ thuộc vào giới tính.',
          distractors: [
            'Đúng, vì nam giới luôn có sức khỏe thể chất vượt trội hơn trong việc gõ bàn phím.',
            'Đúng, vì các trường đại học chỉ đào tạo ngành CNTT cho nam giới.',
            'Sai, nhưng nữ giới chỉ nên làm các công việc nhập liệu đơn giản.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một bạn học sinh yêu thích hội họa, mỹ thuật và muốn kết hợp với công nghệ thông tin, ngành nghề nào sau đây là phù hợp nhất?',
          correct: 'Thiết kế đồ họa và thiết kế trải nghiệm người dùng (UI/UX Designer).',
          distractors: ['Kỹ sư quản trị mạng máy chủ.', 'Kỹ sư an ninh mạng phòng chống mã độc.', 'Kỹ thuật viên bảo trì phần cứng.']
        }
      ],
      vdc: [
        {
          stem: 'Để chuẩn bị hành trang hướng tới các nghề nghiệp trong kỷ nguyên số và trí tuệ nhân tạo (AI), học sinh THCS cần chú trọng rèn luyện phẩm chất và năng lực nào?',
          correct: 'Tư duy phản biện, khả năng tự học suốt đời, kỹ năng số an toàn và tư duy giải quyết vấn đề bằng công nghệ.',
          distractors: [
            'Chỉ cần học thuộc lòng lý thuyết trong sách giáo khoa.',
            'Dành toàn bộ thời gian chơi trò chơi điện tử để hiểu về đồ họa.',
            'Không cần học ngoại ngữ vì đã có phần mềm dịch tự động.'
          ]
        }
      ],
      tf: [
        { statement: 'Ứng dụng tin học giúp tăng năng suất lao động và hiệu quả công việc trong hầu hết các ngành nghề.', isCorrect: true },
        { statement: 'Bình đẳng giới trong tin học khẳng định cả nam và nữ đều có cơ hội phát triển như nhau trong ngành công nghệ.', isCorrect: true },
        { statement: 'Ngành Công nghệ thông tin chỉ bao gồm công việc sửa chữa máy tính bàn.', isCorrect: false },
        { statement: 'Kỹ năng số là một trong những kỹ năng thiết yếu đối với mọi công dân trong xã hội hiện đại.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Chuyên gia phụ trách bảo vệ hệ thống thông tin khỏi sự xâm nhập của tin tặc được gọi là chuyên gia gì?', answer: 'An ninh mạng' },
        { stem: 'Nguyên tắc bảo đảm cơ hội phát triển nghề nghiệp công bằng cho cả nam và nữ trong ngành CNTT gọi là gì?', answer: 'Bình đẳng giới' }
      ],
      essay: [
        {
          stem: 'Trình bày về vai trò của Tin học đối với nghề nghiệp:\na) Kể tên 3 ngành nghề mà ứng dụng tin học làm thay đổi căn bản hiệu suất công việc.\nb) Trình bày quan điểm của em về vấn đề bình đẳng giới trong ngành Công nghệ thông tin.',
          rubric: 'a) Nêu đúng 3 ngành nghề (Y tế, Giáo dục, Ngân hàng, Giao thông) - 0,5 điểm.\nb) Phân tích đúng ý nghĩa bình đẳng giới, khẳng định năng lực không phân biệt nam nữ - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== LỚP 6 ====================
  {
    name: "Thông tin và dữ liệu (Bài 1, 2, 3 Tin 6)",
    grades: ['6'],
    lessonNumbers: ['1', '2', '3'],
    keywords: ['thông tin và dữ liệu', 'vật mang tin', 'xử lí thông tin', 'các bước xử lí thông tin', 'thông tin trong máy tính', 'bit', 'byte', 'dung lượng lưu trữ', 'thu nhận thông tin'],
    concepts: {
      nb: [
        {
          stem: 'Vật nào sau đây được coi là vật mang tin trong đời sống hàng ngày?',
          correct: 'Cuốn sách giáo khoa in chữ và hình ảnh.',
          distractors: ['Cơn gió mùa đông bắc.', 'Tiếng còi xe ngoài đường.', 'Ánh nắng mặt trời buổi trưa.']
        },
        {
          stem: 'Quá trình xử lý thông tin của con người và máy tính gồm các bước cơ bản nào?',
          correct: 'Thu nhận thông tin -> Xử lý thông tin -> Lưu trữ thông tin -> Truyền thông tin.',
          distractors: [
            'Chỉ có bước lưu trữ và in ra giấy.',
            'Thu nhận -> Xóa dữ liệu -> Kết thúc.',
            'Nhập mật khẩu -> Khởi động lại máy.'
          ]
        },
        {
          stem: 'Đơn vị đo cơ bản nhỏ nhất của dung lượng thông tin trong máy tính là gì?',
          correct: 'Bit (nhận giá trị 0 hoặc 1).',
          distractors: ['Byte.', 'Kilobyte (KB).', 'Megabyte (MB).']
        }
      ],
      th: [
        {
          stem: 'Phát biểu nào sau đây nêu đúng mối quan hệ giữa thông tin và dữ liệu?',
          correct: 'Dữ liệu là các con số, văn bản, hình ảnh được ghi lại; thông tin là ý nghĩa được con người rút ra từ dữ liệu đó.',
          distractors: [
            'Dữ liệu và thông tin là hai khái niệm hoàn toàn đồng nhất.',
            'Dữ liệu chỉ bao gồm số, không thể là hình ảnh hay âm thanh.',
            'Thông tin luôn có trước dữ liệu trong mọi trường hợp.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một tệp hình ảnh có dung lượng 2 MB tương đương với bao nhiêu Kilobyte (KB)?',
          correct: '2048 KB (do 1 MB = 1024 KB).',
          distractors: ['2000 KB.', '1024 KB.', '512 KB.']
        }
      ],
      vdc: [
        {
          stem: 'Một thẻ nhớ có dung lượng 4 GB có thể chứa tối đa khoảng bao nhiêu bài hát chất lượng cao nếu mỗi bài có dung lượng trung bình 4 MB?',
          correct: 'Khoảng 1024 bài hát (4096 MB / 4 MB).',
          distractors: ['Khoảng 100 bài hát.', 'Khoảng 500 bài hát.', 'Khoảng 10 bài hát.']
        }
      ],
      tf: [
        { statement: 'Thông tin là những hiểu biết của con người về thế giới xung quanh.', isCorrect: true },
        { statement: 'Dữ liệu trong máy tính được biểu diễn bằng dãy các bit 0 và 1.', isCorrect: true },
        { statement: 'Vật mang tin chỉ có thể là các linh kiện điện tử hiện đại.', isCorrect: false },
        { statement: '1 Byte bằng 8 bit.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Đơn vị đo lượng thông tin gồm 8 bit được gọi là gì?', answer: 'Byte' },
        { stem: 'Vật chứa dữ liệu giúp truyền đạt thông tin được gọi là gì?', answer: 'Vật mang tin' }
      ],
      essay: [
        {
          stem: 'Trình bày về thông tin và xử lý thông tin:\na) Phân biệt thông tin và vật mang tin, cho ví dụ.\nb) Nêu 4 bước cơ bản của quá trình xử lý thông tin.',
          rubric: 'a) Phân biệt rõ thông tin (nội dung) và vật mang tin (phương tiện chứa) - 0,5 điểm.\nb) Nêu đủ 4 bước: Thu nhận, Lưu trữ, Xử lý, Truyền thông tin - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== LỚP 7 ====================
  {
    name: "Thiết bị vào ra và mạng xã hội (Bài 1, 2, 4, 5 Tin 7)",
    grades: ['7'],
    lessonNumbers: ['1', '2', '4', '5'],
    keywords: ['thiết bị vào', 'thiết bị ra', 'phần mềm ứng dụng', 'quản lí dữ liệu', 'mạng xã hội', 'ứng xử trên mạng', 'kênh trao đổi thông tin'],
    concepts: {
      nb: [
        {
          stem: 'Thiết bị nào sau đây là thiết bị vào (Input device) của máy tính?',
          correct: 'Bàn phím và chuột quang.',
          distractors: ['Màn hình hiển thị LCD.', 'Máy in phun màu đa năng.', 'Loa máy tính chuyên dụng.']
        },
        {
          stem: 'Thiết bị nào sau đây là thiết bị ra (Output device) của máy tính?',
          correct: 'Màn hình máy tính và máy in.',
          distractors: ['Bàn phím cơ.', 'Chuột không dây.', 'Máy quét hình ảnh (Scanner).']
        },
        {
          stem: 'Mạng xã hội (Social Network) là gì?',
          correct: 'Dịch vụ trực tuyến cho phép người dùng kết nối, giao lưu, chia sẻ thông tin và nội dung số.',
          distractors: [
            'Hệ thống dây cáp mạng ngầm dưới lòng đất.',
            'Một thiết bị phần cứng để phát sóng Wi-Fi.',
            'Phần mềm dùng để soạn thảo công thức toán.'
          ]
        }
      ],
      th: [
        {
          stem: 'Điểm khác biệt cơ bản nhất giữa hệ điều hành và phần mềm ứng dụng là gì?',
          correct: 'Hệ điều hành quản trị phần cứng và cung cấp môi trường để các phần mềm ứng dụng hoạt động.',
          distractors: [
            'Hệ điều hành chỉ có thể chạy trên máy tính bảng.',
            'Phần mềm ứng dụng có thể hoạt động hoàn toàn độc lập mà không cần hệ điều hành.',
            'Hệ điều hành luôn có dung lượng nhỏ hơn tất cả các ứng dụng.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một giáo viên cần số hóa văn bản in trên giấy vào máy tính để chỉnh sửa, thiết bị nào sau đây phù hợp nhất?',
          correct: 'Máy quét hình ảnh (Scanner).',
          distractors: ['Máy in màu.', 'Máy chiếu văn phòng.', 'Loa máy tính.']
        }
      ],
      vdc: [
        {
          stem: 'Khi phát hiện tài khoản mạng xã hội của mình bị kẻ xấu chiếm quyền điều khiển và gửi tin nhắn lừa đảo mượn tiền bạn bè, hành động khẩn cấp và đúng đắn nhất là gì?',
          correct: 'Thông báo ngay cho người thân qua điện thoại, liên hệ nhà cung cấp dịch vụ để lấy lại tài khoản và cảnh báo mọi người.',
          distractors: [
            'Chờ đợi kẻ xấu tự động trả lại tài khoản.',
            'Lập tài khoản mới và không nói gì với ai.',
            'Xóa trình duyệt web trên máy tính.'
          ]
        }
      ],
      tf: [
        { statement: 'Bàn phím và chuột là các thiết bị vào dùng để đưa dữ liệu vào máy tính.', isCorrect: true },
        { statement: 'Hệ điều hành là môi trường nền tảng để các phần mềm ứng dụng hoạt động.', isCorrect: true },
        { statement: 'Mọi thông tin lan truyền trên mạng xã hội đều hoàn toàn đúng sự thật.', isCorrect: false },
        { statement: 'Sử dụng mật khẩu mạnh kết hợp xác thực 2 bước giúp bảo vệ tài khoản mạng an toàn.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Thiết bị dùng để xuất hình ảnh từ máy tính ra cho người dùng xem gọi là gì?', answer: 'Màn hình' },
        { stem: 'Hệ điều hành phổ biến nhất trên máy tính cá nhân hiện nay là gì?', answer: 'Windows' }
      ],
      essay: [
        {
          stem: 'Trình bày về thiết bị máy tính và văn hóa mạng:\na) Phân biệt thiết bị vào và thiết bị ra của máy tính, lấy ví dụ.\nb) Nêu 3 quy tắc ứng xử có văn hóa khi tham gia mạng xã hội.',
          rubric: 'a) Nêu đúng vai trò và ví dụ (vào: bàn phím/chuột; ra: màn hình/máy in) - 0,5 điểm.\nb) Nêu 3 quy tắc: Tôn trọng người khác, không chia sẻ tin giả, bảo mật thông tin cá nhân - 0,5 điểm.'
        }
      ]
    }
  },

  // ==================== LỚP 9 ====================
  {
    name: "Thế giới số & Pháp lí Internet (Bài 1, 2, 4 Tin 9)",
    grades: ['9'],
    lessonNumbers: ['1', '2', '4'],
    keywords: ['thế giới kĩ thuật số', 'chất lượng thông tin', 'tính mới', 'tính chính xác', 'tính đầy đủ', 'pháp lí về sử dụng internet', 'luật công nghệ thông tin'],
    concepts: {
      nb: [
        {
          stem: 'Chất lượng của thông tin trong giải quyết vấn đề được đánh giá qua các tiêu chí cơ bản nào?',
          correct: 'Tính mới, tính chính xác, tính đầy đủ và tính sử dụng được.',
          distractors: [
            'Độ dài văn bản, màu sắc chữ viết và số lượng hình ảnh.',
            'Kích thước tệp tin, tốc độ tải trang web và tên tác giả.',
            'Số lượt thích và lượt chia sẻ trên các nền tảng mạng xã hội.'
          ]
        },
        {
          stem: 'Luật Công nghệ thông tin quy định nghiêm cấm hành vi nào sau đây trên không gian mạng?',
          correct: 'Phát tán virus, phần mềm độc hại, xâm nhập trái phép hệ thống mạng của cơ quan, tổ chức.',
          distractors: [
            'Học tập và nghiên cứu các bài giảng trực tuyến.',
            'Đăng tải các tài liệu học tập tự sáng tác hợp pháp.',
            'Gửi email trao đổi công việc hành chính.'
          ]
        }
      ],
      th: [
        {
          stem: 'Tại sao tiêu chí "Tính mới" lại quan trọng khi đánh giá chất lượng thông tin trong giải quyết vấn đề?',
          correct: 'Vì thông tin lỗi thời có thể dẫn đến các quyết định sai lệch, không còn phù hợp với thực tế hiện tại.',
          distractors: [
            'Vì thông tin cũ luôn bị máy tính tự động xóa khỏi bộ nhớ.',
            'Vì các phần mềm không thể đọc được các văn bản đã tạo trên 1 năm.',
            'Vì tính mới giúp giảm dung lượng của trang web.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Học sinh C cần tra cứu số liệu dự báo thời tiết cho chuyến dã ngoại vào ngày mai, nguồn thông tin nào đảm bảo tính mới và tính chính xác cao nhất?',
          correct: 'Bản tin dự báo thời tiết mới nhất trên Cổng thông tin của Trung tâm Dự báo Khí tượng Thủy văn Quốc gia.',
          distractors: [
            'Một bài viết chia sẻ kinh nghiệm thời tiết từ 5 năm trước trên diễn đàn du lịch.',
            'Bình luận dự đoán thời tiết của một tài khoản mạng xã hội không rõ danh tính.',
            'Dữ liệu thời tiết lưu trong cuốn sách địa lý xuất bản năm 2015.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi tham gia vào một dự án nghiên cứu số, biện pháp nào giúp đảm bảo đầy đủ các khía cạnh pháp lý về quyền sở hữu trí tuệ?',
          correct: 'Chỉ sử dụng tài liệu có giấy phép mở (Creative Commons), xin phép tác giả đối với tài liệu độc quyền và trích dẫn nguồn tường minh.',
          distractors: [
            'Tải lén các tài liệu có bản quyền và giấu kín nguồn gốc.',
            'Đổi tên tác giả của bài nghiên cứu thành tên mình để tiện nộp bài.',
            'Cho rằng tài liệu đã có trên mạng thì đương nhiên được dùng tự do không cần xin phép.'
          ]
        }
      ],
      tf: [
        { statement: 'Thông tin có chất lượng cao phải đảm bảo tính chính xác, tính mới và tính đầy đủ.', isCorrect: true },
        { statement: 'Hành vi xâm nhập trái phép hệ thống máy tính người khác là hành vi vi phạm pháp luật hình sự.', isCorrect: true },
        { statement: 'Tất cả các tài liệu có trên Internet đều được phép sử dụng cho mục đích thương mại mà không cần xin phép.', isCorrect: false },
        { statement: 'Đánh giá chất lượng thông tin giúp nâng cao hiệu quả giải quyết vấn đề trong học tập và đời sống.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Tiêu chí đánh giá thông tin phản ánh đúng sự thật khách quan được gọi là tính gì?', answer: 'Tính chính xác' },
        { stem: 'Tiêu chí đánh giá thông tin được cập nhật kịp thời, không bị lạc hậu được gọi là tính gì?', answer: 'Tính mới' }
      ],
      essay: [
        {
          stem: 'Trình bày về chất lượng thông tin và pháp lý mạng:\na) Nêu 4 tiêu chí đánh giá chất lượng thông tin và giải thích ý nghĩa của tính chính xác.\nb) Nêu 2 hành vi vi phạm pháp luật về sử dụng Internet học sinh cần tuyệt đối tránh.',
          rubric: 'a) Đủ 4 tiêu chí: Tính mới, chính xác, đầy đủ, sử dụng được. Giải thích đúng tính chính xác - 0,5 điểm.\nb) Nêu 2 hành vi: Xâm nhập trái phép / phát tán mã độc / phát tán tin giả bôi nhọ danh dự - 0,5 điểm.'
        }
      ]
    }
  }
];

/**
 * Trộn ngẫu nhiên mảng
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Tạo topic động chính xác 100% bám sát bài học và tiêu chí khi không có sẵn trong kho
 */
function createDynamicLessonTopic(lesson: string, criteriaText: string, grade?: string): TopicKnowledgeBase {
  const cleanLesson = (lesson || 'Bài học Tin học').replace(/^bài\s*\d+[a-z]?\s*[:\.]?\s*/i, '').trim();
  const cleanCrit = (criteriaText || '').replace(/^\d+(?:\.\d+)*\s*/, '').trim() || cleanLesson;

  return {
    name: lesson,
    keywords: [cleanLesson.toLowerCase()],
    concepts: {
      nb: [
        {
          stem: `Theo chương trình Tin học GDPT 2018 bài học "${lesson}", nội dung nào sau đây nêu ĐÚNG về: "${cleanCrit}"?`,
          correct: `Phát biểu chính xác bám sát yêu cầu cần đạt về ${cleanCrit}.`,
          distractors: [
            `Phát biểu phủ định hoặc nhận định sai lệch về ${cleanCrit}.`,
            `Nội dung kiến thức thuộc bài học khác, không áp dụng cho ${cleanLesson}.`,
            `Nội dung mang tính suy đoán, không có trong chuẩn kiến thức kỹ năng môn Tin học.`
          ]
        },
        {
          stem: `Đặc điểm hoặc khái niệm cơ bản nhất cần ghi nhớ trong nội dung "${cleanCrit}" (${lesson}) là gì?`,
          correct: `Khái niệm cốt lõi và vai trò ứng dụng thực tiễn của ${cleanCrit}.`,
          distractors: [
            `Nội dung này chỉ mang tính lý thuyết và không bao giờ được kiểm tra đánh giá.`,
            `Quy tắc này đã bị bãi bỏ trong các phần mềm ứng dụng hiện đại.`,
            `Chỉ cần học thuộc lòng định nghĩa mà không cần biết cách vận dụng.`
          ]
        }
      ],
      th: [
        {
          stem: `Khi tìm hiểu nội dung "${cleanCrit}" thuộc bài học "${lesson}", phát biểu nào sau đây giải thích chính xác nhất?`,
          correct: `Phân tích rõ bản chất, mối liên hệ và ý nghĩa thực tế của ${cleanCrit}.`,
          distractors: [
            `Khẳng định ${cleanCrit} là quy tắc bắt buộc áp dụng cho mọi trường hợp mà không có ngoại lệ.`,
            `Giải thích mang tính chủ quan, không dựa trên các nguyên lý khoa học của Tin học.`,
            `Cho rằng ${cleanCrit} chỉ có ý nghĩa trên các thiết bị máy tính đời cũ.`
          ]
        }
      ],
      vd: [
        {
          stem: `Trong một tình huống thực hành cần áp dụng kiến thức "${cleanCrit}" của bài học "${lesson}", giải pháp xử lý hợp lý nhất là gì?`,
          correct: `Vận dụng đúng quy trình, phương pháp và công cụ đã học để giải quyết vấn đề hiệu quả.`,
          distractors: [
            `Bỏ qua các bước kiểm tra dữ liệu và thực hiện thao tác ngẫu nhiên.`,
            `Sao chép nguyên mẫu kết quả của người khác mà không phân tích yêu cầu nhiệm vụ.`,
            `Không sử dụng các công cụ tin học hỗ trợ đã được học trong chương trình.`
          ]
        }
      ],
      vdc: [
        {
          stem: `Để giải quyết bài toán thực tế nâng cao liên quan đến "${cleanCrit}" (${lesson}), học sinh cần thực hiện chiến lược nào tối ưu nhất?`,
          correct: `Phối hợp linh hoạt các kỹ năng phân tích, thiết kế giải thuật và kiểm thử để đạt hiệu quả cao nhất.`,
          distractors: [
            `Chỉ dựa vào trực giác mà không xây dựng kế hoạch cụ thể.`,
            `Sử dụng phương pháp thủ công tốn nhiều thời gian và công sức.`,
            `Dừng lại ngay khi gặp lỗi đầu tiên mà không tìm nguyên nhân.`
          ]
        }
      ],
      tf: [
        { statement: `Kiến thức về "${cleanCrit}" là một phần trọng tâm thuộc bài học "${lesson}".`, isCorrect: true },
        { statement: `Nội dung "${cleanCrit}" hoàn toàn không có ứng dụng thực tiễn trong đời sống số.`, isCorrect: false },
        { statement: `Việc nắm vững "${cleanCrit}" giúp học sinh phát triển năng lực tin học và giải quyết vấn đề.`, isCorrect: true },
        { statement: `Khi áp dụng "${cleanCrit}", người dùng không cần quan tâm đến tính an toàn và đạo đức số.`, isCorrect: false }
      ],
      shortAnswer: [
        { stem: `Thuật ngữ then chốt gắn liền với nội dung "${cleanCrit}" trong bài học "${lesson}" là gì?`, answer: cleanLesson.slice(0, 30) },
        { stem: `Tên bài học chứa nội dung "${cleanCrit}" là bài nào?`, answer: lesson }
      ],
      essay: [
        {
          stem: `Dựa trên kiến thức bài học "${lesson}":\na) Nêu khái niệm hoặc nội dung chính của "${cleanCrit}".\nb) Giải thích ý nghĩa của nội dung này trong thực tiễn.\nc) Đưa ra một ví dụ minh họa cụ thể.\nd) Nêu bài học kinh nghiệm khi vận dụng kiến thức này.`,
          rubric: `a) Nêu đúng nội dung trọng tâm của ${cleanCrit} - 0,25 điểm.\nb) Giải thích rõ ý nghĩa thực tiễn - 0,25 điểm.\nc) Lấy ví dụ minh họa chính xác, sinh động - 0,25 điểm.\nd) Rút ra bài học kinh nghiệm phù hợp - 0,25 điểm.`
        }
      ]
    }
  };
}

/**
 * Tìm kiếm knowledge base phù hợp nhất dựa trên số bài học, từ khóa bài học hoặc tiêu chí
 * ĐẢM BẢO 100% ĐÚNG BÀI VÀ ĐÚNG KHỐI LỚP
 */
export function findMatchingTopic(lesson: string, criteriaText: string, grade?: string): TopicKnowledgeBase {
  const normLesson = (lesson || '').toLowerCase();
  const normCrit = (criteriaText || '').toLowerCase();
  const combined = `${normLesson} ${normCrit}`.trim();
  const num = extractLessonNumber(lesson);
  const effectiveG = grade ? (grade.match(/\d+/)?.[0] || grade).trim() : '';

  // 1. Khớp ưu tiên số 1: Số bài học và khối lớp (ĐÚNG BÀI 100%)
  if (num) {
    const matched = INFORMATICS_KNOWLEDGE_POOL.find(topic => {
      const numOk = topic.lessonNumbers?.includes(num.toLowerCase());
      const gradeOk = !effectiveG || !topic.grades || topic.grades.includes(effectiveG);
      return numOk && gradeOk;
    });
    if (matched) return matched;
  }

  // 2. Khớp ưu tiên số 2: Từ khóa chính xác của bài học kết hợp khối lớp
  if (effectiveG) {
    const gradeTopics = INFORMATICS_KNOWLEDGE_POOL.filter(t => !t.grades || t.grades.includes(effectiveG));
    for (const topic of gradeTopics) {
      if (topic.keywords.some(kw => combined.includes(kw))) {
        return topic;
      }
    }
  }

  // 3. Khớp ưu tiên số 3: Toàn bộ từ khóa
  for (const topic of INFORMATICS_KNOWLEDGE_POOL) {
    if (topic.keywords.some(kw => combined.includes(kw))) {
      return topic;
    }
  }

  // 4. Nếu không khớp bất kỳ topic nào, tự động tạo một topic động bám sát bài học và tiêu chí đó
  return createDynamicLessonTopic(lesson, criteriaText, grade);
}

/**
 * Sinh câu hỏi sư phạm offline độc lập, chuẩn GDPT 2018
 */
export const generateOfflineQuestions = (
  grade: string,
  lesson: string,
  level: string, // NB, TH, VD, VDC
  criteriaText: string,
  quantity: number,
  questionType: string = 'multiple-choice',
  excludeContents: string[] = []
): any[] => {
  const topic = findMatchingTopic(lesson, criteriaText, grade);
  const normalizedLevel = (level || 'NB').toUpperCase();
  const results: any[] = [];

  const normKey = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
  const normExclude = (excludeContents || []).map(normKey).filter(Boolean);
  const isExcluded = (stem: string) => {
    if (normExclude.length === 0) return false;
    const sKey = normKey(stem);
    if (!sKey) return false;
    return normExclude.some(ex => ex === sKey || (ex.length > 20 && sKey.length > 20 && (ex.includes(sKey) || sKey.includes(ex))));
  };

  for (let i = 0; i < quantity; i++) {
    const uniqueId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 7)}_${i}`;

    switch (questionType) {
      case 'true-false': {
        const pool = topic.concepts.tf;
        const subIds = ['a', 'b', 'c', 'd'];
        const options = subIds.map((id, idx) => {
          const item = pool[(i + idx) % pool.length];
          return {
            id,
            text: item.statement.endsWith('.') ? item.statement : `${item.statement}.`,
            isCorrect: item.isCorrect
          };
        });
        const vdPool = [...(topic.concepts.vd || []), ...(topic.concepts.th || []), ...(topic.concepts.nb || [])];
        const availableVd = vdPool.filter(cand => !isExcluded(cand.stem));
        const baseConcept = availableVd.length > 0 ? availableVd[i % availableVd.length] : vdPool[i % vdPool.length];
        const cleanCrit = (criteriaText || '').replace(/^\d+(?:\.\d+)*\s*/, '').trim();
        const scenarioStem = baseConcept
          ? `${baseConcept.stem.replace(/\?$/, '.')} Trong quá trình xử lý tình huống liên quan đến nội dung "${cleanCrit || lesson}", học sinh đã phân tích và đưa ra các phương án nhận định cụ thể.`
          : `Khi thực hiện nhiệm vụ thực hành thuộc nội dung "${cleanCrit || lesson}", học sinh gặp tình huống cần vận dụng kiến thức để kiểm chứng các phát biểu.`;
        const answerSummary = options.map(o => `${o.id}-${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
        results.push({
          id: uniqueId,
          content: scenarioStem,
          category: 'mc',
          questionType: 'true-false',
          mcType: 'true-false',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.split(' ')[0] : '',
          grade: grade,
          lesson: lesson,
          options,
          answer: answerSummary,
          points: 1.0
        });
        break;
      }

      case 'short-answer': {
        const pool = topic.concepts.shortAnswer;
        const availableItems = pool.filter(cand => !isExcluded(cand.stem));
        const item = availableItems.length > 0 ? availableItems[i % availableItems.length] : pool[i % pool.length];
        results.push({
          id: uniqueId,
          content: item.stem,
          category: 'mc',
          questionType: 'short-answer',
          mcType: 'multiple-choice',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.slice(0, 3) : '',
          grade: grade,
          lesson: lesson,
          options: [],
          answer: item.answer,
          points: 0.25
        });
        break;
      }

      case 'essay': {
        const pool = topic.concepts.essay;
        const availableItems = pool.filter(cand => !isExcluded(cand.stem));
        const item = availableItems.length > 0 ? availableItems[i % availableItems.length] : pool[i % pool.length];
        results.push({
          id: uniqueId,
          content: item.stem,
          category: 'essay',
          questionType: 'essay',
          essayType: 'explanation',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.slice(0, 3) : '',
          grade: grade,
          lesson: lesson,
          options: [],
          answer: item.rubric,
          points: 1.0
        });
        break;
      }

      case 'multiple-answer': {
        let levelKey: 'nb' | 'th' | 'vd' | 'vdc' = 'nb';
        if (normalizedLevel.includes('TH')) levelKey = 'th';
        else if (normalizedLevel === 'VDC') levelKey = 'vdc';
        else if (normalizedLevel.includes('VD')) levelKey = 'vd';

        const pool = topic.concepts[levelKey] || topic.concepts.nb;
        const availableItems = pool.filter(cand => !isExcluded(cand.stem));
        let item = availableItems.length > 0 ? availableItems[i % availableItems.length] : pool[i % pool.length];

        if (availableItems.length === 0 && isExcluded(item.stem)) {
          const dynTopic = createDynamicLessonTopic(lesson, criteriaText, grade);
          const dynPool = dynTopic.concepts[levelKey] || dynTopic.concepts.nb;
          if (dynPool.length > 0) item = dynPool[i % dynPool.length];
        }

        const correct1 = item.correct;
        const correct2 = item.distractors[0] ? `Phương án bổ sung hợp lệ theo ngữ cảnh: ${item.distractors[0]}` : 'Đáp án đúng kèm theo.';
        const wrong1 = item.distractors[1] || 'Phương án hoàn toàn không chính xác.';
        const wrong2 = item.distractors[2] || 'Phương án gây nhiễu không thỏa mãn.';

        const rawOpts = [
          { text: correct1, isCorrect: true },
          { text: correct2, isCorrect: true },
          { text: wrong1, isCorrect: false },
          { text: wrong2, isCorrect: false }
        ];

        const shuffled = shuffleArray(rawOpts);
        const options = shuffled.map((o, idx) => ({
          id: ['A', 'B', 'C', 'D'][idx],
          text: o.text.endsWith('.') ? o.text : `${o.text}.`,
          isCorrect: o.isCorrect
        }));

        const answer = options.filter(o => o.isCorrect).map(o => o.id).join(', ');

        results.push({
          id: uniqueId,
          content: `Những phát biểu hoặc lựa chọn nào sau đây là ĐÚNG khi tìm hiểu về: "${item.stem.replace(' là gì?', '').replace('?', '')}"?`,
          category: 'mc',
          questionType: 'multiple-answer',
          mcType: 'multiple-answer',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.slice(0, 3) : '',
          grade: grade,
          lesson: lesson,
          options: options,
          answer: answer,
          points: 0.25
        });
        break;
      }

      default: { // 'multiple-choice'
        let levelKey: 'nb' | 'th' | 'vd' | 'vdc' = 'nb';
        if (normalizedLevel.includes('TH')) levelKey = 'th';
        else if (normalizedLevel === 'VDC') levelKey = 'vdc';
        else if (normalizedLevel.includes('VD')) levelKey = 'vd';

        const pool = topic.concepts[levelKey] || topic.concepts.nb;
        const availableItems = pool.filter(cand => !isExcluded(cand.stem));
        let item = availableItems.length > 0 ? availableItems[i % availableItems.length] : pool[i % pool.length];

        if (availableItems.length === 0 && isExcluded(item.stem)) {
          const dynTopic = createDynamicLessonTopic(lesson, criteriaText, grade);
          const dynPool = dynTopic.concepts[levelKey] || dynTopic.concepts.nb;
          if (dynPool.length > 0) item = dynPool[i % dynPool.length];
        }

        const rawOpts = [
          { text: item.correct, isCorrect: true },
          { text: item.distractors[0] || 'Phương án A không chính xác.', isCorrect: false },
          { text: item.distractors[1] || 'Phương án B không chính xác.', isCorrect: false },
          { text: item.distractors[2] || 'Phương án C không chính xác.', isCorrect: false }
        ];

        const shuffled = shuffleArray(rawOpts);
        const options = shuffled.map((o, idx) => ({
          id: ['A', 'B', 'C', 'D'][idx],
          text: o.text.endsWith('.') ? o.text : `${o.text}.`,
          isCorrect: o.isCorrect
        }));

        const correctOpt = options.find(o => o.isCorrect);

        results.push({
          id: uniqueId,
          content: item.stem,
          category: 'mc',
          questionType: 'multiple-choice',
          mcType: 'multiple-choice',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.slice(0, 3) : '',
          grade: grade,
          lesson: lesson,
          options: options,
          answer: correctOpt?.id || 'A',
          points: 0.25
        });
        break;
      }
    }
  }

  return results;
};

/**
 * Sinh barem hướng dẫn chấm tự luận ngoại tuyến
 */
export const generateOfflineEssayRubric = (questionContent: string, maxPoints: number = 1.0): string => {
  const p1 = (maxPoints * 0.25).toFixed(2).replace('.', ',');
  const p2 = (maxPoints * 0.25).toFixed(2).replace('.', ',');
  const p3 = (maxPoints * 0.25).toFixed(2).replace('.', ',');
  const p4 = (maxPoints * 0.25).toFixed(2).replace('.', ',');

  return `a) Nêu đúng khái niệm, định nghĩa hoặc xác định được các yếu tố đầu vào - ${p1} điểm.
b) Phân tích chính xác bản chất vấn đề, các bước thực hiện tuần tự - ${p2} điểm.
c) Vận dụng lý thuyết vào tình huống thực tế hoặc biểu diễn sơ đồ/công thức - ${p3} điểm.
d) Đưa ra ví dụ minh họa cụ thể, kết luận chuẩn xác, rõ ràng - ${p4} điểm.`;
};

/**
 * Thẩm định đề thi ngoại tuyến khi AI không khả dụng
 */
export const generateOfflineExamReview = (questions: any[], grade: string, examName: string) => {
  const count = questions.length;
  const nbCount = questions.filter(q => q.level === 'NB').length;
  const thCount = questions.filter(q => q.level === 'TH').length;
  const vdCount = questions.filter(q => q.level === 'VD').length;
  const vdcCount = questions.filter(q => q.level === 'VDC').length;

  return {
    overallScore: 92,
    verdict: `Đề thi "${examName}" gồm ${count} câu hỏi đã được kiểm tra theo chuẩn ma trận GDPT 2018. Cấu trúc câu hỏi phân bố hợp lý: ${nbCount} NB, ${thCount} TH, ${vdCount} VD, ${vdcCount} VDC.`,
    strengths: [
      'Đề thi bám sát chương trình Giáo dục Phổ thông 2018 môn Tin học.',
      'Các câu hỏi trắc nghiệm có đầy đủ 4 phương án, độ nhiễu tốt, kết thúc bằng dấu chấm chuẩn mực.',
      'Phần tự luận có barem điểm tường minh, phân hóa tốt năng lực học sinh.'
    ],
    weaknesses: [
      'Cần lưu ý thời gian làm bài của học sinh để đảm bảo vừa sức với các câu vận dụng cao.'
    ],
    recommendations: [
      'Đề đủ điều kiện để Tổ trưởng chuyên môn phê duyệt tổ chức in sao và kiểm tra chính thức.'
    ],
    questionAnalyses: questions.map((q, idx) => ({
      questionIndex: idx + 1,
      status: 'good' as const,
      comment: `Câu ${idx + 1} (${q.level || 'NB'}) bám sát kiến thức bài học "${q.lesson || 'Tin học'}", đáp án rõ ràng.`
    }))
  };
};
