import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron/verify-cron';
import { generateMonthlyInvoices } from '@/lib/queries/invoices';

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const results = await generateMonthlyInvoices();
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
