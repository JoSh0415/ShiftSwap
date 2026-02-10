'use client';
import { useState, useEffect, useRef } from 'react';

// Helper for VAPID key conversion
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function StaffPage() {
  const [state, setState] = useState('IDLE');
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [subscribed, setSubscribed] = useState(false);
  const previousState = useRef('IDLE');

  const enableAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const res = await Notification.requestPermission();
    setPermission(res);
    if (res !== 'granted') return;

    if (!('serviceWorker' in navigator)) return;

    try {
      const register = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Reuse existing subscription to avoid multi-tab duplication.
      let subscription = await register.pushManager.getSubscription();

      if (!subscription) {
        const apiRes = await fetch('/api/demo', { cache: 'no-store' });
        const { vapidPublicKey } = await apiRes.json();

        subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subRes = await fetch('/api/demo', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'SUBSCRIBE',
          role: 'staff',
          subscription,
        }),
      });

      if (!subRes.ok) {
        console.error('Failed to register subscription:', await subRes.text());
        return;
      }

      setSubscribed(true);
      new Notification('Alerts Enabled!', { body: 'You will now receive shift notifications.' });
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (e) {
      console.error('Failed to subscribe:', e);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/demo', { cache: 'no-store' });
      const data = await res.json();
      
      // Removed local notifications to avoid duplicates with Push
      // But we still poll for UI state updates

      previousState.current = data.step;
      setState(data.step);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendAction = async (action: string) => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      // Avoid UI flicker / oscillation in multi-tab scenarios.
      console.error('Action rejected:', await res.text());
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 flex flex-col items-center justify-center font-sans text-white">
      <div className="w-full max-w-md">
        
        <header className="flex justify-between items-center mb-8">
           <h1 className="text-gray-400 font-medium">ServiceScope Staff</h1>
           <div className={`h-2 w-2 rounded-full ${state === 'POSTED' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
        </header>

        {/* PERMISSION / SUBSCRIBE BUTTON */}
        {(permission === 'default' || (permission === 'granted' && !subscribed)) && (
          <button 
            onClick={enableAlerts}
            className="w-full mb-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg animate-pulse transition-all"
          >
            🔔 Enable Notifications
          </button>
        )}

        {state === 'IDLE' && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <div className="text-6xl mb-4 grayscale opacity-50">😴</div>
            <p className="text-lg">No shifts available right now.</p>
            <p className="text-sm">We&apos;ll notify you when work comes in.</p>
          </div>
        )}

        {state === 'POSTED' && (
          <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl border-4 border-yellow-400 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <span>🔥</span> Urgent
              </span>
              <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">£11.00 / hr</span>
            </div>
            
            <h2 className="text-3xl font-bold mb-1">Bar Staff</h2>
            <p className="text-gray-500 mb-6 flex items-center gap-2">
               <span>🕒</span> Fri 18:00 - 23:00
            </p>
            
            <button 
              onClick={() => sendAction('CLAIM_SHIFT')}
              className="w-full py-4 bg-black text-white rounded-xl font-bold text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              CLAIM SHIFT ⚡️
            </button>
          </div>
        )}

        {state === 'CLAIMED' && (
          <div className="text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-white">Waiting for Manager...</h2>
            <p className="text-gray-400 mt-2">You have claimed this shift.</p>
          </div>
        )}

        {state === 'APPROVED' && (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-8 text-center shadow-lg animate-in zoom-in duration-300">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">You got it!</h2>
            <p className="text-green-100 mb-6">Shift added to your calendar.</p>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                <p className="font-mono text-sm">Friday • 18:00 • Bar Staff</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
