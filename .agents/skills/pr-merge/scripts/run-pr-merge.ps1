[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$PrNumber,
  [ValidateSet("merge", "squash", "rebase")]
  [string]$MergeMethod = "merge",
  [string]$HandoffPath,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "../../pr-fix/scripts/pr-body-policy.ps1")

try {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [Console]::InputEncoding = $utf8NoBom
  [Console]::OutputEncoding = $utf8NoBom
  $OutputEncoding = $utf8NoBom
} catch {
  # Continue even if the host does not allow changing console encodings.
}

function Info([string]$Message) { Write-Host "[INFO] $Message" }
function Warn([string]$Message) { Write-Host "[WARN] $Message" }

function Run([string]$FilePath, [string[]]$Arguments, [string]$FailureMessage) {
  $previousNativeCommandPreference = $null
  $nativeCommandPreferenceVar = Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue
  if ($nativeCommandPreferenceVar) {
    $previousNativeCommandPreference = $nativeCommandPreferenceVar.Value
  }

  try {
    if ($nativeCommandPreferenceVar) {
      $PSNativeCommandUseErrorActionPreference = $false
    }
    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
      $text = ($output | Out-String).Trim()
      if ([string]::IsNullOrWhiteSpace($text)) { throw $FailureMessage }
      throw "$FailureMessage`n$text"
    }
    return [string[]]$output
  } finally {
    if ($nativeCommandPreferenceVar) {
      $PSNativeCommandUseErrorActionPreference = $previousNativeCommandPreference
    }
  }
}

function RunJson([string]$FilePath, [string[]]$Arguments, [string]$FailureMessage) {
  $raw = (Run $FilePath $Arguments $FailureMessage) -join "`n"
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  return $raw | ConvertFrom-Json
}

function EnsureFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing file: $Path"
  }
}

function RepoRoot {
  return ((Run "git" @("rev-parse", "--show-toplevel") "Failed to resolve repository root.") -join "`n").Trim()
}

function GitStatus {
  $raw = (Run "git" @("status", "--short") "Failed to read git status.") -join "`n"
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  return @($raw -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
}

function CurrentBranch {
  return ((Run "git" @("branch", "--show-current") "Failed to read current branch.") -join "`n").Trim()
}

function HeadSha {
  return ((Run "git" @("rev-parse", "HEAD") "Failed to read HEAD SHA.") -join "`n").Trim()
}

function ReadUtf8File([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function ResolveCiCommand($Scripts) {
  $fallback = "pnpm format:check && pnpm lint && pnpm check-types"

  if ($null -eq $Scripts) {
    return $fallback
  }

  foreach ($name in @("ci:gate", "ci:local")) {
    $property = $Scripts.PSObject.Properties[$name]
    if ($null -eq $property) { continue }

    $value = [string]$property.Value
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return "pnpm $name"
    }
  }

  return $fallback
}

function SaveArtifact([string]$Root, [string]$Name, [string]$Content) {
  $dir = Join-Path $Root "tmp/pr-merge"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $path = Join-Path $dir $Name
  $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($path, $Content, $utf8WithBom)
  return $path
}

function SaveJson([string]$Root, [string]$Name, $Value) {
  return SaveArtifact -Root $Root -Name $Name -Content ($Value | ConvertTo-Json -Depth 10)
}

function LoadOptionalJson([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }

  try {
    return (ReadUtf8File $Path | ConvertFrom-Json)
  } catch {
    Warn ("Failed to parse JSON file: {0}" -f $Path)
    return $null
  }
}

function Threads([string]$Owner, [string]$Repo, [int]$Number) {
  $query = 'query($owner:String!,$repo:String!,$number:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{id isResolved isOutdated comments(last:1){nodes{databaseId url body path author{login}}}}}}}}'
  $items = @()

  $after = $null
  do {
    $args = @("api", "graphql", "-f", "query=$query", "-f", "owner=$Owner", "-f", "repo=$Repo", "-F", "number=$Number")
    if (-not [string]::IsNullOrWhiteSpace($after)) {
      $args += @("-f", "after=$after")
    }
    $data = RunJson "gh" $args "Failed to read review threads."
    $threads = $data.data.repository.pullRequest.reviewThreads
    foreach ($node in @($threads.nodes)) {
      if ($node.isResolved -or $node.isOutdated) { continue }
      $comment = @($node.comments.nodes)[-1]
      if ($null -eq $comment) { continue }
      $items += [pscustomobject]@{
        ThreadId  = [string]$node.id
        CommentId = [string]$comment.databaseId
        Url       = [string]$comment.url
        Body      = [string]$comment.body
        Path      = [string]$comment.path
        Author    = [string]$comment.author.login
      }
    }
    $hasNextPage = [bool]$threads.pageInfo.hasNextPage
    if ($hasNextPage) {
      $nextCursor = [string]$threads.pageInfo.endCursor
      if ([string]::IsNullOrWhiteSpace($nextCursor)) {
        throw "Review thread pagination returned hasNextPage=true but endCursor was empty."
      }
      $after = $nextCursor
    }
  } while ($hasNextPage)

  return @($items)
}

function FailingChecks($Pr) {
  $bad = @()
  foreach ($check in @($Pr.statusCheckRollup)) {
    $failed = ($check.status -ne "COMPLETED" -or @("FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "STALE") -contains [string]$check.conclusion)
    if ($failed) {
      $bad += [pscustomobject]@{
        Name       = [string]$check.name
        Workflow   = [string]$check.workflowName
        Status     = [string]$check.status
        Conclusion = [string]$check.conclusion
        Url        = [string]$check.detailsUrl
      }
    }
  }
  return @($bad)
}

function MergeArgs([string]$Method, [int]$Number) {
  $args = @("pr", "merge", "$Number")
  switch ($Method) {
    "merge" { $args += "--merge" }
    "squash" { $args += "--squash" }
    "rebase" { $args += "--rebase" }
    default { throw "Unsupported merge method: $Method" }
  }
  return $args
}

$root = RepoRoot
Set-Location -LiteralPath $root

EnsureFile (Join-Path $root "package.json")

[void](Run "gh" @("auth", "status") "gh auth status failed.")

$repo = RunJson "gh" @("repo", "view", "--json", "name,owner,url,defaultBranchRef") "Failed to read repository metadata."
$repoPkg = ReadUtf8File (Join-Path $root "package.json") | ConvertFrom-Json
$branch = CurrentBranch
$pr = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "number,title,body,baseRefName,headRefName,statusCheckRollup,url,state,isDraft") "Failed to read PR details."
$threads = @(Threads -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Number $PrNumber)
$badChecks = @(FailingChecks $pr)
$resolvedHandoffPath = if ([string]::IsNullOrWhiteSpace($HandoffPath)) {
  Join-Path $root ("tmp/pr-fix/pr-{0}-handoff.json" -f $PrNumber)
} else {
  if ([System.IO.Path]::IsPathRooted($HandoffPath)) { $HandoffPath } else { Join-Path $root $HandoffPath }
}
$handoff = LoadOptionalJson $resolvedHandoffPath
$ciCommand = ResolveCiCommand $repoPkg.scripts
$blockers = New-Object System.Collections.Generic.List[string]

Info ("Repository root: {0}" -f $root)
Info ("Current branch: {0}" -f $branch)
Info ("PR #{0}: {1}" -f $pr.number, $pr.title)
Info ("PR URL: {0}" -f $pr.url)
if ($handoff) {
  Info ("Loaded handoff snapshot: {0}" -f $resolvedHandoffPath)
} else {
  Warn ("Handoff snapshot not found: {0}" -f $resolvedHandoffPath)
}

if ([string]$pr.baseRefName -ne "main") {
  $blockers.Add(("PR #{0} targets '{1}'. Only 'main' is supported." -f $pr.number, $pr.baseRefName))
}
if ([string]$pr.state -ne "OPEN") {
  $blockers.Add(("PR #{0} is not OPEN (state={1})." -f $pr.number, $pr.state))
}
if ($pr.isDraft) {
  $blockers.Add(("PR #{0} is still a draft." -f $pr.number))
}
if ([string]::IsNullOrWhiteSpace((RemovalAnswer ([string]$pr.body)))) {
  $blockers.Add("PR body needs an authored removal-list answer. Update the PR body before merging.")
}
if ($badChecks.Count -gt 0) {
  foreach ($check in $badChecks) {
    $blockers.Add(("Check '{0}' is not green ({1}/{2})." -f $check.Name, $check.Status, $check.Conclusion))
  }
}
if ($threads.Count -gt 0) {
  $blockers.Add(("Unresolved review threads remain: {0}" -f $threads.Count))
}

$gitStatus = @(GitStatus)
if (-not $DryRun -and $gitStatus.Count -gt 0) {
  $blockers.Add("Working tree is dirty before merge. Commit or stash changes first.")
}

$plan = [pscustomobject]@{
  PrNumber               = $PrNumber
  Url                    = [string]$pr.url
  Title                  = [string]$pr.title
  State                  = [string]$pr.state
  IsDraft                = [bool]$pr.isDraft
  BaseRefName            = [string]$pr.baseRefName
  HeadRefName            = [string]$pr.headRefName
  CurrentBranch          = $branch
  CurrentSha             = HeadSha
  HandoffPath            = $resolvedHandoffPath
  HandoffFound           = [bool]($null -ne $handoff)
  MergeMethod            = $MergeMethod
  CiCommand              = $ciCommand
  UnresolvedThreads      = $threads.Count
  BlockingChecks         = @($badChecks)
  Blockers               = @($blockers)
  ReadyToMerge           = ($blockers.Count -eq 0)
}
$planPath = SaveJson -Root $root -Name ("pr-{0}-merge-plan.json" -f $PrNumber) -Value $plan
Info ("Saved merge plan to {0}" -f $planPath)

if ($blockers.Count -gt 0) {
  foreach ($blocker in $blockers) {
    Warn $blocker
  }
  throw "Merge prerequisites are not satisfied."
}

if ($DryRun) {
  Info "Dry-run completed."
  return
}

$finalPr = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "body") "Failed to refresh PR body before merge."
if ([string]::IsNullOrWhiteSpace((RemovalAnswer ([string]$finalPr.body)))) {
  throw "PR body needs an authored removal-list answer at the merge boundary. Update the PR body before merging."
}

[void](Run "gh" (MergeArgs -Method $MergeMethod -Number $PrNumber) "gh pr merge failed.")

$result = [ordered]@{
  PrNumber    = $PrNumber
  Url         = [string]$pr.url
  MergeMethod = $MergeMethod
}

$result.OrderedSha = HeadSha
$resultPath = SaveJson -Root $root -Name ("pr-{0}-merge-result.json" -f $PrNumber) -Value ([pscustomobject]$result)

Info ("Merged PR #{0}." -f $PrNumber)
Info ("Saved merge result to {0}" -f $resultPath)
