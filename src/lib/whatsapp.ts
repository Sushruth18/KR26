import { RULES } from './rules';

const GROUP = new RegExp(RULES.whatsapp.group);
const CHANNEL = new RegExp(RULES.whatsapp.channel);

/**
 * Returns a clean WhatsApp group/channel link, or null for anything else. Same rule as Code.gs: trim, drop
 * ?query / #fragment / trailing "/", then only https://chat.whatsapp.com/<code> or https://whatsapp.com/channel/<code>.
 * The pass page uses this on whatever the server (or sessionStorage) hands over before it becomes an href.
 */
export function cleanWhatsappUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = (v.trim().split(/[?#]/)[0] ?? '').replace(/\/$/, '');
  return GROUP.test(s) || CHANNEL.test(s) ? s : null;
}
