-- Development schema source. Apply to development only.
-- Replit Publishing provisions/synchronizes the managed production schema.
CREATE TABLE IF NOT EXISTS public.study_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  source TEXT NOT NULL DEFAULT 'bible',
  reference TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_notes_user_updated_idx
  ON public.study_notes (user_id, updated_at DESC, id DESC);
