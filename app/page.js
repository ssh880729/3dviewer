import Link from 'next/link';

export default function Home() {
  return (
    <div className="font-sans grid items-center justify-items-center min-h-screen p-8">
      <main className="flex flex-col gap-6 items-center">
        <div className="flex flex-col gap-4 items-center">
          <Link
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-6 w-auto"
            href="/viewer"
          >
            원스텝테크 3D 업무공유 시스템
          </Link>
          <Link
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-6 w-auto"
            href="/board"
          >
            원스텝테크 2D 업무공유 시스템
          </Link>
        </div>
      </main>
    </div>
  );
}
