import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { listCustomers, updateCustomerStatus } from '../lib/api';
import Card from '../components/ui/Card';
import Table, { Column } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import type { Customer } from '../types';

export default function Customers() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, status],
    refetchInterval: 30_000,
    queryFn: () => listCustomers({ page, limit: 20, ...(search && { search }), ...(status && { status }) }).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => updateCustomerStatus(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <div>
          <p className="font-medium text-white">{c.name}</p>
          <p className="text-xs text-slate-500">{c.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (c) => c.isSuspended
        ? <Badge variant="danger">Suspended</Badge>
        : <Badge variant="success">Active</Badge>,
    },
    { key: 'totalJobs', header: 'Total Jobs', render: (c) => c.totalJobs.toLocaleString() },
    { key: 'joinedAt', header: 'Joined', render: (c) => new Date(c.joinedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div onClick={e => e.stopPropagation()}>
          {c.isSuspended ? (
            <Button size="sm" variant="success" loading={mutation.isPending} onClick={() => mutation.mutate({ id: c.id, action: 'unsuspend' })}>Unsuspend</Button>
          ) : (
            <Button size="sm" variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate({ id: c.id, action: 'suspend' })}>Suspend</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl">
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
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          data={data?.customers ?? []}
          loading={isLoading}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyMessage="No customers found."
        />
        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
