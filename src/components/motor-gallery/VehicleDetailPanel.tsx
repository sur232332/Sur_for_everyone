import React, { useRef } from 'react';
import {
  Box,
  Calculator,
  Calendar,
  Check,
  DoorOpen,
  Flame,
  GitCompare,
  Power,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { LuxuryCarSpec } from '../../data/luxuryCarsData';
import { Language } from '../../types/hardware';
import { MiniCarViewer3D } from './MiniCarViewer3D';
import { FinancingCalculatorSection } from './FinancingCalculatorSection';

interface VehicleDetailPanelProps {
  car: LuxuryCarSpec;
  lang: Language;
  formatMoney: (usd: number) => string;
  activeColorHex: string;
  onSelectColor: (carId: string, hex: string) => void;
  isDoorsOpen: boolean;
  onToggleDoors: (carId: string) => void;
  isTrunkOpen: boolean;
  onToggleTrunk: (carId: string) => void;
  isEngineRunning: boolean;
  onToggleEngine: (car: LuxuryCarSpec) => void;
  onRevEngine: (car: LuxuryCarSpec) => void;
  isCompared: boolean;
  onToggleCompare: (carId: string) => void;
  onOpenScheduleModal: () => void;
  onClose: () => void;
  customGlbUrl?: string;
  customGlbName?: string;
}

export const VehicleDetailPanel: React.FC<VehicleDetailPanelProps> = ({
  car,
  lang,
  formatMoney,
  activeColorHex,
  onSelectColor,
  isDoorsOpen,
  onToggleDoors,
  isTrunkOpen,
  onToggleTrunk,
  isEngineRunning,
  onToggleEngine,
  onRevEngine,
  isCompared,
  onToggleCompare,
  onOpenScheduleModal,
  onClose,
  customGlbUrl,
  customGlbName,
}) => {
  const calcSectionRef = useRef<HTMLDivElement | null>(null);

  const handleScrollToCalculator = () => {
    calcSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeColorObj =
    car.availableColors.find((c) => c.hex.toLowerCase() === activeColorHex.toLowerCase()) ||
    car.availableColors[0];

  return (
    <aside
      aria-label={car.fullName}
      className="fixed sm:absolute top-14 sm:top-16 right-2 sm:right-5 bottom-2 sm:bottom-4 w-[calc(100vw-1rem)] sm:w-[400px] z-30 bg-[#0c0e14]/92 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-right"
    >
      {/* Top Bar with Stock Badge & Close (X) Button */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono-tech tracking-widest uppercase text-white/60">
          <span>
            {car.year} • #{car.stockNumber}
          </span>
          <span className="text-emerald-400 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {lang === 'hy' ? 'ԱՌԿԱ Է' : 'IN STOCK'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'hy' ? 'Փակել վահանակը' : 'Close panel'}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Panel Body */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* 1. Rotating 3D Model Viewer */}
        <MiniCarViewer3D
          car={car}
          activeColorHex={activeColorHex}
          doorsOpen={isDoorsOpen}
          trunkOpen={isTrunkOpen}
          engineRunning={isEngineRunning}
          customGlbUrl={customGlbUrl}
          customGlbName={customGlbName}
          lang={lang}
        />

        {/* 2. Title, Year & Price */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
              {car.year} {car.fullName}
            </h2>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-mono-tech font-bold text-amber-400">
              {formatMoney(car.priceUsd)}
            </span>
            <span className="text-[11px] font-mono-tech text-white/55">
              {car.specs.drivetrain}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-white/70 leading-relaxed">{car.description[lang]}</p>
        </div>

        {/* 3. 6-Item Specs Grid (Horsepower, 0–60 mph, Top Speed, Mileage, Engine, Color) */}
        <div className="grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/10 rounded-xl p-3">
          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? 'ՀԶՈՐՈՒԹՅՈՒՆ' : 'HORSEPOWER'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {car.specs.horsepower}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? '0–60 ՄՂ/Ժ (0-100)' : '0–60 MPH'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-amber-400 mt-0.5">
              {car.specs.zeroToSixty}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? 'ԱՌԱՎԵԼԱԳՈՒՅՆ ԱՐԱԳՈՒԹՅՈՒՆ' : 'TOP SPEED'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {car.specs.topSpeed}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? 'ՎԱԶՔ (MILEAGE)' : 'MILEAGE'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {car.specs.mileage}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? 'ՇԱՐԺԻՉ (ENGINE)' : 'ENGINE'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {car.specs.engine}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/45">
              {lang === 'hy' ? 'ԳՈՒՅՆ (COLOR)' : 'COLOR'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                style={{ backgroundColor: activeColorHex }}
              />
              <span className="truncate">{activeColorObj ? activeColorObj.name[lang] : car.colorName[lang]}</span>
            </div>
          </div>
        </div>

        {/* Paint Swatches & Interactive 3D Doors/Engine Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-mono-tech uppercase tracking-wider text-white/50">
              {lang === 'hy' ? 'ԸՆՏՐԵԼ ԹԱՓՔԻ ԳՈՒՅՆԸ.' : 'CUSTOMIZE PAINT:'}
            </span>
            <div className="flex items-center gap-1.5">
              {car.availableColors.map((col) => {
                const active = activeColorHex.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => onSelectColor(car.id, col.hex)}
                    title={col.name[lang]}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      active
                        ? 'scale-125 border-amber-400 ring-2 ring-amber-400/40'
                        : 'border-white/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: col.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onToggleDoors(car.id)}
              className={`h-9 px-2 rounded-lg border text-[10px] font-mono-tech font-semibold tracking-wider uppercase inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isDoorsOpen
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isDoorsOpen
                  ? lang === 'hy'
                    ? 'ՓԱԿԵԼ ԴՌՆԵՐԸ'
                    : 'CLOSE DOORS'
                  : lang === 'hy'
                    ? 'ԴՌՆԵՐ'
                    : 'DOORS'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleTrunk(car.id)}
              className={`h-9 px-2 rounded-lg border text-[10px] font-mono-tech font-semibold tracking-wider uppercase inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isTrunkOpen
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
              }`}
            >
              <Box className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isTrunkOpen
                  ? lang === 'hy'
                    ? 'ՓԱԿԵԼ ԲԱԳԱԺՆԻԿ'
                    : 'CLOSE TRUNK'
                  : lang === 'hy'
                    ? 'ԲԱԳԱԺՆԻԿ'
                    : 'TRUNK'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleEngine(car)}
              className={`h-9 px-2 rounded-lg border text-[10px] font-mono-tech font-semibold tracking-wider uppercase inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isEngineRunning
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
              }`}
            >
              <Power className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isEngineRunning
                  ? lang === 'hy'
                    ? 'ԱՆՋԱՏԵԼ'
                    : 'STOP'
                  : lang === 'hy'
                    ? 'ՄԻԱՑՆԵԼ'
                    : 'START'}
              </span>
            </button>
          </div>

          {isEngineRunning && (
            <button
              type="button"
              onClick={() => onRevEngine(car)}
              className="w-full h-8 rounded-lg bg-gradient-to-r from-rose-600/30 to-amber-500/30 border border-amber-400/50 text-[11px] font-mono-tech font-semibold text-amber-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <Volume2 className="w-3.5 h-3.5" />
              <span>{lang === 'hy' ? 'ԳԱԶ ՏԱԼ (REV)' : 'REV EXHAUST'}</span>
            </button>
          )}
        </div>

        {/* 4. Primary Action Buttons: Schedule a Visit, Calculate Financing, Add to Compare */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-black font-mono-tech font-bold text-xs tracking-widest uppercase shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'hy' ? 'ԱՄՐԱԳՐԵԼ ԱՅՑ' : 'SCHEDULE A VISIT'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleScrollToCalculator}
              className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 font-mono-tech font-semibold text-[11px] tracking-wider uppercase inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'hy' ? 'ՀԱՇՎԱՐԿԵԼ ՎԱՐԿԸ' : 'CALCULATE FINANCING'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleCompare(car.id)}
              className={`h-9 px-2.5 rounded-lg border font-mono-tech font-semibold text-[11px] tracking-wider uppercase inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isCompared
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
              }`}
            >
              {isCompared ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'hy' ? 'ՀԱՄԵՄԱՏՎՈՒՄ Է' : 'IN COMPARE'}</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'hy' ? 'ՀԱՄԵՄԱՏԵԼ' : 'ADD TO COMPARE'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. Interactive Financing Calculator Section */}
        <FinancingCalculatorSection
          vehiclePriceUsd={car.priceUsd}
          formatMoney={formatMoney}
          lang={lang}
          sectionRef={calcSectionRef}
        />
      </div>
    </aside>
  );
};
