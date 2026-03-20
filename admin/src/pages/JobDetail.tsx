import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle, MapPin, User, Car, MessageSquare } from 'lucide-react';
import { getJobDetail, cancelJob } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

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

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobDetail(id!).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(job!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  });

  if (isLoading) return <PageLoader />;
  if (!job) return <div className="text-red-400 p-6">Job not found.</div>;

  const canCancel = !['completed', 'cancelled'].includes(job.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Jobs
        </button>
        {canCancel && (
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle size={14} />}
            loading={cancelMutation.isPending}
            onClick={() => {
              if (confirm('Force cancel this job? The customer and driver will be notified.'))
                cancelMutation.mutate();
            }}
          >
            Force Cancel
          </Button>
        )}
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <span className="font-mono text-slate-500 text-sm">Job #{job.id}</span>
        <span className="text-slate-700">·</span>
        <Badge variant={statusBadge(job.status)} className="capitalize text-sm px-3 py-1">
          {job.status.replace('_', ' ')}
        </Badge>
        <span className="text-slate-700">·</span>
        <span className="text-sm text-slate-300">{job.serviceType}</span>
        <div className="ml-auto text-right">
          {job.finalCost != null ? (
            <span className="text-emerald-400 font-bold">${job.finalCost.toFixed(2)}</span>
          ) : job.estimatedCost != null ? (
            <span className="text-slate-400">${job.estimatedCost.toFixed(2)} est.</span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job Details */}
        <Card title="Job Details">
          <div className="px-5 py-2">
            <InfoRow label="Service Type"    value={job.serviceType} />
            <InfoRow label="Status"          value={job.status} />
            <InfoRow label="Dispatch Stage"  value={job.dispatchStage} />
            <InfoRow label="Search Radius"   value={job.currentRadius != null ? `${job.currentRadius} km` : undefined} />
            <InfoRow label="Estimated Cost"  value={job.estimatedCost  != null ? `$${job.estimatedCost.toFixed(2)}`  : undefined} />
            <InfoRow label="Current Price"   value={job.currentPrice   != null ? `$${job.currentPrice.toFixed(2)}`   : undefined} />
            <InfoRow label="Final Cost"      value={job.finalCost      != null ? `$${job.finalCost.toFixed(2)}`      : undefined} />
            <InfoRow label="Payment Intent"  value={job.paymentIntentId} />
            <InfoRow label="Notes"           value={job.notes} />
            <InfoRow label="Created"         value={new Date(job.createdAt).toLocaleString()} />
            <InfoRow label="Last Updated"    value={new Date(job.updatedAt).toLocaleString()} />
          </div>
        </Card>

        <div className="space-y-4">
          {/* Customer */}
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

          {/* Driver */}
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

          {/* Vehicle */}
          {job.vehicle && (
            <Card title="Vehicle">
              <div className="px-5 py-3 flex items-center gap-3">
                <Car size={16} className="text-slate-400" />
                <span className="text-sm text-white">{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</span>
              </div>
            </Card>
          )}

          {/* Pickup */}
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

      {/* Chat Messages */}
      {(job.messages?.length ?? 0) > 0 && (
        <Card title={`Chat (${job.messages!.length} messages)`}>
          <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
            {job.messages!.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.senderRole === 'DRIVER' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                  msg.senderRole === 'DRIVER'
                    ? 'bg-blue-600/20 text-blue-200 ml-auto'
                    : 'bg-slate-800 text-slate-200'
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

      {/* Review */}
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
    </div>
  );
}
