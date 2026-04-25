import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/lib/i18n';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'NFNSource - Portail des eleveurs de la filiere laine',
  description: 'Inscrivez-vous sur la plateforme NFN et suivez vos collectes de laine en temps reel.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="bg-background min-h-screen">
        <LanguageProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'DM Sans, sans-serif',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
              },
            }}
          />
        </LanguageProvider>
      </body>
    </html>
  );
}
