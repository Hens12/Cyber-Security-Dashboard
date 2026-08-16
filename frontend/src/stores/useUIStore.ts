/* ═══════════════════════════════════════════════════════════
   Zustand Store — UI State
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  commandPaletteOpen: boolean;
  notificationPanelOpen: boolean;
  currentPage: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleNotificationPanel: () => void;
  setCurrentPage: (page: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  commandPaletteOpen: false,
  notificationPanelOpen: false,
  currentPage: 'overview',

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleMobileSidebar: () => set(s => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
  toggleCommandPalette: () => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleNotificationPanel: () => set(s => ({ notificationPanelOpen: !s.notificationPanelOpen })),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
