"use client";

import { useEffect, useRef, useState } from "react";

export default function AnnotationLayer({ activeTool = "none", color = "#000000", lineWidth = 2, fontSize = 16, onReady }) {
	const containerRef = useRef(null);
	const canvasRef = useRef(null);
	const ctxRef = useRef(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const strokesRef = useRef([]); // [{color, lineWidth, points:[{x,y},...] }]
	const textsRef = useRef([]); // [{x,y,text,color,fontSize}]
    const [textModal, setTextModal] = useState({ open: false, x: 0, y: 0, value: "" });

	function resizeCanvas() {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		const rect = container.getBoundingClientRect();
		canvas.width = Math.floor(rect.width * dpr);
		canvas.height = Math.floor(rect.height * dpr);
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;
		const ctx = canvas.getContext("2d");
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctxRef.current = ctx;
		redraw();
	}

	function redraw() {
		const ctx = ctxRef.current;
		const canvas = canvasRef.current;
		if (!ctx || !canvas) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// strokes
		for (const s of strokesRef.current) {
			ctx.strokeStyle = s.color;
			ctx.lineWidth = s.lineWidth;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.beginPath();
			for (let i = 0; i < s.points.length; i++) {
				const p = s.points[i];
				if (i === 0) ctx.moveTo(p.x, p.y);
				else ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}
		// texts
		for (const t of textsRef.current) {
			ctx.fillStyle = t.color;
			ctx.font = `${t.fontSize}px sans-serif`;
			ctx.textBaseline = "top";
			ctx.fillText(t.text, t.x, t.y);
		}
	}

	function getPos(e) {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		if (e.touches && e.touches[0]) {
			return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
		}
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

    function distance(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.hypot(dx, dy); }
    function eraseAtPoint(p, radius = 12) {
        const keptStrokes = [];
        for (const s of strokesRef.current) {
            const hit = s.points.some((pt) => distance(pt, p) <= radius);
            if (!hit) keptStrokes.push(s);
        }
        strokesRef.current = keptStrokes;
        const keptTexts = [];
        for (const t of textsRef.current) {
            if (distance({ x: t.x, y: t.y }, p) > radius) keptTexts.push(t);
        }
        textsRef.current = keptTexts;
    }

	function handlePointerDown(e) {
		if (activeTool === "pen") {
			e.preventDefault();
			const p = getPos(e);
			const stroke = { color, lineWidth, points: [p] };
			strokesRef.current = [...strokesRef.current, stroke];
			setIsDrawing(true);
		} else if (activeTool === "text") {
			e.preventDefault();
			const p = getPos(e);
			setTextModal({ open: true, x: p.x, y: p.y, value: "" });
        } else if (activeTool === "eraser") {
            e.preventDefault();
            const p = getPos(e);
            eraseAtPoint(p);
            redraw();
		}
	}

	function handlePointerMove(e) {
		if (!isDrawing || activeTool !== "pen") return;
		e.preventDefault();
		const p = getPos(e);
		const strokes = strokesRef.current;
		const current = strokes[strokes.length - 1];
		if (!current) return;
		current.points.push(p);
		redraw();
	}

	function handlePointerUp(e) {
		if (isDrawing) {
			e.preventDefault();
			setIsDrawing(false);
			redraw();
		}
	}

	useEffect(() => {
		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);
		return () => window.removeEventListener("resize", resizeCanvas);
	}, []);

	useEffect(() => {
		const api = {
			clear: () => {
				strokesRef.current = [];
				textsRef.current = [];
				redraw();
			},
			getPNG: () => {
				const canvas = canvasRef.current;
				return canvas?.toDataURL("image/png");
			},
			getCanvas: () => canvasRef.current,
            erasePoint: (x, y, r = 12) => { eraseAtPoint({ x, y }, r); redraw(); }
		};
		onReady?.(api);
	}, [onReady]);

	const canInteract = activeTool !== "none";

	return (
		<div ref={containerRef} className="absolute inset-0 pointer-events-none select-none">
			<canvas
				ref={canvasRef}
				className={`absolute inset-0 ${canInteract ? "pointer-events-auto touch-none cursor-crosshair" : "pointer-events-none"}`}
				onMouseDown={canInteract ? handlePointerDown : undefined}
				onMouseMove={canInteract ? handlePointerMove : undefined}
				onMouseUp={canInteract ? handlePointerUp : undefined}
				onMouseLeave={canInteract ? handlePointerUp : undefined}
				onTouchStart={canInteract ? handlePointerDown : undefined}
				onTouchMove={canInteract ? handlePointerMove : undefined}
				onTouchEnd={canInteract ? handlePointerUp : undefined}
		/>
            { textModal.open && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border rounded shadow-lg p-4 w-[300px] pointer-events-auto">
                        <div className="text-sm font-medium mb-2">텍스트 입력</div>
                        <input
                            autoFocus
                            type="text"
                            value={textModal.value}
                            onChange={(e)=>setTextModal(prev=>({...prev, value: e.target.value}))}
                            className="w-full border rounded px-2 py-1 mb-3"
                            placeholder="내용을 입력하세요"
                        />
                        <div className="flex justify-end gap-2">
                            <button className="px-3 py-1 border rounded" onClick={()=>setTextModal({open:false,x:0,y:0,value:""})}>취소</button>
                            <button className="px-3 py-1 border rounded bg-foreground text-background" onClick={() => {
                                const v = textModal.value.trim();
                                if (v) {
                                    textsRef.current = [...textsRef.current, { x: textModal.x, y: textModal.y, text: v, color, fontSize }];
                                    redraw();
                                }
                                setTextModal({ open:false, x:0, y:0, value:"" });
                            }}>확인</button>
                        </div>
                    </div>
                </div>
            )}
		</div>
	);
}


