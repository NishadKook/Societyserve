'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { complaintsService, type Complaint } from '@/services/complaints.service';
import { formatDate } from '@/lib/utils';

const statusColor: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700',
  IN_REVIEW: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-50 text-gray-500',
};

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [resolutionText, setResolutionText] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['adminComplaints'],
    queryFn: () => complaintsService.listAdminComplaints().then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      complaintsService.resolveComplaint(id, resolution),
    onSuccess: (_, { id }) => {
      toast.success('Complaint resolved');
      setResolving(null);
      setResolutionText((prev) => { const n = { ...prev }; delete n[id]; return n; });
      void queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
    },
    onError: () => toast.error('Failed to resolve complaint'),
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Safety Complaints</h1>
        <p className="text-gray-500 text-sm mt-1">
          Security and safety issues reported in your society
        </p>
      </div>

      {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}

      {!isLoading && (!complaints || complaints.length === 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <ShieldAlert className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No safety complaints</p>
        </div>
      )}

      <div className="space-y-4 max-w-2xl">
        {complaints?.map((complaint: Complaint) => (
          <div key={complaint.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[complaint.status] ?? ''}`}>
                    {complaint.status}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{complaint.description}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(complaint.createdAt)}</span>
            </div>

            <div className="text-xs text-gray-500 space-y-0.5 mb-3">
              <p>Tenant: <span className="text-gray-700">{complaint.tenant.fullName}</span> · Flat {complaint.tenant.flatNumber}</p>
              <p>Against: <span className="text-gray-700">{complaint.provider.fullName}</span> ({complaint.provider.serviceCategory})</p>
            </div>

            {complaint.resolution && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3">
                <p className="text-xs text-green-700"><span className="font-medium">Resolution:</span> {complaint.resolution}</p>
              </div>
            )}

            {complaint.status === 'OPEN' && (
              <div>
                {resolving === complaint.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={resolutionText[complaint.id] ?? ''}
                      onChange={(e) => setResolutionText((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                      placeholder="Describe the resolution..."
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveMutation.mutate({ id: complaint.id, resolution: resolutionText[complaint.id] ?? '' })}
                        disabled={resolveMutation.isPending || !resolutionText[complaint.id]?.trim()}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => setResolving(null)}
                        className="text-gray-500 text-xs hover:underline px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolving(complaint.id)}
                    className="text-blue-600 text-xs font-medium hover:underline"
                  >
                    Add resolution
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
