/**
 * Layout - Hyperliquid Design
 * Clean, minimal chrome
 */

import { ReactNode } from 'react';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { NavigationProgress } from '@/components/explorer/NavigationProgress';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showFooter?: boolean;
}

export function Layout({ children, showNav = true, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationProgress />
      {showNav && <NavBar />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
