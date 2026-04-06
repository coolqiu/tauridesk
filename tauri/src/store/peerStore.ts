// tauri/src/store/peerStore.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

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

export const usePeerStore = create<PeerStore>((set, get) => ({
  recentPeers: [],
  favoriteIds: [],

  fetchPeers: async () => {
    try {
      const recentJson = await invoke<string>('get_recent_peers');
      const recent: Peer[] = JSON.parse(recentJson);
      
      const favorites = await invoke<string[]>('get_favorite_peers');
      
      set({ recentPeers: recent, favoriteIds: favorites });
    } catch (e) {
      console.error('Failed to fetch peers:', e);
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const { favoriteIds } = get();
      if (favoriteIds.includes(id)) {
        await invoke('remove_favorite_peer', { id });
      } else {
        await invoke('add_favorite_peer', { id });
      }
      await get().fetchPeers(); // refetch
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  },

  removePeer: async (id: string) => {
    try {
      await invoke('remove_peer', { id });
      await get().fetchPeers();
    } catch (e) {
      console.error('Failed to remove peer:', e);
    }
  }
}));
