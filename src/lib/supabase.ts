// Connection to the Supabase project "silicon-pulse"
// (database for user listings + photo storage + sign-in).
// The publishable key is safe to keep in the browser: the database rules
// (Row Level Security) decide what each user may read or change.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://qrhfejivuswjkrmmbubu.supabase.co';
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_L1MwxD_v_JdFGJnJpW2twg_E_llO3hw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const PHOTO_BUCKET = 'listing-photos';

/** One row of the "listings" table */
export interface DbListing {
  id: string;
  owner_id: string;
  category: 'cars' | 'tech';
  title: string;
  description: string;
  price_usd: number;
  city: string;
  brand: string;
  year: number | null;
  phone: string | null;
  photos: string[];
  /** true = the photos are frames of a 360° turntable video */
  spin?: boolean;
  created_at: string;
}
