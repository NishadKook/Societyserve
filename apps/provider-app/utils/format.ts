export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
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
  PENDING: 'New Request',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  AUTO_CANCELLED: 'Auto Cancelled',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706' },
  CONFIRMED: { bg: '#DCFCE7', text: '#16A34A' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#2563EB' },
  COMPLETED: { bg: '#D1FAE5', text: '#059669' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
  AUTO_CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
};
