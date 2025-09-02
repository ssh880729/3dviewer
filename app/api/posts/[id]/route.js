import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 게시글 삭제
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('게시글 삭제 오류:', error);
      return NextResponse.json(
        { error: '게시글 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 게시글 수정
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { content, shareType, imageUrl, imageName, imageSize, requestType, feedbackResult, feedbackBy, author } = body;

    if (!id) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!content || !shareType) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 클라이언트 IP 추출 (X-Forwarded-For 우선)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || null;
    
    const { data: post, error } = await supabase
      .from('posts')
      .update({
        content: content.trim(),
        author: author ?? null,
        share_type: shareType,
        request_type: requestType ?? null,
        feedback_result: feedbackResult ?? null,
        feedback_result_by: feedbackResult != null ? (feedbackBy || null) : undefined,
        feedback_result_ip: feedbackResult != null ? ip : undefined,
        feedback_result_updated_at: feedbackResult != null ? new Date().toISOString() : undefined,
        image_url: imageUrl,
        image_name: imageName,
        image_size: imageSize,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('게시글 수정 오류:', error);
      return NextResponse.json(
        { error: '게시글 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 로그 기록 (결과 변경이 포함된 경우)
    if (feedbackResult != null) {
      const { error: logErr } = await supabase
        .from('feedback_result_logs')
        .insert([{ post_id: id, result: feedbackResult, result_by: feedbackBy || null, result_ip: ip }]);
      if (logErr) console.warn('피드백 로그 기록 실패:', logErr);
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
