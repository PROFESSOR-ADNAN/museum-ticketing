import { config } from '../../config.js';
import { ChapaProvider } from './chapa.js';

let provider = null;
export function getProvider() {
  if (provider) return provider;
  if (config.payment.provider !== 'chapa') throw new Error(`Unknown PAYMENT_PROVIDER "${config.payment.provider}" (supported: chapa)`);
  provider = new ChapaProvider(config.chapa);
  return provider;
}
export const resetProvider = () => { provider = null; };
