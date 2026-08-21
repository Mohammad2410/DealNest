import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

// Admin client (service role — bypasses RLS, server-side only)
const supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Listings ─────────────────────────────────────────────────

// Get all active listings
app.get('/api/listings', async (req, res) => {
  const { query, categoryId, condition, location, minPrice, maxPrice, swapOnly, sellerId } = req.query;

  let q = supabaseAdmin
    .from('listings')
    .select('*, listing_images(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (condition) q = q.eq('condition', condition);
  if (location) q = q.ilike('location', `%${location}%`);
  if (minPrice) q = q.gte('price', Number(minPrice));
  if (maxPrice) q = q.lte('price', Number(maxPrice));
  if (swapOnly === 'true') q = q.eq('swap_available', true);
  if (sellerId) q = q.eq('seller_id', sellerId);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get a single listing
app.get('/api/listings/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*, listing_images(*), profiles(*)')
    .eq('id', req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// ── Categories ────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Users / Profiles ─────────────────────────────────────────
app.get('/api/profiles/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// ── Offers ───────────────────────────────────────────────────
app.get('/api/offers/:listingId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('*, offer_history(*)')
    .eq('listing_id', req.params.listingId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Transactions ──────────────────────────────────────────────
app.get('/api/transactions/:userId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .or(`buyer_id.eq.${req.params.userId},seller_id.eq.${req.params.userId}`)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Admin: Advance transaction status ─────────────────────────
app.post('/api/admin/transactions/:id/advance', async (req, res) => {
  const statusOrder = [
    'offer-accepted', 'transaction-created', 'seller-preparing',
    'out-for-delivery', 'delivered', 'completed',
  ];
  const { data: tx } = await supabaseAdmin.from('transactions').select('status').eq('id', req.params.id).single();
  if (!tx) return res.status(404).json({ error: 'Not found' });

  const currentIdx = statusOrder.indexOf(tx.status);
  if (currentIdx < statusOrder.length - 1) {
    const nextStatus = statusOrder[currentIdx + 1];
    await supabaseAdmin.from('transactions').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  }
  res.json({ ok: true });
});

// ── Notifications ─────────────────────────────────────────────
app.get('/api/notifications/:userId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ DealNest backend running on http://localhost:${PORT}`);
  console.log(`   Supabase: ${supabaseUrl}`);
});
