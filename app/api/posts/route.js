import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 게시글 목록 조회
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('게시글 조회 오류:', error);
      return NextResponse.json(
        { error: '게시글을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 순번 추가 (최신 게시글이 1번)
    const postsWithNumber = posts.map((post, index) => ({
      ...post,
      number: index + 1
    }));

    return NextResponse.json({ posts: postsWithNumber });
  } catch (error) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 게시글 작성
export async function POST(request) {
  try {
    const body = await request.json();
    const { content, shareType, imageUrl, imageName, imageSize, requestType, feedbackResult, author } = body;

    if (!content || !shareType) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { data: post, error } = await supabase
      .from('posts')
      .insert([
        {
          content: content.trim(),
          author: author || null,
          share_type: shareType,
          request_type: requestType || null,
          feedback_result: feedbackResult || null,
          image_url: imageUrl,
          image_name: imageName,
          image_size: imageSize
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('게시글 작성 오류:', error);
      return NextResponse.json(
        { error: '게시글 작성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
