import { Category } from '../types';
import { supabase } from '../utils/supabase/client';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(row => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      icon: row.icon as string,
      listingCount: (row.listing_count as number) || 0,
    }));
  },
};
