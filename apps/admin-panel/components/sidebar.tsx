'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserCheck,
  Briefcase,
  Users,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tenant Approvals', href: '/dashboard/tenants/pending', icon: UserCheck },
  { label: 'Provider Approvals', href: '/dashboard/providers/pending', icon: Briefcase },
  { label: 'Active Tenants', href: '/dashboard/tenants', icon: Users },
  { label: 'Active Providers', href: '/dashboard/providers', icon: Building2 },
  { label: 'Community', href: '/dashboard/community', icon: MessageSquare },
  { label: 'Safety Complaints', href: '/dashboard/complaints', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="font-bold text-lg">SocietyServe</h1>
        <p className="text-gray-400 text-xs mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-3">{user?.phone}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-300 hover:text-white text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
