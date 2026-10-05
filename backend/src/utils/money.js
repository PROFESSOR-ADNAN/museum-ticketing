/** Amount-in-words for formal receipts, English + Amharic (FR-LOC-003, FR-SETTLE-004). */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
/** Money is stored as integer santim (1 ETB = 100 santim) so sums are exact. */
export const toCents = (etb) => Math.round(Number(etb) * 100 + (Number(etb) < 0 ? -1e-9 : 1e-9));
export const fromCents = (c) => (c == null ? null : c / 100);

const EN_ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
  'thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function enBelow1000(n) {
  const parts = [];
  if (n >= 100) { parts.push(`${EN_ONES[Math.floor(n / 100)]} hundred`); n %= 100; }
  if (n >= 20) { parts.push(EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : '')); }
  else if (n > 0) parts.push(EN_ONES[n]);
  return parts.join(' ');
}
export function numberToWordsEn(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zero';
  const scales = ['', ' thousand', ' million', ' billion'];
  const out = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) out.unshift(enBelow1000(chunk) + scales[i]);
    n = Math.floor(n / 1000); i++;
  }
  return out.join(' ');
}

const AM_ONES = ['ዜሮ','አንድ','ሁለት','ሦስት','አራት','አምስት','ስድስት','ሰባት','ስምንት','ዘጠኝ'];
const AM_TENS = { 1:'አሥር', 2:'ሃያ', 3:'ሠላሳ', 4:'አርባ', 5:'ሃምሳ', 6:'ስድሳ', 7:'ሰባ', 8:'ሰማንያ', 9:'ዘጠና' };

function amBelow1000(n) {
  const parts = [];
  if (n >= 100) { const h = Math.floor(n / 100); parts.push(h === 1 ? 'መቶ' : `${AM_ONES[h]} መቶ`); n %= 100; }
  if (n >= 10) { parts.push(AM_TENS[Math.floor(n / 10)]); n %= 10; }
  if (n > 0) parts.push(AM_ONES[n]);
  return parts.join(' ');
}
export function numberToWordsAm(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'ዜሮ';
  const scales = ['', ' ሺህ', ' ሚሊዮን', ' ቢሊዮን'];
  const out = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) out.unshift(amBelow1000(chunk) + scales[i]);
    n = Math.floor(n / 1000); i++;
  }
  return out.join(' ');
}

export function amountInWords(amount) {
  const a = round2(amount);
  const birr = Math.floor(a);
  const cents = Math.round((a - birr) * 100);
  const en = `${numberToWordsEn(birr)} Birr${cents ? ` and ${numberToWordsEn(cents)} cents` : ''} only`;
  const am = `${numberToWordsAm(birr)} ብር${cents ? ` ከ${numberToWordsAm(cents)} ሳንቲም` : ''} ብቻ`;
  return { en, am };
}
