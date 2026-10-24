ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id);

DELETE FROM documents WHERE user_id IS NULL AND id IN ('annual-report', 'company-policy', 'product-docs');

UPDATE documents SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL;