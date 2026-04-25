import React from 'react';
import AppHeader from './AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function AppLayout({ children, showHeader = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && <AppHeader />}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}