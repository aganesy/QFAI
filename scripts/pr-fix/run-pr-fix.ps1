[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$PrNumber,
  [string]$Tag,
  [int]$SleepSeconds = 60,
  [int]$RequiredZeroStreak = 30,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$LiveSleepSeconds = 60
$LiveRequiredZeroStreak = 30

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

function SaveArtifact([string]$Root, [string]$Name, [string]$Content) {
  $dir = Join-Path $Root "tmp/pr-fix"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $path = Join-Path $dir $Name
  $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($path, $Content, $utf8WithBom)
  return $path
}

function SaveJson([string]$Root, [string]$Name, $Value) {
  return SaveArtifact -Root $Root -Name $Name -Content ($Value | ConvertTo-Json -Depth 10)
}

function UtcNowIso {
  return (Get-Date).ToUniversalTime().ToString("o")
}

function ChangedFiles([string]$Owner, [string]$Repo, [int]$Number) {
  $raw = (Run "gh" @("api", "--paginate", "repos/$Owner/$Repo/pulls/$Number/files", "--jq", ".[].filename") "Failed to read changed files.") -join "`n"
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  return @($raw -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
}

function ReviewLanguage([string]$Body) {
  $match = [regex]::Match($Body, "Review Language:\s*([^\r\n]+)")
  if ($match.Success) { return $match.Groups[1].Value.Trim() }
  if ($Body -match "[\p{IsHiragana}\p{IsKatakana}\p{IsCJKUnifiedIdeographs}]") { return "ja" }
  return "en"
}

function NormalizeBody([string]$Body) {
  if ($null -eq $Body) { return "" }
  $text = $Body -replace "^\uFEFF", ""
  $text = $text -replace "`r`n", "`n"
  return $text.Trim()
}

function CountOf($Value) {
  if ($null -eq $Value) { return 0 }
  return @($Value).Count
}

function StripAutoImport([string]$Body) {
  $normalized = NormalizeBody $Body
  if ([string]::IsNullOrWhiteSpace($normalized)) { return "" }
  $parts = [regex]::Split($normalized, "(?m)^## Auto-import\s*$", 2)
  if ((CountOf $parts) -ge 2 -and -not [string]::IsNullOrWhiteSpace($parts[0])) {
    return $parts[0].Trim()
  }
  return $normalized
}

function Compliance([string]$Body) {
  $normalized = StripAutoImport $Body
  $required = [ordered]@{
    "change_type" = "(?m)^## Change Type \(Primary\)\s*$"
    "tags" = "(?m)^## Tags\s*$"
    "compatibility" = "(?m)^## Compatibility \(compat\)\s*$"
    "review_language" = "(?m)^### Review Language\s*$"
    "tests_section" = "(?m)^## 4\..*Tests.*$"
    "review_focus" = "(?m)^## Review Focus \(auto by type\)\s*$"
    "open_questions" = "(?m)^## Open Questions / Follow-ups(?:.*)?$"
  }
  $missing = @()
  foreach ($entry in $required.GetEnumerator()) {
    if ($normalized -notmatch $entry.Value) { $missing += $entry.Key }
  }
  $hasChangeType = ($normalized -match "(?s)## Change Type \(Primary\).*?- \[x\] ")
  $hasCompat = ($normalized -match "(?s)## Compatibility \(compat\).*?- \[x\] ")
  $hasReviewLang = ($normalized -match "Review Language:\s*\S+")
  $hasTests = ($normalized -match "(?s)## 4\..*Tests.*?- .*?:.*?- .*?:")
  return [pscustomobject]@{
    Missing     = $missing
    ChangeType  = $hasChangeType
    Compat      = $hasCompat
    ReviewLang  = $hasReviewLang
    Tests       = $hasTests
    IsCompliant = ($missing.Count -eq 0 -and $hasChangeType -and $hasCompat -and $hasReviewLang -and $hasTests)
  }
}

function Classify([string]$Title, [string[]]$ChangedFiles) {
  $lower = @($ChangedFiles | ForEach-Object { $_.ToLowerInvariant() })
  $primary = "Ops"
  if ($Title -match "(?i)\b(fix|bug|correct|repair)\b") { $primary = "Behavior" }
  elseif ($Title -match "(?i)\b(add|introduce|create|new)\b") { $primary = "Initial" }
  elseif ((@($lower | Where-Object { $_ -notmatch "\.md$|^docs/|^\.qfai/|^readme\.md$|^release\.md$|^changelog\.md$|^\.agents/|^\.claude/|^\.github/(agents|instructions|prompts|skills)/|^\.codex/" }).Count) -gt 0) { $primary = "Behavior" }

  $tags = New-Object System.Collections.Generic.List[string]
  if ((@($lower | Where-Object { $_ -match "\.md$|^docs/|^readme\.md$|^release\.md$|^changelog\.md$|^\.qfai/" }).Count) -gt 0) { $tags.Add("@docs") }
  if ((@($lower | Where-Object { $_ -match "^tests/|/tests/|^\.github/workflows/|^scripts/" }).Count) -gt 0) { $tags.Add("@test") }
  if ((@($lower | Where-Object { $_ -match "^packages/|qfai\.config\.yaml$|^\.qfai/contracts/|^\.qfai/specs/" }).Count) -gt 0) { $tags.Add("@api") }
  if ((@($lower | Where-Object { $_ -match "^\.qfai/contracts/db/|\.sql$" }).Count) -gt 0) { $tags.Add("@db") }
  if ((@($lower | Where-Object { $_ -match "^scripts/|^\.github/workflows/|security|performance|doctor|release" }).Count) -gt 0) { $tags.Add("@nfr") }
  if ($tags.Count -eq 0) { $tags.Add("@docs") }

  $compat = if ($Title -match "(?i)\b(fix|bug|correct|repair)\b") { "Bug-for-bug" } else { "Improvement" }
  return [pscustomobject]@{ Primary = $primary; Tags = @($tags | Select-Object -Unique); Compat = $compat }
}

function MarkCheckboxes([string]$Text, [string[]]$Selected) {
  foreach ($item in $Selected) {
    $pattern = "- \[ \] " + [regex]::Escape($item)
    $Text = [regex]::Replace($Text, $pattern, "- [x] $item", 1)
  }
  return $Text
}

function RepairBody([string]$Template, $Pr, [string[]]$ChangedFiles, $Classification, [string]$CiCommand) {
  $delta = @($ChangedFiles | Where-Object { $_ -match "delta\.md$" } | Select-Object -First 1)
  $deltaPath = if ((CountOf $delta) -eq 0) { "not found in diff" } else { $delta[0] }
  $dlMatch = [regex]::Match([string]$Pr.body, "DL-\d{8}-\d{2}")
  $dl = if ($dlMatch.Success) { $dlMatch.Value } else { "TBD" }
  $lang = ReviewLanguage ([string]$Pr.body)
  $body = MarkCheckboxes -Text $Template -Selected @($Classification.Primary)
  $body = MarkCheckboxes -Text $body -Selected $Classification.Tags
  $body = MarkCheckboxes -Text $body -Selected @($Classification.Compat)
  $body = [regex]::Replace($body, '- Updated: \(path\) `.*`', "- Updated: (path) ``$deltaPath``", 1)
  $body = [regex]::Replace($body, '- DL Entry: `.*`', "- DL Entry: ``$dl``", 1)
  $body = [regex]::Replace($body, '- Review Language: .*', "- Review Language: $lang", 1)
  $preview = @($ChangedFiles | Select-Object -First 10)
  if ((CountOf $preview) -eq 0) { $preview = @("(no files detected)") }
  $original = StripAutoImport ([string]$Pr.body)
  if ([string]::IsNullOrWhiteSpace($original)) { $original = "(empty)" }
  $append = @("","## Auto-import","","- Title: $($Pr.title)","- Source PR: $($Pr.url)","- Branch: $($Pr.headRefName) -> $($Pr.baseRefName)","- Repo CI command: ``$CiCommand``","- Changed files:")
  $append += @($preview | ForEach-Object { "  - ``$_``" })
  $append += @("","~~~md",$original,"~~~")
  return ($body + ($append -join "`n"))
}

function Threads([string]$Owner, [string]$Repo, [int]$Number) {
  $query = 'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved isOutdated comments(last:1){nodes{databaseId url body path author{login}}}}}}}}'
  $data = RunJson "gh" @("api", "graphql", "-f", "query=$query", "-f", "owner=$Owner", "-f", "repo=$Repo", "-F", "number=$Number") "Failed to read review threads."
  $items = @()
  foreach ($node in @($data.data.repository.pullRequest.reviewThreads.nodes)) {
    if ($node.isResolved) { continue }
    $comment = @($node.comments.nodes)[-1]
    $items += [pscustomobject]@{ ThreadId = [string]$node.id; CommentId = [string]$comment.databaseId; Url = [string]$comment.url; Body = [string]$comment.body; Path = [string]$comment.path; Author = [string]$comment.author.login }
  }
  return @($items)
}

function CheckSummary($Check) {
  return [pscustomobject]@{
    Name       = [string]$Check.name
    Workflow   = [string]$Check.workflowName
    Status     = [string]$Check.status
    Conclusion = [string]$Check.conclusion
    Url        = [string]$Check.detailsUrl
  }
}

function EvaluateChecks($Pr) {
  $checks = @($Pr.statusCheckRollup)
  if ((CountOf $checks) -eq 0) {
    return [pscustomobject]@{
      State   = "waiting_ci_pending"
      Failed  = @()
      Pending = @()
      Total   = 0
    }
  }

  $failed = @()
  $pending = @()
  foreach ($check in $checks) {
    $summary = CheckSummary $check
    if ($summary.Status -ne "COMPLETED") {
      $pending += $summary
      continue
    }
    if (@("FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "STALE") -contains $summary.Conclusion) {
      $failed += $summary
    }
  }

  if ((CountOf $failed) -gt 0) {
    return [pscustomobject]@{
      State   = "blocked_ci_failure"
      Failed  = $failed
      Pending = $pending
      Total   = $checks.Count
    }
  }
  if ((CountOf $pending) -gt 0) {
    return [pscustomobject]@{
      State   = "waiting_ci_pending"
      Failed  = @()
      Pending = $pending
      Total   = $checks.Count
    }
  }

  return [pscustomobject]@{
    State   = "clean"
    Failed  = @()
    Pending = @()
    Total   = $checks.Count
  }
}

function SaveMonitorStatus(
  [string]$Root,
  [int]$Number,
  [string]$Mode,
  [int]$EffectiveSleep,
  [int]$EffectiveStreak,
  [int]$CurrentStreak,
  [string]$State,
  [string]$BlockingArtifact,
  [string]$NextAction
) {
  $status = [pscustomobject]@{
    PrNumber                    = $Number
    Mode                        = $Mode
    EffectiveSleepSeconds       = $EffectiveSleep
    EffectiveRequiredZeroStreak = $EffectiveStreak
    CurrentStreak               = $CurrentStreak
    State                       = $State
    LastPolledAt                = UtcNowIso
    BlockingArtifact            = $BlockingArtifact
    NextAction                  = $NextAction
  }
  return SaveJson -Root $Root -Name ("pr-{0}-monitor-status.json" -f $Number) -Value $status
}

function PrintThreads([string]$Root, [string]$Owner, [string]$Repo, $Items) {
  foreach ($item in $Items) {
    Warn ("Unresolved thread: {0}" -f $item.Url)
    Write-Host ("  Author: {0}" -f $item.Author)
    Write-Host ("  Path:   {0}" -f $item.Path)
    Write-Host ("  Body:   {0}" -f (($item.Body -replace "`r", " " -replace "`n", " ").Trim()))
    Write-Host ("  Reply command: gh api repos/{0}/{1}/pulls/comments/{2}/replies -f body=""Addressed in <sha>.""" -f $Owner, $Repo, $item.CommentId)
    Write-Host ("  Resolve command: gh api graphql -f query=""mutation(`$threadId: ID!) {{ resolveReviewThread(input: {{ threadId: `$threadId }}) {{ thread {{ isResolved }} }} }}"" -f threadId=""{0}""" -f $item.ThreadId)
  }
  Info ("Saved review thread snapshot to {0}" -f (SaveJson -Root $Root -Name "pr-review-threads.json" -Value $Items))
}

function PrintChecks([string]$Root, $Items) {
  foreach ($item in $Items) {
    Warn ("Non-green check: {0} ({1}/{2})" -f $item.Name, $item.Status, $item.Conclusion)
    Write-Host ("  Workflow: {0}" -f $item.Workflow)
    Write-Host ("  URL:      {0}" -f $item.Url)
  }
  $path = SaveJson -Root $Root -Name "pr-checks.json" -Value $Items
  Info ("Saved CI snapshot to {0}" -f $path)
  return $path
}

if (-not $DryRun) {
  if ($PSBoundParameters.ContainsKey("SleepSeconds") -or $PSBoundParameters.ContainsKey("RequiredZeroStreak")) {
    throw ("Live monitor mode fixes SleepSeconds={0} and RequiredZeroStreak={1}. Do not override them." -f $LiveSleepSeconds, $LiveRequiredZeroStreak)
  }
}

$root = RepoRoot
Set-Location -LiteralPath $root

EnsureFile (Join-Path $root ".github/PULL_REQUEST_TEMPLATE.md")
EnsureFile (Join-Path $root ".github/workflows/ci.yml")
EnsureFile (Join-Path $root "package.json")

[void](Run "gh" @("auth", "status") "gh auth status failed.")

$repo = RunJson "gh" @("repo", "view", "--json", "name,owner,url,defaultBranchRef") "Failed to read repository metadata."
$repoPkg = ReadUtf8File (Join-Path $root "package.json") | ConvertFrom-Json
$branch = CurrentBranch
$pr = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "number,title,body,baseRefName,headRefName,statusCheckRollup,url") "Failed to read PR details."
$changed = ChangedFiles -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Number $PrNumber
$ciCommand = if ([string]::IsNullOrWhiteSpace([string]$repoPkg.scripts."ci:local")) { "pnpm format:check && pnpm lint && pnpm check-types" } else { "pnpm ci:local" }
$effectiveSleepSeconds = if ($DryRun) { $SleepSeconds } else { $LiveSleepSeconds }
$effectiveRequiredZeroStreak = if ($DryRun) { $RequiredZeroStreak } else { $LiveRequiredZeroStreak }
$mode = if ($DryRun) { "dry_run" } else { "live" }

Info ("Repository root: {0}" -f $root)
Info ("Current branch: {0}" -f $branch)
Info ("PR #{0}: {1}" -f $pr.number, $pr.title)
Info ("PR URL: {0}" -f $pr.url)
if ($PSBoundParameters.ContainsKey("Tag")) {
  Warn ("Tag parameter '{0}' is ignored. Merge/tag moved to a separate workflow." -f $Tag)
}

if ([string]$pr.baseRefName -ne "main") { throw ("PR #{0} targets '{1}'. Only 'main' is supported." -f $pr.number, $pr.baseRefName) }
if (-not $DryRun -and (CountOf (GitStatus)) -gt 0) { throw "Working tree is dirty before live monitoring. Commit or stash changes first." }

$check = Compliance ([string]$pr.body)
if (-not $check.IsCompliant) {
  if ([string]::IsNullOrWhiteSpace([string]$pr.title) -and (CountOf $changed) -eq 0 -and [string]::IsNullOrWhiteSpace([string]$pr.body)) {
    throw "PR body repair is blocked because no title/body/diff context is available."
  }
  [void](SaveJson -Root $root -Name ("pr-{0}-body-compliance.json" -f $pr.number) -Value $check)
  $newBody = RepairBody -Template (ReadUtf8File (Join-Path $root ".github/PULL_REQUEST_TEMPLATE.md")) -Pr $pr -ChangedFiles $changed -Classification (Classify -Title ([string]$pr.title) -ChangedFiles $changed) -CiCommand $ciCommand
  $preview = SaveArtifact -Root $root -Name ("pr-{0}-body-repaired.md" -f $pr.number) -Content $newBody
  Warn ("PR body is not template-compliant. Preview saved to {0}" -f $preview)
  if ((CountOf $check.Missing) -gt 0) {
    Warn ("Missing sections: {0}" -f (($check.Missing -join ", ")))
  }
  if (-not $DryRun) {
    [void](Run "gh" @("pr", "edit", "$($pr.number)", "--body-file", $preview) "Failed to update PR body.")
    Info "PR body updated from the generated preview."
  }
}

$streak = 0
$firstPoll = $true
while ($streak -lt $effectiveRequiredZeroStreak) {
  if (-not $firstPoll -and $effectiveSleepSeconds -gt 0) {
    Info ("Waiting {0} seconds before the next PR check." -f $effectiveSleepSeconds)
    Start-Sleep -Seconds $effectiveSleepSeconds
  }
  $firstPoll = $false

  $snapshot = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "number,title,body,baseRefName,headRefName,statusCheckRollup,url") "Failed to refresh PR details."
  $threads = @(Threads -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Number $PrNumber)
  $checkState = EvaluateChecks $snapshot

  if ((CountOf $threads) -gt 0) {
    $streak = 0
    [void](PrintThreads -Root $root -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Items $threads)
    $statusPath = SaveMonitorStatus -Root $root -Number $PrNumber -Mode $mode -EffectiveSleep $effectiveSleepSeconds -EffectiveStreak $effectiveRequiredZeroStreak -CurrentStreak $streak -State "action_required_threads" -BlockingArtifact "pr-review-threads.json" -NextAction "Remediate review feedback, commit/push, resolve threads, then rerun the live monitor."
    Info ("Saved monitor status to {0}" -f $statusPath)
    if ($DryRun) { throw "Unresolved review threads remain. Dry-run stopped before remediation." }
    throw "Unresolved review threads remain. Remediate, commit/push, resolve the threads, then rerun the live monitor."
  }

  if ($checkState.State -eq "blocked_ci_failure") {
    $streak = 0
    [void](PrintChecks -Root $root -Items $checkState.Failed)
    $statusPath = SaveMonitorStatus -Root $root -Number $PrNumber -Mode $mode -EffectiveSleep $effectiveSleepSeconds -EffectiveStreak $effectiveRequiredZeroStreak -CurrentStreak $streak -State "action_required_ci_failure" -BlockingArtifact "pr-checks.json" -NextAction "Remediate the failing CI checks, commit/push, and rerun the live monitor."
    Info ("Saved monitor status to {0}" -f $statusPath)
    if ($DryRun) { throw "CI/CD has failing checks. Dry-run stopped before remediation." }
    throw "CI/CD has failing checks. Remediate, commit/push, then rerun the live monitor."
  }

  if ($checkState.State -eq "waiting_ci_pending") {
    $streak = 0
    $statusPath = SaveMonitorStatus -Root $root -Number $PrNumber -Mode $mode -EffectiveSleep $effectiveSleepSeconds -EffectiveStreak $effectiveRequiredZeroStreak -CurrentStreak $streak -State "waiting_ci_pending" -BlockingArtifact $null -NextAction "Wait for CI to finish and continue the 60-second live polling cycle."
    Info ("Saved monitor status to {0}" -f $statusPath)
    Info "CI checks are pending/in-progress or not yet reported. Resetting clean streak to 0."
    if ($DryRun) {
      Info "Dry-run observed pending/incomplete CI. Live monitor would continue waiting."
      break
    }
    continue
  }

  $streak += 1
  $statusPath = SaveMonitorStatus -Root $root -Number $PrNumber -Mode $mode -EffectiveSleep $effectiveSleepSeconds -EffectiveStreak $effectiveRequiredZeroStreak -CurrentStreak $streak -State "clean" -BlockingArtifact $null -NextAction "Continue 60-second live polling until the clean streak reaches the required threshold."
  Info ("Saved monitor status to {0}" -f $statusPath)
  Info ("Clean PR poll {0}/{1}" -f $streak, $effectiveRequiredZeroStreak)
  if ($DryRun) { break }
}

if ($DryRun) {
  Info "Dry-run completed."
  return
}

if ((CountOf (GitStatus)) -gt 0) { throw "Working tree is dirty before final verification. Commit or stash changes first." }
$finalPr = RunJson "gh" @("pr", "view", "$PrNumber", "--json", "number,title,headRefName,baseRefName,statusCheckRollup,url") "Failed to refresh PR for final verification."
if ((EvaluateChecks $finalPr).State -ne "clean") { throw "CI/CD is no longer green at the handoff boundary." }
$finalThreads = @(Threads -Owner ([string]$repo.owner.login) -Repo ([string]$repo.name) -Number $PrNumber)
if ((CountOf $finalThreads) -gt 0) { throw "Unresolved review threads reappeared at the handoff boundary." }

$handoff = [pscustomobject]@{
  PrNumber         = $PrNumber
  Url              = [string]$finalPr.url
  HeadRefName      = [string]$finalPr.headRefName
  BaseRefName      = [string]$finalPr.baseRefName
  CurrentSha       = HeadSha
  Checks           = "green"
  UnresolvedThreads = 0
  CleanStreak      = $streak
  NextAction       = "Use the pr-merge skill."
}
$handoffPath = SaveJson -Root $root -Name ("pr-{0}-handoff.json" -f $PrNumber) -Value $handoff
[void](SaveMonitorStatus -Root $root -Number $PrNumber -Mode $mode -EffectiveSleep $effectiveSleepSeconds -EffectiveStreak $effectiveRequiredZeroStreak -CurrentStreak $streak -State "handoff_ready" -BlockingArtifact $null -NextAction $handoff.NextAction)

Write-Host ("[INFO] PR handoff ready for PR #{0}" -f $PrNumber)
Write-Host ("  Current SHA: {0}" -f $handoff.CurrentSha)
Write-Host ("  PR URL:      {0}" -f $handoff.Url)
Write-Host ("  Checks:      {0}" -f $handoff.Checks)
Write-Host ("  Unresolved:  {0}" -f $handoff.UnresolvedThreads)
Write-Host ("  Snapshot:    {0}" -f $handoffPath)
Write-Host ("  Next:        {0}" -f $handoff.NextAction)
