import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle, MapPin, Car, RefreshCw, DollarSign, UserSwitch } from 'lucide-react';
import { getJobDetail, cancelJob, overrideJobStatus, issueRefund, reassignJob } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Spinner';

// Lucide doesn't have UserSwitch — use a simple alias
const UserSwap = UserSwitch ?? RefreshCw;

const JOB_STATUSES = ['pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'];

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right">{value ?? '—'}</span>
    </div>
  );
}

export default function JobDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [showStatusModal,   setShowStatusModal]   = useState(false);
  const [showRefundModal,   setShowRefundModal]   = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  const [newStatus,     setNewStatus]     = useState('');
  const [statusReason,  setStatusReason]  = useState('');
  const [refundAmount,  setRefundAmount]  = useState('');
  const [newDriverId,   setNewDriverId]   = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobDetail(id!).then(r => r.data),
    refetchInterval: 15_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(job!.id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  });

  const statusMutation = useMutation({
    mutationFn: () => overrideJobStatus(job!.id, newStatus, statusReason || undefined),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['job', id] }); setShowStatusModal(false); setStatusReason(''); },
  });

  const refundMutation = useMutation({
    mutationFn: () => issueRefund(job!.id, refundAmount ? parseFloat(refundAmount) : undefined),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['job', id] }); setShowRefundModal(false); setRefundAmount(''); },
  });

  const reassignMutation = useMutation({
    mutationFn: () => reassignJob(job!.id, newDriverId ? parseInt(newDriverId) : undefined),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['job', id] }); setShowReassignModal(false); setNewDriverId(''); },
  });

  if (isLoading) return <PageLoader />;
  if (!job) return <div className="text-red-400 p-6">Job not found.</div>;

  const canCancel   = !['completed', 'cancelled'].includes(job.status);
  const canRefund   = !!job.paymentIntentId;
  const canReassign = !['completed', 'cancelled'].includes(job.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Jobs
        </button>
        <div className="flex flex-wrap gap-2">
          {canReassign && (
            <Button variant="secondary" size="sm" onClick={() => setShowReassignModal(true)}>
              <RefreshCw size={14} className="mr-1.5" /> Reassign
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => { setNewStatus(job.status); setShowStatusModal(true); }}>
            Override Status
          </Button>
          {canRefund && (
            <Button variant="secondary" size="sm" onClick={() => setShowRefundModal(true)}>
              <DollarSign size={14} className="mr-1.5" /> Refund
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" size="sm" icon={<XCircle size={14} />} loading={cancelMutation.isPending}
              onClick={() => { if (confirm('Force cancel this job? Customer and driver will be notified.')) cancelMutation.mutate(); }}>
              Force Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl flex-wrap">
        <span className="font-mono text-slate-500 text-sm">Job #{job.id}</span>
        <span className="text-slate-700">·</span>
        <Badge variant={statusBadge(job.status)} className="capitalize text-sm px-3 py-1">
          {job.status.replace('_', ' ')}
        </Badge>
        <span className="text-slate-700">·</span>
        <span className="text-sm text-slate-300">{job.serviceType}</span>
        <div className="ml-auto">
          {job.finalCost != null
            ? <span className="text-emerald-400 font-bold">${job.finalCost.toFixed(2)}</span>
            : job.estimatedCost != null
              ? <span className="text-slate-400">${job.estimatedCost.toFixed(2)} est.</span>
              : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Job Details">
          <div className="px-5 py-2">
            <InfoRow label="Service Type"   value={job.serviceType} />
            <InfoRow label="Status"         value={job.status} />
            <InfoRow label="Dispatch Stage" value={job.dispatchStage} />
            <InfoRow label="Search Radius"  value={job.currentRadius != null ? `${job.currentRadius} km` : undefined} />
            <InfoRow label="Estimated Cost" value={job.estimatedCost != null ? `$${job.estimatedCost.toFixed(2)}` : undefined} />
            <InfoRow label="Current Price"  value={job.currentPrice  != null ? `$${job.currentPrice.toFixed(2)}`  : undefined} />
            <InfoRow label="Final Cost"     value={job.finalCost     != null ? `$${job.finalCost.toFixed(2)}`     : undefined} />
            <InfoRow label="Payment Intent" value={job.paymentIntentId} />
            <InfoRow label="Notes"          value={job.notes} />
            <InfoRow label="Created"        value={new Date(job.createdAt).toLocaleString()} />
            <InfoRow label="Last Updated"   value={new Date(job.updatedAt).toLocaleString()} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Customer">
            <div className="px-5 py-2">
              <div className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-sm">
                  {job.customer?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{job.customer?.name}</p>
                  <p className="text-xs text-slate-400">{job.customer?.phone}</p>
                  {job.customer?.email && <p className="text-xs text-slate-500">{job.customer.email}</p>}
                </div>
              </div>
              {job.isThirdParty && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-2">
                  <p className="text-xs text-amber-400 font-medium">Third-party request</p>
                  <p className="text-xs text-slate-300 mt-1">{job.recipientName} · {job.recipientPhone}</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Driver">
            <div className="px-5 py-3">
              {job.driver ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-sm">
                    {job.driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{job.driver.name}</p>
                    <p className="text-xs text-slate-400">{job.driver.phone}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-1">No driver assigned yet.</p>
              )}
            </div>
          </Card>

          {job.vehicle && (
            <Card title="Vehicle">
              <div className="px-5 py-3 flex items-center gap-3">
                <Car size={16} className="text-slate-400" />
                <span className="text-sm text-white">{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</span>
              </div>
            </Card>
          )}

          {job.pickupAddress && (
            <Card title="Pickup Location">
              <div className="px-5 py-3 flex items-start gap-3">
                <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{job.pickupAddress}</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {(job.messages?.length ?? 0) > 0 && (
        <Card title={`Chat (${job.messages!.length} messages)`}>
          <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
            {job.messages!.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.senderRole === 'DRIVER' ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                  msg.senderRole === 'DRIVER' ? 'bg-blue-600/20 text-blue-200 ml-auto' : 'bg-slate-800 text-slate-200'
                }`}>
                  <p className={`text-xs font-medium mb-1 ${msg.senderRole === 'DRIVER' ? 'text-blue-400' : 'text-slate-400'}`}>
                    {msg.sender ?? msg.senderRole}
                  </p>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {job.review && (
        <Card title="Customer Review">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < (job.review?.rating ?? 0) ? 'text-amber-400' : 'text-slate-700'}>★</span>
              ))}
              <span className="text-slate-400 text-sm">({job.review.rating}/5)</span>
            </div>
            {job.review.comment && <p className="text-sm text-slate-300">{job.review.comment}</p>}
          </div>
        </Card>
      )}

      {/* Status Override Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Override Job Status">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Status</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500">
              {JOB_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Reason (optional)</label>
            <input value={statusReason} onChange={e => setStatusReason(e.target.value)}
              placeholder="Why are you changing this status?"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500" />
          </div>
          {statusMutation.isError && (
            <p className="text-red-400 text-sm">Failed to override status.</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund Modal */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Issue Refund">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Full refund: <span className="text-white font-medium">${job.finalCost?.toFixed(2) ?? '—'}</span>
          </p>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Amount (leave blank for full refund)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">$</span>
              <input type="number" min="0.01" step="0.01" value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                placeholder={job.finalCost?.toFixed(2) ?? ''}
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          {refundMutation.isError && (
            <p className="text-red-400 text-sm">
              {(refundMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Refund failed.'}
            </p>
          )}
          {refundMutation.isSuccess && (
            <p className="text-emerald-400 text-sm">Refund issued successfully.</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowRefundModal(false)}>Cancel</Button>
            <Button variant="success" className="flex-1" loading={refundMutation.isPending} onClick={() => refundMutation.mutate()}>
              Issue Refund
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="Reassign Job">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Enter a specific Driver ID to assign, or leave blank to clear the current driver and re-queue the job.
          </p>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Driver ID (optional)</label>
            <input type="number" value={newDriverId} onChange={e => setNewDriverId(e.target.value)}
              placeholder="Leave blank to re-queue"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500" />
          </div>
          {reassignMutation.isError && (
            <p className="text-red-400 text-sm">
              {(reassignMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Reassignment failed.'}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowReassignModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={reassignMutation.isPending} onClick={() => reassignMutation.mutate()}>
              {newDriverId ? 'Assign Driver' : 'Re-queue Job'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
