import { Conversation, Message, MessageType } from '../types';
import { supabase } from '../utils/supabase/client';

function rowToConversation(row: Record<string, unknown>): Conversation {
  const participants = ((row.conversation_participants as Record<string, unknown>[]) || [])
    .map(p => p.user_id as string);

  const unreadCount: Record<string, number> = {};
  ((row.conversation_participants as Record<string, unknown>[]) || []).forEach(p => {
    unreadCount[p.user_id as string] = (p.unread_count as number) || 0;
  });

  const messages: Message[] = ((row.messages as Record<string, unknown>[]) || [])
    .sort((a, b) => new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime())
    .map(m => ({
      id: m.id as string,
      conversationId: m.conversation_id as string,
      senderId: m.sender_id as string,
      content: m.content as string,
      type: m.type as MessageType,
      offerAmount: m.offer_amount as number | undefined,
      createdAt: m.created_at as string,
    }));

  const lastMessage = messages[messages.length - 1];

  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    participants,
    messages,
    lastMessage,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    unreadCount,
  };
}

const CONV_SELECT = `*, conversation_participants(user_id, unread_count), messages(*)`;

export const conversationService = {
  async getForUser(userId: string): Promise<Conversation[]> {
    // Get conversation IDs for this user
    const { data: partData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!partData || partData.length === 0) return [];

    const ids = (partData as { conversation_id: string }[]).map(p => p.conversation_id);

    const { data, error } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .in('id', ids)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToConversation);
  },

  async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return rowToConversation(data as Record<string, unknown>);
  },

  async getByListing(listingId: string, userId: string): Promise<Conversation | null> {
    const { data: partData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!partData || partData.length === 0) return null;
    const ids = (partData as { conversation_id: string }[]).map(p => p.conversation_id);

    const { data } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .eq('listing_id', listingId)
      .in('id', ids)
      .single();

    if (!data) return null;
    return rowToConversation(data as Record<string, unknown>);
  },

  async getOrCreate(listingId: string, participants: [string, string]): Promise<Conversation> {
    // Try to find existing
    const existing = await conversationService.getByListing(listingId, participants[0]);
    if (existing && existing.participants.includes(participants[1])) return existing;

    // Create new conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId })
      .select()
      .single();

    if (error || !conv) throw new Error('Failed to create conversation');
    const convId = (conv as Record<string, unknown>).id as string;

    // Add participants
    await supabase.from('conversation_participants').insert(
      participants.map(uid => ({ conversation_id: convId, user_id: uid, unread_count: 0 })),
    );

    return (await conversationService.getById(convId)) as Conversation;
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text',
    offerAmount?: number,
  ): Promise<Message> {
    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type,
        offer_amount: offerAmount || null,
      })
      .select()
      .single();

    if (error || !msg) throw new Error(error?.message || 'Failed to send message');

    // Update conversation updated_at and increment unread for others
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

    // Get other participants and increment their unread count
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('user_id, unread_count')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);

    if (parts) {
      for (const p of parts as { user_id: string; unread_count: number }[]) {
        await supabase.from('conversation_participants')
          .update({ unread_count: (p.unread_count || 0) + 1 })
          .eq('conversation_id', conversationId)
          .eq('user_id', p.user_id);
      }
    }

    const m = msg as Record<string, unknown>;
    return {
      id: m.id as string,
      conversationId: m.conversation_id as string,
      senderId: m.sender_id as string,
      content: m.content as string,
      type: m.type as MessageType,
      offerAmount: m.offer_amount as number | undefined,
      createdAt: m.created_at as string,
    };
  },

  async markRead(conversationId: string, userId: string): Promise<void> {
    await supabase.from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  async totalUnread(userId: string): Promise<number> {
    const { data } = await supabase
      .from('conversation_participants')
      .select('unread_count')
      .eq('user_id', userId);
    if (!data) return 0;
    return (data as { unread_count: number }[]).reduce((sum, p) => sum + (p.unread_count || 0), 0);
  },
};
