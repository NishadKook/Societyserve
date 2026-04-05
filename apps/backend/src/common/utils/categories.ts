import { ServiceCategory } from '@prisma/client';

export const RECURRING_CATEGORIES: ServiceCategory[] = [
  ServiceCategory.MAID,
  ServiceCategory.COOK,
  ServiceCategory.CLEANER,
];

export const isRecurringCategory = (cat: ServiceCategory): boolean =>
  RECURRING_CATEGORIES.includes(cat);
