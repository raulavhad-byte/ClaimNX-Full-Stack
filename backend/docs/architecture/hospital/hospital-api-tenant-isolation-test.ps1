# Read-only tenant-isolation test for the Phase 5 Hospital API.

$baseUrl = 'http://localhost:3000'
$hospitalId = Read-Host 'Successful integration-test Hospital ID'
$email = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

$unauthorizedOrganizationId = [Guid]::NewGuid().ToString()
$headers = @{ Authorization = "Bearer $($login.data.access_token)" }

try {
    Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/organizations/$unauthorizedOrganizationId/hospitals/$hospitalId" -Headers $headers
    $status = 'UNEXPECTED_SUCCESS'
}
catch {
    $status = [int]$_.Exception.Response.StatusCode
}

[PSCustomObject]@{
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $status
} | Format-List
