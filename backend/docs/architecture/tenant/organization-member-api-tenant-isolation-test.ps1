# Read-only Organization Member tenant-isolation test. It must return 403.
param([string]$BaseUrl = 'http://localhost:3000')

$unauthorizedOrganizationId = [Guid]::NewGuid().ToString()
$email = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' `
        -Body (@{ email = $email; password = $password } | ConvertTo-Json)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
try {
    Invoke-RestMethod -Method Get -Uri "$BaseUrl/v1/organizations/$unauthorizedOrganizationId/members" -Headers $headers
    $status = 'UNEXPECTED_SUCCESS'
}
catch {
    $status = [int]$_.Exception.Response.StatusCode
}

[PSCustomObject]@{
    tenant_isolation_status_expected = 403
    tenant_isolation_status_actual = $status
} | Format-List
