'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 flex flex-col items-center justify-center font-sans text-white">
      <div className="w-full max-w-lg space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">ShiftSwap</h1>
          <p className="text-gray-400 text-lg">Real-time shift management demo</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Manager Card */}
          <Link href="/manager" className="group relative block p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-blue-500 hover:bg-gray-800 transition-all duration-200">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <span className="text-2xl">👔</span>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Manager View</h2>
                <p className="text-sm text-gray-400">Post shifts & approve requests</p>
              </div>
            </div>
          </Link>

          {/* Staff Card */}
          <Link href="/staff" className="group relative block p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-green-500 hover:bg-gray-800 transition-all duration-200">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <span className="text-2xl">👷</span>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Staff View</h2>
                <p className="text-sm text-gray-400">Find work & claim shifts</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-6 text-sm text-gray-500 border border-gray-800/50">
          <h3 className="font-semibold text-gray-400 mb-2">How to demo:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open <span className="text-blue-400">Manager View</span> in one tab</li>
            <li>Open <span className="text-green-400">Staff View</span> in another tab (or device)</li>
            <li>Post a shift as Manager</li>
            <li>Watch the Staff device receive the notification!</li>
          </ol>
        </div>

        <div className="text-center">
          <button 
             onClick={async () => {
               await fetch('/api/demo', { method: 'POST', body: JSON.stringify({ action: 'RESET' }) });
               alert('System Reset!');
             }}
             className="text-gray-600 text-sm hover:text-red-400 transition-colors"
          >
            Reset System State
          </button>
        </div>

      </div>
    </div>
  );
}
