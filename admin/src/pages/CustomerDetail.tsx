import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Car } from 'lucide-react';
import { getCustomer, updateCustomerStatus } from '../lib/api';
import Card from '../components/ui/Card';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

export default function CustomerDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (action: string) => updateCustomerStatus(customer!.id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer', id] }),
  });

  if (isLoading) return <PageLoader />;
  if (!customer) return <div className="text-red-400 p-6">Customer not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Customers
        </button>
        {customer.isSuspended ? (
          <Button variant="success" size="sm" loading={mutation.isPending} onClick={() => mutation.mutate('unsuspend')}>Unsuspend</Button>
        ) : (
          <Button variant="danger" size="sm" loading={mutation.isPending} onClick={() => mutation.mutate('suspend')}>Suspend Customer</Button>
        )}
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
                {customer.isSuspended
                  ? <Badge variant="danger">Suspended</Badge>
                  : <Badge variant="success">Active</Badge>}
              </div>
              <p className="text-slate-400 text-sm mt-1">{customer.email} · {customer.phone}</p>
              <p className="text-slate-500 text-xs mt-1">Joined {new Date(customer.joinedAt).toLocaleDateString()}</p>
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

      {/* Vehicles */}
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

      {/* Recent Jobs */}
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
    </div>
  );
}
