import { Notification } from '../types';
import { supabase } from '../utils/supabase/client';

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    body: row.body as string,
    listingId: row.listing_id as string | undefined,
    offerId: row.offer_id as string | undefined,
    transactionId: row.transaction_id as string | undefined,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  };
}

export const notificationService = {
  async getForUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToNotification);
  },

  async markRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllRead(userId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  },

  async unreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    return count || 0;
  },
};
