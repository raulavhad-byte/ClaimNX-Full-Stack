# Read-only Tenant Configuration isolation test.
# It must return 403 because the authenticated user is not an active member
# of the generated Organization identifier.

$baseUrl = 'http://localhost:3000'
$unauthorizedOrganizationId = [Guid]::NewGuid().ToString()

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

try {
    Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/organizations/$unauthorizedOrganizationId/configurations/effective/platform.date_format" -Headers $headers
    $status = 'UNEXPECTED_SUCCESS'
}
catch {
    $status = [int]$_.Exception.Response.StatusCode
}

[PSCustomObject]@{
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $status
} | Format-List
