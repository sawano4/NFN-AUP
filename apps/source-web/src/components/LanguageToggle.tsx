'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === 'fr' ? 'ar' : 'fr';

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className="px-3 py-2 rounded-lg border border-border bg-white hover:bg-muted text-sm font-semibold text-foreground transition-colors"
      aria-label={t.otherLanguage}
      title={t.otherLanguage}
    >
      {language === 'fr' ? 'AR' : 'FR'}
    </button>
  );
}
