'use client';

import { useQuery } from '@tanstack/react-query';
import { User, Phone } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { societyService } from '@/services/society.service';
import { formatDate } from '@/lib/utils';

export default function ActiveTenantsPage() {
  const societyId = useAuthStore((s) => s.societyId) ?? '';

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['activeTenants', societyId],
    queryFn: () => societyService.getActiveTenants(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Active Tenants</h1>
        <p className="text-gray-500 text-sm mt-1">{tenants?.length ?? 0} approved tenants</p>
      </div>

      {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-3xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-left px-6 py-3">Flat</th>
              <th className="text-left px-6 py-3">Phone</th>
              <th className="text-left px-6 py-3">Approved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium text-gray-900">{t.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{t.flatNumber}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3 h-3" />
                    {t.user.phone}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(t.approvedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && (!tenants || tenants.length === 0) && (
          <div className="py-12 text-center text-gray-400">No active tenants</div>
        )}
      </div>
    </div>
  );
}
