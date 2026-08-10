param(
    [Parameter(Mandatory = $true)][string]$OrganizationId,
    [Parameter(Mandatory = $true)][string]$HospitalId,
    [Parameter(Mandatory = $true)][string]$InsurancePartnerId,
    [Parameter(Mandatory = $true)][string]$ClaimProductReferenceValueId,
    [Parameter(Mandatory = $true)][string]$RemittanceSourceTypeReferenceValueId,
    [Parameter(Mandatory = $true)][string]$RemittanceStatusReferenceValueId,
    [string]$BaseUrl = 'http://localhost:3000'
)

# ClaimNX Phase 9 Financial Management REST API integration test.
# Prerequisite: `npm run start:dev` must be running in D:\Projects\backend.
# This script creates one durable Remittance Batch and its Evidence record.
# No delete command is approved for these financial records; retain the returned IDs
# as audit evidence and use the unique PH9-API prefix to identify them.

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
        throw "ClaimNX API request failed: $Method $Uri | HTTP $statusCode"
    }
}

function Get-ClaimNxPayload {
    param([Parameter(Mandatory = $true)][object]$Response)
    if ($Response.PSObject.Properties.Name -contains 'data') { return $Response.data }
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

if (-not $login.success -or -not $login.data.access_token) { throw 'Login did not return an access token.' }

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$baseRoute = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/financial"
$testSuffix = (New-Guid).ToString('N').Substring(0, 12).ToUpper()
$batchReference = "PH9-API-$testSuffix"

$batch = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/remittance-batches" -Headers $headers -Body @{
    insurancePartnerId = $InsurancePartnerId
    claimProductReferenceValueId = $ClaimProductReferenceValueId
    remittanceSourceTypeReferenceValueId = $RemittanceSourceTypeReferenceValueId
    remittanceStatusReferenceValueId = $RemittanceStatusReferenceValueId
    remittanceReference = $batchReference
    receivedAt = (Get-Date).ToUniversalTime().ToString('o')
    currencyCode = 'INR'
    grossAmount = 0
    netAmount = 0
    notes = 'Phase 9 REST API integration test; contains no credentials or payer payload.'
}).Body)

if (-not $batch.financialRemittanceBatchId) { throw 'Batch create response did not contain financialRemittanceBatchId.' }

$evidence = Get-ClaimNxPayload ((Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/remittance-evidence" -Headers $headers -Body @{
    financialRemittanceBatchId = $batch.financialRemittanceBatchId
    storageObjectReference = "integration-tests/financial/$batchReference.pdf"
    fileName = "$batchReference.pdf"
    mimeType = 'application/pdf'
    fileSizeBytes = 0
    documentHash = "PH9-$testSuffix"
}).Body)

if (-not $evidence.financialRemittanceEvidenceId) { throw 'Evidence create response did not contain financialRemittanceEvidenceId.' }

$invalid = Invoke-ClaimNxRequest -Method Post -Uri "$baseRoute/remittance-batches" -Headers $headers -ExpectedStatusCodes @(400) -Body @{
    insurancePartnerId = $InsurancePartnerId
    claimProductReferenceValueId = $ClaimProductReferenceValueId
    remittanceSourceTypeReferenceValueId = $RemittanceSourceTypeReferenceValueId
    remittanceStatusReferenceValueId = $RemittanceStatusReferenceValueId
    remittanceReference = 'INVALID-TEST'
    receivedAt = (Get-Date).ToUniversalTime().ToString('o')
    currencyCode = 'inr'
    grossAmount = 0
    netAmount = 0
}

$unauthorizedOrganizationId = [Guid]::NewGuid().ToString()
$tenantIsolation = Invoke-ClaimNxRequest -Method Post -Uri "$BaseUrl/v1/organizations/$unauthorizedOrganizationId/hospitals/$HospitalId/financial/remittance-batches" -Headers $headers -ExpectedStatusCodes @(403) -Body @{
    insurancePartnerId = $InsurancePartnerId
    claimProductReferenceValueId = $ClaimProductReferenceValueId
    remittanceSourceTypeReferenceValueId = $RemittanceSourceTypeReferenceValueId
    remittanceStatusReferenceValueId = $RemittanceStatusReferenceValueId
    remittanceReference = "UNAUTHORIZED-$testSuffix"
    receivedAt = (Get-Date).ToUniversalTime().ToString('o')
    currencyCode = 'INR'
    grossAmount = 0
    netAmount = 0
}

[PSCustomObject]@{
    financial_remittance_batch_id = $batch.financialRemittanceBatchId
    financial_remittance_evidence_id = $evidence.financialRemittanceEvidenceId
    durable_test_records_created = $true
    invalid_request_status_expected = 400
    invalid_request_status_actual = $invalid.StatusCode
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $tenantIsolation.StatusCode
} | Format-List
