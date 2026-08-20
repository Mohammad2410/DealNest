export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  location: string;
  joinedAt: string;
  rating: number;
  reviewCount: number;
  completedTransactions: number;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  listingCount: number;
}

export type ListingCondition =
  | 'new'
  | 'like-new'
  | 'used-excellent'
  | 'used-good'
  | 'used-fair'
  | 'for-parts';

export type ListingStatus =
  | 'active'
  | 'under-negotiation'
  | 'reserved'
  | 'sold'
  | 'swapped'
  | 'expired'
  | 'cancelled';

export interface ListingImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  negotiable: boolean;
  condition: ListingCondition;
  categoryId: string;
  brand?: string;
  location: string;
  status: ListingStatus;
  swapAvailable: boolean;
  swapInterests?: string[];
  sellerId: string;
  images: ListingImage[];
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  favoriteCount: number;
}

export type OfferStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'completed'
  | 'cancelled';

export interface OfferHistoryEntry {
  id: string;
  amount: number;
  message?: string;
  fromUserId: string;
  type: 'offer' | 'counter' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: OfferStatus;
  message?: string;
  history: OfferHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type SwapStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

export interface SwapProposal {
  id: string;
  listingId: string;
  proposerId: string;
  proposerListingId: string;
  cashAdjustment: number;
  cashDirection: 'proposer-pays' | 'receiver-pays' | 'none';
  status: SwapStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'offer' | 'counter-offer' | 'system' | 'swap';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  offerAmount?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
  relatedOfferId?: string;
  relatedSwapId?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: Record<string, number>;
}

export type TransactionStatus =
  | 'offer-accepted'
  | 'transaction-created'
  | 'seller-preparing'
  | 'out-for-delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type TransactionType = 'sale' | 'swap';

export interface TransactionItem {
  listingId: string;
  title: string;
  imageUrl: string;
  agreedPrice: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  buyerId: string;
  sellerId: string;
  item: TransactionItem;
  swapItem?: TransactionItem;
  agreedPrice: number;
  cashAdjustment?: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod: 'cash-on-delivery';
  offerId?: string;
  swapId?: string;
  deliveryAddress?: string;
  timeline: TransactionTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionTimeline {
  status: TransactionStatus;
  label: string;
  timestamp?: string;
  completed: boolean;
}

export interface Review {
  id: string;
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export type NotificationType =
  | 'new-offer'
  | 'counter-offer'
  | 'offer-accepted'
  | 'offer-rejected'
  | 'swap-proposal'
  | 'swap-accepted'
  | 'new-message'
  | 'transaction-created'
  | 'delivery-update'
  | 'transaction-completed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: string;
  offerId?: string;
  transactionId?: string;
  read: boolean;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Address {
  city: string;
  area: string;
  fullAddress?: string;
}

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  'new': 'New',
  'like-new': 'Like New',
  'used-excellent': 'Used – Excellent',
  'used-good': 'Used – Good',
  'used-fair': 'Used – Fair',
  'for-parts': 'For Parts',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  'active': 'Active',
  'under-negotiation': 'Under Negotiation',
  'reserved': 'Reserved',
  'sold': 'Sold',
  'swapped': 'Swapped',
  'expired': 'Expired',
  'cancelled': 'Cancelled',
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  'pending': 'Pending',
  'countered': 'Countered',
  'accepted': 'Accepted',
  'rejected': 'Rejected',
  'withdrawn': 'Withdrawn',
  'expired': 'Expired',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};
