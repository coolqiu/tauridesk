// components/FileBreadcrumbs.tsx
import { ChevronRight, Home } from 'lucide-react';

interface FileBreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function FileBreadcrumbs({ path, onNavigate }: FileBreadcrumbsProps) {
  const isWin = path.includes('\\') || /^[a-zA-Z]:/.test(path);
  const sep = isWin ? '\\' : '/';
  const parts = path === '/' ? [] : path.split(sep).filter(p => p !== '');

  return (
    <div className="flex items-center gap-1 p-2 bg-[var(--rd-bg-scaffold)] border-b border-[#333] text-sm overflow-x-auto no-scrollbar">
      <button 
        className="p-1 hover:bg-white/10 rounded transition-colors text-secondary"
        onClick={() => onNavigate('/')}
      >
        <Home size={14} />
      </button>
      {parts.map((part, idx) => (
        <div key={idx} className="flex items-center gap-1 shrink-0">
          <ChevronRight size={14} className="text-muted" />
          <button
            className="px-1.5 py-0.5 hover:bg-white/10 rounded transition-colors max-w-[120px] truncate"
            onClick={() => {
              const newPath = parts.slice(0, idx + 1).join(sep);
              onNavigate(isWin ? (newPath.endsWith(':') ? `${newPath}\\` : newPath) : `/${newPath}`);
            }}
          >
            {part}
          </button>
        </div>
      ))}
    </div>
  );
}
