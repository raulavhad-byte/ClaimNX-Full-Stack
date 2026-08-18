BEGIN;

-- OCR results can contain PHI. Source documents are processed transiently;
-- only auditable metadata, hash, extraction output, and confidence are kept.
CREATE TABLE IF NOT EXISTS ocr_document_extractions (
  id UUID PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_mime_type TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_extractions_hospital_created
  ON ocr_document_extractions(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_extractions_uploaded_by_created
  ON ocr_document_extractions(uploaded_by, created_at DESC);

ALTER TABLE ocr_document_extractions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ocr_document_extractions FROM anon, authenticated;

COMMIT;
