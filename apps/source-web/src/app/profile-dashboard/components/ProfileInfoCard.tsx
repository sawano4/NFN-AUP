import React from 'react';
import Icon from '@/components/ui/AppIcon';
import type { MOCK_PROFILE } from '@/lib/mockData';

interface ProfileInfoCardProps {
  profile: typeof MOCK_PROFILE;
}

function maskNIN(nin: string): string {
  if (nin.length < 4) return nin;
  return nin.slice(0, 3) + '**********' + nin.slice(-3);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return phone.slice(0, 8) + '*** ' + phone.slice(-3);
}

export default function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Vos informations
        </h2>
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {profile.prenom[0]}{profile.nom[0]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Informations personnelles
          </p>

          <div className="flex items-start gap-2.5">
            <Icon name="UserIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Nom complet</p>
              <p className="text-sm font-semibold text-foreground">{profile.prenom} {profile.nom}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Icon name="IdentificationIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">NIN</p>
              <p className="text-sm font-mono font-medium text-foreground">{maskNIN(profile.nin)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Icon name="PhoneIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Téléphone</p>
              <p className="text-sm font-medium text-foreground">{maskPhone(profile.telephone)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Icon name="MapPinIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Adresse</p>
              <p className="text-sm font-medium text-foreground">{profile.commune}, {profile.wilaya}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Icon name="GlobeAltIcon" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Coordonnées GPS</p>
              <p className="text-xs font-mono text-foreground font-tabular">
                {profile.gps.latitude.toFixed(4)}, {profile.gps.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Technical */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Données techniques
          </p>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">🐑</span>
              <p className="text-xs text-muted-foreground font-medium">Races élevées</p>
            </div>
            <div className="space-y-1.5">
              {profile.races.map((race) => (
                <div key={`profile-race-${race}`} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{race}</span>
                  <span className="text-xs font-semibold text-primary bg-secondary/50 px-2 py-0.5 rounded-full font-tabular">
                    {profile.nombre_tetes[race as keyof typeof profile.nombre_tetes]?.toLocaleString('fr-DZ')} têtes
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Période de disponibilité</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.mois_disponibilite.map((mois) => (
                <span
                  key={`profile-mois-${mois}`}
                  className="text-xs px-2 py-1 bg-accent/10 text-accent-dark font-medium rounded-lg"
                >
                  {mois}
                </span>
              ))}
            </div>
          </div>

          {/* Total cheptel */}
          <div className="mt-3 pt-3 border-t border-border bg-secondary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Cheptel total</p>
            <p className="text-xl font-bold text-primary font-tabular">
              {Object.values(profile.nombre_tetes).reduce((a, b) => a + b, 0).toLocaleString('fr-DZ')}
              <span className="text-sm font-normal text-muted-foreground ml-1">têtes</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
