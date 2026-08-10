# Controlled Organization Member lifecycle test.
# Requirement: provide an existing ACTIVE IAM User who has no active membership
# in the selected Organization. The script retires the temporary membership.
param(
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$OrganizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6',
    [Parameter(Mandatory = $true)]
    [string]$TargetUserId
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

if (-not $login.success -or -not $login.data.access_token) {
    throw 'Login did not return an access token.'
}

$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
$membersUrl = "$BaseUrl/v1/organizations/$OrganizationId/members"
$memberId = $null
$currentVersion = $null

function Get-HttpStatus {
    param([scriptblock]$Request)
    try {
        & $Request | Out-Null
        return 'UNEXPECTED_SUCCESS'
    }
    catch {
        return [int]$_.Exception.Response.StatusCode
    }
}

try {
    $createdResponse = Invoke-RestMethod -Method Post -Uri $membersUrl -Headers $headers `
        -ContentType 'application/json' -Body (@{ userId = $TargetUserId } | ConvertTo-Json)
    $created = $createdResponse.data
    $memberId = $created.organizationMemberId
    $currentVersion = [int]$created.version

    if (-not $memberId -or $created.status -ne 'ACTIVE' -or $currentVersion -ne 1) {
        throw 'Membership creation did not return an ACTIVE version-1 aggregate.'
    }

    $duplicateStatus = Get-HttpStatus {
        Invoke-RestMethod -Method Post -Uri $membersUrl -Headers $headers `
            -ContentType 'application/json' -Body (@{ userId = $TargetUserId } | ConvertTo-Json)
    }

    $memberUrl = "$membersUrl/$memberId"
    $suspended = (Invoke-RestMethod -Method Patch -Uri "$memberUrl/suspend" -Headers $headers `
        -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json)).data
    $currentVersion = [int]$suspended.version

    $reactivated = (Invoke-RestMethod -Method Patch -Uri "$memberUrl/reactivate" -Headers $headers `
        -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json)).data
    $currentVersion = [int]$reactivated.version

    $staleStatus = Get-HttpStatus {
        Invoke-RestMethod -Method Patch -Uri "$memberUrl/suspend" -Headers $headers `
            -ContentType 'application/json' -Body (@{ version = 1 } | ConvertTo-Json)
    }

    $retired = (Invoke-RestMethod -Method Delete -Uri $memberUrl -Headers $headers `
        -ContentType 'application/json' -Body (@{ version = $currentVersion } | ConvertTo-Json)).data
    $memberId = $null

    $remaining = @((Invoke-RestMethod -Method Get -Uri $membersUrl -Headers $headers).data)

    [PSCustomObject]@{
        organization_member_id = $created.organizationMemberId
        duplicate_status_expected = 409
        duplicate_status_actual = $duplicateStatus
        suspended_status = $suspended.status
        reactivated_status = $reactivated.status
        version_incremented_twice = ([int]$reactivated.version -eq 3)
        stale_status_expected = 409
        stale_status_actual = $staleStatus
        retire_returned_true = ($retired.retired -eq $true)
        member_absent_after_retire = (-not ($remaining.organizationMemberId -contains $created.organizationMemberId))
    } | Format-List
}
catch {
    # Best-effort cleanup if a failure occurs after membership creation.
    if ($memberId) {
        try {
            $current = (Invoke-RestMethod -Method Get -Uri "$membersUrl/$memberId" -Headers $headers).data
            Invoke-RestMethod -Method Delete -Uri "$membersUrl/$memberId" -Headers $headers `
                -ContentType 'application/json' -Body (@{ version = $current.version } | ConvertTo-Json) | Out-Null
        }
        catch {}
    }
    throw
}
