# Reversible Phase 5 primary-child integration test.
# It restores the original primary Address/Contact and deletes all temporary records.
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
$hospitalUrl = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId"
$addressesUrl = "$hospitalUrl/addresses"
$contactsUrl = "$hospitalUrl/contacts"
$before = (Invoke-RestMethod -Method Get -Uri $hospitalUrl -Headers $headers).data
$originalAddressId = $before.primaryAddressId
$originalContactId = $before.primaryContactId
$suffix = (New-Guid).ToString('N').Substring(0, 8)

$newAddress = (Invoke-RestMethod -Method Post -Uri $addressesUrl -Headers $headers -ContentType 'application/json' -Body (@{
    addressTypeReferenceValueId = '87e38b46-abd1-4eb8-bca9-c2b05f21c406'; addressLine1 = "Primary test $suffix";
    countryId = 'd8f70ea0-2001-43ec-9915-9510f5115a6e'; stateId = 'abac3322-4004-4b34-b57e-ed21fa907f08';
    cityId = '476e4436-9661-4185-978c-80523a68039b'; postalCode = '380001'
} | ConvertTo-Json)).data
$newContact = (Invoke-RestMethod -Method Post -Uri $contactsUrl -Headers $headers -ContentType 'application/json' -Body (@{
    contactTypeReferenceValueId = '37c310d2-24ca-4bfc-930c-ff15c132883b'; contactName = "Primary test $suffix"; phoneNumber = '9999999999'
} | ConvertTo-Json)).data

$afterAddressSet = (Invoke-RestMethod -Method Patch -Uri "$hospitalUrl/primary-address" -Headers $headers -ContentType 'application/json' -Body (@{ childId = $newAddress.hospitalAddressId; version = $before.version } | ConvertTo-Json)).data
$afterContactSet = (Invoke-RestMethod -Method Patch -Uri "$hospitalUrl/primary-contact" -Headers $headers -ContentType 'application/json' -Body (@{ childId = $newContact.hospitalContactId; version = $afterAddressSet.version } | ConvertTo-Json)).data
$afterAddressRestore = (Invoke-RestMethod -Method Patch -Uri "$hospitalUrl/primary-address" -Headers $headers -ContentType 'application/json' -Body (@{ childId = $originalAddressId; version = $afterContactSet.version } | ConvertTo-Json)).data
$afterContactRestore = (Invoke-RestMethod -Method Patch -Uri "$hospitalUrl/primary-contact" -Headers $headers -ContentType 'application/json' -Body (@{ childId = $originalContactId; version = $afterAddressRestore.version } | ConvertTo-Json)).data

$temporaryAddress = $afterContactRestore.addresses | Where-Object { $_.hospitalAddressId -eq $newAddress.hospitalAddressId }
$temporaryContact = $afterContactRestore.contacts | Where-Object { $_.hospitalContactId -eq $newContact.hospitalContactId }
$deletedAddress = (Invoke-RestMethod -Method Delete -Uri "$addressesUrl/$($newAddress.hospitalAddressId)" -Headers $headers -ContentType 'application/json' -Body (@{ version = $temporaryAddress.version } | ConvertTo-Json)).data
$deletedContact = (Invoke-RestMethod -Method Delete -Uri "$contactsUrl/$($newContact.hospitalContactId)" -Headers $headers -ContentType 'application/json' -Body (@{ version = $temporaryContact.version } | ConvertTo-Json)).data
$final = (Invoke-RestMethod -Method Get -Uri $hospitalUrl -Headers $headers).data

[PSCustomObject]@{
    original_address_restored = ($final.primaryAddressId -eq $originalAddressId)
    original_contact_restored = ($final.primaryContactId -eq $originalContactId)
    root_version_incremented_four_times = ([int]$final.version -eq [int]$before.version + 4)
    temporary_address_deleted = ($deletedAddress.deleted -eq $true)
    temporary_contact_deleted = ($deletedContact.deleted -eq $true)
} | Format-List
