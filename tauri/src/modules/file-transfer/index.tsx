// index.tsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import FilePanel from './components/FilePanel';
import type { FileSide, SelectedFile, TransferJob } from './types';

interface FileTransferModuleProps {
  peerId: string;
}

export default function FileTransferModule({ peerId }: FileTransferModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const dragging = useRef(false);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const [localPath, setLocalPath] = useState('');
  const [remotePath, setRemotePath] = useState('');
  const [jobs, setJobs] = useState<TransferJob[]>([]);
  const [localReloadToken, setLocalReloadToken] = useState(0);
  const [remoteReloadToken, setRemoteReloadToken] = useState(0);

  const addOrUpdateJob = useCallback((job: TransferJob) => {
    setJobs(prev => {
      const index = prev.findIndex(item => item.id === job.id);
      if (index === -1) return [job, ...prev].slice(0, 20);
      const next = [...prev];
      next[index] = { ...next[index], ...job };
      return next;
    });
  }, []);

  const refreshSide = useCallback((side: FileSide) => {
    if (side === 'local') setLocalReloadToken(v => v + 1);
    else setRemoteReloadToken(v => v + 1);
  }, []);

  const refreshAfterJob = useCallback((job?: TransferJob) => {
    if (!job) return;
    if (job.direction === 'upload') refreshSide('remote');
    else if (job.direction === 'download') refreshSide('local');
    else refreshSide(job.is_remote ? 'remote' : 'local');
  }, [refreshSide]);

  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [
      listen<any>('fs-job-progress', event => {
        const payload = event.payload;
        if (payload.peer_id !== peerId) return;
        setJobs(prev => prev.map(job => job.id === payload.id ? {
          ...job,
          state: 'running',
          file_num: payload.file_num,
          speed: payload.speed,
          finished_size: payload.finished_size,
        } : job));
      }),
      listen<any>('fs-job-done', event => {
        const payload = event.payload;
        if (payload.peer_id !== peerId) return;
        let completedJob: TransferJob | undefined;
        setJobs(prev => prev.map(job => job.id === payload.id ? {
          ...(completedJob = job),
          state: 'done' as const,
          file_num: payload.file_num,
        } : job));
        if (
          completedJob?.operation === 'delete-dir' &&
          completedJob.target_path &&
          completedJob.file_count !== undefined &&
          payload.file_num >= completedJob.file_count - 1 &&
          !completedJob.empty_dirs_removed
        ) {
          invoke('fs_remove_all_empty_dirs', {
            id: peerId,
            actId: completedJob.id,
            path: completedJob.target_path,
            isRemote: completedJob.is_remote,
          }).catch(err => {
            setJobs(prev => prev.map(job => job.id === payload.id ? {
              ...job,
              state: 'error',
              error: String(err),
            } : job));
          });
          setJobs(prev => prev.map(job => job.id === payload.id ? {
            ...job,
            empty_dirs_removed: true,
          } : job));
        }
        setTimeout(() => refreshAfterJob(completedJob), 300);
      }),
      listen<any>('fs-job-error', event => {
        const payload = event.payload;
        if (payload.peer_id !== peerId) return;
        setJobs(prev => prev.map(job => job.id === payload.id ? {
          ...job,
          state: 'error',
          file_num: payload.file_num,
          error: payload.err,
        } : job));
      }),
      listen<any>('fs-override-file-confirm', async event => {
        const payload = event.payload;
        if (payload.peer_id !== peerId) return;
        const overwrite = window.confirm(`目标文件已存在：${payload.to}\n是否覆盖？`);
        await invoke('fs_confirm_override_file', {
          id: peerId,
          actId: payload.id,
          fileNum: payload.file_num,
          needOverride: overwrite,
          remember: false,
          isUpload: payload.is_upload,
        });
      }),
      listen<any>('fs-folder-files', async event => {
        const payload = event.payload;
        if (payload.id !== peerId) return;
        const job = jobsRef.current.find(item => item.id === payload.act_id);
        if (!job || job.operation !== 'delete-dir') return;

        const entries = payload.entries || [];
        const count = entries.length;
        const confirmed = window.confirm(
          count > 0
            ? `目录不是空的：${job.target_path}\n将删除其中 ${count} 个文件，然后删除空目录。此操作不可恢复，是否继续？`
            : `确定删除空目录：${job.target_path}？`
        );
        if (!confirmed) {
          setJobs(prev => prev.map(item => item.id === payload.act_id ? {
            ...item,
            state: 'error',
            error: 'cancel',
          } : item));
          return;
        }

        setJobs(prev => prev.map(item => item.id === payload.act_id ? {
          ...item,
          file_count: count,
        } : item));

        if (count === 0) {
          await invoke('fs_remove_all_empty_dirs', {
            id: peerId,
            actId: payload.act_id,
            path: job.target_path,
            isRemote: job.is_remote,
          });
          setJobs(prev => prev.map(item => item.id === payload.act_id ? {
            ...item,
            state: 'done',
            empty_dirs_removed: true,
          } : item));
          refreshSide(job.is_remote ? 'remote' : 'local');
          return;
        }

        await invoke('fs_set_no_confirm', { id: peerId, actId: payload.act_id });
        const first = entries[0];
        const firstPath = joinPath(job.target_path || payload.path, first.name);
        await invoke('fs_remove_file', {
          id: peerId,
          path: firstPath,
          fileNum: 0,
          isRemote: job.is_remote,
          actId: payload.act_id,
        });
      }),
    ];

    return () => {
      unlisteners.forEach(p => p.then(fn => fn()));
    };
  }, [peerId, refreshAfterJob]);

  const jobsRef = useRef<TransferJob[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    
    // Disable native context menu
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  const handlePathChange = (side: FileSide, path: string) => {
    if (side === 'local') setLocalPath(path);
    else setRemotePath(path);
  };

  const getPathName = (path: string) => {
    const normalized = path.replace(/[\\/]+$/, '');
    return normalized.split(/[\\/]/).filter(Boolean).pop() || normalized;
  };

  const handleTransferRequest = async (side: FileSide, files: string[]) => {
    console.log(`📡 Requesting ${side === 'local' ? 'UPLOAD' : 'DOWNLOAD'} of:`, files);
    const toDir = side === 'local' ? remotePath : localPath;
    const is_remote = side === 'remote'; // true for download, false for upload
    if (!toDir || toDir === '') {
      console.warn("Destination path is empty!");
      return;
    }
    for (const file of files) {
      const name = getPathName(file);
      const to = joinPath(toDir, name);
      // generate a random positive job id
      const act_id = Math.floor(Math.random() * 1000000) + 1;
      addOrUpdateJob({
        id: act_id,
        direction: side === 'local' ? 'upload' : 'download',
        name,
        state: 'running',
        file_num: 0,
        speed: 0,
        finished_size: 0,
        is_remote,
        target_path: to,
      });
      try {
        await invoke('fs_transfer_files', { id: peerId, files: [file], to, isRemote: is_remote, actId: act_id });
        console.log(`✅ Transfer started (act_id: ${act_id})!`);
      } catch (e) {
        console.error("❌ Transfer failed:", e);
        addOrUpdateJob({
          id: act_id,
          direction: side === 'local' ? 'upload' : 'download',
          name,
          state: 'error',
          file_num: 0,
          speed: 0,
          finished_size: 0,
          error: String(e),
          is_remote,
          target_path: to,
        });
      }
    }
  };

  const joinPath = (base: string, name: string) => {
    const isWin = base.includes('\\') || /^[a-zA-Z]:/.test(base);
    const sep = isWin ? '\\' : '/';
    if (!base || base === '/') return isWin ? name : `/${name}`;
    return base.endsWith(sep) ? `${base}${name}` : `${base}${sep}${name}`;
  };

  const handleCreateDirRequest = async (side: FileSide, currentPath: string, name: string) => {
    const act_id = Math.floor(Math.random() * 1000000) + 1;
    const isRemote = side === 'remote';
    const path = joinPath(currentPath, name);
    addOrUpdateJob({
      id: act_id,
      direction: 'operation',
      name: `mkdir ${path}`,
      state: 'running',
      file_num: 0,
      speed: 0,
      finished_size: 0,
      is_remote: isRemote,
      operation: 'mkdir',
      target_path: path,
    });
    try {
      await invoke('fs_create_dir', { id: peerId, path, isRemote, actId: act_id });
      if (!isRemote) {
        addOrUpdateJob({ id: act_id, direction: 'operation', name: `mkdir ${path}`, state: 'done', file_num: 0, speed: 0, finished_size: 0, is_remote: false });
        refreshSide('local');
      }
    } catch (e) {
      addOrUpdateJob({ id: act_id, direction: 'operation', name: `mkdir ${path}`, state: 'error', file_num: 0, speed: 0, finished_size: 0, error: String(e), is_remote: isRemote });
    }
  };

  const handleDeleteRequest = async (side: FileSide, selected: SelectedFile[]) => {
    if (selected.length === 0) return;
    if (!window.confirm(`确定删除选中的 ${selected.length} 个项目吗？`)) return;
    const isRemote = side === 'remote';
    for (const [index, file] of selected.entries()) {
      const act_id = Math.floor(Math.random() * 1000000) + 1;
      addOrUpdateJob({
        id: act_id,
        direction: 'operation',
        name: `delete ${file.path}`,
        state: 'running',
        file_num: index,
        speed: 0,
        finished_size: 0,
        is_remote: isRemote,
        operation: file.is_dir ? 'delete-dir' : 'delete-file',
        target_path: file.path,
      });
      try {
        if (file.is_dir) {
          await invoke('fs_read_dir_to_remove_recursive', {
            id: peerId,
            path: file.path,
            isRemote,
            includeHidden: true,
            actId: act_id,
          });
        } else {
          await invoke('fs_remove_file', { id: peerId, path: file.path, fileNum: index, isRemote, actId: act_id });
          if (!isRemote) {
            addOrUpdateJob({ id: act_id, direction: 'operation', name: `delete ${file.path}`, state: 'done', file_num: index, speed: 0, finished_size: 0, is_remote: false, operation: 'delete-file', target_path: file.path });
            refreshSide('local');
          }
        }
      } catch (e) {
        addOrUpdateJob({ id: act_id, direction: 'operation', name: `delete ${file.path}`, state: 'error', file_num: index, speed: 0, finished_size: 0, error: String(e), is_remote: isRemote });
      }
    }
  };

  const handleRenameRequest = async (side: FileSide, selected: SelectedFile, newName: string) => {
    const isRemote = side === 'remote';
    const act_id = Math.floor(Math.random() * 1000000) + 1;
    addOrUpdateJob({
      id: act_id,
      direction: 'operation',
      name: `rename ${selected.path}`,
      state: 'running',
      file_num: 0,
      speed: 0,
      finished_size: 0,
      is_remote: isRemote,
      operation: 'rename',
      target_path: selected.path,
    });
    try {
      await invoke('fs_rename_file', { id: peerId, path: selected.path, newName, isRemote, actId: act_id });
      if (!isRemote) {
        addOrUpdateJob({ id: act_id, direction: 'operation', name: `rename ${selected.path}`, state: 'done', file_num: 0, speed: 0, finished_size: 0, is_remote: false });
        refreshSide('local');
      }
    } catch (e) {
      addOrUpdateJob({ id: act_id, direction: 'operation', name: `rename ${selected.path}`, state: 'error', file_num: 0, speed: 0, finished_size: 0, error: String(e), is_remote: isRemote });
    }
  };

  const cancelJob = async (job: TransferJob) => {
    try {
      await invoke('fs_cancel_job', { id: peerId, actId: job.id });
    } finally {
      setJobs(prev => prev.filter(item => item.id !== job.id));
    }
  };

  const resumeJob = async (job: TransferJob) => {
    await invoke('fs_resume_job', { id: peerId, actId: job.id, isRemote: job.is_remote });
    setJobs(prev => prev.map(item => item.id === job.id ? { ...item, state: 'running' } : item));
  };

  const clearJob = (job: TransferJob) => {
    setJobs(prev => prev.filter(item => item.id !== job.id));
  };

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flex: 1, padding: '8px', gap: 0, minHeight: 0, height: '100%', boxSizing: 'border-box', position: 'relative' }}
    >
      {/* Local panel */}
      <div style={{ width: `${splitPct}%`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <FilePanel
          side="local"
          onTransferRequest={handleTransferRequest}
          onDeleteRequest={handleDeleteRequest}
          onCreateDirRequest={handleCreateDirRequest}
          onRenameRequest={handleRenameRequest}
          onPathChange={handlePathChange}
          reloadToken={localReloadToken}
        />
      </div>

      {/* Draggable splitter */}
      <div
        onMouseDown={handleSplitterMouseDown}
        style={{
          width: '5px',
          flexShrink: 0,
          cursor: 'col-resize',
          background: '#E5E7EB',
          transition: 'background 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#3B82F6'; }}
        onMouseLeave={e => { if (!dragging.current) (e.currentTarget as HTMLElement).style.background = '#E5E7EB'; }}
      >
        {/* Drag grip dots */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '3px', pointerEvents: 'none',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#9CA3AF' }} />
          ))}
        </div>
      </div>

      {/* Remote panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <FilePanel
          side="remote"
          peerId={peerId}
          onTransferRequest={handleTransferRequest}
          onDeleteRequest={handleDeleteRequest}
          onCreateDirRequest={handleCreateDirRequest}
          onRenameRequest={handleRenameRequest}
          onPathChange={handlePathChange}
          reloadToken={remoteReloadToken}
        />
      </div>

      <div style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 10,
        maxHeight: 120,
        overflow: 'auto',
        background: 'rgba(17, 24, 39, 0.94)',
        color: '#E5E7EB',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
        display: jobs.length ? 'block' : 'none',
      }}>
        {jobs.map(job => (
          <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '88px 1fr 120px 112px', gap: 8, alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
            <span style={{ color: job.state === 'error' ? '#FCA5A5' : job.state === 'done' ? '#86EFAC' : '#93C5FD' }}>{job.state}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.error || job.name}>{job.error || job.name}</span>
            <span>{job.finished_size ? `${Math.round(job.finished_size / 1024)} KB` : ''}</span>
            <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {job.state === 'paused' && <button className="icon-btn-sm" onClick={() => resumeJob(job)}>恢复</button>}
              {(job.state === 'running' || job.state === 'paused') && <button className="icon-btn-sm" onClick={() => cancelJob(job)}>取消</button>}
              {(job.state === 'done' || job.state === 'error') && <button className="icon-btn-sm" onClick={() => clearJob(job)}>清除</button>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
