-- ==============================================================================
-- CƠ SỞ DỮ LIỆU CHUYÊN NGHIỆP CHO HỆ THỐNG QUẢN LÝ ĐỀ THI & MA TRẬN (EXAMMASTER)
-- Chuẩn PostgreSQL / Supabase / Cloud Database với Row-Level Security (RLS)
-- ==============================================================================

-- 1. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN (USERS & ROLES)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'reviewer', 'teacher')),
    department TEXT DEFAULT 'Tổ Tin học - Công nghệ',
    school TEXT DEFAULT 'THCS Lê Hồng Phong',
    avatar_url TEXT,
    provider TEXT DEFAULT 'google',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index tra cứu nhanh theo email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);


-- 2. BẢNG NGÂN HÀNG CÂU HỎI CHUẨN GDPT 2018 (QUESTION BANK)
CREATE TABLE IF NOT EXISTS public.question_bank (
    id TEXT PRIMARY KEY,
    grade TEXT NOT NULL,                          -- Khối lớp: '6', '7', '8', '9', '10', '11', '12'
    lesson TEXT NOT NULL,                         -- Tên bài học
    category TEXT NOT NULL CHECK (category IN ('mc', 'essay')),
    question_type TEXT NOT NULL DEFAULT 'multiple-choice' CHECK (question_type IN ('multiple-choice', 'multiple-answer', 'true-false', 'short-answer', 'essay')),
    mc_type TEXT DEFAULT 'multiple-choice',
    level TEXT NOT NULL CHECK (level IN ('NB', 'TH', 'VD', 'VDC')),
    criteria TEXT,                                -- Mã tiêu chí / YCCĐ (ví dụ "1.1", "TH7-C-004")
    content TEXT NOT NULL,                        -- Nội dung câu hỏi
    options JSONB DEFAULT '[]'::jsonb,            -- Danh sách phương án A, B, C, D kèm isCorrect
    answer TEXT,                                  -- Đáp án đúng hoặc hướng dẫn chấm
    points NUMERIC(4, 2) DEFAULT 0.25,            -- Trọng số điểm
    curriculum_attachment JSONB DEFAULT '{}'::jsonb, -- Thông tin ánh xạ chương trình GDPT 2018
    author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index tra cứu theo Khối lớp, Bài học, Mức độ nhận thức
CREATE INDEX IF NOT EXISTS idx_question_grade_lesson ON public.question_bank(grade, lesson);
CREATE INDEX IF NOT EXISTS idx_question_level ON public.question_bank(level);
CREATE INDEX IF NOT EXISTS idx_question_type ON public.question_bank(question_type);


-- 3. BẢNG HỒ SƠ ĐỀ THI & QUY TRÌNH DUYỆT ĐỀ (EXAMS & APPROVALS)
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    grade TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
    header_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    matrix_data JSONB,
    questions JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL,
    creator_role TEXT NOT NULL DEFAULT 'teacher',
    submitted_at TIMESTAMPTZ,
    submission_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    ai_review_score NUMERIC(5, 2),
    ai_review_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_grade ON public.exams(grade);


-- 4. BẢNG NHẬT KÝ KIỂM TOÁN DUYỆT ĐỀ (EXAM AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.exam_audit_logs (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'updated')),
    comment TEXT,
    previous_status TEXT,
    new_status TEXT,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_exam_id ON public.exam_audit_logs(exam_id);


-- 5. CHÍNH SÁCH BẢO MẬT PHÂN QUYỀN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_audit_logs ENABLE ROW LEVEL SECURITY;

-- Quyền đọc (SELECT): Mọi người dùng đã đăng nhập hoặc công khai nội bộ trường học đều đọc được ngân hàng đề & câu hỏi
CREATE POLICY "Public Read Access for Questions" ON public.question_bank FOR SELECT USING (true);
CREATE POLICY "Public Read Access for Exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Public Read Access for Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Read Access for Audit" ON public.exam_audit_logs FOR SELECT USING (true);

-- Quyền ghi câu hỏi: Mọi giáo viên đều có thể tạo và chỉnh sửa câu hỏi
CREATE POLICY "Teachers can insert/update questions" ON public.question_bank FOR ALL USING (true);

-- Quyền tạo đề & nộp đề: Giáo viên có thể tạo đề thi
CREATE POLICY "Teachers can insert/update exams" ON public.exams FOR ALL USING (true);

-- ==============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO (SEED DATA)
-- ==============================================================================
INSERT INTO public.users (id, email, name, role, department, school, provider) VALUES
('user_admin_01', 'admin@haichau.edu.vn', 'Thầy Lê Hoàng Phúc (Admin)', 'admin', 'Ban Giám Hiệu', 'Phòng GD&ĐT Hải Châu', 'google'),
('user_tt_01', 'totruong.mai@gmail.com', 'Cô Trần Thị Mai (Tổ trưởng)', 'reviewer', 'Tổ Tin học - Công nghệ', 'THCS Lê Hồng Phong', 'google'),
('user_gv_01', 'giaovien.an@gmail.com', 'ThS. Nguyễn Văn An (Giáo viên)', 'teacher', 'Tổ Tin học - Công nghệ', 'THCS Lê Hồng Phong', 'google')
ON CONFLICT (id) DO NOTHING;
