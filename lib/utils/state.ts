import crypto from 'crypto';

/**
 * Signs the branch ID to create a CSRF-protected OAuth state parameter.
 * The state format is: branchId:timestamp:signature
 */
export function signState(branchId: string): string {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined.');
  }

  const timestamp = Date.now().toString();
  const data = `${branchId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', Buffer.from(hexKey, 'hex')).update(data).digest('hex');
  return `${branchId}:${timestamp}:${hmac}`;
}

/**
 * Verifies the signed state parameter and returns the branchId if valid.
 * Returns null if the state is invalid, tampered with, or expired (older than 1 hour).
 */
export function verifyState(state: string): string | null {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined.');
  }

  const parts = state.split(':');
  if (parts.length !== 3) return null;

  const [branchId, timestamp, hmac] = parts;

  // CSRF validation: verify signature
  const data = `${branchId}:${timestamp}`;
  const expectedHmac = crypto.createHmac('sha256', Buffer.from(hexKey, 'hex')).update(data).digest('hex');
  if (hmac !== expectedHmac) {
    return null;
  }

  // Expiration validation: state parameter expires in 1 hour (3600000ms)
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || Date.now() - timestampNum > 3600000) {
    return null;
  }

  return branchId;
}
