-- Enhance messaging system with modern social features
-- Add support for: images, GIFs, message deletion, reactions, typing indicators

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif')),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS gif_url TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create typing indicators table (ephemeral, cleaned up regularly)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- RLS policies for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add reactions to messages in their conversations" ON message_reactions;
CREATE POLICY "Users can add reactions to messages in their conversations" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view typing in their conversations" ON typing_indicators;
CREATE POLICY "Users can view typing in their conversations" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can set their own typing status" ON typing_indicators;
CREATE POLICY "Users can set their own typing status" ON typing_indicators
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own typing status" ON typing_indicators;
CREATE POLICY "Users can update their own typing status" ON typing_indicators
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can clear their own typing status" ON typing_indicators;
CREATE POLICY "Users can clear their own typing status" ON typing_indicators
  FOR DELETE USING (auth.uid() = user_id);

-- Update messages RLS to allow soft delete (update deleted_at)
DROP POLICY IF EXISTS "Users can soft delete their own messages" ON messages;
CREATE POLICY "Users can soft delete their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'typing_indicators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
  END IF;
END $$;

COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE typing_indicators IS 'Ephemeral typing status for conversations';
