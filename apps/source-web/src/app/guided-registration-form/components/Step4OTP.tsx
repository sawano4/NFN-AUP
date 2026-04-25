'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { useLanguage } from '@/lib/i18n';

interface Step4OTPProps {
  email: string;
  devOtp: string;
  onVerified: (otpCode: string) => Promise<void>;
  onResend: () => Promise<unknown>;
  onBack: () => void;
  submitting: boolean;
}

export default function Step4OTP({ email, devOtp, onVerified, onResend, onBack, submitting }: Step4OTPProps) {
  const { t, dir } = useLanguage();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((current) => current - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const updated = [...digits];
    pasted.split('').forEach((char, index) => {
      if (index < 6) updated[index] = char;
    });
    setDigits(updated);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('OTP must contain 6 digits');
      return;
    }

    try {
      setError('');
      await onVerified(code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid code');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await onResend();
      setTimer(60);
      setCanResend(false);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success(t.otpResent);
    } catch {
      toast.error(t.backendOffline);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="EnvelopeIcon" size={32} className="text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t.emailVerification}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.emailVerificationCopy}</p>
        <p className="text-sm font-semibold text-primary mt-1">{email}</p>
      </div>

      <div className="flex gap-2 sm:gap-3 justify-center mb-4" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={`otp-digit-${index}`}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => handleDigitChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 font-tabular ${
              error
                ? 'border-error bg-error/5 text-error'
                : digit
                ? 'border-primary bg-secondary/20 text-primary'
                : 'border-border bg-white text-foreground focus:border-primary'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <Icon name="ExclamationCircleIcon" size={14} className="text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="bg-secondary/40 border border-secondary rounded-xl p-3 mb-6 text-center">
        <p className="text-xs text-muted-foreground">
          {t.otpHint}
          {devOtp ? <span className="font-semibold text-primary font-tabular"> {devOtp}</span> : null}
        </p>
      </div>

      <div className="text-center mb-6">
        {canResend ? (
          <button type="button" onClick={handleResend} className="text-sm text-primary font-medium hover:underline">
            {t.resendCode}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.resendIn} <span className="font-semibold text-foreground font-tabular">{timer}s</span>
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-3.5 px-6 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all duration-150 flex items-center justify-center gap-2">
          <Icon name={dir === 'rtl' ? 'ArrowRightIcon' : 'ArrowLeftIcon'} size={18} />
          {t.previous}
        </button>
        <button type="button" onClick={handleVerify} disabled={submitting || digits.join('').length !== 6} className="flex-1 py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-warm-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? (
            <>
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
              {t.verifying}
            </>
          ) : (
            <>
              {t.verify}
              <Icon name="CheckCircleIcon" size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
