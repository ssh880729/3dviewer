import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 댓글 목록 조회
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('댓글 조회 오류:', error);
      return NextResponse.json({ error: '댓글 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    console.error('서버 오류:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 댓글 작성
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { author, content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: id,
          author: author?.trim() || null,
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('댓글 작성 오류:', error);
      return NextResponse.json({ error: '댓글 작성 실패' }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    console.error('서버 오류:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}


