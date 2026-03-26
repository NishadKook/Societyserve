'use client';

import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { societyService } from '@/services/society.service';
import { formatDate } from '@/lib/utils';

const categoryLabel: Record<string, string> = {
  MAID: 'Maid', COOK: 'Cook', CLEANER: 'Cleaner',
  ELECTRICIAN: 'Electrician', CARPENTER: 'Carpenter', PLUMBER: 'Plumber',
};

export default function ActiveProvidersPage() {
  const societyId = useAuthStore((s) => s.societyId) ?? '';

  const { data: providers, isLoading } = useQuery({
    queryKey: ['activeProviders', societyId],
    queryFn: () => societyService.getActiveProviders(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Active Providers</h1>
        <p className="text-gray-500 text-sm mt-1">{providers?.length ?? 0} approved providers</p>
      </div>

      {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-3xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-left px-6 py-3">Category</th>
              <th className="text-left px-6 py-3">Rating</th>
              <th className="text-left px-6 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {providers?.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-xs">
                        {item.provider.fullName.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{item.provider.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {categoryLabel[item.provider.serviceCategory] ?? item.provider.serviceCategory}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-gray-700">{Number(item.provider.avgRating).toFixed(1)}</span>
                    <span className="text-gray-400 text-xs">({item.provider.totalReviews})</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(item.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && (!providers || providers.length === 0) && (
          <div className="py-12 text-center text-gray-400">No active providers</div>
        )}
      </div>
    </div>
  );
}
