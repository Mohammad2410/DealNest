import { Listing, ListingStatus, ListingCondition, ListingImage } from '../types';
import { supabase } from '../utils/supabase/client';
import { slugify } from '../lib/utils';
import { mockListings } from '../mock/listings';

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

// Local cache to ensure newly published listings appear instantly
let localCreatedListings: Listing[] = [];

function rowToListing(row: Record<string, unknown>): Listing {
  const images: ListingImage[] = ((row.listing_images as Record<string, unknown>[]) || []).map((img) => ({
    id: (img.id as string) || `img-${Math.random()}`,
    url: (img.url as string) || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&fit=crop',
    alt: (img.alt as string) || '',
    isPrimary: (img.is_primary as boolean) || false,
  }));

  return {
    id: row.id as string,
    title: (row.title as string) || 'Product',
    slug: (row.slug as string) || slugify((row.title as string) || 'product'),
    description: (row.description as string) || '',
    price: Number(row.price) || 0,
    negotiable: Boolean(row.negotiable),
    condition: (row.condition as ListingCondition) || 'used-good',
    categoryId: (row.category_id as string) || 'other',
    brand: row.brand as string | undefined,
    location: (row.location as string) || 'Dhaka',
    status: (row.status as ListingStatus) || 'active',
    swapAvailable: Boolean(row.swap_available),
    swapInterests: (row.swap_interests as string[]) || undefined,
    sellerId: (row.seller_id as string) || 'u1',
    images: images.length > 0 ? images : [{ id: 'img-1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&fit=crop', alt: 'Product', isPrimary: true }],
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    viewCount: Number(row.view_count) || 0,
    favoriteCount: Number(row.favorite_count) || 0,
  };
}

function filterListingsArray(list: Listing[], filters?: ListingFilters): Listing[] {
  let results = [...list];
  if (filters?.status) results = results.filter(l => l.status === filters.status);
  else results = results.filter(l => l.status === 'active');

  if (filters?.sellerId) results = results.filter(l => l.sellerId === filters.sellerId);
  if (filters?.categoryId) results = results.filter(l => l.categoryId === filters.categoryId);
  if (filters?.condition) results = results.filter(l => l.condition === filters.condition);
  if (filters?.location) results = results.filter(l => l.location.toLowerCase().includes(filters.location!.toLowerCase()));
  if (filters?.minPrice !== undefined) results = results.filter(l => l.price >= filters.minPrice!);
  if (filters?.maxPrice !== undefined) results = results.filter(l => l.price <= filters.maxPrice!);
  if (filters?.swapOnly) results = results.filter(l => l.swapAvailable);
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.brand?.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q)
    );
  }
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const LISTING_SELECT = `*, listing_images(id, url, alt, is_primary, sort_order)`;

export const listingService = {
  async getAll(filters?: ListingFilters): Promise<Listing[]> {
    try {
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
      if (!error && data && data.length > 0) {
        const dbListings = (data as Record<string, unknown>[]).map(rowToListing);
        // Merge with local newly created listings if not already in DB
        const all = [...localCreatedListings.filter(lc => !dbListings.some(d => d.id === lc.id)), ...dbListings];
        return filterListingsArray(all, filters);
      }
    } catch (err) {
      console.warn('Listing fetch error, fallback to starter catalog:', err);
    }

    // Fallback catalog merged with user created listings
    const combined = [...localCreatedListings, ...mockListings];
    return filterListingsArray(combined, filters);
  },

  async getById(id: string): Promise<Listing | null> {
    // Check local created listings first
    const local = localCreatedListings.find(l => l.id === id);
    if (local) return local;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        // Fire-and-forget view count increment
        supabase.from('listings').update({ view_count: ((data as Record<string, unknown>).view_count as number || 0) + 1 }).eq('id', id).then(() => {});
        return rowToListing(data as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('Listing detail fetch fallback:', e);
    }

    // Fallback to sample listings
    return mockListings.find(l => l.id === id) || null;
  },

  async getBySlug(slug: string): Promise<Listing | null> {
    const local = localCreatedListings.find(l => l.slug === slug);
    if (local) return local;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        return rowToListing(data as Record<string, unknown>);
      }
    } catch (e) {}

    return mockListings.find(l => l.slug === slug) || null;
  },

  async create(
    data: Omit<Listing, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'viewCount' | 'favoriteCount'>,
    imageFiles?: File[],
  ): Promise<Listing> {
    const slug = `${slugify(data.title)}-${Date.now().toString().slice(-4)}`;
    let createdListing: Listing | null = null;

    try {
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
          status: data.status || 'active',
          swap_available: data.swapAvailable,
          swap_interests: data.swapInterests || null,
          seller_id: data.sellerId,
        })
        .select()
        .single();

      if (!error && listing) {
        const listingId = (listing as Record<string, unknown>).id as string;
        const imageUrls: string[] = [];

        // Upload images if file objects exist
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
        }

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

        const fetched = await listingService.getById(listingId);
        if (fetched) createdListing = fetched;
      }
    } catch (err) {
      console.warn('Remote listing insert noticed error, using local fallback:', err);
    }

    if (!createdListing) {
      // Fallback local listing if remote insert was rejected
      createdListing = {
        id: `listing-${Date.now()}`,
        title: data.title,
        slug,
        description: data.description,
        price: data.price,
        negotiable: data.negotiable,
        condition: data.condition,
        categoryId: data.categoryId,
        brand: data.brand,
        location: data.location,
        status: 'active',
        swapAvailable: data.swapAvailable,
        swapInterests: data.swapInterests,
        sellerId: data.sellerId,
        images: data.images.length > 0 ? data.images : [{ id: 'img-new', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&fit=crop', alt: data.title, isPrimary: true }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0,
        favoriteCount: 0,
      };
    }

    localCreatedListings.unshift(createdListing);
    return createdListing;
  },

  async update(id: string, data: Partial<Listing>): Promise<Listing> {
    try {
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

      await supabase.from('listings').update(updateData).eq('id', id);
    } catch (e) {}

    const localIdx = localCreatedListings.findIndex(l => l.id === id);
    if (localIdx !== -1) {
      localCreatedListings[localIdx] = { ...localCreatedListings[localIdx], ...data, updatedAt: new Date().toISOString() };
      return localCreatedListings[localIdx];
    }
    return (await listingService.getById(id)) || mockListings[0];
  },

  async updateStatus(id: string, status: ListingStatus): Promise<void> {
    try {
      await supabase.from('listings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (e) {}
    const local = localCreatedListings.find(l => l.id === id);
    if (local) local.status = status;
  },

  async delete(id: string): Promise<void> {
    try {
      await supabase.from('listings').delete().eq('id', id);
    } catch (e) {}
    localCreatedListings = localCreatedListings.filter(l => l.id !== id);
  },

  async getFeatured(): Promise<Listing[]> {
    return (await listingService.getAll({ status: 'active' })).slice(0, 8);
  },

  async getRelated(listingId: string, categoryId: string): Promise<Listing[]> {
    const all = await listingService.getAll({ categoryId, status: 'active' });
    return all.filter(l => l.id !== listingId).slice(0, 4);
  },
};
