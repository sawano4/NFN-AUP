import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface CollectionStatsRowProps {
  totalCollectes: number;
  poidsTotal: number;
  lastCollecte: string | null;
  lotsEnCours: number;
}

export default function CollectionStatsRow({
  totalCollectes,
  poidsTotal,
  lastCollecte,
  lotsEnCours,
}: CollectionStatsRowProps) {
  const stats = [
    {
      id: 'stat-collectes',
      label: 'Total collectes',
      value: totalCollectes.toString(),
      unit: 'lots',
      icon: 'ArchiveBoxIcon',
      color: '#8B7355',
      bg: '#F5F0EA',
    },
    {
      id: 'stat-poids',
      label: 'Poids total collecté',
      value: poidsTotal.toLocaleString('fr-DZ'),
      unit: 'kg',
      icon: 'ScaleIcon',
      color: '#5A8F7B',
      bg: '#EBF5F1',
    },
    {
      id: 'stat-encours',
      label: 'Lots en cours',
      value: lotsEnCours.toString(),
      unit: 'en traitement',
      icon: 'ArrowPathIcon',
      color: '#4A90D9',
      bg: '#EBF4FC',
    },
    {
      id: 'stat-derniere',
      label: 'Dernière collecte',
      value: lastCollecte ?? '—',
      unit: '',
      icon: 'CalendarDaysIcon',
      color: '#7FB069',
      bg: '#EBF5E7',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Résumé des collectes
        </h2>
        <Link
          href="/collection-history-lot-tracking"
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          Voir tout
          <Icon name="ArrowRightIcon" size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-white rounded-xl border border-border shadow-card p-4 flex items-start gap-3 hover:shadow-card-hover transition-shadow duration-150"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: stat.bg }}
            >
              <Icon name={stat.icon as 'ArchiveBoxIcon'} size={20} style={{ color: stat.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5 truncate">{stat.label}</p>
              <p className="text-xl font-bold text-foreground font-tabular leading-none">
                {stat.value}
              </p>
              {stat.unit && (
                <p className="text-xs text-muted-foreground mt-0.5">{stat.unit}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}