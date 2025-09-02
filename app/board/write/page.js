'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WritePost() {
  const router = useRouter();
  const [post, setPost] = useState({
    author: '',
    images: [], // [{file, url, name, size}]
    shareType: '업무공유',
    requestType: '컨펌요청',
    content: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 공통 파일 처리 로직
  const processImageFile = async (file) => {
    if (!file || !file.type?.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || '이미지 업로드에 실패했습니다.');
      }
      const data = await res.json();

      setPost((prev) => ({
        ...prev,
        images: [...prev.images, { file, url: data.imageUrl, name: data.originalName, size: data.size }],
      }));
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    for (const f of files) {
      if (f && f.type?.startsWith('image/')) {
        await processImageFile(f);
      }
    }
    if (event.target) event.target.value = '';
  };

  // 클립보드 붙여넣기 처리 (Ctrl/Cmd + V)
  const handlePasteImage = async (event) => {
    if (!event.clipboardData) return;
    const items = event.clipboardData.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type?.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          event.preventDefault();
          await processImageFile(file);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (post.images.length === 0 || !post.content.trim()) {
      alert('이미지와 요청내용을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: post.author || null,
          content: post.content,
          shareType: post.shareType,
          imageUrl: post.images[0]?.url || null,
          imageName: post.images[0]?.name || null,
          imageSize: post.images[0]?.size || null,
          requestType: post.requestType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게시글 작성에 실패했습니다.');
      }

      // 추가 이미지가 있으면 별도 API로 저장
      const created = await response.json().catch(()=>null);
      const postId = created?.post?.id;
      if (postId && post.images.length > 1) {
        const extra = post.images.slice(1).map(i => ({ url: i.url, name: i.name, size: i.size }));
        await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: extra })
        });
      }

      alert('게시글이 작성되었습니다.');
      router.push('/board');
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      alert(error.message);
    }
  };

  const handleCancel = () => {
    if (post.image || post.content.trim()) {
      if (confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
        router.push('/board');
      }
    } else {
      router.push('/board');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">게시글 작성</h1>
              <p className="text-gray-600 mt-2">새로운 업무 공유 게시글을 작성하세요</p>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              목록으로
            </button>
          </div>
        </div>

        {/* 작성 폼 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 작성자 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                작성자 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={post.author}
                onChange={(e)=>setPost(prev=>({...prev, author: e.target.value }))}
                placeholder="작성자명을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                이미지 <span className="text-red-500">*</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                onPaste={handlePasteImage}
              >
                <div className="space-y-4">
                  {post.images.length === 0 ? (
                    <>
                      <div className="text-gray-400 text-6xl">📷</div>
                      <p className="text-gray-600">이미지를 업로드하거나, 클립보드에서 Ctrl+V로 붙여넣기</p>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {post.images.map((img, idx) => (
                        <div key={idx} className="w-32 h-32 mx-auto relative rounded-lg overflow-hidden border">
                          <Image src={img.url} alt={`업로드 이미지 ${idx+1}`} fill className="object-cover" sizes="128px" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        uploading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {uploading ? '업로드 중...' : '이미지 선택(복수 가능)'}
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 업무 종류 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                업무 종류 <span className="text-red-500">*</span>
              </label>
              <select
                value={post.shareType}
                onChange={(e) => setPost(prev => ({ ...prev, shareType: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="업무공유">업무공유</option>
                <option value="시안피드백요청">시안피드백요청</option>
                <option value="샘플피드백요청">샘플피드백요청</option>
                <option value="양산피드백요청">양산피드백요청</option>
              </select>
            </div>

            {/* 요청내용(추가) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                요청내용(추가) <span className="text-red-500">*</span>
              </label>
              <select
                value={post.requestType}
                onChange={(e) => setPost(prev => ({ ...prev, requestType: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="컨펌요청">컨펌요청</option>
                <option value="피드백요청">피드백요청</option>
              </select>
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={post.content}
                onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                placeholder="내용을 자세히 입력해주세요..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                {post.content.length}/1000자
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                작성완료
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}