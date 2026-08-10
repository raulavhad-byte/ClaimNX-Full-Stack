# Read-only Tenant Configuration API integration test.
# Prerequisite: run `npm run start:dev` from D:\Projects\backend.

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$configurationKey = 'platform.date_format'

$testEmail = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $testPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType 'application/json' -Body (@{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}

if (-not $login.success -or -not $login.data.access_token) {
    throw 'Login did not return an access token.'
}

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$overrides = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/organizations/$organizationId/configurations" -Headers $headers
$effective = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/organizations/$organizationId/configurations/effective/$configurationKey" -Headers $headers

if ($effective.data.configurationKey -ne $configurationKey) {
    throw 'Effective Configuration response returned an unexpected configuration key.'
}
if ($effective.data.source -ne 'DEFAULT') {
    throw 'Expected the approved Definition default because no Organization override exists.'
}
if ($effective.data.value -ne 'DD/MM/YYYY') {
    throw 'Effective Configuration response returned an unexpected default value.'
}

[PSCustomObject]@{
    organization_id = $organizationId
    override_count = @($overrides.data).Count
    effective_configuration_key = $effective.data.configurationKey
    effective_value = $effective.data.value
    effective_source = $effective.data.source
} | Format-List
