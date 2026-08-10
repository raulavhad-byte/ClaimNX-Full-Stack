# ClaimNX Phase 6: authenticated Workflow REST API integration test.
# Prerequisite: run `npm run start:dev` from D:\Projects\backend first.
# Safety: creates controlled records and retires them on the successful path.
# The supplied Hospital must be active and belong to the authenticated user's Organization.

param(
    [string]$HospitalId
)

$baseUrl = 'http://localhost:3000'
$organizationId = 'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Invoke-ClaimNxApi([string]$Method, [string]$Path, [hashtable]$Headers, $Body = $null) {
    $parameters = @{
        Method = $Method
        Uri = "$baseUrl$Path"
        Headers = $Headers
    }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = $Body | ConvertTo-Json -Depth 10
    }
    $response = Invoke-RestMethod @parameters
    if (-not $response.success) { throw "ClaimNX API returned an unsuccessful response for $Method $Path." }
    return $response.data
}

if ([string]::IsNullOrWhiteSpace($HospitalId)) {
    $HospitalId = Read-Host 'Active Hospital ID for this Organization'
}

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
$suffix = (New-Guid).ToString('N').Substring(0, 12).ToUpper()
$definitionCode = "WFAPI-$suffix"
$queueCode = "Q-$suffix"
$instanceReference = "WF-API-$suffix"

# 1. Create and activate a Definition with its approved State graph.
$definitionCreated = Invoke-ClaimNxApi Post '/v1/workflow-definitions' $headers @{
    code = $definitionCode
    name = "Workflow API Integration $suffix"
    description = 'Controlled Phase 6 REST API integration test.'
    allowsReopen = $false
    states = @(
        @{ code = 'OPEN'; name = 'Open'; displayOrder = 1; slaTargetMinutes = 60; isInitial = $true; isTerminal = $false },
        @{ code = 'CLOSED'; name = 'Closed'; displayOrder = 2; isInitial = $false; isTerminal = $true }
    )
    transitions = @(
        @{ fromStateCode = 'OPEN'; toStateCode = 'CLOSED'; requiresComment = $false; approvalRequired = $false }
    )
}
$definitionId = $definitionCreated.workflowDefinitionId
$definition = Invoke-ClaimNxApi Get "/v1/workflow-definitions/$definitionId" $headers
$initialStateId = ($definition.states | Where-Object { $_.code -eq 'OPEN' }).workflowStateId
Assert-True ($null -ne $initialStateId) 'Definition read did not return the OPEN State ID.'

Invoke-ClaimNxApi Patch "/v1/workflow-definitions/$definitionId/activate" $headers @{ version = 1 } | Out-Null

# 2. Create a tenant Queue, start an Instance, and create a Work Item with an SLA.
$queueCreated = Invoke-ClaimNxApi Post "/v1/organizations/$organizationId/workflow-queues" $headers @{
    code = $queueCode
    name = "Workflow API Queue $suffix"
    type = 'PERSONAL'
}
$queueId = $queueCreated.workflowQueueId

$instanceCreated = Invoke-ClaimNxApi Post "/v1/organizations/$organizationId/workflow-instances" $headers @{
    instanceReference = $instanceReference
    workflowDefinitionId = $definitionId
    hospitalId = $HospitalId
    sourceType = 'INTEGRATION_TEST'
    sourceId = (New-Guid).ToString()
    priority = 'NORMAL'
}
$instanceId = $instanceCreated.workflowInstanceId

$workItemCreated = Invoke-ClaimNxApi Post "/v1/organizations/$organizationId/work-items" $headers @{
    workflowInstanceId = $instanceId
    workflowStateId = $initialStateId
    type = 'STANDARD'
    title = "Workflow API Work Item $suffix"
    description = 'Controlled Phase 6 REST API integration test.'
    queueId = $queueId
    priority = 'NORMAL'
    slaTargetMinutes = 60
}
$workItemId = $workItemCreated.workflowTaskId
$workflowSlaId = $workItemCreated.workflowSlaId
Assert-True ($null -ne $workflowSlaId) 'Work Item creation did not return its SLA ID.'

# 3. Exercise Work Item assignment, SLA lifecycle, and Work Item lifecycle.
Invoke-ClaimNxApi Patch "/v1/organizations/$organizationId/work-items/$workItemId/assignment" $headers @{
    version = 1
    queueId = $queueId
} | Out-Null
Invoke-ClaimNxApi Patch "/v1/organizations/$organizationId/work-items/$workItemId/sla" $headers @{
    workflowSlaId = $workflowSlaId
    workItemVersion = 2
    slaVersion = 1
    targetMinutes = 90
    pause = $true
    pauseReason = 'Controlled API integration pause.'
} | Out-Null
Invoke-ClaimNxApi Patch "/v1/organizations/$organizationId/work-items/$workItemId/sla" $headers @{
    workflowSlaId = $workflowSlaId
    workItemVersion = 3
    slaVersion = 2
    targetMinutes = 90
    pause = $false
} | Out-Null
Invoke-ClaimNxApi Patch "/v1/organizations/$organizationId/work-items/$workItemId/transition" $headers @{
    version = 4
    targetStatus = 'IN_PROGRESS'
    description = 'Controlled API integration transition.'
} | Out-Null
Invoke-ClaimNxApi Delete "/v1/organizations/$organizationId/work-items/$workItemId" $headers @{ version = 5 } | Out-Null

# 4. Retire the Queue, cancel the Instance, then retire the Definition.
Invoke-ClaimNxApi Delete "/v1/organizations/$organizationId/workflow-queues/$queueId" $headers @{ version = 1 } | Out-Null
Invoke-ClaimNxApi Patch "/v1/organizations/$organizationId/workflow-instances/$instanceId/cancel" $headers @{
    version = 1
    closureReason = 'Controlled API integration cleanup.'
} | Out-Null
Invoke-ClaimNxApi Delete "/v1/workflow-definitions/$definitionId" $headers @{ version = 2 } | Out-Null

[PSCustomObject]@{
    workflow_definition_id = $definitionId
    workflow_queue_id = $queueId
    workflow_instance_id = $instanceId
    workflow_task_id = $workItemId
    workflow_sla_id = $workflowSlaId
    controlled_cleanup_completed = $true
} | Format-List
