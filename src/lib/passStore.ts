import { getItem, setItem } from './storage';
import { cleanWhatsappUrl } from './whatsapp';

export interface PassData {
  regId: string;
  eventId: string;
  name: string;
  /** Other team members' names (registrant excluded). Empty for individual events or looked-up passes. */
  members: string[];
  teamName: string;
  /** The event's WhatsApp group/channel link, when the server sent one. Shown as a button; never drawn into the PNG. */
  whatsappUrl?: string;
}

const KEY = 'kr26.lastPass';

export function savePass(p: PassData) {
  setItem('session', KEY, JSON.stringify(p));
}

export function loadPass(): PassData | null {
  const raw = getItem('session', KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<PassData>;
    if (typeof p.regId !== 'string' || typeof p.eventId !== 'string' || typeof p.name !== 'string') return null;
    const whatsappUrl = cleanWhatsappUrl(p.whatsappUrl) ?? undefined;
    return {
      regId: p.regId,
      eventId: p.eventId,
      name: p.name,
      members: Array.isArray(p.members) ? p.members : [],
      teamName: p.teamName ?? '',
      ...(whatsappUrl ? { whatsappUrl } : {}),
    };
  } catch {
    return null;
  }
}

export function isPassData(v: unknown): v is PassData {
  const p = v as PassData | null;
  return !!p && typeof p.regId === 'string' && typeof p.eventId === 'string' && typeof p.name === 'string' && Array.isArray(p.members);
}
