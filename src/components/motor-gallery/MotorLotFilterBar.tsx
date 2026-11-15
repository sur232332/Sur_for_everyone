import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { CarColorCategory } from '../../data/luxuryCarsData';
import { Language } from '../../types/hardware';

interface MotorLotFilterBarProps {
  lang: Language;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  maxPriceUsd: number;
  onMaxPriceChange: (price: number) => void;
  selectedColor: CarColorCategory | 'all';
  onSelectColor: (color: CarColorCategory | 'all') => void;
  matchedCount: number;
  totalCount: number;
  onReset: () => void;
  formatMoney: (usd: number) => string;
}

const BRANDS = ['All', 'Porsche', 'Lamborghini', 'Mercedes-AMG', 'Ferrari', 'Bentley'];

const COLOR_DOTS: Array<{ id: CarColorCategory; hex: string; labelEn: string; labelHy: string }> = [
  { id: 'blue', hex: '#0066ff', labelEn: 'Blue', labelHy: 'Կապույտ' },
  { id: 'yellow', hex: '#eab308', labelEn: 'Yellow', labelHy: 'Դեղին' },
  { id: 'green', hex: '#4b573b', labelEn: 'Green', labelHy: 'Կանաչ' },
  { id: 'black', hex: '#272a30', labelEn: 'Black', labelHy: 'Սև' },
  { id: 'red', hex: '#ef1a2d', labelEn: 'Red', labelHy: 'Կարմիր' },
  { id: 'silver', hex: '#cbd5e1', labelEn: 'Silver', labelHy: 'Արծաթագույն' },
];

export const MotorLotFilterBar: React.FC<MotorLotFilterBarProps> = ({
  lang,
  searchQuery,
  onSearchChange,
  selectedBrand,
  onSelectBrand,
  maxPriceUsd,
  onMaxPriceChange,
  selectedColor,
  onSelectColor,
  matchedCount,
  totalCount,
  onReset,
  formatMoney,
}) => {
  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    selectedBrand !== 'All' ||
    maxPriceUsd < 340000 ||
    selectedColor !== 'all';

  return (
    <div className="bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 max-w-5xl w-full shadow-2xl pointer-events-auto">
      {/* Search Input */}
      <div className="relative flex items-center min-w-[140px] sm:w-44">
        <Search className="w-3.5 h-3.5 text-white/45 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={lang === 'hy' ? 'Որոնել մոդել...' : 'Search model...'}
          className="w-full h-7 pl-7 pr-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-amber-400 outline-none"
        />
      </div>

      {/* Brand Chips */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
        {BRANDS.map((brand) => {
          const active = selectedBrand === brand;
          const label = brand === 'All' ? (lang === 'hy' ? 'Բոլորը' : 'All') : brand;
          return (
            <button
              key={brand}
              type="button"
              onClick={() => onSelectBrand(brand)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono-tech uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Price Range Slider */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-[10px] font-mono-tech text-white/55 whitespace-nowrap">
          {lang === 'hy' ? 'Մինչև.' : 'Max:'}{' '}
          <strong className="text-amber-400">{formatMoney(maxPriceUsd)}</strong>
        </span>
        <input
          type="range"
          min={220000}
          max={340000}
          step={5000}
          value={maxPriceUsd}
          onChange={(e) => onMaxPriceChange(Number(e.target.value))}
          className="w-24 accent-amber-400 cursor-pointer h-1 bg-white/15 rounded-lg"
          aria-label={lang === 'hy' ? 'Առավելագույն գին' : 'Max price'}
        />
      </div>

      {/* Color Dots */}
      <div className="flex items-center gap-1.5">
        {COLOR_DOTS.map((dot) => {
          const active = selectedColor === dot.id;
          return (
            <button
              key={dot.id}
              type="button"
              onClick={() => onSelectColor(active ? 'all' : dot.id)}
              title={lang === 'hy' ? dot.labelHy : dot.labelEn}
              aria-label={lang === 'hy' ? dot.labelHy : dot.labelEn}
              className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                active
                  ? 'scale-125 border-amber-400 ring-2 ring-amber-400/50'
                  : 'border-white/30 hover:scale-110 opacity-85 hover:opacity-100'
              }`}
              style={{ backgroundColor: dot.hex }}
            />
          );
        })}
      </div>

      {/* Results Counter & Reset */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[10px] font-mono-tech text-white/70 whitespace-nowrap">
          <strong className="text-amber-400">{matchedCount}</strong>/{totalCount}{' '}
          {lang === 'hy' ? 'մեքենա' : 'cars'}
        </span>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-mono-tech text-amber-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>{lang === 'hy' ? 'Մաքրել' : 'Reset'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
