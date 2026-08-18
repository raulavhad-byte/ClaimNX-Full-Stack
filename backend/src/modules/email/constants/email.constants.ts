export const EMAIL_MODULE_CONSTANTS = {
  CLAIM_CORRELATION_PREFIX: 'ClaimNX',
  HEADER_CLAIM_ID: 'X-ClaimNX-Claim-Id',
  HEADER_CORRELATION_ID: 'X-ClaimNX-Correlation-Id',
  HEADER_HOSPITAL_ID: 'X-ClaimNX-Hospital-Id',
  DEFAULT_CONFIDENCE_THRESHOLD: 0.85,
  MAX_ATTACHMENT_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_TOTAL_ATTACHMENT_SIZE_BYTES: 25 * 1024 * 1024, // Gmail-compatible combined limit
  ALLOWED_ATTACHMENT_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Macro-free spreadsheet/report formats. Macro-enabled workbooks and
    // archives remain blocked by AttachmentSecurityService.
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ],
  TRUSTED_PAYER_DOMAINS: [
    'starhealth.in',
    'hdfcergo.com',
    'icicilombard.com',
    'careinsurance.com',
    'mediassist.in',
    'vidalhealthtpa.com',
    'mdindia.com',
    'bajajallianz.co.in',
    'tataaig.com',
    'godigit.com',
    'adityabirlacapital.com',
    'nivabupa.com',
    'paramounttpa.com',
    'heritagehealthtpa.com',
    'fhpl.net'
  ]
};
