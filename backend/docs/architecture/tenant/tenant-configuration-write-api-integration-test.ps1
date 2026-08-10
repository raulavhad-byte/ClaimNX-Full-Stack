# Controlled Tenant Configuration lifecycle test.
# Creates one temporary date-format override and always soft-retires it on success.
# Prerequisite: run `npm run start:dev` from D:\Projects\backend.

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$definitionId = 'e1b1178b-64dc-462f-b9f1-8b9c5a84b403'
$configurationKey = 'platform.date_format'
$overrideId = $null
$currentVersion = $null

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
$effectiveUrl = "$collectionUrl/effective/$configurationKey"

function Get-CurrentOverride {
    $list = Invoke-RestMethod -Method Get -Uri $collectionUrl -Headers $headers
    return @($list.data | Where-Object { $_.configurationDefinitionId -eq $definitionId }) | Select-Object -First 1
}

try {
    $created = Invoke-RestMethod -Method Post -Uri $collectionUrl -Headers $headers -ContentType 'application/json' -Body (@{
        configurationDefinitionId = $definitionId
        configValue = 'YYYY-MM-DD'
    } | ConvertTo-Json)
    $overrideId = $created.data.organizationConfigurationId
    if (-not $overrideId) { throw 'Create did not return an Organization Configuration identifier.' }

    $override = Get-CurrentOverride
    $currentVersion = $override.version
    $effectiveAfterCreate = Invoke-RestMethod -Method Get -Uri $effectiveUrl -Headers $headers
    if ($effectiveAfterCreate.data.source -ne 'ORGANIZATION_OVERRIDE' -or $effectiveAfterCreate.data.value -ne 'YYYY-MM-DD') {
        throw 'Create did not produce the expected effective Organization override.'
    }

    Invoke-RestMethod -Method Patch -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{
        version = $currentVersion
        configValue = 'MM/DD/YYYY'
    } | ConvertTo-Json) | Out-Null
    $override = Get-CurrentOverride
    $currentVersion = $override.version

    Invoke-RestMethod -Method Patch -Uri "$collectionUrl/$overrideId/deactivate" -Headers $headers -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json) | Out-Null
    $override = Get-CurrentOverride
    $currentVersion = $override.version
    $effectiveAfterDeactivate = Invoke-RestMethod -Method Get -Uri $effectiveUrl -Headers $headers
    if ($effectiveAfterDeactivate.data.source -ne 'DEFAULT' -or $effectiveAfterDeactivate.data.value -ne 'DD/MM/YYYY') {
        throw 'Deactivate did not restore the approved default value.'
    }

    Invoke-RestMethod -Method Patch -Uri "$collectionUrl/$overrideId/activate" -Headers $headers -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json) | Out-Null
    $override = Get-CurrentOverride
    $currentVersion = $override.version

    Invoke-RestMethod -Method Delete -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json) | Out-Null
    $retiredOverride = Get-CurrentOverride
    $effectiveAfterRetire = Invoke-RestMethod -Method Get -Uri $effectiveUrl -Headers $headers
    if ($retiredOverride -or $effectiveAfterRetire.data.source -ne 'DEFAULT') {
        throw 'Soft retirement did not remove the override or restore the default.'
    }

    [PSCustomObject]@{
        organization_configuration_id = $overrideId
        effective_source_after_create = $effectiveAfterCreate.data.source
        effective_value_after_create = $effectiveAfterCreate.data.value
        effective_source_after_deactivate = $effectiveAfterDeactivate.data.source
        effective_source_after_retire = $effectiveAfterRetire.data.source
        override_absent_after_retire = ($null -eq $retiredOverride)
    } | Format-List
}
catch {
    # Best-effort cleanup if a later assertion fails after creation.
    if ($overrideId) {
        try {
            $latestOverride = Get-CurrentOverride
            if ($latestOverride) {
                Invoke-RestMethod -Method Delete -Uri "$collectionUrl/$overrideId" -Headers $headers -ContentType 'application/json' -Body (@{ version = $latestOverride.version } | ConvertTo-Json) | Out-Null
            }
        }
        catch {}
    }
    throw
}
