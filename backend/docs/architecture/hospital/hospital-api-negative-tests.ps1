# Negative-path tests for the Phase 5 Hospital API.
# Prerequisite: backend running locally and the earlier DRAFT test Hospital code available.

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'
$existingHospitalCode = Read-Host 'Existing DRAFT integration-test Hospital code'
$email = Read-Host 'ClaimNX email'
$securePassword = Read-Host 'ClaimNX password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}
$headers = @{ Authorization = "Bearer $($login.data.access_token)" }

function Invoke-ExpectedFailure($body, [int]$expectedStatus) {
    try {
        Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/organizations/$organizationId/hospitals" -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8)
        return 'UNEXPECTED_SUCCESS'
    }
    catch {
        return [int]$_.Exception.Response.StatusCode
    }
}

$common = @{
    displayName = 'ClaimNX Negative Test'
    hospitalTypeReferenceValueId = 'b25b5427-9a84-4010-bee6-3954832c38c7'
    ownershipTypeReferenceValueId = '168fea27-e7ec-420d-ab74-e94146a3b296'
    operationalStatusReferenceValueId = '28d0b2a5-07fd-494e-83d5-bd75c06a8ef4'
    addresses = @(@{ addressTypeReferenceValueId = '87e38b46-abd1-4eb8-bca9-c2b05f21c406'; addressLine1 = 'Negative Test Address'; countryId = 'd8f70ea0-2001-43ec-9915-9510f5115a6e'; stateId = 'abac3322-4004-4b34-b57e-ed21fa907f08'; cityId = '476e4436-9661-4185-978c-80523a68039b'; postalCode = '380001'; isPrimary = $true })
    contacts = @(@{ contactTypeReferenceValueId = '37c310d2-24ca-4bfc-930c-ff15c132883b'; contactName = 'Negative Test Contact'; phoneNumber = '9999999999'; isPrimary = $true })
    departments = @()
}

$duplicate = $common.Clone()
$duplicate.hospitalCode = $existingHospitalCode
$duplicateStatus = Invoke-ExpectedFailure $duplicate 409

$invalidChild = $common.Clone()
$invalidChild.hospitalCode = "HOSP-ROLLBACK-$((New-Guid).ToString('N').Substring(0, 12).ToUpper())"
$invalidChild.addresses[0].cityId = '00000000-0000-0000-0000-000000000000'
$rollbackCode = $invalidChild.hospitalCode
$rollbackStatus = Invoke-ExpectedFailure $invalidChild 400

[PSCustomObject]@{
    duplicate_code_status_expected = 409
    duplicate_code_status_actual = $duplicateStatus
    rollback_status_expected = 400
    rollback_status_actual = $rollbackStatus
    rollback_test_code = $rollbackCode
} | Format-List
