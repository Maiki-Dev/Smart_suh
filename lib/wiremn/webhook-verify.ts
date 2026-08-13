import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_HEADERS = [
  'wirepayment-signature',
  'x-wire-signature',
  'x-wiremn-signature',
  'x-webhook-signature',
] as const;

export function readWireSignatureHeader(headers: Headers): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Wire.mn delivery: WirePayment-Signature: t=1717000000,v1=<hex>
 * HMAC_SHA256(secret, t + "." + rawBody)
 */
export function verifyWirePaymentSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!secret.trim()) return true;
  if (!signatureHeader) return false;

  const wireParts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return [part.trim(), ''];
      return [part.slice(0, eq).trim(), part.slice(eq + 1).trim()];
    }),
  );

  const timestamp = wireParts.t;
  const v1 = wireParts.v1;
  if (timestamp && v1) {
    const expected = createHmac('sha256', secret.trim())
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    return safeEqualHex(expected, v1.replace(/^v1=/, ''));
  }

  // Legacy/simple hex HMAC over raw body
  try {
    const expected = createHmac('sha256', secret.trim()).update(rawBody, 'utf8').digest('hex');
    const provided = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;
    return expected.toLowerCase() === provided.replace(/^sha256=/, '').toLowerCase();
  } catch {
    return false;
  }
}
