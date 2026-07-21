import {
  ClipboardCheck,
  CloudSun,
  LifeBuoy,
  Navigation,
  Plane,
  RadioTower,
} from 'lucide-react';
import { HALO_NAVIGATION_ITEMS, type HaloPanelId } from '@/lib/ui/halo';

const HALO_NAVIGATION_ICONS = {
  route: Navigation,
  weather: CloudSun,
  aircraft: Plane,
  briefing: ClipboardCheck,
  admin: RadioTower,
  emergency: LifeBuoy,
} satisfies Record<HaloPanelId, typeof Navigation>;

export const HALO_PANEL_META = HALO_NAVIGATION_ITEMS.map((item) => ({
  ...item,
  icon: HALO_NAVIGATION_ICONS[item.id],
}));
