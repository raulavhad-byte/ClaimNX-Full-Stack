# Phase 5 Hospital Address sub-resource integration test.
# Creates a non-primary test Address, updates it, then proves soft deletion.
param(
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$OrganizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6',
    [string]$HospitalId = '0da6ac3c-adc6-4085-914e-be9516f1f110'
)

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
$addressesUrl = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/addresses"
$marker = "Address test $((New-Guid).ToString('N').Substring(0, 8))"

$createdResponse = Invoke-RestMethod -Method Post -Uri $addressesUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
        addressTypeReferenceValueId = '87e38b46-abd1-4eb8-bca9-c2b05f21c406'
        addressLine1 = $marker
        landmark = 'ClaimNX automated integration test'
        countryId = 'd8f70ea0-2001-43ec-9915-9510f5115a6e'
        stateId = 'abac3322-4004-4b34-b57e-ed21fa907f08'
        cityId = '476e4436-9661-4185-978c-80523a68039b'
        postalCode = '380001'
    } | ConvertTo-Json)
$created = $createdResponse.data

$addressUrl = "$addressesUrl/$($created.hospitalAddressId)"
$updatedResponse = Invoke-RestMethod -Method Patch -Uri $addressUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
        version = $created.version
        landmark = 'ClaimNX updated integration test'
    } | ConvertTo-Json)
$updated = $updatedResponse.data

$deleteResponse = Invoke-RestMethod -Method Delete -Uri $addressUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ version = $updated.version } | ConvertTo-Json)
$remainingResponse = Invoke-RestMethod -Method Get -Uri $addressesUrl -Headers $headers
$remaining = @($remainingResponse.data)

[PSCustomObject]@{
    hospital_address_id = $created.hospitalAddressId
    created_is_primary = $created.isPrimary
    version_after_create = $created.version
    version_after_update = $updated.version
    version_incremented = ([int]$updated.version -eq [int]$created.version + 1)
    delete_returned_true = ($deleteResponse.data.deleted -eq $true)
    address_absent_after_delete = (-not ($remaining.hospitalAddressId -contains $created.hospitalAddressId))
} | Format-List
