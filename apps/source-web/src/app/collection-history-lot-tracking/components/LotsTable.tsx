'use client';
import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { LOT_STATUT_CONFIG } from '@/lib/mockData';
import type { Lot } from '@/lib/mockData';

interface LotsTableProps {
  lots: Lot[];
  onViewDetail: (lot: Lot) => void;
}

type SortKey = 'id' | 'date_collecte' | 'poids_kg' | 'race' | 'statut';

export default function LotsTable({ lots, onViewDetail }: LotsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date_collecte');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const perPage = 6;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const sorted = [...lots].sort((a, b) => {
    let valA: string | number = a[sortKey] as string | number;
    let valB: string | number = b[sortKey] as string | number;
    if (sortKey === 'date_collecte') {
      const parseDate = (d: string) => {
        const [day, month, year] = d.split('/');
        return new Date(+year, +month - 1, +day).getTime();
      };
      valA = parseDate(a.date_collecte);
      valB = parseDate(b.date_collecte);
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0.5">
      <Icon
        name="ChevronUpIcon"
        size={10}
        className={sortKey === col && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/40'}
      />
      <Icon
        name="ChevronDownIcon"
        size={10}
        className={sortKey === col && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/40'}
      />
    </span>
  );

  return (
    <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {(
                [
                  { key: 'id', label: 'ID Lot' },
                  { key: 'date_collecte', label: 'Date' },
                  { key: 'poids_kg', label: 'Poids (kg)' },
                  { key: 'race', label: 'Race' },
                  { key: 'statut', label: 'Statut' },
                ] as { key: SortKey; label: string }[]
              ).map((col) => (
                <th
                  key={`th-${col.key}`}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-0.5">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Agent
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((lot, idx) => {
              const cfg = LOT_STATUT_CONFIG[lot.statut];
              return (
                <tr
                  key={`lot-row-${lot.id}`}
                  className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                  }`}
                  onClick={() => onViewDetail(lot)}
                >
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-mono font-semibold text-primary">
                      {lot.id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground font-tabular">{lot.date_collecte}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-foreground font-tabular">
                      {lot.poids_kg.toLocaleString('fr-DZ')}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">kg</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground">{lot.race}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.dot }}
                      />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-muted-foreground">{lot.agent_nom}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(lot);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-secondary/40 active:scale-95 transition-all"
                    >
                      <Icon name="EyeIcon" size={13} />
                      Détail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-border">
        {paginated.map((lot) => {
          const cfg = LOT_STATUT_CONFIG[lot.statut];
          return (
            <div
              key={`lot-card-${lot.id}`}
              className="p-4 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onViewDetail(lot)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-mono font-bold text-primary">{lot.id}</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: cfg.color, backgroundColor: cfg.bg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Date : </span>
                  <span className="text-foreground font-tabular">{lot.date_collecte}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Poids : </span>
                  <span className="font-semibold font-tabular">{lot.poids_kg} kg</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Race : </span>
                  <span className="text-foreground">{lot.race}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Agent : </span>
                  <span className="text-foreground text-xs">{lot.agent_nom.split(' ')[0]}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  Voir le détail <Icon name="ArrowRightIcon" size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Affichage de{' '}
            <span className="font-semibold text-foreground font-tabular">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)}
            </span>{' '}
            sur <span className="font-semibold text-foreground font-tabular">{sorted.length}</span> lots
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="ChevronLeftIcon" size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`page-btn-${p}`}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  p === page
                    ? 'bg-primary text-white' :'border border-border hover:bg-muted text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="ChevronRightIcon" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}