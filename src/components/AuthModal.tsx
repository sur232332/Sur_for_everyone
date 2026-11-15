import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Language } from '../types/hardware';

interface AuthModalProps {
  lang: Language;
  onClose: () => void;
}

/** Sign in / create an account with email + password */
export const AuthModal: React.FC<AuthModalProps> = ({ lang, onClose }) => {
  const hy = lang === 'hy';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError(hy ? 'Գաղտնաբառը պետք է լինի առնվազն 6 նիշ' : 'Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/catalog` },
        });
        if (err) throw err;
        if (data.session) {
          onClose();
        } else {
          setInfo(
            hy
              ? 'Ստուգեք ձեր էլ. փոստը և սեղմեք հաստատման հղումը, հետո մուտք գործեք։'
              : 'Check your email and click the confirmation link, then sign in.'
          );
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-2xl space-y-3"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-[var(--bg-elevated)] cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold">
          {mode === 'signin' ? (hy ? 'Մուտք' : 'Sign in') : hy ? 'Գրանցում' : 'Create account'}
        </h2>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={hy ? 'Էլ. փոստ' : 'Email'}
          autoComplete="email"
          className="w-full h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={hy ? 'Գաղտնաբառ' : 'Password'}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm"
        />

        {error && <div className="text-sm text-red-500">{error}</div>}
        {info && <div className="text-sm text-emerald-600">{info}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-lg bg-[var(--accent)] text-[#080709] font-bold text-sm disabled:opacity-60 cursor-pointer"
        >
          {busy ? '…' : mode === 'signin' ? (hy ? 'Մուտք գործել' : 'Sign in') : hy ? 'Գրանցվել' : 'Sign up'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
          className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
        >
          {mode === 'signin'
            ? hy
              ? 'Չունե՞ք հաշիվ։ Գրանցվել'
              : "No account? Create one"
            : hy
              ? 'Արդեն ունե՞ք հաշիվ։ Մուտք'
              : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
};
