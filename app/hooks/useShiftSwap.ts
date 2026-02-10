'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type DemoStep = 'IDLE' | 'POSTED' | 'CLAIMED' | 'APPROVED';
export type Role = 'manager' | 'staff';
export type Action = 'SUBSCRIBE' | 'POST_SHIFT' | 'CLAIM_SHIFT' | 'APPROVE_SHIFT' | 'RESET';

export type DemoState = {
  step: DemoStep;
  version: number;
  updatedAt: number;
  vapidPublicKey?: string;
  shiftDetails: {
    role: string;
    time: string;
    rate: string;
    candidate: string;
  };
};

// ── VAPID key helper ───────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

// ── Shared hook ────────────────────────────────────────────────────────────────
export function useShiftSwap(role: Role) {
  const [state, setState] = useState<DemoState | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [acting, setActing] = useState(false);
  const versionRef = useRef(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ── Poll with version gating (prevents flicker) ──────────────────────────
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/demo', { cache: 'no-store' });
      if (!res.ok) return;
      const data: DemoState = await res.json();

      // Only update React state when the server version actually changes
      if (data.version !== versionRef.current) {
        versionRef.current = data.version;
        setState(data);
      }
    } catch {
      // Network blip — silently retry on next tick
    }
  }, []);

  useEffect(() => {
    // Immediate first poll
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  // ── Auto-resubscribe on mount if permission already granted ───────────────
  useEffect(() => {
    if (notifPermission !== 'granted') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Re-register the subscription with the server (it might have restarted)
          await fetch('/api/demo', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'SUBSCRIBE', role, subscription: existing }),
          });
          setSubscribed(true);
        }
      } catch (e) {
        console.warn('[ShiftSwap] Auto-resubscribe failed:', e);
      }
    })();
  }, [notifPermission, role]);

  // ── Subscribe to push notifications ───────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm !== 'granted') return;

    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // Fetch the VAPID public key from the server
        const apiRes = await fetch('/api/demo', { cache: 'no-store' });
        const { vapidPublicKey } = await apiRes.json();
        if (!vapidPublicKey) {
          console.error('[ShiftSwap] No VAPID public key from server');
          return;
        }

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const resp = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'SUBSCRIBE', role, subscription: sub }),
      });

      if (!resp.ok) {
        console.error('[ShiftSwap] Subscription registration failed');
        return;
      }

      setSubscribed(true);
    } catch (e) {
      console.error('[ShiftSwap] Subscribe error:', e);
    }
  }, [role]);

  // ── Dispatch an action ────────────────────────────────────────────────────
  const sendAction = useCallback(
    async (action: Action) => {
      setActing(true);
      try {
        const res = await fetch('/api/demo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          const data: DemoState = await res.json();
          versionRef.current = data.version;
          setState(data);
        }
      } catch (e) {
        console.error('[ShiftSwap] Action failed:', e);
      } finally {
        setActing(false);
      }
    },
    []
  );

  const needsSubscription = !subscribed && notifPermission !== 'denied';

  return { state, subscribed, notifPermission, acting, needsSubscription, subscribe, sendAction, poll };
}
