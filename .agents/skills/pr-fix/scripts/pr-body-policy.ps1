function NormalizeBody([string]$Body) {
  if ($null -eq $Body) { return "" }
  $text = $Body -replace "^\uFEFF", ""
  $text = $text -replace "`r`n", "`n"
  return $text.Trim()
}

function MaskBodyExamples([string]$Body) {
  $fence = ""
  $inComment = $false
  $masked = @(foreach ($line in ($Body -split "`n")) {
    if ($fence.Length -gt 0) {
      $closing = [regex]::Match($line, '^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$').Groups[1].Value
      if ($closing.Length -ge $fence.Length -and $closing[0] -eq $fence[0]) { $fence = "" }
      $line -replace '[^\r\n]', ' '
      continue
    }
    $visible = $line
    $position = 0
    while ($position -lt $line.Length) {
      if (-not $inComment) {
        $start = $line.IndexOf('<!--', $position, [System.StringComparison]::Ordinal)
        if ($start -lt 0) { break }
        $position = $start
        $inComment = $true
      }
      $end = $line.IndexOf('-->', $position, [System.StringComparison]::Ordinal)
      $next = if ($end -lt 0) { $line.Length } else { $end + 3 }
      $visible = $visible.Remove($position, $next - $position).Insert($position, (' ' * ($next - $position)))
      $position = $next
      $inComment = $end -lt 0
    }
    $opening = [regex]::Match($visible, '^[ \t]{0,3}(`{3,}|~{3,})(.*)$')
    if ($opening.Success -and -not ($opening.Groups[1].Value[0] -eq '`' -and $opening.Groups[2].Value.Contains('`'))) {
      $fence = $opening.Groups[1].Value
      $line -replace '[^\r\n]', ' '
      continue
    }
    $visible
  })
  return $masked -join "`n"
}

function StripAutoImport([string]$Body) {
  $normalized = NormalizeBody $Body
  if ([string]::IsNullOrWhiteSpace($normalized)) { return "" }
  $boundary = [regex]::Match((MaskBodyExamples $normalized), '(?m)^## Auto-import[ \t]*$')
  if ($boundary.Success) { return $normalized.Substring(0, $boundary.Index).Trim() }
  return $normalized
}

function RemovalAnswer([string]$Body) {
  $raw = StripAutoImport $Body
  $text = MaskBodyExamples $raw
  $match = [regex]::Match($text, '(?ms)^## What (?:this|a) change made unnecessary[ \t]*\n(?<answer>.*?)(?=^#{1,2} |\z)')
  if (-not $match.Success) { return "" }
  $answer = $match.Groups['answer']
  $meaningful = [regex]::Replace($answer.Value, '(?m)^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[ xX-]?\][ \t]*)?', '')
  $meaningful = [regex]::Replace($meaningful, '(?m)^[ \t]*>+[ \t]*', '')
  $meaningful = [regex]::Replace($meaningful, '\[([^\]]*)\]\([^\)\r\n]*\)', '$1')
  $meaningful = [regex]::Replace($meaningful, '</?[A-Za-z][A-Za-z0-9:-]*(?:[ \t][^>]*|[ \t]*/?)>', '')
  $meaningful = [regex]::Replace($meaningful, '&(?:#(?:[xX][0-9A-Fa-f]+|\d+)|[A-Za-z][A-Za-z0-9]*);', ' ')
  $meaningful = [regex]::Replace($meaningful, '[`*_]', '').Trim()
  if ($meaningful -notmatch '[\p{L}\p{N}]' -or $meaningful -match '^(?:TBD|TODO)(?:[^\p{L}\p{N}]|$)' -or $meaningful -match '^(?:TBD|TODO|None|N/?A|Not applicable|\[.*\])\.?$') { return "" }
  return $raw.Substring($answer.Index, $answer.Length).Trim()
}
