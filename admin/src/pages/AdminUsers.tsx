import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Shield } from 'lucide-react';
import { listAdmins, createAdmin, deleteAdmin } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const queryClient  = useQueryClient();
  const [open,  setOpen]  = useState(false);
  const [form,  setForm]  = useState({ name: '', email: '', phoneNumber: '', password: '' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => listAdmins().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => createAdmin(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setOpen(false);
      setForm({ name: '', email: '', phoneNumber: '', password: '' });
      setError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create admin.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  });

  const handleCreate = () => {
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required.');
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus size={15} />} onClick={() => setOpen(true)}>
          Add Admin
        </Button>
      </div>

      <Card>
        <div className="divide-y divide-slate-800">
          {(data ?? []).map(admin => (
            <div key={admin.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{admin.name}</p>
                  {admin.id === me?.id && <Badge variant="info">You</Badge>}
                  {!admin.isActive && <Badge variant="danger">Inactive</Badge>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{admin.email}</p>
                <p className="text-xs text-slate-500">Added {new Date(admin.createdAt).toLocaleDateString()}</p>
              </div>
              {admin.id !== me?.id && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  loading={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Remove admin access for ${admin.name}?`))
                      deleteMutation.mutate(admin.id);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          {(data?.length ?? 0) === 0 && (
            <p className="text-center text-slate-500 py-10 text-sm">No admin users found.</p>
          )}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={open} onClose={() => { setOpen(false); setError(''); }} title="Add Admin User">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            placeholder="jane@roadlift.ca"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+1 (416) 000-0000"
            value={form.phoneNumber}
            onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setOpen(false); setError(''); }} className="flex-1">
              Cancel
            </Button>
            <Button loading={createMutation.isPending} onClick={handleCreate} className="flex-1">
              Create Admin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
