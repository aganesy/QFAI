function NormalizeBody([string]$Body) {
  if ($null -eq $Body) { return "" }
  $text = $Body -replace "^\uFEFF", ""
  $text = $text -replace "`r`n", "`n"
  return $text.Trim()
}

function StripAutoImport([string]$Body) {
  $normalized = NormalizeBody $Body
  if ([string]::IsNullOrWhiteSpace($normalized)) { return "" }
  $parts = [regex]::Split($normalized, "(?m)^## Auto-import\s*$", 2)
  if ($parts.Length -ge 2 -and -not [string]::IsNullOrWhiteSpace($parts[0])) {
    return $parts[0].Trim()
  }
  return $normalized
}

function RemovalAnswer([string]$Body) {
  $raw = StripAutoImport $Body
  $fence = ""
  $text = (@(foreach ($line in ($raw -split "`n")) {
    if ($fence.Length -gt 0) {
      $closing = [regex]::Match($line, '^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$').Groups[1].Value
      if ($closing.Length -ge $fence.Length -and $closing[0] -eq $fence[0]) { $fence = "" }
      $line -replace '[^\r\n]', ' '
      continue
    }
    $opening = [regex]::Match($line, '^[ \t]{0,3}(`{3,}|~{3,})(.*)$')
    if ($opening.Success -and -not ($opening.Groups[1].Value[0] -eq '`' -and $opening.Groups[2].Value.Contains('`'))) {
      $fence = $opening.Groups[1].Value
      $line -replace '[^\r\n]', ' '
      continue
    }
    $line
  })) -join "`n"
  $text = [regex]::Replace($text, '(?s)<!--.*?-->', {
    param($comment)
    return $comment.Value -replace '[^\r\n]', ' '
  })
  $match = [regex]::Match($text, '(?ms)^## What (?:this|a) change made unnecessary[ \t]*\n(?<answer>.*?)(?=^#{1,2} |\z)')
  if (-not $match.Success) { return "" }
  $answer = $match.Groups['answer']
  $meaningful = [regex]::Replace($answer.Value, '(?m)^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[ xX-]?\][ \t]*)?', '')
  $meaningful = [regex]::Replace($meaningful, '(?m)^[ \t]*>+[ \t]*', '')
  $meaningful = [regex]::Replace($meaningful, '\[([^\]]*)\]\([^\)\r\n]*\)', '$1')
  $meaningful = [regex]::Replace($meaningful, '</?[A-Za-z][A-Za-z0-9:-]*(?:[ \t][^>]*|[ \t]*/?)>', '')
  $meaningful = [regex]::Replace($meaningful, '[`*_]', '').Trim()
  if ($meaningful -notmatch '[\p{L}\p{N}]' -or $meaningful -match '^(?:TBD|TODO|\[.*\])\.?$') { return "" }
  return $raw.Substring($answer.Index, $answer.Length).Trim()
}
