import { create } from 'zustand';
import { favoriteService } from '../services/favoriteService';

interface FavoriteState {
  favorites: Set<string>;
  loading: boolean;
  loadFavorites: (userId: string) => Promise<void>;
  toggleFavorite: (userId: string, listingId: string) => Promise<void>;
  isFavorited: (listingId: string) => boolean;
  clear: () => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: new Set(),
  loading: false,

  loadFavorites: async (userId: string) => {
    set({ loading: true });
    const ids = await favoriteService.getForUser(userId);
    set({ favorites: new Set(ids), loading: false });
  },

  toggleFavorite: async (userId: string, listingId: string) => {
    // Optimistic update
    const { favorites } = get();
    const newFavorites = new Set(favorites);
    const wasIn = newFavorites.has(listingId);
    if (wasIn) newFavorites.delete(listingId);
    else newFavorites.add(listingId);
    set({ favorites: newFavorites });

    try {
      await favoriteService.toggle(userId, listingId);
    } catch {
      // Revert on error
      const reverted = new Set(get().favorites);
      if (wasIn) reverted.add(listingId);
      else reverted.delete(listingId);
      set({ favorites: reverted });
    }
  },

  isFavorited: (listingId: string) => get().favorites.has(listingId),

  clear: () => set({ favorites: new Set() }),
}));
