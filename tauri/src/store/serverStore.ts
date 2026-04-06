// tauri/src/store/serverStore.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface ServerState {
  id: string;
  temporary_password: string;
  permanent_password_set: boolean;
  verification_method: string;
  approve_mode: string;
  connect_status: number;
  is_service_running: boolean;
}

interface ServerStore extends ServerState {
  fetchServerState: () => Promise<void>;
  generateNewId: () => Promise<void>;
  refreshPassword: () => Promise<void>;
}

export const useServerStore = create<ServerStore>((set) => ({
  id: '...',
  temporary_password: '...',
  permanent_password_set: false,
  verification_method: '',
  approve_mode: '',
  connect_status: 0,
  is_service_running: true,

  fetchServerState: async () => {
    try {
      const state = await invoke<ServerState>('get_server_state');
      set({ ...state });
    } catch (e) {
      console.error('Failed to fetch server state:', e);
    }
  },

  generateNewId: async () => {
    // Need backend support for this, for now we just refetch
    await useServerStore.getState().fetchServerState();
  },

  refreshPassword: async () => {
    try {
      await invoke('refresh_temporary_password');
      await useServerStore.getState().fetchServerState();
    } catch (e) {
      console.error('Failed to refresh password:', e);
    }
  }
}));
