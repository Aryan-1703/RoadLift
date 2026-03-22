import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download } from 'lucide-react';
import { listDrivers, updateDriverStatus, exportCsv } from '../lib/api';
import Card from '../components/ui/Card';
import Table, { Column } from '../components/ui/Table';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import type { Driver } from '../types';

const SERVICE_KEYS = ['battery', 'lockout', 'fuel', 'tire'];

export default function Drivers() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search, status],
    refetchInterval: 30_000,
    queryFn: () => listDrivers({ page, limit: 20, ...(search && { search }), ...(status && { status }) }).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => updateDriverStatus(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Driver',
      render: (d) => (
        <div>
          <p className="font-medium text-white">{d.name}</p>
          <p className="text-xs text-slate-500">{d.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (d) => d.phone || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <div className="flex flex-col gap-1">
          {d.isSuspended
            ? <Badge variant="danger">Suspended</Badge>
            : d.isActive
              ? <Badge variant="success">Online</Badge>
              : <Badge variant="default">Offline</Badge>}
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      render: (d) => {
        if (!d.profile?.unlockedServices) return <span className="text-slate-500 text-xs">None</span>;
        const approved = SERVICE_KEYS.filter(k => d.profile?.unlockedServices[k]?.status === 'approved');
        return approved.length > 0
          ? <div className="flex flex-wrap gap-1">{approved.map(k => <Badge key={k} variant="success" className="capitalize">{k}</Badge>)}</div>
          : <span className="text-slate-500 text-xs">None approved</span>;
      },
    },
    {
      key: 'rating',
      header: 'Rating / Jobs',
      render: (d) => d.profile
        ? <span>{d.profile.averageRating?.toFixed(1) ?? '—'} ⭐ · {d.profile.totalJobsCompleted} jobs</span>
        : '—',
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (d) => new Date(d.joinedAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {d.isSuspended ? (
            <Button size="sm" variant="success" loading={mutation.isPending} onClick={() => mutation.mutate({ id: d.id, action: 'unsuspend' })}>Unsuspend</Button>
          ) : (
            <Button size="sm" variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate({ id: d.id, action: 'suspend' })}>Suspend</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            icon={<Search size={15} />}
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => exportCsv('drivers')}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={data?.drivers ?? []}
          loading={isLoading}
          onRowClick={(d) => navigate(`/drivers/${d.id}`)}
          emptyMessage="No drivers found."
        />
        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
