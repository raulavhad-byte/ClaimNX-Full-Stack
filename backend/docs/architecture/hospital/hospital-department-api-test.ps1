# Phase 5 Hospital Department sub-resource integration test.
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
$departmentsUrl = "$BaseUrl/v1/organizations/$OrganizationId/hospitals/$HospitalId/departments"
$suffix = (New-Guid).ToString('N').Substring(0, 8).ToUpper()

$createdResponse = Invoke-RestMethod -Method Post -Uri $departmentsUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
        departmentCode = "TEST-$suffix"
        departmentName = "ClaimNX Department Test $suffix"
        operationalStatusReferenceValueId = '28d0b2a5-07fd-494e-83d5-bd75c06a8ef4'
        description = 'Temporary automated integration test department'
    } | ConvertTo-Json)
$created = $createdResponse.data
$departmentUrl = "$departmentsUrl/$($created.hospitalDepartmentId)"

$updatedResponse = Invoke-RestMethod -Method Patch -Uri $departmentUrl -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ version = $created.version; description = 'Temporary updated integration test department' } | ConvertTo-Json)
$updated = $updatedResponse.data

$deleteResponse = Invoke-RestMethod -Method Delete -Uri $departmentUrl -Headers $headers `
    -ContentType 'application/json' -Body (@{ version = $updated.version } | ConvertTo-Json)
$remaining = @((Invoke-RestMethod -Method Get -Uri $departmentsUrl -Headers $headers).data)

[PSCustomObject]@{
    hospital_department_id = $created.hospitalDepartmentId
    department_code = $created.departmentCode
    version_after_create = $created.version
    version_after_update = $updated.version
    version_incremented = ([int]$updated.version -eq [int]$created.version + 1)
    delete_returned_true = ($deleteResponse.data.deleted -eq $true)
    department_absent_after_delete = (-not ($remaining.hospitalDepartmentId -contains $created.hospitalDepartmentId))
} | Format-List
