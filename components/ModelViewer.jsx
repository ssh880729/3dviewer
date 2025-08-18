"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export default function ModelViewer({ url, filename = "", onError, lockCamera = false, onReady }) {
	const mountRef = useRef(null);
	const rendererRef = useRef(null);
	const controlsRef = useRef(null);
	const cameraRef = useRef(null);
	const initialTargetRef = useRef(null);
	const initialPositionRef = useRef(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState({ percent: 0, indeterminate: true });

	useEffect(() => {
		if (!url) return;

		let scene, camera, renderer, controls, animationId;
		const mountEl = mountRef.current;

		const sizes = {
			width: mountEl.clientWidth || mountEl.offsetWidth || 800,
			height: mountEl.clientHeight || mountEl.offsetHeight || 500,
		};

		scene = new THREE.Scene();
		scene.background = new THREE.Color("#ffffff");

		camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000);
		camera.position.set(2.5, 2, 3);
		cameraRef.current = camera;

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(sizes.width, sizes.height);
		renderer.setClearColor(0xffffff, 1);
		mountEl.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.enabled = !lockCamera; // 포인터 입력만 차단, 프로그래매틱 이동은 허용
		controlsRef.current = controls;

		const api = {
			pan: (dx = 0, dy = 0) => {
				const c = controlsRef.current;
				const cam = cameraRef.current;
				const rend = rendererRef.current;
				if (!c || !cam || !rend) return;
				const element = rend.domElement;
				const rectWidth = element.clientWidth || element.width || 1;
				const rectHeight = element.clientHeight || element.height || 1;

				// 화면 비율 기준으로 월드 단위 오프셋 계산
				const offset = new THREE.Vector3().copy(cam.position).sub(c.target);
				const distance = offset.length();
				const fov = (cam.fov * Math.PI) / 180;
				const targetHeight = 2 * Math.tan(fov / 2) * distance;
				const moveX = (dx / rectWidth) * targetHeight * cam.aspect;
				const moveY = (dy / rectHeight) * targetHeight;

				const dir = new THREE.Vector3();
				cam.getWorldDirection(dir); // forward
				const right = new THREE.Vector3().crossVectors(dir, cam.up).normalize();
				const up = new THREE.Vector3().copy(cam.up).normalize();
				const panOffset = new THREE.Vector3()
					.addScaledVector(right, moveX)
					.addScaledVector(up, -moveY); // 화면상의 +dy는 아래로 이동

				cam.position.add(panOffset);
				c.target.add(panOffset);
				c.update();
			},
			zoom: (factor = 1.1) => {
				const c = controlsRef.current;
				const cam = cameraRef.current;
				if (!c || !cam) return;

				const offset = new THREE.Vector3().copy(cam.position).sub(c.target);
				let distance = offset.length();
				let newDistance = distance / (factor || 1.0);
				// OrbitControls 제약 반영
				if (typeof c.minDistance === "number") newDistance = Math.max(newDistance, c.minDistance);
				if (typeof c.maxDistance === "number" && c.maxDistance > 0)
					newDistance = Math.min(newDistance, c.maxDistance);

				offset.setLength(newDistance);
				cam.position.copy(new THREE.Vector3().copy(c.target).add(offset));
				cam.updateProjectionMatrix();
				c.update();
			},
			reset: () => {
				const c = controlsRef.current;
				const cam = cameraRef.current;
				if (!c || !cam || !initialPositionRef.current || !initialTargetRef.current) return;
				cam.position.copy(initialPositionRef.current);
				c.target.copy(initialTargetRef.current);
				cam.updateProjectionMatrix();
				c.update();
			},
			getCanvas: () => renderer?.domElement || rendererRef.current?.domElement || null,
		};
		onReady?.(api);

		const ambient = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambient);
		const dir = new THREE.DirectionalLight(0xffffff, 1.0);
		dir.position.set(5, 10, 7.5);
		scene.add(dir);


		const draco = new DRACOLoader();
		draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(draco);

		const objLoader = new OBJLoader();
		const stlLoader = new STLLoader();
		const fbxLoader = new FBXLoader();

		function toProxied(u) {
			if (/^https?:\/\//i.test(u)) {
				const proxied = `/api/proxy?url=${encodeURIComponent(u)}`;
				return proxied;
			}
			return u;
		}

		function loadModel(fileUrl) {
			setLoading(true);
			setProgress({ percent: 0, indeterminate: true });
			const inferred = (filename || fileUrl).toLowerCase();
			const isBlob = fileUrl.startsWith("blob:");
			const isData = fileUrl.startsWith("data:");
			const isHttp = /^https?:\/\//i.test(fileUrl);
			const isFtp = /^ftp:\/\//i.test(fileUrl);
			if (isFtp) {
				return handleError(
					new Error("FTP 주소는 브라우저에서 직접 로드할 수 없습니다. HTTP(S) 또는 파일 업로드를 사용하세요.")
				);
			}
			if (!(isBlob || isData || isHttp)) {
				// 로컬 절대 경로인 경우 서버 파일 리더 API로 우회
				if (/^[a-zA-Z]:\\/.test(fileUrl) || fileUrl.startsWith("/")) {
					fileUrl = `/api/local?path=${encodeURIComponent(fileUrl)}`;
				} else {
					return handleError(
						new Error(
							"이 경로는 브라우저에서 로드할 수 없습니다. 로컬 경로 대신 파일 업로드를 사용하거나 HTTP(S)로 접근하세요."
						)
					);
				}
			}
			// 교차 출처 설정 (가능한 경우)
			try {
				THREE.DefaultLoadingManager.setCrossOrigin("anonymous");
			} catch {}
			const onProgress = (e) => {
				if (e && e.lengthComputable && e.total) {
					const p = Math.min(99, Math.round((e.loaded / e.total) * 100));
					setProgress({ percent: p, indeterminate: false });
				} else {
					setProgress({ percent: 0, indeterminate: true });
				}
			};

			if (inferred.endsWith(".glb") || inferred.endsWith(".gltf")) {
				gltfLoader.load(
					toProxied(fileUrl),
					(gltf) => {
						const root = gltf.scene || gltf.scenes?.[0];
						if (root) scene.add(root);
						fitCameraToObject(camera, root || scene, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else if (inferred.endsWith(".obj")) {
				objLoader.load(
					toProxied(fileUrl),
					(object) => {
						scene.add(object);
						fitCameraToObject(camera, object, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else if (inferred.endsWith(".stl")) {
				stlLoader.load(
					toProxied(fileUrl),
					(geometry) => {
						const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
						const mesh = new THREE.Mesh(geometry, material);
						scene.add(mesh);
						fitCameraToObject(camera, mesh, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else if (inferred.endsWith(".fbx")) {
				fbxLoader.load(
					toProxied(fileUrl),
					(object) => {
						scene.add(object);
						fitCameraToObject(camera, object, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else {
				handleError(new Error("지원하지 않는 파일 형식입니다."));
			}
		}

		function handleError(err) {
			console.error(err);
			setLoading(false);
			onError?.(err?.message || "로딩 중 오류가 발생했습니다.");
		}

		function fitCameraToObject(camera, object, controls) {
			const box = new THREE.Box3().setFromObject(object);
			const size = box.getSize(new THREE.Vector3());
			const center = box.getCenter(new THREE.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z);
			const fov = camera.fov * (Math.PI / 180);
			let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
			cameraZ *= 1.5;
			camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
			camera.near = maxDim / 100;
			camera.far = maxDim * 100;
			camera.updateProjectionMatrix();
			controls?.target.copy(center);
			controls?.update();
			initialTargetRef.current = center.clone();
			initialPositionRef.current = camera.position.clone();
		}

		loadModel(url);

		const onResize = () => {
			const w = mountEl.clientWidth || mountEl.offsetWidth;
			const h = mountEl.clientHeight || mountEl.offsetHeight;
			renderer.setSize(w, h);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		window.addEventListener("resize", onResize);

		const tick = () => {
			// enabled=false라도 감쇠 계산 등 내부 업데이트는 안전함
			controls?.update();
			renderer.render(scene, camera);
			animationId = requestAnimationFrame(tick);
		};
		tick();

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener("resize", onResize);
			controls?.dispose();
			renderer?.dispose();
			if (rendererRef.current && rendererRef.current.domElement?.parentNode) {
				rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
			}
		};
	}, [url]);

	useEffect(() => {
		const c = controlsRef.current;
		if (!c) return;
		// 포인터 입력만 토글. 팬/줌 기능 자체는 유지하여 버튼으로는 항상 제어 가능
		c.enabled = !lockCamera;
	}, [lockCamera]);

	return (
		<div ref={mountRef} className="relative w-full h-[65vh] bg-white">
			{loading && (
				<div className="absolute inset-0 bg-white/80 grid place-items-center p-4">
					<div className="w-full max-w-[320px] flex flex-col items-center gap-3">
						<div className="text-sm">불러오는 중...</div>
						<div className="w-full h-2 rounded bg-black/10 overflow-hidden">
							<div
								className="h-full bg-black/60 transition-[width] duration-200"
								style={{ width: progress.indeterminate ? "50%" : `${progress.percent}%` }}
							/>
						</div>
						{!progress.indeterminate && (
							<div className="text-xs opacity-70">{progress.percent}%</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}


