"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export default function ModelViewer({ url, filename = "", files = [], onError, lockCamera = false, onReady, onStatus, lightAzimuthDeg = 45, lightElevationDeg = 60, lightIntensity = 1 }) {
	const mountRef = useRef(null);
	const rendererRef = useRef(null);
	const controlsRef = useRef(null);
	const cameraRef = useRef(null);
	const initialTargetRef = useRef(null);
	const initialPositionRef = useRef(null);
	const dirLightRef = useRef(null);
	const raycasterRef = useRef(null);
	const pointerRef = useRef(new THREE.Vector2());
	const selectedRef = useRef(null);
	const selectionHelperRef = useRef(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState({ percent: 0, indeterminate: true });

	useEffect(() => {
		if (!url && (!files || files.length === 0)) return;

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
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;
		mountEl.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// Environment map for color-accurate PBR
		const pmrem = new THREE.PMREMGenerator(renderer);
		pmrem.compileEquirectangularShader();
		const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = envTex;

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
			applySelectedColor: (hex) => {
				const obj = selectedRef.current;
				if (!obj) {
					onStatus?.({ type: "info", text: "선택된 대상이 없습니다" });
					return false;
				}
				const applyToMaterial = (mat) => {
					if (!mat) return;
					if (mat.color) {
						mat.color.set(hex);
						mat.needsUpdate = true;
					}
				};
				if (Array.isArray(obj.material)) obj.material.forEach(applyToMaterial);
				else applyToMaterial(obj.material);
				return true;
			},
		};
		onReady?.(api);

		const ambient = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambient);
		const dir = new THREE.DirectionalLight(0xffffff, lightIntensity);
		scene.add(dir);
		dirLightRef.current = dir;
		const applyDir = (az, el) => {
			const r = 10;
			const azR = (az * Math.PI) / 180;
			const elR = (el * Math.PI) / 180;
			const x = r * Math.cos(elR) * Math.cos(azR);
			const y = r * Math.sin(elR);
			const z = r * Math.cos(elR) * Math.sin(azR);
			dir.position.set(x, y, z);
			dir.target.position.set(0, 0, 0);
			dir.target.updateMatrixWorld();
		};
		applyDir(lightAzimuthDeg, lightElevationDeg);


		const draco = new DRACOLoader();
		draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

		const createLoaders = (manager) => {
			const gltf = new GLTFLoader(manager);
			gltf.setDRACOLoader(draco);
			const obj = new OBJLoader(manager);
			const stl = new STLLoader(manager);
			const fbx = new FBXLoader(manager);
			return { gltf, obj, stl, fbx };
		};

		function toProxied(u) {
			if (/^https?:\/\//i.test(u)) {
				const proxied = `/api/proxy?url=${encodeURIComponent(u)}`;
				return proxied;
			}
			return u;
		}

		async function buildMapFromZip(file) {
			const { unzip } = await import("unzipit");
			const { entries } = await unzip(file);
			const fileMap = new Map();
			let mainUrl = null;
			let mainKey = null;
			for (const [p, entry] of Object.entries(entries)) {
				if (entry.isDirectory) continue;
				const blob = await entry.blob();
				const u = URL.createObjectURL(blob);
				const key = p.replace(/\\/g, "/").toLowerCase();
				fileMap.set(key, u);
				if (!mainUrl && (key.endsWith(".gltf") || key.endsWith(".glb") || key.endsWith(".obj") || key.endsWith(".stl") || key.endsWith(".fbx"))) {
					mainUrl = u;
					mainKey = key;
				}
			}
			if (!mainUrl) throw new Error("ZIP 안에 로드 가능한 3D 파일(.gltf/.glb/.obj/.stl/.fbx)이 없습니다.");
			fileMap.set("__MAIN__", mainUrl);
			fileMap.set("__MAIN_KEY__", mainKey);
			return fileMap;
		}

		async function buildMapFromFiles(list) {
			const fileMap = new Map();
			let mainUrl = null;
			let mainKey = null;
			for (const f of list) {
				const key = (f.webkitRelativePath || f.name).replace(/\\/g, "/").toLowerCase();
				const u = URL.createObjectURL(f);
				fileMap.set(key, u);
				if (!mainUrl && (key.endsWith(".gltf") || key.endsWith(".glb") || key.endsWith(".obj") || key.endsWith(".stl") || key.endsWith(".fbx"))) {
					mainUrl = u;
					mainKey = key;
				}
			}
			if (!mainUrl) throw new Error("선택한 파일에 로드 가능한 3D 파일(.gltf/.glb/.obj/.stl/.fbx)이 없습니다.");
			fileMap.set("__MAIN__", mainUrl);
			fileMap.set("__MAIN_KEY__", mainKey);
			return fileMap;
		}

		async function getResourceMapIfAny() {
			if (!files || files.length === 0) return null;
			const zip = files.find((f) => f.name.toLowerCase().endsWith(".zip"));
			if (zip && files.length === 1) {
				return await buildMapFromZip(zip);
			}
			return await buildMapFromFiles(files);
		}

		function loadModel(fileUrl, resourceMap) {
			setLoading(true);
			setProgress({ percent: 0, indeterminate: true });
			onStatus?.({ type: "loading", text: "로딩 중..." });
			const mainKey = resourceMap ? resourceMap.get("__MAIN_KEY__") : null;
			const effectiveUrl = resourceMap ? (resourceMap.get("__MAIN__") || fileUrl) : fileUrl;
			const inferred = (resourceMap ? (mainKey || "") : (filename || effectiveUrl)).toLowerCase();
			const isBlob = effectiveUrl.startsWith("blob:");
			const isData = effectiveUrl.startsWith("data:");
			const isHttp = /^https?:\/\//i.test(effectiveUrl);
			const isFileScheme = /^file:/i.test(effectiveUrl);
			const isFtp = /^ftp:\/\//i.test(fileUrl);
			if (isFtp) {
				return handleError(
					new Error("FTP 주소는 브라우저에서 직접 로드할 수 없습니다. HTTP(S) 또는 파일 업로드를 사용하세요.")
				);
			}
			if (!resourceMap) {
				if (isFileScheme) {
					try {
						const u = new URL(effectiveUrl);
						let p = decodeURIComponent(u.pathname || "");
						if (/^\/[a-zA-Z]:/.test(p)) p = p.slice(1); // /C:/... -> C:/...
						fileUrl = `/api/local?path=${encodeURIComponent(p)}`;
					} catch {
						return handleError(new Error("file:// 경로를 해석하지 못했습니다. 로컬 업로드 또는 HTTP(S) URL을 사용하세요."));
					}
				} else if (!(isBlob || isData || isHttp)) {
					// 로컬 절대 경로인 경우(백슬래시/슬래시 모두 허용) 서버 파일 리더 API로 우회
					if (/^[a-zA-Z]:[\\\/]/.test(effectiveUrl) || effectiveUrl.startsWith("/")) {
						fileUrl = `/api/local?path=${encodeURIComponent(effectiveUrl)}`;
					} else {
						return handleError(
							new Error(
								"이 경로는 브라우저에서 로드할 수 없습니다. 로컬 경로 대신 파일 업로드를 사용하거나 HTTP(S)로 접근하세요."
							)
						);
					}
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
					onStatus?.({ type: "loading", text: `로딩 중... ${p}%` });
				} else {
					setProgress({ percent: 0, indeterminate: true });
				}
			};

			// LoadingManager for mapping
			const manager = new THREE.LoadingManager();
			if (resourceMap) {
				const mainKeyForMap = resourceMap.get("__MAIN_KEY__") || "";
				const baseDir = mainKeyForMap.includes("/") ? mainKeyForMap.slice(0, mainKeyForMap.lastIndexOf("/") + 1) : "";
				const normalizePath = (p) => {
					try { p = decodeURIComponent(p); } catch {}
					p = p.replace(/\\/g, "/");
					p = p.split(/[?#]/)[0];
					const parts = [];
					for (const seg of p.split("/")) {
						if (!seg || seg === ".") continue;
						if (seg === "..") { parts.pop(); continue; }
						parts.push(seg);
					}
					return parts.join("/").toLowerCase();
				};
				manager.setURLModifier((requestedUrl, resourcePath) => {
					let clean = normalizePath(requestedUrl);
					let fromBase = normalizePath(`${baseDir}${requestedUrl}`);
					// Try stripping resourcePath prefix (blob: base)
					if (resourcePath) {
						const rp = normalizePath(resourcePath);
						if (clean.startsWith(rp)) clean = clean.slice(rp.length);
						if (fromBase.startsWith(rp)) fromBase = fromBase.slice(rp.length);
					}
					clean = clean.replace(/^\//, "");
					fromBase = fromBase.replace(/^\//, "");
					const candidates = [clean, fromBase, `${baseDir}${clean}`.toLowerCase()];
					for (const k of candidates) {
						if (resourceMap.has(k)) return resourceMap.get(k);
					}
					// Fallback: match by suffix to tolerate extra prefixes in blob URL bases
					for (const k of resourceMap.keys()) {
						if (k === "__MAIN__" || k === "__MAIN_KEY__") continue;
						if (k.endsWith(clean) || k.endsWith(fromBase)) return resourceMap.get(k);
					}
					return requestedUrl;
				});
			}

			const { gltf: gltfLoader, obj: objLoader, stl: stlLoader, fbx: fbxLoader } = createLoaders(manager);
			const resolvedMain = resourceMap ? resourceMap.get("__MAIN__") || fileUrl : fileUrl;

			if (inferred.endsWith(".glb") || inferred.endsWith(".gltf") || (resourceMap && (resolvedMain.endsWith(".glb") || resolvedMain.endsWith(".gltf")))) {
				if (resourceMap) {
					// Avoid using blob: as base URL. Parse with explicit manager so relative paths remain relative strings
					const mainUrl = resolvedMain;
					const mainKey = resourceMap.get("__MAIN_KEY__") || "";
					const isGLB = mainKey.endsWith(".glb") || mainUrl.endsWith(".glb");
					fetch(mainUrl)
						.then((res) => (isGLB ? res.arrayBuffer() : res.text()))
						.then((data) => {
							gltfLoader.parse(
								data,
								"",
								(gltf) => {
									const root = gltf.scene || gltf.scenes?.[0];
									if (root) scene.add(root);
									fitCameraToObject(camera, root || scene, controls);
									setLoading(false);
									setProgress({ percent: 100, indeterminate: false });
									onStatus?.({ type: "done", text: "로드 완료" });
								},
								(err) => handleError(err)
							);
						})
						.catch((err) => handleError(err));
				} else {
					gltfLoader.load(
						toProxied(fileUrl),
						(gltf) => {
							const root = gltf.scene || gltf.scenes?.[0];
							if (root) scene.add(root);
							fitCameraToObject(camera, root || scene, controls);
							setLoading(false);
							setProgress({ percent: 100, indeterminate: false });
							onStatus?.({ type: "done", text: "로드 완료" });
						},
						onProgress,
						(err) => handleError(err)
					);
				}
			} else if (inferred.endsWith(".obj") || (resourceMap && resolvedMain.endsWith(".obj"))) {
				objLoader.load(
					resourceMap ? resolvedMain : toProxied(fileUrl),
					(object) => {
						scene.add(object);
						fitCameraToObject(camera, object, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
						onStatus?.({ type: "done", text: "로드 완료" });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else if (inferred.endsWith(".stl") || (resourceMap && resolvedMain.endsWith(".stl"))) {
				stlLoader.load(
					resourceMap ? resolvedMain : toProxied(fileUrl),
					(geometry) => {
						const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
						const mesh = new THREE.Mesh(geometry, material);
						scene.add(mesh);
						fitCameraToObject(camera, mesh, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
						onStatus?.({ type: "done", text: "로드 완료" });
					},
					onProgress,
					(err) => handleError(err)
				);
			} else if (inferred.endsWith(".fbx") || (resourceMap && resolvedMain.endsWith(".fbx"))) {
				fbxLoader.load(
					resourceMap ? resolvedMain : toProxied(fileUrl),
					(object) => {
						scene.add(object);
						fitCameraToObject(camera, object, controls);
						setLoading(false);
						setProgress({ percent: 100, indeterminate: false });
						onStatus?.({ type: "done", text: "로드 완료" });
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
			onStatus?.({ type: "error", text: err?.message || "로딩 중 오류가 발생했습니다." });
		}

		function fitCameraToObject(camera, object, controls) {
			const box = new THREE.Box3().setFromObject(object);
			const size = box.getSize(new THREE.Vector3());
			const center = box.getCenter(new THREE.Vector3());
			let maxDim = Math.max(size.x, size.y, size.z);
			if (!isFinite(maxDim) || maxDim === 0) {
				// fallback: place camera at default and target origin
				controls?.target.set(0, 0, 0);
				camera.position.set(0, 2, 4);
				camera.near = 0.01;
				camera.far = 1000;
				camera.updateProjectionMatrix();
				controls?.update();
				initialTargetRef.current = controls?.target.clone() || new THREE.Vector3();
				initialPositionRef.current = camera.position.clone();
				return;
			}
			// normalize extremely large/small models to a reasonable viewing scale
			const desired = 5; // target bounding size
			if (maxDim > desired * 100 || maxDim < desired / 100) {
				const scale = desired / maxDim;
				object.scale.multiplyScalar(scale);
				// recompute box after scaling
				box.setFromObject(object);
				box.getSize(size);
				box.getCenter(center);
				maxDim = Math.max(size.x, size.y, size.z);
			}
			const fov = camera.fov * (Math.PI / 180);
			let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
			cameraZ *= 1.6;
			camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
			camera.near = Math.max(maxDim / 1000, 0.01);
			camera.far = Math.max(maxDim * 1000, camera.near + 1);
			camera.updateProjectionMatrix();
			controls?.target.copy(center);
			controls?.update();
			initialTargetRef.current = center.clone();
			initialPositionRef.current = camera.position.clone();
		}

		getResourceMapIfAny()
			.then((map) => {
				if (map) return loadModel("__from_files__", map);
				return loadModel(url, null);
			})
			.catch((err) => handleError(err));

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

		const handlePointerUp = (ev) => {
			const rect = renderer.domElement.getBoundingClientRect();
			const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
			pointerRef.current.set(x, y);
			if (!raycasterRef.current) raycasterRef.current = new THREE.Raycaster();
			raycasterRef.current.setFromCamera(pointerRef.current, camera);
			const intersects = raycasterRef.current.intersectObjects(scene.children, true);
			const firstMesh = intersects.find((it) => it.object && it.object.isMesh);
			if (firstMesh) {
				// select or toggle off if clicking same mesh
				if (selectedRef.current === firstMesh.object) {
					if (selectionHelperRef.current && selectionHelperRef.current.parent) {
						selectionHelperRef.current.parent.remove(selectionHelperRef.current);
					}
					selectionHelperRef.current = null;
					selectedRef.current = null;
					onStatus?.({ type: "info", text: "선택 해제" });
				} else {
					if (selectionHelperRef.current && selectionHelperRef.current.parent) {
						selectionHelperRef.current.parent.remove(selectionHelperRef.current);
					}
					const helper = new THREE.BoxHelper(firstMesh.object, 0x00ffff);
					selectionHelperRef.current = helper;
					scene.add(helper);
					selectedRef.current = firstMesh.object;
					onStatus?.({ type: "info", text: `선택: ${firstMesh.object.name || 'mesh'}` });
				}
			} else {
				// clicked empty space => clear selection
				if (selectionHelperRef.current && selectionHelperRef.current.parent) {
					selectionHelperRef.current.parent.remove(selectionHelperRef.current);
				}
				selectionHelperRef.current = null;
				selectedRef.current = null;
				onStatus?.({ type: "info", text: "선택 해제" });
			}
		};

		renderer.domElement.addEventListener("pointerup", handlePointerUp);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener("resize", onResize);
			controls?.dispose();
			renderer?.dispose();
			if (renderer && renderer.domElement) {
				renderer.domElement.removeEventListener("pointerup", handlePointerUp);
			}
			if (rendererRef.current && rendererRef.current.domElement?.parentNode) {
				rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
			}
		};
	}, [url, files]);

	useEffect(() => {
		const dir = dirLightRef.current;
		if (!dir) return;
		const r = 10;
		const azR = (lightAzimuthDeg * Math.PI) / 180;
		const elR = (lightElevationDeg * Math.PI) / 180;
		const x = r * Math.cos(elR) * Math.cos(azR);
		const y = r * Math.sin(elR);
		const z = r * Math.cos(elR) * Math.sin(azR);
		dir.position.set(x, y, z);
		dir.target.position.set(0, 0, 0);
		dir.target.updateMatrixWorld();
	}, [lightAzimuthDeg, lightElevationDeg]);

	useEffect(() => {
		const dir = dirLightRef.current;
		if (!dir) return;
		dir.intensity = lightIntensity;
	}, [lightIntensity]);

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


