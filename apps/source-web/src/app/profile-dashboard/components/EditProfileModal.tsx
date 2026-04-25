'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import Icon from '@/components/ui/AppIcon';
import { MONTHS, RACES } from '@/lib/mockData';
import type { MOCK_PROFILE } from '@/lib/mockData';

interface EditProfileModalProps {
  profile: typeof MOCK_PROFILE;
  onClose: () => void;
  onSave: () => void;
}

type EditFormValues = {
  races: string[];
  nombre_tetes: Record<string, number>;
  mois_disponibilite: string[];
  note: string;
};

export default function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<EditFormValues>({
    defaultValues: {
      races: profile.races.map((r) =>
        RACES.find((rc) => rc.label === r)?.id ?? r.toLowerCase().replace(' ', '-')
      ),
      nombre_tetes: Object.fromEntries(
        Object.entries(profile.nombre_tetes).map(([k, v]) => [
          RACES.find((r) => r.label === k)?.id ?? k,
          v,
        ])
      ),
      mois_disponibilite: profile.mois_disponibilite.map((m) =>
        MONTHS.find((mo) => mo.label === m)?.id ?? m
      ),
      note: '',
    },
  });

  const selectedRaces = watch('races') || [];
  const selectedMonths = watch('mois_disponibilite') || [];

  const toggleRace = (id: string) => {
    const updated = selectedRaces.includes(id)
      ? selectedRaces.filter((r) => r !== id)
      : [...selectedRaces, id];
    setValue('races', updated);
  };

  const toggleMonth = (id: string) => {
    const updated = selectedMonths.includes(id)
      ? selectedMonths.filter((m) => m !== id)
      : [...selectedMonths, id];
    setValue('mois_disponibilite', updated);
  };

  const onSubmit = async (values: EditFormValues) => {
    if (selectedRaces.length === 0 || selectedMonths.length === 0) return;
    setSaving(true);
    // TODO: PUT /api/sources/me — send updated profile data
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-foreground">Modifier mes informations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Données techniques de votre élevage</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-6">
          {/* Races */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Races élevées <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              {RACES.map((race) => {
                const isSelected = selectedRaces.includes(race.id);
                return (
                  <div key={`edit-race-${race.id}`}>
                    <button
                      type="button"
                      onClick={() => toggleRace(race.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected ? 'border-primary bg-secondary/20' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="text-lg">🐑</span>
                      <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {race.label}
                      </span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {isSelected && <Icon name="CheckIcon" size={11} className="text-white" />}
                      </div>
                    </button>
                    {isSelected && race.id !== 'autres' && (
                      <div className="ml-10 mt-1.5">
                        <input
                          type="number"
                          min={1}
                          placeholder="Nombre de têtes"
                          className="w-36 px-3 py-1.5 rounded-lg border border-input bg-white text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          {...register(`nombre_tetes.${race.id}`, { min: 1 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Months */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Période de disponibilité <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((month) => {
                const isSelected = selectedMonths.includes(month.id);
                return (
                  <button
                    key={`edit-month-${month.id}`}
                    type="button"
                    onClick={() => toggleMonth(month.id)}
                    className={`py-2 px-1 rounded-lg border-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-accent bg-accent text-white' :'border-border text-muted-foreground hover:border-accent/40'
                    }`}
                  >
                    {month.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Note complémentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Informations complémentaires..."
              className="w-full px-4 py-3 rounded-xl border border-input bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              {...register('note')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || selectedRaces.length === 0 || selectedMonths.length === 0}
              className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all text-sm shadow-warm-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Icon name="ArrowPathIcon" size={15} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Icon name="CheckIcon" size={15} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}