'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { MOCK_PROFILE, MOCK_LOTS } from '@/lib/mockData';
import type { SourceStatut } from '@/lib/mockData';
import { sourceApi } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import StatusCard from './StatusCard';
import ProfileInfoCard from './ProfileInfoCard';
import CollectionStatsRow from './CollectionStatsRow';
import ContactCard from './ContactCard';
import EditProfileModal from './EditProfileModal';

export default function DashboardContent() {
  const { t } = useLanguage();
  const profile = MOCK_PROFILE;
  const lots = MOCK_LOTS;
  const [editOpen, setEditOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SourceStatut>('en_attente');

  useEffect(() => {
    const publicId = localStorage.getItem('nfn-source-public-id');
    if (!publicId) {
      setCurrentStatus(profile.statut);
      return;
    }

    sourceApi.getStatus(publicId)
      .then((status) => {
        const mapped: Record<string, SourceStatut> = {
          pending: 'en_attente',
          active: 'actif',
          rejected: 'rejeté',
          suspended: 'suspendu',
        };
        setCurrentStatus(mapped[status.status] ?? 'en_attente');
      })
      .catch(() => setCurrentStatus('en_attente'));
  }, [profile.statut]);

  const statusConfig: Record<SourceStatut, { label: string; color: string; bg: string; icon: string; message: string }> = {
    en_attente: {
      label: t.statusPending,
      color: '#D4813E',
      bg: '#FEF3E8',
      icon: 'ClockIcon',
      message: t.pendingStatusMessage,
    },
    actif: {
      label: t.statusActive,
      color: '#5A8A49',
      bg: '#EBF5E7',
      icon: 'CheckCircleIcon',
      message: t.activeStatusMessage,
    },
    rejeté: {
      label: t.statusRejected,
      color: '#C04F35',
      bg: '#FDE8E3',
      icon: 'XCircleIcon',
      message: t.rejectedStatusMessage,
    },
    suspendu: {
      label: t.statusSuspended,
      color: '#6B7280',
      bg: '#F3F4F6',
      icon: 'PauseCircleIcon',
      message: t.suspendedStatusMessage,
    },
  };

  const statusCfg = statusConfig[currentStatus];
  const totalPoids = lots.reduce((sum, lot) => sum + lot.poids_kg, 0);
  const lastCollecte = lots.length > 0 ? lots[0].date_collecte : null;
  const lotsEnCours = lots.filter((lot) => lot.statut !== 'livré').length;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t.hello}, {profile.prenom} !
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t.dashboardTitle} - {t.sourcePortal}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}>
          <Icon name={statusCfg.icon as 'CheckCircleIcon'} size={13} />
          {statusCfg.label}
        </span>
      </div>

      <div className="rounded-xl p-4 mb-6 border flex items-start gap-3" style={{ backgroundColor: statusCfg.bg, borderColor: `${statusCfg.color}40` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${statusCfg.color}20` }}>
          <Icon name={statusCfg.icon as 'CheckCircleIcon'} size={18} style={{ color: statusCfg.color }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: statusCfg.color }}>{statusCfg.label}</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{statusCfg.message}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <StatusCard
            profile={profile}
            statusCfg={statusCfg}
            onEdit={() => {
              if (currentStatus === 'en_attente' || currentStatus === 'actif') {
                setEditOpen(true);
              } else {
                toast.error('Modification non disponible');
              }
            }}
          />
        </div>

        <div className="lg:col-span-2 xl:col-span-2">
          <ProfileInfoCard profile={profile} />
        </div>

        <div className="lg:col-span-3 xl:col-span-1">
          <ContactCard />
        </div>

        {currentStatus === 'actif' && (
          <div className="lg:col-span-3 xl:col-span-4">
            <CollectionStatsRow totalCollectes={lots.length} poidsTotal={totalPoids} lastCollecte={lastCollecte} lotsEnCours={lotsEnCours} />
          </div>
        )}

        {currentStatus === 'en_attente' && (
          <div className="lg:col-span-3 xl:col-span-4">
            <div className="bg-white rounded-xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="ArchiveBoxIcon" size={24} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{t.collectionsHistory}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t.availableAfterValidation}</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-warning/10 text-warning-dark rounded-full font-medium">{t.statusPending}</span>
            </div>
          </div>
        )}

        {currentStatus === 'actif' && (
          <div className="lg:col-span-3 xl:col-span-4">
            <div className="bg-white rounded-xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="TruckIcon" size={20} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  {lotsEnCours > 0 ? `${lotsEnCours} lot(s) en cours` : 'Toutes vos collectes ont ete livrees'}
                </p>
              </div>
              <Link href="/collection-history-lot-tracking" className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark active:scale-95 transition-all shadow-warm-sm flex-shrink-0">
                {t.viewCollections}
                <Icon name="ArrowRightIcon" size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={() => {
            setEditOpen(false);
            toast.success('Profil mis a jour');
          }}
        />
      )}
    </div>
  );
}
