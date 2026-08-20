import { User } from '../types';
import { supabase } from '../utils/supabase/client';

function rowToUser(row: Record<string, unknown>, email?: string): User {
  return {
    id: row.id as string,
    name: (row.name as string) || 'User',
    avatar: (row.avatar_url as string) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}`,
    email: (row.email as string) || email || '',
    phone: row.phone as string | undefined,
    location: (row.location as string) || 'Dhaka',
    joinedAt: (row.created_at as string) || new Date().toISOString(),
    rating: Number(row.rating) || 5,
    reviewCount: Number(row.review_count) || 0,
    completedTransactions: Number(row.completed_transactions) || 0,
    bio: row.bio as string | undefined,
  };
}

export const userService = {
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return rowToUser(data as Record<string, unknown>);
  },

  async getAll(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(r => rowToUser(r));
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar_url = data.avatar;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.bio !== undefined) updateData.bio = data.bio;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    return (await userService.getById(id)) as User;
  },
};
