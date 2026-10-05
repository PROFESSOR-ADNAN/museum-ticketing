/**
 * Payment provider contract. The platform's own bank account receives the money (SRS FR-PAY-001).
 * Money is passed as integer santim (amountCents).
 */
export class PaymentProvider {
  get name() { throw new Error('not implemented'); }
  /** -> { providerRef, checkoutUrl } */
  async initiate(_args) { throw new Error('not implemented'); }
  /** AUTHORITATIVE server-to-server check (NFR-SEC-001). -> { status: 'success'|'failed'|'pending', amountCents, feeCents, currency, txRef, reference } */
  async verify(_providerRef) { throw new Error('not implemented'); }
  /** -> boolean */
  verifyWebhookSignature(_rawBody, _headers, _parsedBody) { throw new Error('not implemented'); }
  /** -> { refundRef, status: 'processing'|'done' } */
  async refund(_args) { throw new Error('not implemented'); }
  /** -> { status: 'processing'|'done'|'failed' } */
  async verifyRefund(_refundRef) { throw new Error('not implemented'); }
}
