import { verifyCronRequest } from '@/lib/cron/verify-cron';
import { closeExpiredVotings, sendVotingReminders } from '@/lib/community/voting';

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const [closed, reminders] = await Promise.all([
    closeExpiredVotings(),
    sendVotingReminders(),
  ]);

  return Response.json({ ok: true, closed, reminders });
}
