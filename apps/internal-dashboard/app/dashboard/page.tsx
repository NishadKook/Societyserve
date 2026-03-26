'use client';

import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { Building2, Users, Briefcase, CalendarCheck, AlertCircle } from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => adminService.getStats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading stats...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load stats.</div>
      </div>
    );
  }

  const pendingApprovals = data.pendingTenantApprovals + data.pendingProviderApprovals;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time stats across all societies</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Societies" value={data.societies} icon={Building2} color="bg-purple-700" />
        <StatCard label="Total Tenants" value={data.tenants} icon={Users} color="bg-blue-600" />
        <StatCard label="Total Providers" value={data.providers} icon={Briefcase} color="bg-indigo-600" />
        <StatCard label="Total Bookings" value={data.bookings.total} icon={CalendarCheck} color="bg-teal-600" />
        <StatCard label="Pending Approvals" value={pendingApprovals} icon={AlertCircle} color="bg-orange-500" />
      </div>

      {/* Booking Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Booking Breakdown</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries({
            pending: data.bookings.pending,
            confirmed: data.bookings.confirmed,
            completed: data.bookings.completed,
            cancelled: data.bookings.cancelled,
          }).map(([key, val]) => (
            <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusColors[key]}`}>
              <span className="capitalize">{key}</span>
              <span className="font-bold">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approvals Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Pending Approvals</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{data.pendingTenantApprovals}</p>
            <p className="text-sm text-orange-700 mt-1">Tenant Approvals</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-700">{data.pendingProviderApprovals}</p>
            <p className="text-sm text-purple-700 mt-1">Provider Approvals</p>
          </div>
        </div>
      </div>
    </div>
  );
}
