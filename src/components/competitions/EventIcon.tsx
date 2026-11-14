import { createElement } from 'react';
import {
  Brain,
  Feather,
  FileText,
  Flower,
  Megaphone,
  MessagesSquare,
  Mic,
  Music,
  Palette,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/** events.json `icon` names → lucide components (explicit map keeps the bundle tree-shaken). */
const ICONS: Record<string, LucideIcon> = {
  'file-text': FileText,
  feather: Feather,
  palette: Palette,
  mic: Mic,
  brain: Brain,
  users: Users,
  search: Search,
  music: Music,
  flower: Flower,
  megaphone: Megaphone,
  'messages-square': MessagesSquare,
};

export function EventIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(ICONS[name] ?? Sparkles, props);
}
