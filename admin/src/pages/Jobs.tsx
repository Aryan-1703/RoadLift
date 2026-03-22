import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Download } from 'lucide-react';
import { listJobs, exportCsv } from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table, { Column } from '../components/ui/Table';
import Badge, { statusBadge } from '../components/ui/Badge';
import Input, { Select } from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import type { Job } from '../types';

const JOB_STATUSES = ['pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'];
const SERVICE_TYPES = ['battery-boost', 'car-lockout', 'tire-change', 'fuel-delivery', 'towing', 'accident'];

export default function Jobs() {
  const navigate = useNavigate();
  const [page,        setPage]        = useState(1);
  const [status,      setStatus]      = useState('');
  const [serviceType, setServiceType] = useState('');
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, status, serviceType, from, to],
    refetchInterval: 15_000,
    queryFn: () => listJobs({
      page, limit: 20,
      ...(status      && { status }),
      ...(serviceType && { serviceType }),
      ...(from        && { from }),
      ...(to          && { to }),
    }).then(r => r.data),
  });

  const columns: Column<Job>[] = [
    {
      key: 'id',
      header: 'Job',
      render: (j) => (
        <div>
          <p className="font-mono text-xs text-slate-400">#{j.id}</p>
          <p className="text-sm text-white font-medium">{j.serviceType}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (j) => <span>{j.customer?.name ?? '—'}</span>,
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (j) => j.driver ? <span>{j.driver.name}</span> : <span className="text-slate-500">Unassigned</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (j) => <Badge variant={statusBadge(j.status)} className="capitalize">{j.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'finalCost',
      header: 'Amount',
      render: (j) => j.finalCost != null
        ? <span className="text-emerald-400 font-medium">${j.finalCost.toFixed(2)}</span>
        : j.estimatedCost != null
          ? <span className="text-slate-400">${j.estimatedCost.toFixed(2)} est.</span>
          : '—',
    },
    {
      key: 'pickupAddress',
      header: 'Pickup',
      render: (j) => <span className="text-xs text-slate-400 max-w-xs truncate block">{j.pickupAddress ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (j) => <span className="text-xs">{new Date(j.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {JOB_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
          </Select>
        </div>
        <div className="w-44">
          <Select label="Service" value={serviceType} onChange={e => { setServiceType(e.target.value); setPage(1); }}>
            <option value="">All Services</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <Input label="From" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className="w-36" />
        <Input label="To"   type="date" value={to}   onChange={e => { setTo(e.target.value);   setPage(1); }} className="w-36" />
        {(status || serviceType || from || to) && (
          <button
            onClick={() => { setStatus(''); setServiceType(''); setFrom(''); setTo(''); setPage(1); }}
            className="text-xs text-slate-400 hover:text-white transition-colors mt-5"
          >
            Clear filters
          </button>
        )}
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => exportCsv('jobs', from || undefined, to || undefined)}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={data?.jobs ?? []}
          loading={isLoading}
          onRowClick={(j) => navigate(`/jobs/${j.id}`)}
          emptyMessage="No jobs found."
        />
        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
