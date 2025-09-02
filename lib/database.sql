-- 게시판 테이블 생성 SQL
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 게시글 테이블
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255),
  author VARCHAR(100),
  content TEXT NOT NULL,
  share_type VARCHAR(50) NOT NULL DEFAULT '업무공유',
  request_type VARCHAR(50),
  feedback_result VARCHAR(50),
  feedback_result_ip VARCHAR(64),
  feedback_result_updated_at TIMESTAMP WITH TIME ZONE,
  feedback_result_by VARCHAR(100),
  image_url TEXT,
  image_name VARCHAR(255),
  image_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_share_type_idx ON posts(share_type);

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author VARCHAR(100),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 게시글을 읽을 수 있도록 허용
CREATE POLICY "Anyone can read posts" ON posts
  FOR SELECT USING (true);

-- 모든 사용자가 게시글을 작성할 수 있도록 허용
CREATE POLICY "Anyone can insert posts" ON posts
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 게시글을 수정할 수 있도록 허용
CREATE POLICY "Anyone can update posts" ON posts
  FOR UPDATE USING (true);

-- 모든 사용자가 게시글을 삭제할 수 있도록 허용
CREATE POLICY "Anyone can delete posts" ON posts
  FOR DELETE USING (true);

-- 댓글 공개 정책
CREATE POLICY IF NOT EXISTS "Anyone can read comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

-- 게시글 다중 이미지 테이블
CREATE TABLE IF NOT EXISTS post_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name VARCHAR(255),
  image_size BIGINT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS post_images_post_id_idx ON post_images(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS post_images_post_order_idx ON post_images(post_id, order_index);

-- 피드백 결과 변경 로그
CREATE TABLE IF NOT EXISTS feedback_result_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  result VARCHAR(50) NOT NULL,
  result_by VARCHAR(100),
  result_ip VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_result_logs_post_id_idx ON feedback_result_logs(post_id);
CREATE INDEX IF NOT EXISTS feedback_result_logs_created_at_idx ON feedback_result_logs(created_at);

ALTER TABLE feedback_result_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feedback logs" ON feedback_result_logs;
DROP POLICY IF EXISTS "Anyone can insert feedback logs" ON feedback_result_logs;

CREATE POLICY "Anyone can read feedback logs" ON feedback_result_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert feedback logs" ON feedback_result_logs
  FOR INSERT WITH CHECK (true);

-- 피드백(주석 스냅샷) 테이블
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  annotation_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_post_order_idx ON feedbacks(post_id, order_index);
CREATE INDEX IF NOT EXISTS feedbacks_post_id_idx ON feedbacks(post_id);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read feedbacks" ON feedbacks
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can insert feedbacks" ON feedbacks
  FOR INSERT WITH CHECK (true);

-- 더미 데이터 삽입
INSERT INTO posts (title, content, share_type, image_url, image_name, image_size, created_at) VALUES
(
  'UI/UX 디자인 검토 요청',
  '새로운 프로젝트 UI/UX 디자인 검토 요청드립니다.

첨부된 목업 이미지를 확인해주시고, 사용자 경험 관점에서 개선사항이나 의견이 있으시면 공유해주세요.

특히 메인 화면의 네비게이션 구조와 색상 조합에 대한 피드백을 부탁드립니다.',
  '업무공유',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7sgqzrrLTsp4DsnbTsp4A8L3RleHQ+PC9zdmc+',
  'sample-image.svg',
  1024000,
  '2024-01-15 14:30:00+09'
);
