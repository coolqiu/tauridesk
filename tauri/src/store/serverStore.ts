// tauri/src/store/serverStore.ts
import { create } from 'zustand';
import * as tauriCore from '@tauri-apps/api/core';
const invoke = tauriCore?.invoke;

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
  password: string; // ALIAS FOR UI
  options: Record<string, string>;
  localOptions: Record<string, string>;
  fetchServerState: () => Promise<void>;
  fetchOptions: (keys: string[]) => Promise<void>; // RESTORED MISSING METHOD
  fetchLocalOptions: (keys: string[]) => Promise<void>;
  generateNewId: () => Promise<void>;
  refreshPassword: () => Promise<void>;
  setPermanentPassword: (password: string) => Promise<void>;
  setOption: (name: string, value: string) => Promise<void>;
  setLocalOption: (name: string, value: string) => Promise<void>;
}

// Safe invoke wrapper for browser testing
const safeInvoke = async <T>(command: string, args?: any): Promise<T> => {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && typeof invoke === 'function') {
      return await invoke<T>(command, args);
    }
    console.warn(`[Browser Mock] invoke('${command}') called with`, args);
    // Return empty mock values based on command
    if (command === 'get_server_state') return { id: '000 000 000', temporary_password: 'mock', is_service_running: true } as any;
    if (command === 'get_option') return '' as any;
    if (command === 'get_local_option') return '' as any;
    return {} as any;
  } catch (e) {
    console.error(`Invoke error [${command}]:`, e);
    throw e;
  }
};

export const useServerStore = create<ServerStore>((set, get) => ({
  id: '',
  temporary_password: '',
  password: '', // SYNCED FIELD
  permanent_password_set: false,
  verification_method: '',
  approve_mode: '',
  connect_status: 0,
  is_service_running: true,
  options: {},
  localOptions: {},

  fetchServerState: async () => {
    try {
      const state = await safeInvoke<ServerState>('get_server_state');
      // SURGICAL: We map temporary_password to password for UI consumption
      set({ ...state, password: state.temporary_password });
    } catch (e) {
      console.error('Failed to fetch server state:', e);
    }
  },

  fetchOptions: async (keys: string[]) => {
    try {
      const newOptions: Record<string, string> = { ...get().options };
      for (const key of keys) {
        try {
          const val = await safeInvoke<string>('get_option', { key: key });
          newOptions[key] = val;
        } catch (e) {
          console.error(`Failed to fetch option ${key}:`, e);
        }
      }
      set({ options: newOptions });
    } catch (e) {
      console.error('Failed to fetch options batch:', e);
    }
  },

  fetchLocalOptions: async (keys: string[]) => {
    try {
      const newOptions: Record<string, string> = { ...get().localOptions };
      for (const key of keys) {
        try {
          const val = await safeInvoke<string>('get_local_option', { key });
          newOptions[key] = val;
        } catch (e) {
          console.error(`Failed to fetch local option ${key}:`, e);
        }
      }
      set({ localOptions: newOptions });
    } catch (e) {
      console.error('Failed to fetch local options batch:', e);
    }
  },

  generateNewId: async () => {
    await get().fetchServerState();
  },

  refreshPassword: async () => {
    try {
      await safeInvoke('refresh_temporary_password');
      await get().fetchServerState();
    } catch (e) {
      console.error('Failed to refresh password:', e);
    }
  },

  setPermanentPassword: async (password: string) => {
    try {
      await safeInvoke('set_permanent_password', { password });
      await get().fetchServerState();
    } catch (e) {
      console.error('Failed to set permanent password:', e);
      throw e;
    }
  },

  setOption: async (name: string, value: string) => {
    try {
      await safeInvoke('set_option', { key: name, value });
      const newOptions = { ...get().options, [name]: value };
      set({ options: newOptions });
    } catch (e) {
      console.error(`Failed to set option ${name}:`, e);
    }
  },

  setLocalOption: async (name: string, value: string) => {
    try {
      await safeInvoke('set_local_option', { key: name, value });
      const newOptions = { ...get().localOptions, [name]: value };
      set({ localOptions: newOptions });
    } catch (e) {
      console.error(`Failed to set local option ${name}:`, e);
    }
  }
}));
