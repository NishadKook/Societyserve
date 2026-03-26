export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  MAID: 'Maid',
  COOK: 'Cook',
  CLEANER: 'Cleaner',
  ELECTRICIAN: 'Electrician',
  CARPENTER: 'Carpenter',
  PLUMBER: 'Plumber',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  AUTO_CANCELLED: 'Expired',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706' },
  CONFIRMED: { bg: '#DBEAFE', text: '#2563EB' },
  COMPLETED: { bg: '#D1FAE5', text: '#059669' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
  AUTO_CANCELLED: { bg: '#F3F4F6', text: '#9CA3AF' },
};
