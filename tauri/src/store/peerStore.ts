// tauri/src/store/peerStore.ts
import { create } from 'zustand';
import * as tauriCore from '@tauri-apps/api/core';
const invoke = tauriCore?.invoke;

export interface Peer {
  id: string;
  username: string;
  hostname: string;
  platform: string;
  alias: string;
}

interface PeerStore {
  recentPeers: Peer[];
  favoriteIds: string[];
  fetchPeers: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  removePeer: (id: string) => Promise<void>;
}

// Safe invoke wrapper for browser testing
const safeInvoke = async <T>(command: string, args?: any): Promise<T> => {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && typeof invoke === 'function') {
      return await invoke<T>(command, args);
    }
    console.warn(`[Browser Mock] peerStore: invoke('${command}') called with`, args);
    if (command === 'get_recent_peers') return '[]' as any;
    if (command === 'get_favorite_peers') return [] as any;
    return {} as any;
  } catch (e) {
    console.error(`Invoke error [${command}]:`, e);
    throw e;
  }
};

export const usePeerStore = create<PeerStore>((set, get) => ({
  recentPeers: [],
  favoriteIds: [],

  fetchPeers: async () => {
    try {
      const recentJson = await safeInvoke<string>('get_recent_peers');
      const recent: Peer[] = JSON.parse(recentJson);
      
      const favorites = await safeInvoke<string[]>('get_favorite_peers');
      
      set({ recentPeers: recent, favoriteIds: favorites });
    } catch (e) {
      console.error('Failed to fetch peers:', e);
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const { favoriteIds } = get();
      if (favoriteIds.includes(id)) {
        await safeInvoke('remove_favorite_peer', { id });
      } else {
        await safeInvoke('add_favorite_peer', { id });
      }
      await get().fetchPeers(); // refetch
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  },

  removePeer: async (id: string) => {
    try {
      await safeInvoke('remove_peer', { id });
      await get().fetchPeers();
    } catch (e) {
      console.error('Failed to remove peer:', e);
    }
  }
}));
