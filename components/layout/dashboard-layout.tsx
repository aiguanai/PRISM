'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { IntelligencePanel } from './intelligence-panel';
import { IntelligenceInsight } from '@/lib/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  insights?: IntelligenceInsight[];
}

export function DashboardLayout({ children, insights = [] }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        showMenu={true}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fixed on desktop, overlay on mobile */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </main>

        {/* Intelligence Panel - Hidden on smaller screens */}
        <IntelligencePanel insights={insights} isVisible={true} />
      </div>
    </div>
  );
}
