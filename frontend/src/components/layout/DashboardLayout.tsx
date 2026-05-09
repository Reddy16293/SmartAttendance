import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-16 lg:pl-64 transition-all duration-300 pt-16 md:pt-0">
        <div className="w-full px-3 py-4 sm:p-6 lg:p-8 mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
