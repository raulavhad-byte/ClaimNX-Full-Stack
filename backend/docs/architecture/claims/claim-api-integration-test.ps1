param(
    [Parameter(Mandatory = $true)][string]$OrganizationId,
    [Parameter(Mandatory = $true)][string]$HospitalId,
    [Parameter(Mandatory = $true)][string]$IcaClaimProductReferenceValueId,
    [Parameter(Mandatory = $true)][string]$CashlessClaimTypeReferenceValueId,
    [Parameter(Mandatory = $true)][string]$DraftLifecycleStatusReferenceValueId,
    [Parameter(Mandatory = $true)][string]$ReadyForReviewLifecycleStatusReferenceValueId,
    [string]$BaseUrl = 'http://localhost:3000'
)

# ClaimNX Phase 8 REST API integration test.
# Prerequisite: `npm run start:dev` must be running in D:\Projects\backend.
# This script creates one durable ICA Draft Claim, verifies tenant-scoped reads,
# moves it to READY_FOR_REVIEW, and validates optimistic-concurrency handling.
# It deliberately does not delete the Claim: Claim lifecycle history is append-only,
# and Phase 8 has no approved Claim retirement command.

$ErrorActionPreference = 'Stop'

function Invoke-ClaimNxRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int[]]$ExpectedStatusCodes = @(200, 201)
    )

    $parameters = @{ Method = $Method; Uri = $Uri; Headers = $Headers; ErrorAction = 'Stop' }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = $Body | ConvertTo-Json -Depth 8
    }

    try {
        return @{ StatusCode = 200; Body = (Invoke-RestMethod @parameters) }
    }
    catch {
        $response = $_.Exception.Response
        $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
        if ($ExpectedStatusCodes -contains $statusCode) {
            return @{ StatusCode = $statusCode; Body = $null }
        }

        $responseBody = ''
        if ($response) {
            try {
                $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $reader.Dispose()
            }
            catch { $responseBody = $_.Exception.Message }
        }
        throw "ClaimNX API request failed: $Method $Uri | HTTP $statusCode | $responseBody"
    }
}

function Get-ClaimNxPayload {
    param([Parameter(Mandatory = $true)][object]$Response)

    # ClaimNX uses a standard `{ success, data }` response envelope.
    # Keep the script compatible with a future direct-response endpoint as well.
    if ($Response.PSObject.Properties.Name -contains 'data') {
        return $Response.data
    }
    return $Response
}

$testEmail = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = (Invoke-ClaimNxRequest -Method Post -Uri "$BaseUrl/auth/login" -Body @{ email = $testEmail; password = $plainPassword }).Body
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Variable plainPassword -ErrorAction SilentlyContinue
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}

if (-not $login.success -or -not $login.data.access_token) {
    throw 'Login did not return an access token.'
}

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$baseRoute = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/claims"
$testLabel = "Phase 8 ICA API integration $((New-Guid).ToString('N').Substring(0, 12).ToUpper())"

$created = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri $baseRoute -Headers $headers -Body @{
    claimProductReferenceValueId = $IcaClaimProductReferenceValueId
    claimTypeReferenceValueId = $CashlessClaimTypeReferenceValueId
    draftLifecycleStatusReferenceValueId = $DraftLifecycleStatusReferenceValueId
    currencyCode = 'INR'
    totalClaimedAmount = 0
    authorizationReference = $testLabel
}).Body)

if (-not $created.claimId) { throw 'Create response did not contain claimId.' }
if ($created.claimNumber -notmatch '^CLM-') { throw 'Create response did not contain a ClaimNX claim number.' }
if ($created.version -ne 1) { throw 'New Claim version must be 1.' }

$claimId = $created.claimId
$retrieved = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Get -Uri "$baseRoute/$claimId" -Headers $headers).Body)
if ($retrieved.claimId -ne $claimId -or $retrieved.lifecycleStatus.code -ne 'DRAFT') {
    throw 'Tenant-scoped Claim read did not return the expected Draft Claim.'
}

$transitioned = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Patch -Uri "$baseRoute/$claimId/lifecycle" -Headers $headers -Body @{
    expectedVersion = $retrieved.version
    targetLifecycleStatusReferenceValueId = $ReadyForReviewLifecycleStatusReferenceValueId
    transitionReason = 'Phase 8 API integration-test progression to review.'
}).Body)
if ($transitioned.lifecycleStatus.code -ne 'READY_FOR_REVIEW' -or $transitioned.version -ne 2) {
    throw 'Claim lifecycle transition did not produce READY_FOR_REVIEW at version 2.'
}

$stale = Invoke-ClaimNxRequest -Method Patch -Uri "$baseRoute/$claimId/lifecycle" -Headers $headers -ExpectedStatusCodes @(409) -Body @{
    expectedVersion = 1
    targetLifecycleStatusReferenceValueId = $ReadyForReviewLifecycleStatusReferenceValueId
    transitionReason = 'Intentional stale-version verification.'
}

$unauthorizedOrganizationId = [Guid]::NewGuid().ToString()
$tenantIsolation = Invoke-ClaimNxRequest -Method Get -Uri "$BaseUrl/v1/organizations/$unauthorizedOrganizationId/hospitals/$HospitalId/claims/$claimId" -Headers $headers -ExpectedStatusCodes @(403)

[PSCustomObject]@{
    claim_id = $claimId
    claim_number = $transitioned.claimNumber
    lifecycle_status_after_transition = $transitioned.lifecycleStatus.code
    version_incremented = ($transitioned.version -eq 2)
    stale_update_status_expected = 409
    stale_update_status_actual = $stale.StatusCode
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $tenantIsolation.StatusCode
    durable_test_record_created = $true
} | Format-List
