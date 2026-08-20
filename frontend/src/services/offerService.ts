import { Offer, OfferStatus, OfferHistoryEntry } from '../types';
import { supabase } from '../utils/supabase/client';

function rowToOffer(row: Record<string, unknown>): Offer {
  const history: OfferHistoryEntry[] = ((row.offer_history as Record<string, unknown>[]) || [])
    .sort((a, b) => new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime())
    .map(h => ({
      id: h.id as string,
      amount: h.amount as number,
      message: h.message as string | undefined,
      fromUserId: h.from_user_id as string,
      type: h.type as OfferHistoryEntry['type'],
      createdAt: h.created_at as string,
    }));
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    amount: row.amount as number,
    status: row.status as OfferStatus,
    message: row.message as string | undefined,
    history,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const OFFER_SELECT = `*, offer_history(*)`;

export const offerService = {
  async getByListing(listingId: string): Promise<Offer[]> {
    const { data, error } = await supabase
      .from('offers')
      .select(OFFER_SELECT)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data as Record<string, unknown>[]).map(rowToOffer);
  },

  async getById(id: string): Promise<Offer | null> {
    const { data, error } = await supabase
      .from('offers')
      .select(OFFER_SELECT)
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return rowToOffer(data as Record<string, unknown>);
  },

  async getForUser(userId: string): Promise<{ sent: Offer[]; received: Offer[] }> {
    const { data, error } = await supabase
      .from('offers')
      .select(OFFER_SELECT)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error || !data) return { sent: [], received: [] };
    const offers = (data as Record<string, unknown>[]).map(rowToOffer);
    return {
      sent: offers.filter(o => o.buyerId === userId),
      received: offers.filter(o => o.sellerId === userId),
    };
  },

  async create(data: {
    listingId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    message?: string;
  }): Promise<Offer> {
    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        listing_id: data.listingId,
        buyer_id: data.buyerId,
        seller_id: data.sellerId,
        amount: data.amount,
        message: data.message || null,
        status: 'pending',
      })
      .select()
      .single();
    if (error || !offer) throw new Error(error?.message || 'Failed to create offer');

    // Insert initial history entry
    await supabase.from('offer_history').insert({
      offer_id: (offer as Record<string, unknown>).id,
      amount: data.amount,
      message: data.message || null,
      from_user_id: data.buyerId,
      type: 'offer',
    });

    return (await offerService.getById((offer as Record<string, unknown>).id as string)) as Offer;
  },

  async counter(offerId: string, fromUserId: string, amount: number, message?: string): Promise<Offer> {
    const { error } = await supabase
      .from('offers')
      .update({ amount, status: 'countered', updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) throw new Error(error.message);

    await supabase.from('offer_history').insert({
      offer_id: offerId,
      amount,
      message: message || null,
      from_user_id: fromUserId,
      type: 'counter',
    });

    return (await offerService.getById(offerId)) as Offer;
  },

  async accept(offerId: string, fromUserId: string): Promise<Offer> {
    const offer = await offerService.getById(offerId);
    if (!offer) throw new Error('Offer not found');

    await supabase.from('offers').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', offerId);
    await supabase.from('offer_history').insert({
      offer_id: offerId,
      amount: offer.amount,
      from_user_id: fromUserId,
      type: 'accepted',
    });

    return (await offerService.getById(offerId)) as Offer;
  },

  async reject(offerId: string, fromUserId: string): Promise<Offer> {
    const offer = await offerService.getById(offerId);
    if (!offer) throw new Error('Offer not found');

    await supabase.from('offers').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', offerId);
    await supabase.from('offer_history').insert({
      offer_id: offerId,
      amount: offer.amount,
      from_user_id: fromUserId,
      type: 'rejected',
    });

    return (await offerService.getById(offerId)) as Offer;
  },

  async withdraw(offerId: string): Promise<void> {
    await supabase.from('offers').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', offerId);
  },
};
