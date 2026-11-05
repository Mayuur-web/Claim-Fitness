'use client';

import dynamic from 'next/dynamic';

const ClaimrApp = dynamic(() => import('@/components/Claimr'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] bg-[#0B0F14] flex flex-col items-center justify-center gap-4 text-[#F2F5F8]">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-[rgba(14,20,28,0.8)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-[0_0_30px_rgba(182,255,59,0.3)]">
          <svg
            className="w-8 h-8 text-[#B6FF3B] animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold tracking-tight">Claimr</span>
        <span className="text-xs text-[#8A97A6]">Initializing territory grid...</span>
      </div>
    </div>
  ),
});

export default function Page() {
  return (
    <main className="w-full h-[100dvh] relative overflow-hidden bg-[#0B0F14]">
      <ClaimrApp />
    </main>
  );
}

