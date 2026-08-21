import { Link } from 'react-router-dom';
import { Heart, MapPin, RefreshCw, Clock } from 'lucide-react';
import { Listing } from '../../types';
import { formatPrice, formatDate, cn } from '../../lib/utils';
import { useFavoriteStore } from '../../stores/favoriteStore';
import { useAuthStore } from '../../stores/authStore';

const CONDITION_SHORT: Record<string, string> = {
  'new': 'New',
  'like-new': 'Like New',
  'used-excellent': 'Excellent',
  'used-good': 'Good',
  'used-fair': 'Fair',
  'for-parts': 'Parts',
};

const STATUS_COLORS: Record<string, string> = {
  'active': '',
  'under-negotiation': 'bg-amber-50',
  'reserved': 'bg-blue-50',
  'sold': 'bg-gray-100',
  'swapped': 'bg-purple-50',
};

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const { currentUser } = useAuthStore();
  const { isFavorited, toggleFavorite } = useFavoriteStore();
  const favorited = isFavorited(listing?.id || '');
  const primaryImage = (listing?.images && Array.isArray(listing.images) && listing.images.length > 0)
    ? (listing.images.find(i => i?.isPrimary) || listing.images[0])
    : null;
  const isOwner = currentUser?.id === listing?.sellerId;

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (currentUser) toggleFavorite(currentUser.id, listing.id);
  }

  const isSold = listing.status === 'sold' || listing.status === 'swapped';

  return (
    <Link to={`/listing/${listing.id}`} className={cn('block group bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all', STATUS_COLORS[listing.status])}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--muted)] overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt}
            className={cn('w-full h-full object-cover group-hover:scale-105 transition-transform duration-300', isSold && 'opacity-60 grayscale')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">
            <span className="text-4xl">📷</span>
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart size={15} className={favorited ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted-foreground)]'} />
        </button>

        {/* Status badge */}
        {listing.status !== 'active' && (
          <div className="absolute top-2 left-2">
            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide', {
              'bg-amber-100 text-amber-800': listing.status === 'under-negotiation',
              'bg-blue-100 text-blue-800': listing.status === 'reserved',
              'bg-gray-200 text-gray-600': listing.status === 'sold',
              'bg-purple-100 text-purple-800': listing.status === 'swapped',
            })}>
              {listing.status === 'under-negotiation' ? 'Negotiating' : listing.status.toUpperCase()}
            </span>
          </div>
        )}

        {/* Swap badge */}
        {listing.swapAvailable && listing.status === 'active' && (
          <div className="absolute bottom-2 left-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-[var(--primary)] text-white rounded-full">
              <RefreshCw size={9} /> Swap
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-[var(--primary)] transition-colors">
          {listing.title}
        </h3>
        <p className="price-tag font-bold text-lg text-[var(--foreground)]">{formatPrice(listing.price)}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
            {CONDITION_SHORT[listing.condition]}
          </span>
          {listing.negotiable && (
            <span className="text-[11px] text-[var(--primary)] bg-green-50 px-2 py-0.5 rounded-full font-medium">
              Negotiable
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--muted-foreground)]">
          <MapPin size={11} />
          <span className="truncate">{listing.location.split(',')[0]}</span>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            {isOwner && currentUser?.avatar && (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full object-cover" />
            )}
            <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[80px]">
              {isOwner ? currentUser?.name : 'Seller'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <Clock size={10} />
            <span>{formatDate(listing.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
