import { CURRENCY_SYMBOL, PLATFORM_FEE } from '../constants';

export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-BD')}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });
}

export function calculateTotal(agreedPrice: number): { agreedPrice: number; platformFee: number; total: number } {
  return {
    agreedPrice,
    platformFee: PLATFORM_FEE,
    total: agreedPrice + PLATFORM_FEE,
  };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
