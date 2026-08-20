import { Listing, ListingStatus, ListingCondition, ListingImage } from '../types';
import { supabase } from '../utils/supabase/client';
import { slugify } from '../lib/utils';

export interface ListingFilters {
  query?: string;
  categoryId?: string;
  condition?: ListingCondition;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  swapOnly?: boolean;
  status?: ListingStatus;
  sellerId?: string;
}

function rowToListing(row: Record<string, unknown>): Listing {
  const images: ListingImage[] = ((row.listing_images as Record<string, unknown>[]) || []).map((img) => ({
    id: img.id as string,
    url: img.url as string,
    alt: (img.alt as string) || '',
    isPrimary: (img.is_primary as boolean) || false,
  }));
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string,
    price: row.price as number,
    negotiable: row.negotiable as boolean,
    condition: row.condition as ListingCondition,
    categoryId: row.category_id as string,
    brand: row.brand as string | undefined,
    location: row.location as string,
    status: row.status as ListingStatus,
    swapAvailable: row.swap_available as boolean,
    swapInterests: row.swap_interests as string[] | undefined,
    sellerId: row.seller_id as string,
    images,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    viewCount: row.view_count as number,
    favoriteCount: row.favorite_count as number,
  };
}

const LISTING_SELECT = `*, listing_images(id, url, alt, is_primary, sort_order)`;

export const listingService = {
  async getAll(filters?: ListingFilters): Promise<Listing[]> {
    let q = supabase
      .from('listings')
      .select(LISTING_SELECT)
      .order('created_at', { ascending: false });

    if (filters?.status) q = q.eq('status', filters.status);
    else q = q.eq('status', 'active');

    if (filters?.sellerId) q = q.eq('seller_id', filters.sellerId);
    if (filters?.categoryId) q = q.eq('category_id', filters.categoryId);
    if (filters?.condition) q = q.eq('condition', filters.condition);
    if (filters?.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters?.minPrice !== undefined) q = q.gte('price', filters.minPrice);
    if (filters?.maxPrice !== undefined) q = q.lte('price', filters.maxPrice);
    if (filters?.swapOnly) q = q.eq('swap_available', true);
    if (filters?.query) q = q.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,brand.ilike.%${filters.query}%`);

    const { data, error } = await q;
    if (error) { console.error('listingService.getAll:', error); return []; }
    return (data as Record<string, unknown>[]).map(rowToListing);
  },

  async getById(id: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('id', id)
      .single();
    if (error || !data) return null;
    // Increment view count (fire-and-forget)
    supabase.from('listings').update({ view_count: (data as Record<string, unknown>).view_count as number + 1 }).eq('id', id).then(() => {});
    return rowToListing(data as Record<string, unknown>);
  },

  async getBySlug(slug: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('slug', slug)
      .single();
    if (error || !data) return null;
    return rowToListing(data as Record<string, unknown>);
  },

  async create(
    data: Omit<Listing, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'favoriteCount'>,
    imageFiles?: File[],
  ): Promise<Listing> {
    const slug = slugify(data.title);
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        title: data.title,
        slug,
        description: data.description,
        price: data.price,
        negotiable: data.negotiable,
        condition: data.condition,
        category_id: data.categoryId,
        brand: data.brand || null,
        location: data.location,
        status: data.status,
        swap_available: data.swapAvailable,
        swap_interests: data.swapInterests || null,
        seller_id: data.sellerId,
      })
      .select()
      .single();

    if (error || !listing) throw new Error(error?.message || 'Failed to create listing');

    const listingId = (listing as Record<string, unknown>).id as string;

    // Upload images if provided
    const imageUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop();
        const path = `${listingId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }
    } else if (data.images.length > 0) {
      // Use pre-existing URL strings (e.g., external URLs or blob URLs passed in)
      for (const img of data.images) {
        imageUrls.push(img.url);
      }
    }

    // Insert image records
    if (imageUrls.length > 0) {
      await supabase.from('listing_images').insert(
        imageUrls.map((url, i) => ({
          listing_id: listingId,
          url,
          alt: data.title,
          is_primary: i === 0,
          sort_order: i,
        })),
      );
    }

    return await listingService.getById(listingId) as Listing;
  },

  async update(id: string, data: Partial<Listing>): Promise<Listing> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) { updateData.title = data.title; updateData.slug = slugify(data.title); }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.negotiable !== undefined) updateData.negotiable = data.negotiable;
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.swapAvailable !== undefined) updateData.swap_available = data.swapAvailable;
    if (data.swapInterests !== undefined) updateData.swap_interests = data.swapInterests;

    const { error } = await supabase.from('listings').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    return await listingService.getById(id) as Listing;
  },

  async updateStatus(id: string, status: ListingStatus): Promise<void> {
    await supabase.from('listings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await supabase.from('listings').delete().eq('id', id);
  },

  async getFeatured(): Promise<Listing[]> {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) return [];
    return (data as Record<string, unknown>[]).map(rowToListing);
  },

  async getRelated(listingId: string, categoryId: string): Promise<Listing[]> {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('category_id', categoryId)
      .neq('id', listingId)
      .limit(4);
    if (error) return [];
    return (data as Record<string, unknown>[]).map(rowToListing);
  },
};
