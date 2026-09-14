function NormalizeBody([string]$Body) {
  if ($null -eq $Body) { return "" }
  $text = $Body -replace "^\uFEFF", ""
  $text = $text -replace "`r`n", "`n"
  return $text.TrimEnd()
}

function MaskBodyExamples([string]$Body, [switch]$SetextHeadings) {
  $definitions = [System.Collections.Generic.Dictionary[int, int]]::new()
  $interrupt = ' {0,3}(?:#{1,6}(?:[ \t]|$)|>|~{3,}|`{3,}[^`\n]*$|(?:=+|-+)[ \t]*$|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$|(?:[-+*]|0{0,8}1[.)])[ \t]+\S|(?i:<(?:!--|\?|![A-Za-z]|!\[CDATA\[|(?:pre|script|style|textarea)(?=[ \t>]|$)|/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|/>|$))))'
  $continuation = '\n(?![ \t]*(?:\n|\z))(?!' + $interrupt + ')'
  $label = '\[(?<label>(?:\\.|[^\[\]\\\n]|' + $continuation + ')+)\]'
  $destination = '(?<destination><(?:\\.|[^<>\\\n])*>|(?:\\.|[^\x00-\x20\x7f<>\\])+)'
  $title = '(?:"(?:[^"\\\n]|\\.|' + $continuation + ')*"|''(?:[^''\\\n]|\\.|' + $continuation + ')*''|\((?:[^()\\\n]|\\.|' + $continuation + ')*\))'
  $spacing = '(?:[ \t]+(?:' + $continuation + '[ \t]*)?|[ \t]*' + $continuation + '[ \t]*)'
  $definition = '(?m)^ {0,3}' + $label + ':[ \t]*(?:' + $continuation + '[ \t]*)?' + $destination + '(?:' + $spacing + $title + ')?[ \t]*$'
  $link = '(?m)\A\[(?<text>(?:\\.|[^\[\]\\\n]|' + $continuation + ')*)\]\([ \t]*(?:' + $continuation + '[ \t]*)?(?:' + $destination + ')?(?:' + $spacing + $title + ')?[ \t]*(?:' + $continuation + '[ \t]*)?\)'
  $destinationLength = {
    param([string]$Target, [bool]$Inline = $false)
    if ($Target.StartsWith('<', [System.StringComparison]::Ordinal)) { return $Target.Length }
    $depth = 0
    for ($targetIndex = 0; $targetIndex -lt $Target.Length; $targetIndex += 1) {
      if ($Target[$targetIndex] -eq '\') { $targetIndex += 1; continue }
      if ($Target[$targetIndex] -eq '(') { $depth += 1 }
      if ($Target[$targetIndex] -eq ')') { $depth -= 1 }
      if ($depth -lt 0) { if ($Inline) { return $targetIndex }; return -1 }
      if ($depth -gt 32) { return -1 }
    }
    if ($depth -ne 0) { return -1 }
    return $Target.Length
  }
  foreach ($reference in [regex]::Matches($Body, $definition)) {
    $referenceLabel = $reference.Groups['label'].Value
    if ([Text.Encoding]::UTF8.GetByteCount($referenceLabel) -gt 1000 -or $referenceLabel -notmatch '[^ \t\n]') { continue }
    if ((& $destinationLength $reference.Groups['destination'].Value) -lt 0) { continue }
    $definitions.Add($reference.Index, $reference.Index + $reference.Length)
  }
  $referenceEnd = 0
  $linkStart = 0
  $linkEnd = 0
  $fence = ""
  $inComment = $false
  $spanEnd = 0
  $offset = 0
  $htmlEnd = ""
  $htmlTextVisible = $false
  $paragraph = $false
  $paragraphStart = -1
  $headings = [System.Collections.Generic.List[int]]::new()
  $masked = @(foreach ($line in ($Body -split "`n")) {
    if (-not $paragraph) { $paragraphStart = -1 }
    if ($offset -lt $referenceEnd) {
      $line -replace '[^\r\n]', ' '
      $offset += $line.Length + 1
      continue
    }
    $insideHtml = $htmlEnd.Length -gt 0
    if ($fence.Length -gt 0) {
      $paragraph = $false
      $closing = [regex]::Match($line, '^ {0,3}(`{3,}|~{3,})[ \t]*$').Groups[1].Value
      if ($closing.Length -ge $fence.Length -and $closing[0] -eq $fence[0]) { $fence = "" }
      $line -replace '[^\r\n]', ' '
      $offset += $line.Length + 1
      continue
    }
    if ($htmlEnd.Length -gt 0) {
      $paragraph = $false
      if ($line -match $htmlEnd) { $htmlEnd = "" }
      if (-not $htmlTextVisible) {
        $line -replace '[^\r\n]', ' '
        $offset += $line.Length + 1
        continue
      }
    }
    if (-not $inComment -and -not $insideHtml) {
      $htmlTextVisible = $false
      if ($line -match '^ {0,3}<(?:pre|script|style|textarea)(?=[ \t>]|$)') {
        $htmlEnd = '</(?:pre|script|style|textarea)>'
      } elseif ($line -match '^ {0,3}<\?') {
        $htmlEnd = '\?>'
      } elseif ($line -match '^ {0,3}<![A-Za-z]') {
        $htmlEnd = '>'
      } elseif ($line -cmatch '^ {0,3}<!\[CDATA\[') {
        $htmlEnd = '\]\]>'
      } elseif ($line -match '^ {0,3}</?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|/>|$)') {
        $htmlEnd = '^[ \t]*\r?$'
        $htmlTextVisible = $true
      } elseif (-not $paragraph -and $line -match '^ {0,3}(?:<(?!pre(?:[ \t/>]|$)|script(?:[ \t/>]|$)|style(?:[ \t/>]|$)|textarea(?:[ \t/>]|$))[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9:._-]*(?:[ \t]*=[ \t]*(?:[^"''=<>`\x00-\x20]+|''[^'']*''|"[^"]*"))?)*[ \t]*/?>|</[A-Za-z][A-Za-z0-9-]*[ \t]*>)[ \t]*\r?$') {
        $htmlEnd = '^[ \t]*\r?$'
        $htmlTextVisible = $true
      }
      if ($htmlEnd.Length -gt 0) {
        $insideHtml = $true
        $paragraph = $false
        if ($line -match $htmlEnd) { $htmlEnd = "" }
        if (-not $htmlTextVisible) {
          $line -replace '[^\r\n]', ' '
          $offset += $line.Length + 1
          continue
        }
      }
    }
    if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and -not $paragraph -and $definitions.ContainsKey($offset)) {
      $referenceEnd = $definitions[$offset]
      $line -replace '[^\r\n]', ' '
      $offset += $line.Length + 1
      continue
    }
    $opening = [regex]::Match($line, '^ {0,3}(`{3,}|~{3,})(.*)$')
    if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $opening.Success -and -not ($opening.Groups[1].Value[0] -eq '`' -and $opening.Groups[2].Value.Contains('`'))) {
      $fence = $opening.Groups[1].Value
      $paragraph = $false
      $line -replace '[^\r\n]', ' '
      $offset += $line.Length + 1
      continue
    }
    $visible = $line
    $hasInlineLink = $offset -lt $linkEnd
    $position = 0
    while ($position -lt $line.Length) {
      if ($offset + $position -ge $linkStart -and $offset + $position -lt $linkEnd) {
        $next = [Math]::Min($line.Length, $linkEnd - $offset)
        $visible = $visible.Remove($position, $next - $position).Insert($position, (' ' * ($next - $position)))
        $position = $next
        continue
      }
      if ($offset + $position -lt $spanEnd) {
        $position = [Math]::Min($line.Length, $spanEnd - $offset)
        continue
      }
      if (-not $inComment) {
        if (-not $insideHtml -and $line[$position] -eq '[') {
          $escapes = 0
          for ($before = $position - 1; $before -ge 0 -and $line[$before] -eq '\'; $before -= 1) { $escapes += 1 }
          $tail = $Body.Substring($offset + $position)
          $inline = [regex]::Match($tail, $link)
          if ($escapes % 2 -eq 0 -and $inline.Success) {
            $target = $inline.Groups['destination']
            $length = & $destinationLength $target.Value $true
            if ($length -ge 0 -and $length -lt $target.Length) {
              $inline = [regex]::Match($tail.Substring(0, $target.Index + $length + 1), $link)
            }
            if ($length -ge 0 -and $inline.Success -and (& $destinationLength $inline.Groups['destination'].Value) -ge 0) {
              $visible = $visible.Remove($position, 1).Insert($position, ' ')
              $linkStart = $offset + $position + $inline.Groups['text'].Index + $inline.Groups['text'].Length
              $linkEnd = $offset + $position + $inline.Length
              $hasInlineLink = $true
            }
          }
        }
        if (-not $insideHtml -and $line[$position] -eq '`') {
          $tail = $Body.Substring($offset + $position)
          $span = [regex]::Match($tail, '^(`+)(?!`)(?:(?!\r?\n[ \t]*\r?\n)[\s\S])*?(?<!`)\1(?!`)')
          if ($span.Success) {
            $spanEnd = $offset + $position + $span.Length
            $position = [Math]::Min($line.Length, $spanEnd - $offset)
            continue
          }
          $position += [regex]::Match($tail, '^`+').Length
          continue
        }
        if (-not $line.Substring($position).StartsWith('<!--', [System.StringComparison]::Ordinal)) {
          $position += 1
          continue
        }
        $inComment = $true
      }
      $end = $line.IndexOf('-->', $position, [System.StringComparison]::Ordinal)
      $next = if ($end -lt 0) { $line.Length } else { $end + 3 }
      $visible = $visible.Remove($position, $next - $position).Insert($position, (' ' * ($next - $position)))
      $position = $next
      $inComment = $end -lt 0
    }
    $opening = [regex]::Match($visible, '^ {0,3}(`{3,}|~{3,})(.*)$')
    if (-not $insideHtml -and $opening.Success -and -not ($opening.Groups[1].Value[0] -eq '`' -and $opening.Groups[2].Value.Contains('`'))) {
      $fence = $opening.Groups[1].Value
      $paragraph = $false
      $line -replace '[^\r\n]', ' '
      $offset += $line.Length + 1
      continue
    }
    if ($insideHtml -and $visible -match '^ {0,3}#{1,6}(?:[ \t]|$)') { $visible = $line -replace '[^\r\n]', ' ' }
    if ($SetextHeadings -and $paragraphStart -ge 0 -and -not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $line -match '^ {0,3}(?:=+|-+)[ \t]*\r?$') {
      $headings.Add($paragraphStart)
    }
    $wasParagraph = $paragraph
    $paragraph = -not $insideHtml -and ($hasInlineLink -or -not [string]::IsNullOrWhiteSpace($visible)) -and $visible -notmatch '^ {0,3}(?:#{1,6}(?:[ \t]|$)|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,}|=+[ \t]*)\r?$)'
    if (-not $wasParagraph -and $paragraph -and $line -match '^ {0,3}[^ \t\r\n]' -and $line -notmatch '^ {0,3}(?:>|[-+*](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$))') {
      $paragraphStart = $offset
    }
    $visible
    $offset += $line.Length + 1
  })
  $text = $masked -join "`n"
  foreach ($start in $headings) {
    $end = $text.IndexOf("`n", $start)
    if ($end -lt 0) { $end = $text.Length }
    $length = $end - $start
    $text = $text.Remove($start, $length).Insert($start, ('#' + (' ' * ($length - 1))))
  }
  return $text
}

function StripAutoImport([string]$Body) {
  $normalized = NormalizeBody $Body
  if ([string]::IsNullOrWhiteSpace($normalized)) { return "" }
  $boundary = [regex]::Match((MaskBodyExamples $normalized), '(?m)^ {0,3}## Auto-import(?:[ \t]+#+)?[ \t]*$')
  if ($boundary.Success) { return $normalized.Substring(0, $boundary.Index).TrimEnd() }
  return $normalized
}

function RemovalAnswer([string]$Body) {
  $raw = StripAutoImport $Body
  $text = MaskBodyExamples $raw -SetextHeadings
  $match = [regex]::Match($text, '(?ms)^ {0,3}## What (?:this|a) change made unnecessary(?:[ \t]+#+)?[ \t]*\n(?<answer>.*?)(?=^ {0,3}#{1,2}(?:[ \t]|$)|\z)')
  if (-not $match.Success) { return "" }
  $answer = $match.Groups['answer']
  $meaningful = [regex]::Replace($answer.Value, '(?m)^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[ xX-]?\][ \t]*)?', '')
  $meaningful = [regex]::Replace($meaningful, '(?m)^[ \t]*>+[ \t]*', '')
  $meaningful = [regex]::Replace($meaningful, '</?[A-Za-z][A-Za-z0-9:-]*(?:[ \t\n]+[A-Za-z_:][A-Za-z0-9:._-]*(?:[ \t\n]*=[ \t\n]*(?:[^"''=<>`\x00-\x20]+|''[^'']*''|"[^"]*"))?)*[ \t\n]*/?>', '')
  $meaningful = [regex]::Replace($meaningful, '&(?:#(?:[xX][0-9A-Fa-f]+|\d+)|[A-Za-z][A-Za-z0-9]*);', ' ')
  $meaningful = [regex]::Replace($meaningful, '[`*_]', '').Trim()
  if ($meaningful -notmatch '[\p{L}\p{N}]' -or $meaningful -match '^(?:TBD|TODO|FIXME|HACK)(?:[^\p{L}\p{N}]|$)' -or $meaningful -match '^(?:TBD|TODO|FIXME|HACK|None|N/?A|Not applicable|\[.*\])\.?$') { return "" }
  return $raw.Substring($answer.Index, $answer.Length).Trim()
}
