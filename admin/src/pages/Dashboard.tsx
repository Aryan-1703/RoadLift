import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Car, Briefcase, DollarSign, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { getDashboard } from '../lib/api';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import Badge, { statusBadge } from '../components/ui/Badge';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard().then(r => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return (
    <div className="flex items-center justify-center h-64 text-red-400">Failed to load dashboard.</div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Users */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers" value={data.users.customers.toLocaleString()} icon={<Users size={18} />} color="blue" />
          <StatCard label="Total Drivers" value={data.users.drivers.toLocaleString()} icon={<Car size={18} />} color="purple" />
          <StatCard label="Active Drivers" value={data.users.activeDrivers.toLocaleString()} sub="online right now" icon={<Activity size={18} />} color="green" />
          <StatCard
            label="Pending Approvals"
            value={data.pendingServiceApprovals}
            sub="equipment reviews"
            icon={<Clock size={18} />}
            color={data.pendingServiceApprovals > 0 ? 'amber' : 'slate'}
          />
        </div>
      </div>

      {/* Jobs */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Jobs</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Jobs Today" value={data.jobs.today.toLocaleString()} icon={<Briefcase size={18} />} color="blue" />
          <StatCard label="Jobs This Week" value={data.jobs.thisWeek.toLocaleString()} icon={<Briefcase size={18} />} color="blue" />
          <StatCard label="Active Jobs" value={data.jobs.active.toLocaleString()} sub="in progress now" icon={<Activity size={18} />} color={data.jobs.active > 0 ? 'green' : 'slate'} />
          <StatCard label="Awaiting Driver" value={data.jobs.awaitingDriver.toLocaleString()} sub="pending dispatch" icon={<Clock size={18} />} color={data.jobs.awaitingDriver > 0 ? 'amber' : 'slate'} />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Revenue</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard
            label="Revenue Today"
            value={`$${data.revenue.today.toFixed(2)}`}
            sub={`Platform: $${data.revenue.platformFeeToday.toFixed(2)}`}
            icon={<DollarSign size={18} />}
            color="green"
          />
          <StatCard
            label="Revenue This Week"
            value={`$${data.revenue.thisWeek.toFixed(2)}`}
            sub={`Platform: $${data.revenue.platformFeeThisWeek.toFixed(2)}`}
            icon={<DollarSign size={18} />}
            color="green"
          />
          <StatCard
            label="Revenue This Month"
            value={`$${data.revenue.thisMonth.toFixed(2)}`}
            sub={`Platform: $${data.revenue.platformFeeThisMonth.toFixed(2)}`}
            icon={<DollarSign size={18} />}
            color="green"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Approvals */}
        <Card
          title="Pending Approvals"
          action={
            data.pendingServiceApprovals > 0 ? (
              <button onClick={() => navigate('/drivers/pending')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View all →
              </button>
            ) : undefined
          }
        >
          <div className="p-5">
            {data.pendingServiceApprovals === 0 ? (
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle size={18} />
                <span className="text-sm">All service approvals are up to date.</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-amber-400">
                <AlertCircle size={18} />
                <span className="text-sm">
                  <strong>{data.pendingServiceApprovals}</strong> driver{data.pendingServiceApprovals !== 1 ? 's' : ''} waiting for service approval.
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Live Status */}
        <Card title="Live Status">
          <div className="p-5 space-y-3">
            {[
              { label: 'Active Jobs',        value: data.jobs.active,          variant: data.jobs.active > 0 ? 'success' : 'default' },
              { label: 'Pending Dispatch',   value: data.jobs.awaitingDriver,  variant: data.jobs.awaitingDriver > 0 ? 'warning' : 'default' },
              { label: 'Drivers Online',     value: data.users.activeDrivers,  variant: data.users.activeDrivers > 0 ? 'success' : 'default' },
              { label: 'Total Completed',    value: data.jobs.totalCompleted,  variant: 'info' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{item.label}</span>
                <Badge variant={item.variant as 'success' | 'warning' | 'default' | 'info'}>{item.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
