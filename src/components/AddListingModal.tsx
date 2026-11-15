import React, { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { PHOTO_BUCKET, supabase } from '../lib/supabase';
import { LISTING_CATEGORIES, ListingCategory } from '../data/listings';
import type { Currency, Language } from '../types/hardware';

interface AddListingModalProps {
  lang: Language;
  currency: Currency;
  /** Same rates the catalog uses, to turn the typed price into USD */
  rateFromUsd: number;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

const MAX_PHOTOS = 8;
const MAX_BYTES = 5 * 1024 * 1024;

/** "Post a listing" form: text fields + up to 8 photos uploaded to Supabase Storage */
export const AddListingModal: React.FC<AddListingModalProps> = ({
  lang,
  currency,
  rateFromUsd,
  userId,
  onClose,
  onCreated,
}) => {
  const hy = lang === 'hy';
  const [category, setCategory] = useState<ListingCategory>('cars');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState(hy ? 'Երևան' : 'Yerevan');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    const tooBig = picked.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(hy ? `«${tooBig.name}» նկարը 5 MB-ից մեծ է` : `"${tooBig.name}" is larger than 5 MB`);
    }
    setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_BYTES)].slice(0, MAX_PHOTOS));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceNumber = Number(price.replace(/[^0-9.]/g, ''));
    if (!priceNumber) {
      setError(hy ? 'Նշեք գինը' : 'Enter a price');
      return;
    }
    if (files.length === 0) {
      setError(hy ? 'Ավելացրեք առնվազն 1 նկար' : 'Add at least 1 photo');
      return;
    }
    setBusy(true);
    try {
      // 1. Upload photos into this user's own folder
      const photoUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${userId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
          contentType: file.type,
        });
        if (upErr) throw upErr;
        photoUrls.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl);
      }

      // 2. Save the listing row
      const { error: insErr } = await supabase.from('listings').insert({
        category,
        title: title.trim(),
        description: description.trim(),
        price_usd: Math.round((priceNumber / rateFromUsd) * 100) / 100,
        city: city.trim(),
        brand: brand.trim(),
        year: year ? Number(year) : null,
        phone: phone.trim() || null,
        photos: photoUrls,
      });
      if (insErr) throw insErr;

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm';
  const labelCls = 'text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]';

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-2xl space-y-3"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-[var(--bg-elevated)] cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold">{hy ? 'Նոր հայտարարություն' : 'New listing'}</h2>

        <div className="flex gap-2">
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`flex-1 h-10 rounded-lg border text-sm font-semibold cursor-pointer ${
                category === c.id
                  ? 'bg-[var(--accent)] text-[#080709] border-[var(--accent)]'
                  : 'border-[var(--border-hairline)]'
              }`}
            >
              {c.icon} {c.label[lang]}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className={labelCls}>{hy ? 'Անվանում' : 'Title'}</div>
          <input
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={category === 'cars' ? 'BMW X5 2019' : 'iPhone 15 Pro 256GB'}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className={labelCls}>
              {hy ? 'Գին' : 'Price'} ({currency})
            </div>
            <input required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <div className={labelCls}>{hy ? 'Մակնիշ' : 'Brand'}</div>
            <input required maxLength={60} value={brand} onChange={(e) => setBrand(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <div className={labelCls}>{hy ? 'Քաղաք' : 'City'}</div>
            <input required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <div className={labelCls}>{hy ? 'Տարի' : 'Year'}</div>
            <input inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} className={field} />
          </div>
        </div>

        <div className="space-y-1">
          <div className={labelCls}>{hy ? 'Հեռախոս' : 'Phone'}</div>
          <input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+374 ..." className={field} />
        </div>

        <div className="space-y-1">
          <div className={labelCls}>{hy ? 'Նկարագրություն' : 'Description'}</div>
          <textarea
            rows={3}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <div className={labelCls}>
            {hy ? 'Նկարներ' : 'Photos'} ({files.length}/{MAX_PHOTOS})
          </div>
          <div className="grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-elevated)]">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white cursor-pointer"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {files.length < MAX_PHOTOS && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-[var(--border-hairline)] flex flex-col items-center justify-center text-[var(--text-secondary)] text-[11px] cursor-pointer hover:border-[var(--accent)]">
                <ImagePlus className="w-5 h-5 mb-1" />
                {hy ? 'Ավելացնել' : 'Add'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-lg bg-[var(--accent)] text-[#080709] font-bold text-sm disabled:opacity-60 cursor-pointer"
        >
          {busy ? (hy ? 'Տեղադրվում է…' : 'Posting…') : hy ? 'Տեղադրել' : 'Post listing'}
        </button>
      </form>
    </div>
  );
};
