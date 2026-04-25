'use client';
import React, { useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { MOCK_LOTS } from '@/lib/mockData';

import CollectionStatsCards from './CollectionStatsCards';
import LotsTable from './LotsTable';
import LotDetailModal from './LotDetailModal';
import CollectionEmptyState from './CollectionEmptyState';
import type { Lot } from '@/lib/mockData';

const STATUT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'collecté', label: 'Collecté' },
  { value: 'au_dépôt', label: 'Au dépôt' },
  { value: 'classifié', label: 'Classifié' },
  { value: 'en_transit_laverie', label: 'En transit laverie' },
  { value: 'en_laverie', label: 'En laverie' },
  { value: 'lavé', label: 'Lavé' },
  { value: 'en_transit_transformateur', label: 'En transit transformateur' },
  { value: 'livré', label: 'Livré' },
];

const RACE_OPTIONS = ['', 'Ouled Djellal', 'Hamra', 'Rembi'];

export default function CollectionHistoryContent() {
  // TODO: GET /api/sources/me/lots — fetch lots data, replace MOCK_LOTS
  const lots = MOCK_LOTS;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterRace, setFilterRace] = useState('');
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);

  const filtered = useMemo(() => {
    return lots.filter((lot) => {
      const matchSearch =
        !searchQuery ||
        lot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.race.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.agent_nom.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatut = !filterStatut || lot.statut === filterStatut;
      const matchRace = !filterRace || lot.race === filterRace;
      return matchSearch && matchStatut && matchRace;
    });
  }, [lots, searchQuery, filterStatut, filterRace]);

  const totalPoids = lots.reduce((sum, l) => sum + l.poids_kg, 0);
  const lotsEnCours = lots.filter((l) => l.statut !== 'livré').length;
  const lotsLivres = lots.filter((l) => l.statut === 'livré').length;

  const hasAnyFilter = searchQuery || filterStatut || filterRace;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mes collectes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Historique et suivi de vos lots de laine
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white border border-border rounded-lg px-3 py-2">
          <Icon name="ClockIcon" size={13} />
          Mis à jour le 24/04/2026 à 19:32
        </div>
      </div>

      {/* Stats cards */}
      <CollectionStatsCards
        totalCollectes={lots.length}
        poidsTotal={totalPoids}
        lotsEnCours={lotsEnCours}
        lotsLivres={lotsLivres}
      />

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4 mt-6 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Icon
              name="MagnifyingGlassIcon"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Rechercher par ID lot, race, agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Statut filter */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none min-w-[160px]"
          >
            {STATUT_OPTIONS.map((opt) => (
              <option key={`filter-statut-${opt.value || 'all'}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Race filter */}
          <select
            value={filterRace}
            onChange={(e) => setFilterRace(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none min-w-[140px]"
          >
            {RACE_OPTIONS.map((race) => (
              <option key={`filter-race-${race || 'all'}`} value={race}>
                {race || 'Toutes les races'}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {hasAnyFilter && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatut('');
                setFilterRace('');
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-all"
            >
              <Icon name="XMarkIcon" size={14} />
              Effacer
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground font-tabular">{filtered.length}</span>{' '}
            lot{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
            {hasAnyFilter && (
              <span className="text-primary"> (filtrés sur {lots.length} total)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Poids filtré :{' '}
            <span className="font-semibold text-foreground font-tabular">
              {filtered.reduce((s, l) => s + l.poids_kg, 0).toLocaleString('fr-DZ')} kg
            </span>
          </p>
        </div>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <CollectionEmptyState hasFilter={!!hasAnyFilter} />
      ) : (
        <LotsTable
          lots={filtered}
          onViewDetail={(lot) => setSelectedLot(lot)}
        />
      )}

      {/* Lot detail modal */}
      {selectedLot && (
        <LotDetailModal
          lot={selectedLot}
          onClose={() => setSelectedLot(null)}
        />
      )}
    </div>
  );
}