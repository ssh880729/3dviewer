import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 빌드 시 환경변수 미설정으로 인한 크래시 방지: import 시에는 throw 하지 않음
// 실제 사용 시점에만 경고 또는 오류가 나도록 방어
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Supabase] URL/AnonKey가 설정되지 않았습니다. 개발 중에는 null을 반환합니다.');
    }
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
})();

// 서버용 Supabase 인스턴스 (Service Role Key 사용)
export const createServerSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !(serviceRoleKey || anon)) {
    // 런타임 사용 시점의 확실한 에러
    throw new Error('Supabase 환경변수가 설정되지 않았습니다. 프로젝트 설정(NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY)을 확인하세요.');
  }

  return createClient(url, serviceRoleKey || anon);
};
