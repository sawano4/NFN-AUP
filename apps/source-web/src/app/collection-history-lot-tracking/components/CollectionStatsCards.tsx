import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface CollectionStatsCardsProps {
  totalCollectes: number;
  poidsTotal: number;
  lotsEnCours: number;
  lotsLivres: number;
}

export default function CollectionStatsCards({
  totalCollectes,
  poidsTotal,
  lotsEnCours,
  lotsLivres,
}: CollectionStatsCardsProps) {
  const cards = [
    {
      id: 'card-total',
      label: 'Total collectes',
      value: totalCollectes,
      unit: 'lots',
      icon: 'ArchiveBoxIcon',
      color: '#8B7355',
      bg: '#F5F0EA',
      border: '#D4C4A8',
    },
    {
      id: 'card-poids',
      label: 'Poids total',
      value: poidsTotal.toLocaleString('fr-DZ'),
      unit: 'kg collectés',
      icon: 'ScaleIcon',
      color: '#5A8F7B',
      bg: '#EBF5F1',
      border: '#B8DDD4',
    },
    {
      id: 'card-encours',
      label: 'En cours de traitement',
      value: lotsEnCours,
      unit: 'lots actifs',
      icon: 'ArrowPathIcon',
      color: '#4A90D9',
      bg: '#EBF4FC',
      border: '#B8D8F5',
    },
    {
      id: 'card-livres',
      label: 'Lots livrés',
      value: lotsLivres,
      unit: 'complétés',
      icon: 'CheckCircleIcon',
      color: '#7FB069',
      bg: '#EBF5E7',
      border: '#B8DDA8',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-xl border shadow-card p-4 hover:shadow-card-hover transition-shadow duration-150"
          style={{ borderColor: card.border }}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: card.bg }}
            >
              <Icon name={card.icon as 'ArchiveBoxIcon'} size={20} style={{ color: card.color }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-tabular leading-none mb-1">
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground font-medium">{card.unit}</p>
          <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}