"use client";

import { useEffect, useRef, useState } from "react";

export default function AnnotationLayer({ activeTool = "none", color = "#000000", lineWidth = 2, fontSize = 16, onReady }) {
	const containerRef = useRef(null);
	const canvasRef = useRef(null);
	const ctxRef = useRef(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const strokesRef = useRef([]); // [{type:'pen', color, lineWidth, points:[{x,y},...] } | {type:'arrow', color, lineWidth, x1,y1,x2,y2}]
	const textsRef = useRef([]); // [{x,y,text,color,fontSize}]
    const [textModal, setTextModal] = useState({ open: false, x: 0, y: 0, value: "" });
	const previewArrowRef = useRef(null); // {x1,y1,x2,y2}

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

	function drawArrow(ctx, x1, y1, x2, y2, strokeColor, lw) {
		ctx.save();
		ctx.strokeStyle = strokeColor;
		ctx.fillStyle = strokeColor;
		ctx.lineWidth = lw;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		// main line
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		// arrow head
		const angle = Math.atan2(y2 - y1, x2 - x1);
		const headLen = Math.max(10, 8 + lw * 2);
		const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
		const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
		const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
		const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 6);
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(hx1, hy1);
		ctx.lineTo(hx2, hy2);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	function redraw() {
		const ctx = ctxRef.current;
		const canvas = canvasRef.current;
		if (!ctx || !canvas) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// strokes
		for (const s of strokesRef.current) {
			if (s.type === 'arrow') {
				drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.color, s.lineWidth);
			} else {
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
		}
		// texts
		for (const t of textsRef.current) {
			ctx.fillStyle = t.color;
			ctx.font = `${t.fontSize}px sans-serif`;
			ctx.textBaseline = "top";
			ctx.fillText(t.text, t.x, t.y);
		}
		// preview arrow
		if (previewArrowRef.current) {
			ctx.save();
			ctx.globalAlpha = 0.7;
			drawArrow(ctx, previewArrowRef.current.x1, previewArrowRef.current.y1, previewArrowRef.current.x2, previewArrowRef.current.y2, color, lineWidth);
			ctx.restore();
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
    function distanceToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return distance(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return distance(p, proj);
    }

    function eraseAtPoint(p, radius = 12) {
        const keptStrokes = [];
        for (const s of strokesRef.current) {
            let hit = false;
            if (s.type === 'arrow') {
                hit = distanceToSegment(p, {x: s.x1, y: s.y1}, {x: s.x2, y: s.y2}) <= radius;
            } else {
                hit = s.points.some((pt) => distance(pt, p) <= radius);
            }
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
			const stroke = { type: 'pen', color, lineWidth, points: [p] };
			strokesRef.current = [...strokesRef.current, stroke];
			setIsDrawing(true);
		} else if (activeTool === "text") {
			e.preventDefault();
			const p = getPos(e);
			setTextModal({ open: true, x: p.x, y: p.y, value: "" });
		} else if (activeTool === "arrow") {
			e.preventDefault();
			const p = getPos(e);
			previewArrowRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
			setIsDrawing(true);
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

	function handlePointerMoveArrow(e) {
		if (!isDrawing || activeTool !== 'arrow') return;
		e.preventDefault();
		const p = getPos(e);
		if (previewArrowRef.current) {
			previewArrowRef.current = { ...previewArrowRef.current, x2: p.x, y2: p.y };
			redraw();
		}
	}

	function handlePointerUp(e) {
		if (isDrawing) {
			e.preventDefault();
			if (activeTool === 'arrow' && previewArrowRef.current) {
				const { x1, y1, x2, y2 } = previewArrowRef.current;
				strokesRef.current = [
					...strokesRef.current,
					{ type: 'arrow', color, lineWidth, x1, y1, x2, y2 }
				];
				previewArrowRef.current = null;
			}
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
				onMouseMove={canInteract ? (activeTool==='arrow' ? handlePointerMoveArrow : handlePointerMove) : undefined}
				onMouseUp={canInteract ? handlePointerUp : undefined}
				onMouseLeave={canInteract ? handlePointerUp : undefined}
				onTouchStart={canInteract ? handlePointerDown : undefined}
				onTouchMove={canInteract ? (activeTool==='arrow' ? handlePointerMoveArrow : handlePointerMove) : undefined}
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


