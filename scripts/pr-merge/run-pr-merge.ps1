[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$PrNumber,
  [string]$Tag,
  [switch]$NoTag,
  [ValidateSet("merge", "squash", "rebase")]
  [string]$MergeMethod = "merge",
  [string]$HandoffPath,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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
  $output = & $FilePath @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    $text = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { throw $FailureMessage }
    throw "$FailureMessage`n$text"
  }
  return [string[]]$output
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
  if ($null -eq $Scripts) {
    return "pnpm format:check && pnpm lint && pnpm check-types"
  }

  foreach ($name in @("ci:gate", "ci:local")) {
    $property = $Scripts.PSObject.Properties[$name]
    if ($null -eq $property) { continue }

    $value = [string]$property.Value
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value
    }
  }

  return "pnpm format:check && pnpm lint && pnpm check-types"
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

function CheckTagExists([string]$Name) {
  if ([string]::IsNullOrWhiteSpace($Name)) { return $false }

  & git rev-parse -q --verify "refs/tags/$Name" 2>$null | Out-Null
  $localExists = $LASTEXITCODE -eq 0
  $remote = (Run "git" @("ls-remote", "--tags", "origin", $Name) "Failed to check remote tags.") -join "`n"
  return ($localExists -or -not [string]::IsNullOrWhiteSpace($remote))
}

function BumpPatchVersion([string]$Version) {
  if ($Version -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
    throw "Unsupported semantic version format: $Version"
  }

  return "{0}.{1}.{2}" -f $Matches[1], $Matches[2], ([int]$Matches[3] + 1)
}

function SuggestReleaseTag([string]$Version) {
  $candidate = $Version
  while (CheckTagExists ("v{0}" -f $candidate)) {
    $candidate = BumpPatchVersion $candidate
  }

  return "v{0}" -f $candidate
}

function SuggestAlternativeTag([int]$Number) {
  return "release-pr-{0}-{1}" -f $Number, (Get-Date -Format "yyyyMMdd")
}

function IsSemVerTag([string]$Name) {
  return $Name -match '^v\d+\.\d+\.\d+$'
}

function ValidateReleaseTag([string]$Name, $PackageJson, [string]$Changelog) {
  if (-not (IsSemVerTag $Name)) { return }

  $expected = "v{0}" -f [string]$PackageJson.version
  if ($Name -ne $expected) {
    throw "SemVer tag '$Name' does not match packages/qfai/package.json version '$($PackageJson.version)'. Update version/changelog first, or choose a non-SemVer tag / no tag."
  }

  $version = [string]$PackageJson.version
  $heading = "(?m)^## \[{0}\]" -f [regex]::Escape($version)
  if ($Changelog -notmatch $heading) {
    throw "CHANGELOG.md does not contain section [$version]. Update CHANGELOG.md first, or choose a non-SemVer tag / no tag."
  }
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
  $query = 'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved isOutdated comments(last:1){nodes{databaseId url body path author{login}}}}}}}}'
  $data = RunJson "gh" @("api", "graphql", "-f", "query=$query", "-f", "owner=$Owner", "-f", "repo=$Repo", "-F", "number=$Number") "Failed to read review threads."
  $items = @()
  foreach ($node in @($data.data.repository.pullRequest.reviewThreads.nodes)) {
    if ($node.isResolved -or $node.isOutdated) { continue }
    $comment = @($node.comments.nodes)[-1]
    $items += [pscustomobject]@{
      ThreadId  = [string]$node.id
      CommentId = [string]$comment.databaseId
      Url       = [string]$comment.url
      Body      = [string]$comment.body
      Path      = [string]$comment.path
      Author    = [string]$comment.author.login
    }
  }
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

if ($NoTag -and -not [string]::IsNullOrWhiteSpace($Tag)) {
  throw "Specify either -Tag <name> or -NoTag, not both."
}

$root = RepoRoot
Set-Location -LiteralPath $root

EnsureFile (Join-Path $root "package.json")
EnsureFile (Join-Path $root "packages/qfai/package.json")
EnsureFile (Join-Path $root "CHANGELOG.md")
EnsureFile (Join-Path $root "RELEASE.md")

[void](Run "gh" @("auth", "status") "gh auth status failed.")

$repo = RunJson "gh" @("repo", "view", "--json", "name,owner,url,defaultBranchRef") "Failed to read repository metadata."
$repoPkg = ReadUtf8File (Join-Path $root "package.json") | ConvertFrom-Json
$packageJson = ReadUtf8File (Join-Path $root "packages/qfai/package.json") | ConvertFrom-Json
$changelog = ReadUtf8File (Join-Path $root "CHANGELOG.md")
$branch = CurrentBranch
$pr = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "number,title,baseRefName,headRefName,statusCheckRollup,url,state,isDraft") "Failed to read PR details."
$threads = @(Threads -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Number $PrNumber)
$badChecks = @(FailingChecks $pr)
$suggestedReleaseTag = SuggestReleaseTag ([string]$packageJson.version)
$suggestedAlternativeTag = SuggestAlternativeTag $PrNumber
$resolvedHandoffPath = if ([string]::IsNullOrWhiteSpace($HandoffPath)) {
  Join-Path $root ("tmp/pr-fix/pr-{0}-handoff.json" -f $PrNumber)
} else {
  if ([System.IO.Path]::IsPathRooted($HandoffPath)) { $HandoffPath } else { Join-Path $root $HandoffPath }
}
$handoff = LoadOptionalJson $resolvedHandoffPath
$ciCommand = ResolveCiCommand $repoPkg.scripts
$selectedTagMode = if ($NoTag) { "none" } elseif ([string]::IsNullOrWhiteSpace($Tag)) { "unspecified" } else { "tag" }
$blockers = New-Object System.Collections.Generic.List[string]

Info ("Repository root: {0}" -f $root)
Info ("Current branch: {0}" -f $branch)
Info ("PR #{0}: {1}" -f $pr.number, $pr.title)
Info ("PR URL: {0}" -f $pr.url)
Info ("Suggested release tag: {0}" -f $suggestedReleaseTag)
Info ("Suggested alternative tag: {0}" -f $suggestedAlternativeTag)
Info ("Selected tag mode: {0}" -f $selectedTagMode)
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
if ($badChecks.Count -gt 0) {
  foreach ($check in $badChecks) {
    $blockers.Add(("Check '{0}' is not green ({1}/{2})." -f $check.Name, $check.Status, $check.Conclusion))
  }
}
if ($threads.Count -gt 0) {
  $blockers.Add(("Unresolved review threads remain: {0}" -f $threads.Count))
}

if (-not $DryRun -and (GitStatus).Count -gt 0) {
  $blockers.Add("Working tree is dirty before merge/tag. Commit or stash changes first.")
}

if ($selectedTagMode -eq "tag") {
  if (CheckTagExists $Tag) {
    $blockers.Add(("Tag '{0}' already exists locally or on origin." -f $Tag))
  }

  try {
    ValidateReleaseTag -Name $Tag -PackageJson $packageJson -Changelog $changelog
  } catch {
    $blockers.Add($_.Exception.Message)
  }
}

if (-not $DryRun -and $selectedTagMode -eq "unspecified") {
  $blockers.Add("Select tag policy first. Use -NoTag or -Tag <name> after user confirmation.")
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
  SuggestedReleaseTag    = $suggestedReleaseTag
  SuggestedAlternativeTag = $suggestedAlternativeTag
  SelectedTagMode        = $selectedTagMode
  SelectedTag            = if ($selectedTagMode -eq "tag") { $Tag } else { $null }
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

[void](Run "gh" (MergeArgs -Method $MergeMethod -Number $PrNumber) "gh pr merge failed.")

$result = [ordered]@{
  PrNumber    = $PrNumber
  Url         = [string]$pr.url
  MergeMethod = $MergeMethod
  Tagged      = $false
  Tag         = $null
}

if ($selectedTagMode -eq "tag") {
  [void](Run "git" @("checkout", "main") "Failed to checkout main.")
  [void](Run "git" @("pull", "--ff-only") "Failed to pull latest main.")

  if (CheckTagExists $Tag) {
    throw ("Tag '{0}' already exists locally or on origin after merge." -f $Tag)
  }

  [void](Run "git" @("tag", $Tag) ("Failed to create tag {0}." -f $Tag))
  [void](Run "git" @("push", "origin", $Tag) ("Failed to push tag {0}." -f $Tag))

  $result.Tagged = $true
  $result.Tag = $Tag
}

$result.OrderedSha = HeadSha
$resultPath = SaveJson -Root $root -Name ("pr-{0}-merge-result.json" -f $PrNumber) -Value ([pscustomobject]$result)

if ($result.Tagged) {
  Info ("Merged PR #{0} and pushed tag {1}" -f $PrNumber, $Tag)
} else {
  Info ("Merged PR #{0} without tag." -f $PrNumber)
}
Info ("Saved merge result to {0}" -f $resultPath)
