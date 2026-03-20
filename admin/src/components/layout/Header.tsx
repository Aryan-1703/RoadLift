import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/':                'Dashboard',
  '/drivers':         'Drivers',
  '/drivers/pending': 'Pending Approvals',
  '/customers':       'Customers',
  '/jobs':            'Jobs',
  '/analytics':       'Analytics',
  '/notifications':   'Notifications',
  '/admins':          'Admin Users',
};

export default function Header() {
  const { pathname } = useLocation();

  const base = '/' + pathname.split('/')[1];
  const isDetail = pathname.split('/').length > 2 && !pathname.includes('pending');
  const baseTitle = TITLES[pathname] ?? TITLES[base] ?? 'Admin';

  return (
    <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-950 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm">
        {isDetail ? (
          <>
            <span className="text-slate-400">{TITLES[base]}</span>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="text-white font-semibold">Detail</span>
          </>
        ) : (
          <span className="text-white font-semibold">{baseTitle}</span>
        )}
      </div>
    </header>
  );
}
