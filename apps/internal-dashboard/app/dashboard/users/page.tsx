'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { ChevronLeft, ChevronRight, UserX } from 'lucide-react';

const TABS = ['ALL', 'TENANT', 'PROVIDER', 'SOCIETY_ADMIN', 'SUPER_ADMIN'] as const;
type Tab = (typeof TABS)[number];

const tabLabels: Record<Tab, string> = {
  ALL: 'All',
  TENANT: 'Tenant',
  PROVIDER: 'Provider',
  SOCIETY_ADMIN: 'Society Admin',
  SUPER_ADMIN: 'Super Admin',
};

const roleBadgeColors: Record<string, string> = {
  TENANT: 'bg-blue-100 text-blue-700',
  PROVIDER: 'bg-indigo-100 text-indigo-700',
  SOCIETY_ADMIN: 'bg-purple-100 text-purple-700',
  SUPER_ADMIN: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const role = tab === 'ALL' ? undefined : tab;

  const { data, isLoading } = useQuery({
    queryKey: ['users', role, page],
    queryFn: () => adminService.getUsers(role, page, limit).then((r) => r.data),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: string) => adminService.deactivateUser(id),
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total} users` : 'Loading...'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">No users found</td>
              </tr>
            ) : (
              data?.items.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{u.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{u.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive && (
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate ${u.phone}?`)) deactivate(u.id);
                        }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        <UserX size={14} />
                        Deactivate
                      </button>
                    )}
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
