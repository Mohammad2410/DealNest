import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Clock, Package } from 'lucide-react';
import { User, Listing } from '../types';
import { userService } from '../services/userService';
import { listingService } from '../services/listingService';
import { formatDate, getInitials } from '../lib/utils';
import ListingCard from '../components/listing/ListingCard';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      userService.getById(id),
      listingService.getAll({ sellerId: id, status: 'active' }),
    ]).then(([u, ls]) => {
      setUser(u);
      setListings(ls);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-[var(--muted)]" />
          <div className="space-y-3 flex-1">
            <div className="h-7 bg-[var(--muted)] rounded w-1/3" />
            <div className="h-4 bg-[var(--muted)] rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="font-display text-2xl font-semibold mb-2">User not found</p>
      <Link to="/" className="text-[var(--primary)] hover:underline">Go home</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      {/* Profile header */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold">
                {getInitials(user.name)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold mb-2">{user.name}</h1>
            <div className="flex items-center gap-4 flex-wrap mb-3 text-sm text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="font-semibold text-[var(--foreground)]">{user.rating}</span>
                <span>({user.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Package size={14} />
                <span><strong className="text-[var(--foreground)]">{user.completedTransactions}</strong> completed</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>{user.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Member since {new Date(user.joinedAt).getFullYear()}</span>
              </div>
            </div>
            {user.bio && <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{user.bio}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center w-full sm:w-auto">
            {[
              { label: 'Sales', value: user.completedTransactions },
              { label: 'Rating', value: `${user.rating}/5` },
              { label: 'Reviews', value: user.reviewCount },
            ].map(s => (
              <div key={s.label} className="bg-[var(--muted)] rounded-xl p-3">
                <p className="font-bold text-xl font-display">{s.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active listings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Active Listings ({listings.length})</h2>
        </div>
        {listings.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center text-[var(--muted-foreground)]">
            <Package size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No active listings at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
