CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Processing',
  chunk_count INT NOT NULL DEFAULT 0,
  extracted_text LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX documents_created_idx (created_at)
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL,
  chunk_index INT NOT NULL,
  page_number INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY document_chunk_order (document_id, chunk_index),
  CONSTRAINT document_chunks_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX document_chunks_document_idx (document_id)
);
