// hooks/useFilePanel.ts
import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { FilePanelState, FileSide } from '../types';

export function useFilePanel(side: FileSide, peerId?: string) {
  const [state, setState] = useState<FilePanelState>({
    path: '',
    history: [],
    selection: new Set(),
    loading: false,
    entries: [],
    error: null,
  });

  const loadDir = useCallback(async (path: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      if (side === 'local') {
        const result = await invoke<any>('fs_read_local_dir', { path });
        setState(s => ({
          ...s,
          path: result.path,
          entries: result.entries,
          loading: false,
          selection: new Set(),
        }));
      } else {
        if (!peerId) return;
        // Small delay for initial remote load to ensure session is ready
        if (path === '') {
           await new Promise(r => setTimeout(r, 800));
        }
        await invoke('fs_read_remote_dir', { id: peerId, path });
        // DO NOT predictively update path or loading here. The server's
        // fs-remote-dir event is the source of truth. On fast local-loopback
        // sessions that event can arrive before invoke() resolves.
      }
    } catch (e: any) {
      console.error(`Failed to load ${side} dir:`, e);
      setState(s => ({ ...s, loading: false, error: e.toString() }));
    }
  }, [side, peerId]);

  const navigateTo = (path: string) => {
    setState(s => ({
       ...s,
       history: [...s.history, s.path].filter(p => p !== path)
    }));
    loadDir(path);
  };

  const goBack = () => {
    setState(s => {
      if (s.history.length === 0) return s;
      const newHistory = [...s.history];
      const prevPath = newHistory.pop()!;
      loadDir(prevPath);
      return { ...s, history: newHistory };
    });
  };

  const toggleSelection = (name: string, multi: boolean) => {
    setState(s => {
      const newSelection = new Set(multi ? s.selection : []);
      if (newSelection.has(name)) {
        newSelection.delete(name);
      } else {
        newSelection.add(name);
      }
      return { ...s, selection: newSelection };
    });
  };

  // Initial load and event listener
  useEffect(() => {
    let disposed = false;
    let unlistenFn: (() => void) | undefined;

    if (side === 'local') {
      if (!state.path) {
        invoke<string>('fs_get_home_dir').then(home => {
          if (!disposed) loadDir(home);
        });
      }
    } else if (side === 'remote' && peerId) {
      const initRemotePanel = async () => {
        // Register the listener before the first ReadDir request. Keep it stable for
        // the whole window lifetime so close/reopen does not leave stale listeners.
        unlistenFn = await listen<any>('fs-remote-dir', (event) => {
          if (disposed) return;
          const payload = event.payload;
          if (payload.id && payload.id !== peerId) return;
          
          console.log(`📥 [Frontend] UI Update for ${peerId}:`, payload.path);
          setState(s => ({
            ...s,
            path: payload.path,
            entries: payload.entries,
            loading: false,
            selection: new Set(),
          }));
        });
        if (disposed) {
          unlistenFn();
          return;
        }

        if (!disposed) {
          loadDir('');
        }
      };
      initRemotePanel();
    }

    return () => {
      disposed = true;
      if (unlistenFn) unlistenFn();
    };
  }, [side, peerId]);

  return {
    state,
    loadDir,
    navigateTo,
    goBack,
    toggleSelection,
  };
}
