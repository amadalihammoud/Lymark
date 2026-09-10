import { coordsAsPlace, reverseGeocode } from "@/lib/locate";
import type { MediaItem } from "@/store/studio";

export async function enrichMedia(item: MediaItem): Promise<MediaItem> {
  if (!item.gps || item.place) return item;
  try {
    const geo = await reverseGeocode(item.gps.lat, item.gps.lng);
    return { ...item, place: { ...geo, source: "exif" } };
  } catch {
    return { ...item, place: { ...coordsAsPlace(item.gps.lat, item.gps.lng), source: "exif" } };
  }
}

export async function enrichMediaList(
  items: MediaItem[],
  onItem: (item: MediaItem) => void,
): Promise<void> {
  for (const item of items) {
    const next = await enrichMedia(item);
    if (next.place !== item.place) onItem(next);
  }
}
