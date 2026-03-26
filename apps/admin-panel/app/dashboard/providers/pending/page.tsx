'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { societyService, type ProviderApproval } from '@/services/society.service';
import { formatDate } from '@/lib/utils';

const categoryLabel: Record<string, string> = {
  MAID: 'Maid',
  COOK: 'Cook',
  CLEANER: 'Cleaner',
  ELECTRICIAN: 'Electrician',
  CARPENTER: 'Carpenter',
  PLUMBER: 'Plumber',
};

export default function PendingProvidersPage() {
  const societyId = useAuthStore((s) => s.societyId) ?? '';
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['pendingProviders', societyId],
    queryFn: () => societyService.getPendingProviders(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  const approveMutation = useMutation({
    mutationFn: (membershipId: string) => societyService.approveProvider(societyId, membershipId),
    onSuccess: () => {
      toast.success('Provider approved');
      void queryClient.invalidateQueries({ queryKey: ['pendingProviders', societyId] });
    },
    onError: () => toast.error('Failed to approve provider'),
  });

  const rejectMutation = useMutation({
    mutationFn: (membershipId: string) => societyService.rejectProvider(societyId, membershipId),
    onSuccess: () => {
      toast.success('Provider rejected');
      void queryClient.invalidateQueries({ queryKey: ['pendingProviders', societyId] });
    },
    onError: () => toast.error('Failed to reject provider'),
  });

  if (!societyId) {
    return <div className="p-8"><p className="text-gray-500">Society not linked yet.</p></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Provider Approvals</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review and approve service providers requesting to join your society
        </p>
      </div>

      {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}

      {!isLoading && (!providers || providers.length === 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending provider approvals</p>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {providers?.map((item: ProviderApproval) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {item.provider.fullName.charAt(0)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{item.provider.fullName}</p>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {categoryLabel[item.provider.serviceCategory] ?? item.provider.serviceCategory}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {item.provider.user.phone} · {item.provider.experienceYears}y exp
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {Number(item.provider.avgRating) > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-gray-500">{Number(item.provider.avgRating).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => rejectMutation.mutate(item.id)}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => approveMutation.mutate(item.id)}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
