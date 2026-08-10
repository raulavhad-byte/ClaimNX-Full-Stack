# Phase 5 Hospital Contact sub-resource integration test.
# Creates, updates, and soft-deletes a temporary non-primary Contact.
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
$contactsUrl = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/contacts"
$marker = "Contact test $((New-Guid).ToString('N').Substring(0, 8))"

$createdResponse = Invoke-RestMethod -Method Post -Uri $contactsUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
        contactTypeReferenceValueId = '37c310d2-24ca-4bfc-930c-ff15c132883b'
        contactName = $marker
        designation = 'ClaimNX integration test'
        emailAddress = "contact-$((New-Guid).ToString('N').Substring(0, 8))@example.invalid"
        phoneNumber = '9999999999'
    } | ConvertTo-Json)
$created = $createdResponse.data
$contactUrl = "$contactsUrl/$($created.hospitalContactId)"

$updatedResponse = Invoke-RestMethod -Method Patch -Uri $contactUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ version = $created.version; designation = 'ClaimNX updated integration test' } | ConvertTo-Json)
$updated = $updatedResponse.data

$deleteResponse = Invoke-RestMethod -Method Delete -Uri $contactUrl -Headers $headers `
    -ContentType 'application/json' -Body (@{ version = $updated.version } | ConvertTo-Json)
$remaining = @((Invoke-RestMethod -Method Get -Uri $contactsUrl -Headers $headers).data)

[PSCustomObject]@{
    hospital_contact_id = $created.hospitalContactId
    created_is_primary = $created.isPrimary
    version_after_create = $created.version
    version_after_update = $updated.version
    version_incremented = ([int]$updated.version -eq [int]$created.version + 1)
    delete_returned_true = ($deleteResponse.data.deleted -eq $true)
    contact_absent_after_delete = (-not ($remaining.hospitalContactId -contains $created.hospitalContactId))
} | Format-List
