'use client';
import { useState, useEffect, useRef } from 'react';

export default function StaffPage() {
  const [state, setState] = useState('IDLE');
  const [permission, setPermission] = useState('default');
  const previousState = useRef('IDLE');

  // Check permission on load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // @ts-ignore
      setPermission(Notification.permission);
    }
  }, []);

  // MANDATORY: User must click this to unlock notifications on Android
  const enableAlerts = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new Notification("Alerts Enabled! ✅");
        if (navigator.vibrate) navigator.vibrate(200);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/demo');
      const data = await res.json();
      
      // NOTIFICATION: NEW SHIFT
      if (data.step === 'POSTED' && previousState.current !== 'POSTED') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
           try {
             // FIX: We cast the options to 'any' to stop the TypeScript error
             const options: any = {
                body: 'Bar Staff • Fri 18:00 • £11/hr',
                tag: 'shift-alert', 
                renotify: true // This will now work without error
             };
             
             new Notification('🚨 New Shift Available!', options);
             
             if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
           } catch(e) { console.error(e); }
        }
      }

      // NOTIFICATION: APPROVED
      if (data.step === 'APPROVED' && previousState.current !== 'APPROVED') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
           try {
             new Notification('🎉 You got the shift!', { body: 'Check app for details.' });
             if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
           } catch(e) { console.error(e); }
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
    <div className="min-h-screen bg-gray-900 p-6 flex flex-col items-center justify-center font-sans text-white">
      <div className="w-full max-w-md">
        
        <h1 className="text-gray-400 text-center mb-8 font-medium">ServiceScope Staff App</h1>

        {/* PERMISSION BUTTON (Only shows if needed) */}
        {permission === 'default' && (
          <button 
            onClick={enableAlerts}
            className="w-full mb-8 py-3 bg-blue-600 rounded-lg font-bold shadow-lg animate-pulse"
          >
            🔔 Tap to Enable Notifications
          </button>
        )}

        {state === 'IDLE' && (
          <div className="text-center opacity-50">
            <div className="text-6xl mb-4">😴</div>
            <p>No shifts available.</p>
          </div>
        )}

        {state === 'POSTED' && (
          <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl border-4 border-yellow-400 animate-bounce-slow">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Urgent</span>
              <span className="font-bold text-green-600">£11/hr</span>
            </div>
            
            <h2 className="text-3xl font-bold mb-1">Bar Staff</h2>
            <p className="text-gray-500 mb-6">Fri 18:00 - 23:00</p>
            
            <button 
              onClick={() => sendAction('CLAIM_SHIFT')}
              className="w-full py-4 bg-black text-white rounded-xl font-bold text-xl active:scale-95 transition-transform"
            >
              CLAIM SHIFT ⚡️
            </button>
          </div>
        )}

        {state === 'CLAIMED' && (
          <div className="text-center">
            <div className="h-20 w-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold">Waiting for Manager...</h2>
            <p className="text-gray-400 mt-2">You have claimed this shift.</p>
          </div>
        )}

        {state === 'APPROVED' && (
          <div className="bg-green-500 text-white rounded-2xl p-8 text-center shadow-lg animate-in zoom-in duration-300">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">You got it!</h2>
            <p className="text-green-100">See you Friday at 18:00.</p>
          </div>
        )}

      </div>
    </div>
  );
}