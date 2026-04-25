import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface CollectionEmptyStateProps {
  hasFilter: boolean;
}

export default function CollectionEmptyState({ hasFilter }: CollectionEmptyStateProps) {
  if (hasFilter) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="MagnifyingGlassIcon" size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Aucun lot trouvé</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Aucun lot ne correspond à vos critères de recherche. Essayez de modifier vos filtres.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
      <div className="w-20 h-20 bg-secondary/60 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🐑</span>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Aucune collecte pour le moment</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
        Un agent passera chez vous pendant la période de disponibilité que vous avez indiquée. Votre première collecte apparaîtra ici.
      </p>
      <div className="bg-secondary/40 border border-secondary rounded-xl p-4 max-w-xs mx-auto">
        <div className="flex items-start gap-3 text-left">
          <Icon name="InformationCircleIcon" size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Si votre compte est validé depuis plus d'un mois et qu'aucun agent ne s'est manifesté, contactez-nous au{' '}
            <a href="tel:+213800000000" className="text-primary font-medium">+213 800 000 000</a>.
          </p>
        </div>
      </div>
      <Link
        href="/profile-dashboard"
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all shadow-warm-sm"
      >
        <Icon name="HomeIcon" size={16} />
        Retour au tableau de bord
      </Link>
    </div>
  );
}