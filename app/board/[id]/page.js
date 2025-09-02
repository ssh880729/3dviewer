'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import AnnotationLayer from '@/components/AnnotationLayer';

export default function PostDetail() {
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [tool, setTool] = useState('none');
  const [penColor, setPenColor] = useState('#000000');
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editShareType, setEditShareType] = useState('');
  const [editRequestType, setEditRequestType] = useState('');
  const [editContent, setEditContent] = useState('');

  // 게시글 상세 정보 불러오기
  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');
      
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const foundPost = data.posts.find(p => p.id === params.id);
      
      if (!foundPost) {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      
      setPost(foundPost);
      setEditShareType(foundPost.share_type || '업무공유');
      setEditRequestType(foundPost.request_type || '');
      setEditContent(foundPost.content || '');
      setError(null);
    } catch (err) {
      console.error('게시글 로드 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 댓글 불러오기
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/comments`);
      if (!res.ok) throw new Error('댓글을 불러오지 못했습니다.');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 피드백 불러오기
  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/feedbacks`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        console.warn('피드백을 불러오지 못했습니다:', e?.error || res.status);
        setFeedbacks([]);
        return;
      }
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 게시글 삭제
  const deletePost = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('게시글 삭제에 실패했습니다.');
      }

      alert('게시글이 삭제되었습니다.');
      router.push('/board');
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
      alert(err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (params.id) {
      fetchPost();
      fetchComments();
      fetchFeedbacks();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⏳</div>
            <p className="text-gray-500 text-lg">게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <p className="text-red-500 text-lg">{error}</p>
            <div className="mt-6 space-x-4">
              <button 
                onClick={fetchPost}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
              <button 
                onClick={() => router.push('/board')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">게시글 상세보기</h1>
              <p className="text-gray-600 mt-2">게시글 #{post.number}</p>
            </div>
            <button
              onClick={() => router.push('/board')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              목록으로
            </button>
          </div>
        </div>

        {/* 게시글 내용 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 게시글 정보 헤더 */}
          <div className="border-b bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  post.share_type === '업무공유' ? 'bg-blue-100 text-blue-800' :
                  post.share_type === '문제해결' ? 'bg-red-100 text-red-800' :
                  post.share_type === '아이디어' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {post.share_type}
                </span>
                <div className="text-sm text-gray-600">
                  {new Date(post.created_at).toLocaleDateString('ko-KR')} {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                >
                  {editing ? '수정 취소' : '수정'}
                </button>
                <button
                  onClick={deletePost}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>

          {/* 이미지: 메인 + 추가 이미지들 */}
          {post.image_url && (
            <div className="p-6 border-b">
              {/* 툴바: 상단 오른쪽 배치 */}
              <div className="mb-2 flex justify-end">
                <div className="bg-white/90 rounded px-3 py-2 text-sm flex items-center gap-2 shadow-sm">
                  <button
                    className={`w-9 h-9 rounded-full border grid place-items-center text-lg ${tool === 'pen' ? 'bg-foreground text-background' : ''}`}
                    onClick={() => setTool(tool === 'pen' ? 'none' : 'pen')}
                    title="펜"
                    aria-label="펜"
                  >✏️</button>
                  <button
                    className={`w-9 h-9 rounded-full border grid place-items-center text-lg ${tool === 'arrow' ? 'bg-foreground text-background' : ''}`}
                    onClick={() => setTool(tool === 'arrow' ? 'none' : 'arrow')}
                    title="화살표"
                    aria-label="화살표"
                  >➤</button>
                  <button
                    className={`w-9 h-9 rounded-full border grid place-items-center text-base ${tool === 'text' ? 'bg-foreground text-background' : ''}`}
                    onClick={() => setTool(tool === 'text' ? 'none' : 'text')}
                    title="텍스트"
                    aria-label="텍스트"
                  >Ｔ</button>
                  <button
                    className="w-9 h-9 rounded-full border grid place-items-center text-lg"
                    onClick={() => window.__boardAnnoApi?.clear()}
                    title="지우개(전체)"
                    aria-label="지우개(전체)"
                  >🧽</button>
                  <button
                    className="w-9 h-9 rounded-full border grid place-items-center text-lg"
                    onClick={() => setTool('eraser')}
                    title="지우개(지정)"
                    aria-label="지우개(지정)"
                  >🪥</button>
                  {tool === 'pen' && (
                    <div className="flex items-center gap-1 ml-1">
                      <button className={`w-5 h-5 rounded-full border ${penColor==="#000000"?"ring-2 ring-black":""}`} style={{background:'#000000'}} onClick={() => setPenColor('#000000')} title="검정" aria-label="검정" />
                      <button className={`w-5 h-5 rounded-full border ${penColor==="#ff0000"?"ring-2 ring-black":""}`} style={{background:'#ff0000'}} onClick={() => setPenColor('#ff0000')} title="빨강" aria-label="빨강" />
                      <button className={`w-5 h-5 rounded-full border ${penColor==="#0066ff"?"ring-2 ring-black":""}`} style={{background:'#0066ff'}} onClick={() => setPenColor('#0066ff')} title="파랑" aria-label="파랑" />
                      <button className={`w-5 h-5 rounded-full border ${penColor==="#ffcc00"?"ring-2 ring-black":""}`} style={{background:'#ffcc00'}} onClick={() => setPenColor('#ffcc00')} title="노랑" aria-label="노랑" />
                      <button className={`w-5 h-5 rounded-full border ${penColor==="#ffffff"?"ring-2 ring-black":""}`} style={{background:'#ffffff'}} onClick={() => setPenColor('#ffffff')} title="화이트" aria-label="화이트" />
                    </div>
                  )}
                  <button
                    className="h-9 px-3 rounded border grid place-items-center text-xs bg-blue-600 text-white hover:bg-blue-700"
                    onClick={async ()=>{
                      try{
                        const dataUrl = window.__boardAnnoApi?.getPNG?.();
                        if(!dataUrl){
                          alert('저장할 주석이 없습니다.');
                          return;
                        }
                        const res = await fetch(`/api/posts/${params.id}/feedbacks`,{
                          method:'POST',
                          headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({ annotationUrl: dataUrl })
                        });
                        if(!res.ok){
                          const e = await res.json().catch(()=>({}));
                          throw new Error(e.error||'저장 실패');
                        }
                        await fetchFeedbacks();
                      }catch(err){
                        alert(err.message||'오류가 발생했습니다.');
                      }
                    }}
                    title="피드백 저장"
                    aria-label="피드백 저장"
                  >피드백 저장</button>
                </div>
              </div>

              {/* 메인 이미지 + 주석 레이어 */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                <div className="relative w-full">
                  <div className="relative max-h-[70vh]">
                    <Image
                      src={post.image_url}
                      alt="게시글 이미지"
                      width={800}
                      height={600}
                      className="w-full h-auto max-h-[70vh] object-contain"
                      style={{ objectFit: 'contain' }}
                    />
                    {/* 주석 레이어 */}
                    {!activeFeedbackId && (
                      <AnnotationLayer
                        activeTool={tool}
                        color={penColor}
                        onReady={(api) => (window.__boardAnnoApi = api)}
                      />
                    )}
                    {activeFeedbackId && (
                      <img
                        src={(feedbacks.find((x)=>x.id===activeFeedbackId)||{}).annotation_url || ''}
                        alt="저장된 피드백"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />
                    )}
                  </div>
                  {/* (요청) 이미지 위 툴셋 제거됨 */}

                  {/* 저장된 피드백 인디케이터(숫자 버튼) */}
                  {feedbacks?.length > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {feedbacks.map((f)=> (
                        <button
                          key={f.id}
                          onClick={() => setActiveFeedbackId(activeFeedbackId===f.id ? null : f.id)}
                          className={`w-8 h-8 rounded-full text-white text-xs font-semibold ${activeFeedbackId===f.id ? 'bg-blue-600' : 'bg-black/70 hover:bg-black/80'}`}
                          title={`피드백 ${f.order_index}`}
                          aria-label={`피드백 ${f.order_index}`}
                        >
                          {f.order_index}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 추가 이미지 그리드 (2열; 2개 초과 시 다음 줄) */}
              <PostExtraImages postId={post.id} />
              {post.image_name && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">파일명:</span> {post.image_name}
                  {post.image_size && (
                    <span className="ml-4">
                      <span className="font-medium">크기:</span> {formatFileSize(post.image_size)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 내용 / 수정 */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editing ? '게시글 수정' : '내용'}</h3>
            {editing ? (
              <div className="space-y-4">
                {/* 업무 종류 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">업무 종류</label>
                  <select
                    value={editShareType}
                    onChange={(e)=>setEditShareType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="업무공유">업무공유</option>
                    <option value="시안피드백요청">시안피드백요청</option>
                    <option value="샘플피드백요청">샘플피드백요청</option>
                    <option value="양산피드백요청">양산피드백요청</option>
                  </select>
                </div>
                {/* 요청내용(추가) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">요청내용(추가)</label>
                  <select
                    value={editRequestType}
                    onChange={(e)=>setEditRequestType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택 안 함</option>
                    <option value="컨펌요청">컨펌요청</option>
                    <option value="피드백요청">피드백요청</option>
                  </select>
                </div>
                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                  <textarea
                    value={editContent}
                    onChange={(e)=>setEditContent(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={async ()=>{
                      try{
                        const res = await fetch(`/api/posts/${params.id}`,{
                          method:'PUT',
                          headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({
                            content: editContent,
                            shareType: editShareType,
                            requestType: editRequestType || null,
                            imageUrl: post.image_url,
                            imageName: post.image_name,
                            imageSize: post.image_size,
                          })
                        });
                        if(!res.ok){
                          const e = await res.json().catch(()=>({}));
                          throw new Error(e.error||'수정 실패');
                        }
                        await fetchPost();
                        setEditing(false);
                      }catch(err){
                        alert(err.message||'오류가 발생했습니다.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
              </div>
              <hr className="my-4 border-t" />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">피드백결과</label>
                <div className="flex items-center gap-2">
                  <select
                    value={post.feedback_result || ''}
                    onChange={async (e)=>{
                      try{
                        const val = e.target.value || null;
                        const res = await fetch(`/api/posts/${params.id}`,{
                          method:'PUT',
                          headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({
                            content: post.content,
                            shareType: post.share_type,
                            requestType: post.request_type,
                            feedbackResult: val,
                            imageUrl: post.image_url,
                            imageName: post.image_name,
                            imageSize: post.image_size,
                          })
                        });
                        if(!res.ok){
                          const ejson = await res.json().catch(()=>({}));
                          throw new Error(ejson.error||'저장 실패');
                        }
                        await fetchPost();
                      }catch(err){
                        alert(err.message||'오류가 발생했습니다.');
                      }
                    }}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택 안 함</option>
                    <option value="재수정요청">재수정요청</option>
                    <option value="샘플진행">샘플진행</option>
                    <option value="양산진행">양산진행</option>
                  </select>
                </div>
              </div>
              </>
            )}
          </div>

          {/* 댓글 */}
          <div className="px-6 py-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">댓글</h3>

            {/* 댓글 작성 */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4 border">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="이름 (선택)"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="댓글 내용을 입력하세요..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={3}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    disabled={commentSubmitting || !commentContent.trim()}
                    onClick={async () => {
                      if (!commentContent.trim()) return;
                      try {
                        setCommentSubmitting(true);
                        const res = await fetch(`/api/posts/${params.id}/comments`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ author: commentAuthor, content: commentContent }),
                        });
                        if (!res.ok) {
                          const e = await res.json().catch(() => ({}));
                          throw new Error(e.error || '댓글 작성 실패');
                        }
                        setCommentAuthor('');
                        setCommentContent('');
                        await fetchComments();
                      } catch (err) {
                        alert(err.message || '오류가 발생했습니다.');
                      } finally {
                        setCommentSubmitting(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-md text-white ${commentSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {commentSubmitting ? '작성 중...' : '작성'}
                  </button>
                </div>
              </div>
            </div>

            {/* 댓글 목록 */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500">아직 작성된 댓글이 없습니다.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{c.author || '익명'}</span>
                        <span className="text-gray-400 ml-2 text-xs">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                      <button
                        onClick={async ()=>{
                          if(!confirm('댓글을 삭제할까요?')) return;
                          try{
                            const res = await fetch(`/api/posts/${params.id}/comments/${c.id}`,{method:'DELETE'});
                            if(!res.ok){
                              const e = await res.json().catch(()=>({}));
                              throw new Error(e.error||'댓글 삭제 실패');
                            }
                            await fetchComments();
                          }catch(err){
                            alert(err.message||'오류가 발생했습니다.');
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap text-sm">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {post.updated_at && post.updated_at !== post.created_at && (
                  <span>
                    수정됨: {new Date(post.updated_at).toLocaleDateString('ko-KR')} {new Date(post.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/board')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  목록으로
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostExtraImages({ postId }) {
  const [images, setImages] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/images`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setImages(data.images || []);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [postId]);

  if (!images.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((img) => (
        <div key={img.id} className="relative w-full pb-[56%] bg-gray-100 rounded overflow-hidden">
          <img src={img.image_url} alt={img.image_name || '추가 이미지'} className="absolute inset-0 w-full h-full object-contain" />
        </div>
      ))}
    </div>
  );
}
