'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { syncResidentWirePaymentAction } from '@/app/resident/payments/actions';

export function WirePaymentReturnSync({
  paymentIntentId,
  initialStatus,
}: {
  paymentIntentId: string;
  initialStatus: 'applied' | 'already_recorded' | 'pending' | 'none';
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const attempts = useRef(0);

  useEffect(() => {
    if (status !== 'pending' || !paymentIntentId) return;

    const timer = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 15) {
        clearInterval(timer);
        return;
      }

      void syncResidentWirePaymentAction(paymentIntentId).then((result) => {
        if (!result.ok) return;
        if (result.status === 'applied' || result.status === 'already_recorded') {
          setStatus(result.status);
          clearInterval(timer);
          router.refresh();
        }
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [paymentIntentId, router, status]);

  if (status === 'pending') {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Төлбөр баталгаажиж байна… Хэдэн секундын дараа автоматаар шинэчлэгдэнэ.
      </div>
    );
  }

  return null;
}
