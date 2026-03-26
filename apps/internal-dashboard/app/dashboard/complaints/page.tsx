'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const typeColors: Record<string, string> = {
  SERVICE: 'bg-blue-100 text-blue-700',
  PAYMENT: 'bg-orange-100 text-orange-700',
  SAFETY: 'bg-red-100 text-red-700',
};

export default function ComplaintsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const status = statusFilter === 'ALL' ? undefined : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', status],
    queryFn: () => adminService.getComplaints(status).then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Complaints (Ops)</h1>
        <p className="text-gray-500 text-sm mt-1">
          Service & payment complaints — {data ? `${data.length} total` : 'Loading...'}
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ').charAt(0) + s.replace('_', ' ').slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Society</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Filed By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">No complaints found</td>
              </tr>
            ) : (
              data.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[c.type] ?? 'bg-gray-100 text-gray-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    <p className="truncate">{c.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.tenant.society.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{c.tenant.fullName}</div>
                    <div className="text-gray-400 text-xs">Flat {c.tenant.flatNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.provider.fullName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
