// types.ts

type RdFileEntry = {
  name: string;
  is_dir: boolean;
  size: number;
  modified: number;
};

type DirResult = {
  path: string;
  entries: RdFileEntry[];
};

type FileSide = 'local' | 'remote';

type FilePanelState = {
  path: string;
  history: string[];
  selection: Set<string>;
  loading: boolean;
  entries: RdFileEntry[];
  error: string | null;
};

type SelectedFile = {
  path: string;
  name: string;
  is_dir: boolean;
};

type TransferJob = {
  id: number;
  direction: 'upload' | 'download' | 'operation';
  name: string;
  state: 'running' | 'done' | 'error' | 'paused';
  file_num: number;
  speed: number;
  finished_size: number;
  error?: string;
  is_remote: boolean;
  operation?: 'mkdir' | 'delete-file' | 'delete-dir' | 'rename';
  target_path?: string;
  file_count?: number;
  empty_dirs_removed?: boolean;
};

export type { RdFileEntry, DirResult, FileSide, FilePanelState, SelectedFile, TransferJob };
