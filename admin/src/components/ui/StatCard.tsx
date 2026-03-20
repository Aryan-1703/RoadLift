interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
}

const colors = {
  blue:   { icon: 'bg-blue-500/15 text-blue-400',   border: 'border-blue-500/10' },
  green:  { icon: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/10' },
  amber:  { icon: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/10' },
  red:    { icon: 'bg-red-500/15 text-red-400',     border: 'border-red-500/10' },
  purple: { icon: 'bg-purple-500/15 text-purple-400', border: 'border-purple-500/10' },
  slate:  { icon: 'bg-slate-700 text-slate-300',    border: 'border-slate-700' },
};

export default function StatCard({ label, value, sub, icon, color = 'blue' }: StatCardProps) {
  const c = colors[color];
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1.5">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
