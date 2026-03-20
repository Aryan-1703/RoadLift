type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

const styles: Record<Variant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  danger:  'bg-red-500/15 text-red-400 border-red-500/20',
  info:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
  default: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, Variant> = {
    approved:    'success',
    active:      'success',
    completed:   'success',
    pending:     'warning',
    in_progress: 'warning',
    arrived:     'info',
    accepted:    'info',
    rejected:    'danger',
    cancelled:   'danger',
    suspended:   'danger',
    unapproved:  'default',
    inactive:    'default',
  };
  return map[status?.toLowerCase()] ?? 'default';
}
