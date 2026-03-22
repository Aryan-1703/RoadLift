import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Car, Edit2 } from 'lucide-react';
import { getCustomer, updateCustomerStatus, updateCustomerProfile } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Spinner';

export default function CustomerDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [suspendReason,    setSuspendReason]    = useState('');
  const [editForm,         setEditForm]         = useState<Record<string, string>>({});

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn:  () => getCustomer(id!).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      updateCustomerStatus(customer!.id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setShowSuspendModal(false);
      setSuspendReason('');
    },
  });

  const editMutation = useMutation({
    mutationFn: () => updateCustomerProfile(customer!.id, editForm),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); setShowEditModal(false); setEditForm({}); },
  });

  if (isLoading) return <PageLoader />;
  if (!customer) return <div className="text-red-400 p-6">Customer not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Customers
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditForm({}); setShowEditModal(true); }}>
            <Edit2 size={14} className="mr-1.5" /> Edit Profile
          </Button>
          {customer.isSuspended ? (
            <Button variant="success" size="sm" loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'unsuspend' })}>
              Unsuspend
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setShowSuspendModal(true)}>
              Suspend Customer
            </Button>
          )}
        </div>
      </div>

      {/* Profile */}
      <Card>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white">{customer.name}</h2>
                {customer.isSuspended ? <Badge variant="danger">Suspended</Badge> : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-slate-400 text-sm mt-1">{customer.email} · {customer.phone}</p>
              <p className="text-slate-500 text-xs mt-1">Joined {new Date(customer.joinedAt).toLocaleDateString()}</p>
              {customer.isSuspended && customer.suspensionReason && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400 font-medium">Suspension reason</p>
                  <p className="text-xs text-slate-300 mt-0.5">{customer.suspensionReason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Total Jobs</p>
              <p className="text-lg font-bold text-white">{customer.totalJobs}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Spent</p>
              <p className="text-lg font-bold text-white">${customer.totalSpent?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stripe Customer</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{customer.stripeCustomerId ?? '—'}</p>
            </div>
          </div>
        </div>
      </Card>

      {(customer.vehicles?.length ?? 0) > 0 && (
        <Card title="Vehicles">
          <div className="divide-y divide-slate-800">
            {customer.vehicles!.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                <Car size={16} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-white">{v.year} {v.make} {v.model}</span>
                {v.color && <span className="text-xs text-slate-500">· {v.color}</span>}
                {v.licensePlate && <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono ml-auto">{v.licensePlate}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(customer.recentJobs?.length ?? 0) > 0 && (
        <Card title="Recent Jobs">
          <div className="divide-y divide-slate-800">
            {customer.recentJobs!.map(job => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{job.serviceType}</p>
                  <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleDateString()} · Driver: {job.driver ?? 'Unassigned'}</p>
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

      {/* Suspend Modal */}
      <Modal isOpen={showSuspendModal} onClose={() => { setShowSuspendModal(false); setSuspendReason(''); }} title="Suspend Customer">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Provide a reason for the suspension.</p>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Reason <span className="text-red-400">*</span></label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
              placeholder="e.g. Fraudulent chargebacks, abusive behaviour…"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }}>Cancel</Button>
            <Button variant="danger" className="flex-1" disabled={!suspendReason.trim()} loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'suspend', reason: suspendReason })}>
              Suspend
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditForm({}); }} title="Edit Customer Profile">
        <div className="space-y-3">
          {[
            { key: 'name',        label: 'Name',  placeholder: customer.name },
            { key: 'email',       label: 'Email', placeholder: customer.email },
            { key: 'phoneNumber', label: 'Phone', placeholder: customer.phone },
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
              onClick={() => editMutation.mutate()}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
