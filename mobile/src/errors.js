import { BASE } from './api';

/** One place that turns an API error into text the user can act on. */
export function errText(t, e) {
  if (!e) return '';
  if (e.code === 'NETWORK') return `${t('errNetwork')}\n${BASE}`;      // show WHICH address the phone tried
  return e.message && e.message !== 'Error' ? e.message : t('errGeneric');
}
