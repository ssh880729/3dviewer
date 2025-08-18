export const runtime = "nodejs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const target = searchParams.get("url");
	if (!target) {
		return new Response("Missing 'url' query parameter", { status: 400 });
	}

	try {
		const u = new URL(target);
		if (!/^https?:$/.test(u.protocol)) {
			return new Response("Only http/https protocols are allowed", { status: 400 });
		}
	} catch {
		return new Response("Invalid URL", { status: 400 });
	}

	const reqRange = request.headers.get("range");
	const headers = {};
	if (reqRange) headers["Range"] = reqRange;

	const upstream = await fetch(target, { headers, redirect: "follow" });
	if (!upstream.ok && upstream.status !== 206) {
		return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
	}

	const resHeaders = new Headers();
	const contentType = upstream.headers.get("content-type") || "application/octet-stream";
	resHeaders.set("Content-Type", contentType);
	const contentLength = upstream.headers.get("content-length");
	if (contentLength) resHeaders.set("Content-Length", contentLength);
	const contentRange = upstream.headers.get("content-range");
	if (contentRange) resHeaders.set("Content-Range", contentRange);
	resHeaders.set("Access-Control-Allow-Origin", "*");

	return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}


