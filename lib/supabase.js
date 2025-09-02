import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL과 Anon Key가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
}

// 클라이언트용 Supabase 인스턴스
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버용 Supabase 인스턴스 (Service Role Key 사용)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.warn('Service Role Key가 설정되지 않았습니다. 일부 서버 기능이 제한될 수 있습니다.');
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
};
