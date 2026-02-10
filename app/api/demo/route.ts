import { NextResponse } from 'next/server';
import webpush, { type PushSubscription } from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'manager' | 'staff';
type DemoStep = 'IDLE' | 'POSTED' | 'CLAIMED' | 'APPROVED';
type Action = 'SUBSCRIBE' | 'POST_SHIFT' | 'CLAIM_SHIFT' | 'APPROVE_SHIFT' | 'RESET';

type DemoState = {
  step: DemoStep;
  version: number;
  updatedAt: number;
  shiftDetails: {
    role: string;
    time: string;
    rate: string;
    candidate: string;
  };
};

type Store = {
  state: DemoState;
  subscriptions: Record<Role, Map<string, PushSubscription>>;
};

const publicVapidKey =
  process.env.VAPID_PUBLIC_KEY ??
  process.env.publicVapidKey ??
  '';

const privateVapidKey =
  process.env.VAPID_PRIVATE_KEY ??
  process.env.privateVapidKey ??
  '';

if (!publicVapidKey || !privateVapidKey) {
  // In dev, missing VAPID keys is a common source of "spotty" notifications.
  console.warn(
    '[ShiftSwap] Missing VAPID keys. Set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (or publicVapidKey/privateVapidKey) in .env.local'
  );
}

webpush.setVapidDetails('mailto:test@example.com', publicVapidKey, privateVapidKey);

const globalForDemo = globalThis as unknown as {
  __shiftswapDemoStore?: Store;
};

function getStore(): Store {
  if (!globalForDemo.__shiftswapDemoStore) {
    globalForDemo.__shiftswapDemoStore = {
      state: {
        step: 'IDLE',
        version: 0,
        updatedAt: Date.now(),
        shiftDetails: {
          role: 'Bar Staff',
          time: 'Fri 18:00 - 23:00',
          rate: '£11/hr',
          candidate: 'Mike',
        },
      },
      subscriptions: {
        manager: new Map(),
        staff: new Map(),
      },
    };
  }

  return globalForDemo.__shiftswapDemoStore;
}

function jsonNoStore(payload: unknown, init?: { status?: number }) {
  return NextResponse.json(payload, {
    status: init?.status,
    headers: {
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

async function notifyRole(role: Role, payload: { title: string; body: string; url: string; tag?: string }) {
  const store = getStore();
  const targets = store.subscriptions[role];

  const removals: string[] = [];
  await Promise.all(
    Array.from(targets.entries()).map(async ([endpoint, subscription]) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        console.error('[ShiftSwap] Push failed; removing subscription', err);
        removals.push(endpoint);
      }
    })
  );

  for (const endpoint of removals) {
    targets.delete(endpoint);
  }
}

function applyTransition(current: DemoStep, action: Action): DemoStep | null {
  if (action === 'RESET') return 'IDLE';
  if (action === 'POST_SHIFT') return current === 'IDLE' ? 'POSTED' : null;
  if (action === 'CLAIM_SHIFT') return current === 'POSTED' ? 'CLAIMED' : null;
  if (action === 'APPROVE_SHIFT') return current === 'CLAIMED' ? 'APPROVED' : null;
  return null;
}

export async function GET() {
  const store = getStore();
  return jsonNoStore({ ...store.state, vapidPublicKey: publicVapidKey });
}

export async function POST(request: Request) {
  const store = getStore();
  const body = (await request.json().catch(() => null)) as
    | {
        action?: Action;
        role?: Role;
        subscription?: PushSubscription;
      }
    | null;

  const action = body?.action;
  if (!action) {
    return jsonNoStore({ error: 'Missing action', state: store.state }, { status: 400 });
  }

  if (action === 'SUBSCRIBE') {
    const role: Role = body?.role === 'manager' ? 'manager' : 'staff';
    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    if (!endpoint) {
      return jsonNoStore({ error: 'Invalid subscription', state: store.state }, { status: 400 });
    }

    store.subscriptions[role].set(endpoint, sub);
    return jsonNoStore({ status: 'Subscribed', role, count: store.subscriptions[role].size });
  }

  const next = applyTransition(store.state.step, action);
  if (!next) {
    return jsonNoStore(
      {
        error: 'Invalid state transition',
        from: store.state.step,
        action,
        state: store.state,
      },
      { status: 409 }
    );
  }

  if (next !== store.state.step) {
    store.state.step = next;
    store.state.version += 1;
    store.state.updatedAt = Date.now();
  }

  // Role-targeted notifications
  if (action === 'POST_SHIFT') {
    await notifyRole('staff', {
      title: 'New Shift Available',
      body: 'Bar Staff · Fri 18:00 – 23:00 · £11/hr',
      url: '/staff',
      tag: 'shift-posted',
    });
  }

  if (action === 'CLAIM_SHIFT') {
    await notifyRole('manager', {
      title: 'Shift Claimed',
      body: 'Mike has claimed Bar Staff · Fri 18:00',
      url: '/manager',
      tag: 'shift-claimed',
    });
  }

  if (action === 'APPROVE_SHIFT') {
    await notifyRole('staff', {
      title: 'Shift Approved',
      body: 'You\'re confirmed for Bar Staff · Fri 18:00',
      url: '/staff',
      tag: 'shift-approved',
    });
  }

  return jsonNoStore(store.state);
}