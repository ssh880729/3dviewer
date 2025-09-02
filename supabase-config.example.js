// Supabase 설정 예시
// 실제 사용 시에는 .env.local 파일을 생성하고 아래 값들을 설정하세요

export const supabaseConfig = {
  url: 'your_supabase_project_url',
  anonKey: 'your_supabase_anon_key',
  serviceRoleKey: 'your_supabase_service_role_key'
};

// .env.local 파일 예시:
/*
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
*/
