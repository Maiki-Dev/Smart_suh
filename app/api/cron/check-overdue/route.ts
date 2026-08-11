import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron/verify-cron';
import { syncOverdueInvoicesWithNotifications } from '@/lib/invoices/overdue-service';

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await syncOverdueInvoicesWithNotifications();
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
