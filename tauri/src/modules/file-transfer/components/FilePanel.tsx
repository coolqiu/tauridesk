// components/FilePanel.tsx
import { useEffect } from 'react';
import { useFilePanel } from '../hooks/useFilePanel';
import FileList from './FileList';
import FileBreadcrumbs from './FileBreadcrumbs';
import FileToolbar from './FileToolbar';
import type { FileSide, SelectedFile } from '../types';

interface FilePanelProps {
  side: FileSide;
  peerId?: string;
  onTransferRequest?: (side: FileSide, selectedPaths: string[]) => void;
  onDeleteRequest?: (side: FileSide, selected: SelectedFile[]) => void;
  onCreateDirRequest?: (side: FileSide, currentPath: string, name: string) => void;
  onRenameRequest?: (side: FileSide, selected: SelectedFile, newName: string) => void;
  onPathChange?: (side: FileSide, path: string) => void;
  reloadToken?: number;
}

export default function FilePanel({ side, peerId, onTransferRequest, onDeleteRequest, onCreateDirRequest, onRenameRequest, onPathChange, reloadToken = 0 }: FilePanelProps) {
  const { state, loadDir, navigateTo, toggleSelection } = useFilePanel(side, peerId);

  useEffect(() => {
    if (onPathChange) {
      onPathChange(side, state.path);
    }
  }, [side, state.path, onPathChange]);

  useEffect(() => {
    if (reloadToken > 0 && state.path) {
      loadDir(state.path);
    }
  }, [reloadToken, state.path, loadDir]);

  const getAbsolutePaths = () => {
    const isWin = state.path.includes('\\') || /^[a-zA-Z]:/.test(state.path);
    const sep = isWin ? '\\' : '/';
    return Array.from(state.selection).map(name => {
      if (state.path === '/') {
        return isWin && name.endsWith(':') ? `${name}\\` : `/${name}`;
      }
      return state.path.endsWith(sep) ? `${state.path}${name}` : `${state.path}${sep}${name}`;
    });
  };

  const getSelectedFiles = (): SelectedFile[] => {
    const byName = new Map(state.entries.map(entry => [entry.name, entry]));
    return getAbsolutePaths().map(path => {
      const name = path.split(/[\\/]/).filter(Boolean).pop() || path;
      const entry = byName.get(name);
      return {
        path,
        name,
        is_dir: entry?.is_dir ?? false,
      };
    });
  };

  const handleCreateDir = () => {
    const name = window.prompt('新建文件夹名称');
    if (!name?.trim()) return;
    onCreateDirRequest?.(side, state.path, name.trim());
  };

  const handleRename = () => {
    const selected = getSelectedFiles();
    if (selected.length !== 1) return;
    const newName = window.prompt('新的名称', selected[0].name);
    if (!newName?.trim() || newName.trim() === selected[0].name) return;
    onRenameRequest?.(side, selected[0], newName.trim());
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      border: '1px solid #E5E7EB', borderRadius: '8px',
      background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden', minHeight: 0,
    }}>
      {/* Panel header */}
      <div style={{
        padding: '8px 12px', background: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {side === 'local' ? '本地文件' : '远程文件'}
        </h3>
        {state.loading && (
          <span style={{ fontSize: '11px', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '4px' }}>
             加载中…
          </span>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{ flexShrink: 0 }}>
        <FileBreadcrumbs path={state.path} onNavigate={navigateTo} />
      </div>

      {/* Toolbar */}
      <div style={{ flexShrink: 0 }}>
        <FileToolbar
          isRemote={side === 'remote'}
          onRefresh={() => loadDir(state.path)}
          onUpload={() => onTransferRequest?.('local', getAbsolutePaths())}
          onDownload={() => onTransferRequest?.('remote', getAbsolutePaths())}
          onDelete={() => onDeleteRequest?.(side, getSelectedFiles())}
          onCreateDir={handleCreateDir}
          onRename={handleRename}
          canTransfer={state.selection.size > 0}
          canRename={state.selection.size === 1}
        />
      </div>

      {/* File list */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <FileList
          entries={state.entries}
          selection={state.selection}
          onToggle={toggleSelection}
          onNavigate={navigateTo}
          currentPath={state.path}
        />

        {state.error && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            zIndex: 100,
          }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #FCA5A5', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '8px' }}>{state.error}</p>
              <button
                onClick={() => loadDir(state.path)}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '5px 12px', background: '#F9FAFB',
        borderTop: '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'space-between',
        fontSize: '11px', color: '#9CA3AF', flexShrink: 0,
      }}>
        <span>{state.entries.length} 个项目</span>
        <span>{state.selection.size > 0 ? `${state.selection.size} 已选择` : ''}</span>
      </div>
    </div>
  );
}
