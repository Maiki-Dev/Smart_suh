import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron/verify-cron';
import { processPendingBarrierJobs } from '@/lib/barrier/mock-provider';

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await processPendingBarrierJobs();
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
