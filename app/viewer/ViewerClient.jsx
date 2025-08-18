"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ModelViewer from "@/components/ModelViewer";
import AnnotationLayer from "@/components/AnnotationLayer";

export default function ViewerClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [url, setUrl] = useState("");
	const [currentUrl, setCurrentUrl] = useState("");
	const [filename, setFilename] = useState("");
	const [lockCamera, setLockCamera] = useState(false);
	const [tool, setTool] = useState("none"); // none | pen | text
	const [penColor, setPenColor] = useState("#000000");
	const [error, setError] = useState("");

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
	}

	function onFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		setError("");
		const objectUrl = URL.createObjectURL(file);
		setCurrentUrl(objectUrl);
		setFilename(file.name || "");
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
			<form onSubmit={onSubmit} className="flex gap-2 items-center">
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
			<div className="flex items-center gap-3 text-sm">
				<label className="opacity-70">또는 로컬 파일 선택:</label>
				<input
					type="file"
					accept=".glb,.gltf,.obj,.stl,.fbx"
					onChange={onFileChange}
					className="text-sm"
				/>
			</div>
			{/* 카메라 고정 토글은 렌더 화면 좌측 상단으로 이동 */}
			<div className="flex items-center gap-3 text-sm">
				<label className="opacity-70">주석 도구</label>
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
					title="지우개"
					aria-label="지우개"
				>🧽</button>

				{tool === "pen" && (
					<div className="flex items-center gap-1 ml-2">
						<button className={`w-6 h-6 rounded-full border ${penColor==="#000000"?"ring-2 ring-black":""}`} style={{background:'#000000'}} onClick={() => setPenColor('#000000')} title="검정" aria-label="검정" />
						<button className={`w-6 h-6 rounded-full border ${penColor==="#ff0000"?"ring-2 ring-black":""}`} style={{background:'#ff0000'}} onClick={() => setPenColor('#ff0000')} title="빨강" aria-label="빨강" />
						<button className={`w-6 h-6 rounded-full border ${penColor==="#0066ff"?"ring-2 ring-black":""}`} style={{background:'#0066ff'}} onClick={() => setPenColor('#0066ff')} title="파랑" aria-label="파랑" />
						<button className={`w-6 h-6 rounded-full border ${penColor==="#ffcc00"?"ring-2 ring-black":""}`} style={{background:'#ffcc00'}} onClick={() => setPenColor('#ffcc00')} title="노랑" aria-label="노랑" />
						<button className={`w-6 h-6 rounded-full border ${penColor==="#ffffff"?"ring-2 ring-black":""}`} style={{background:'#ffffff'}} onClick={() => setPenColor('#ffffff')} title="화이트" aria-label="화이트" />
					</div>
				)}

				<button className="px-3 py-1 rounded border" onClick={() => captureScene()}>화면 캡처</button>
			</div>
			{error ? (
				<p className="text-red-600 text-sm">{error}</p>
			) : null}
			<div className="flex-1 min-h-[500px] border rounded overflow-hidden">
				{currentUrl ? (
					<div className="relative h-full">
						<ModelViewer
							url={currentUrl}
							filename={filename}
							onError={(msg) => setError(msg)}
							lockCamera={lockCamera}
							onReady={(api) => (window.__viewerApi = api)}
						/>
						<AnnotationLayer activeTool={tool} color={penColor} onReady={(api) => (window.__annoApi = api)} />
						<div className="absolute top-3 left-3 bg-white/80 rounded px-3 py-1 text-sm flex items-center gap-2">
							<label>카메라 고정</label>
							<input type="checkbox" checked={lockCamera} onChange={(e) => setLockCamera(e.target.checked)} />
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


