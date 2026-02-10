'use client';
import { useState, useEffect, useRef } from 'react';
import { RefreshCcw } from 'lucide-react';

export default function ManagerPage() {
  const [state, setState] = useState('IDLE');
  const previousState = useRef('IDLE');

  // Request Permission safely
  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.log("Notification permission error", e);
      }
    }
  };

  useEffect(() => {
    requestPermission();
    
    const interval = setInterval(async () => {
      const res = await fetch('/api/demo');
      const data = await res.json();
      
      // TRIGGER NOTIFICATION
      if (data.step === 'CLAIMED' && previousState.current !== 'CLAIMED') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
             // Basic Notification
             new Notification('Shift Claimed! ⚡️', {
               body: 'Mike wants to work Friday Night.',
             });
          } catch (e) {
            console.error("Notification failed:", e);
          }
        }
      }
      
      previousState.current = data.step;
      setState(data.step);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendAction = async (action: string) => {
    await fetch('/api/demo', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center font-sans text-black">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <h1 className="font-bold text-lg">Manager View</h1>
          <button onClick={() => sendAction('RESET')}><RefreshCcw size={18}/></button>
        </div>

        <div className="p-8 text-center min-h-[400px] flex flex-col justify-center">
          
          {state === 'IDLE' && (
            <>
              <p className="text-gray-500 mb-8">Friday night is looking busy. Dave just called in sick.</p>
              <button 
                onClick={() => sendAction('POST_SHIFT')}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 transition active:scale-95"
              >
                Post Cover Shift
              </button>
              <p className="text-xs text-gray-400 mt-4">One click. Broadcasts to everyone.</p>
            </>
          )}

          {state === 'POSTED' && (
            <div className="animate-pulse">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📡</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Shift Broadcasted</h2>
              <p className="text-gray-500 mt-2">Waiting for staff to claim...</p>
            </div>
          )}

          {state === 'CLAIMED' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-lg animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-green-800">Shift Claimed!</h2>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
              <p className="text-green-700 mb-6 text-left">
                <strong>Mike</strong> wants to work Friday 18:00 - 23:00.
              </p>
              
              <button 
                onClick={() => sendAction('APPROVE_SHIFT')}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl shadow-lg active:scale-95 transition"
              >
                APPROVE MIKE
              </button>
            </div>
          )}

          {state === 'APPROVED' && (
            <div>
              <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Rota Updated</h2>
              <p className="text-gray-500 mt-2">Mike has been notified.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}