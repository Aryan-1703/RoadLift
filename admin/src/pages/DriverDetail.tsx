import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, Briefcase, CheckCircle, XCircle, Clock, Lock } from 'lucide-react';
import { getDriver, approveService, updateDriverStatus, getMediaUrl } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';
import type { ServiceState } from '../types';

const SERVICE_LABELS: Record<string, string> = {
  battery: 'Battery Boost',
  lockout: 'Car Lockout',
  fuel:    'Fuel Delivery',
  tire:    'Tire Change',
};

function ServiceCard({
  serviceKey, state, driverId, media, onAction,
}: {
  serviceKey: string;
  state: ServiceState;
  driverId: number;
  media: string[];
  onAction: (key: string, status: string) => void;
}) {
  const variant = statusBadge(state.status);
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white text-sm">{SERVICE_LABELS[serviceKey] ?? serviceKey}</span>
        <Badge variant={variant} className="capitalize">{state.status}</Badge>
      </div>

      {/* Equipment media */}
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((url, i) => (
            <a key={i} href={getMediaUrl(url)} target="_blank" rel="noopener noreferrer">
              <img
                src={getMediaUrl(url)}
                alt={`${serviceKey} proof ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-slate-600 hover:border-blue-500 transition-colors"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="success"
          disabled={state.status === 'approved'}
          icon={<CheckCircle size={13} />}
          onClick={() => onAction(serviceKey, 'approved')}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={state.status === 'rejected'}
          icon={<XCircle size={13} />}
          onClick={() => onAction(serviceKey, 'rejected')}
        >
          Reject
        </Button>
        {state.status !== 'unapproved' && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Lock size={13} />}
            onClick={() => onAction(serviceKey, 'unapproved')}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DriverDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => getDriver(id!).then(r => r.data),
  });

  const serviceMutation = useMutation({
    mutationFn: ({ key, status }: { key: string; status: string }) =>
      approveService(driver!.id, key, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver', id] }),
  });

  const statusMutation = useMutation({
    mutationFn: (action: string) => updateDriverStatus(driver!.id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver', id] }),
  });

  if (isLoading) return <PageLoader />;
  if (!driver) return <div className="text-red-400 p-6">Driver not found.</div>;

  const services = driver.profile?.unlockedServices ?? {};
  const media    = driver.profile?.equipmentMedia    ?? {};

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/drivers')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Drivers
        </button>
        <div className="flex gap-2">
          {driver.isSuspended ? (
            <Button variant="success" size="sm" loading={statusMutation.isPending} onClick={() => statusMutation.mutate('unsuspend')}>
              Unsuspend
            </Button>
          ) : (
            <Button variant="danger" size="sm" loading={statusMutation.isPending} onClick={() => statusMutation.mutate('suspend')}>
              Suspend Driver
            </Button>
          )}
        </div>
      </div>

      {/* Profile */}
      <Card>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {driver.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white">{driver.name}</h2>
                {driver.isSuspended
                  ? <Badge variant="danger">Suspended</Badge>
                  : driver.isActive
                    ? <Badge variant="success">Online</Badge>
                    : <Badge variant="default">Offline</Badge>}
              </div>
              <p className="text-slate-400 text-sm mt-1">{driver.email} · {driver.phone}</p>
              <p className="text-slate-500 text-xs mt-1">Joined {new Date(driver.joinedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Total Earnings</p>
              <p className="text-lg font-bold text-white">${driver.totalEarnings?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Jobs Completed</p>
              <p className="text-lg font-bold text-white">{driver.profile?.totalJobsCompleted ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Average Rating</p>
              <p className="text-lg font-bold text-white flex items-center gap-1">
                {driver.profile?.averageRating?.toFixed(1) ?? '—'} <Star size={14} className="text-amber-400" />
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stripe Payouts</p>
              <Badge variant={driver.stripePayoutsEnabled ? 'success' : 'default'}>
                {driver.stripePayoutsEnabled ? 'Enabled' : 'Not setup'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Services */}
      <Card title="Service Approvals">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['battery', 'lockout', 'fuel', 'tire'].map(key => (
            <ServiceCard
              key={key}
              serviceKey={key}
              state={services[key] ?? { status: 'unapproved', isEnabled: false }}
              driverId={driver.id}
              media={media[key] ?? []}
              onAction={(k, s) => serviceMutation.mutate({ key: k, status: s })}
            />
          ))}
        </div>
      </Card>

      {/* Recent Jobs */}
      {(driver.recentJobs?.length ?? 0) > 0 && (
        <Card title="Recent Jobs">
          <div className="divide-y divide-slate-800">
            {driver.recentJobs!.map(job => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{job.serviceType}</p>
                  <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleDateString()} · {job.customer}</p>
                </div>
                <div className="flex items-center gap-3">
                  {job.finalCost != null && <span className="text-sm text-emerald-400 font-medium">${job.finalCost.toFixed(2)}</span>}
                  <Badge variant={statusBadge(job.status)}>{job.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reviews */}
      {(driver.reviews?.length ?? 0) > 0 && (
        <Card title="Reviews">
          <div className="divide-y divide-slate-800">
            {driver.reviews!.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">{Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? 'text-amber-400' : 'text-slate-700'} fill={i < r.rating ? 'currentColor' : 'none'} />
                  ))}</div>
                  <span className="text-xs text-slate-500">{r.reviewer} · {new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-slate-300">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
