# Phase 5 Hospital root-update integration test.
# It proves one valid PATCH increments version and a stale PATCH returns 409.
param(
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$OrganizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6',
    [string]$HospitalId = '0da6ac3c-adc6-4085-914e-be9516f1f110'
)

$email = Read-Host 'ClaimNX email'
$password = Read-Host 'ClaimNX password' -AsSecureString
$passwordText = [System.Net.NetworkCredential]::new('', $password).Password

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" `
    -ContentType 'application/json' `
    -Body (@{ email = $email; password = $passwordText } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$hospitalUrl = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId"
$beforeResponse = Invoke-RestMethod -Method Get -Uri $hospitalUrl -Headers $headers
$before = $beforeResponse.data

if (-not $before -or -not $before.version) {
    throw 'Hospital GET response did not contain data.version. Confirm the Hospital ID and running backend.'
}

$expectedVersion = [int]$before.version
$newDisplayName = "$($before.displayName) [root-v$($expectedVersion + 1)]"
$updateResponse = Invoke-RestMethod -Method Patch -Uri $hospitalUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
        version = $expectedVersion
        displayName = $newDisplayName
    } | ConvertTo-Json)
$update = $updateResponse.data

try {
    Invoke-RestMethod -Method Patch -Uri $hospitalUrl -Headers $headers `
        -ContentType 'application/json' `
        -Body (@{
            version = $expectedVersion
            displayName = 'This stale update must never persist'
        } | ConvertTo-Json) | Out-Null
    $staleStatus = 'UNEXPECTED_SUCCESS'
}
catch {
    $staleStatus = [int]$_.Exception.Response.StatusCode
}

[PSCustomObject]@{
    hospital_id = $update.hospitalId
    display_name_before = $before.displayName
    display_name_after = $update.displayName
    version_before = $expectedVersion
    version_after = $update.version
    version_incremented = ([int]$update.version -eq $expectedVersion + 1)
    stale_update_status_expected = 409
    stale_update_status_actual = $staleStatus
} | Format-List
