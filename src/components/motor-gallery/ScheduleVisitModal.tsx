import React, { useEffect, useState } from 'react';
import { Calendar, Car, CheckCircle2, Clock, Mail, Phone, User, X } from 'lucide-react';
import { LUXURY_CARS, LuxuryCarSpec } from '../../data/luxuryCarsData';
import { Language } from '../../types/hardware';

interface ScheduleVisitModalProps {
  open: boolean;
  onClose: () => void;
  initialCarId: string | null;
  lang: Language;
  formatMoney: (usd: number) => string;
}

export interface StoredVisitSubmission {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  timeSlot: string;
  carId: string;
  carName: string;
  createdAt: string;
}

const STORAGE_KEY = 'kalbera_visit_submissions_v1';
const TIME_SLOTS = ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'];

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  open,
  onClose,
  initialCarId,
  lang,
  formatMoney,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('2026-11-16');
  const [timeSlot, setTimeSlot] = useState('02:00 PM');
  const [selectedCarId, setSelectedCarId] = useState<string>(
    initialCarId || LUXURY_CARS[0].id
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<StoredVisitSubmission | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedCarId(initialCarId || LUXURY_CARS[0].id);
      setSubmittedRecord(null);
      setErrorMsg(null);
    }
  }, [open, initialCarId]);

  if (!open) return null;

  const chosenCar: LuxuryCarSpec =
    LUXURY_CARS.find((c) => c.id === selectedCarId) || LUXURY_CARS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setErrorMsg(
        lang === 'hy'
          ? 'Խնդրում ենք մուտքագրել Ձեր անունն ու ազգանունը։'
          : 'Please enter your full name.'
      );
      return;
    }

    if (cleanPhone.length < 6) {
      setErrorMsg(
        lang === 'hy'
          ? 'Խնդրում ենք մուտքագրել վավեր հեռախոսահամար։'
          : 'Please enter a valid phone number.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg(
        lang === 'hy'
          ? 'Խնդրում ենք մուտքագրել վավեր էլ. փոստի հասցե։'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (!date || !timeSlot) {
      setErrorMsg(
        lang === 'hy'
          ? 'Խնդրում ենք ընտրել այցելության օրն ու ժամը։'
          : 'Please select a visit date and time slot.'
      );
      return;
    }

    const record: StoredVisitSubmission = {
      id: `VIS-${Date.now().toString().slice(-6)}`,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      date,
      timeSlot,
      carId: chosenCar.id,
      carName: `${chosenCar.year} ${chosenCar.fullName}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: StoredVisitSubmission[] = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));
    } catch {
      // ignore storage errors
    }

    setErrorMsg(null);
    setSubmittedRecord(record);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hy' ? 'Ամրագրել Այց' : 'Schedule a Visit'}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-200"
    >
      <div className="w-full max-w-md bg-[#0e1118]/95 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'hy' ? 'Փակել' : 'Close'}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {submittedRecord ? (
          <div className="py-4 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <span className="text-[10px] font-mono-tech uppercase tracking-widest text-amber-400">
                #{submittedRecord.id}
              </span>
              <h3 className="text-xl font-serif font-bold text-white mt-0.5">
                {lang === 'hy' ? 'Այցը Հաջողությամբ Ամրագրվեց' : 'Showroom Visit Scheduled'}
              </h3>
              <p className="text-xs text-white/70 mt-1">
                {lang === 'hy'
                  ? 'Ձեր ամրագրումը պահպանվել է։ Ստորև ներկայացված է այցի ամփոփումը.'
                  : 'Your appointment is confirmed and saved. Summary of your visit:'}
              </p>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">{lang === 'hy' ? 'Մեքենա.' : 'Vehicle:'}</span>
                <span className="font-semibold text-amber-400">{submittedRecord.carName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">{lang === 'hy' ? 'Անուն.' : 'Guest:'}</span>
                <span className="font-medium text-white">{submittedRecord.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">{lang === 'hy' ? 'Հեռախոս.' : 'Phone:'}</span>
                <span className="font-mono-tech text-white/90">{submittedRecord.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">{lang === 'hy' ? 'Էլ. փոստ.' : 'Email:'}</span>
                <span className="font-mono-tech text-white/90">{submittedRecord.email}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-white/10">
                <span className="text-white/50">{lang === 'hy' ? 'Օր և Ժամ.' : 'Date & Time:'}</span>
                <span className="font-mono-tech font-semibold text-emerald-400">
                  {submittedRecord.date} • {submittedRecord.timeSlot}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black font-mono-tech font-bold text-xs uppercase tracking-widest cursor-pointer"
            >
              {lang === 'hy' ? 'ՓԱԿԵԼ' : 'DONE'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono-tech uppercase tracking-widest">
              <Car className="w-4 h-4" />
              <span>
                {lang === 'hy' ? 'ԱՄՐԱԳՐԵԼ ԱՅՑ ԱՎՏՈՍՐԱՀ' : 'VIP SHOWROOM APPOINTMENT'}
              </span>
            </div>

            <h3 className="text-xl font-serif font-bold text-white">
              {lang === 'hy' ? 'Պլանավորեք Ձեր Այցը' : 'Schedule a Private Visit'}
            </h3>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Car Dropdown (pre-filled with selected car) */}
            <div>
              <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1">
                {lang === 'hy' ? 'ԸՆՏՐՎԱԾ ՄԵՔԵՆԱ' : 'SELECT VEHICLE'}
              </label>
              <select
                value={selectedCarId}
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-black/60 border border-white/15 text-xs sm:text-sm text-white focus:border-amber-400 outline-none cursor-pointer"
              >
                {LUXURY_CARS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0e1118] text-white">
                    {c.year} {c.fullName} — {formatMoney(c.priceUsd)}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1">
                {lang === 'hy' ? 'ԱՆՈՒՆ ԱԶԳԱՆՈՒՆ' : 'FULL NAME'}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'hy' ? 'Արամ Հակոբյան' : 'Alex Morgan'}
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-black/50 border border-white/15 text-xs sm:text-sm text-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1">
                  {lang === 'hy' ? 'ՀԵՌԱԽՈՍԱՀԱՄԱՐ' : 'PHONE'}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+374 91 00 00 00"
                    className="w-full h-9 pl-8 pr-2.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1">
                  {lang === 'hy' ? 'ԷԼ. ՓՈՍՏ' : 'EMAIL'}
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vip@kalbera.com"
                    className="w-full h-9 pl-8 pr-2.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1">
                {lang === 'hy' ? 'ԱՅՑԵԼՈՒԹՅԱՆ ՕՐ' : 'PREFERRED DATE'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:border-amber-400 outline-none"
                />
                <Calendar className="w-3.5 h-3.5 text-white/40 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Time Slot Buttons */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-wider text-white/60 mb-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{lang === 'hy' ? 'ԸՆՏՐԵՔ ԺԱՄԸ' : 'SELECT TIME SLOT'}</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TIME_SLOTS.map((slot) => {
                  const active = timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono-tech font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                          : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 mt-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-black font-mono-tech font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {lang === 'hy' ? 'ՀԱՍՏԱՏԵԼ ԱՄՐԱԳՐՈՒՄԸ' : 'CONFIRM APPOINTMENT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
