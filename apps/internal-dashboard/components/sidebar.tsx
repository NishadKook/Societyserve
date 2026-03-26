'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  MessageSquareWarning,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/societies', label: 'Societies', icon: Building2, exact: false },
  { href: '/dashboard/users', label: 'Users', icon: Users, exact: false },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck, exact: false },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ width: 240, minWidth: 240, backgroundColor: '#1E1B4B' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-indigo-800">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg font-bold">SocietyServe</span>
          <span className="bg-purple-700 text-purple-100 text-xs font-semibold px-2 py-0.5 rounded-full">
            Internal
          </span>
        </div>
        <p className="text-indigo-400 text-xs mt-1">Super Admin Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-700 text-white'
                  : 'text-indigo-300 hover:bg-indigo-800 hover:text-white',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t border-indigo-800">
        {user && (
          <p className="text-indigo-400 text-xs mb-3 truncate">{user.phone}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-indigo-300 hover:text-white text-sm w-full transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
