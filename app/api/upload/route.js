export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

// 간단한 고유 파일명 생성기
function generateFileName(originalName = '') {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const dot = originalName.lastIndexOf('.');
  const ext = dot >= 0 ? originalName.slice(dot) : '.png';
  return `${ts}_${rand}${ext}`;
}

async function uploadToCafe24FTP(buffer, originalName) {
  const { CAFE24_FTP_HOST, CAFE24_FTP_USER, CAFE24_FTP_PASSWORD, CAFE24_FTP_PORT, CAFE24_DOMAIN } = process.env;
  if (!CAFE24_FTP_HOST || !CAFE24_FTP_USER || !CAFE24_FTP_PASSWORD || !CAFE24_DOMAIN) {
    throw new Error('FTP 환경변수 누락');
  }
  const FTPModule = await import('ftp');
  const FTP = FTPModule.default || FTPModule;
  const client = new FTP();
  const fileName = generateFileName(originalName);
  const remotePath = `/www/uploads/${fileName}`;
  await new Promise((resolve, reject) => {
    client.on('ready', () => {
      client.put(buffer, remotePath, (err) => {
        if (err) { client.end(); return reject(err); }
        client.end(); resolve(true);
      });
    });
    client.on('error', reject);
    client.connect({ host: CAFE24_FTP_HOST, user: CAFE24_FTP_USER, password: CAFE24_FTP_PASSWORD, port: Number(CAFE24_FTP_PORT || 21) });
  });
  return { url: `${CAFE24_DOMAIN}/uploads/${fileName}`, fileName };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) return NextResponse.json({ error: '파일이 선택되지 않았습니다.' }, { status: 400 });
    if (!file.type?.startsWith('image/')) return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 카페24 FTP로만 업로드
    const { url, fileName } = await uploadToCafe24FTP(buffer, file.name);
    return NextResponse.json({ success: true, imageUrl: url, fileName, originalName: file.name, size: file.size });
  } catch (err) {
    console.error('업로드 오류:', err);
    return NextResponse.json({ error: '파일 업로드에 실패했습니다. (Cafe24)' }, { status: 500 });
  }
}


