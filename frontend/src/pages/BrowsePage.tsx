import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { Listing, Category, ListingCondition } from '../types';
import { listingService, ListingFilters } from '../services/listingService';
import { categoryService } from '../services/categoryService';
import { useFavoriteStore } from '../stores/favoriteStore';
import { useAuthStore } from '../stores/authStore';
import ListingCard from '../components/listing/ListingCard';
import { CONDITION_LABELS } from '../types';
import { LOCATIONS } from '../constants';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[var(--muted)]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[var(--muted)] rounded w-3/4" />
        <div className="h-5 bg-[var(--muted)] rounded w-1/3" />
        <div className="h-3 bg-[var(--muted)] rounded w-1/2" />
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuthStore();
  const { loadFavorites } = useFavoriteStore();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [localFilters, setLocalFilters] = useState({
    query: searchParams.get('q') || '',
    categoryId: searchParams.get('category') || '',
    condition: '' as ListingCondition | '',
    location: '',
    minPrice: '',
    maxPrice: '',
    swapOnly: searchParams.get('swap') === 'true',
  });

  useEffect(() => {
    if (currentUser) loadFavorites(currentUser.id);
    categoryService.getAll().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [searchParams]);

  async function load() {
    setLoading(true);
    const filters: ListingFilters = {
      query: searchParams.get('q') || undefined,
      categoryId: searchParams.get('category') || undefined,
      condition: (searchParams.get('condition') as ListingCondition) || undefined,
      location: searchParams.get('location') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      swapOnly: searchParams.get('swap') === 'true' || undefined,
    };
    const results = await listingService.getAll(filters);
    setListings(results);
    setLoading(false);
  }

  function applyFilters() {
    const params: Record<string, string> = {};
    if (localFilters.query) params.q = localFilters.query;
    if (localFilters.categoryId) params.category = localFilters.categoryId;
    if (localFilters.condition) params.condition = localFilters.condition;
    if (localFilters.location) params.location = localFilters.location;
    if (localFilters.minPrice) params.minPrice = localFilters.minPrice;
    if (localFilters.maxPrice) params.maxPrice = localFilters.maxPrice;
    if (localFilters.swapOnly) params.swap = 'true';
    setSearchParams(params);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setLocalFilters({ query: '', categoryId: '', condition: '', location: '', minPrice: '', maxPrice: '', swapOnly: false });
    setSearchParams({});
  }

  const activeFilterCount = [
    localFilters.categoryId, localFilters.condition, localFilters.location,
    localFilters.minPrice, localFilters.maxPrice, localFilters.swapOnly,
  ].filter(Boolean).length;

  const currentQuery = searchParams.get('q');
  const currentCategory = categories.find(c => c.id === searchParams.get('category'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {currentQuery ? `Results for "${currentQuery}"` : currentCategory ? currentCategory.name : searchParams.get('swap') === 'true' ? 'Swap Listings' : 'All Listings'}
          </h1>
          {!loading && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{listings.length} listings found</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
              <X size={14} /> Clear filters ({activeFilterCount})
            </button>
          )}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        {filtersOpen && (
          <div className="w-64 shrink-0 bg-white border border-[var(--border)] rounded-xl p-5 h-fit sticky top-20 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <button onClick={() => setFiltersOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">Category</label>
              <select
                value={localFilters.categoryId}
                onChange={e => setLocalFilters(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">Condition</label>
              <select
                value={localFilters.condition}
                onChange={e => setLocalFilters(f => ({ ...f, condition: e.target.value as ListingCondition | '' }))}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Any Condition</option>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">Location</label>
              <select
                value={localFilters.location}
                onChange={e => setLocalFilters(f => ({ ...f, location: e.target.value }))}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Any Location</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">Price Range (৳)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={localFilters.minPrice}
                  onChange={e => setLocalFilters(f => ({ ...f, minPrice: e.target.value }))}
                  className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={localFilters.maxPrice}
                  onChange={e => setLocalFilters(f => ({ ...f, maxPrice: e.target.value }))}
                  className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Swap only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.swapOnly}
                onChange={e => setLocalFilters(f => ({ ...f, swapOnly: e.target.checked }))}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <span className="text-sm flex items-center gap-1.5">
                <RefreshCw size={14} className="text-[var(--primary)]" /> Swap available only
              </span>
            </label>

            <button
              onClick={applyFilters}
              className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1">
          {/* Category chips */}
          {!searchParams.get('category') && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setLocalFilters(f => ({ ...f, categoryId: cat.id })); setSearchParams(p => { p.set('category', cat.id); return p; }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--border)] rounded-full text-xs font-medium whitespace-nowrap hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="font-display text-xl font-semibold mb-2">No listings found</h3>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">Try adjusting your filters or search query.</p>
              <button onClick={clearFilters} className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-semibold text-sm">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
