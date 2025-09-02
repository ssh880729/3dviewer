import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 목록 조회
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('post_id', params.id)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ feedbacks: data || [] });
  } catch (err) {
    console.error('피드백 조회 오류:', err);
    return NextResponse.json({ error: '피드백 조회 실패' }, { status: 500 });
  }
}

// 저장
export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { orderIndex, annotationUrl } = body;
    if (!annotationUrl) return NextResponse.json({ error: 'annotationUrl 누락' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // 다음 순번 계산 (클라이언트가 보냈으면 사용, 없으면 서버에서 계산)
    let finalOrder = orderIndex;
    if (typeof finalOrder !== 'number') {
      const { data: existing } = await supabase
        .from('feedbacks')
        .select('order_index')
        .eq('post_id', params.id)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      finalOrder = (existing?.order_index || 0) + 1;
    }

    const { data, error } = await supabase
      .from('feedbacks')
      .insert([{ post_id: params.id, order_index: finalOrder, annotation_url: annotationUrl }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (err) {
    console.error('피드백 저장 오류:', err);
    return NextResponse.json({ error: '피드백 저장 실패' }, { status: 500 });
  }
}


