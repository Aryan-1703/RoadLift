import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getAnalyticsOverview, getServiceBreakdown } from '../lib/api';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Input from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { TrendingUp, DollarSign, Briefcase, CheckCircle } from 'lucide-react';

const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

export default function Analytics() {
  const [from, setFrom] = useState(toDateStr(subDays(new Date(), 30)));
  const [to,   setTo]   = useState(toDateStr(new Date()));

  const { data: overview, isLoading: l1 } = useQuery({
    queryKey: ['analytics-overview', from, to],
    queryFn: () => getAnalyticsOverview(from, to).then(r => r.data),
  });

  const { data: services, isLoading: l2 } = useQuery({
    queryKey: ['analytics-services', from, to],
    queryFn: () => getServiceBreakdown(from, to).then(r => r.data),
  });

  const isLoading = l1 || l2;

  const fmtDate = (d: string) => format(new Date(d), 'MMM d');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Date Range */}
      <div className="flex items-end gap-3">
        <Input label="From" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        <Input label="To"   type="date" value={to}   onChange={e => setTo(e.target.value)}   className="w-40" />
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Jobs"       value={overview?.totals.jobs ?? 0}                            icon={<Briefcase  size={18} />} color="blue"   />
            <StatCard label="Completed"        value={overview?.totals.completed ?? 0}                       icon={<CheckCircle size={18} />} color="green"  />
            <StatCard label="Total Revenue"    value={`$${(overview?.totals.revenue ?? 0).toFixed(2)}`}      icon={<DollarSign size={18} />} color="green"  />
            <StatCard
              label="Platform Revenue"
              value={`$${(overview?.totals.platformRevenue ?? 0).toFixed(2)}`}
              sub={`${overview?.totals.completionRate ?? 0}% completion rate`}
              icon={<TrendingUp size={18} />}
              color="purple"
            />
          </div>

          {/* Jobs chart */}
          {(overview?.jobsByDay?.length ?? 0) > 0 && (
            <Card title="Jobs Per Day">
              <div className="p-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview!.jobsByDay.map(d => ({ ...d, date: fmtDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                    <Line type="monotone" dataKey="total"     stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                    <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={false} name="Cancelled" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Revenue chart */}
          {(overview?.revenueByDay?.length ?? 0) > 0 && (
            <Card title="Revenue Per Day">
              <div className="p-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview!.revenueByDay.map(d => ({ ...d, date: fmtDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Service breakdown */}
          {(services?.services?.length ?? 0) > 0 && (
            <Card title="Service Breakdown">
              <div className="p-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={services!.services}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="serviceType" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                    <Bar dataKey="total"     fill="#3b82f6" name="Total"     radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="border-t border-slate-800 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Service', 'Total', 'Completed', 'Cancelled', 'Revenue'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {services!.services.map(s => (
                      <tr key={s.serviceType} className="border-b border-slate-800/50">
                        <td className="px-5 py-3 text-white font-medium">{s.serviceType}</td>
                        <td className="px-5 py-3 text-slate-300">{s.total}</td>
                        <td className="px-5 py-3 text-emerald-400">{s.completed}</td>
                        <td className="px-5 py-3 text-red-400">{s.cancelled}</td>
                        <td className="px-5 py-3 text-emerald-400 font-medium">${s.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
