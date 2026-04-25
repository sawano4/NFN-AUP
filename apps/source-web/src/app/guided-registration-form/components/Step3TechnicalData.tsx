'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import Icon from '@/components/ui/AppIcon';
import { RACES, MONTHS } from '@/lib/mockData';
import { useLanguage } from '@/lib/i18n';
import type { RegistrationData } from './RegistrationFormContainer';

interface Step3Props {
  data: RegistrationData;
  onChange: (data: Partial<RegistrationData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

type FormValues = {
  races: string[];
  nombre_tetes: Record<string, number>;
  autres_race: string;
  mois_disponibilite: string[];
  note: string;
};

export default function Step3TechnicalData({ data, onChange, onSubmit, onBack, submitting }: Step3Props) {
  const { t, dir } = useLanguage();
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      races: data.races,
      nombre_tetes: data.nombre_tetes,
      autres_race: data.autres_race,
      mois_disponibilite: data.mois_disponibilite,
      note: data.note,
    },
  });

  const selectedRaces = watch('races') || [];
  const selectedMonths = watch('mois_disponibilite') || [];

  const toggleRace = (raceId: string) => {
    const updated = selectedRaces.includes(raceId)
      ? selectedRaces.filter((r) => r !== raceId)
      : [...selectedRaces, raceId];
    setValue('races', updated);
  };

  const toggleMonth = (monthId: string) => {
    const updated = selectedMonths.includes(monthId)
      ? selectedMonths.filter((m) => m !== monthId)
      : [...selectedMonths, monthId];
    setValue('mois_disponibilite', updated);
  };

  const onFormSubmit = (values: FormValues) => {
    if (values.races.length === 0 || values.mois_disponibilite.length === 0) return;
    onChange(values);
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">{t.technicalInfo}</h2>
        <p className="text-muted-foreground text-sm">{t.technicalInfoCopy}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">{t.racesQuestion} <span className="text-error">*</span></label>
          <p className="text-xs text-muted-foreground mb-3">{t.racesHelp}</p>

          <div className="space-y-3">
            {RACES.map((race) => {
              const isSelected = selectedRaces.includes(race.id);
              return (
                <div key={`race-card-${race.id}`} className="space-y-2">
                  <button type="button" onClick={() => toggleRace(race.id)} className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-150 text-left ${isSelected ? 'border-primary bg-secondary/30' : 'border-border bg-white hover:border-primary/30'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Icon name="HomeModernIcon" size={17} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{race.label}</p>
                      <p className="text-xs text-muted-foreground">{race.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                      {isSelected && <Icon name="CheckIcon" size={12} className="text-white" />}
                    </div>
                  </button>

                  {isSelected && race.id !== 'autres' && (
                    <div className="ml-11 animate-fadeIn">
                      <label className="block text-xs text-muted-foreground mb-1">{t.headCount} - {race.label}</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} placeholder="150" className="w-32 px-3 py-2 rounded-lg border border-input bg-white text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" {...register(`nombre_tetes.${race.id}`, { min: 1 })} />
                        <span className="text-xs text-muted-foreground">{t.heads}</span>
                      </div>
                    </div>
                  )}

                  {isSelected && race.id === 'autres' && (
                    <div className="ml-11 animate-fadeIn">
                      <label className="block text-xs text-muted-foreground mb-1">{t.specifyRace}</label>
                      <input type="text" placeholder={t.raceName} className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" {...register('autres_race')} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedRaces.length === 0 && <p className="mt-2 text-xs text-muted-foreground">{t.noRaceSelected}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">{t.availability} <span className="text-error">*</span></label>
          <p className="text-xs text-muted-foreground mb-3">{t.availabilityHelp}</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {MONTHS.map((month) => {
              const isSelected = selectedMonths.includes(month.id);
              return (
                <button key={`month-${month.id}`} type="button" onClick={() => toggleMonth(month.id)} className={`py-2.5 px-1 rounded-lg border-2 text-xs font-semibold transition-all duration-150 ${isSelected ? 'border-accent bg-accent text-white shadow-sm' : 'border-border text-muted-foreground hover:border-accent/50 hover:bg-accent/5'}`}>
                  {month.label}
                </button>
              );
            })}
          </div>
          {selectedMonths.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{t.noMonthSelected}</p>
          ) : (
            <p className="mt-2 text-xs text-accent font-medium">
              {selectedMonths.length} {selectedMonths.length > 1 ? t.monthsSelectedPlural : t.monthsSelected}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="note">{t.note} <span className="text-muted-foreground font-normal">({t.optional})</span></label>
          <textarea id="note" rows={3} maxLength={500} placeholder={t.notePlaceholder} className="w-full px-4 py-3 rounded-xl border border-input bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" {...register('note')} />
          <p className="text-xs text-muted-foreground text-right mt-1">{t.maxChars}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onBack} className="flex-1 py-3.5 px-6 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all duration-150 flex items-center justify-center gap-2">
          <Icon name={dir === 'rtl' ? 'ArrowRightIcon' : 'ArrowLeftIcon'} size={18} />
          {t.previous}
        </button>
        <button type="submit" disabled={submitting || selectedRaces.length === 0 || selectedMonths.length === 0} className="flex-1 py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-warm-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <Icon name="ArrowPathIcon" size={18} className="animate-spin" /> : <Icon name="PaperAirplaneIcon" size={18} />}
          {t.submit}
        </button>
      </div>
    </form>
  );
}
