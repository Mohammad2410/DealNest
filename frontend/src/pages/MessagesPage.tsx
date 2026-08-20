import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { Conversation, Message, Listing, User } from '../types';
import { conversationService } from '../services/conversationService';
import { listingService } from '../services/listingService';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import { formatPrice, formatDate, formatTime, getInitials } from '../lib/utils';

function MessageBubble({ msg, isMe, sender }: { msg: Message; isMe: boolean; sender?: User }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs px-4 py-1.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {!isMe && sender && (
        <img src={sender.avatar} alt={sender.name} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
      )}
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'bg-[var(--primary)] text-white rounded-br-sm'
            : 'bg-white border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm'
        }`}>
          {msg.type === 'offer' || msg.type === 'counter-offer' ? (
            <div>
              <span className="text-xs opacity-70 block mb-1 font-semibold uppercase tracking-wide">{msg.type === 'offer' ? 'Offer' : 'Counter Offer'}</span>
              <span className="price-tag text-lg font-bold">{msg.offerAmount && formatPrice(msg.offerAmount)}</span>
              {msg.content && <p className="mt-1 text-xs opacity-80">{msg.content}</p>}
            </div>
          ) : (
            msg.content
          )}
        </div>
        <span className="text-[11px] text-[var(--muted-foreground)] mt-1 px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

function ConversationListItem({ conv, listing, otherUser, currentUserId, active }: {
  conv: Conversation; listing?: Listing; otherUser?: User; currentUserId: string; active: boolean;
}) {
  const unread = conv.unreadCount[currentUserId] || 0;
  const lastMsg = conv.lastMessage || conv.messages.at(-1);

  return (
    <Link
      to={`/messages/${conv.id}`}
      className={`flex items-center gap-3 p-4 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${active ? 'bg-green-50 border-l-2 border-l-[var(--primary)]' : ''}`}
    >
      <div className="relative shrink-0">
        {listing?.images[0] ? (
          <img src={listing.images[0].url} alt={listing.title} className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl">📦</div>
        )}
        {otherUser?.avatar && (
          <img src={otherUser.avatar} alt={otherUser.name} className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-semibold text-sm truncate">{otherUser?.name || 'Unknown'}</p>
          <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">{lastMsg ? formatDate(lastMsg.createdAt) : ''}</span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{listing?.title}</p>
        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{lastMsg?.content}</p>
      </div>
      {unread > 0 && (
        <span className="w-5 h-5 bg-[var(--accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{unread}</span>
      )}
    </Link>
  );
}

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convListings, setConvListings] = useState<Record<string, Listing>>({});
  const [convUsers, setConvUsers] = useState<Record<string, User>>({});
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    conversationService.getForUser(currentUser.id).then(async convs => {
      setConversations(convs);
      // Load listing and user data for each conversation
      const listingMap: Record<string, Listing> = {};
      const userMap: Record<string, User> = {};
      await Promise.all(convs.map(async conv => {
        const listing = await listingService.getById(conv.listingId);
        if (listing) listingMap[conv.id] = listing;
        const otherId = conv.participants.find(p => p !== currentUser.id);
        if (otherId) {
          const user = await userService.getById(otherId);
          if (user) userMap[conv.id] = user;
        }
      }));
      setConvListings(listingMap);
      setConvUsers(userMap);
      setLoading(false);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!conversationId || !currentUser) return;
    conversationService.getById(conversationId).then(async conv => {
      if (!conv) return;
      setActiveConv(conv);
      conversationService.markRead(conv.id, currentUser.id);
      const [listing, otherId] = [conv.listingId, conv.participants.find(p => p !== currentUser.id)];
      if (listing) listingService.getById(listing).then(l => setActiveListing(l));
      if (otherId) userService.getById(otherId).then(u => setActiveOtherUser(u));
    });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !activeConv || !currentUser || sending) return;
    setSending(true);
    const msg = await conversationService.sendMessage(activeConv.id, currentUser.id, message.trim());
    setActiveConv(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : null);
    setMessage('');
    setSending(false);
  }

  if (!currentUser) return null;

  const allUsers: Record<string, User> = {};

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Conversation list */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[var(--border)] bg-white flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="font-display text-xl font-semibold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-[var(--muted)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[var(--muted)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--muted)] rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={40} className="mx-auto mb-3 text-[var(--muted-foreground)] opacity-40" />
              <p className="text-sm font-semibold mb-1">No conversations yet</p>
              <p className="text-xs text-[var(--muted-foreground)]">Contact a seller to start a conversation.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationListItem
                key={conv.id}
                conv={conv}
                listing={convListings[conv.id]}
                otherUser={convUsers[conv.id]}
                currentUserId={currentUser.id}
                active={conv.id === conversationId}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col bg-[var(--background)] ${conversationId ? 'flex' : 'hidden md:flex'}`}>
        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-[var(--muted-foreground)]">
            <MessageSquare size={48} className="opacity-20" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : !activeConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
              <button onClick={() => navigate('/messages')} className="md:hidden p-1 hover:bg-[var(--muted)] rounded">
                <ArrowLeft size={18} />
              </button>
              {activeListing?.images[0] && (
                <img src={activeListing.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{activeListing?.title}</p>
                <p className="text-xs text-[var(--primary)] font-mono font-semibold">{activeListing && formatPrice(activeListing.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                {activeOtherUser && (
                  <Link to={`/profile/${activeOtherUser.id}`} className="flex items-center gap-2 text-sm hover:opacity-80">
                    <img src={activeOtherUser.avatar} alt={activeOtherUser.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="hidden sm:block font-medium">{activeOtherUser.name}</span>
                  </Link>
                )}
                {activeListing && (
                  <Link to={`/listing/${activeListing.id}`} className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors font-medium">
                    View Listing
                  </Link>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeConv.messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const senderUser = isMe ? currentUser : activeOtherUser || undefined;
                return <MessageBubble key={msg.id} msg={msg} isMe={isMe} sender={senderUser || undefined} />;
              })}
              <div ref={bottomRef} />
            </div>

            {/* Message input */}
            <div className="bg-white border-t border-[var(--border)] p-4">
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-4 py-3 bg-[var(--muted)] rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--primary)] transition-all"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sending}
                  className="px-4 py-3 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
