import 'server-only';

import { query } from '@/lib/db';
import {
  listPendingBarrierJobs,
  updateBarrierJob,
} from '@/lib/queries/barrier_jobs';

export interface ProcessBarrierJobsResult {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
}

/**
 * Mock barrier processor — marks jobs COMPLETED without calling real hardware.
 * Actual Hikvision/Dahua/ZKTeco integration will replace this later.
 */
export async function processPendingBarrierJobs(
  organizationId?: string,
): Promise<ProcessBarrierJobsResult> {
  const orgFilter = organizationId ? 'WHERE id = $1' : '';
  const orgParams = organizationId ? [organizationId] : [];

  const { rows: orgs } = await query<{ id: string }>(
    `SELECT id FROM organizations ${orgFilter}`,
    orgParams,
  );

  let processed = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const org of orgs) {
    const jobs = await listPendingBarrierJobs(org.id, 50);
    for (const job of jobs) {
      processed += 1;
      try {
        await updateBarrierJob(job.id, {
          status: 'PROCESSING',
          attempts: job.attempts + 1,
        });
        await updateBarrierJob(job.id, {
          status: 'COMPLETED',
          attempts: job.attempts + 1,
          last_error: null,
          processed_at: new Date().toISOString(),
        });
        completed += 1;
      } catch (error) {
        await updateBarrierJob(job.id, {
          status: 'FAILED',
          attempts: job.attempts + 1,
          last_error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed += 1;
      }
    }
    if (jobs.length === 0) skipped += 1;
  }

  return { processed, completed, failed, skipped };
}
