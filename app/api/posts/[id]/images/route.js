import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 목록
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('post_images')
      .select('*')
      .eq('post_id', params.id)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ images: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '이미지 목록 실패' }, { status: 500 });
  }
}

// 등록 (여러 장)
export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { images } = body; // [{ url, name, size }]
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    // 마지막 순번
    const { data: last } = await supabase
      .from('post_images')
      .select('order_index')
      .eq('post_id', params.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();
    let start = (last?.order_index || 0) + 1;

    const rows = images.map((img, i) => ({
      post_id: params.id,
      image_url: img.url,
      image_name: img.name || null,
      image_size: img.size || null,
      order_index: start + i,
    }));

    const { data, error } = await supabase
      .from('post_images')
      .insert(rows)
      .select();
    if (error) throw error;
    return NextResponse.json({ images: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '이미지 저장 실패' }, { status: 500 });
  }
}


