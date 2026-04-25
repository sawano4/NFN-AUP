'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/i18n';

export default function AppHeader() {
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const navItems = useMemo(
    () => [
      { href: '/profile-dashboard', label: t.navDashboard, icon: 'HomeIcon' },
      { href: '/collection-history-lot-tracking', label: t.navCollections, icon: 'ArchiveBoxIcon' },
      { href: '/profile-dashboard', label: t.navProfile, icon: 'UserCircleIcon' },
    ],
    [t]
  );

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored === 'dark' || (!stored && prefersDark);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="bg-white dark:bg-card border-b border-border sticky top-0 z-40 shadow-warm-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/profile-dashboard" className="flex items-center gap-2 group">
              <AppLogo size={36} />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-primary text-lg tracking-tight">NFNSource</span>
                <span className="text-xs text-muted-foreground font-normal hidden sm:block">{t.portalSubtitle}</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.slice(0, 2).map((item) => (
                <Link
                  key={`nav-${item.href}-${item.label}`}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(item.href)
                      ? 'bg-secondary text-primary'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={item.icon as 'HomeIcon'} size={16} />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label={darkMode ? t.lightMode : t.darkMode}
              >
                <Icon name={darkMode ? 'SunIcon' : 'MoonIcon'} size={18} />
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">MB</span>
                </div>
                <span className="text-sm font-medium text-foreground">Mohamed B.</span>
              </div>

              {pathname === '/guided-registration-form' ? null : (
                <Link
                  href="/guided-registration-form"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-all duration-150"
                >
                  <Icon name="PlusCircleIcon" size={14} />
                  {t.newRegistration}
                </Link>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Menu"
              >
                <Icon name={mobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={20} />
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-white dark:bg-card animate-fadeIn">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={`mobile-nav-${item.label}`}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-secondary text-primary'
                      : 'text-foreground/70 hover:bg-muted'
                  }`}
                >
                  <Icon name={item.icon as 'HomeIcon'} size={18} />
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-error/80 hover:bg-error/5 w-full transition-all">
                  <Icon name="ArrowRightOnRectangleIcon" size={18} />
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={`bottom-nav-${item.label}`}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all ${
                isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon name={item.icon as 'HomeIcon'} size={20} />
              <span className="text-xs font-medium">{dir === 'rtl' ? item.label : item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
