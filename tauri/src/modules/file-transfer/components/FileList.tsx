// components/FileList.tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { useState, useMemo, useCallback } from 'react';
import { Folder, File, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { RdFileEntry } from '../types';

interface FileListProps {
  entries: RdFileEntry[];
  selection: Set<string>;
  onToggle: (name: string, multi: boolean) => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

const helper = createColumnHelper<RdFileEntry>();

function formatSize(bytes: number, isDir: boolean): string {
  if (isDir) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function FileList({ entries, selection, onToggle, onNavigate, currentPath }: FileListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({
    name: 300, size: 100, modified: 180,
  });
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const startResize = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = currentWidth;
    setResizingCol(columnId);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setColumnSizing(prev => ({
        ...prev,
        [columnId]: Math.max(80, startW + delta),
      }));
    };
    const onUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const columns = useMemo(() => [
    helper.accessor('name', {
      header: '名称',
      size: columnSizing['name'] ?? 300,
      cell: info => {
        const row = info.row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {row.is_dir
              ? <Folder size={16} style={{ color: '#FBBF24', fill: '#FBBF24', flexShrink: 0 }} />
              : <File   size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            }
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info.getValue()}
            </span>
          </div>
        );
      },
    }),
    helper.accessor('size', {
      header: '大小',
      size: columnSizing['size'] ?? 100,
      cell: info => (
        <span style={{ color: '#6B7280', display: 'block', textAlign: 'right' }}>
          {formatSize(info.getValue(), info.row.original.is_dir)}
        </span>
      ),
    }),
    helper.accessor('modified', {
      header: '修改日期',
      size: columnSizing['modified'] ?? 180,
      cell: info => (
        <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
          {formatDate(info.getValue())}
        </span>
      ),
    }),
  ], [columnSizing]);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalWidth = Object.values(columnSizing).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      height: '100%', overflow: 'auto', background: '#fff', userSelect: 'none',
      cursor: resizingCol ? 'col-resize' : 'default',
    }}>
      <table style={{ 
        width: Math.max(totalWidth, 0), minWidth: '100%', 
        borderCollapse: 'separate', borderSpacing: 0, 
        fontSize: '13px', tableLayout: 'fixed' 
      }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const colId = header.column.id;
                const colW = columnSizing[colId] ?? 120;
                return (
                  <th
                    key={header.id}
                    style={{
                      width: colW,
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      background: '#F3F4F6',
                      borderBottom: '2px solid #D1D5DB', // 加深底部边框
                      borderRight: '1px solid #D1D5DB', // 明确的分界线
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    <div
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ChevronUp size={14} />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown size={14} />}
                      {!header.column.getIsSorted() && <ChevronsUpDown size={14} style={{ opacity: 0.2 }} />}
                    </div>

                    {/* Resize handler 区域加宽以便点击 */}
                    <div
                      onMouseDown={e => startResize(e, colId, colW)}
                      style={{
                        position: 'absolute', right: -4, top: 0, width: 8, height: '100%',
                        cursor: 'col-resize', zIndex: 20,
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row, idx) => {
            const isSelected = selection.has(row.original.name);
            return (
              <tr
                key={row.id}
                onClick={e => onToggle(row.original.name, e.ctrlKey || e.metaKey)}
                onDoubleClick={() => {
                  if (row.original.is_dir) {
                    let newPath;
                    if (currentPath === '/') {
                      // We are at the root pseudo-directory
                      // On Windows, row.original.name is "C:" or "D:"
                      newPath = row.original.name.endsWith(':') ? `${row.original.name}\\` : `/${row.original.name}`;
                    } else {
                      const isWin = currentPath.includes('\\') || /^[a-zA-Z]:/.test(currentPath);
                      const sep = isWin ? '\\' : '/';
                      newPath = currentPath === '' ? row.original.name :
                        currentPath.endsWith(sep) ? `${currentPath}${row.original.name}` : `${currentPath}${sep}${row.original.name}`;
                    }
                    onNavigate(newPath);
                  }
                }}
                style={{
                  background: isSelected ? '#BAE6FD' : (idx % 2 === 0 ? '#fff' : '#F9FAFB'),
                  transition: 'background 0.05s',
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ 
                    padding: '8px 12px', 
                    borderBottom: '1px solid #F3F4F6',
                    borderRight: '1px solid #E5E7EB', // 单元格间的分界线
                    color: '#1F2937',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
           此文件夹为空
        </div>
      )}
    </div>
  );
}
