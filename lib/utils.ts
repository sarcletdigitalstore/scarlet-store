import type { OrderStatus } from '../types';

export function formatPrice(amount: number): string {
  return '₹' + amount.toFixed(0);
}

export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '0123456789';
  let id = 'SS-';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  id += '-';
  for (let i = 0; i < 4; i++) id += nums[Math.floor(Math.random() * nums.length)];
  return id;
}

export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) key += chars[Math.floor(Math.random() * chars.length)];
    if (i < 3) key += '-';
  }
  return key;
}

export function generateOrderId(): string {
  return crypto.randomUUID();
}

export const ORDER_MILESTONES: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'placed', label: 'Order Placed', icon: '📝' },
  { status: 'packed', label: 'Packed', icon: '📦' },
  { status: 'shipped', label: 'Shipped', icon: '🚚' },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { status: 'delivered', label: 'Delivered', icon: '✅' },
];

export function getMilestoneIndex(status: OrderStatus): number {
  return ORDER_MILESTONES.findIndex((m) => m.status === status);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
