import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface SortableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Value used for sorting — defaults to reading `row[key]` when omitted. */
  sortValue?: (row: T) => string | number;
  /** Cell content — defaults to `String(row[key])` when omitted. */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface SortableTableProps<T> {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

const ALIGN_CLASS: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

// Shared sortable data table — click a column header to sort A-Z, click again for Z-A, click a third
// time to go back to the natural (newest-first) order. Used across every record list in the app so
// sorting behaves identically everywhere instead of each view hand-rolling its own <table>.
export function SortableTable<T>({ columns, rows, rowKey, defaultSortKey, defaultSortDir, emptyMessage, onRowClick }: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir || 'asc');

  const handleHeaderClick = (col: SortableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); // third click: back to natural order
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const valueOf = col.sortValue || ((row: T) => (row as Record<string, unknown>)[col.key] as string | number);
    const copy = [...rows];
    const dirMul = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dirMul;
      return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base', numeric: true }) * dirMul;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 font-bold">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col)}
                className={`px-4 py-3 ${ALIGN_CLASS[col.align || 'left']} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''} ${col.className || ''}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    sortKey === col.key
                      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                      : <ChevronsUpDown className="w-3 h-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sortedRows.map((row) => (
            <tr key={rowKey(row)} className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${ALIGN_CLASS[col.align || 'left']} ${col.className || ''}`}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedRows.length === 0 && emptyMessage && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <p className="text-xs font-bold">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
