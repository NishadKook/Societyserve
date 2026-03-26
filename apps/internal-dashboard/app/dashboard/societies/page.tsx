'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CreateSocietyData } from '@/types';

const createSocietySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  totalUnits: z.coerce.number().int().min(1, 'Must have at least 1 unit'),
});

type CreateSocietyForm = z.infer<typeof createSocietySchema>;

export default function SocietiesPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['societies', page],
    queryFn: () => adminService.getSocieties(page, limit).then((r) => r.data),
  });

  const { mutate: createSociety, isPending } = useMutation({
    mutationFn: (d: CreateSocietyData) => adminService.createSociety(d),
    onSuccess: () => {
      toast.success('Society created');
      queryClient.invalidateQueries({ queryKey: ['societies'] });
      setShowModal(false);
      form.reset();
    },
    onError: () => toast.error('Failed to create society'),
  });

  const form = useForm<CreateSocietyForm>({ resolver: zodResolver(createSocietySchema) });

  const onSubmit = (d: CreateSocietyForm) => createSociety(d);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Societies</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data ? `${data.total} societies total` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
        >
          <Plus size={16} />
          Create Society
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pincode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Units</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tenants</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Providers</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No societies found
                </td>
              </tr>
            ) : (
              data?.items.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}</td>
                  <td className="px-4 py-3 text-gray-600">{s.pincode}</td>
                  <td className="px-4 py-3 text-gray-600">{s.totalUnits}</td>
                  <td className="px-4 py-3 text-gray-600">{s.approvedTenants}</td>
                  <td className="px-4 py-3 text-gray-600">{s.approvedProviders}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
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

      {/* Create Society Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Create Society</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {(
                [
                  { name: 'name', label: 'Society Name', placeholder: 'Prestige Whitefield' },
                  { name: 'address', label: 'Address', placeholder: 'Whitefield Main Road' },
                  { name: 'city', label: 'City', placeholder: 'Bangalore' },
                  { name: 'pincode', label: 'Pincode', placeholder: '560066' },
                  { name: 'totalUnits', label: 'Total Units', placeholder: '500', type: 'number' },
                ] as const
              ).map(({ name, label, placeholder, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    {...form.register(name)}
                    type={type ?? 'text'}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {form.formState.errors[name] && (
                    <p className="text-red-500 text-xs mt-1">
                      {form.formState.errors[name]?.message}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-purple-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50"
                >
                  {isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
