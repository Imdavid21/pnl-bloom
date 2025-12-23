import { ReactNode } from 'react';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showFooter?: boolean;
}

export function Layout({ children, showNav = true, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showNav && <NavBar />}
      <main className="flex-1 w-full">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
