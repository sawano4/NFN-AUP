'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useLanguage } from '@/lib/i18n';

interface ConfirmationScreenProps {
  prenom: string;
  sourceId: string;
}

export default function ConfirmationScreen({ prenom, sourceId }: ConfirmationScreenProps) {
  const { t } = useLanguage();
  const steps = [
    { icon: 'CheckIcon', text: t.received, done: true },
    { icon: 'ClockIcon', text: t.teamReview, done: false },
    { icon: 'EnvelopeIcon', text: t.confirmationMessage, done: false },
    { icon: 'TruckIcon', text: t.agentVisit, done: false },
  ];

  return (
    <div className="min-h-screen bg-background-custom flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-border p-8 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="CheckCircleIcon" size={44} className="text-success" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t.registrationSent}</h1>
        <p className="text-lg font-medium text-primary mb-2">
          {t.thankYou}, {prenom || t.dearFarmer}
        </p>
        {sourceId && <p className="text-xs text-muted-foreground mb-4 font-tabular">{sourceId}</p>}

        <div className="bg-secondary/40 rounded-xl p-4 mb-6 text-left border border-secondary">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="ClockIcon" size={18} className="text-warning-dark" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">{t.pendingTitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.pendingCopy}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8 text-left">
          {steps.map((item, index) => (
            <div key={`confirm-step-${index}`} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                <Icon name={item.icon as 'CheckIcon'} size={14} />
              </div>
              <p className={`text-sm ${item.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{item.text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Link href="/profile-dashboard" className="block w-full py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-150 text-center shadow-warm-sm">
            {t.dashboardAccess}
          </Link>
          <Link href="/" className="block w-full py-3 px-6 border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted active:scale-95 transition-all duration-150 text-center text-sm">
            {t.homeBack}
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        {t.questions}{' '}
        <a href="tel:+213800000000" className="text-primary font-medium">+213 800 000 000</a>
      </p>
    </div>
  );
}
