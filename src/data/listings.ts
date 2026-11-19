// ============================================================================
// CATALOG LISTINGS (list.am-style)
// ----------------------------------------------------------------------------
// Every item in the Catalog is one "Listing" card.
// - category: which section it lives in ('cars' or 'tech')
// - viewer:   which "room" opens when the card is clicked
//     'car-360'   -> the car opens in the Motor Gallery with its 360° spin
//     'device-3d' -> the device opens in the 3D tech viewer
//     'photos'    -> a simple photo gallery (for items without an 8K view)
//
// Cars and tech devices that already exist on the site are added automatically.
// To add YOUR OWN item, copy the example inside MY_LISTINGS below.
// Later these cards can move into a database without changing their shape.
// ============================================================================

import { LUXURY_CARS } from './luxuryCarsData';
import { DEVICES } from './devices';
import type { BrandId, DeviceCategory, LocalizedText } from '../types/hardware';
import type { DbListing } from '../lib/supabase';

export type ListingCategory = 'cars' | 'tech';

export type ListingViewer =
  | { type: 'car-360'; carId: string }
  | { type: 'device-3d'; deviceId: string; brand: BrandId }
  | { type: 'photos'; photos: string[]; spin?: boolean }
  /** opens its own full-screen scroll window (frames from a video) */
  | { type: 'scroll-story'; frames: string[]; mobileFrames?: string[]; deviceId: string };

export interface Listing {
  id: string;
  category: ListingCategory;
  title: LocalizedText;
  priceUsd: number;
  city: LocalizedText;
  /** Date the listing was posted, YYYY-MM-DD */
  postedAt: string;
  brand: string;
  year?: number;
  /** Main photo for the card. Tech devices without a photo get a drawn picture. */
  imageUrl?: string;
  /** true = has an interactive 8K / 3D view */
  is8k: boolean;
  viewer: ListingViewer;
  /** Only for tech cards (used to draw the device picture) */
  deviceCategory?: DeviceCategory;
  colorHex?: string;
  /** Only for listings posted by users (stored in the database) */
  description?: string;
  phone?: string;
  ownerId?: string;
  dbId?: string;
}

export const LISTING_CATEGORIES: Array<{ id: ListingCategory; label: LocalizedText; icon: string }> = [
  { id: 'cars', label: { en: 'Cars', hy: 'Մեքենաներ' }, icon: '🚗' },
  { id: 'tech', label: { en: 'Electronics', hy: 'Տեխնիկա' }, icon: '📱' },
];

// ----------------------------------------------------------------------------
// ★ YOUR OWN LISTINGS — copy the example, remove the // and change the values.
// Put photos in public/listings/ and write their path like '/listings/my-photo.jpg'
// ----------------------------------------------------------------------------
export const MY_LISTINGS: Listing[] = [
  // {
  //   id: 'my-bmw-x5',
  //   category: 'cars',
  //   title: { en: 'BMW X5 2019', hy: 'BMW X5 2019' },
  //   priceUsd: 38000,
  //   city: { en: 'Yerevan', hy: 'Երևան' },
  //   postedAt: '2026-11-16',
  //   brand: 'BMW',
  //   year: 2019,
  //   imageUrl: '/listings/bmw-x5-1.jpg',
  //   is8k: false,
  //   viewer: { type: 'photos', photos: ['/listings/bmw-x5-1.jpg', '/listings/bmw-x5-2.jpg'] },
  // },
];

const CAR_LISTINGS: Listing[] = LUXURY_CARS.map((car, i): Listing => ({
  id: `car-${car.id}`,
  category: 'cars',
  title: { en: `${car.year} ${car.fullName}`, hy: `${car.year} ${car.fullName}` },
  priceUsd: car.priceUsd,
  city: { en: 'Annapolis, MD', hy: 'Աննապոլիս, ՄԴ' },
  postedAt: `2026-11-${String(15 - i).padStart(2, '0')}`,
  brand: car.make,
  year: car.year,
  imageUrl: car.heroPhotoUrl,
  is8k: Boolean(car.spinFrames && car.spinFrames.length > 0),
  viewer: { type: 'car-360', carId: car.id },
}));

// Devices that have their own scroll-through video window in the Catalog
const scrollFrames = (dir: string, count: number) =>
  Array.from({ length: count }, (_, k) => `/cars/frames/${dir}/${String(k + 1).padStart(3, '0')}.jpg`);
const SCROLL_STORY_FRAMES: Record<string, string[]> = {
  'galaxy-s24-ultra': scrollFrames('s24-ultra', 120),
};
// lighter 720px set for phones (3x less data and memory)
const SCROLL_STORY_MOBILE_FRAMES: Record<string, string[]> = {
  'galaxy-s24-ultra': scrollFrames('s24-ultra-m', 120),
};

const TECH_LISTINGS: Listing[] = DEVICES.map((device, i): Listing => ({
  id: `tech-${device.id}`,
  category: 'tech',
  title: { en: device.name, hy: device.name },
  priceUsd: device.basePriceUsd,
  city: { en: 'Yerevan', hy: 'Երևան' },
  postedAt: `2026-11-${String(14 - (i % 10)).padStart(2, '0')}`,
  brand: device.brand.charAt(0).toUpperCase() + device.brand.slice(1),
  year: Number(device.releaseYear) || undefined,
  is8k: true,
  viewer: SCROLL_STORY_FRAMES[device.id]
    ? { type: 'scroll-story', frames: SCROLL_STORY_FRAMES[device.id], mobileFrames: SCROLL_STORY_MOBILE_FRAMES[device.id], deviceId: device.id }
    : { type: 'device-3d', deviceId: device.id, brand: device.brand },
  imageUrl: SCROLL_STORY_FRAMES[device.id]?.[0],
  deviceCategory: device.category,
  colorHex: device.finishes[0]?.hex,
}));

export const ALL_LISTINGS: Listing[] = [...MY_LISTINGS, ...CAR_LISTINGS, ...TECH_LISTINGS];

/** Turns a database row (posted by a user) into a catalog card */
export function listingFromDb(row: DbListing): Listing {
  return {
    id: `db-${row.id}`,
    dbId: row.id,
    ownerId: row.owner_id,
    category: row.category,
    title: { en: row.title, hy: row.title },
    priceUsd: Number(row.price_usd),
    city: { en: row.city, hy: row.city },
    postedAt: row.created_at.slice(0, 10),
    brand: row.brand,
    year: row.year ?? undefined,
    imageUrl: row.photos[0],
    is8k: Boolean(row.spin),
    viewer: { type: 'photos', photos: row.photos, spin: Boolean(row.spin) },
    description: row.description,
    phone: row.phone ?? undefined,
  };
}
