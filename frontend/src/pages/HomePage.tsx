import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingBag, RefreshCw, TrendingUp, Shield, Star } from 'lucide-react';
import { Listing, Category } from '../types';
import { listingService } from '../services/listingService';
import { categoryService } from '../services/categoryService';
import { useFavoriteStore } from '../stores/favoriteStore';
import { useAuthStore } from '../stores/authStore';
import ListingCard from '../components/listing/ListingCard';

function CategoryCard({ cat }: { cat: Category }) {
  return (
    <Link
      to={`/browse?category=${cat.id}`}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-sm transition-all group"
    >
      <span className="text-2xl">{cat.icon}</span>
      <span className="text-xs font-semibold text-center leading-tight group-hover:text-[var(--primary)] transition-colors">{cat.name}</span>
      <span className="text-[11px] text-[var(--muted-foreground)]">{cat.listingCount.toLocaleString()}</span>
    </Link>
  );
}

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

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { loadFavorites } = useFavoriteStore();
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) loadFavorites(currentUser.id);
    Promise.all([
      listingService.getFeatured(),
      categoryService.getAll(),
    ]).then(([ls, cats]) => {
      setListings(ls);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="bg-[var(--foreground)] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm mb-6">
              <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
              Bangladesh's peer-to-peer marketplace
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.1] mb-6">
              Buy. Sell.<br />
              <span className="text-[var(--primary)]">Swap.</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Your stuff has another story. Find something you want, sell what you no longer need, or trade directly with another person.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  type="text"
                  placeholder="Search phones, laptops, furniture..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white text-[var(--foreground)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <button type="submit" className="px-6 py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                Search
              </button>
            </form>

            <div className="flex items-center gap-4 mt-6">
              <Link to="/browse" className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
                Browse All <ArrowRight size={14} />
              </Link>
              <Link to="/sell" className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
                Sell Something <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Hero visual */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            {[
              { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop', label: 'MacBook Air M1', price: '৳78,000' },
              { url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=200&fit=crop', label: 'PS5 Disc Edition', price: '৳65,000' },
              { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=200&fit=crop', label: 'CSE Textbooks', price: '৳4,200' },
              { url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&h=200&fit=crop', label: 'Trek MTB Bike', price: '৳32,000' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-[var(--primary)] transition-colors">
                <div className="aspect-[3/2] overflow-hidden bg-white/5">
                  <img src={item.url} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5 bg-white/5">
                  <p className="text-xs font-semibold truncate">{item.label}</p>
                  <p className="text-xs text-[var(--primary)] font-bold price-tag">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-3 divide-x divide-[var(--border)]">
          {[
            { label: 'Active Listings', value: '1,163+' },
            { label: 'Registered Users', value: '4,200+' },
            { label: 'Completed Trades', value: '8,700+' },
          ].map(stat => (
            <div key={stat.label} className="text-center px-4">
              <p className="font-display font-bold text-2xl">{stat.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">Browse by Category</h2>
          <Link to="/browse" className="text-sm text-[var(--primary)] hover:underline font-medium flex items-center gap-1">
            All categories <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {categories.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">Recently Listed</h2>
          <Link to="/browse" className="text-sm text-[var(--primary)] hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {loading
            ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : listings.map(l => <ListingCard key={l.id} listing={l} />)
          }
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-[var(--border)] py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-3xl font-semibold text-center mb-12">How SwapBD Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShoppingBag, title: 'List Your Item', desc: 'Upload photos, set a price, and describe your item in minutes. Choose to sell, accept offers, or swap.' },
              { icon: TrendingUp, title: 'Negotiate & Agree', desc: 'Buyers can offer their price. Chat, counter, and reach a deal that works for both parties.' },
              { icon: Shield, title: 'Pay on Delivery', desc: 'No online payment needed. Meet, inspect the item, pay cash on delivery. Just ৳30 platform fee.' },
            ].map(step => (
              <div key={step.title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <step.icon size={24} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Swap section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-[var(--foreground)] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] rounded-full text-sm mb-4">
              <RefreshCw size={14} /> Swap Available
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">Got something to swap?</h2>
            <p className="text-white/70 mb-6">Trade your items directly with other users. No cash? No problem. Propose a swap with or without a cash difference.</p>
            <Link to="/browse?swap=true" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
              Browse Swap Listings <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-center gap-4 text-white shrink-0">
            <div className="w-32 h-32 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">📱</span>
              <span className="text-xs text-center text-white/70">Your Item</span>
            </div>
            <RefreshCw size={32} className="text-[var(--primary)]" />
            <div className="w-32 h-32 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">💻</span>
              <span className="text-xs text-center text-white/70">Their Item</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-white border-t border-[var(--border)] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: '৳30 Flat Fee', desc: 'We only charge ৳30 per completed transaction. No hidden fees.' },
              { icon: Star, title: 'Verified Reviews', desc: 'Reviews are only from buyers/sellers who completed a real transaction.' },
              { icon: RefreshCw, title: 'Swap Economy', desc: 'Trade without cash. Find items you want and offer what you have.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <item.icon size={20} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
