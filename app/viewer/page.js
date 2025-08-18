import { Suspense } from "react";
import ViewerClient from "./ViewerClient";

export default function ViewerPage() {
	return (
		<Suspense fallback={<div className="min-h-screen p-6">불러오는 중...</div>}>
			<ViewerClient />
		</Suspense>
	);
}


