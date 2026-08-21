import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/navigation/Navbar';
import LoginModal from './components/auth/LoginModal';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import MessagesPage from './pages/MessagesPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import TransactionPage from './pages/TransactionPage';
import CheckoutPage from './pages/CheckoutPage';
import { useAuthStore } from './stores/authStore';
import { useFavoriteStore } from './stores/favoriteStore';

export default function App() {
  const { loadCurrentUser, currentUser } = useAuthStore();
  const { loadFavorites, clear } = useFavoriteStore();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadFavorites(currentUser.id);
    } else {
      clear();
    }
  }, [currentUser?.id]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <Navbar />
        <LoginModal />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/listing/:id" element={<ListingDetailPage />} />
            <Route path="/sell" element={<CreateListingPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessagesPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/transactions/:id" element={<TransactionPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <span className="text-6xl mb-4">🗺️</span>
                <h2 className="font-display text-3xl font-bold mb-2">Page not found</h2>
                <p className="text-[var(--muted-foreground)] mb-6">This page doesn't exist or has been moved.</p>
                <a href="/" className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  Go Home
                </a>
              </div>
            } />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] bg-white py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[var(--foreground)]">DealNest</span>
                <span>·</span>
                <span>Bangladesh's peer-to-peer marketplace</span>
              </div>
              <div className="flex items-center gap-4">
                <span>৳30 platform fee per transaction</span>
                <span>·</span>
                <span>Cash on Delivery only</span>
              </div>
              <p>© 2026 DealNest. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
