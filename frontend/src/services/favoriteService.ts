import { Favorite } from '../types';
import { supabase } from '../utils/supabase/client';

export const favoriteService = {
  async getForUser(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId);
    if (error || !data) return [];
    return (data as { listing_id: string }[]).map(f => f.listing_id);
  },

  async toggle(userId: string, listingId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
      // Decrement favorite count
      await supabase.rpc('decrement_favorite_count', { listing_id_param: listingId }).then(() => {});
      return false;
    } else {
      await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });
      // Increment favorite count
      await supabase.rpc('increment_favorite_count', { listing_id_param: listingId }).then(() => {});
      return true;
    }
  },

  async isFavorited(userId: string, listingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();
    return !!data;
  },
};
