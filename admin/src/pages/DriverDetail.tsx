import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, CheckCircle, XCircle, Lock, Edit2, TrendingUp } from 'lucide-react';
import { getDriver, approveService, updateDriverStatus, updateDriverProfile, getDriverEarnings, getMediaUrl } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Spinner';
import type { ServiceState } from '../types';

const SERVICE_LABELS: Record<string, string> = {
  battery: 'Battery Boost',
  lockout: 'Car Lockout',
  fuel:    'Fuel Delivery',
  tire:    'Tire Change',
};

function ServiceCard({ serviceKey, state, media, onAction, loading }: {
  serviceKey: string; state: ServiceState; media: string[];
  onAction: (key: string, status: string) => void; loading?: boolean;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white text-sm">{SERVICE_LABELS[serviceKey] ?? serviceKey}</span>
        <Badge variant={statusBadge(state.status)} className="capitalize">{state.status}</Badge>
      </div>
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((url, i) => (
            <a key={i} href={getMediaUrl(url)} target="_blank" rel="noopener noreferrer">
              <img src={getMediaUrl(url)} alt={`${serviceKey} proof ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-slate-600 hover:border-blue-500 transition-colors"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </a>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="success" disabled={state.status === 'approved' || loading} loading={loading}
          icon={<CheckCircle size={13} />} onClick={() => onAction(serviceKey, 'approved')}>Approve</Button>
        <Button size="sm" variant="danger" disabled={state.status === 'rejected' || loading} loading={loading}
          icon={<XCircle size={13} />} onClick={() => onAction(serviceKey, 'rejected')}>Reject</Button>
        {state.status !== 'unapproved' && (
          <Button size="sm" variant="ghost" disabled={loading} icon={<Lock size={13} />}
            onClick={() => onAction(serviceKey, 'unapproved')}>Reset</Button>
        )}
      </div>
    </div>
  );
}

export default function DriverDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal,    setShowEditModal]    = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showEarnings,     setShowEarnings]     = useState(false);
  const [suspendReason,    setSuspendReason]    = useState('');
  const [serviceError,     setServiceError]     = useState('');

  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn:  () => getDriver(id!).then(r => r.data),
  });

  const { data: earnings } = useQuery({
    queryKey: ['driver-earnings', id],
    queryFn:  () => getDriverEarnings(id!).then(r => r.data),
    enabled:  showEarnings,
  });

  const serviceMutation = useMutation({
    mutationFn: ({ key, status }: { key: string; status: string }) => approveService(driver!.id, key, status),
    onSuccess:  () => { setServiceError(''); queryClient.invalidateQueries({ queryKey: ['driver', id] }); },
    onError:    (err: unknown) => {
      setServiceError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update service status.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      updateDriverStatus(driver!.id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      setShowSuspendModal(false);
      setSuspendReason('');
    },
  });

  const editMutation = useMutation({
    mutationFn: () => updateDriverProfile(driver!.id, editForm),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['driver', id] }); setShowEditModal(false); setEditForm({}); },
  });

  if (isLoading) return <PageLoader />;
  if (!driver) return <div className="text-red-400 p-6">Driver not found.</div>;

  const services = driver.profile?.unlockedServices ?? {};
  const media    = driver.profile?.equipmentMedia    ?? {};

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate('/drivers')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Drivers
        </button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({}); setShowEditModal(true); }}>
            <Edit2 size={14} className="mr-1.5" /> Edit Profile
          </Button>
          {driver.isSuspended ? (
            <Button variant="success" size="sm" loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'unsuspend' })}>
              Unsuspend
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setShowSuspendModal(true)}>
              Suspend Driver
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
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
                  : driver.isActive ? <Badge variant="success">Online</Badge> : <Badge variant="default">Offline</Badge>}
              </div>
              <p className="text-slate-400 text-sm mt-1">{driver.email} · {driver.phone}</p>
              <p className="text-slate-500 text-xs mt-1">Joined {new Date(driver.joinedAt).toLocaleDateString()}</p>
              {driver.isSuspended && driver.suspensionReason && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400 font-medium">Suspension reason</p>
                  <p className="text-xs text-slate-300 mt-0.5">{driver.suspensionReason}</p>
                </div>
              )}
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

      {/* Earnings Breakdown */}
      <Card title="Earnings Breakdown">
        <div className="p-5">
          {!showEarnings ? (
            <button onClick={() => setShowEarnings(true)}
              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              <TrendingUp size={16} /> Load earnings breakdown
            </button>
          ) : !earnings ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Total Revenue</p>
                  <p className="text-lg font-bold text-white">${earnings.totals.totalEarnings.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Driver Payout (80%)</p>
                  <p className="text-lg font-bold text-emerald-400">${earnings.totals.driverPayout.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Platform Fee (20%)</p>
                  <p className="text-lg font-bold text-violet-400">${earnings.totals.platformFee.toFixed(2)}</p>
                </div>
              </div>
              {earnings.byService.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">By Service</p>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg">
                    {earnings.byService.map(s => (
                      <div key={s.serviceType} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-white capitalize">{s.serviceType}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-400">{s.jobs} jobs</span>
                          <span className="text-emerald-400 font-medium">${s.payout.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Service Approvals */}
      <Card title="Service Approvals">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviceError && (
            <p className="col-span-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{serviceError}</p>
          )}
          {['battery', 'lockout', 'fuel', 'tire'].map(key => (
            <ServiceCard key={key} serviceKey={key}
              state={services[key] ?? { status: 'unapproved', isEnabled: false }}
              media={media[key] ?? []}
              loading={serviceMutation.isPending}
              onAction={(k, s) => serviceMutation.mutate({ key: k, status: s })} />
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

      {/* Suspend Modal */}
      <Modal isOpen={showSuspendModal} onClose={() => { setShowSuspendModal(false); setSuspendReason(''); }} title="Suspend Driver">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Provide a reason for the suspension. This is stored and shown to the admin team.</p>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Reason <span className="text-red-400">*</span></label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
              placeholder="e.g. Reported for unsafe driving, repeated no-shows…"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          {statusMutation.isError && <p className="text-red-400 text-sm">Failed to suspend driver.</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }}>Cancel</Button>
            <Button variant="danger" className="flex-1" disabled={!suspendReason.trim()} loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'suspend', reason: suspendReason })}>
              Suspend
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditForm({}); }} title="Edit Driver Profile">
        <div className="space-y-3">
          {[
            { key: 'name',         label: 'Name',           placeholder: driver.name },
            { key: 'email',        label: 'Email',          placeholder: driver.email },
            { key: 'phoneNumber',  label: 'Phone',          placeholder: driver.phone },
            { key: 'vehicleType',  label: 'Vehicle Type',   placeholder: driver.profile?.vehicleType ?? '' },
            { key: 'licenseNumber',label: 'License Number', placeholder: driver.profile?.licenseNumber ?? '' },
            { key: 'companyName',  label: 'Company Name',   placeholder: driver.profile?.companyName ?? '' },
            { key: 'serviceArea',  label: 'Service Area',   placeholder: driver.profile?.serviceArea ?? '' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs text-slate-400 mb-1">{field.label}</label>
              <input
                value={editForm[field.key] ?? ''}
                onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          ))}
          {editMutation.isError && (
            <p className="text-red-400 text-sm">
              {(editMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update profile.'}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowEditModal(false); setEditForm({}); }}>Cancel</Button>
            <Button className="flex-1" loading={editMutation.isPending}
              disabled={Object.keys(editForm).length === 0}
              onClick={() => editMutation.mutate()}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
