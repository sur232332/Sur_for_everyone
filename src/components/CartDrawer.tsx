import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { getDeviceById } from '../data/devices';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import { CartItem, Currency, Language, LivePriceEntry, OrderReceipt } from '../types/hardware';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  prices: Record<string, LivePriceEntry>;
  lang: Language;
  currency: Currency;
}

type CheckoutStep = 1 | 2 | 3;

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  prices,
  lang,
  currency,
}) => {
  const t = TRANSLATIONS[lang];

  const [step, setStep] = useState<CheckoutStep>(1);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  if (!open) return null;

  const sampleEntry = Object.values(prices)[0];
  const amdRate = sampleEntry?.amdRate || 388.5;
  const eurRate = sampleEntry?.eurRate || 0.92;

  const enriched = items.map((item) => {
    const device = getDeviceById(item.deviceId);
    const finish = device.finishes.find((f) => f.id === item.finishId) || device.finishes[0];
    const storage =
      device.storageOptions.find((s) => s.id === item.storageId) || device.storageOptions[0];
    const liveBase = prices[device.id]?.priceUsd ?? device.basePriceUsd;
    const unitUsd = liveBase + storage.priceDeltaUsd;
    return { item, device, finish, storage, unitUsd };
  });

  const subtotalUsd = enriched.reduce((acc, row) => acc + row.unitUsd * row.item.quantity, 0);
  const discountUsd = appliedPromo === 'PULSE10' ? Math.round(subtotalUsd * 0.1) : 0;
  const shippingUsd = deliveryMethod === 'express' ? 25 : 0;
  const finalTotalUsd = Math.max(0, subtotalUsd - discountUsd + shippingUsd);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = promoInput.trim().toUpperCase();
    if (cleaned === 'PULSE10') {
      setAppliedPromo('PULSE10');
      setPromoStatus('valid');
    } else {
      setAppliedPromo(null);
      setPromoStatus('invalid');
    }
  };

  const validateStep2 = (): boolean => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
    if (
      customerName.trim().length < 2 ||
      !emailOk ||
      customerPhone.trim().length < 6 ||
      shippingCity.trim().length < 2 ||
      shippingAddress.trim().length < 4
    ) {
      setValidationError(t.cart.validationError);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleProceedToStep3 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleConfirmOrder = async () => {
    if (enriched.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          shippingCity: shippingCity.trim(),
          shippingAddress: shippingAddress.trim(),
          deliveryMethod,
          promoCode: appliedPromo || undefined,
          currency,
          items: enriched.map((row) => ({
            deviceId: row.device.id,
            name: row.device.name,
            finish: row.finish.name[lang],
            storage: row.storage.label,
            storageDeltaUsd: row.storage.priceDeltaUsd,
            quantity: row.item.quantity,
          })),
        }),
      });
      if (res.ok) {
        const confirmed = (await res.json()) as OrderReceipt;
        setReceipt(confirmed);
        onClearCart();
        setStep(1);
      }
    } catch {
      setReceipt({
        orderId: `SP-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingCity: shippingCity.trim(),
        shippingAddress: shippingAddress.trim(),
        deliveryMethod,
        promoCode: appliedPromo || undefined,
        discountUsd,
        currency,
        totalUsd: finalTotalUsd,
        totalEur: Math.round(finalTotalUsd * eurRate),
        totalAmd: Math.round(finalTotalUsd * amdRate),
        items: enriched.map((r) => ({
          name: r.device.name,
          finish: r.finish.name[lang],
          storage: r.storage.label,
          quantity: r.item.quantity,
          unitPriceUsd: r.unitUsd,
        })),
        createdAt: new Date().toISOString(),
      });
      onClearCart();
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="relative w-full max-w-md bg-[var(--bg-surface)] text-[var(--text-primary)] border-l border-[var(--border-hairline)] flex flex-col h-full shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.title}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold">{t.cart.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Indicator when items exist and not on receipt */}
        {!receipt && enriched.length > 0 && (
          <div className="px-6 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] grid grid-cols-3 gap-2 text-[11px] font-mono-tech">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`text-left truncate py-1 border-b-2 transition-colors cursor-pointer ${
                step === 1
                  ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)]'
              }`}
            >
              {t.cart.step1Title}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`text-left truncate py-1 border-b-2 transition-colors cursor-pointer ${
                step === 2
                  ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)]'
              }`}
            >
              {t.cart.step2Title}
            </button>
            <button
              type="button"
              disabled={step < 3}
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
              className={`text-left truncate py-1 border-b-2 transition-colors ${
                step === 3
                  ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)] opacity-60'
              }`}
            >
              {t.cart.step3Title}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {receipt ? (
            <div className="p-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold text-base">{t.cart.confirmedTitle}</h3>
              </div>
              <div className="text-xs font-mono-tech text-[var(--text-secondary)] space-y-1">
                <div>
                  {t.cart.orderNumber}:{' '}
                  <span className="font-semibold text-[var(--text-primary)]">{receipt.orderId}</span>
                </div>
                <div>
                  {receipt.customerName} · {receipt.shippingCity}
                </div>
              </div>
              <div className="divide-y divide-[var(--border-hairline)] border-t border-b border-[var(--border-hairline)] py-2 text-xs">
                {receipt.items.map((it, idx) => (
                  <div key={idx} className="py-2 flex justify-between gap-3">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-[var(--text-secondary)]">
                        {it.finish} · {it.storage} × {it.quantity}
                      </div>
                    </div>
                    <div className="font-mono-tech font-semibold tabular-nums">
                      {formatDevicePrice(it.unitPriceUsd * it.quantity, currency, amdRate, eurRate)}
                    </div>
                  </div>
                ))}
              </div>
              {receipt.discountUsd && receipt.discountUsd > 0 ? (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-mono-tech">
                  <span>{t.cart.discount} ({receipt.promoCode})</span>
                  <span>-{formatDevicePrice(receipt.discountUsd, currency, amdRate, eurRate)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-semibold">
                <span>{t.cart.total}</span>
                <span className="font-mono-tech tabular-nums text-[var(--accent)]">
                  {formatDevicePrice(receipt.totalUsd, currency, amdRate, eurRate)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  onClose();
                }}
                className="w-full py-2.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          ) : enriched.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShoppingBag className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-50" />
              <p className="text-sm font-medium">{t.cart.empty}</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                {t.cart.emptySub}
              </p>
            </div>
          ) : step === 1 ? (
            /* STEP 1: BAG ITEMS & PROMO CODE */
            <div className="space-y-4">
              <div className="space-y-3">
                {enriched.map(({ item, device, finish, storage, unitUsd }) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)]">
                          {device.brand}
                        </div>
                        <h3 className="text-sm font-semibold truncate">{device.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {finish.name[lang]} · {storage.label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                        aria-label={t.cart.remove}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-hairline)]">
                      <div className="inline-flex items-center border border-[var(--border-hairline)] rounded-lg">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, -1)}
                          className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--bg-subtle)] cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono-tech tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, 1)}
                          className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--bg-subtle)] cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-sm font-mono-tech font-semibold tabular-nums">
                        {formatDevicePrice(unitUsd * item.quantity, currency, amdRate, eurRate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Form */}
              <form
                onSubmit={handleApplyPromo}
                className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2"
              >
                <label className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{t.cart.promoPlaceholder}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="PULSE10"
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono-tech uppercase bg-[var(--bg-surface)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer"
                  >
                    {t.cart.promoApply}
                  </button>
                </div>
                {promoStatus === 'valid' && (
                  <p className="text-[11px] font-mono-tech text-emerald-600 dark:text-emerald-400">
                    {t.cart.promoApplied}
                  </p>
                )}
                {promoStatus === 'invalid' && (
                  <p className="text-[11px] font-mono-tech text-rose-500">
                    {t.cart.promoHint}
                  </p>
                )}
              </form>

              {/* Totals Summary */}
              <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t.cart.subtotal}</span>
                  <span className="font-mono-tech tabular-nums">
                    {formatDevicePrice(subtotalUsd, currency, amdRate, eurRate)}
                  </span>
                </div>
                {discountUsd > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>{t.cart.discount} (PULSE10)</span>
                    <span className="font-mono-tech tabular-nums">
                      -{formatDevicePrice(discountUsd, currency, amdRate, eurRate)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between text-sm font-bold">
                  <span>{t.cart.total}</span>
                  <span className="font-mono-tech tabular-nums text-[var(--accent)]">
                    {formatDevicePrice(finalTotalUsd, currency, amdRate, eurRate)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>{t.cart.nextStep}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : step === 2 ? (
            /* STEP 2: DELIVERY & CONTACT DETAILS */
            <div className="space-y-4">
              <h3 className="text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
                {t.cart.step2Title}
              </h3>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium"
                >
                  {validationError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    {t.cart.fullName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.cart.fullName}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    {t.cart.email} *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    {t.cart.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+374 / +1 ..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                      {t.cart.city} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Yerevan / New York"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                      {t.cart.address} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Northern Ave 12"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{lang === 'hy' ? 'Առաքման Տեսակ' : 'Delivery Tier'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('standard')}
                      className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                        deliveryMethod === 'standard'
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                          : 'border-[var(--border-hairline)]'
                      }`}
                    >
                      {t.cart.deliveryStandard}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('express')}
                      className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                        deliveryMethod === 'express'
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                          : 'border-[var(--border-hairline)]'
                      }`}
                    >
                      {t.cart.deliveryExpress}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 rounded-xl border border-[var(--border-hairline)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.cart.prevStep}</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceedToStep3}
                  className="py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{t.cart.nextStep}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 3: ORDER SUMMARY & FINAL CONFIRMATION */
            <div className="space-y-4">
              <h3 className="text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
                {t.cart.step3Title}
              </h3>

              <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2 text-xs">
                <div className="font-semibold text-sm">{customerName}</div>
                <div className="text-[var(--text-secondary)]">{customerEmail} · {customerPhone}</div>
                <div className="text-[var(--text-secondary)]">
                  {shippingAddress}, {shippingCity}
                </div>
                <div className="pt-1 font-mono-tech text-[11px] text-[var(--accent)]">
                  {deliveryMethod === 'express' ? t.cart.deliveryExpress : t.cart.deliveryStandard}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2.5 text-xs">
                {enriched.map(({ item, device, finish, storage, unitUsd }) => (
                  <div key={item.key} className="flex justify-between gap-2">
                    <div>
                      <div className="font-medium">{device.name} × {item.quantity}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {finish.name[lang]} · {storage.label}
                      </div>
                    </div>
                    <div className="font-mono-tech font-semibold tabular-nums">
                      {formatDevicePrice(unitUsd * item.quantity, currency, amdRate, eurRate)}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t.cart.subtotal}</span>
                    <span className="font-mono-tech tabular-nums">
                      {formatDevicePrice(subtotalUsd, currency, amdRate, eurRate)}
                    </span>
                  </div>
                  {discountUsd > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{t.cart.discount} (PULSE10)</span>
                      <span className="font-mono-tech tabular-nums">
                        -{formatDevicePrice(discountUsd, currency, amdRate, eurRate)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t.cart.shipping}</span>
                    <span className="font-mono-tech tabular-nums">
                      {shippingUsd === 0
                        ? lang === 'hy'
                          ? 'ԱՆՎՃԱՐ'
                          : 'FREE'
                        : formatDevicePrice(shippingUsd, currency, amdRate, eurRate)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between text-sm font-bold">
                    <span>{t.cart.total}</span>
                    <span className="font-mono-tech tabular-nums text-[var(--accent)]">
                      {formatDevicePrice(finalTotalUsd, currency, amdRate, eurRate)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)]">{t.cart.liveRateNote}</p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 rounded-xl border border-[var(--border-hairline)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.cart.prevStep}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmOrder}
                  className="py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? t.cart.processing : t.cart.placeOrder}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
