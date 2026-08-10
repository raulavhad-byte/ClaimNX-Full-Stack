BEGIN;

-- Phase 10 global AI & Automation vocabulary. Existing values are never altered.
INSERT INTO public.reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (VALUES
 ('AUTOMATION_WORK_PURPOSE','Automation Work Purpose','Approved purpose of a durable Phase 10 automation request.'),
 ('AUTOMATION_WORK_STATUS','Automation Work Status','Lifecycle of a Phase 10 automation work request.'),
 ('AUTOMATION_JOB_STATUS','Automation Job Status','Lifecycle of one execution attempt.'),
 ('AUTOMATION_REVIEW_TYPE','Automation Review Type','Classification of a required human review.'),
 ('AUTOMATION_REVIEW_STATUS','Automation Review Status','Lifecycle of a Phase 10 human review case.'),
 ('AUTOMATION_INFERENCE_TYPE','Automation Inference Type','Classification of sanitized advisory AI output.'),
 ('AUTOMATION_OWNER_COMMAND_STATUS','Automation Owner Command Status','Lifecycle of a request delivered to an owning bounded context.'),
 ('AUTOMATION_DISPATCH_CHANNEL','Automation Dispatch Channel','Approved non-secret delivery channel.'),
 ('AUTOMATION_DISPATCH_STATUS','Automation Dispatch Status','Lifecycle of a controlled payer dispatch task.'),
 ('AUTOMATION_VERIFICATION_STATUS','Automation Verification Status','Verification state of a controlled dispatch result.')
) source(code,name,description)
WHERE NOT EXISTS (SELECT 1 FROM public.reference_categories c WHERE c.code = source.code);

WITH required_values(category_code, code, name, description, display_order, is_default) AS (VALUES
 ('AUTOMATION_WORK_PURPOSE','DOCUMENT_EXTRACTION','Document Extraction','Extract structured candidate facts from an authorized source.',1,TRUE),
 ('AUTOMATION_WORK_PURPOSE','CLAIM_READINESS_SCORING','Claim Readiness Scoring','Produce an advisory claim readiness score.',2,FALSE),
 ('AUTOMATION_WORK_PURPOSE','DISALLOWANCE_ANALYSIS','Disallowance Analysis','Produce an advisory disallowance insight.',3,FALSE),
 ('AUTOMATION_WORK_PURPOSE','PAYER_DISPATCH','Payer Dispatch','Request controlled external payer delivery.',4,FALSE),
 ('AUTOMATION_WORK_PURPOSE','RESPONSE_CLASSIFICATION','Response Classification','Classify an authorized inbound payer response.',5,FALSE),
 ('AUTOMATION_WORK_STATUS','QUEUED','Queued','Accepted and waiting for execution.',1,TRUE),
 ('AUTOMATION_WORK_STATUS','IN_PROGRESS','In Progress','Actively being processed.',2,FALSE),
 ('AUTOMATION_WORK_STATUS','REVIEW_REQUIRED','Review Required','Human review is required.',3,FALSE),
 ('AUTOMATION_WORK_STATUS','COMPLETED','Completed','Completed with retained safe result.',4,FALSE),
 ('AUTOMATION_WORK_STATUS','FAILED','Failed','Processing failed.',5,FALSE),
 ('AUTOMATION_WORK_STATUS','CANCELLED','Cancelled','Cancelled without owner action.',6,FALSE),
 ('AUTOMATION_JOB_STATUS','STARTED','Started','Execution attempt started.',1,TRUE),
 ('AUTOMATION_JOB_STATUS','SUCCEEDED','Succeeded','Execution attempt succeeded.',2,FALSE),
 ('AUTOMATION_JOB_STATUS','FAILED','Failed','Execution attempt failed.',3,FALSE),
 ('AUTOMATION_JOB_STATUS','TIMED_OUT','Timed Out','Execution attempt exceeded its limit.',4,FALSE),
 ('AUTOMATION_JOB_STATUS','RETRY_SCHEDULED','Retry Scheduled','A controlled retry is scheduled.',5,FALSE),
 ('AUTOMATION_JOB_STATUS','CANCELLED','Cancelled','Execution attempt cancelled.',6,FALSE),
 ('AUTOMATION_REVIEW_TYPE','LOW_CONFIDENCE_EXTRACTION','Low Confidence Extraction','Candidate extraction requires review.',1,TRUE),
 ('AUTOMATION_REVIEW_TYPE','READINESS_EXCEPTION','Readiness Exception','Readiness recommendation requires review.',2,FALSE),
 ('AUTOMATION_REVIEW_TYPE','DISALLOWANCE_EXCEPTION','Disallowance Exception','Disallowance insight requires review.',3,FALSE),
 ('AUTOMATION_REVIEW_TYPE','DISPATCH_EXCEPTION','Dispatch Exception','Dispatch result requires review.',4,FALSE),
 ('AUTOMATION_REVIEW_TYPE','INBOUND_RESPONSE_EXCEPTION','Inbound Response Exception','Inbound response classification requires review.',5,FALSE),
 ('AUTOMATION_REVIEW_STATUS','OPEN','Open','Awaiting review.',1,TRUE),
 ('AUTOMATION_REVIEW_STATUS','IN_REVIEW','In Review','Review is in progress.',2,FALSE),
 ('AUTOMATION_REVIEW_STATUS','APPROVED','Approved','Review approved.',3,FALSE),
 ('AUTOMATION_REVIEW_STATUS','REJECTED','Rejected','Review rejected.',4,FALSE),
 ('AUTOMATION_REVIEW_STATUS','CANCELLED','Cancelled','Review cancelled.',5,FALSE),
 ('AUTOMATION_INFERENCE_TYPE','DOCUMENT_FIELD_EXTRACTION','Document Field Extraction','Sanitized structured document candidate.',1,TRUE),
 ('AUTOMATION_INFERENCE_TYPE','CLAIM_READINESS_SCORE','Claim Readiness Score','Advisory readiness result.',2,FALSE),
 ('AUTOMATION_INFERENCE_TYPE','DISALLOWANCE_INSIGHT','Disallowance Insight','Advisory disallowance result.',3,FALSE),
 ('AUTOMATION_INFERENCE_TYPE','PAYER_RESPONSE_CLASSIFICATION','Payer Response Classification','Sanitized inbound payer response result.',4,FALSE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','PENDING','Pending','Awaiting owner processing.',1,TRUE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','ACCEPTED','Accepted','Owner accepted the request.',2,FALSE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','COMPLETED','Completed','Owner completed its command.',3,FALSE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','REJECTED','Rejected','Owner rejected the request.',4,FALSE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','FAILED','Failed','Owner command failed.',5,FALSE),
 ('AUTOMATION_OWNER_COMMAND_STATUS','CANCELLED','Cancelled','Owner command cancelled.',6,FALSE),
 ('AUTOMATION_DISPATCH_CHANNEL','EMAIL','Email','Approved email adapter.',1,TRUE),
 ('AUTOMATION_DISPATCH_CHANNEL','RPA_PORTAL','RPA Portal','Approved portal automation adapter.',2,FALSE),
 ('AUTOMATION_DISPATCH_CHANNEL','API','API','Approved payer API adapter.',3,FALSE),
 ('AUTOMATION_DISPATCH_STATUS','QUEUED','Queued','Dispatch accepted and durable.',1,TRUE),
 ('AUTOMATION_DISPATCH_STATUS','IN_PROGRESS','In Progress','Delivery adapter is active.',2,FALSE),
 ('AUTOMATION_DISPATCH_STATUS','COMPLETED','Completed','Delivery has verified safe result.',3,FALSE),
 ('AUTOMATION_DISPATCH_STATUS','FAILED','Failed','Delivery failed.',4,FALSE),
 ('AUTOMATION_DISPATCH_STATUS','REVIEW_REQUIRED','Review Required','Ambiguous delivery requires review.',5,FALSE),
 ('AUTOMATION_DISPATCH_STATUS','CANCELLED','Cancelled','Dispatch cancelled.',6,FALSE),
 ('AUTOMATION_VERIFICATION_STATUS','PENDING','Pending','Verification awaits evidence.',1,TRUE),
 ('AUTOMATION_VERIFICATION_STATUS','VERIFIED','Verified','Delivery/result verified.',2,FALSE),
 ('AUTOMATION_VERIFICATION_STATUS','NOT_VERIFIED','Not Verified','Delivery/result not verified.',3,FALSE),
 ('AUTOMATION_VERIFICATION_STATUS','REVIEW_REQUIRED','Review Required','Verification needs human review.',4,FALSE)
)
INSERT INTO public.reference_values(category_id, organization_id, code, name, description, display_order, is_default, is_active)
SELECT category.id, NULL, value.code, value.name, value.description, value.display_order, value.is_default, TRUE
FROM required_values value
JOIN public.reference_categories category ON category.code = value.category_code
WHERE NOT EXISTS (
 SELECT 1 FROM public.reference_values current_value
 WHERE current_value.category_id = category.id AND current_value.organization_id IS NULL
   AND current_value.code = value.code AND current_value.deleted_at IS NULL
   AND COALESCE(current_value.is_deleted,FALSE) = FALSE
);

COMMIT;
