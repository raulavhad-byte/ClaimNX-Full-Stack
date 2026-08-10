param(
    [Parameter(Mandatory = $true)][string]$OrganizationId,
    [Parameter(Mandatory = $true)][string]$HospitalId,
    [Parameter(Mandatory = $true)][string]$ClaimId,
    [Parameter(Mandatory = $true)][string]$HospitalInsurancePartnerIntegrationId,
    [Parameter(Mandatory = $true)][string]$IcaClaimProductReferenceValueId,
    [Parameter(Mandatory = $true)][string]$WorkPurposeReferenceValueId,
    [Parameter(Mandatory = $true)][string]$QueuedWorkStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$InProgressWorkStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$CompletedWorkStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$SucceededJobStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$ReviewTypeReferenceValueId,
    [Parameter(Mandatory = $true)][string]$OpenReviewStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$ApprovedReviewStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$PendingCommandStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$EmailDispatchChannelReferenceValueId,
    [Parameter(Mandatory = $true)][string]$QueuedDispatchStatusReferenceValueId,
    [string]$BaseUrl = 'http://localhost:3000'
)

# ClaimNX Phase 10 AI & Automation REST API integration test.
# Prerequisite: `npm run start:dev` must be running in D:\Projects\backend.
# Creates durable automation audit evidence. It never sends a real credential,
# token, password, document, or external payer payload.

$ErrorActionPreference = 'Stop'

function Invoke-ClaimNxRequest {
    param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, [object]$Body = $null, [int[]]$ExpectedStatusCodes = @(200, 201))
    $parameters = @{ Method = $Method; Uri = $Uri; Headers = $Headers; ErrorAction = 'Stop' }
    if ($null -ne $Body) { $parameters.ContentType = 'application/json'; $parameters.Body = $Body | ConvertTo-Json -Depth 8 }
    try { return @{ StatusCode = 200; Body = (Invoke-RestMethod @parameters) } }
    catch {
        $response = $_.Exception.Response
        $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
        if ($ExpectedStatusCodes -contains $statusCode) { return @{ StatusCode = $statusCode; Body = $null } }
        # PowerShell 5.1 commonly exposes an HTTP error body here instead of on
        # the response stream. Prefer it so database/domain validation failures
        # remain visible during this test without logging secrets.
        $responseBody = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($responseBody) -and $response) {
            $stream = $response.GetResponseStream()
            if ($stream) {
                $reader = [System.IO.StreamReader]::new($stream)
                try { $responseBody = $reader.ReadToEnd() }
                finally { $reader.Dispose() }
            }
        }
        throw "ClaimNX API request failed: $Method $Uri | HTTP $statusCode | Response: $responseBody"
    }
}

function Get-ClaimNxPayload {
    param([object]$Response)
    if ($Response.PSObject.Properties.Name -contains 'data') { return $Response.data }
    return $Response
}

$testEmail = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try { $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer); $login = (Invoke-ClaimNxRequest -Method Post -Uri "$BaseUrl/auth/login" -Body @{ email = $testEmail; password = $plainPassword }).Body }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); Remove-Variable plainPassword -ErrorAction SilentlyContinue; Remove-Variable securePassword -ErrorAction SilentlyContinue }
if (-not $login.success -or -not $login.data.access_token) { throw 'Login did not return an access token.' }

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$baseRoute = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/automation"
$suffix = (New-Guid).ToString('N').Substring(0, 12).ToUpper()
$correlationId = [Guid]::NewGuid().ToString()

$workRequest = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/work-requests" -Headers $headers -Body @{
    claimId = $ClaimId; claimProductReferenceValueId = $IcaClaimProductReferenceValueId; workPurposeReferenceValueId = $WorkPurposeReferenceValueId
    queuedWorkStatusReferenceValueId = $QueuedWorkStatusReferenceValueId; sourceRecordType = 'CLAIM'; sourceRecordId = $ClaimId
    correlationId = $correlationId; idempotencyKey = "PH10-WORK-$suffix"; safeInputSummary = @{ purpose = 'API integration test'; containsRawDocument = $false }
}).Body)
if (-not $workRequest.automationWorkRequestId) { throw 'Work Request create response did not contain automationWorkRequestId.' }

$workRequestId = $workRequest.automationWorkRequestId
$started = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Patch -Uri "$baseRoute/work-requests/$workRequestId/start" -Headers $headers -Body @{ expectedVersion = 1; inProgressStatusReferenceValueId = $InProgressWorkStatusReferenceValueId }).Body)
if ($started.automationWorkRequestId -ne $workRequestId) { throw 'Work Request start did not return the expected ID.' }

$now = (Get-Date).ToUniversalTime()
$jobAttempt = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/work-requests/$workRequestId/job-attempts" -Headers $headers -Body @{
    expectedRequestVersion = 2; attemptNumber = 1; jobStatusReferenceValueId = $SucceededJobStatusReferenceValueId; resultingWorkStatusReferenceValueId = $CompletedWorkStatusReferenceValueId
    providerCode = 'PH10_TEST'; modelIdentifier = 'test-only'; policyVersion = 'v1'; externalCorrelationReference = "PH10-$suffix"
    startedAt = $now.ToString('o'); completedAt = $now.AddSeconds(1).ToString('o')
}).Body)
if (-not $jobAttempt.automationJobAttemptId) { throw 'Job Attempt response did not contain automationJobAttemptId.' }

$reviewCase = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/review-cases" -Headers $headers -Body @{
    claimId = $ClaimId; automationWorkRequestId = $workRequestId; reviewTypeReferenceValueId = $ReviewTypeReferenceValueId; openReviewStatusReferenceValueId = $OpenReviewStatusReferenceValueId
    correlationId = $correlationId; summary = 'Phase 10 API integration test review. No clinical document content is stored.'
}).Body)
if (-not $reviewCase.automationReviewCaseId) { throw 'Review Case response did not contain automationReviewCaseId.' }

$reviewDecision = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/review-cases/$($reviewCase.automationReviewCaseId)/decisions" -Headers $headers -Body @{
    expectedCaseVersion = 1; decisionSequence = 1; decisionCode = 'APPROVE'; finalValue = @{ approvedForTest = $true }
    decisionReason = 'Phase 10 controlled API integration test.'; reviewStatusReferenceValueId = $ApprovedReviewStatusReferenceValueId
}).Body)
if (-not $reviewDecision.automationReviewDecisionId) { throw 'Review Decision response did not contain automationReviewDecisionId.' }

$ownerCommand = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/owner-command-requests" -Headers $headers -Body @{
    claimId = $ClaimId; automationReviewCaseId = $reviewCase.automationReviewCaseId; targetContext = 'CLAIMS'; commandType = 'REFRESH_READINESS'
    commandPayload = @{ testOnly = $true }; commandStatusReferenceValueId = $PendingCommandStatusReferenceValueId; correlationId = $correlationId; idempotencyKey = "PH10-OWNER-$suffix"
}).Body)
if (-not $ownerCommand.automationOwnerCommandRequestId) { throw 'Owner Command response did not contain automationOwnerCommandRequestId.' }

$dispatch = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/payer-dispatch-tasks" -Headers $headers -Body @{
    claimId = $ClaimId; claimProductReferenceValueId = $IcaClaimProductReferenceValueId; hospitalInsurancePartnerIntegrationId = $HospitalInsurancePartnerIntegrationId
    dispatchChannelReferenceValueId = $EmailDispatchChannelReferenceValueId; queuedDispatchStatusReferenceValueId = $QueuedDispatchStatusReferenceValueId
    credentialSecretReference = "vault://claimnx/integration-test/$suffix"; correlationId = $correlationId; idempotencyKey = "PH10-DISPATCH-$suffix"
}).Body)
if (-not $dispatch.payerDispatchTaskId) { throw 'Payer Dispatch response did not contain payerDispatchTaskId.' }

$secretRejected = Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/payer-dispatch-tasks" -Headers $headers -ExpectedStatusCodes @(400) -Body @{
    claimId = $ClaimId; claimProductReferenceValueId = $IcaClaimProductReferenceValueId; hospitalInsurancePartnerIntegrationId = $HospitalInsurancePartnerIntegrationId
    dispatchChannelReferenceValueId = $EmailDispatchChannelReferenceValueId; queuedDispatchStatusReferenceValueId = $QueuedDispatchStatusReferenceValueId
    credentialSecretReference = 'password=not-a-secret'; idempotencyKey = "PH10-REJECT-$suffix"
}
$tenantIsolation = Invoke-ClaimNxRequest -Method Post -Uri "$BaseUrl/v1/organizations/$([Guid]::NewGuid())/hospitals/$HospitalId/automation/work-requests" -Headers $headers -ExpectedStatusCodes @(403) -Body @{
    claimId = $ClaimId; claimProductReferenceValueId = $IcaClaimProductReferenceValueId; workPurposeReferenceValueId = $WorkPurposeReferenceValueId; queuedWorkStatusReferenceValueId = $QueuedWorkStatusReferenceValueId
    sourceRecordType = 'CLAIM'; idempotencyKey = "PH10-UNAUTHORIZED-$suffix"
}

[PSCustomObject]@{
    automation_work_request_id = $workRequestId
    automation_job_attempt_id = $jobAttempt.automationJobAttemptId
    automation_review_case_id = $reviewCase.automationReviewCaseId
    automation_review_decision_id = $reviewDecision.automationReviewDecisionId
    automation_owner_command_request_id = $ownerCommand.automationOwnerCommandRequestId
    payer_dispatch_task_id = $dispatch.payerDispatchTaskId
    durable_test_records_created = $true
    secret_rejection_status_expected = 400
    secret_rejection_status_actual = $secretRejected.StatusCode
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $tenantIsolation.StatusCode
    credential_secret_reference_exposed = (($dispatch | ConvertTo-Json -Depth 8) -match 'vault://')
} | Format-List
