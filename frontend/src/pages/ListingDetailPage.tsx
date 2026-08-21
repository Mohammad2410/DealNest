import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, Heart, Share2, MessageSquare, RefreshCw,
  Star, ChevronLeft, ChevronRight, Check, X, AlertCircle, TrendingDown
} from 'lucide-react';
import { Listing, User, Offer, Category } from '../types';
import { listingService } from '../services/listingService';
import { userService } from '../services/userService';
import { offerService } from '../services/offerService';
import { categoryService } from '../services/categoryService';
import { conversationService } from '../services/conversationService';
import { transactionService } from '../services/transactionService';
import { useAuthStore } from '../stores/authStore';
import { useFavoriteStore } from '../stores/favoriteStore';
import { formatPrice, formatDate, calculateTotal } from '../lib/utils';
import { CONDITION_LABELS, STATUS_LABELS } from '../types';
import { PLATFORM_FEE } from '../constants';
import ListingCard from '../components/listing/ListingCard';

interface OfferModalProps {
  listing: Listing;
  existingOffer?: Offer;
  onClose: () => void;
  onSubmit: (amount: number, message: string) => Promise<void>;
  mode: 'offer' | 'counter';
  currentAmount?: number;
}

function OfferModal({ listing, existingOffer, onClose, onSubmit, mode, currentAmount }: OfferModalProps) {
  const [amount, setAmount] = useState(currentAmount ? String(currentAmount) : '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) { setError('Enter a valid positive amount'); return; }
    setLoading(true);
    try {
      await onSubmit(num, message);
      onClose();
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-display text-xl font-semibold">{mode === 'counter' ? 'Counter Offer' : 'Make an Offer'}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{listing.title}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[var(--muted)] rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Asking price</span>
              <span className="font-bold price-tag">{formatPrice(listing.price)}</span>
            </div>
            {existingOffer && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--muted-foreground)]">Current offer</span>
                <span className="font-bold price-tag text-amber-600">{formatPrice(existingOffer.amount)}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Your offer (৳)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--muted-foreground)]">৳</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter your offer amount"
                className="w-full pl-8 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] font-mono"
              />
            </div>
            {error && <p className="text-xs text-[var(--accent)] mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a note to the seller..."
              rows={3}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? 'Sending...' : mode === 'counter' ? 'Send Counter' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SwapModalProps {
  listing: Listing;
  userListings: Listing[];
  onClose: () => void;
  onSubmit: (userListingId: string, cashAdjustment: number, direction: 'proposer-pays' | 'receiver-pays' | 'none', message: string) => Promise<void>;
}

function SwapModal({ listing, userListings, onClose, onSubmit }: SwapModalProps) {
  const [selectedListing, setSelectedListing] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [direction, setDirection] = useState<'proposer-pays' | 'receiver-pays' | 'none'>('none');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedListing) return;
    setLoading(true);
    try {
      await onSubmit(selectedListing, Number(cashAmount) || 0, direction, message);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="font-display text-xl font-semibold">Propose a Swap</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">for {listing.title}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Visual swap */}
          <div className="flex items-center gap-4 p-4 bg-[var(--muted)] rounded-xl">
            <div className="flex-1 text-center">
              <img src={listing.images[0]?.url} alt={listing.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
              <p className="text-xs font-semibold truncate">{listing.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] price-tag">{formatPrice(listing.price)}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw size={24} className="text-[var(--primary)]" />
              <span className="text-xs text-[var(--muted-foreground)]">swap</span>
            </div>
            <div className="flex-1 text-center">
              {selectedListing ? (
                (() => {
                  const sl = userListings.find(l => l.id === selectedListing);
                  return sl ? (
                    <>
                      <img src={sl.images[0]?.url} alt={sl.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      <p className="text-xs font-semibold truncate">{sl.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] price-tag">{formatPrice(sl.price)}</p>
                    </>
                  ) : null;
                })()
              ) : (
                <div className="w-full aspect-square bg-[var(--border)] rounded-lg flex items-center justify-center">
                  <span className="text-3xl">?</span>
                </div>
              )}
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Your item</p>
            </div>
          </div>

          {/* Select your listing */}
          <div>
            <label className="text-sm font-semibold block mb-2">Your item to swap</label>
            {userListings.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">You have no active listings to swap. <Link to="/sell" className="text-[var(--primary)] underline">Create one first.</Link></p>
            ) : (
              <select
                value={selectedListing}
                onChange={e => setSelectedListing(e.target.value)}
                required
                className="w-full text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Select one of your listings...</option>
                {userListings.map(l => <option key={l.id} value={l.id}>{l.title} — {formatPrice(l.price)}</option>)}
              </select>
            )}
          </div>

          {/* Cash adjustment */}
          <div>
            <label className="text-sm font-semibold block mb-2">Cash adjustment (optional)</label>
            <div className="flex gap-2">
              <select
                value={direction}
                onChange={e => setDirection(e.target.value as typeof direction)}
                className="text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="none">No cash</option>
                <option value="proposer-pays">I'll pay extra</option>
                <option value="receiver-pays">They pay extra</option>
              </select>
              {direction !== 'none' && (
                <input
                  type="number"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  placeholder="Amount (৳)"
                  className="flex-1 text-sm border border-[var(--border)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] font-mono"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell them about your item..."
              rows={2}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !selectedListing} className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? 'Sending...' : 'Propose Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { isFavorited, toggleFavorite, loadFavorites } = useFavoriteStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [myOffer, setMyOffer] = useState<Offer | null>(null);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [offerMode, setOfferMode] = useState<'offer' | 'counter'>('offer');
  const [acceptLoading, setAcceptLoading] = useState<string | null>(null);
  const isOwner = currentUser?.id === listing?.sellerId;
  const { openLoginModal } = useAuthStore();
  const favorited = listing ? isFavorited(listing.id) : false;

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        if (currentUser) loadFavorites(currentUser.id);

        const l = await listingService.getById(id);
        if (!l || !isMounted) {
          if (isMounted) setLoading(false);
          return;
        }

        setListing(l);

        // Fetch auxiliary data in parallel safely
        const [s, cat, related, offers] = await Promise.all([
          userService.getById(l.sellerId).catch(() => null),
          categoryService.getById(l.categoryId).catch(() => null),
          listingService.getRelated(l.id, l.categoryId).catch(() => []),
          offerService.getByListing(id).catch(() => []),
        ]);

        if (!isMounted) return;

        setSeller(s);
        setCategory(cat);
        setRelatedListings(related || []);

        if (currentUser && offers) {
          const mine = offers.find(o => o.buyerId === currentUser.id);
          setMyOffer(mine || null);
          if (l.sellerId === currentUser.id) {
            setReceivedOffers(offers.filter(o => o.status === 'pending' || o.status === 'countered'));
          }
          const ul = await listingService.getAll({ sellerId: currentUser.id, status: 'active' }).catch(() => []);
          if (isMounted) setUserListings(ul.filter(u => u.id !== l.id));
        }
      } catch (err) {
        console.error('Failed to load listing detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, currentUser?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleMakeOffer(amount: number, message: string) {
    if (!listing || !currentUser) return;
    const offer = await offerService.create({
      listingId: listing.id,
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      amount,
      message,
    });
    await conversationService.getOrCreate(listing.id, [currentUser.id, listing.sellerId]);
    setMyOffer(offer);
    showToast('Offer sent!');
  }

  async function handleCounter(amount: number, message: string) {
    if (!myOffer || !currentUser) return;
    const updated = await offerService.counter(myOffer.id, currentUser.id, amount, message);
    setMyOffer(updated);
    showToast('Counter offer sent!');
  }

  async function handleAcceptOffer(offerId: string) {
    if (!listing || !currentUser) return;
    setAcceptLoading(offerId);
    await listingService.updateStatus(listing.id, 'reserved');
    setAcceptLoading(null);
    showToast('Offer accepted! Proceeding to checkout...');
    setTimeout(() => navigate(`/checkout?listingId=${listing.id}&offerId=${offerId}`), 800);
  }

  async function handleRejectOffer(offerId: string) {
    if (!currentUser) return;
    await offerService.reject(offerId, currentUser.id);
    setReceivedOffers(prev => prev.filter(o => o.id !== offerId));
    showToast('Offer rejected.');
  }

  async function handleSellerCounter(offerId: string, amount: number, message: string) {
    if (!currentUser) return;
    const updated = await offerService.counter(offerId, currentUser.id, amount, message);
    setReceivedOffers(prev => prev.map(o => o.id === offerId ? updated : o));
    showToast('Counter offer sent!');
  }

  async function handleSwapProposal(userListingId: string, cashAdjustment: number, direction: string, message: string) {
    showToast('Swap proposal sent!');
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link copied!');
    }
  }

  async function handleMessage() {
    if (!listing || !currentUser) return;
    const conv = await conversationService.getOrCreate(listing.id, [currentUser.id, listing.sellerId]);
    navigate(`/messages/${conv.id}`);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-[var(--muted)] rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-[var(--muted)] rounded w-2/3" />
            <div className="h-10 bg-[var(--muted)] rounded w-1/3" />
            <div className="h-4 bg-[var(--muted)] rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl mb-4 block">😕</span>
        <h2 className="font-display text-2xl font-semibold mb-2">Listing not found</h2>
        <p className="text-[var(--muted-foreground)] mb-6">This listing may have been removed or doesn't exist.</p>
        <Link to="/browse" className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm">Browse Listings</Link>
      </div>
    );
  }

  const images = listing.images;
  const isSold = listing.status === 'sold' || listing.status === 'swapped';
  const canOffer = !isOwner && listing.negotiable && listing.status === 'active' && currentUser;
  const canBuy = !isOwner && listing.status === 'active' && currentUser;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-6">
        <Link to="/" className="hover:text-[var(--foreground)]">Home</Link>
        <span>/</span>
        <Link to="/browse" className="hover:text-[var(--foreground)]">Browse</Link>
        {category && <>
          <span>/</span>
          <Link to={`/browse?category=${category.id}`} className="hover:text-[var(--foreground)]">{category.name}</Link>
        </>}
        <span>/</span>
        <span className="text-[var(--foreground)] truncate max-w-[200px]">{listing.title}</span>
      </nav>

      <div className="grid md:grid-cols-[1fr,420px] gap-10">
        {/* Left: Images */}
        <div>
          {/* Main image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--muted)] mb-3">
            {images.length > 0 ? (
              <img src={images[imageIdx].url} alt={images[imageIdx].alt} className={`w-full h-full object-cover ${isSold ? 'grayscale opacity-70' : ''}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">📷</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImageIdx(i => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setImageIdx(i => Math.min(images.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImageIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imageIdx ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
            {isSold && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-gray-800/80 text-white font-bold text-2xl px-8 py-3 rounded-2xl uppercase tracking-widest">
                  {listing.status === 'sold' ? 'Sold' : 'Swapped'}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setImageIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imageIdx ? 'border-[var(--primary)]' : 'border-transparent'}`}>
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mt-6 bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="font-semibold text-lg mb-3">About this item</h2>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>

          {/* Swap interests */}
          {listing.swapAvailable && listing.swapInterests && listing.swapInterests.length > 0 && (
            <div className="mt-4 bg-green-50 rounded-2xl border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={16} className="text-[var(--primary)]" />
                <h3 className="font-semibold text-sm text-[var(--primary)]">Interested in swapping for:</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {listing.swapInterests.map(interest => (
                  <span key={interest} className="px-3 py-1 bg-white text-sm rounded-full border border-green-200 text-[var(--primary)] font-medium">{interest}</span>
                ))}
              </div>
            </div>
          )}

          {/* Related listings */}
          {relatedListings.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold mb-4">More in {category?.name}</h2>
              <div className="grid grid-cols-2 gap-4">
                {relatedListings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="space-y-4">
          {/* Status badge */}
          {listing.status !== 'active' && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
              listing.status === 'under-negotiation' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              listing.status === 'reserved' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              listing.status === 'sold' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
              'bg-purple-50 text-purple-800 border border-purple-200'
            }`}>
              <AlertCircle size={16} />
              {STATUS_LABELS[listing.status]}
            </div>
          )}

          {/* Price & title */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="font-display text-2xl font-bold leading-tight flex-1">{listing.title}</h1>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => listing && currentUser && toggleFavorite(currentUser.id, listing.id)} className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors">
                  <Heart size={16} className={favorited ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted-foreground)]'} />
                </button>
                <button onClick={handleShare} className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors">
                  <Share2 size={16} className="text-[var(--muted-foreground)]" />
                </button>
              </div>
            </div>

            <p className="price-tag text-4xl font-bold text-[var(--foreground)] mb-4">{formatPrice(listing.price)}</p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-[var(--muted-foreground)] text-xs block mb-0.5">Condition</span>
                <span className="font-semibold">{CONDITION_LABELS[listing.condition]}</span>
              </div>
              {listing.brand && (
                <div>
                  <span className="text-[var(--muted-foreground)] text-xs block mb-0.5">Brand</span>
                  <span className="font-semibold">{listing.brand}</span>
                </div>
              )}
              <div>
                <span className="text-[var(--muted-foreground)] text-xs block mb-0.5">Category</span>
                <span className="font-semibold">{category?.name}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] text-xs block mb-0.5">Posted</span>
                <span className="font-semibold">{formatDate(listing.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-4">
              <MapPin size={14} />
              <span>{listing.location}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {listing.negotiable && (
                <span className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-[var(--primary)] rounded-full border border-green-200 font-medium">
                  <TrendingDown size={12} /> Negotiable
                </span>
              )}
              {listing.swapAvailable && (
                <span className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-[var(--primary)] rounded-full border border-green-200 font-medium">
                  <RefreshCw size={12} /> Swap Available
                </span>
              )}
            </div>
          </div>

          {/* My current offer status */}
          {myOffer && !isOwner && (
            <div className={`bg-white rounded-2xl border p-5 ${
              myOffer.status === 'accepted' ? 'border-green-300 bg-green-50' :
              myOffer.status === 'rejected' ? 'border-red-200 bg-red-50' :
              'border-amber-200 bg-amber-50'
            }`}>
              <h3 className="font-semibold text-sm mb-3">Your Offer</h3>
              <div className="space-y-2">
                {myOffer.history.map(entry => (
                  <div key={entry.id} className={`flex items-center justify-between text-sm ${entry.fromUserId === currentUser?.id ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                    <span>{entry.fromUserId === currentUser?.id ? 'You' : seller?.name}: {entry.type}</span>
                    <span className="price-tag font-bold">{formatPrice(entry.amount)}</span>
                  </div>
                ))}
              </div>
              {myOffer.status === 'accepted' && (
                <Link
                  to={`/checkout?listingId=${listing.id}&offerId=${myOffer.id}`}
                  className="block w-full mt-3 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold text-center hover:opacity-90 transition-opacity"
                >
                  Proceed to Checkout →
                </Link>
              )}
              {(myOffer.status === 'pending' || myOffer.status === 'countered') && myOffer.history.at(-1)?.fromUserId !== currentUser?.id && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setOfferMode('counter'); setShowOfferModal(true); }}
                    className="flex-1 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold hover:bg-white transition-colors"
                  >Counter</button>
                  <button className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold">
                    Accept ✓
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isOwner && !isSold && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 space-y-3">
              {!myOffer && (
                currentUser ? (
                  <Link
                    to={`/checkout?listingId=${listing.id}&price=${listing.price}`}
                    className="block w-full py-3.5 bg-[var(--foreground)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity text-center shadow-sm"
                  >
                    Buy at {formatPrice(listing.price)}
                  </Link>
                ) : (
                  <button
                    onClick={() => openLoginModal(`/checkout?listingId=${listing.id}&price=${listing.price}`)}
                    className="w-full py-3.5 bg-[var(--foreground)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity text-center shadow-sm"
                  >
                    Buy at {formatPrice(listing.price)}
                  </button>
                )
              )}

              {listing.negotiable && !myOffer && (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      openLoginModal(`/listing/${listing.id}`);
                      return;
                    }
                    setOfferMode('offer');
                    setShowOfferModal(true);
                  }}
                  className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm"
                >
                  Make an Offer
                </button>
              )}

              {!listing.negotiable && (
                <p className="text-xs text-center text-[var(--muted-foreground)]">Fixed price · No offers accepted</p>
              )}

              {listing.swapAvailable && (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      openLoginModal(`/listing/${listing.id}`);
                      return;
                    }
                    setShowSwapModal(true);
                  }}
                  className="w-full py-3 border border-[var(--primary)] text-[var(--primary)] rounded-xl font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} /> Propose a Swap
                </button>
              )}

              <button
                onClick={() => {
                  if (!currentUser) {
                    openLoginModal(`/listing/${listing.id}`);
                    return;
                  }
                  handleMessage();
                }}
                className="w-full py-3 border border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--muted)] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <MessageSquare size={16} /> Message Seller
              </button>
            </div>
          )}

          {/* Seller info */}
          {seller && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
              <h3 className="font-semibold text-sm mb-4">Seller</h3>
              <Link to={`/profile/${seller.id}`} className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">
                <img src={seller.avatar} alt={seller.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{seller.name}</p>
                  <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>{seller.rating}</span>
                    <span>·</span>
                    <span>{seller.completedTransactions} completed</span>
                  </div>
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-[var(--muted)] rounded-lg">
                  <p className="font-bold text-lg">{seller.completedTransactions}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Sales</p>
                </div>
                <div className="text-center p-2 bg-[var(--muted)] rounded-lg">
                  <p className="font-bold text-lg">{seller.rating}/5</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Rating</p>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-3 flex items-center gap-1">
                <Clock size={11} /> Member since {new Date(seller.joinedAt).getFullYear()}
              </p>
            </div>
          )}

          {/* Seller: received offers */}
          {isOwner && receivedOffers.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
              <h3 className="font-semibold text-sm mb-4">Pending Offers ({receivedOffers.length})</h3>
              <div className="space-y-4">
                {receivedOffers.map(offer => (
                  <div key={offer.id} className="border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold price-tag">{formatPrice(offer.amount)}</span>
                      <span className="text-xs text-[var(--muted-foreground)] capitalize">{offer.status}</span>
                    </div>
                    {offer.message && <p className="text-xs text-[var(--muted-foreground)] mb-3 italic">"{offer.message}"</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectOffer(offer.id)}
                        className="flex-1 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <X size={12} /> Reject
                      </button>
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={acceptLoading === offer.id}
                        className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-60"
                      >
                        <Check size={12} /> {acceptLoading === offer.id ? '...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller: edit/delete actions */}
          {isOwner && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 space-y-2">
              <h3 className="font-semibold text-sm mb-3">Manage Listing</h3>
              <Link to={`/sell?edit=${listing.id}`} className="block w-full py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold text-center hover:bg-[var(--muted)] transition-colors">
                Edit Listing
              </Link>
              <button
                onClick={() => { listingService.updateStatus(listing.id, 'sold'); showToast('Marked as sold!'); }}
                className="w-full py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors"
              >
                Mark as Sold
              </button>
              <button
                onClick={() => { listingService.delete(listing.id); navigate('/dashboard'); }}
                className="w-full py-2.5 border border-[var(--accent)] text-[var(--accent)] rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Delete Listing
              </button>
            </div>
          )}

          {/* Platform fee notice */}
          <div className="bg-[var(--muted)] rounded-2xl p-4 text-xs text-[var(--muted-foreground)]">
            <p className="font-semibold text-[var(--foreground)] mb-1">How transactions work</p>
            <p>Payment is Cash on Delivery only. A platform fee of ৳30 applies per completed transaction.</p>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <OfferModal
          listing={listing}
          existingOffer={myOffer || undefined}
          onClose={() => setShowOfferModal(false)}
          onSubmit={offerMode === 'counter' ? handleCounter : handleMakeOffer}
          mode={offerMode}
          currentAmount={myOffer?.amount}
        />
      )}

      {/* Swap Modal */}
      {showSwapModal && (
        <SwapModal
          listing={listing}
          userListings={userListings}
          onClose={() => setShowSwapModal(false)}
          onSubmit={handleSwapProposal}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium z-50 flex items-center gap-2">
          <Check size={16} className="text-[var(--primary)]" />
          {toast}
        </div>
      )}
    </div>
  );
}
