import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2, Save, DollarSign, MapPin, Phone, Mail } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import type { PlatformSettings } from '../types';

export default function Settings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => getSettings().then(r => r.data),
  });

  const [form, setForm] = useState<Partial<PlatformSettings>>({});

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data) return null;

  const current = { ...data, ...form };

  const set = (key: keyof PlatformSettings, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (Object.keys(form).length === 0) return;
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-400 text-sm">Saved!</span>}
          <Button onClick={handleSave} disabled={Object.keys(form).length === 0 || mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {mutation.isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          Failed to save settings.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Fee */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-semibold">Platform Fee</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Platform Fee % <span className="text-slate-500">(taken from each job)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="100" step="1"
                  value={Math.round((current.platformFee ?? 0.20) * 100)}
                  onChange={e => set('platformFee', parseFloat(e.target.value) / 100)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-24 focus:outline-none focus:border-violet-500"
                />
                <span className="text-slate-400">%</span>
                <span className="text-slate-500 text-sm ml-2">
                  Driver receives {Math.round((1 - (current.platformFee ?? 0.20)) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cancellation Fee ($)</label>
              <input
                type="number" min="0" step="1"
                value={current.cancellationFee ?? 10}
                onChange={e => set('cancellationFee', parseFloat(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-32 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </Card>

        {/* Search Radius */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold">Dispatch Radius</h2>
          </div>
          <div className="space-y-4">
            {(['initial', 'step', 'max'] as const).map(key => (
              <div key={key}>
                <label className="block text-sm text-slate-400 mb-1 capitalize">
                  {key === 'initial' ? 'Initial Radius' : key === 'step' ? 'Expansion Step' : 'Max Radius'} (km)
                </label>
                <input
                  type="number" min="1" step="1"
                  value={(current.searchRadius ?? data.searchRadius)[key]}
                  onChange={e => set('searchRadius', {
                    ...(current.searchRadius ?? data.searchRadius),
                    [key]: parseInt(e.target.value),
                  })}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-32 focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Service Pricing */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Service Pricing</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(current.pricing ?? data.pricing).map(([svc, price]) => (
              <div key={svc} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 capitalize">{svc} — Base ($)</label>
                  <input
                    type="number" min="0" step="1"
                    value={(price as { base: number; perKm: number }).base}
                    onChange={e => set('pricing', {
                      ...(current.pricing ?? data.pricing),
                      [svc]: { ...(price as { base: number; perKm: number }), base: parseFloat(e.target.value) },
                    })}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 capitalize">{svc} — Per Km ($)</label>
                  <input
                    type="number" min="0" step="0.5"
                    value={(price as { base: number; perKm: number }).perKm}
                    onChange={e => set('pricing', {
                      ...(current.pricing ?? data.pricing),
                      [svc]: { ...(price as { base: number; perKm: number }), perKm: parseFloat(e.target.value) },
                    })}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Support Contact */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-violet-400" />
            <h2 className="text-white font-semibold">Support Contact</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Support Email
              </label>
              <input
                type="email"
                value={current.supportEmail ?? ''}
                onChange={e => set('supportEmail', e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Support Phone
              </label>
              <input
                type="tel"
                value={current.supportPhone ?? ''}
                onChange={e => set('supportPhone', e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
