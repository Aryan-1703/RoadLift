import { PageLoader } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  keyField?: keyof T;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  loading,
  emptyMessage = 'No records found.',
  keyField = 'id' as keyof T,
}: TableProps<T>) {
  if (loading) return <PageLoader />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.width ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-800/60 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-800/40' : ''
                }`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5 text-slate-300">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
