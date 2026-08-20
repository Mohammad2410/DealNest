import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Bell, MessageSquare, User, PlusCircle,
  Menu, X, Home, Grid3X3, RefreshCw, LogOut, Settings, Package
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { LogIn } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { conversationService } from '../../services/conversationService';
import { APP_NAME } from '../../constants';
import { getInitials } from '../../lib/utils';

export default function Navbar() {
  const { currentUser, logout, openLoginModal } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = currentUser ? notificationService.unreadCount(currentUser.id) : 0;
  const unreadMessages = currentUser ? conversationService.totalUnread(currentUser.id) : 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  }

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/browse', label: 'Browse', icon: Grid3X3 },
    { to: '/browse?swap=true', label: 'Swap', icon: RefreshCw },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <RefreshCw size={16} className="text-white" />
            </span>
            <span className="font-display font-semibold text-lg text-[var(--foreground)] hidden sm:block">{APP_NAME}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to.split('?')[0]
                    ? 'bg-[var(--muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="text"
                placeholder="Search phones, laptops, furniture..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--muted)] border border-transparent rounded-lg focus:outline-none focus:border-[var(--primary)] focus:bg-white transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            {/* Sell CTA */}
            <Link
              to="/sell"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={16} />
              Sell
            </Link>

            {/* Login button (unauthenticated) */}
            {!currentUser && (
              <button
                onClick={() => openLoginModal()}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-[var(--border)] text-sm font-semibold rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <LogIn size={15} />
                Sign In
              </button>
            )}

            {currentUser && (
              <>
                {/* Messages */}
                <Link to="/messages" className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
                  <MessageSquare size={20} className="text-[var(--muted-foreground)]" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <Link to="/dashboard?tab=notifications" className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
                  <Bell size={20} className="text-[var(--muted-foreground)]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
                  >
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(currentUser.name)}
                      </div>
                    )}
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[var(--border)] rounded-xl shadow-lg py-1 z-50">
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <p className="font-semibold text-sm">{currentUser.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{currentUser.email}</p>
                      </div>
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                        <Grid3X3 size={16} /> Dashboard
                      </Link>
                      <Link to={`/profile/${currentUser.id}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                        <User size={16} /> My Profile
                      </Link>
                      <Link to="/dashboard?tab=listings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                        <Package size={16} /> My Listings
                      </Link>
                      <Link to="/dashboard?tab=settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors">
                        <Settings size={16} /> Settings
                      </Link>
                      <div className="border-t border-[var(--border)] mt-1">
                        <button onClick={() => { logout(); setProfileOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--muted)] transition-colors w-full text-left">
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="sm:hidden pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--muted)] border border-transparent rounded-lg focus:outline-none focus:border-[var(--primary)] focus:bg-white"
            />
          </div>
        </form>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-white">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors">
                <link.icon size={18} className="text-[var(--muted-foreground)]" />
                {link.label}
              </Link>
            ))}
            {currentUser ? (
              <Link to="/sell" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white mt-2">
                <PlusCircle size={18} /> + Sell Something
              </Link>
            ) : (
              <button onClick={() => openLoginModal('/sell')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white mt-2 w-full">
                <LogIn size={18} /> Sign In to Sell
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
