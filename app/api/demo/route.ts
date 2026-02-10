import { NextResponse } from 'next/server';

// This is a "hacky" in-memory database for the demo.
// It resets if you restart the server, but works perfectly for a 5-minute live demo.
let demoState = {
  step: 'IDLE', // IDLE | POSTED | CLAIMED | APPROVED
  shiftDetails: {
    role: 'Bar Staff',
    time: 'Fri 18:00 - 23:00',
    rate: '£11/hr',
    candidate: 'Mike'
  }
};

export async function GET() {
  return NextResponse.json(demoState);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.action === 'POST_SHIFT') demoState.step = 'POSTED';
  if (body.action === 'CLAIM_SHIFT') demoState.step = 'CLAIMED';
  if (body.action === 'APPROVE_SHIFT') demoState.step = 'APPROVED';
  if (body.action === 'RESET') demoState.step = 'IDLE';

  return NextResponse.json(demoState);
}

// Force dynamic so phones don't cache old data
export const dynamic = 'force-dynamic';