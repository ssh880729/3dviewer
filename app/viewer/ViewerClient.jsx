"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ModelViewer from "@/components/ModelViewer";
import AnnotationLayer from "@/components/AnnotationLayer";

export default function ViewerClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [url, setUrl] = useState("");
	const [currentUrl, setCurrentUrl] = useState("");
	const [filename, setFilename] = useState("");
	const [lockCamera, setLockCamera] = useState(false);
	const [tool, setTool] = useState("none"); // none | pen | text | eraser
	const [penColor, setPenColor] = useState("#000000");
	const [error, setError] = useState("");
	const [sourceMode, setSourceMode] = useState(""); // "url" | "local" | ""
	const fileInputRef = useRef(null);
	const [files, setFiles] = useState([]);
	const [status, setStatus] = useState({ type: "idle", text: "" });
	const [az, setAz] = useState(45);
	const [el, setEl] = useState(60);
	const [light, setLight] = useState(1);
	const [paintColor, setPaintColor] = useState("#ff6600");

	useEffect(() => {
		const u = searchParams.get("url") || "";
		setUrl(u);
		setCurrentUrl(u);
	}, [searchParams]);

	function onSubmit(e) {
		e.preventDefault();
		setError("");
		const next = new URL(window.location.href);
		if (url) {
			next.searchParams.set("url", url);
		} else {
			next.searchParams.delete("url");
		}
		router.push(next.pathname + next.search);
		setCurrentUrl(url);
		setFilename("");
		setFiles([]);
	}

	function onFileChange(e) {
		const list = Array.from(e.target.files || []);
		if (!list.length) return;
		setError("");
		setFiles(list);
		const primary = list[0];
		setFilename(primary?.name || "");
		if (primary) {
			const objectUrl = URL.createObjectURL(primary);
			setCurrentUrl(objectUrl);
		}
		setUrl("");
	}

	function captureScene() {
		try {
			const viewerCanvas = window.__viewerApi?.getCanvas?.() || document.querySelector("canvas");
			const annoCanvas = window.__annoApi?.getCanvas?.();
			if (!viewerCanvas) return;
			const w = viewerCanvas.clientWidth;
			const h = viewerCanvas.clientHeight;
			const dpr = Math.max(1, window.devicePixelRatio || 1);
			const out = document.createElement("canvas");
			out.width = Math.floor(w * dpr);
			out.height = Math.floor(h * dpr);
			out.style.width = `${w}px`;
			out.style.height = `${h}px`;
			const ctx = out.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.drawImage(viewerCanvas, 0, 0, w, h);
			if (annoCanvas) ctx.drawImage(annoCanvas, 0, 0, w, h);
			const data = out.toDataURL("image/png");
			const a = document.createElement("a");
			a.href = data;
			a.download = `screenshot-${Date.now()}.png`;
			a.click();
		} catch (err) {
			console.error(err);
			setError("화면 캡처에 실패했습니다.");
		}
	}

	return (
		<div className="min-h-screen p-6 flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">원스텝테크 3D 업무공유 시스템</h1>
			<div className="inline-block self-start rounded-lg border bg-white px-4 py-3 shadow-sm">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">3D 파일 로드방법</span>
					<div className="inline-flex items-center rounded-full border overflow-hidden">
						<button
							className={`px-4 py-1 text-sm ${sourceMode === "url" ? "bg-foreground text-background" : "bg-white"}`}
							onClick={() => setSourceMode(sourceMode === "url" ? "" : "url")}
						>
							URL
						</button>
						<button
							className={`px-4 py-1 text-sm ${sourceMode === "local" ? "bg-foreground text-background" : "bg-white"}`}
							onClick={() => {
								setSourceMode("local");
								fileInputRef.current?.click();
							}}
						>
							로컬
						</button>
					</div>
				</div>
				{sourceMode === "url" && (
					<form onSubmit={onSubmit} className="mt-3 flex gap-2 items-center">
						<input
							type="url"
							placeholder="파일 URL을 입력하세요 (glb/gltf/obj/stl/fbx)"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							className="flex-1 border rounded px-3 py-2 bg-transparent"
						/>
						<button type="submit" className="px-4 py-2 rounded bg-foreground text-background">
							불러오기
						</button>
					</form>
				)}
				<input ref={fileInputRef} type="file" accept="*/*" multiple onChange={onFileChange} className="hidden" />
			</div>
			{/* 카메라 고정 토글은 렌더 화면 좌측 상단으로 이동 */}
			<div className="flex items-center gap-3 text-sm">
				<button className="px-3 py-1 rounded border" onClick={() => captureScene()}>화면 캡처</button>
				{status?.text ? (
					<span className={`px-2 py-1 rounded ${status.type === 'error' ? 'text-red-700' : 'text-black/70'}`}>{status.text}</span>
				) : null}
			</div>
			{error ? (
				<p className="text-red-600 text-sm">{error}</p>
			) : null}
			<div className="flex-1 min-h-[500px] border rounded overflow-hidden bg-white shadow-sm">
				{currentUrl ? (
					<div className="relative h-full">
						<ModelViewer
							url={currentUrl}
							filename={filename}
							files={files}
							onError={(msg) => setError(msg)}
							lockCamera={lockCamera}
							onReady={(api) => (window.__viewerApi = api)}
							onStatus={(s) => setStatus(s)}
							lightAzimuthDeg={az}
							lightElevationDeg={el}
							lightIntensity={light}
						/>
						<AnnotationLayer activeTool={tool} color={penColor} onReady={(api) => (window.__annoApi = api)} />
						<div className="absolute top-3 left-3 bg-white/80 rounded px-3 py-2 text-sm flex flex-col gap-2">
							<div className="flex items-center gap-2">
								<label>카메라 고정</label>
								<input type="checkbox" checked={lockCamera} onChange={(e) => setLockCamera(e.target.checked)} />
							</div>
							<div className="flex items-center gap-2">
								<button
									className={`w-9 h-9 rounded-full border grid place-items-center text-lg ${tool === "pen" ? "bg-foreground text-background" : ""}`}
									onClick={() => setTool(tool === "pen" ? "none" : "pen")}
									title="펜"
									aria-label="펜"
								>✏️</button>
								<button
									className={`w-9 h-9 rounded-full border grid place-items-center text-base ${tool === "text" ? "bg-foreground text-background" : ""}`}
									onClick={() => setTool(tool === "text" ? "none" : "text")}
									title="텍스트"
									aria-label="텍스트"
								>Ｔ</button>
								<button
									className="w-9 h-9 rounded-full border grid place-items-center text-lg"
									onClick={() => window.__annoApi?.clear()}
									title="지우개(전체)"
									aria-label="지우개(전체)"
								>🧽</button>
								<button
									className="w-9 h-9 rounded-full border grid place-items-center text-lg"
									onClick={() => {
										setTool('eraser');
									}}
									title="지우개(지정)"
									aria-label="지우개(지정)"
								>🪥</button>
								{tool === "pen" && (
									<div className="flex items-center gap-1 ml-1">
										<button className={`w-5 h-5 rounded-full border ${penColor==="#000000"?"ring-2 ring-black":""}`} style={{background:'#000000'}} onClick={() => setPenColor('#000000')} title="검정" aria-label="검정" />
										<button className={`w-5 h-5 rounded-full border ${penColor==="#ff0000"?"ring-2 ring-black":""}`} style={{background:'#ff0000'}} onClick={() => setPenColor('#ff0000')} title="빨강" aria-label="빨강" />
										<button className={`w-5 h-5 rounded-full border ${penColor==="#0066ff"?"ring-2 ring-black":""}`} style={{background:'#0066ff'}} onClick={() => setPenColor('#0066ff')} title="파랑" aria-label="파랑" />
										<button className={`w-5 h-5 rounded-full border ${penColor==="#ffcc00"?"ring-2 ring-black":""}`} style={{background:'#ffcc00'}} onClick={() => setPenColor('#ffcc00')} title="노랑" aria-label="노랑" />
										<button className={`w-5 h-5 rounded-full border ${penColor==="#ffffff"?"ring-2 ring-black":""}`} style={{background:'#ffffff'}} onClick={() => setPenColor('#ffffff')} title="화이트" aria-label="화이트" />
									</div>
								)}
							</div>
							<div className="mt-2 flex gap-3">
								<div className="flex flex-col items-start gap-1">
									<span className="opacity-70 text-xs">조명 ZI</span>
									<input type="range" min="0" max="360" value={az} onChange={(e)=>setAz(Number(e.target.value))} />
									<span className="text-xs">{az}°</span>
								</div>
								<div className="flex flex-col items-start gap-1">
									<span className="opacity-70 text-xs">조명 EI</span>
									<input type="range" min="0" max="90" value={el} onChange={(e)=>setEl(Number(e.target.value))} />
									<span className="text-xs">{el}°</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="opacity-70 text-xs">도색</span>
									<input type="color" value={paintColor} onChange={(e)=>{ const v=e.target.value; setPaintColor(v); window.__viewerApi?.applySelectedColor?.(v); }} />
									<button className="px-2 py-1 rounded border text-xs" onClick={()=>window.__viewerApi?.applySelectedColor?.(paintColor)}>적용</button>
									<label className="ml-2 text-xs opacity-70 border rounded px-2 py-1 cursor-pointer">
										텍스처 선택
										<input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; window.__viewerApi?.applySelectedTextureFromFile?.(f); e.currentTarget.value=""; }} />
									</label>
									<button className="px-2 py-1 rounded border text-xs" onClick={()=>window.__viewerApi?.clearSelectedTexture?.()}>텍스처 제거</button>
								</div>
								<div className="flex items-center gap-2 ml-2 text-xs">
									<div className="flex flex-col items-start gap-1">
										<span className="opacity-70">편집 U</span>
										<input type="range" min="-2" max="2" step="0.05" defaultValue={0} className="w-16" onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); window.__viewerApi?.setDecalOffset?.(v, window.__viewerApi?.getDecalState?.()?.offsetV || 0); }} />
									</div>
									<div className="flex flex-col items-start gap-1">
										<span className="opacity-70">V</span>
										<input type="range" min="-2" max="2" step="0.05" defaultValue={0} className="w-16" onChange={(e)=>{ const v=parseFloat(e.target.value||'0'); window.__viewerApi?.setDecalOffset?.(window.__viewerApi?.getDecalState?.()?.offsetU || 0, v); }} />
									</div>
									<div className="flex flex-col items-start gap-1">
										<span className="opacity-70">SX</span>
										<input type="range" min="0.1" max="3" step="0.1" defaultValue={1} className="w-16" onChange={(e)=>{ const sx=parseFloat(e.target.value||'1'); const st=window.__viewerApi?.getDecalState?.(); window.__viewerApi?.setDecalScale?.(sx, st?.scaleY || 1); }} />
									</div>
									<div className="flex flex-col items-start gap-1">
										<span className="opacity-70">SY</span>
										<input type="range" min="0.1" max="3" step="0.1" defaultValue={1} className="w-16" onChange={(e)=>{ const sy=parseFloat(e.target.value||'1'); const st=window.__viewerApi?.getDecalState?.(); window.__viewerApi?.setDecalScale?.(st?.scaleX || 1, sy); }} />
									</div>
								</div>
							</div>
						</div>
						<div className="absolute bottom-3 right-3 flex flex-col gap-2">
							<div className="grid grid-cols-3 gap-2">
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.pan(0, -40)}>▲</button>
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.reset()}>⟲</button>
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.pan(0, 40)}>▼</button>
							</div>
							<div className="grid grid-cols-3 gap-2">
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.pan(-40, 0)}>◀</button>
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.zoom(1/1.15)}>－</button>
								<button className="px-3 py-2 rounded bg-foreground text-background" onClick={() => window.__viewerApi?.pan(40, 0)}>▶</button>
							</div>
							<div className="flex justify-center">
								<button className="px-3 py-2 rounded bg-foreground text-background w-full" onClick={() => window.__viewerApi?.zoom(1.15)}>＋</button>
							</div>
						</div>
					</div>
				) : (
					<div className="h-full w-full grid place-items-center text-sm opacity-70">
						미리보기를 위해 URL을 입력하고 불러오기를 클릭하세요.
					</div>
				)}
			</div>
			<p className="text-xs opacity-70">
				원격 파일은 CORS 정책을 준수해야 합니다. 접근이 차단되면 파일을 다른 호스트에 업로드하거나 CORS를
				허용하도록 설정하세요.
			</p>
		</div>
	);
}


