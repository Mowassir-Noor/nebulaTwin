import React from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-6 h-[calc(100%+3rem)] flex flex-col lg:flex-row bg-background overflow-hidden relative">
      {/* Left Sidebar */}
      <div className="hidden lg:block w-64 border-r border-border/50 bg-background flex-shrink-0 overflow-y-auto custom-scrollbar shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)] z-10">
        <LeftSidebar />
      </div>

      {/* Center Panel (Wrapped Content) */}
      <div className="flex-1 w-full h-full overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-background to-background">
        <div className="p-4 lg:p-6 lg:max-w-[1400px] mx-auto min-h-full">
          {children}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden xl:block w-80 border-l border-border/50 bg-background flex-shrink-0 overflow-hidden shadow-[-4px_0_24px_-4px_rgba(0,0,0,0.5)] z-10">
        <RightPanel />
      </div>

      {/* Mobile/Tablet Fallbacks (Stacking) */}
      <div className="lg:hidden w-full border-t border-border/50 bg-background flex-shrink-0">
        <div className="p-4 overflow-x-auto flex gap-4">
          <div className="min-w-[280px] border border-border/50 rounded-lg p-2 bg-secondary/10">
            <LeftSidebar />
          </div>
          <div className="min-w-[320px] border border-border/50 rounded-lg h-[400px] overflow-hidden">
            <RightPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
