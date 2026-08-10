param(
    [Parameter(Mandatory = $true)]
    [string]$HospitalId,

    [Parameter(Mandatory = $true)]
    [string]$InsurancePartnerId,

    [Parameter(Mandatory = $true)]
    [string]$EmailChannelReferenceValueId,

    [Parameter(Mandatory = $true)]
    [string]$DraftStatusReferenceValueId,

    [Parameter(Mandatory = $true)]
    [string]$ActiveStatusReferenceValueId,

    # Use only for a follow-on controlled integration test. The default keeps
    # the original Phase 7 behaviour and retires the temporary configuration.
    [switch]$KeepActive
)

# Controlled Phase 7 REST API integration test.
# Prerequisite: run `npm run start:dev` from D:\Projects\backend first.
# The script creates, reads, updates, activates, and retires one EMAIL routing
# configuration. It does not accept or transmit a password, token, or secret.

$ErrorActionPreference = 'Stop'

function Invoke-ClaimNxRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $parameters = @{ Method = $Method; Uri = $Uri; Headers = $Headers; ErrorAction = 'Stop' }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = $Body | ConvertTo-Json -Depth 8
    }

    try {
        return Invoke-RestMethod @parameters
    }
    catch {
        $response = $_.Exception.Response
        $statusCode = if ($response) { [int]$response.StatusCode } else { 'unknown' }
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

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$testEmail = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $testPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = Invoke-ClaimNxRequest -Method Post -Uri "$baseUrl/auth/login" -Body @{
        email = $testEmail
        password = $testPassword
    }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Variable testPassword -ErrorAction SilentlyContinue
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}

if (-not $login.success -or -not $login.data.access_token) {
    throw 'Login did not return an access token.'
}

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$baseRoute = "$baseUrl/v1/organizations/$organizationId/hospitals/$HospitalId/insurance-partner-integrations"
$testCode = "HPI-INT-$((New-Guid).ToString('N').Substring(0, 12).ToUpper())"

$created = Invoke-ClaimNxRequest -Method Post -Uri $baseRoute -Headers $headers -Body @{
    insurancePartnerId = $InsurancePartnerId
    integrationCode = $testCode
    submissionChannelReferenceValueId = $EmailChannelReferenceValueId
    payerEmailAddress = 'integration-test@example.invalid'
    operationalStatusReferenceValueId = $DraftStatusReferenceValueId
}

$integration = $created.data
if (-not $integration.hospitalInsurancePartnerIntegrationId) {
    throw 'Create response did not contain hospitalInsurancePartnerIntegrationId.'
}
if ($integration.PSObject.Properties.Name -contains 'credentialSecretReference') {
    throw 'Security failure: a credential secret reference appeared in the API response.'
}

$integrationId = $integration.hospitalInsurancePartnerIntegrationId
$retrieved = Invoke-ClaimNxRequest -Method Get -Uri "$baseRoute/$integrationId" -Headers $headers

$updated = Invoke-ClaimNxRequest -Method Patch -Uri "$baseRoute/$integrationId" -Headers $headers -Body @{
    version = $retrieved.data.version
    integrationCode = $testCode
    submissionChannelReferenceValueId = $EmailChannelReferenceValueId
    payerEmailAddress = 'integration-test@example.invalid'
    notificationEmailAddress = 'notifications@example.invalid'
}

$activated = Invoke-ClaimNxRequest -Method Patch -Uri "$baseRoute/$integrationId/status" -Headers $headers -Body @{
    version = $updated.data.version
    operationalStatusReferenceValueId = $ActiveStatusReferenceValueId
}

$retired = $null
if (-not $KeepActive) {
    $retired = Invoke-ClaimNxRequest -Method Delete -Uri "$baseRoute/$integrationId" -Headers $headers -Body @{
        version = $activated.data.version
    }
}

[PSCustomObject]@{
    hospital_insurance_partner_integration_id = $integrationId
    integration_code = $testCode
    version_incremented = ($updated.data.version -gt $retrieved.data.version)
    active_status_changed = ($activated.data.operationalStatusReferenceValueId -eq $ActiveStatusReferenceValueId)
    retired = if ($KeepActive) { $false } else { $retired.data.retired }
    retained_as_active_for_follow_on_test = [bool]$KeepActive
    credential_secret_reference_exposed = ($activated.data.PSObject.Properties.Name -contains 'credentialSecretReference')
} | Format-List
