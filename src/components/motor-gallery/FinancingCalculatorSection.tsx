import React, { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Language } from '../../types/hardware';

interface FinancingCalculatorSectionProps {
  vehiclePriceUsd: number;
  formatMoney: (usd: number) => string;
  lang: Language;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export const FinancingCalculatorSection: React.FC<FinancingCalculatorSectionProps> = ({
  vehiclePriceUsd,
  formatMoney,
  lang,
  sectionRef,
}) => {
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20); // 0 - 50%
  const [termMonths, setTermMonths] = useState<number>(60); // 24 - 84 months
  const [interestRate, setInterestRate] = useState<number>(6.5); // 3 - 12%

  const { downPaymentUsd, monthlyPaymentUsd, totalInterestUsd, totalCostUsd } = useMemo(() => {
    const downUsd = (vehiclePriceUsd * downPaymentPercent) / 100;
    const principal = Math.max(0, vehiclePriceUsd - downUsd);

    if (principal <= 0) {
      return {
        downPaymentUsd: downUsd,
        monthlyPaymentUsd: 0,
        totalInterestUsd: 0,
        totalCostUsd: vehiclePriceUsd,
      };
    }

    const monthlyRate = interestRate / 100 / 12;
    let monthly = principal / termMonths;
    if (monthlyRate > 0) {
      const factor = Math.pow(1 + monthlyRate, termMonths);
      monthly = (principal * (monthlyRate * factor)) / (factor - 1);
    }

    const totalLoanPayments = monthly * termMonths;
    const totalInterest = Math.max(0, totalLoanPayments - principal);
    const totalCost = downUsd + totalLoanPayments;

    return {
      downPaymentUsd: downUsd,
      monthlyPaymentUsd: monthly,
      totalInterestUsd: totalInterest,
      totalCostUsd: totalCost,
    };
  }, [vehiclePriceUsd, downPaymentPercent, termMonths, interestRate]);

  return (
    <div ref={sectionRef} className="pt-3.5 border-t border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono-tech font-bold uppercase tracking-widest text-white/85">
          {lang === 'hy' ? 'ՎԱՐԿԱՅԻՆ ՀԱՇՎԻՉ' : 'FINANCING CALCULATOR'}
        </span>
        <Gauge className="w-3.5 h-3.5 text-amber-400" />
      </div>

      {/* Live Output Box: Monthly Payment, Total Interest, Total Cost */}
      <div className="bg-black/55 border border-white/10 rounded-xl p-3 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-white/50">
              {lang === 'hy' ? 'ԱՄՍԱԿԱՆ ՎՃԱՐ' : 'MONTHLY PAYMENT'}
            </div>
            <div className="text-2xl font-mono-tech font-bold text-amber-400 mt-0.5">
              {formatMoney(monthlyPaymentUsd)}
              <span className="text-xs font-normal text-white/55">
                {lang === 'hy' ? ' /ամիս' : ' /mo'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono-tech text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
            {interestRate.toFixed(1)}% APR
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
          <div>
            <div className="text-[10px] font-mono-tech uppercase text-white/45">
              {lang === 'hy' ? 'ԸՆԴՀԱՆՈՒՐ ՏՈԿՈՍ' : 'TOTAL INTEREST'}
            </div>
            <div className="font-mono-tech font-semibold text-white/90 mt-0.5">
              {formatMoney(totalInterestUsd)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono-tech uppercase text-white/45">
              {lang === 'hy' ? 'ԸՆԴՀԱՆՈՒՐ ԱՐԺԵՔ' : 'TOTAL COST'}
            </div>
            <div className="font-mono-tech font-semibold text-emerald-400 mt-0.5">
              {formatMoney(totalCostUsd)}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Down Payment Slider (0 - 50%) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono-tech">
          <span className="text-white/60">
            {lang === 'hy' ? 'ԿԱՆԽԱՎՃԱՐ (0–50%)' : 'DOWN PAYMENT (0–50%)'}
          </span>
          <span className="text-amber-400 font-semibold">
            {downPaymentPercent}% ({formatMoney(downPaymentUsd)})
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={downPaymentPercent}
          onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
        />
      </div>

      {/* 2. Term Slider (24 - 84 months) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono-tech">
          <span className="text-white/60">
            {lang === 'hy' ? 'ԺԱՄԿԵՏ (24–84 ԱՄԻՍ)' : 'TERM (24–84 MONTHS)'}
          </span>
          <span className="text-white font-semibold">
            {termMonths} {lang === 'hy' ? 'ամիս' : 'months'}
          </span>
        </div>
        <input
          type="range"
          min={24}
          max={84}
          step={6}
          value={termMonths}
          onChange={(e) => setTermMonths(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
        />
      </div>

      {/* 3. Interest Rate Slider (3 - 12%) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono-tech">
          <span className="text-white/60">
            {lang === 'hy' ? 'ՏՈԿՈՍԱԴՐՈՒՅՔ (3–12%)' : 'INTEREST RATE (3–12%)'}
          </span>
          <span className="text-white font-semibold">{interestRate.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={3}
          max={12}
          step={0.25}
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
        />
      </div>
    </div>
  );
};
