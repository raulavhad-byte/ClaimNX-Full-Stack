# Read-only negative tests for Tenant Configuration write validation.
# Neither request creates an Organization Configuration override.

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$definitionId = 'e1b1178b-64dc-462f-b9f1-8b9c5a84b403'

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
$body = @{ configurationDefinitionId = $definitionId; configValue = 'DD-MM-YYYY' } | ConvertTo-Json

try {
    Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/organizations/$organizationId/configurations" -Headers $headers -ContentType 'application/json' -Body $body
    $invalidValueStatus = 'UNEXPECTED_SUCCESS'
}
catch {
    $invalidValueStatus = [int]$_.Exception.Response.StatusCode
}

try {
    Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/organizations/$([Guid]::NewGuid())/configurations" -Headers $headers -ContentType 'application/json' -Body $body
    $tenantIsolationStatus = 'UNEXPECTED_SUCCESS'
}
catch {
    $tenantIsolationStatus = [int]$_.Exception.Response.StatusCode
}

[PSCustomObject]@{
    invalid_value_status_expected = 400
    invalid_value_status_actual = $invalidValueStatus
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $tenantIsolationStatus
} | Format-List
