import React from 'react';
import { GitCompare, Trophy, X } from 'lucide-react';
import { LUXURY_CARS, LuxuryCarSpec } from '../../data/luxuryCarsData';
import { Language } from '../../types/hardware';

interface CarCompareModalAndBarProps {
  compareIds: string[];
  onRemoveFromCompare: (carId: string) => void;
  onClearCompare: () => void;
  compareModalOpen: boolean;
  onOpenCompareModal: () => void;
  onCloseCompareModal: () => void;
  lang: Language;
  formatMoney: (usd: number) => string;
  carColorsMap: Record<string, string>;
}

export const CarCompareModalAndBar: React.FC<CarCompareModalAndBarProps> = ({
  compareIds,
  onRemoveFromCompare,
  onClearCompare,
  compareModalOpen,
  onOpenCompareModal,
  onCloseCompareModal,
  lang,
  formatMoney,
  carColorsMap,
}) => {
  const comparedCars: LuxuryCarSpec[] = compareIds
    .map((id) => LUXURY_CARS.find((c) => c.id === id))
    .filter((c): c is LuxuryCarSpec => !!c);

  if (comparedCars.length === 0) return null;

  const carA = comparedCars[0];
  const carB = comparedCars[1];

  return (
    <>
      {/* Floating Compare Bar at the Bottom */}
      <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-30 bg-[#0d1017]/95 backdrop-blur-2xl border border-amber-400/40 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3 max-w-[95vw] transition-all duration-300">
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono-tech font-bold uppercase tracking-wider shrink-0">
          <GitCompare className="w-4 h-4" />
          <span className="hidden sm:inline">
            {lang === 'hy' ? 'Համեմատություն' : 'Compare'} ({comparedCars.length}/2)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {comparedCars.map((c) => (
            <div
              key={c.id}
              className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 flex items-center gap-2 text-xs text-white"
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                style={{ backgroundColor: carColorsMap[c.id] || c.colorHex }}
              />
              <span className="font-medium whitespace-nowrap">{c.model}</span>
              <button
                type="button"
                onClick={() => onRemoveFromCompare(c.id)}
                className="text-white/50 hover:text-white cursor-pointer"
                aria-label={`Remove ${c.fullName}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {comparedCars.length === 1 && (
            <span className="text-[11px] font-mono-tech text-white/50 px-2 whitespace-nowrap">
              {lang === 'hy' ? '+ Ընտրեք 2-րդ մեքենան' : '+ Pick 2nd car'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={comparedCars.length < 2}
            onClick={onOpenCompareModal}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tech font-bold uppercase tracking-wider transition-all ${
              comparedCars.length === 2
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:brightness-110 shadow-md cursor-pointer'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {lang === 'hy' ? 'Համեմատել' : 'Compare'}
          </button>

          <button
            type="button"
            onClick={onClearCompare}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white cursor-pointer"
            title={lang === 'hy' ? 'Մաքրել' : 'Clear'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Modal Table */}
      {compareModalOpen && carA && carB && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'hy' ? 'Մեքենաների Համեմատություն' : 'Vehicle Comparison'}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-200"
        >
          <div className="w-full max-w-2xl bg-[#0e1118]/95 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={onCloseCompareModal}
              aria-label={lang === 'hy' ? 'Փակել' : 'Close'}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-tech uppercase tracking-widest">
              <GitCompare className="w-4 h-4" />
              <span>
                {lang === 'hy'
                  ? 'ԿՈՂՔ-ԿՈՂՔԻ ԲՆՈՒԹԱԳՐԵՐԻ ՀԱՄԵՄԱՏՈՒԹՅՈՒՆ'
                  : 'SIDE-BY-SIDE SPECIFICATION COMPARISON'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              {carA.fullName} <span className="text-amber-400 font-serif italic">vs</span>{' '}
              {carB.fullName}
            </h3>

            {/* Header Cards for Car A and Car B */}
            <div className="grid grid-cols-3 gap-3 mt-4 pb-3 border-b border-white/15 items-end">
              <div className="text-[11px] font-mono-tech uppercase tracking-wider text-white/50">
                {lang === 'hy' ? 'ՑՈՒՑԱՆԻՇ' : 'SPECIFICATION'}
              </div>

              {[carA, carB].map((car) => (
                <div
                  key={car.id}
                  className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: carColorsMap[car.id] || car.colorHex }}
                    />
                    <span className="text-[10px] font-mono-tech text-white/55">{car.year}</span>
                  </div>
                  <div className="text-sm sm:text-base font-serif font-bold text-white">
                    {car.fullName}
                  </div>
                  <div className="text-xs font-mono-tech font-bold text-amber-400">
                    {formatMoney(car.priceUsd)}
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Rows with Automatic Winner Highlighting */}
            <div className="divide-y divide-white/10 text-xs sm:text-sm mt-1">
              {[
                {
                  labelEn: 'Price',
                  labelHy: 'Գին',
                  valA: formatMoney(carA.priceUsd),
                  valB: formatMoney(carB.priceUsd),
                  winner:
                    carA.priceUsd < carB.priceUsd
                      ? 'A'
                      : carB.priceUsd < carA.priceUsd
                        ? 'B'
                        : 'tie',
                },
                {
                  labelEn: 'Horsepower',
                  labelHy: 'Հզորություն',
                  valA: carA.specs.horsepower,
                  valB: carB.specs.horsepower,
                  winner:
                    carA.numericSpecs.horsepower > carB.numericSpecs.horsepower
                      ? 'A'
                      : carB.numericSpecs.horsepower > carA.numericSpecs.horsepower
                        ? 'B'
                        : 'tie',
                },
                {
                  labelEn: '0–60 mph',
                  labelHy: '0–60 մղ/ժ (Արագացում)',
                  valA: carA.specs.zeroToSixty,
                  valB: carB.specs.zeroToSixty,
                  winner:
                    carA.numericSpecs.zeroToSixtySec < carB.numericSpecs.zeroToSixtySec
                      ? 'A'
                      : carB.numericSpecs.zeroToSixtySec < carA.numericSpecs.zeroToSixtySec
                        ? 'B'
                        : 'tie',
                },
                {
                  labelEn: 'Top Speed',
                  labelHy: 'Առավելագույն Արագություն',
                  valA: carA.specs.topSpeed,
                  valB: carB.specs.topSpeed,
                  winner:
                    carA.numericSpecs.topSpeedMph > carB.numericSpecs.topSpeedMph
                      ? 'A'
                      : carB.numericSpecs.topSpeedMph > carA.numericSpecs.topSpeedMph
                        ? 'B'
                        : 'tie',
                },
                {
                  labelEn: 'Mileage',
                  labelHy: 'Վազք',
                  valA: carA.specs.mileage,
                  valB: carB.specs.mileage,
                  winner:
                    carA.numericSpecs.mileageMi < carB.numericSpecs.mileageMi
                      ? 'A'
                      : carB.numericSpecs.mileageMi < carA.numericSpecs.mileageMi
                        ? 'B'
                        : 'tie',
                },
                {
                  labelEn: 'Model Year',
                  labelHy: 'Տարեթիվ',
                  valA: String(carA.year),
                  valB: String(carB.year),
                  winner: carA.year > carB.year ? 'A' : carB.year > carA.year ? 'B' : 'tie',
                },
                {
                  labelEn: 'Engine',
                  labelHy: 'Շարժիչ',
                  valA: carA.specs.engine,
                  valB: carB.specs.engine,
                  winner: 'none',
                },
                {
                  labelEn: 'Drivetrain',
                  labelHy: 'Քարշակ',
                  valA: carA.specs.drivetrain,
                  valB: carB.specs.drivetrain,
                  winner: 'none',
                },
                {
                  labelEn: 'Exterior Color',
                  labelHy: 'Թափքի Գույն',
                  valA: carA.colorName[lang],
                  valB: carB.colorName[lang],
                  winner: 'none',
                },
              ].map((row) => (
                <div key={row.labelEn} className="grid grid-cols-3 gap-3 py-2.5 items-center">
                  <div className="text-xs font-mono-tech text-white/60">
                    {lang === 'hy' ? row.labelHy : row.labelEn}
                  </div>

                  <div
                    className={`px-2.5 py-1.5 rounded-lg font-mono-tech flex items-center justify-between ${
                      row.winner === 'A'
                        ? 'bg-amber-500/15 border border-amber-400/50 text-amber-300 font-bold'
                        : 'text-white/85'
                    }`}
                  >
                    <span>{row.valA}</span>
                    {row.winner === 'A' && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>

                  <div
                    className={`px-2.5 py-1.5 rounded-lg font-mono-tech flex items-center justify-between ${
                      row.winner === 'B'
                        ? 'bg-amber-500/15 border border-amber-400/50 text-amber-300 font-bold'
                        : 'text-white/85'
                    }`}
                  >
                    <span>{row.valB}</span>
                    {row.winner === 'B' && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
