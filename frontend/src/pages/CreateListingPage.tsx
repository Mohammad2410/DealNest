import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, RefreshCw, MapPin, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingCondition, Category } from '../types';
import { listingService } from '../services/listingService';
import { categoryService } from '../services/categoryService';
import { useAuthStore } from '../stores/authStore';
import { formatPrice } from '../lib/utils';
import { LOCATIONS, MAX_DESCRIPTION_LENGTH } from '../constants';

const STEPS = ['Photos', 'Details', 'Price', 'Swap', 'Preview'];

interface FormData {
  images: { url: string; file?: File; alt: string }[];
  title: string;
  categoryId: string;
  brand: string;
  condition: ListingCondition;
  description: string;
  location: string;
  price: string;
  negotiable: boolean;
  swapAvailable: boolean;
  swapInterests: string;
}

const CONDITION_LABELS_LOCAL: Record<ListingCondition, string> = {
  'new': 'New',
  'like-new': 'Like New',
  'used-excellent': 'Used – Excellent',
  'used-good': 'Used – Good',
  'used-fair': 'Used – Fair',
  'for-parts': 'For Parts',
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { currentUser, openLoginModal } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryService.getAll().then(setCategories);
  }, []);

  useEffect(() => {
    if (!currentUser) openLoginModal('/sell');
  }, [currentUser]);

  const [form, setForm] = useState<FormData>({
    images: [],
    title: '',
    categoryId: '',
    brand: '',
    condition: 'used-good',
    description: '',
    location: '',
    price: '',
    negotiable: true,
    swapAvailable: false,
    swapInterests: '',
  });

  function addImages(files: FileList | File[]) {
    const arr = Array.from(files).slice(0, 8 - form.images.length);
    const newImgs = arr.map((file, i) => ({
      url: URL.createObjectURL(file),
      file,
      alt: file.name,
    }));
    setForm(f => ({ ...f, images: [...f.images, ...newImgs] }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
  }

  function removeImage(i: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  function setPrimary(i: number) {
    setForm(f => ({
      ...f,
      images: f.images.map((img, idx) => ({ ...img })).sort((_, __, a = i, b = 0) => {
        return 0;
      }),
    }));
  }

  const canNext = () => {
    if (step === 0) return form.images.length > 0;
    if (step === 1) return form.title.trim() && form.categoryId && form.condition && form.description.trim() && form.location;
    if (step === 2) return form.price && Number(form.price) > 0;
    return true;
  };

  async function handleSubmit() {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      // Extract actual File objects for upload
      const imageFiles = form.images.map(img => img.file).filter(Boolean) as File[];
      const listing = await listingService.create(
        {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          negotiable: form.negotiable,
          condition: form.condition,
          categoryId: form.categoryId,
          brand: form.brand,
          location: form.location,
          status: 'active',
          swapAvailable: form.swapAvailable,
          swapInterests: form.swapInterests ? form.swapInterests.split(',').map(s => s.trim()).filter(Boolean) : [],
          sellerId: currentUser.id,
          images: [],
        },
        imageFiles,
      );
      navigate(`/listing/${listing.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const category = categories.find(c => c.id === form.categoryId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">Sell Something</h1>
        <p className="text-[var(--muted-foreground)] text-sm">Fill in the details to list your item on DealNest.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i < step ? 'bg-[var(--primary)] text-white' :
              i === step ? 'bg-[var(--foreground)] text-white' :
              'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-8 -mt-5 px-0">
        {STEPS.map((s, i) => (
          <span key={s} className={`${i === step ? 'text-[var(--foreground)] font-semibold' : ''} ${i === STEPS.length - 1 ? 'text-right' : ''}`}>{s}</span>
        ))}
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
        {/* STEP 0: Photos */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-1">Add Photos</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Upload up to 8 photos. The first photo will be the main image.</p>

            {form.images.length < 8 && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-4 ${dragOver ? 'border-[var(--primary)] bg-green-50' : 'border-[var(--border)] hover:border-[var(--primary)]'}`}
              >
                <Upload size={32} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
                <p className="font-semibold text-sm mb-1">Drop photos here or click to upload</p>
                <p className="text-xs text-[var(--muted-foreground)]">Supports JPG, PNG, WebP · Max 8 photos</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && addImages(e.target.files)} />
              </div>
            )}

            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-[var(--muted)]">
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-bold">MAIN</span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {form.images.length === 0 && (
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-2">📸 Add at least 1 photo to continue</p>
            )}
          </div>
        )}

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold mb-1">Product Details</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Tell buyers about your item.</p>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Product Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. iPhone 13 128GB Midnight Black"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Brand</label>
                <input
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Apple, Samsung"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Condition *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(CONDITION_LABELS_LOCAL) as ListingCondition[]).map(cond => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, condition: cond }))}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                      form.condition === cond
                        ? 'border-[var(--primary)] bg-green-50 text-[var(--primary)]'
                        : 'border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)]'
                    }`}
                  >
                    {form.condition === cond && <span className="mr-1">✓</span>}
                    {CONDITION_LABELS_LOCAL[cond]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1.5">
                Description * <span className="font-normal text-[var(--muted-foreground)]">({form.description.length}/{MAX_DESCRIPTION_LENGTH})</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, MAX_DESCRIPTION_LENGTH) }))}
                placeholder="Describe your item honestly — condition, accessories, reason for selling..."
                rows={5}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Location *</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <select
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full pl-9 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select city</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Price */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold mb-1">Set Your Price</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Set a fair asking price. You can always negotiate later.</p>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Asking Price (৳) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--muted-foreground)]">৳</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-4 border border-[var(--border)] rounded-xl text-xl font-bold font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              {form.price && Number(form.price) > 0 && (
                <p className="text-sm text-[var(--muted-foreground)] mt-1">= {formatPrice(Number(form.price))}</p>
              )}
            </div>

            <div className="bg-[var(--muted)] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Accept Offers?</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, negotiable: true }))}
                  className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors ${form.negotiable ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)] bg-white'}`}
                >
                  ✓ Yes, accept offers
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, negotiable: false }))}
                  className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors ${!form.negotiable ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)] bg-white'}`}
                >
                  ✕ Fixed price only
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {form.negotiable
                  ? 'Buyers can make offers. You can accept, reject, or counter.'
                  : 'Buyers can only buy at your asking price. Offers are disabled.'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Swap */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold mb-1">Swap Options</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Are you open to trading your item for something else?</p>

            <div className="border border-[var(--border)] rounded-xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.swapAvailable}
                  onChange={e => setForm(f => ({ ...f, swapAvailable: e.target.checked }))}
                  className="w-5 h-5 mt-0.5 accent-[var(--primary)]"
                />
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <RefreshCw size={16} className="text-[var(--primary)]" /> Open to swaps
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Other users can propose to trade their items for yours.</p>
                </div>
              </label>

              {form.swapAvailable && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <label className="text-sm font-semibold block mb-1.5">What are you interested in? (optional)</label>
                  <input
                    value={form.swapInterests}
                    onChange={e => setForm(f => ({ ...f, swapInterests: e.target.value }))}
                    placeholder="e.g. iPhone, MacBook, Gaming PC (comma-separated)"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Separate items with commas.</p>
                </div>
              )}
            </div>

            {!form.swapAvailable && (
              <p className="text-sm text-center text-[var(--muted-foreground)]">Your listing will be marked as "For Sale only".</p>
            )}
          </div>
        )}

        {/* STEP 4: Preview */}
        {step === 4 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-1">Preview Your Listing</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">This is how your listing will appear to buyers.</p>

            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              {form.images[0] && (
                <img src={form.images[0].url} alt="Preview" className="w-full aspect-[16/9] object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-display text-xl font-bold">{form.title || 'Your listing title'}</h3>
                <p className="price-tag text-2xl font-bold mt-1 mb-2">{form.price ? formatPrice(Number(form.price)) : '৳—'}</p>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className="text-xs px-2 py-1 bg-[var(--muted)] rounded-full">{CONDITION_LABELS_LOCAL[form.condition]}</span>
                  {form.negotiable && <span className="text-xs px-2 py-1 bg-green-50 text-[var(--primary)] rounded-full font-medium">Negotiable</span>}
                  {form.swapAvailable && <span className="text-xs px-2 py-1 bg-green-50 text-[var(--primary)] rounded-full flex items-center gap-1"><RefreshCw size={10} /> Swap Available</span>}
                  {category && <span className="text-xs px-2 py-1 bg-[var(--muted)] rounded-full">{category.icon} {category.name}</span>}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">{form.description}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1"><MapPin size={11} /> {form.location}</p>
              </div>
            </div>

            <div className="mt-4 bg-[var(--muted)] rounded-xl p-4 text-sm text-[var(--muted-foreground)]">
              <p><strong className="text-[var(--foreground)]">Platform fee:</strong> ৳30 per completed transaction. Cash on Delivery only.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border)]">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 border border-[var(--border)] rounded-xl font-semibold text-sm hover:bg-[var(--muted)] transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Publishing...' : <><Check size={16} /> Publish Listing</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
