-- ============================================================
-- SwapBD Supabase Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default '',
  avatar_url text default '',
  phone text,
  location text not null default 'Dhaka',
  bio text,
  rating numeric(3,2) default 5.00,
  review_count int default 0,
  completed_transactions int default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text not null default '📦',
  listing_count int default 0
);

alter table public.categories enable row level security;
create policy "Categories viewable by everyone" on public.categories for select using (true);

insert into public.categories (id, name, slug, icon) values
  ('phones', 'Phones & Tablets', 'phones-tablets', '📱'),
  ('laptops', 'Laptops & Computers', 'laptops-computers', '💻'),
  ('audio', 'Audio & Headphones', 'audio-headphones', '🎧'),
  ('cameras', 'Cameras & Photography', 'cameras-photography', '📷'),
  ('gaming', 'Gaming', 'gaming', '🎮'),
  ('tvs', 'TVs & Monitors', 'tvs-monitors', '📺'),
  ('appliances', 'Home Appliances', 'home-appliances', '🏠'),
  ('fashion', 'Fashion & Clothing', 'fashion-clothing', '👕'),
  ('books', 'Books & Education', 'books-education', '📚'),
  ('sports', 'Sports & Fitness', 'sports-fitness', '⚽'),
  ('vehicles', 'Vehicles & Parts', 'vehicles-parts', '🚗'),
  ('other', 'Other', 'other', '📦')
on conflict (id) do nothing;

-- ============================================================
-- LISTINGS
-- ============================================================
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null,
  description text not null default '',
  price int not null default 0,
  negotiable boolean default false,
  condition text not null default 'used-good',
  category_id text references public.categories(id),
  brand text,
  location text not null default 'Dhaka',
  status text not null default 'active',
  swap_available boolean default false,
  swap_interests text[],
  seller_id uuid references public.profiles(id) on delete cascade not null,
  view_count int default 0,
  favorite_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listings enable row level security;
create policy "Listings viewable by everyone" on public.listings for select using (true);
create policy "Sellers can insert own listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "Sellers can update own listings" on public.listings for update using (auth.uid() = seller_id);
create policy "Sellers can delete own listings" on public.listings for delete using (auth.uid() = seller_id);

-- ============================================================
-- LISTING IMAGES
-- ============================================================
create table if not exists public.listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  url text not null,
  alt text default '',
  is_primary boolean default false,
  sort_order int default 0
);

alter table public.listing_images enable row level security;
create policy "Listing images viewable by everyone" on public.listing_images for select using (true);
create policy "Sellers can manage listing images" on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- ============================================================
-- OFFERS
-- ============================================================
create table if not exists public.offers (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  amount int not null,
  status text not null default 'pending',
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.offers enable row level security;
create policy "Offer parties can view" on public.offers for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers can create offers" on public.offers for insert with check (auth.uid() = buyer_id);
create policy "Offer parties can update" on public.offers for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ============================================================
-- OFFER HISTORY
-- ============================================================
create table if not exists public.offer_history (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid references public.offers(id) on delete cascade not null,
  amount int not null,
  message text,
  from_user_id uuid references public.profiles(id) not null,
  type text not null,
  created_at timestamptz default now()
);

alter table public.offer_history enable row level security;
create policy "Offer history viewable by offer parties" on public.offer_history for select
  using (exists (
    select 1 from public.offers o
    where o.id = offer_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  ));
create policy "Offer parties can insert history" on public.offer_history for insert
  with check (from_user_id = auth.uid());

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  unread_count int default 0,
  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

create policy "Participants can view conversations" on public.conversations for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  ));
create policy "Authenticated users can create conversations" on public.conversations for insert
  with check (auth.uid() is not null);

create policy "Participants can view" on public.conversation_participants for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
  ));
create policy "Can insert participants" on public.conversation_participants for insert
  with check (auth.uid() is not null);
create policy "Can update own unread" on public.conversation_participants for update
  using (user_id = auth.uid());

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  type text not null default 'text',
  offer_amount int,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Participants can read messages" on public.messages for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));
create policy "Participants can send messages" on public.messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- FAVORITES
-- ============================================================
create table if not exists public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;
create policy "Users can view own favorites" on public.favorites for select using (user_id = auth.uid());
create policy "Users can manage own favorites" on public.favorites for all using (user_id = auth.uid());

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'sale',
  status text not null default 'transaction-created',
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id),
  listing_title text not null,
  listing_image_url text default '',
  agreed_price int not null,
  cash_adjustment int default 0,
  platform_fee int not null default 30,
  total_amount int not null,
  payment_method text default 'cash-on-delivery',
  offer_id uuid references public.offers(id),
  delivery_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Transaction parties can view" on public.transactions for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Authenticated users can create transactions" on public.transactions for insert
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Transaction parties can update" on public.transactions for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  listing_id uuid,
  offer_id uuid,
  transaction_id uuid,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Users can update own notifications" on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKET for listing images
-- ============================================================
insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Anyone can view listing images" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "Authenticated users can upload listing images" on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.uid() is not null);
create policy "Users can delete own listing images" on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.uid() is not null);
