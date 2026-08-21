import { Category } from '../types';
import { supabase } from '../utils/supabase/client';
import { mockCategories } from '../mock/categories';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        return (data as Record<string, unknown>[]).map(row => ({
          id: row.id as string,
          name: row.name as string,
          slug: row.slug as string,
          icon: (row.icon as string) || '📦',
          listingCount: (row.listing_count as number) || 0,
        }));
      }
    } catch (error) {
      console.warn('categoryService notice:', error);
    }
    return mockCategories;
  },

  async getById(id: string): Promise<Category | null> {
    const all = await categoryService.getAll();
    return all.find(c => c.id === id) || null;
  },
};
