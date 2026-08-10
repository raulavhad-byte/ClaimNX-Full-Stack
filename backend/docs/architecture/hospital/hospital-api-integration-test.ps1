# Controlled Phase 5 Hospital API integration test.
# Prerequisite: run `npm run start:dev` from D:\Projects\backend first.
# This script creates one DRAFT test Hospital in the configured Supabase database.

$baseUrl = 'http://localhost:3000'
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

$testCode = "HOSP-INT-$((New-Guid).ToString('N').Substring(0, 12).ToUpper())"
$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'

$requestBody = @{
    hospitalCode = $testCode
    displayName = "ClaimNX API Integration Test $testCode"
    hospitalTypeReferenceValueId = 'b25b5427-9a84-4010-bee6-3954832c38c7'
    ownershipTypeReferenceValueId = '168fea27-e7ec-420d-ab74-e94146a3b296'
    operationalStatusReferenceValueId = '28d0b2a5-07fd-494e-83d5-bd75c06a8ef4'
    addresses = @(
        @{
            addressTypeReferenceValueId = '87e38b46-abd1-4eb8-bca9-c2b05f21c406'
            addressLine1 = 'ClaimNX Integration Test Address'
            countryId = 'd8f70ea0-2001-43ec-9915-9510f5115a6e'
            stateId = 'abac3322-4004-4b34-b57e-ed21fa907f08'
            cityId = '476e4436-9661-4185-978c-80523a68039b'
            postalCode = '380001'
            isPrimary = $true
        }
    )
    contacts = @(
        @{
            contactTypeReferenceValueId = '37c310d2-24ca-4bfc-930c-ff15c132883b'
            contactName = 'ClaimNX Integration Test Contact'
            phoneNumber = '9999999999'
            isPrimary = $true
        }
    )
    departments = @()
} | ConvertTo-Json -Depth 8

$created = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/organizations/$organizationId/hospitals" -Headers $headers -ContentType 'application/json' -Body $requestBody
$hospitalId = $created.data.hospitalId

if (-not $hospitalId) {
    throw 'Create Hospital response did not contain hospitalId.'
}

$retrieved = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/organizations/$organizationId/hospitals/$hospitalId" -Headers $headers

[PSCustomObject]@{
    test_hospital_id = $hospitalId
    test_hospital_code = $testCode
    retrieved_display_name = $retrieved.data.displayName
    address_count = @($retrieved.data.addresses).Count
    contact_count = @($retrieved.data.contacts).Count
} | Format-List
