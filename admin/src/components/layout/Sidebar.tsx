import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Car, ClipboardCheck, Users, Briefcase,
  BarChart2, Bell, Shield, LogOut, Zap, ScrollText, Settings2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getPendingApprovals } from '../../lib/api';

const nav = [
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard',          exact: true },
  { to: '/drivers',          icon: Car,             label: 'Drivers'                         },
  { to: '/drivers/pending',  icon: ClipboardCheck,  label: 'Pending Approvals',  badge: true },
  { to: '/customers',        icon: Users,           label: 'Customers'                       },
  { to: '/jobs',             icon: Briefcase,       label: 'Jobs'                            },
  { to: '/analytics',        icon: BarChart2,       label: 'Analytics'                       },
  { to: '/notifications',    icon: Bell,            label: 'Notifications'                   },
  { to: '/admins',           icon: Shield,          label: 'Admin Users'                     },
  { to: '/settings',         icon: Settings2,       label: 'Settings'                        },
  { to: '/audit-log',        icon: ScrollText,      label: 'Audit Log'                       },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const { data: pending } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => getPendingApprovals().then(r => r.data),
    refetchInterval: 60_000,
  });

  const pendingCount = pending?.length ?? 0;

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">RoadLift</p>
          <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={17} />
            <span className="flex-1">{item.label}</span>
            {item.badge && pendingCount > 0 && (
              <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
