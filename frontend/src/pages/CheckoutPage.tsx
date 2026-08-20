import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Phone, User, ChevronRight, Truck, Shield,
  Check, AlertCircle, Edit2, CreditCard
} from 'lucide-react';
import { Offer, Listing } from '../types';
import { offerService } from '../services/offerService';
import { listingService } from '../services/listingService';
import { transactionService } from '../services/transactionService';
import { useAuthStore } from '../stores/authStore';
import { formatPrice } from '../lib/utils';
import { PLATFORM_FEE, LOCATIONS, DHAKA_AREAS } from '../constants';

interface AddressForm {
  fullName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  floor: string;
  landmark: string;
}

const EMPTY_ADDRESS: AddressForm = {
  fullName: '',
  phone: '',
  city: '',
  area: '',
  street: '',
  floor: '',
  landmark: '',
};

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
      done ? 'bg-[var(--primary)] text-white' :
      active ? 'bg-[var(--foreground)] text-white' :
      'bg-[var(--muted)] text-[var(--muted-foreground)]'
    }`}>
      {done ? <Check size={14} /> : n}
    </div>
  );
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, openLoginModal } = useAuthStore();

  const offerId = searchParams.get('offerId');
  const listingId = searchParams.get('listingId');
  const directPrice = searchParams.get('price');

  const [offer, setOffer] = useState<Offer | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<AddressForm>(() => ({
    ...EMPTY_ADDRESS,
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    city: currentUser?.location?.split(',')[0] || '',
  }));
  const [addressErrors, setAddressErrors] = useState<Partial<AddressForm>>({});
  const [placing, setPlacing] = useState(false);
  const [confirmedTxId, setConfirmedTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      openLoginModal('/checkout' + window.location.search);
      return;
    }
    Promise.all([
      offerId ? offerService.getById(offerId) : Promise.resolve(null),
      listingId ? listingService.getById(listingId) : Promise.resolve(null),
    ]).then(([o, l]) => {
      setOffer(o);
      setListing(l);
      setLoading(false);
    });
  }, [offerId, listingId, currentUser]);

  function validateAddress(): boolean {
    const errors: Partial<AddressForm> = {};
    if (!address.fullName.trim()) errors.fullName = 'Required';
    if (!address.phone.trim()) errors.phone = 'Required';
    if (!address.city) errors.city = 'Required';
    if (!address.street.trim()) errors.street = 'Required';
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleAddressContinue() {
    if (validateAddress()) setStep(2);
  }

  async function handleConfirm() {
    if (!listing || !currentUser) return;
    setPlacing(true);
    const agreedPrice = offer ? offer.amount : Number(directPrice) || listing.price;
    const fullAddress = [address.street, address.floor, address.area, address.city].filter(Boolean).join(', ');
    const tx = await transactionService.create({
      type: 'sale',
      buyerId: currentUser.id,
      sellerId: listing.sellerId,
      item: {
        listingId: listing.id,
        title: listing.title,
        imageUrl: listing.images[0]?.url || '',
        agreedPrice,
      },
      agreedPrice,
      offerId: offer?.id,
      deliveryAddress: fullAddress,
    });
    if (offer) await offerService.accept(offer.id, currentUser.id);
    setConfirmedTxId(tx.id);
    setStep(3);
    setPlacing(false);
  }

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-[var(--muted-foreground)] opacity-40" />
        <p className="font-display text-xl font-semibold mb-2">Sign in to continue</p>
        <p className="text-[var(--muted-foreground)] text-sm mb-4">You need an account to place an order.</p>
        <button
          onClick={() => openLoginModal('/checkout' + window.location.search)}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-[1fr,340px] gap-6">
          <div className="space-y-4">
            <div className="h-8 bg-[var(--muted)] rounded w-1/3" />
            <div className="h-64 bg-white border border-[var(--border)] rounded-2xl" />
          </div>
          <div className="h-80 bg-white border border-[var(--border)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-display text-xl font-semibold mb-2">Item not found</p>
        <Link to="/browse" className="text-[var(--primary)] hover:underline">Browse listings</Link>
      </div>
    );
  }

  const agreedPrice = offer ? offer.amount : Number(directPrice) || listing.price;
  const total = agreedPrice + PLATFORM_FEE;
  const fullAddressString = [address.street, address.floor, address.area, address.city].filter(Boolean).join(', ');

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (step === 3 && confirmedTxId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-[var(--primary)] flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-[var(--primary)]" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Your order for <strong>{listing.title}</strong> has been placed. The seller will be notified and will prepare your item for delivery.
          </p>

          {/* Summary box */}
          <div className="bg-[var(--muted)] rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Order ID</span>
              <span className="font-mono font-semibold text-xs">{confirmedTxId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Item</span>
              <span className="font-semibold truncate max-w-[180px]">{listing.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Amount to Pay</span>
              <span className="font-bold price-tag text-base">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Payment</span>
              <span className="font-semibold flex items-center gap-1"><CreditCard size={13} /> Cash on Delivery</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Deliver to</span>
              <span className="font-semibold text-right max-w-[180px] text-xs leading-tight">{fullAddressString}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">📦 What happens next?</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
              <li>Seller prepares your item</li>
              <li>Item is dispatched for delivery</li>
              <li>You receive the item at your address</li>
              <li>Pay <strong>{formatPrice(total)}</strong> cash to the delivery person</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Link
              to={`/transactions/${confirmedTxId}`}
              className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Track Order
            </Link>
            <Link
              to="/browse"
              className="flex-1 py-3 border border-[var(--border)] rounded-xl font-semibold text-sm hover:bg-[var(--muted)] transition-colors text-center"
            >
              Keep Browsing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
          <Link to={`/listing/${listing.id}`} className="hover:text-[var(--foreground)]">← Back to listing</Link>
        </nav>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {['Delivery Address', 'Review Order', 'Confirmed'].map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
              <span className={`text-xs mt-1 whitespace-nowrap ${step === i + 1 ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                {label}
              </span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > i + 1 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr,340px] gap-6 items-start">
        {/* Left panel */}
        <div>
          {/* ── STEP 1: ADDRESS ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="font-semibold text-lg">Delivery Address</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Contact */}
                <div>
                  <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">Full Name *</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          value={address.fullName}
                          onChange={e => setAddress(a => ({ ...a, fullName: e.target.value }))}
                          placeholder="Your full name"
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] ${addressErrors.fullName ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                        />
                        {addressErrors.fullName && <p className="text-xs text-[var(--accent)] mt-1">{addressErrors.fullName}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">Phone Number *</label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          value={address.phone}
                          onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))}
                          placeholder="01X-XXXXXXXX"
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] ${addressErrors.phone ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                        />
                        {addressErrors.phone && <p className="text-xs text-[var(--accent)] mt-1">{addressErrors.phone}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Location</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">City / District *</label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <select
                          value={address.city}
                          onChange={e => setAddress(a => ({ ...a, city: e.target.value, area: '' }))}
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] ${addressErrors.city ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                        >
                          <option value="">Select city</option>
                          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {addressErrors.city && <p className="text-xs text-[var(--accent)] mt-1">{addressErrors.city}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">Area / Thana</label>
                      {address.city === 'Dhaka' ? (
                        <select
                          value={address.area}
                          onChange={e => setAddress(a => ({ ...a, area: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                        >
                          <option value="">Select area</option>
                          {DHAKA_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      ) : (
                        <input
                          value={address.area}
                          onChange={e => setAddress(a => ({ ...a, area: e.target.value }))}
                          placeholder="Area / Thana"
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Street details */}
                <div>
                  <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Address Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">House / Road / Block *</label>
                      <input
                        value={address.street}
                        onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                        placeholder="e.g. House 12, Road 5, Block A"
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] ${addressErrors.street ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                      />
                      {addressErrors.street && <p className="text-xs text-[var(--accent)] mt-1">{addressErrors.street}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold block mb-1.5">Apartment / Floor</label>
                        <input
                          value={address.floor}
                          onChange={e => setAddress(a => ({ ...a, floor: e.target.value }))}
                          placeholder="e.g. Flat 3B, 2nd floor"
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-1.5">Landmark</label>
                        <input
                          value={address.landmark}
                          onChange={e => setAddress(a => ({ ...a, landmark: e.target.value }))}
                          placeholder="Near mosque, school..."
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddressContinue}
                  className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2"
                >
                  Continue to Review <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: REVIEW ─────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Delivery address summary */}
              <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                      <Check size={14} />
                    </div>
                    <h2 className="font-semibold">Delivery Address</h2>
                  </div>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
                    <Edit2 size={13} /> Edit
                  </button>
                </div>
                <div className="px-6 py-4 flex items-start gap-3">
                  <MapPin size={16} className="text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{address.fullName}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{address.phone}</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{fullAddressString}</p>
                    {address.landmark && <p className="text-xs text-[var(--muted-foreground)]">Near: {address.landmark}</p>}
                  </div>
                </div>
              </div>

              {/* Item */}
              <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                  <h2 className="font-semibold">Item Details</h2>
                </div>
                <div className="p-5 flex items-center gap-4">
                  {listing.images[0] && (
                    <img src={listing.images[0].url} alt={listing.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{listing.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 capitalize">{listing.condition.replace(/-/g, ' ')}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{listing.location}</p>
                  </div>
                  <p className="price-tag font-bold text-lg shrink-0">{formatPrice(agreedPrice)}</p>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                  <h2 className="font-semibold">Payment Method</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-4 p-4 bg-[var(--muted)] rounded-xl border-2 border-[var(--primary)]">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-2xl">💵</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">Cash on Delivery</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Pay when you receive your item</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--primary)] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-3 flex items-center gap-1.5">
                    <Shield size={12} className="text-[var(--primary)]" />
                    Only Cash on Delivery is accepted. No online payment required.
                  </p>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={placing}
                className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {placing ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirming...</>
                ) : (
                  <>Confirm Order · Pay {formatPrice(total)} on Delivery</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Order Summary ──────────────────────────────────────── */}
        <div className="sticky top-20">
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold">Order Summary</h2>
            </div>

            {/* Product */}
            <div className="p-5 border-b border-[var(--border)]">
              <div className="flex gap-3">
                {listing.images[0] && (
                  <img src={listing.images[0].url} alt={listing.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug">{listing.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 capitalize">{listing.condition.replace(/-/g, ' ')}</p>
                  {offer && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-50 text-[var(--primary)] rounded-full font-semibold border border-green-200">
                      ✓ Negotiated price
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-5 space-y-3">
              {offer && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">Original price</span>
                  <span className="line-through text-[var(--muted-foreground)] price-tag">{formatPrice(listing.price)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">{offer ? 'Negotiated price' : 'Item price'}</span>
                <span className="price-tag font-semibold">{formatPrice(agreedPrice)}</span>
              </div>
              {offer && (
                <div className="flex justify-between text-sm text-[var(--primary)]">
                  <span>You saved</span>
                  <span className="price-tag font-semibold">– {formatPrice(listing.price - agreedPrice)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Platform fee</span>
                <span className="price-tag">৳{PLATFORM_FEE}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Delivery</span>
                <span className="text-[var(--primary)] font-semibold">Cash on delivery</span>
              </div>

              <div className="border-t border-[var(--border)] pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="price-tag">{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                Pay this amount <strong>in cash</strong> when your item arrives.
              </p>
            </div>

            {/* Delivery info */}
            <div className="px-5 pb-5">
              <div className="bg-[var(--muted)] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Truck size={15} className="text-[var(--primary)] shrink-0" />
                  <span>Seller arranges delivery after confirmation</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <Shield size={15} className="text-[var(--primary)] shrink-0" />
                  <span>Inspect item before paying</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <CreditCard size={15} className="text-[var(--primary)] shrink-0" />
                  <span>No online payment — cash only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seller info */}
          {step === 2 && (
            <div className="mt-4 bg-white border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                By confirming, you agree that you will pay <strong>{formatPrice(total)}</strong> cash on delivery. The seller will be notified immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
