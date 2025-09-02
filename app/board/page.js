'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Board() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 업로드 관련 기능 제거됨

  // 게시글 목록 불러오기
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');
      
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setPosts(data.posts || []);
      setError(null);
    } catch (err) {
      console.error('게시글 로드 오류:', err);
      setError(err && err.message ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  // 업로드 핸들러 제거됨

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostClick = (post) => {
    router.push(`/board/${post.id}`);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const deletePost = async (postId) => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('게시글 삭제에 실패했습니다.');
      }

      // 게시글 목록 새로고침
      await fetchPosts();
      
      // 모달이 열려있다면 닫기
      if (selectedImage && selectedImage.id === postId) {
        setSelectedImage(null);
      }

      alert('게시글이 삭제되었습니다.');
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
      alert(err && err.message ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">원스텝테크 2D 업무공유 시스템</h1>
            <p className="text-gray-600 mt-2">이미지를 업로드하고 공유하세요</p>
          </div>
        </div>

        {/* 이미지 선택/삭제 UI 제거 */}

        {/* 업무 작성 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/board/write')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            업무 작성
          </button>
        </div>

        {/* 게시글 개수 표시 */}
        <div className="mb-4">
          <p className="text-gray-600">총 {posts.length}개의 게시글</p>
        </div>
      </div>

      {/* 게시판 테이블 */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⏳</div>
            <p className="text-gray-500 text-lg">게시글을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <p className="text-red-500 text-lg">{error}</p>
            <button 
              onClick={fetchPosts}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <p className="text-gray-500 text-lg">아직 작성된 게시글이 없습니다</p>
            <p className="text-gray-400">게시글을 작성해서 시작해보세요</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">순번</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">작성일자</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">작성자</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">이미지</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">공유종류</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">요청내용</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">피드백결과</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">내용</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handlePostClick(p)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div>{new Date(p.created_at).toLocaleDateString('ko-KR')}</div>
                      <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{p.author || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.image_url ? (
                        <div className="w-16 h-16 relative rounded-lg overflow-hidden border">
                          <Image src={p.image_url} alt="게시글 이미지" fill className="object-cover" sizes="64px" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"><span className="text-gray-400 text-xs">이미지 없음</span></div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        p.share_type === '업무공유' ? 'bg-blue-100 text-blue-800' :
                        p.share_type === '문제해결' ? 'bg-red-100 text-red-800' :
                        p.share_type === '아이디어' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{p.share_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.request_type ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{p.request_type}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.feedback_result ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">{p.feedback_result}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="truncate max-w-[360px]" title={p.content}>{p.content}</div>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
