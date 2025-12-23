-- Add settings to control posts and comments in sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_posts BOOLEAN DEFAULT true;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_sessions_allow_posts ON sessions(allow_posts);
CREATE INDEX IF NOT EXISTS idx_sessions_allow_comments ON sessions(allow_comments);

COMMENT ON COLUMN sessions.allow_posts IS 'Whether participants can add image posts to this session';
COMMENT ON COLUMN sessions.allow_comments IS 'Whether participants can add text comments to this session';
