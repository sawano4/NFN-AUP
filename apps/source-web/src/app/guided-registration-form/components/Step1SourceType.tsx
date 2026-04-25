'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import { useLanguage } from '@/lib/i18n';
import type { SourceType } from './RegistrationFormContainer';

interface Step1Props {
  value: SourceType;
  onChange: (v: SourceType) => void;
  onNext: () => void;
}

export default function Step1SourceType({ value, onChange, onNext }: Step1Props) {
  const { t, dir } = useLanguage();
  const options: { value: SourceType; label: string; description: string; icon: string }[] = [
    { value: 'eleveur', label: t.farmer, description: t.farmerDesc, icon: 'HomeModernIcon' },
    { value: 'abattoir', label: t.slaughterhouse, description: t.slaughterhouseDesc, icon: 'BuildingStorefrontIcon' },
    { value: 'tiers', label: t.thirdParty, description: t.thirdPartyDesc, icon: 'UsersIcon' },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">{t.chooseCategory}</h2>
        <p className="text-muted-foreground text-sm">{t.chooseCategoryCopy}</p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((option) => (
          <button
            key={`source-type-${option.value}`}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left ${
              value === option.value
                ? 'border-primary bg-secondary/40 shadow-warm-sm'
                : 'border-border bg-white hover:border-primary/40 hover:bg-muted/30'
            } ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                value === option.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon name={option.icon as 'HomeModernIcon'} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${value === option.value ? 'text-primary' : 'text-foreground'}`}>
                {option.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{option.description}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                value === option.value ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {value === option.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-warm-sm"
      >
        {t.next}
        <Icon name={dir === 'rtl' ? 'ArrowLeftIcon' : 'ArrowRightIcon'} size={18} />
      </button>
    </div>
  );
}
