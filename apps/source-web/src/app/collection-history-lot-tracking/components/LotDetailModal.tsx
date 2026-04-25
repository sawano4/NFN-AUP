'use client';
import React from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { LOT_STATUT_CONFIG } from '@/lib/mockData';
import type { Lot, TimelineEvent } from '@/lib/mockData';

interface LotDetailModalProps {
  lot: Lot;
  onClose: () => void;
}

const TIMELINE_ICONS: Record<string, string> = {
  collecte: 'TruckIcon',
  depot: 'BuildingStorefrontIcon',
  classifie: 'ClipboardDocumentCheckIcon',
  transit_laverie: 'ArrowRightCircleIcon',
  laverie: 'BeakerIcon',
  lave: 'SparklesIcon',
  transit_transformateur: 'ArrowRightCircleIcon',
  livre: 'CheckBadgeIcon',
};

const TIMELINE_COLORS: Record<string, { completed: string; pending: string }> = {
  collecte: { completed: '#8B7355', pending: '#D4C4A8' },
  depot: { completed: '#5A8F7B', pending: '#B8DDD4' },
  classifie: { completed: '#5A8F7B', pending: '#B8DDD4' },
  transit_laverie: { completed: '#F4A261', pending: '#F9D4AF' },
  laverie: { completed: '#4A90D9', pending: '#B8D8F5' },
  lave: { completed: '#4A90D9', pending: '#B8D8F5' },
  transit_transformateur: { completed: '#F4A261', pending: '#F9D4AF' },
  livre: { completed: '#7FB069', pending: '#B8DDA8' },
};

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const iconName = TIMELINE_ICONS[event.type] ?? 'CircleStackIcon';
  const colors = TIMELINE_COLORS[event.type] ?? { completed: '#8B7355', pending: '#D4C4A8' };
  const color = event.completed ? colors.completed : colors.pending;

  return (
    <div className="flex gap-4">
      {/* Icon + line */}
      <div className="flex flex-col items-center">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-warm-sm"
          style={{
            backgroundColor: event.completed ? color + '20' : '#F2EDE4',
            border: `2px solid ${event.completed ? color : '#E2D8CA'}`,
          }}
        >
          <Icon
            name={iconName as 'TruckIcon'}
            size={18}
            style={{ color: event.completed ? color : '#C8B89A' }}
          />
        </div>
        {!isLast && (
          <div
            className="w-0.5 flex-1 mt-1 min-h-[24px]"
            style={{ backgroundColor: event.completed ? color + '40' : '#E2D8CA' }}
          />
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1.5">
          <p
            className={`text-sm font-semibold ${
              event.completed ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {event.label}
          </p>
          {event.completed && event.date && (
            <span className="text-xs text-muted-foreground font-tabular whitespace-nowrap">
              {event.date} à {event.heure}
            </span>
          )}
          {!event.completed && (
            <span className="text-xs text-muted-foreground italic">En attente</span>
          )}
        </div>

        {event.completed && (
          <div className="space-y-1">
            {event.acteur && (
              <div className="flex items-center gap-1.5">
                <Icon name="UserIcon" size={12} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{event.acteur}</p>
              </div>
            )}
            {event.lieu && (
              <div className="flex items-center gap-1.5">
                <Icon name="MapPinIcon" size={12} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{event.lieu}</p>
              </div>
            )}
            {event.poids !== undefined && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg">
                  <Icon name="ScaleIcon" size={12} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground font-tabular">
                    {event.poids.toLocaleString('fr-DZ')} kg
                  </span>
                </div>
                {event.ecart !== undefined && event.ecart !== null && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: event.ecart < 0 ? '#FEF3E8' : '#EBF5E7',
                      color: event.ecart < 0 ? '#D4813E' : '#5A8A49',
                    }}
                  >
                    <Icon
                      name={event.ecart < 0 ? 'ArrowDownIcon' : 'ArrowUpIcon'}
                      size={11}
                    />
                    {event.ecart > 0 ? '+' : ''}{event.ecart} kg
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LotDetailModal({ lot, onClose }: LotDetailModalProps) {
  const cfg = LOT_STATUT_CONFIG[lot.statut];
  const completedSteps = lot.timeline.filter((e) => e.completed).length;
  const progressPct = Math.round((completedSteps / lot.timeline.length) * 100);

  const handleDownloadQR = () => {
    // TODO: GET /api/lots/{id}/qr-code — download QR code PDF
    toast.success('Téléchargement du QR code en cours...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl border border-border max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground font-mono">{lot.id}</h2>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: cfg.color, backgroundColor: cfg.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Collecté le {lot.date_collecte} · {lot.race} · {lot.type_laine}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0 ml-2"
          >
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        {/* Summary row */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border flex-shrink-0">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Poids collecté</p>
              <p className="text-sm font-bold text-foreground font-tabular">
                {lot.poids_kg.toLocaleString('fr-DZ')} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Race</p>
              <p className="text-sm font-bold text-foreground">{lot.race}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Agent</p>
              <p className="text-sm font-bold text-foreground truncate">{lot.agent_nom.split(' ')[0]}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Avancement</p>
              <p className="text-xs font-semibold text-foreground font-tabular">
                {completedSteps}/{lot.timeline.length} étapes
              </p>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: cfg.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Historique du lot
          </h3>
          <div>
            {lot.timeline.map((event, index) => (
              <TimelineItem
                key={`timeline-${lot.id}-${event.type}`}
                event={event}
                isLast={index === lot.timeline.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button
            onClick={handleDownloadQR}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-primary/30 text-primary text-sm font-semibold rounded-xl hover:bg-secondary/40 active:scale-95 transition-all"
          >
            <Icon name="QrCodeIcon" size={16} />
            QR Code
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark active:scale-95 transition-all shadow-warm-sm"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}