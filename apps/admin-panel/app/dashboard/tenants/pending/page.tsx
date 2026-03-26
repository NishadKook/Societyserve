'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { societyService, type TenantApproval } from '@/services/society.service';
import { formatDate } from '@/lib/utils';

export default function PendingTenantsPage() {
  const societyId = useAuthStore((s) => s.societyId) ?? '';
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['pendingTenants', societyId],
    queryFn: () => societyService.getPendingTenants(societyId).then((r) => r.data),
    enabled: !!societyId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => societyService.approveTenant(societyId, id),
    onSuccess: () => {
      toast.success('Tenant approved');
      void queryClient.invalidateQueries({ queryKey: ['pendingTenants', societyId] });
    },
    onError: () => toast.error('Failed to approve tenant'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => societyService.rejectTenant(societyId, id),
    onSuccess: () => {
      toast.success('Tenant rejected');
      void queryClient.invalidateQueries({ queryKey: ['pendingTenants', societyId] });
    },
    onError: () => toast.error('Failed to reject tenant'),
  });

  if (!societyId) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Society not linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Tenant Approvals</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review and approve tenants requesting to join your society
        </p>
      </div>

      {isLoading && (
        <div className="text-gray-400 text-sm">Loading...</div>
      )}

      {!isLoading && (!tenants || tenants.length === 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending approvals</p>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {tenants?.map((tenant: TenantApproval) => (
          <div
            key={tenant.id}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{tenant.fullName}</p>
                <p className="text-sm text-gray-500">
                  Flat {tenant.flatNumber} · {tenant.user.phone}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-400">{formatDate(tenant.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => rejectMutation.mutate(tenant.id)}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => approveMutation.mutate(tenant.id)}
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
