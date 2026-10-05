import { amountInWords } from '../utils/money.js';

/**
 * FR-LOC-002/003: every generated document carries Amharic and English together.
 * Clients render `title`, `fields[].label/value` and `amountInWords` side by side.
 */
const L = (en, am) => ({ en, am });

export function temporaryReceipt(booking, visitor, qrToken = null) {
  return {
    type: 'temporary_receipt',
    title: L('Temporary Receipt — Science Museum', 'ጊዜያዊ ደረሰኝ — ሳይንስ ሙዚየም'),
    number: booking.tempReceiptNo,
    bookingRef: booking.ref,
    status: booking.status,
    fields: [
      { label: L('Booking reference', 'የቦታ ማስያዣ ቁጥር'), value: booking.ref },
      { label: L('Visitor', 'ጎብኚ'), value: visitor?.name || '' },
      { label: L('Visit date', 'የጉብኝት ቀን'), value: booking.visitDate },
      ...(booking.timeSlot ? [{ label: L('Time slot', 'የጊዜ ክፍል'), value: booking.timeSlot }] : []),
      ...(booking.organization ? [{ label: L('School / group', 'ትምህርት ቤት / ቡድን'), value: booking.organization }] : []),
      { label: L('Visitors booked', 'የተያዙ ጎብኚዎች'), value: String(booking.bookedQuantity) },
      { label: L('Paid on', 'የተከፈለበት'), value: booking.paidAt || '' },
    ],
    lines: booking.lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice, subtotal: l.quantity * l.unitPrice })),
    total: booking.amount,
    amountInWords: amountInWords(booking.amount),
    // The QR carries a signed token; the museum scans it and the system confirms from the booking record whether it is paid and unused.
    qr: qrToken ? { token: qrToken } : null,
    note: L('Temporary: the final outcome depends on your visit. Show this QR code (or the booking reference) at the gate.',
      'ጊዜያዊ ነው፤ የመጨረሻው ውጤት በጉብኝትዎ ይወሰናል። ይህን QR ኮድ (ወይም የቦታ ማስያዣ ቁጥሩን) በበር ላይ ያሳዩ።'),
  };
}

/** FR-SETTLE-004: amount in figures and words, purpose, date, reference number. */
export function transferReceipt(settlement, cashier) {
  return {
    type: 'transfer_receipt',
    title: L('Transfer Receipt — Digital Ticket Revenue', 'የማስተላለፊያ ደረሰኝ — የዲጂታል ትኬት ገቢ'),
    number: settlement.ref,
    fields: [
      { label: L('Reference number', 'የማጣቀሻ ቁጥር'), value: settlement.ref },
      { label: L('Date', 'ቀን'), value: settlement.createdAt },
      { label: L('Purpose', 'ዓላማ'), value: settlement.purpose },
      { label: L('Transferred by (Cashier)', 'ያስተላለፈው (ካሸር)'), value: cashier?.name || '' },
      { label: L('Gross amount', 'ጠቅላላ መጠን'), value: `${settlement.grossAmount.toFixed(2)} ETB` },
      { label: L('Refund deductions', 'የተቀነሱ ተመላሾች'), value: `${settlement.refundDeduction.toFixed(2)} ETB` },
      { label: L('Bookings covered', 'የተካተቱ ቦታ ማስያዣዎች'), value: String(settlement.bookingRefs.length) },
    ],
    bookingRefs: settlement.bookingRefs,
    total: settlement.netAmount,
    amountInWords: settlement.amountInWords,
  };
}

export function noShowNotice(booking, graceDays) {
  const canResched = booking.rescheduleCount < 1;
  return {
    subject: L(`Your museum booking ${booking.ref} was not used`, `የሙዚየም ቦታ ማስያዣዎ ${booking.ref} አልተጠቀሙበትም`),
    body: L(
      `Your visit date (${booking.visitDate}) has passed and no attendance was recorded for booking ${booking.ref}. ` +
      (canResched ? 'Please reschedule it to a new date from your account. ' : 'This booking was already rescheduled once, so it cannot be moved again; you may cancel it for a refund. ') +
      `If we do not hear from you within ${graceDays} days, the booking will be automatically refunded to your original payment method, minus the payment provider's transaction charge.`,
      `የጉብኝት ቀንዎ (${booking.visitDate}) አልፏል፤ ለቦታ ማስያዣ ${booking.ref} ምንም መገኘት አልተመዘገበም። ` +
      (canResched ? 'እባክዎ ከመለያዎ ወደ አዲስ ቀን ይቀይሩት። ' : 'ይህ ቦታ ማስያዣ አንድ ጊዜ ተቀይሯል፤ እንደገና መቀየር አይቻልም፤ ለተመላሽ መሰረዝ ይችላሉ። ') +
      `በ${graceDays} ቀናት ውስጥ ምላሽ ካልሰጡ፣ ቦታ ማስያዣው የክፍያ አቅራቢው የግብይት ክፍያ ተቀንሶ በራስ-ሰር ወደ ዋናው የክፍያ መንገድዎ ይመለሳል።`),
  };
}

export const bilingual = (t) => `${t.en}\n\n${t.am}`;
