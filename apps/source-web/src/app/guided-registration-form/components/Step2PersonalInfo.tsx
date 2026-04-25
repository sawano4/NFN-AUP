'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Icon from '@/components/ui/AppIcon';
import { WILAYAS, COMMUNES_BY_WILAYA } from '@/lib/mockData';
import { useLanguage } from '@/lib/i18n';
import type { RegistrationData } from './RegistrationFormContainer';

interface Step2Props {
  data: RegistrationData;
  onChange: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type FormValues = {
  nom: string;
  prenom: string;
  email: string;
  nin: string;
  telephone: string;
  wilaya: string;
  commune: string;
  gps_latitude: string;
  gps_longitude: string;
};

export default function Step2PersonalInfo({ data, onChange, onNext, onBack }: Step2Props) {
  const { t, dir } = useLanguage();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      nin: data.nin,
      telephone: data.telephone,
      wilaya: data.wilaya,
      commune: data.commune,
      gps_latitude: data.gps_latitude,
      gps_longitude: data.gps_longitude,
    },
  });

  const selectedWilaya = watch('wilaya');
  const communes = COMMUNES_BY_WILAYA[WILAYAS.find((w) => w.name === selectedWilaya)?.id ?? ''] ?? [];

  const handleGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not available on this device.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('gps_latitude', pos.coords.latitude.toFixed(6));
        setValue('gps_longitude', pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      () => {
        setValue('gps_latitude', '34.683600');
        setValue('gps_longitude', '3.489400');
        setGpsLoading(false);
      },
      { timeout: 5000 }
    );
  };

  const onSubmit = (values: FormValues) => {
    onChange(values);
    onNext();
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 border-input bg-white focus:border-primary';
  const errorClass = 'mt-1.5 text-xs text-error flex items-center gap-1';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">{t.personalInfo}</h2>
        <p className="text-muted-foreground text-sm">{t.personalInfoCopy}</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="nom">{t.lastName} <span className="text-error">*</span></label>
            <input id="nom" type="text" placeholder="Benali" className={inputClass} {...register('nom', { required: true, minLength: 2 })} />
            {errors.nom && <p className={errorClass}><Icon name="ExclamationCircleIcon" size={13} />Required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="prenom">{t.firstName} <span className="text-error">*</span></label>
            <input id="prenom" type="text" placeholder="Mohamed" className={inputClass} {...register('prenom', { required: true, minLength: 2 })} />
            {errors.prenom && <p className={errorClass}><Icon name="ExclamationCircleIcon" size={13} />Required</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">{t.email} <span className="text-error">*</span></label>
          <p className="text-xs text-muted-foreground mb-2">{t.emailHelp}</p>
          <input id="email" type="email" placeholder="mohamed@example.com" className={inputClass} {...register('email', { required: true, pattern: /^\S+@\S+\.\S+$/ })} />
          {errors.email && <p className={errorClass}><Icon name="ExclamationCircleIcon" size={13} />Email invalide</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="nin">{t.nin} <span className="text-error">*</span></label>
          <p className="text-xs text-muted-foreground mb-2">{t.ninHelp}</p>
          <input id="nin" type="text" placeholder="0123456789012345" maxLength={16} className={`${inputClass} font-tabular`} {...register('nin', { required: true, pattern: /^\d{16}$/ })} />
          {errors.nin && <p className={errorClass}><Icon name="ExclamationCircleIcon" size={13} />16 chiffres</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="telephone">{t.phone} <span className="text-error">*</span></label>
          <p className="text-xs text-muted-foreground mb-2">{t.phoneHelp}</p>
          <input id="telephone" type="tel" placeholder="+213 661234567" className={`${inputClass} font-tabular`} {...register('telephone', { required: true, pattern: /^\+213\s?[5-7]\d{8}$/ })} />
          {errors.telephone && <p className={errorClass}><Icon name="ExclamationCircleIcon" size={13} />+213...</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="wilaya">{t.wilaya} <span className="text-error">*</span></label>
            <select
              id="wilaya"
              className={inputClass}
              {...register('wilaya', { required: true })}
              onChange={(e) => {
                setValue('wilaya', e.target.value);
                setValue('commune', '');
              }}
            >
              <option value="">{t.selectWilaya}</option>
              {WILAYAS.map((w) => <option key={`wilaya-${w.id}`} value={w.name}>{w.id}. {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="commune">{t.commune} <span className="text-error">*</span></label>
            <select id="commune" disabled={!selectedWilaya} className={`${inputClass} ${!selectedWilaya ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`} {...register('commune', { required: true })}>
              <option value="">{selectedWilaya ? t.selectCommune : t.chooseWilayaFirst}</option>
              {communes.map((c) => <option key={`commune-${c}`} value={c}>{c}</option>)}
              {selectedWilaya && communes.length === 0 && <option value={`${selectedWilaya} centre`}>{selectedWilaya} centre</option>}
            </select>
          </div>
        </div>

        <div className="bg-muted/40 rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t.gps}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.gpsHelp}</p>
            </div>
            <button type="button" onClick={handleGPS} disabled={gpsLoading} className="flex items-center gap-2 px-3 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-dark active:scale-95 transition-all disabled:opacity-60">
              <Icon name={gpsLoading ? 'ArrowPathIcon' : 'MapPinIcon'} size={14} className={gpsLoading ? 'animate-spin' : ''} />
              {gpsLoading ? t.locating : t.myPosition}
            </button>
          </div>

          {gpsError && <p className="text-xs text-error mb-2">{gpsError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1" htmlFor="gps_latitude">{t.latitude}</label>
              <input id="gps_latitude" type="text" placeholder="34.6836" className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" {...register('gps_latitude')} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1" htmlFor="gps_longitude">{t.longitude}</label>
              <input id="gps_longitude" type="text" placeholder="3.4894" className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" {...register('gps_longitude')} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onBack} className="flex-1 py-3.5 px-6 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all duration-150 flex items-center justify-center gap-2">
          <Icon name={dir === 'rtl' ? 'ArrowRightIcon' : 'ArrowLeftIcon'} size={18} />
          {t.previous}
        </button>
        <button type="submit" className="flex-1 py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-warm-sm">
          {t.next}
          <Icon name={dir === 'rtl' ? 'ArrowLeftIcon' : 'ArrowRightIcon'} size={18} />
        </button>
      </div>
    </form>
  );
}
