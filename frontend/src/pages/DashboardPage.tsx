import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Package, TrendingUp, MessageSquare, Heart,
  CreditCard, Bell, Settings, Star, RefreshCw, Check, Clock, AlertCircle
} from 'lucide-react';
import { Listing, Offer, Transaction, Notification } from '../types';
import { listingService } from '../services/listingService';
import { offerService } from '../services/offerService';
import { transactionService } from '../services/transactionService';
import { notificationService } from '../services/notificationService';
import { favoriteService } from '../services/favoriteService';
import { useAuthStore } from '../stores/authStore';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { STATUS_LABELS, OFFER_STATUS_LABELS, Listing as ListingType } from '../types';
import { PLATFORM_FEE } from '../constants';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'listings', label: 'My Listings', icon: Package },
  { id: 'offers', label: 'My Offers', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const LISTING_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  'under-negotiation': 'bg-amber-100 text-amber-800',
  reserved: 'bg-blue-100 text-blue-800',
  sold: 'bg-gray-100 text-gray-600',
  swapped: 'bg-purple-100 text-purple-800',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const TX_STATUS_ICONS: Record<string, string> = {
  'offer-accepted': '✅',
  'transaction-created': '📝',
  'seller-preparing': '📦',
  'out-for-delivery': '🚚',
  'delivered': '🏠',
  'completed': '✨',
};

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { currentUser } = useAuthStore();

  const [listings, setListings] = useState<Listing[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      listingService.getAll({ sellerId: currentUser.id }),
      offerService.getForUser(currentUser.id),
      transactionService.getForUser(currentUser.id),
      notificationService.getForUser(currentUser.id),
      favoriteService.getForUser(currentUser.id),
    ]).then(async ([ls, offers, txs, notifs, favIds]) => {
      setListings(ls);
      setSentOffers(offers.sent);
      setReceivedOffers(offers.received);
      setTransactions(txs);
      setNotifications(notifs);
      const favListings = await Promise.all(favIds.map(id => listingService.getById(id)));
      setFavoriteListings(favListings.filter(Boolean) as Listing[]);
      setLoading(false);
    });
  }, [currentUser]);

  function setTab(tab: string) {
    setSearchParams({ tab });
  }

  if (!currentUser) return <div className="p-8 text-center text-[var(--muted-foreground)]">Please log in.</div>;

  const activeListing = listings.filter(l => l.status === 'active').length;
  const pendingOffers = receivedOffers.filter(o => o.status === 'pending' || o.status === 'countered').length;
  const completedTx = transactions.filter(t => t.status === 'completed').length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 hidden md:block">
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden sticky top-20">
            {/* User card */}
            <div className="p-5 border-b border-[var(--border)] bg-[var(--foreground)] text-white">
              <div className="flex items-center gap-3 mb-3">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                <div>
                  <p className="font-semibold text-sm">{currentUser.name}</p>
                  <div className="flex items-center gap-1 text-xs text-white/70">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span>{currentUser.rating}</span>
                    <span>·</span>
                    <span>{currentUser.completedTransactions} sales</span>
                  </div>
                </div>
              </div>
              <Link to={`/profile/${currentUser.id}`} className="text-xs text-white/70 hover:text-white transition-colors">View public profile →</Link>
            </div>

            <nav className="p-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-green-50 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.id === 'notifications' && unreadNotifs > 0 && (
                    <span className="ml-auto w-5 h-5 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadNotifs}</span>
                  )}
                  {tab.id === 'offers' && pendingOffers > 0 && (
                    <span className="ml-auto w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingOffers}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full overflow-x-auto pb-3">
          <div className="flex gap-2 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                  activeTab === tab.id ? 'bg-[var(--foreground)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)]'
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[var(--border)]" />)}
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-semibold">Dashboard</h2>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Active Listings', value: activeListing, icon: Package, color: 'text-[var(--primary)]', bg: 'bg-green-50' },
                      { label: 'Pending Offers', value: pendingOffers, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Transactions', value: transactions.length, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Completed', value: completedTx, icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white border border-[var(--border)] rounded-2xl p-5">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                          <stat.icon size={20} className={stat.color} />
                        </div>
                        <p className="text-3xl font-bold font-display mb-1">{stat.value}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent activity */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Listings</h3>
                        <button onClick={() => setTab('listings')} className="text-xs text-[var(--primary)] hover:underline">View all</button>
                      </div>
                      {listings.slice(0, 3).map(l => (
                        <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0 hover:opacity-80 transition-opacity">
                          {l.images[0] && <img src={l.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{l.title}</p>
                            <p className="text-xs text-[var(--primary)] price-tag font-semibold">{formatPrice(l.price)}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${LISTING_STATUS_COLORS[l.status]}`}>
                            {STATUS_LABELS[l.status]}
                          </span>
                        </Link>
                      ))}
                      {listings.length === 0 && (
                        <div className="text-center py-8 text-[var(--muted-foreground)]">
                          <Package size={24} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No listings yet</p>
                          <Link to="/sell" className="text-xs text-[var(--primary)] hover:underline mt-1 block">Create one</Link>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-[var(--border)] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Transactions</h3>
                        <button onClick={() => setTab('transactions')} className="text-xs text-[var(--primary)] hover:underline">View all</button>
                      </div>
                      {transactions.slice(0, 3).map(tx => (
                        <Link key={tx.id} to={`/transactions/${tx.id}`} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0 hover:opacity-80 transition-opacity">
                          <span className="text-xl">{TX_STATUS_ICONS[tx.status]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tx.item.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)] capitalize">{tx.status.replace(/-/g, ' ')}</p>
                          </div>
                          <span className="text-sm font-bold price-tag">{formatPrice(tx.agreedPrice)}</span>
                        </Link>
                      ))}
                      {transactions.length === 0 && (
                        <div className="text-center py-8 text-[var(--muted-foreground)]">
                          <CreditCard size={24} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No transactions yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unread notifications */}
                  {unreadNotifs > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                      <Bell size={20} className="text-amber-600" />
                      <p className="text-sm"><span className="font-semibold">{unreadNotifs} unread notifications</span> need your attention.</p>
                      <button onClick={() => setTab('notifications')} className="ml-auto text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors">
                        View
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* LISTINGS */}
              {activeTab === 'listings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold">My Listings</h2>
                    <Link to="/sell" className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                      + New Listing
                    </Link>
                  </div>
                  {listings.length === 0 ? (
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
                      <Package size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="font-semibold mb-1">No listings yet</p>
                      <p className="text-sm text-[var(--muted-foreground)] mb-4">Start selling something you no longer need.</p>
                      <Link to="/sell" className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold">Create Listing</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {listings.map(l => (
                        <div key={l.id} className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                          {l.images[0] && <img src={l.images[0].url} alt={l.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <Link to={`/listing/${l.id}`} className="font-semibold text-sm hover:text-[var(--primary)] transition-colors truncate block">{l.title}</Link>
                            <p className="text-[var(--primary)] font-bold price-tag text-sm">{formatPrice(l.price)}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{l.viewCount} views · {formatDate(l.createdAt)}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${LISTING_STATUS_COLORS[l.status]}`}>
                            {STATUS_LABELS[l.status]}
                          </span>
                          <div className="flex gap-2 shrink-0">
                            <Link to={`/sell?edit=${l.id}`} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors">Edit</Link>
                            <Link to={`/listing/${l.id}`} className="px-3 py-1.5 bg-[var(--muted)] rounded-lg text-xs font-medium hover:bg-[var(--secondary)] transition-colors">View</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OFFERS */}
              {activeTab === 'offers' && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-semibold">My Offers</h2>

                  <div>
                    <h3 className="font-semibold mb-3 text-[var(--muted-foreground)] text-sm uppercase tracking-wide">Offers I've Sent ({sentOffers.length})</h3>
                    {sentOffers.length === 0 ? (
                      <div className="bg-white border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted-foreground)]">
                        <TrendingUp size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No offers sent yet. Browse listings and make your first offer!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sentOffers.map(offer => (
                          <OfferRow key={offer.id} offer={offer} type="sent" currentUserId={currentUser.id} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-[var(--muted-foreground)] text-sm uppercase tracking-wide">Offers I've Received ({receivedOffers.length})</h3>
                    {receivedOffers.length === 0 ? (
                      <div className="bg-white border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted-foreground)]">
                        <p className="text-sm">No offers received yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receivedOffers.map(offer => (
                          <OfferRow key={offer.id} offer={offer} type="received" currentUserId={currentUser.id} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TRANSACTIONS */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-semibold">Transactions</h2>
                  {transactions.length === 0 ? (
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
                      <CreditCard size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="font-semibold mb-1">No transactions yet</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Complete your first sale or purchase to see it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map(tx => (
                        <Link key={tx.id} to={`/transactions/${tx.id}`} className="bg-white border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow block">
                          <img src={tx.item.imageUrl} alt={tx.item.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{tx.item.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)] capitalize">{tx.type} · {tx.status.replace(/-/g, ' ')}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{formatDate(tx.createdAt)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold price-tag">{formatPrice(tx.agreedPrice)}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">+৳{PLATFORM_FEE} fee</p>
                          </div>
                          <span className="text-xl">{TX_STATUS_ICONS[tx.status]}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FAVORITES */}
              {activeTab === 'favorites' && (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-semibold">Saved Listings</h2>
                  {favoriteListings.length === 0 ? (
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
                      <Heart size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="font-semibold mb-1">No saved listings</p>
                      <p className="text-sm text-[var(--muted-foreground)] mb-4">Save listings by clicking the heart icon.</p>
                      <Link to="/browse" className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold">Browse Listings</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {favoriteListings.map(l => (
                        <Link key={l.id} to={`/listing/${l.id}`} className="bg-white border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                          {l.images[0] && <img src={l.images[0].url} alt={l.title} className="w-full aspect-[4/3] object-cover" />}
                          <div className="p-3">
                            <p className="font-semibold text-sm truncate">{l.title}</p>
                            <p className="text-[var(--primary)] font-bold price-tag text-sm">{formatPrice(l.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold">Notifications</h2>
                    {unreadNotifs > 0 && (
                      <button
                        onClick={() => { notificationService.markAllRead(currentUser.id); setNotifications(ns => ns.map(n => ({ ...n, read: true }))); }}
                        className="text-sm text-[var(--primary)] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center">
                      <Bell size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="font-semibold">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => { notificationService.markRead(notif.id); setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, read: true } : n)); }}
                          className={`bg-white border rounded-xl p-4 cursor-pointer hover:bg-[var(--muted)] transition-colors ${!notif.read ? 'border-[var(--primary)] bg-green-50/50' : 'border-[var(--border)]'}`}
                        >
                          <div className="flex items-start gap-3">
                            {!notif.read && <span className="w-2 h-2 bg-[var(--primary)] rounded-full mt-2 shrink-0" />}
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{notif.title}</p>
                              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{notif.body}</p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatDate(notif.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-xl">
                  <h2 className="font-display text-2xl font-semibold">Settings</h2>
                  <div className="bg-white border border-[var(--border)] rounded-2xl p-6 space-y-4">
                    <h3 className="font-semibold">Profile Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium block mb-1">Name</label>
                        <input defaultValue={currentUser.name} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Location</label>
                        <input defaultValue={currentUser.location} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Bio</label>
                        <textarea defaultValue={currentUser.bio} rows={3} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none" />
                      </div>
                      <button className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function OfferRow({ offer, type, currentUserId }: { offer: Offer; type: 'sent' | 'received'; currentUserId: string }) {
  const lastEntry = offer.history.at(-1);
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    countered: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-600',
    completed: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link to={`/listing/${offer.listingId}`} className="text-sm font-semibold hover:text-[var(--primary)] transition-colors">
            View Listing →
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <span className="price-tag text-lg font-bold">{formatPrice(offer.amount)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[offer.status]}`}>
              {OFFER_STATUS_LABELS[offer.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{offer.history.length} messages · {formatDate(offer.updatedAt)}</p>
        </div>
        <div className="shrink-0 text-right">
          {type === 'received' && (offer.status === 'pending' || offer.status === 'countered') && (
            <Link to={`/listing/${offer.listingId}`} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
              Respond
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
