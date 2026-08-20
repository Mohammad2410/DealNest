import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Clock, Package, Truck, Home, Star, AlertCircle } from 'lucide-react';
import { Transaction, User } from '../types';
import { transactionService } from '../services/transactionService';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import { formatPrice, formatDate, formatTime } from '../lib/utils';
import { PLATFORM_FEE } from '../constants';

const STATUS_ORDER = [
  'offer-accepted', 'transaction-created', 'seller-preparing',
  'out-for-delivery', 'delivered', 'completed',
];

const STATUS_ICONS: Record<string, React.ElementType> = {
  'offer-accepted': Check,
  'transaction-created': AlertCircle,
  'seller-preparing': Package,
  'out-for-delivery': Truck,
  'delivered': Home,
  'completed': Star,
};

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuthStore();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [buyer, setBuyer] = useState<User | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!id) return;
    transactionService.getById(id).then(async tx => {
      if (!tx) { setLoading(false); return; }
      setTransaction(tx);
      const [b, s] = await Promise.all([userService.getById(tx.buyerId), userService.getById(tx.sellerId)]);
      setBuyer(b); setSeller(s);
      setLoading(false);
    });
  }, [id]);

  async function advance() {
    if (!transaction) return;
    setAdvancing(true);
    const updated = await transactionService.advanceStatus(transaction.id);
    setTransaction(updated);
    setAdvancing(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--muted)] rounded w-1/2" />
          <div className="h-40 bg-white border border-[var(--border)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-2xl font-semibold mb-2">Transaction not found</h2>
        <Link to="/dashboard?tab=transactions" className="text-[var(--primary)] hover:underline">Back to transactions</Link>
      </div>
    );
  }

  const isCompleted = transaction.status === 'completed';
  const isBuyer = currentUser?.id === transaction.buyerId;
  const currentStepIndex = STATUS_ORDER.indexOf(transaction.status);
  const canAdvance = !isCompleted && (isBuyer ? currentStepIndex >= 4 : currentStepIndex >= 1 && currentStepIndex < 4);

  const { agreedPrice, cashAdjustment, platformFee, totalAmount, type } = transaction;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard?tab=transactions" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3 inline-flex items-center gap-1">
          ← Back to Transactions
        </Link>
        <h1 className="font-display text-3xl font-bold">Transaction</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">#{transaction.id} · {formatDate(transaction.createdAt)}</p>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${
        isCompleted ? 'bg-green-50 border border-green-200' :
        transaction.status === 'out-for-delivery' ? 'bg-blue-50 border border-blue-200' :
        'bg-amber-50 border border-amber-200'
      }`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isCompleted ? 'bg-green-100' : 'bg-amber-100'
        }`}>
          {isCompleted ? <Check size={24} className="text-green-700" /> : <Clock size={24} className="text-amber-700" />}
        </div>
        <div>
          <p className="font-semibold">{transaction.status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            {isCompleted ? 'This transaction has been completed.' :
             isBuyer ? 'Waiting for your item to be delivered.' : 'You are responsible for delivery.'}
          </p>
        </div>
      </div>

      {/* Item summary */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 mb-4">
        <h2 className="font-semibold mb-4">Deal Summary</h2>
        <div className="flex items-center gap-4 mb-4">
          <img src={transaction.item.imageUrl} alt={transaction.item.title} className="w-16 h-16 rounded-xl object-cover" />
          <div>
            <Link to={`/listing/${transaction.item.listingId}`} className="font-semibold hover:text-[var(--primary)] transition-colors">
              {transaction.item.title}
            </Link>
            <p className="text-sm text-[var(--muted-foreground)]">{type === 'swap' ? 'Swap' : 'Sale'}</p>
          </div>
        </div>

        {/* Swap item */}
        {transaction.swapItem && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-[var(--muted)] rounded-xl">
            <img src={transaction.swapItem.imageUrl} alt={transaction.swapItem.title} className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Swapped item</p>
              <p className="font-medium text-sm">{transaction.swapItem.title}</p>
            </div>
          </div>
        )}

        {/* Price breakdown */}
        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          {type === 'sale' ? (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Agreed Price</span>
              <span className="price-tag font-semibold">{formatPrice(agreedPrice)}</span>
            </div>
          ) : (
            cashAdjustment && cashAdjustment > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Cash Adjustment</span>
                <span className="price-tag font-semibold">{formatPrice(cashAdjustment)}</span>
              </div>
            )
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Platform Fee</span>
            <span className="price-tag">৳{platformFee}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-2 mt-2">
            <span>Total to Pay</span>
            <span className="price-tag">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-[var(--muted)] rounded-xl flex items-center gap-2">
          <span className="text-xl">💵</span>
          <div>
            <p className="text-sm font-semibold">Cash on Delivery</p>
            <p className="text-xs text-[var(--muted-foreground)]">Pay {formatPrice(totalAmount)} when you receive the item.</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 mb-4">
        <h2 className="font-semibold mb-5">Delivery Timeline</h2>
        <div className="space-y-4">
          {transaction.timeline.map((step, i) => {
            const Icon = STATUS_ICONS[step.status] || Check;
            const isActive = step.status === transaction.status;
            return (
              <div key={step.status} className={`flex items-start gap-4 ${!step.completed && !isActive ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  step.completed ? 'bg-[var(--primary)] text-white' :
                  isActive ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' :
                  'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {step.completed ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium text-sm ${isActive ? 'text-amber-700' : ''}`}>{step.label}</p>
                    {step.timestamp && (
                      <span className="text-xs text-[var(--muted-foreground)]">{formatTime(step.timestamp)}</span>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(step.timestamp)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 mb-4">
        <h2 className="font-semibold mb-4">Participants</h2>
        <div className="grid grid-cols-2 gap-4">
          {[{ user: buyer, label: 'Buyer' }, { user: seller, label: 'Seller' }].map(({ user, label }) => user && (
            <Link key={label} to={`/profile/${user.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-sm">{user.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && canAdvance && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 mb-4">
          <h2 className="font-semibold mb-2">
            {isBuyer ? 'Confirm Receipt' : 'Update Status'}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {isBuyer
              ? 'Confirm that you have received the item and paid the seller.'
              : 'Mark the next step in the delivery process.'}
          </p>
          <button
            onClick={advance}
            disabled={advancing}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {advancing ? 'Updating...' : isBuyer ? 'Confirm Delivery Received' : 'Mark Next Step'}
          </button>
        </div>
      )}

      {/* Review prompt */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <Star size={32} className="mx-auto mb-3 text-amber-400 fill-amber-400" />
          <h3 className="font-semibold mb-2">Transaction Complete!</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">How was your experience? Leave a review to help the community.</p>
          <button className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
            Leave a Review
          </button>
        </div>
      )}
    </div>
  );
}
