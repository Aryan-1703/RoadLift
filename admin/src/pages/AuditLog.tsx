import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Filter } from 'lucide-react';
import { getAuditLogs } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'default' | 'purple' }> = {
  'user.suspend':          { label: 'Suspend',          variant: 'danger'  },
  'user.unsuspend':        { label: 'Unsuspend',        variant: 'success' },
  'user.activate':         { label: 'Activate',         variant: 'success' },
  'user.deactivate':       { label: 'Deactivate',       variant: 'warning' },
  'user.update':           { label: 'Edit Profile',     variant: 'info'    },
  'service.approved':      { label: 'Approve Service',  variant: 'success' },
  'service.rejected':      { label: 'Reject Service',   variant: 'danger'  },
  'service.unapproved':    { label: 'Reset Service',    variant: 'warning' },
  'service.bulk_approve':  { label: 'Bulk Approve',     variant: 'purple'  },
  'job.cancel':            { label: 'Cancel Job',       variant: 'danger'  },
  'job.status_override':   { label: 'Override Status',  variant: 'warning' },
  'job.refund':            { label: 'Refund',           variant: 'purple'  },
  'job.reassign':          { label: 'Reassign Job',     variant: 'info'    },
  'admin.create':          { label: 'Create Admin',     variant: 'success' },
  'admin.delete':          { label: 'Delete Admin',     variant: 'danger'  },
  'setting.update':        { label: 'Update Settings',  variant: 'info'    },
  'notification.broadcast':{ label: 'Broadcast',        variant: 'default' },
};

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return '—';
  const parts: string[] = [];
  if (details.name)        parts.push(String(details.name));
  if (details.role)        parts.push(String(details.role));
  if (details.reason)      parts.push(`Reason: ${details.reason}`);
  if (details.from && details.to) parts.push(`${details.from} → ${details.to}`);
  if (details.serviceType) parts.push(String(details.serviceType));
  if (details.amount)      parts.push(`$${details.amount}`);
  if (details.sent)        parts.push(`${details.sent} sent`);
  if (details.audience)    parts.push(String(details.audience));
  if (details.keys && Array.isArray(details.keys)) parts.push(details.keys.join(', '));
  if (details.count)       parts.push(`${details.count} services`);
  return parts.join(' · ') || JSON.stringify(details).slice(0, 80);
}

export default function AuditLog() {
  const [page, setPage]         = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');

  const params: Record<string, string | number> = { page, limit: 25 };
  if (actionFilter) params.action  = actionFilter;
  if (from)         params.from    = from;
  if (to)           params.to      = to;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, from, to],
    queryFn:  () => getAuditLogs(params).then(r => r.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-violet-400" />
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Action</label>
            <input
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              placeholder="e.g. suspend, refund…"
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500" />
          </div>
          {(actionFilter || from || to) && (
            <button onClick={() => { setActionFilter(''); setFrom(''); setTo(''); setPage(1); }}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              Clear
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.logs?.length ? (
          <p className="text-center text-slate-500 py-16">No audit log entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Admin</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Target</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => {
                  const meta = ACTION_LABELS[log.action];
                  return (
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{log.adminName}</td>
                      <td className="px-4 py-3">
                        {meta
                          ? <Badge variant={meta.variant}>{meta.label}</Badge>
                          : <Badge variant="default">{log.action}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.targetType && log.targetId
                          ? <span>{log.targetType} <span className="text-slate-500">#{log.targetId}</span></span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.pages > 1 && (
        <Pagination page={page} pages={data.pages} onPageChange={setPage} />
      )}
    </div>
  );
}
