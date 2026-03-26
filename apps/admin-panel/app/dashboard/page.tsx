'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, Clock, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { societyService } from '@/services/society.service';
import { complaintsService } from '@/services/complaints.service';

export default function DashboardPage() {
  const societyId = useAuthStore((s) => s.societyId) ?? '';

  const { data: pendingTenants } = useQuery({
    queryKey: ['pendingTenants', societyId],
    queryFn: () => societyService.getPendingTenants(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  const { data: pendingProviders } = useQuery({
    queryKey: ['pendingProviders', societyId],
    queryFn: () => societyService.getPendingProviders(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  const { data: activeTenants } = useQuery({
    queryKey: ['activeTenants', societyId],
    queryFn: () => societyService.getActiveTenants(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  const { data: complaints } = useQuery({
    queryKey: ['adminComplaints'],
    queryFn: () => complaintsService.listAdminComplaints().then((r) => r.data),
  });

  const stats = [
    {
      label: 'Pending Tenant Approvals',
      value: pendingTenants?.length ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
      href: '/dashboard/tenants/pending',
    },
    {
      label: 'Pending Provider Approvals',
      value: pendingProviders?.length ?? 0,
      icon: Briefcase,
      color: 'text-blue-600 bg-blue-50',
      href: '/dashboard/providers/pending',
    },
    {
      label: 'Active Tenants',
      value: activeTenants?.length ?? 0,
      icon: Users,
      color: 'text-green-600 bg-green-50',
      href: '/dashboard/tenants',
    },
    {
      label: 'Open Safety Complaints',
      value: complaints?.filter((c) => c.status === 'OPEN').length ?? 0,
      icon: ShieldAlert,
      color: 'text-red-600 bg-red-50',
      href: '/dashboard/complaints',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your society</p>
      </div>

      {!societyId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-800 text-sm">
          Society not linked yet. Contact SocietyServe support to activate your admin account.
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <a key={stat.label} href={stat.href} className="block">
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
