'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';
import LanguageToggle from '@/components/LanguageToggle';
import { sourceApi, type SourceRegistrationPayload } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import StepProgress from './StepProgress';
import Step1SourceType from './Step1SourceType';
import Step2PersonalInfo from './Step2PersonalInfo';
import Step3TechnicalData from './Step3TechnicalData';
import Step4OTP from './Step4OTP';
import ConfirmationScreen from './ConfirmationScreen';

export type SourceType = 'eleveur' | 'abattoir' | 'tiers';

export type RegistrationData = {
  type_source: SourceType;
  nom: string;
  prenom: string;
  email: string;
  nin: string;
  telephone: string;
  wilaya: string;
  commune: string;
  gps_latitude: string;
  gps_longitude: string;
  races: string[];
  nombre_tetes: Record<string, number>;
  autres_race: string;
  mois_disponibilite: string[];
  note: string;
};

const INITIAL_DATA: RegistrationData = {
  type_source: 'eleveur',
  nom: '',
  prenom: '',
  email: '',
  nin: '',
  telephone: '',
  wilaya: '',
  commune: '',
  gps_latitude: '',
  gps_longitude: '',
  races: [],
  nombre_tetes: {},
  autres_race: '',
  mois_disponibilite: [],
  note: '',
};

function toRegistrationPayload(data: RegistrationData): SourceRegistrationPayload {
  const selectedRaces = data.races.map((race) => (race === 'autres' ? data.autres_race : race)).filter(Boolean);
  const herdSize = Object.values(data.nombre_tetes).reduce((sum, value) => sum + Number(value || 0), 0);

  return {
    email: data.email,
    source_type: data.type_source,
    name: `${data.prenom} ${data.nom}`.trim(),
    wilaya: data.wilaya,
    commune: data.commune,
    gps_lat: Number(data.gps_latitude || 0),
    gps_lng: Number(data.gps_longitude || 0),
    phone: data.telephone,
    races: selectedRaces,
    herd_size: herdSize,
    availability_months: data.mois_disponibilite,
  };
}

export default function RegistrationFormContainer() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>(INITIAL_DATA);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [animating, setAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const stepLabels = [
    { label: t.stepType, sublabel: t.stepTypeSub },
    { label: t.stepInfo, sublabel: t.stepInfoSub },
    { label: t.stepBreeding, sublabel: t.stepBreedingSub },
    { label: t.stepVerification, sublabel: t.stepVerificationSub },
  ];

  const updateFormData = (data: Partial<RegistrationData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const goToStep = (step: number) => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setAnimating(false);
    }, 150);
  };

  const handleNext = () => goToStep(currentStep + 1);
  const handleBack = () => goToStep(currentStep - 1);

  const handleFormSubmit = async () => {
    setSubmitting(true);
    try {
      await sourceApi.requestOtp(formData.email);
      const outbox = await sourceApi.getOutbox().catch(() => []);
      const latestMessage = outbox
        .filter((message) => message.recipient === formData.email)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      setDevOtp(latestMessage?.body.match(/\b(\d{6})\b/)?.[1] ?? '');
      toast.success(t.otpSent);
      goToStep(4);
    } catch {
      toast.error(t.backendOffline);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOTPVerified = async (otpCode: string) => {
    setSubmitting(true);
    try {
      await sourceApi.verifyOtp(formData.email, otpCode);
      const registration = await sourceApi.createRegistration(toRegistrationPayload(formData));
      setSourceId(registration.public_id);
      localStorage.setItem('nfn-source-public-id', registration.public_id);
      localStorage.setItem('nfn-source-profile', JSON.stringify({ ...formData, public_id: registration.public_id }));
      toast.success(t.verified);
      setIsConfirmed(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.backendOffline;
      toast.error(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  if (isConfirmed) {
    return <ConfirmationScreen prenom={formData.prenom} sourceId={sourceId} />;
  }

  return (
    <div className="min-h-screen bg-background-custom flex flex-col">
      <div className="bg-white border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppLogo size={32} />
            <span className="font-bold text-primary text-base">NFNSource</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/profile-dashboard"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t.alreadyRegistered}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-2xl">
          {currentStep <= 3 && (
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {t.registrationHeroTitle}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t.registrationHeroCopy}
              </p>
            </div>
          )}

          <StepProgress currentStep={currentStep} steps={stepLabels} />

          <div
            className={`bg-white rounded-2xl shadow-card border border-border p-6 sm:p-8 mt-6 transition-all duration-150 ${
              animating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
          >
            {currentStep === 1 && (
              <Step1SourceType
                value={formData.type_source}
                onChange={(v) => updateFormData({ type_source: v })}
                onNext={handleNext}
              />
            )}
            {currentStep === 2 && (
              <Step2PersonalInfo
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <Step3TechnicalData
                data={formData}
                onChange={updateFormData}
                onSubmit={handleFormSubmit}
                onBack={handleBack}
                submitting={submitting}
              />
            )}
            {currentStep === 4 && (
              <Step4OTP
                email={formData.email}
                devOtp={devOtp}
                onVerified={handleOTPVerified}
                onResend={() => sourceApi.requestOtp(formData.email)}
                onBack={handleBack}
                submitting={submitting}
              />
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t.dataProtection}
          </p>
        </div>
      </div>
    </div>
  );
}
