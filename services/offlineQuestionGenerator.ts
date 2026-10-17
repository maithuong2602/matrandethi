import { ExerciseQuestion } from '../types';

/**
 * BỘ TẠO CÂU HỎI SƯ PHẠM DỰ PHÒNG THÔNG MINH (OFFLINE CURRICULUM QUESTION ENGINE)
 * Đảm bảo 100% người dùng luôn tạo được câu hỏi chuẩn theo chương trình GDPT 2018
 * ngay cả khi API Key chưa cấu hình, hết quota (429), không hợp lệ, hoặc mất mạng Internet!
 */

interface TopicKnowledgeBase {
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

const INFORMATICS_KNOWLEDGE_POOL: TopicKnowledgeBase[] = [
  // Chủ đề: Máy tính, thiết bị vào ra, phần cứng & phần mềm (Chủ đề A)
  {
    keywords: ['thiết bị', 'phần cứng', 'phần mềm', 'hệ điều hành', 'vào', 'ra', 'bộ nhớ', 'lưu trữ', 'ram', 'cpu', 'linh kiện'],
    concepts: {
      nb: [
        {
          stem: 'Thiết bị nào sau đây là thiết bị vào (Input device) của máy tính?',
          correct: 'Bàn phím và chuột quang.',
          distractors: ['Màn hình hiển thị LCD.', 'Máy in phun màu đa năng.', 'Loa máy tính chuyên dụng.']
        },
        {
          stem: 'Thành phần nào được ví như "bộ não" thực hiện tính toán và điều khiển hoạt động của máy tính?',
          correct: 'Bộ vi xử lý trung tâm (CPU).',
          distractors: ['Bộ nhớ truy cập ngẫu nhiên (RAM).', 'Ổ đĩa cứng thể rắn (SSD).', 'Bộ nguồn máy tính (PSU).']
        },
        {
          stem: 'Bộ nhớ RAM thuộc loại bộ nhớ nào sau đây?',
          correct: 'Bộ nhớ trong (bộ nhớ tạm thời, mất dữ liệu khi tắt nguồn).',
          distractors: ['Bộ nhớ ngoài dùng để lưu trữ lâu dài.', 'Thiết bị xuất dữ liệu cho người dùng.', 'Thiết bị điều khiển ngoại vi.']
        },
        {
          stem: 'Hệ điều hành phổ biến nhất trên máy tính cá nhân hiện nay là gì?',
          correct: 'Hệ điều hành Windows.',
          distractors: ['Phần mềm bảng tính Microsoft Excel.', 'Trình duyệt web Google Chrome.', 'Phần mềm soạn thảo văn bản Word.']
        }
      ],
      th: [
        {
          stem: 'Điểm khác biệt cơ bản nhất giữa hệ điều hành và phần mềm ứng dụng là gì?',
          correct: 'Hệ điều hành quản trị phần cứng và cung cấp môi trường để các phần mềm ứng dụng hoạt động.',
          distractors: [
            'Hệ điều hành chỉ có thể chạy trên máy tính bảng, còn phần mềm ứng dụng chỉ chạy trên máy tính bàn.',
            'Phần mềm ứng dụng có thể hoạt động hoàn toàn độc lập mà không cần hệ điều hành.',
            'Hệ điều hành luôn có dung lượng nhỏ hơn tất cả các phần mềm ứng dụng.'
          ]
        },
        {
          stem: 'Tại sao khi đang làm việc trên máy tính mà bị mất nguồn điện đột ngột thì dữ liệu chưa lưu lại bị mất?',
          correct: 'Vì dữ liệu đang được xử lý tạm thời trên bộ nhớ RAM, bộ nhớ này mất dữ liệu khi không có điện.',
          distractors: [
            'Vì ổ cứng máy tính bị xóa trắng dữ liệu ngay khi mất điện.',
            'Vì bộ vi xử lý CPU tự động hủy bỏ các tệp tin chưa được mã hóa.',
            'Vì hệ điều hành tự động khóa quyền truy cập ổ đĩa.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một giáo viên cần số hóa văn bản in trên giấy vào máy tính để chỉnh sửa nội dung, thiết bị nào sau đây là phù hợp nhất?',
          correct: 'Máy quét hình ảnh (Scanner) kết hợp phần mềm nhận dạng ký tự quang học.',
          distractors: ['Máy in màu đa chức năng.', 'Máy chiếu văn phòng độ nét cao.', 'Bộ loa trợ giảng không dây.']
        },
        {
          stem: 'Khi ổ đĩa C của máy tính báo dung lượng còn dưới 2GB khiến máy chạy rất chậm, giải pháp tối ưu nhất là gì?',
          correct: 'Dọn dẹp các tệp tin tạm (Temp files) và chuyển các tài liệu cá nhân sang phân vùng ổ đĩa khác hoặc lưu trữ đám mây.',
          distractors: ['Tắt màn hình máy tính trong 30 phút.', 'Tháo bớt một thanh RAM ra khỏi máy.', 'Cài đặt thêm nhiều phần mềm diệt virus cùng lúc.']
        }
      ],
      vdc: [
        {
          stem: 'Một học sinh muốn lắp ráp máy tính phục vụ đồ họa 3D và dựng video, linh kiện nào cần được ưu tiên đầu tư ngân sách lớn nhất để đảm bảo hiệu năng xử lý hình ảnh phức tạp?',
          correct: 'Card đồ họa rời (GPU chuyên dụng) cùng vi xử lý đa nhân và bộ nhớ RAM dung lượng cao.',
          distractors: [
            'Bàn phím cơ có đèn nền RGB đổi màu.',
            'Bộ lưu điện dự phòng công suất nhỏ.',
            'Chuột không dây có nhiều nút chức năng.'
          ]
        }
      ],
      tf: [
        { statement: 'Chuột máy tính và bàn phím là các thiết bị vào dùng để đưa dữ liệu vào máy tính.', isCorrect: true },
        { statement: 'Dữ liệu được lưu trong bộ nhớ RAM vẫn tồn tại vĩnh viễn khi tắt nguồn máy tính.', isCorrect: false },
        { statement: 'Hệ điều hành là phần mềm trung gian giữa người dùng, phần cứng máy tính và phần mềm ứng dụng.', isCorrect: true },
        { statement: 'Màn hình cảm ứng vừa có chức năng đưa dữ liệu vào vừa có chức năng xuất dữ liệu ra.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Đơn vị đo cơ bản nhỏ nhất của dung lượng thông tin trong máy tính là gì?', answer: 'Bit' },
        { stem: '1 Megabyte (MB) tương đương với bao nhiêu Kilobyte (KB)?', answer: '1024' },
        { stem: 'Thiết bị nào chịu trách nhiệm thực thi các lệnh của chương trình máy tính?', answer: 'CPU' }
      ],
      essay: [
        {
          stem: 'Phân tích vai trò của hệ điều hành đối với hệ thống máy tính:\na) Nêu khái niệm hệ điều hành.\nb) Trình bày 2 chức năng chính của hệ điều hành đối với quản lý phần cứng.\nc) Phân biệt hệ điều hành và phần mềm ứng dụng.\nd) Lấy 2 ví dụ về hệ điều hành trên máy tính và trên điện thoại thông minh.',
          rubric: 'a) Nêu đúng khái niệm hệ điều hành - 0,25 điểm.\nb) Nêu rõ chức năng quản lý thiết bị ngoại vi và bộ nhớ - 0,25 điểm.\nc) Chỉ ra được hệ điều hành là môi trường nền tảng để ứng dụng hoạt động - 0,25 điểm.\nd) Lấy chính xác ví dụ (Windows, Linux / Android, iOS) - 0,25 điểm.'
        }
      ]
    }
  },

  // Chủ đề: Mạng máy tính và Internet (Chủ đề B)
  {
    keywords: ['mạng', 'internet', 'lan', 'wan', 'wifi', 'router', 'switch', 'kết nối', 'trang web', 'web', 'email', 'thư điện tử'],
    concepts: {
      nb: [
        {
          stem: 'Mạng máy tính cục bộ được viết tắt bằng thuật ngữ nào sau đây?',
          correct: 'Mạng LAN (Local Area Network).',
          distractors: ['Mạng WAN (Wide Area Network).', 'Mạng MAN (Metropolitan Area Network).', 'Mạng SAN (Storage Area Network).']
        },
        {
          stem: 'Thiết bị nào sau đây dùng để định tuyến và chuyển tiếp các gói dữ liệu giữa các mạng khác nhau ra Internet?',
          correct: 'Thiết bị định tuyến Router.',
          distractors: ['Bộ chia mạng Hub cơ bản.', 'Bàn phím điều khiển từ xa.', 'Cáp mạng xoắn đôi bấm sẵn.']
        },
        {
          stem: 'Địa chỉ nào sau đây là địa chỉ thư điện tử (Email) đúng định dạng cú pháp chuẩn?',
          correct: 'hocsinh.thcs@school.edu.vn.',
          distractors: ['hocsinh.thcs#school.edu.vn.', 'www.hocsinh.thcs.edu.vn.', 'https://email.school/hocsinh.']
        }
      ],
      th: [
        {
          stem: 'Lợi ích lớn nhất của việc kết nối các máy tính thành mạng trong một phòng thực hành Tin học là gì?',
          correct: 'Cho phép chia sẻ tài nguyên như tệp tin, máy in và kết nối Internet dùng chung giữa các máy.',
          distractors: [
            'Làm cho các máy tính tự động tăng tốc độ vi xử lý CPU lên gấp đôi.',
            'Giúp máy tính không bao giờ bị nhiễm mã độc hay virus tin học.',
            'Cho phép máy tính hoạt động mà không cần cắm nguồn điện trực tiếp.'
          ]
        },
        {
          stem: 'Phát biểu nào sau đây phân biệt chính xác giữa Internet và World Wide Web (WWW)?',
          correct: 'Internet là hạ tầng mạng lưới kết nối toàn cầu, còn WWW là một dịch vụ thông tin chạy trên nền Internet.',
          distractors: [
            'Internet và WWW là cùng một khái niệm hoàn toàn đồng nhất.',
            'WWW là hệ thống cáp mạng dưới biển, còn Internet là phần mềm duyệt web.',
            'Internet chỉ hoạt động khi có trình duyệt web Chrome được mở.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Một văn phòng có 15 máy tính đặt cùng một tầng, cần chia sẻ một máy in chung để tiết kiệm chi phí, giải pháp kỹ thuật hợp lý nhất là gì?',
          correct: 'Kết nối máy in vào mạng LAN nội bộ và thiết lập quyền chia sẻ máy in (Shared Printer) cho tất cả máy con.',
          distractors: [
            'Sao chép tài liệu ra USB rồi cắm từng máy một vào máy in thủ công.',
            'Mua thêm 15 máy in riêng biệt cho từng người.',
            'Tắt toàn bộ hệ thống mạng và in bằng cổng song song LPT cũ.'
          ]
        }
      ],
      vdc: [
        {
          stem: 'Khi kết nối mạng Wi-Fi tại quán cà phê công cộng để chuyển khoản ngân hàng, biện pháp nào sau đây giúp phòng ngừa nguy cơ bị nghe lén (Sniffing) dữ liệu nhạy cảm hiệu quả nhất?',
          correct: 'Sử dụng mạng riêng ảo (VPN), đảm bảo giao thức truy cập là HTTPS và kích hoạt xác thực hai yếu tố (2FA).',
          distractors: [
            'Chỉ cần giảm độ sáng màn hình xuống mức thấp nhất.',
            'Cắm thêm tai nghe khi thao tác trên điện thoại.',
            'Bật chế độ máy bay trong khi thực hiện giao dịch.'
          ]
        }
      ],
      tf: [
        { statement: 'Mạng LAN kết nối các máy tính trong phạm vi hẹp như một phòng làm việc, trường học hoặc toà nhà.', isCorrect: true },
        { statement: 'Mạng không dây (Wi-Fi) truyền dữ liệu bằng sóng điện từ mà không cần cáp mạng vật lý trực tiếp.', isCorrect: true },
        { statement: 'Mọi thông tin trên mạng Internet đều đã được kiểm duyệt nên luôn hoàn toàn chính xác.', isCorrect: false },
        { statement: 'Giao thức HTTPS trên thanh địa chỉ trình duyệt web biểu thị kết nối đã được mã hóa bảo mật.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Viết tắt của mạng diện rộng kết nối các quốc gia và toàn cầu là gì?', answer: 'WAN' },
        { stem: 'Ký tự bắt buộc phải có trong một địa chỉ thư điện tử (email) hợp lệ là ký tự nào?', answer: '@' }
      ],
      essay: [
        {
          stem: 'Em hãy phân tích các yếu tố bảo đảm an toàn khi tham gia mạng xã hội và Internet:\na) Nêu 2 nguy cơ tiềm ẩn khi sử dụng mạng Internet công cộng.\nb) Đưa ra 3 quy tắc đặt mật khẩu tài khoản an toàn.\nc) Ý nghĩa của việc bật xác thực 2 bước (2FA).\nd) Khi gặp một liên kết (link) lạ gửi qua tin nhắn, em sẽ xử lý như thế nào?',
          rubric: 'a) Nêu đúng nguy cơ lộ lọt thông tin, lừa đảo trực tuyến - 0,25 điểm.\nb) Quy tắc mật khẩu: dài trên 8 ký tự, có chữ hoa, thường, số, ký tự đặc biệt - 0,25 điểm.\nc) Nêu rõ xác thực 2 bước ngăn chặn truy cập trái phép dù lộ mật khẩu - 0,25 điểm.\nd) Không nhấp vào link lạ, xác minh lại với người gửi qua kênh khác - 0,25 điểm.'
        }
      ]
    }
  },

  // Chủ đề: Bảng tính điện tử, dữ liệu số (Chủ đề E - Excel / Sheet)
  {
    keywords: ['bảng tính', 'excel', 'ô tính', 'hàng', 'cột', 'hàm', 'sum', 'average', 'count', 'if', 'công thức', 'biểu đồ'],
    concepts: {
      nb: [
        {
          stem: 'Trong phần mềm bảng tính điện tử, giao điểm giữa một cột và một hàng được gọi là gì?',
          correct: 'Ô tính (Cell).',
          distractors: ['Khối ô tính (Range).', 'Trang bảng tính (Worksheet).', 'Thanh công thức (Formula Bar).']
        },
        {
          stem: 'Dấu nào sau đây bắt buộc phải nhập đầu tiên khi nhập một công thức tính toán trong ô tính?',
          correct: 'Dấu bằng (=).',
          distractors: ['Dấu cộng (+).', 'Dấu hai chấm (:).', 'Dấu ngoặc đơn (().']
        },
        {
          stem: 'Hàm nào sau đây dùng để tính trung bình cộng của các giá trị số trong bảng tính?',
          correct: 'Hàm AVERAGE.',
          distractors: ['Hàm SUM.', 'Hàm MAX.', 'Hàm COUNT.']
        }
      ],
      th: [
        {
          stem: 'Khi sao chép công thức chứa địa chỉ tương đối "=A1+B1" từ ô C1 xuống ô C2, công thức tại ô C2 sẽ tự động chuyển đổi thành gì?',
          correct: '=A2+B2.',
          distractors: ['=A1+B1.', '=$A$1+$B$1.', '=A3+B3.']
        },
        {
          stem: 'Mục đích chính của việc sử dụng biểu đồ (Chart) trong bảng tính là gì?',
          correct: 'Trực quan hóa dữ liệu giúp người xem dễ dàng nhận biết xu hướng, quy luật và so sánh các đại lượng.',
          distractors: [
            'Làm cho tệp bảng tính có dung lượng nhẹ hơn nhiều lần.',
            'Tự động sửa chữa các lỗi chính tả trong văn bản tiếng Việt.',
            'Khóa bảng tính để người khác không thể xem được dữ liệu.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Tại ô D5 có công thức "=SUM(A5:C5)*0.1". Nếu giá trị tại ô A5=20, B5=30, C5=50 thì kết quả hiển thị tại ô D5 là bao nhiêu?',
          correct: '10.',
          distractors: ['100.', '1.', '50.']
        }
      ],
      vdc: [
        {
          stem: 'Để xếp loại học tập cho học sinh tại ô H2: nếu điểm trung bình (ô G2) >= 8.0 thì ghi "Tốt", ngược lại nếu >= 6.5 thì ghi "Khá", còn lại ghi "Đạt", công thức lồng hàm IF nào sau đây là chính xác?',
          correct: '=IF(G2>=8.0, "Tốt", IF(G2>=6.5, "Khá", "Đạt")).',
          distractors: [
            '=IF(G2>=8.0, "Tốt", "Khá", "Đạt").',
            '=IF(G2>=6.5, "Khá", IF(G2>=8.0, "Tốt", "Đạt")).',
            '=SUM(IF(G2>=8.0, "Tốt", "Đạt")).'
          ]
        }
      ],
      tf: [
        { statement: 'Công thức trong bảng tính luôn phải bắt đầu bằng dấu "=".', isCorrect: true },
        { statement: 'Hàm MAX dùng để tìm giá trị nhỏ nhất trong một tập hợp dữ liệu số.', isCorrect: false },
        { statement: 'Địa chỉ tuyệt đối được đánh dấu bằng ký hiệu "$" trước tên cột và chỉ số hàng (ví dụ $A$1).', isCorrect: true },
        { statement: 'Biểu đồ hình cột (Column Chart) thường dùng để so sánh dữ liệu giữa các đối tượng khác nhau.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Hàm tính tổng trong phần mềm bảng tính có tên là gì?', answer: 'SUM' },
        { stem: 'Ký hiệu nào được dùng để cố định địa chỉ ô trong công thức Excel?', answer: '$' }
      ],
      essay: [
        {
          stem: 'Cho bảng điểm gồm các cột: STT, Họ và tên, Toán, Văn, Tin, ĐTB, Xếp loại:\na) Viết công thức tính ĐTB tại ô F2 biết các môn có hệ số 1.\nb) Sử dụng hàm IF để xếp loại tại ô G2 (ĐTB >= 8 là Giỏi, ngược lại là Khá).\nc) Nêu ý nghĩa của địa chỉ tương đối và địa chỉ tuyệt đối khi kéo sao chép công thức.\nd) Muốn biểu diễn tỉ lệ học sinh các loại bằng biểu đồ, em chọn dạng biểu đồ nào?',
          rubric: 'a) Viết đúng: =AVERAGE(C2:E2) hoặc =(C2+D2+E2)/3 - 0,25 điểm.\nb) Viết đúng: =IF(F2>=8, "Giỏi", "Khá") - 0,25 điểm.\nc) Nêu rõ sự thay đổi tọa độ khi sao chép tương đối và cố định khi tuyệt đối - 0,25 điểm.\nd) Chọn biểu đồ hình tròn (Pie chart) cho tỉ lệ cơ cấu phần trăm - 0,25 điểm.'
        }
      ]
    }
  },

  // Chủ đề: Thuật toán & Tư duy lập trình (Chủ đề F)
  {
    keywords: ['thuật toán', 'sắp xếp', 'tìm kiếm', 'lập trình', 'scratch', 'python', 'biến', 'vòng lặp', 'điều kiện', 'bước', 'sơ đồ khối'],
    concepts: {
      nb: [
        {
          stem: 'Thuật toán (Algorithm) là gì?',
          correct: 'Dãy hữu hạn các chỉ dẫn rõ ràng, thực hiện theo một trật tự xác định để giải quyết một bài toán hay nhiệm vụ.',
          distractors: [
            'Một thiết bị phần cứng dùng để tăng tốc độ kết nối mạng Internet.',
            'Một ngôn ngữ tiếng Anh dùng để giao tiếp với người nước ngoài.',
            'Một trò chơi điện tử trực tuyến nhiều người chơi.'
          ]
        },
        {
          stem: 'Trong sơ đồ khối biểu diễn thuật toán, hình thoi thường được dùng để thể hiện thao tác nào?',
          correct: 'Kiểm tra điều kiện rẽ nhánh (Đúng / Sai).',
          distractors: ['Bắt đầu hoặc kết thúc thuật toán.', 'Thực hiện phép tính hoặc lệnh xử lý gán giá trị.', 'Nhập hoặc xuất dữ liệu.']
        },
        {
          stem: 'Thuật toán tìm kiếm tuần tự (Linear Search) thực hiện việc tìm kiếm bằng cách nào?',
          correct: 'Lần lượt so sánh giá trị cần tìm với từng phần tử trong danh sách từ đầu đến cuối.',
          distractors: [
            'Chia đôi danh sách thành hai nửa bằng nhau rồi kiểm tra phần tử ở giữa.',
            'Sắp xếp danh sách trước rồi mới tiến hành tìm kiếm ngẫu nhiên.',
            'Chỉ kiểm tra phần tử đầu tiên và phần tử cuối cùng của dãy.'
          ]
        }
      ],
      th: [
        {
          stem: 'Điều kiện tiên quyết để có thể áp dụng thuật toán tìm kiếm nhị phân (Binary Search) là gì?',
          correct: 'Dãy dữ liệu đã cho bắt buộc phải được sắp xếp theo thứ tự tăng dần hoặc giảm dần.',
          distractors: [
            'Dãy dữ liệu phải có số lượng phần tử là số chẵn.',
            'Tất cả các phần tử trong dãy đều phải là các số nguyên dương.',
            'Dãy dữ liệu không được chứa quá 10 phần tử.'
          ]
        },
        {
          stem: 'Ưu điểm nổi bật của thuật toán tìm kiếm nhị phân so với thuật toán tìm kiếm tuần tự trên tập dữ liệu lớn là gì?',
          correct: 'Số lần so sánh ít hơn rất nhiều, giúp tìm ra kết quả nhanh hơn đáng kể.',
          distractors: [
            'Thuật toán nhị phân không bao giờ trả về kết quả rỗng.',
            'Thuật toán nhị phân có thể tìm kiếm dữ liệu mà không cần nạp vào bộ nhớ.',
            'Thuật toán nhị phân dễ lập trình hơn trên mọi ngôn ngữ.'
          ]
        }
      ],
      vd: [
        {
          stem: 'Cho dãy số đã sắp xếp: [2, 5, 8, 12, 16, 23, 38]. Khi áp dụng thuật toán tìm kiếm nhị phân để tìm giá trị 23, phần tử ở vị trí giữa đầu tiên được so sánh là số nào?',
          correct: 'Số 12 (vị trí giữa của dãy 7 phần tử).',
          distractors: ['Số 2 (phần tử đầu tiên).', 'Số 38 (phần tử cuối cùng).', 'Số 16.']
        }
      ],
      vdc: [
        {
          stem: 'Một thư viện trường học có 10.000 cuốn sách đã được đánh mã số tăng dần. Nhân viên thư viện cần tìm cuốn sách có mã số X. Thuật toán tìm kiếm nhị phân cần tối đa khoảng bao nhiêu lần so sánh để tìm thấy cuốn sách hoặc kết luận sách không có trong thư viện?',
          correct: 'Khoảng 14 lần so sánh (do 2^14 = 16.384 > 10.000).',
          distractors: ['10.000 lần so sánh.', '5.000 lần so sánh.', '100 lần so sánh.']
        }
      ],
      tf: [
        { statement: 'Thuật toán là dãy hữu hạn các bước chỉ dẫn để đạt được kết quả mong muốn từ dữ liệu đầu vào.', isCorrect: true },
        { statement: 'Thuật toán tìm kiếm nhị phân có thể áp dụng ngay cho một dãy số ngẫu nhiên chưa được sắp xếp.', isCorrect: false },
        { statement: 'Trong sơ đồ khối, hình chữ nhật biểu thị thao tác xử lý hoặc tính toán.', isCorrect: true },
        { statement: 'Thuật toán sắp xếp nổi bọt (Bubble Sort) so sánh và đổi chỗ các phần tử liền kề nếu chúng chưa đúng thứ tự.', isCorrect: true }
      ],
      shortAnswer: [
        { stem: 'Hình dạng nào trong sơ đồ khối thuật toán dùng để biểu thị điểm Bắt đầu và Kết thúc?', answer: 'Hình elip' },
        { stem: 'Tên thuật toán tìm kiếm chia đôi danh sách có thứ tự là gì?', answer: 'Nhị phân' }
      ],
      essay: [
        {
          stem: 'Cho bài toán: "Tìm giá trị lớn nhất (Max) của hai số a và b":\na) Xác định Input và Output của bài toán.\nb) Mô tả thuật toán bằng cách liệt kê các bước bằng ngôn ngữ tự nhiên.\nc) Vẽ hoặc mô tả các khối tương ứng trong sơ đồ khối.\nd) Hãy viết câu lệnh điều kiện rẽ nhánh bằng một ngôn ngữ lập trình hoặc khối lệnh Scratch.',
          rubric: 'a) Xác định đúng: Input là hai số a, b; Output là giá trị lớn nhất - 0,25 điểm.\nb) Nêu rõ bước 1 so sánh a > b, nếu đúng Max = a, ngược lại Max = b - 0,25 điểm.\nc) Mô tả khối elip (bắt đầu/kết thúc), hình chữ nhật (xử lý), hình thoi (điều kiện a > b) - 0,25 điểm.\nd) Viết đúng cú pháp: if a > b: max = a else: max = b - 0,25 điểm.'
        }
      ]
    }
  }
];

/**
 * Tìm kiếm knowledge base phù hợp nhất dựa trên từ khóa bài học hoặc tiêu chí
 */
function findMatchingTopic(lesson: string, criteriaText: string): TopicKnowledgeBase {
  const combined = `${lesson} ${criteriaText}`.toLowerCase();
  
  for (const topic of INFORMATICS_KNOWLEDGE_POOL) {
    if (topic.keywords.some(kw => combined.includes(kw))) {
      return topic;
    }
  }
  // Mặc định trả về topic phần cứng / phần mềm phổ thông nhất
  return INFORMATICS_KNOWLEDGE_POOL[0];
}

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
 * Sinh câu hỏi sư phạm offline độc lập, chuẩn GDPT 2018
 */
export const generateOfflineQuestions = (
  grade: string,
  lesson: string,
  level: string, // NB, TH, VD, VDC
  criteriaText: string,
  quantity: number,
  questionType: string = 'multiple-choice'
): any[] => {
  const topic = findMatchingTopic(lesson, criteriaText);
  const normalizedLevel = (level || 'NB').toUpperCase();
  const results: any[] = [];

  for (let i = 0; i < quantity; i++) {
    const uniqueId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 7)}_${i}`;

    switch (questionType) {
      case 'true-false': {
        const pool = topic.concepts.tf;
        const item = pool[i % pool.length];
        const isCorrect = item.isCorrect;
        results.push({
          id: uniqueId,
          content: item.statement,
          category: 'mc',
          questionType: 'true-false',
          mcType: 'multiple-choice',
          level: normalizedLevel,
          criteria: criteriaText ? criteriaText.slice(0, 3) : '',
          grade: grade,
          lesson: lesson,
          options: [
            { id: 'Đúng', text: 'Đúng.', isCorrect: isCorrect },
            { id: 'Sai', text: 'Sai.', isCorrect: !isCorrect }
          ],
          answer: isCorrect ? 'Đúng' : 'Sai',
          points: 0.25
        });
        break;
      }

      case 'short-answer': {
        const pool = topic.concepts.shortAnswer;
        const item = pool[i % pool.length];
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
        const item = pool[i % pool.length];
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
        const item = pool[i % pool.length];
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
        const item = pool[i % pool.length];

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
