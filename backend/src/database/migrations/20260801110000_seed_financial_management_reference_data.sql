BEGIN;

-- Phase 9 global Finance reference vocabulary. Existing values are never altered.
INSERT INTO public.reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (VALUES
 ('FINANCIAL_REMITTANCE_SOURCE_TYPE','Financial Remittance Source Type','Approved source for a non-secret remittance advice.'),
 ('FINANCIAL_REMITTANCE_STATUS','Financial Remittance Status','Lifecycle of a payer remittance batch.'),
 ('FINANCIAL_REMITTANCE_LINE_STATUS','Financial Remittance Line Status','Matching and posting status of a remittance line.'),
 ('FINANCIAL_SETTLEMENT_STATUS','Financial Settlement Status','Lifecycle of a claim financial settlement.'),
 ('FINANCIAL_DEDUCTION_TYPE','Financial Deduction Type','Controlled classification of a payer deduction.'),
 ('FINANCIAL_RESPONSIBILITY_TYPE','Financial Responsibility Type','Payer, patient, or hospital write-off responsibility.'),
 ('FINANCIAL_RECOVERY_TYPE','Financial Recovery Type','Controlled classification of a recovery.'),
 ('FINANCIAL_RECOVERY_STATUS','Financial Recovery Status','Lifecycle of a recovery.'),
 ('FINANCIAL_RECONCILIATION_STATUS','Financial Reconciliation Status','Lifecycle of a reconciliation activity.'),
 ('FINANCIAL_BANK_MATCH_STATUS','Financial Bank Match Status','Allocation state for a bank statement line.'),
 ('FINANCIAL_POSTING_TYPE','Financial Posting Type','Immutable ledger posting classification.')
) source(code,name,description)
WHERE NOT EXISTS (SELECT 1 FROM public.reference_categories c WHERE c.code = source.code);

WITH required_values(category_code, code, name, description, display_order, is_default) AS (VALUES
 ('FINANCIAL_REMITTANCE_SOURCE_TYPE','EMAIL','Email','Approved monitored mailbox source.',1,TRUE),('FINANCIAL_REMITTANCE_SOURCE_TYPE','PAYER_PORTAL','Payer Portal','Approved payer portal source.',2,FALSE),('FINANCIAL_REMITTANCE_SOURCE_TYPE','API','API','Approved payer API source.',3,FALSE),('FINANCIAL_REMITTANCE_SOURCE_TYPE','MANUAL_IMPORT','Manual Import','Authorized manual import.',4,FALSE),
 ('FINANCIAL_REMITTANCE_STATUS','DRAFT','Draft','Draft remittance.',1,TRUE),('FINANCIAL_REMITTANCE_STATUS','RECEIVED','Received','Advice received.',2,FALSE),('FINANCIAL_REMITTANCE_STATUS','VALIDATED','Validated','Advice validated.',3,FALSE),('FINANCIAL_REMITTANCE_STATUS','POSTED','Posted','Finance posting created.',4,FALSE),('FINANCIAL_REMITTANCE_STATUS','RETIRED','Retired','Soft-retired advice.',5,FALSE),
 ('FINANCIAL_REMITTANCE_LINE_STATUS','UNMATCHED','Unmatched','No Claim match.',1,TRUE),('FINANCIAL_REMITTANCE_LINE_STATUS','MATCHED','Matched','Claim match approved.',2,FALSE),('FINANCIAL_REMITTANCE_LINE_STATUS','EXCEPTION','Exception','Review required.',3,FALSE),('FINANCIAL_REMITTANCE_LINE_STATUS','POSTED','Posted','Posting created.',4,FALSE),
 ('FINANCIAL_SETTLEMENT_STATUS','DRAFT','Draft','Draft settlement.',1,TRUE),('FINANCIAL_SETTLEMENT_STATUS','CONFIRMED','Confirmed','Settlement approved.',2,FALSE),('FINANCIAL_SETTLEMENT_STATUS','POSTED','Posted','Posting created.',3,FALSE),('FINANCIAL_SETTLEMENT_STATUS','CANCELLED','Cancelled','Cancelled before posting.',4,FALSE),('FINANCIAL_SETTLEMENT_STATUS','RETIRED','Retired','Soft-retired settlement.',5,FALSE),
 ('FINANCIAL_DEDUCTION_TYPE','TDS','TDS','Tax deducted at source.',1,TRUE),('FINANCIAL_DEDUCTION_TYPE','CONTRACTUAL','Contractual Deduction','Contractual adjustment.',2,FALSE),('FINANCIAL_DEDUCTION_TYPE','NON_PAYABLE','Non-Payable','Payer non-payable.',3,FALSE),('FINANCIAL_DEDUCTION_TYPE','CO_PAYMENT','Co-payment','Patient co-payment.',4,FALSE),('FINANCIAL_DEDUCTION_TYPE','POLICY_EXCLUSION','Policy Exclusion','Policy exclusion.',5,FALSE),('FINANCIAL_DEDUCTION_TYPE','OTHER','Other Deduction','Reviewed other deduction.',6,FALSE),
 ('FINANCIAL_RESPONSIBILITY_TYPE','PAYER','Payer','Payer responsibility.',1,TRUE),('FINANCIAL_RESPONSIBILITY_TYPE','PATIENT','Patient','Patient responsibility.',2,FALSE),('FINANCIAL_RESPONSIBILITY_TYPE','HOSPITAL_WRITE_OFF','Hospital Write-off','Hospital write-off.',3,FALSE),
 ('FINANCIAL_RECOVERY_TYPE','OVERPAYMENT','Overpayment','Excess payment.',1,TRUE),('FINANCIAL_RECOVERY_TYPE','DUPLICATE_PAYMENT','Duplicate Payment','Duplicate payment.',2,FALSE),('FINANCIAL_RECOVERY_TYPE','PAYMENT_REVERSAL','Payment Reversal','Reversal or clawback.',3,FALSE),('FINANCIAL_RECOVERY_TYPE','OTHER','Other Recovery','Reviewed other recovery.',4,FALSE),
 ('FINANCIAL_RECOVERY_STATUS','OPEN','Open','Outstanding recovery.',1,TRUE),('FINANCIAL_RECOVERY_STATUS','IN_PROGRESS','In Progress','Recovery underway.',2,FALSE),('FINANCIAL_RECOVERY_STATUS','RECOVERED','Recovered','Fully recovered.',3,FALSE),('FINANCIAL_RECOVERY_STATUS','WRITTEN_OFF','Written Off','Approved write-off.',4,FALSE),('FINANCIAL_RECOVERY_STATUS','CANCELLED','Cancelled','Cancelled recovery.',5,FALSE),
 ('FINANCIAL_RECONCILIATION_STATUS','OPEN','Open','Awaiting review.',1,TRUE),('FINANCIAL_RECONCILIATION_STATUS','IN_PROGRESS','In Progress','Matching underway.',2,FALSE),('FINANCIAL_RECONCILIATION_STATUS','RECONCILED','Reconciled','Reconciliation complete.',3,FALSE),('FINANCIAL_RECONCILIATION_STATUS','EXCEPTION','Exception','Investigation required.',4,FALSE),('FINANCIAL_RECONCILIATION_STATUS','CLOSED','Closed','Reconciliation closed.',5,FALSE),
 ('FINANCIAL_BANK_MATCH_STATUS','UNMATCHED','Unmatched','No allocation.',1,TRUE),('FINANCIAL_BANK_MATCH_STATUS','PARTIALLY_MATCHED','Partially Matched','Partial allocation.',2,FALSE),('FINANCIAL_BANK_MATCH_STATUS','MATCHED','Matched','Full allocation.',3,FALSE),('FINANCIAL_BANK_MATCH_STATUS','REVERSED','Reversed','Compensating reversal.',4,FALSE),('FINANCIAL_BANK_MATCH_STATUS','EXCEPTION','Exception','Review required.',5,FALSE),
 ('FINANCIAL_POSTING_TYPE','SETTLEMENT','Settlement Posting','Payer settlement.',1,TRUE),('FINANCIAL_POSTING_TYPE','SETTLEMENT_DEDUCTION','Settlement Deduction Posting','Deduction or TDS.',2,FALSE),('FINANCIAL_POSTING_TYPE','RECOVERY','Recovery Posting','Recovery amount.',3,FALSE),('FINANCIAL_POSTING_TYPE','WRITE_OFF','Write-off Posting','Authorized write-off.',4,FALSE),('FINANCIAL_POSTING_TYPE','CORRECTION','Correction Posting','Compensating correction.',5,FALSE)
)
INSERT INTO public.reference_values(category_id,organization_id,code,name,description,display_order,is_default,is_active)
SELECT c.id,NULL,v.code,v.name,v.description,v.display_order,v.is_default,TRUE
FROM required_values v JOIN public.reference_categories c ON c.code=v.category_code
WHERE NOT EXISTS (SELECT 1 FROM public.reference_values x WHERE x.category_id=c.id AND x.organization_id IS NULL AND x.code=v.code AND x.deleted_at IS NULL AND COALESCE(x.is_deleted,FALSE)=FALSE);

COMMIT;
