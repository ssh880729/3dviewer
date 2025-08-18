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
	try {
		const { searchParams } = new URL(request.url);
		const targetPath = searchParams.get("path");
		if (!targetPath) {
			return new Response("Missing 'path' query parameter", { status: 400 });
		}

		// Normalize Windows/Unix paths safely
		const normalized = path.normalize(targetPath);
		const stat = await fs.promises.stat(normalized);
		if (!stat.isFile()) {
			return new Response("Not a file", { status: 400 });
		}

		const ext = path.extname(normalized).toLowerCase();
		const contentType = EXT_TO_CONTENT_TYPE[ext] || "application/octet-stream";
		const headers = new Headers();
		headers.set("Content-Type", contentType);
		headers.set("Content-Length", String(stat.size));
		headers.set("Access-Control-Allow-Origin", "*");

		const stream = fs.createReadStream(normalized);
		return new Response(stream, { status: 200, headers });
	} catch (err) {
		return new Response("Failed to read local file", { status: 500 });
	}
}


