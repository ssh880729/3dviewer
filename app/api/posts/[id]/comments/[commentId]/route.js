import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 댓글 삭제
export async function DELETE(request, { params }) {
  try {
    const { id, commentId } = params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('post_id', id);

    if (error) {
      console.error('댓글 삭제 오류:', error);
      return NextResponse.json({ error: '댓글 삭제 실패' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('서버 오류:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}


