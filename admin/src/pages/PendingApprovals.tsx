import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { getPendingApprovals, approveService, getMediaUrl } from '../lib/api';
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

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
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

  if (isLoading) return <PageLoader />;

  const list = data ?? [];

  return (
    <div className="space-y-4 max-w-5xl">
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
              {/* Driver header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div>
                  <button
                    onClick={() => navigate(`/drivers/${driver.driverId}`)}
                    className="font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    {driver.name}
                  </button>
                  <p className="text-xs text-slate-400 mt-0.5">{driver.email} · {driver.phone}</p>
                </div>
                <Badge variant="warning">{pendingKeys.length} pending</Badge>
              </div>

              {/* Pending services */}
              <div className="divide-y divide-slate-800">
                {pendingKeys.map(key => {
                  const mediaUrls = driver.equipmentMedia?.[key] ?? [];
                  return (
                    <div key={key} className="px-5 py-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{SERVICE_LABELS[key] ?? key}</span>
                        <Badge variant={statusBadge(driver.unlockedServices[key].status)}>
                          {driver.unlockedServices[key].status}
                        </Badge>
                      </div>

                      {/* Media */}
                      {mediaUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {mediaUrls.map((url, i) => (
                            <a key={i} href={getMediaUrl(url)} target="_blank" rel="noopener noreferrer">
                              <img
                                src={getMediaUrl(url)}
                                alt={`${key} proof`}
                                className="w-28 h-28 object-cover rounded-xl border border-slate-700 hover:border-blue-500 transition-colors"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No media submitted.</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          icon={<CheckCircle size={13} />}
                          loading={mutation.isPending}
                          onClick={() => mutation.mutate({ driverId: driver.driverId, key, status: 'approved' })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<XCircle size={13} />}
                          loading={mutation.isPending}
                          onClick={() => mutation.mutate({ driverId: driver.driverId, key, status: 'rejected' })}
                        >
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
