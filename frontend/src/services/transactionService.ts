import { Transaction, TransactionStatus } from '../types';
import { supabase } from '../utils/supabase/client';
import { PLATFORM_FEE } from '../constants';

const TIMELINE_STEPS = [
  { status: 'offer-accepted' as TransactionStatus, label: 'Offer Accepted' },
  { status: 'transaction-created' as TransactionStatus, label: 'Transaction Created' },
  { status: 'seller-preparing' as TransactionStatus, label: 'Seller Preparing' },
  { status: 'out-for-delivery' as TransactionStatus, label: 'Out for Delivery' },
  { status: 'delivered' as TransactionStatus, label: 'Delivered' },
  { status: 'completed' as TransactionStatus, label: 'Completed' },
];

function rowToTransaction(row: Record<string, unknown>): Transaction {
  const status = row.status as TransactionStatus;
  const statusOrder = TIMELINE_STEPS.map(s => s.status);
  const currentIdx = statusOrder.indexOf(status);

  const timeline = TIMELINE_STEPS.map((step, i) => ({
    status: step.status,
    label: step.label,
    completed: i <= currentIdx,
    timestamp: i <= currentIdx ? row.updated_at as string : undefined,
  }));

  return {
    id: row.id as string,
    type: row.type as 'sale' | 'swap',
    status,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    item: {
      listingId: row.listing_id as string,
      title: row.listing_title as string,
      imageUrl: row.listing_image_url as string,
      agreedPrice: row.agreed_price as number,
    },
    agreedPrice: row.agreed_price as number,
    cashAdjustment: (row.cash_adjustment as number) || 0,
    platformFee: row.platform_fee as number,
    totalAmount: row.total_amount as number,
    paymentMethod: 'cash-on-delivery',
    offerId: row.offer_id as string | undefined,
    deliveryAddress: row.delivery_address as string | undefined,
    timeline,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const transactionService = {
  async getForUser(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToTransaction);
  },

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single();
    if (error || !data) return null;
    return rowToTransaction(data as Record<string, unknown>);
  },

  async create(data: {
    type: 'sale' | 'swap';
    buyerId: string;
    sellerId: string;
    item: Transaction['item'];
    swapItem?: Transaction['swapItem'];
    agreedPrice: number;
    cashAdjustment?: number;
    offerId?: string;
    deliveryAddress?: string;
  }): Promise<Transaction> {
    const totalAmount = (data.cashAdjustment ?? data.agreedPrice) + PLATFORM_FEE;

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        type: data.type,
        status: 'transaction-created',
        buyer_id: data.buyerId,
        seller_id: data.sellerId,
        listing_id: data.item.listingId,
        listing_title: data.item.title,
        listing_image_url: data.item.imageUrl,
        agreed_price: data.agreedPrice,
        cash_adjustment: data.cashAdjustment || 0,
        platform_fee: PLATFORM_FEE,
        total_amount: totalAmount,
        payment_method: 'cash-on-delivery',
        offer_id: data.offerId || null,
        delivery_address: data.deliveryAddress || null,
      })
      .select()
      .single();

    if (error || !tx) throw new Error(error?.message || 'Failed to create transaction');
    return rowToTransaction(tx as Record<string, unknown>);
  },

  async advanceStatus(id: string): Promise<Transaction> {
    const tx = await transactionService.getById(id);
    if (!tx) throw new Error('Transaction not found');

    const statusOrder: TransactionStatus[] = [
      'offer-accepted', 'transaction-created', 'seller-preparing',
      'out-for-delivery', 'delivered', 'completed',
    ];
    const currentIdx = statusOrder.indexOf(tx.status);
    if (currentIdx < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIdx + 1];
      const { error } = await supabase
        .from('transactions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
    return (await transactionService.getById(id)) as Transaction;
  },
};
