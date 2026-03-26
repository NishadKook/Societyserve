'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  const status = statusFilter === 'ALL' ? undefined : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status, page],
    queryFn: () => adminService.getBookings(status, page, limit).then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total} bookings total` : 'Loading...'}
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Society</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">No bookings found</td>
              </tr>
            ) : (
              data?.items.map((b, idx) => (
                <tr
                  key={b.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{shortId(b.id)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.service.title}</div>
                    <div className="text-gray-400 text-xs">{b.service.category}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{b.tenant.fullName}</div>
                    <div className="text-gray-400 text-xs font-mono">{b.tenant.user.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{b.provider.fullName}</div>
                    <div className="text-gray-400 text-xs font-mono">{b.provider.user.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.tenant.society.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(b.scheduledAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
