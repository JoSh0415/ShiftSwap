'use client';
import { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Bell, CheckCircle, Clock } from 'lucide-react';

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

export default function ManagerPage() {
  const [state, setState] = useState('IDLE');
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [subscribed, setSubscribed] = useState(false);
  const previousState = useRef('IDLE');

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/demo', { cache: 'no-store' });
      const data = await res.json();
      
      // Removed local notifications to avoid duplicates with Push
      
      previousState.current = data.step;
      setState(data.step);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const enableAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const res = await Notification.requestPermission();
    setPermission(res);
    if (res !== 'granted') return;

    if (!('serviceWorker' in navigator)) return;

    try {
      const register = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
          role: 'manager',
          subscription,
        }),
      });

      if (!subRes.ok) {
        console.error('Failed to register subscription:', await subRes.text());
        return;
      }

      setSubscribed(true);
      new Notification('Manager alerts enabled', { body: 'You will receive claim notifications.' });
    } catch (e) {
      console.error('Failed to subscribe manager:', e);
    }
  };

  const sendAction = async (action: string) => {
    setLoading(true);
    const res = await fetch('/api/demo', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      console.error('Action rejected:', await res.text());
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex flex-col items-center text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
             <div className="bg-blue-600 p-2 rounded-lg">
                <Bell size={20} className="text-white" />
             </div>
             <h1 className="text-xl font-bold">Manager Portal</h1>
          </div>
          <button 
             onClick={() => sendAction('RESET')}
             className="p-2 text-gray-500 hover:text-white transition-colors"
             title="Reset Demo"
          >
             <RefreshCcw size={20} />
          </button>
        </header>

        {(permission === 'default' || (permission === 'granted' && !subscribed)) && (
          <button
            onClick={enableAlerts}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-all"
          >
            🔔 Enable Manager Notifications
          </button>
        )}

        {/* STATUS CARD */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider font-bold mb-4">Current Status</h2>
            
            {state === 'IDLE' && (
              <div className="flex flex-col items-center py-6 text-gray-500">
                 <div className="mb-2 text-4xl">😴</div>
                 <p>No active shifts.</p>
              </div>
            )}

            {state === 'POSTED' && (
              <div className="flex flex-col items-center py-6 text-yellow-500 animate-pulse">
                 <Clock size={48} className="mb-4" />
                 <p className="font-medium text-lg">Waiting for staff...</p>
                 <p className="text-sm opacity-75">Notification sent to team</p>
              </div>
            )}

            {state === 'CLAIMED' && (
              <div className="flex flex-col items-center py-6 text-blue-400">
                 <div className="mb-2 text-4xl">🙋‍♂️</div>
                 <p className="font-bold text-lg text-white">Mike claimed the shift!</p>
                 <p className="text-sm text-gray-400">Waiting for your approval</p>
              </div>
            )}

            {state === 'APPROVED' && (
               <div className="flex flex-col items-center py-6 text-green-500">
                  <CheckCircle size={48} className="mb-4" />
                  <p className="font-bold text-lg text-white">Shift Filled</p>
                  <p className="text-sm text-gray-400">Mike is scheduled</p>
               </div>
            )}
        </div>

        {/* ACTIONS */}
        <div className="space-y-3">
           {state === 'IDLE' && (
             <button
               onClick={() => sendAction('POST_SHIFT')}
               disabled={loading}
               className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
             >
               📣 Post Friday Shift
             </button>
           )}

           {state === 'POSTED' && (
              <button
                onClick={() => sendAction('RESET')}
                disabled={loading}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold active:scale-95 transition-all"
              >
                Cancel Posting
              </button>
           )}

           {state === 'CLAIMED' && (
              <div className="grid grid-cols-2 gap-3">
                 <button
                   onClick={() => sendAction('RESET')} // Ideally reject
                   disabled={loading}
                   className="py-4 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-xl font-bold transition-all"
                 >
                   Decline
                 </button>
                 <button
                   onClick={() => sendAction('APPROVE_SHIFT')}
                   disabled={loading}
                   className="py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-green-900/20 shadow-lg active:scale-95 transition-all"
                 >
                   ✅ Approve
                 </button>
              </div>
           )}

           {state === 'APPROVED' && (
              <button
                onClick={() => sendAction('RESET')}
                disabled={loading}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold active:scale-95 transition-all"
              >
                Start New Cycle
              </button>
           )}
        </div>

      </div>
    </div>
  );
}
