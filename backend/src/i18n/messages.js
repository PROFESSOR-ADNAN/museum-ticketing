/** FR-LOC-001: every error/notice text exists in English and Amharic. */
export const messages = {
  VALIDATION: { en: 'Some fields are missing or invalid.', am: 'አንዳንድ መረጃዎች ጎድለዋል ወይም ትክክል አይደሉም።' },
  UNAUTHENTICATED: { en: 'Please sign in to continue.', am: 'ለመቀጠል እባክዎ ይግቡ።' },
  FORBIDDEN: { en: 'You do not have permission for this action.', am: 'ይህን ተግባር ለማከናወን ፈቃድ የለዎትም።' },
  DUPLICATE: { en: 'This value already exists.', am: 'ይህ መረጃ አስቀድሞ አለ።' },
  NOT_FOUND: { en: 'Not found.', am: 'አልተገኘም።' },
  BAD_CREDENTIALS: { en: 'Incorrect email or password.', am: 'የተሳሳተ ኢሜይል ወይም የይለፍ ቃል።' },
  EMAIL_TAKEN: { en: 'This email or phone is already registered.', am: 'ይህ ኢሜይል ወይም ስልክ ቀደም ብሎ ተመዝግቧል።' },
  BAD_CODE: { en: 'The verification code is wrong or expired.', am: 'የማረጋገጫ ኮዱ የተሳሳተ ነው ወይም ጊዜው አልፏል።' },
  NOT_VERIFIED: { en: 'Verify your email and phone before paying.', am: 'ከመክፈልዎ በፊት ኢሜይልዎን እና ስልክዎን ያረጋግጡ።' },
  BAD_DATE: { en: 'Choose a valid upcoming visit date.', am: 'ትክክለኛ የጉብኝት ቀን ይምረጡ።' },
  DATE_CLOSED: { en: 'Online booking is closed for this date.', am: 'ለዚህ ቀን የመስመር ላይ ቦታ ማስያዝ ተዘግቷል።' },
  BAD_CATEGORY: { en: 'This ticket category is unavailable for online booking.', am: 'ይህ የትኬት ምድብ በመስመር ላይ አይገኝም።' },
  BAD_STATE: { en: 'This action is not allowed in the booking’s current status.', am: 'ይህ ተግባር ባሁኑ የቦታ ማስያዣ ሁኔታ አይፈቀድም።' },
  ALREADY_RESCHEDULED: { en: 'A booking can be rescheduled only once. Cancel and rebook instead.', am: 'ቦታ ማስያዝ አንድ ጊዜ ብቻ ነው ሊቀየር የሚችለው። በምትኩ ሰርዘው እንደገና ያስይዙ።' },
  OVER_BOOKED: { en: 'Attendance cannot exceed the booked quantity. Extra visitors must book or pay separately.', am: 'የመጡት ሰዎች ከተያዘው ቁጥር መብለጥ አይችሉም። ተጨማሪ ጎብኚዎች ለየብቻ መያዝ ወይም መክፈል አለባቸው።' },
  NO_SHORTFALL: { en: 'There is no unattended portion to refund.', am: 'ተመላሽ የሚደረግ ያልተጠቀሙበት ክፍል የለም።' },
  NOTHING_TO_SETTLE: { en: 'There are no visited bookings waiting for transfer.', am: 'ለማስተላለፍ የሚጠብቁ የተጎበኙ ቦታዎች የሉም።' },
  NEGATIVE_SETTLEMENT: { en: 'Pending refund deductions exceed the amount to transfer. Wait for more visited bookings.', am: 'የሚቀነሱ ተመላሾች ከሚተላለፈው መጠን ይበልጣሉ። ተጨማሪ የተጎበኙ ቦታዎችን ይጠብቁ።' },
  PAYMENT_FAILED: { en: 'Payment was not completed.', am: 'ክፍያው አልተጠናቀቀም።' },
  BAD_SIGNATURE: { en: 'Invalid signature.', am: 'ልክ ያልሆነ ፊርማ።' },
  PAYMENT_UNAVAILABLE: { en: 'The payment service is not available right now. Please try again in a few minutes.', am: 'የክፍያ አገልግሎቱ አሁን አይገኝም። እባክዎ ከጥቂት ደቂቃዎች በኋላ ይሞክሩ።' },
  GATE_VALID: { en: 'PAID — valid for today. You may admit the visitors.', am: 'ተከፍሏል — ለዛሬ ትክክለኛ ነው። ጎብኚዎቹን ማስገባት ይችላሉ።' },
  GATE_WRONG_DATE: { en: 'PAID — but this ticket is for {date}, not today.', am: 'ተከፍሏል — ነገር ግን ይህ ትኬት ለ{date} ነው፤ ለዛሬ አይደለም።' },
  GATE_ALREADY_USED: { en: 'ALREADY USED — these visitors were already admitted.', am: 'ቀድሞ ጥቅም ላይ ውሏል — እነዚህ ጎብኚዎች ቀደም ብለው ገብተዋል።' },
  GATE_CANCELLED: { en: 'NOT VALID — this booking was cancelled.', am: 'ልክ አይደለም — ይህ ቦታ ማስያዣ ተሰርዟል።' },
  GATE_REFUNDED: { en: 'NOT VALID — this booking was refunded.', am: 'ልክ አይደለም — ይህ ቦታ ማስያዣ ተመላሽ ተደርጓል።' },
  GATE_UNPAID: { en: 'NOT PAID — payment was not completed.', am: 'አልተከፈለም — ክፍያው አልተጠናቀቀም።' },
  GATE_DECLINED: { en: 'NOT VALID — the group request was declined.', am: 'ልክ አይደለም — የቡድን ጥያቄው ተቀባይነት አላገኘም።' },
  GATE_INVALID: { en: 'NOT VALID — this QR code was not issued by this system.', am: 'ልክ አይደለም — ይህ QR ኮድ በዚህ ሥርዓት አልተሰጠም።' },
  GATE_NOT_FOUND: { en: 'NOT FOUND — no booking with this reference.', am: 'አልተገኘም — በዚህ ቁጥር የተያዘ ቦታ የለም።' },
  UNPAID: { en: 'This booking has not been paid.', am: 'ይህ ቦታ ማስያዣ አልተከፈለም።' },
  GROUP_REQUIRED: { en: 'Group bookings need an organization name, time slot and headcount.', am: 'የቡድን ቦታ ማስያዣ የድርጅት ስም፣ የጊዜ ክፍል እና የሰዎች ቁጥር ይፈልጋል።' },
};
export const msg = (code, lang = 'en', params = {}) => {
  const m = messages[code]?.[lang] || messages[code]?.en || code;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), m);
};
