// components/FileToolbar.tsx
import { RefreshCw, Download, Upload, Trash2, FolderPlus, Pencil } from 'lucide-react';

interface FileToolbarProps {
  onRefresh: () => void;
  onUpload?: () => void;
  onDownload?: () => void;
  onDelete: () => void;
  onCreateDir: () => void;
  onRename: () => void;
  canTransfer: boolean;
  canRename: boolean;
  isRemote: boolean;
}

export default function FileToolbar({ onRefresh, onUpload, onDownload, onDelete, onCreateDir, onRename, canTransfer, canRename, isRemote }: FileToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--rd-bg-content)] border-b border-[#333]">
      <button className="icon-btn-sm" onClick={onRefresh} title="刷新">
        <RefreshCw size={16} />
      </button>
      <div className="h-4 w-[1px] bg-[#333] mx-1" />
      {isRemote ? (
        <button className="icon-btn-sm" disabled={!canTransfer} onClick={onDownload} title="下载到本地">
          <Download size={16} />
        </button>
      ) : (
        <button className="icon-btn-sm" disabled={!canTransfer} onClick={onUpload} title="上传到远程">
          <Upload size={16} />
        </button>
      )}
      <div className="h-4 w-[1px] bg-[#333] mx-1" />
      <button className="icon-btn-sm" onClick={onCreateDir} title="新建文件夹">
        <FolderPlus size={16} />
      </button>
      <button className="icon-btn-sm" disabled={!canRename} onClick={onRename} title="重命名">
        <Pencil size={16} />
      </button>
      <button className="icon-btn-sm text-red-400 hover:bg-red-400/10" onClick={onDelete} title="删除">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
