export const runtime = "nodejs";

import fs from "fs";
import path from "path";

const EXT_TO_CONTENT_TYPE = {
	".glb": "model/gltf-binary",
	".gltf": "model/gltf+json",
	".obj": "text/plain; charset=utf-8",
	".stl": "model/stl",
	".fbx": "application/octet-stream",
};

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	let targetPath = searchParams.get("path");
	if (!targetPath) {
		return new Response("Missing 'path' query parameter", { status: 400 });
	}

	try {
		// Decode and normalize path (handle encoded spaces/Korean)
		targetPath = decodeURIComponent(targetPath);
		const normalized = path.normalize(targetPath);

		const stat = await fs.promises.stat(normalized);
		if (!stat.isFile()) {
			return new Response("Not a file", { status: 400 });
		}

		const ext = path.extname(normalized).toLowerCase();
		const contentType = EXT_TO_CONTENT_TYPE[ext] || "application/octet-stream";
		const totalSize = stat.size;

		// Handle Range requests for streaming large binaries (e.g., GLB)
		const range = request.headers.get("range");
		if (range) {
			const matches = /bytes=(\d+)-(\d+)?/.exec(range);
			if (!matches) {
				return new Response("Malformed Range header", { status: 416 });
			}
			let start = parseInt(matches[1], 10);
			let end = matches[2] ? parseInt(matches[2], 10) : totalSize - 1;
			if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
				return new Response("Invalid byte range", { status: 416 });
			}
			end = Math.min(end, totalSize - 1);
			const chunkSize = end - start + 1;

			const stream = fs.createReadStream(normalized, { start, end });
			const headers = new Headers();
			headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
			headers.set("Accept-Ranges", "bytes");
			headers.set("Content-Length", String(chunkSize));
			headers.set("Content-Type", contentType);
			headers.set("Access-Control-Allow-Origin", "*");
			return new Response(stream, { status: 206, headers });
		}

		// Fallback: send full file
		const data = await fs.promises.readFile(normalized);
		const headers = new Headers();
		headers.set("Content-Type", contentType);
		headers.set("Content-Length", String(totalSize));
		headers.set("Access-Control-Allow-Origin", "*");
		return new Response(data, { status: 200, headers });
	} catch (err) {
		console.error("/api/local error:", err);
		const msg = typeof err?.message === "string" ? err.message : String(err);
		const code = err?.code || "UNKNOWN";
		return new Response(`Failed to read local file (${code}): ${msg}`, { status: 500 });
	}
}


