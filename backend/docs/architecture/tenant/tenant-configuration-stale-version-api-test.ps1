# Controlled optimistic-concurrency test for Tenant Configuration.
# Creates a temporary override, performs one valid update, proves a stale
# update receives 409, and soft-retires the temporary override.

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$definitionId = 'e1b1178b-64dc-462f-b9f1-8b9c5a84b405'
$overrideId = $null

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
$collectionUrl = "$baseUrl/v1/organizations/$organizationId/configurations"

function Get-CurrentOverride {
    $list = Invoke-RestMethod -Method Get -Uri $collectionUrl -Headers $headers
    return @($list.data | Where-Object { $_.configurationDefinitionId -eq $definitionId }) | Select-Object -First 1
}

try {
    $created = Invoke-RestMethod -Method Post -Uri $collectionUrl -Headers $headers -ContentType 'application/json' -Body (@{
        configurationDefinitionId = $definitionId
        configValue = 'false'
    } | ConvertTo-Json)
    $overrideId = $created.data.organizationConfigurationId
    $originalVersion = (Get-CurrentOverride).version

    Invoke-RestMethod -Method Patch -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{
        version = $originalVersion
        configValue = 'true'
    } | ConvertTo-Json) | Out-Null

    try {
        Invoke-RestMethod -Method Patch -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{
            version = $originalVersion
            configValue = 'false'
        } | ConvertTo-Json)
        $staleUpdateStatus = 'UNEXPECTED_SUCCESS'
    }
    catch {
        $staleUpdateStatus = [int]$_.Exception.Response.StatusCode
    }

    $currentOverride = Get-CurrentOverride
    Invoke-RestMethod -Method Delete -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{
        version = $currentOverride.version
    } | ConvertTo-Json) | Out-Null

    [PSCustomObject]@{
        stale_update_status_expected = 409
        stale_update_status_actual = $staleUpdateStatus
        override_absent_after_retire = ($null -eq (Get-CurrentOverride))
    } | Format-List
}
catch {
    if ($overrideId) {
        try {
            $latestOverride = Get-CurrentOverride
            if ($latestOverride) {
                Invoke-RestMethod -Method Delete -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{
                    version = $latestOverride.version
                } | ConvertTo-Json) | Out-Null
            }
        }
        catch {}
    }
    throw
}
