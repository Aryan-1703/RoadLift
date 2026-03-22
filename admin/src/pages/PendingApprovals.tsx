import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, CheckSquare } from 'lucide-react';
import { getPendingApprovals, approveService, bulkApproveServices, getMediaUrl } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

const SERVICE_LABELS: Record<string, string> = {
  battery: 'Battery Boost',
  lockout: 'Car Lockout',
  fuel:    'Fuel Delivery',
  tire:    'Tire Change',
};

export default function PendingApprovals() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set()); // "driverId:key"

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    refetchInterval: 30_000,
    queryFn: () => getPendingApprovals().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ driverId, key, status }: { driverId: number; key: string; status: string }) =>
      approveService(driverId, key, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') => {
      const approvals = Array.from(selected).map(key => {
        const [driverId, serviceType] = key.split(':');
        return { driverId: parseInt(driverId), serviceType, status };
      });
      return bulkApproveServices(approvals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelected(new Set());
    },
  });

  const toggleSelect = (driverId: number, key: string) => {
    const id = `${driverId}:${key}`;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!data) return;
    const all = new Set<string>();
    data.forEach(d => {
      Object.entries(d.unlockedServices)
        .filter(([, v]) => v.status === 'pending')
        .forEach(([k]) => all.add(`${d.driverId}:${k}`));
    });
    setSelected(all);
  };

  if (isLoading) return <PageLoader />;

  const list = data ?? [];
  const totalPending = list.reduce((acc, d) =>
    acc + Object.values(d.unlockedServices).filter(v => v.status === 'pending').length, 0);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Bulk action bar */}
      {totalPending > 0 && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckSquare size={16} className="text-violet-400" />
            <span className="text-sm text-slate-300">
              {selected.size > 0 ? `${selected.size} selected` : `${totalPending} pending`}
            </span>
            {selected.size < totalPending && (
              <button onClick={selectAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Select all
              </button>
            )}
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-white transition-colors">
                Clear
              </button>
            )}
          </div>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="success" loading={bulkMutation.isPending}
                icon={<CheckCircle size={13} />} onClick={() => bulkMutation.mutate('approved')}>
                Approve {selected.size}
              </Button>
              <Button size="sm" variant="danger" loading={bulkMutation.isPending}
                icon={<XCircle size={13} />} onClick={() => bulkMutation.mutate('rejected')}>
                Reject {selected.size}
              </Button>
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-semibold">All caught up!</p>
            <p className="text-slate-400 text-sm mt-1">No pending equipment approvals.</p>
          </div>
        </Card>
      ) : (
        list.map(driver => {
          const pendingKeys = Object.entries(driver.unlockedServices)
            .filter(([, v]) => v.status === 'pending')
            .map(([k]) => k);

          return (
            <Card key={driver.driverId}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div>
                  <button onClick={() => navigate(`/drivers/${driver.driverId}`)}
                    className="font-semibold text-white hover:text-blue-400 transition-colors">
                    {driver.name}
                  </button>
                  <p className="text-xs text-slate-400 mt-0.5">{driver.email} · {driver.phone}</p>
                </div>
                <Badge variant="warning">{pendingKeys.length} pending</Badge>
              </div>

              <div className="divide-y divide-slate-800">
                {pendingKeys.map(key => {
                  const mediaUrls = driver.equipmentMedia?.[key] ?? [];
                  const selectId  = `${driver.driverId}:${key}`;
                  const isChecked = selected.has(selectId);

                  return (
                    <div key={key} className={`px-5 py-4 space-y-3 transition-colors ${isChecked ? 'bg-violet-500/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isChecked}
                          onChange={() => toggleSelect(driver.driverId, key)}
                          className="w-4 h-4 accent-violet-500 cursor-pointer flex-shrink-0" />
                        <span className="text-sm font-medium text-white">{SERVICE_LABELS[key] ?? key}</span>
                        <Badge variant={statusBadge(driver.unlockedServices[key].status)}>
                          {driver.unlockedServices[key].status}
                        </Badge>
                      </div>

                      {mediaUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2 ml-7">
                          {mediaUrls.map((url, i) => (
                            <a key={i} href={getMediaUrl(url)} target="_blank" rel="noopener noreferrer">
                              <img src={getMediaUrl(url)} alt={`${key} proof`}
                                className="w-28 h-28 object-cover rounded-xl border border-slate-700 hover:border-blue-500 transition-colors"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic ml-7">No media submitted.</p>
                      )}

                      <div className="flex gap-2 ml-7">
                        <Button size="sm" variant="success" icon={<CheckCircle size={13} />} loading={mutation.isPending}
                          onClick={() => mutation.mutate({ driverId: driver.driverId, key, status: 'approved' })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" icon={<XCircle size={13} />} loading={mutation.isPending}
                          onClick={() => mutation.mutate({ driverId: driver.driverId, key, status: 'rejected' })}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
