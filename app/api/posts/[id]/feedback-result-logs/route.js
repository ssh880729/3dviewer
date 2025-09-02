import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 목록 조회
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('feedback_result_logs')
      .select('*')
      .eq('post_id', params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ logs: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '로그 조회 실패' }, { status: 500 });
  }
}


