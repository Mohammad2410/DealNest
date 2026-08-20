import { Notification } from '../types';

export const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'u2', type: 'offer-accepted', title: 'Offer Accepted!', body: 'Your offer of ৳41,000 for iPhone 13 was accepted by Rahim.', listingId: 'l1', offerId: 'o1', read: false, createdAt: '2026-08-15T10:42:00Z' },
  { id: 'n2', userId: 'u2', type: 'transaction-created', title: 'Transaction Created', body: 'Your transaction for iPhone 13 has been created. Pay ৳41,030 on delivery.', listingId: 'l1', transactionId: 't1', read: false, createdAt: '2026-08-15T10:45:00Z' },
  { id: 'n3', userId: 'u2', type: 'delivery-update', title: 'Out for Delivery', body: 'Your iPhone 13 is out for delivery. Be ready to pay ৳41,030 cash.', transactionId: 't1', read: true, createdAt: '2026-08-16T10:00:00Z' },
  { id: 'n4', userId: 'u2', type: 'transaction-completed', title: 'Transaction Complete!', body: 'Your purchase of iPhone 13 is complete. Please leave a review for Rahim.', transactionId: 't1', read: true, createdAt: '2026-08-16T16:00:00Z' },
  { id: 'n5', userId: 'u2', type: 'counter-offer', title: 'Counter Offer Received', body: 'Shirin countered your offer on Canon 700D with ৳27,000.', listingId: 'l5', offerId: 'o6', read: false, createdAt: '2026-08-17T15:00:00Z' },
  { id: 'n6', userId: 'u2', type: 'new-message', title: 'New Message from Shirin', body: 'Hmm, let me think about it.', listingId: 'l5', read: false, createdAt: '2026-08-17T16:15:00Z' },
  { id: 'n7', userId: 'u2', type: 'new-offer', title: 'New Offer on Your Listing', body: 'Karim offered ৳35,000 for your Nintendo Switch OLED.', listingId: 'l20', offerId: 'o8', read: false, createdAt: '2026-08-18T06:00:00Z' },
  { id: 'n8', userId: 'u2', type: 'new-message', title: 'New Message from Karim', body: 'Still have the Switch OLED?', listingId: 'l20', read: false, createdAt: '2026-08-18T05:50:00Z' },
  { id: 'n9', userId: 'u2', type: 'delivery-update', title: 'Delivery Update', body: 'Your CSE textbooks order is out for delivery. Pay ৳3,830 cash.', transactionId: 't2', read: true, createdAt: '2026-08-18T09:00:00Z' },
  { id: 'n10', userId: 'u2', type: 'offer-accepted', title: 'Your Offer Was Accepted', body: 'Shirin accepted your offer of ৳25,500 on Canon 700D.', listingId: 'l5', offerId: 'o6', read: false, createdAt: '2026-08-18T08:00:00Z' },
  { id: 'n11', userId: 'u2', type: 'new-offer', title: 'New Offer on Textbooks', body: 'Tanvir offered ৳3,500 for your CSE Textbooks.', listingId: 'l12', offerId: 'o7', read: true, createdAt: '2026-08-17T09:00:00Z' },
  { id: 'n12', userId: 'u2', type: 'offer-rejected', title: 'Offer Not Accepted', body: 'Your offer of ৳60,000 on PS5 was rejected by Tanvir.', listingId: 'l4', offerId: 'o3', read: true, createdAt: '2026-08-14T09:30:00Z' },
];
