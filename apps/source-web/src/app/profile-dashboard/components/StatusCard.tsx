import React from 'react';
import Icon from '@/components/ui/AppIcon';
import type { MOCK_PROFILE } from '@/lib/mockData';

interface StatusCardProps {
  profile: typeof MOCK_PROFILE;
  statusCfg: { label: string; color: string; bg: string; icon: string };
  onEdit: () => void;
}

export default function StatusCard({ profile, statusCfg, onEdit }: StatusCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Statut du compte
        </h2>
        <Icon name="ShieldCheckIcon" size={16} className="text-muted-foreground" />
      </div>

      {/* Status badge */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
        style={{ backgroundColor: statusCfg.bg }}
      >
        <Icon name={statusCfg.icon as 'CheckCircleIcon'} size={20} style={{ color: statusCfg.color }} />
        <span className="text-sm font-bold" style={{ color: statusCfg.color }}>
          {statusCfg.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3 flex-1">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name="CheckIcon" size={11} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Inscription soumise</p>
            <p className="text-xs text-muted-foreground">
              {profile.date_inscription}
            </p>
          </div>
        </div>

        {profile.statut === 'actif' && (
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="CheckIcon" size={11} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Compte validé</p>
              <p className="text-xs text-muted-foreground">
                {profile.date_validation}
              </p>
            </div>
          </div>
        )}

        {profile.statut === 'en_attente' && (
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-warning/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="ClockIcon" size={11} className="text-warning-dark" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">En cours de validation</p>
              <p className="text-xs text-muted-foreground">Délai estimé : 2–5 jours</p>
            </div>
          </div>
        )}

        {profile.statut === 'actif' && (
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="TruckIcon" size={11} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Première collecte</p>
              <p className="text-xs text-muted-foreground">03/02/2025</p>
            </div>
          </div>
        )}
      </div>

      {/* Scoring */}
      {profile.statut === 'actif' && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground font-medium">Score de fiabilité</p>
            <span className="text-sm font-bold text-success">{profile.scoring_fiabilite}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-700"
              style={{ width: `${profile.scoring_fiabilite}%` }}
            />
          </div>
        </div>
      )}

      {/* Edit button */}
      {(profile.statut === 'en_attente' || profile.statut === 'actif') && (
        <button
          onClick={onEdit}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-primary/30 text-primary text-sm font-medium rounded-lg hover:bg-secondary/40 active:scale-95 transition-all duration-150"
        >
          <Icon name="PencilSquareIcon" size={14} />
          Modifier mes informations
        </button>
      )}
    </div>
  );
}