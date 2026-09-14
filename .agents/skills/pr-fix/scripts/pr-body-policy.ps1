function NormalizeBody([string]$Body) {
  if ($null -eq $Body) { return "" }
  $text = $Body -replace "^\uFEFF", ""
  $text = $text -replace "`r`n", "`n"
  return $text.TrimEnd()
}

function MaskBodyExamples([string]$Body, [switch]$SetextHeadings) {
  $definitions = [System.Collections.Generic.Dictionary[int, int]]::new()
  $definitionLabels = [System.Collections.Generic.Dictionary[int, string]]::new()
  $referenceLabels = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
  $normalizeLabel = { param([string]$Label); return ($Label -replace '[ \t\n]+', ' ').Trim().ToLowerInvariant().ToUpperInvariant() }
  $interrupt = ' {0,3}(?:#{1,6}(?:[ \t]|$)|>|~{3,}|`{3,}[^`\n]*$|(?:=+|-+)[ \t]*$|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$|(?:[-+*]|0{0,8}1[.)])[ \t]+\S|(?i:<(?:!--|\?|![A-Za-z]|!\[CDATA\[|(?:pre|script|style|textarea)(?=[ \t>]|$)|/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|/>|$))))'
  $continuation = '\n(?![ \t]*(?:\n|\z))(?!' + $interrupt + ')'
  $paragraphInterrupt = [regex]::new('^' + $interrupt)
  # SIMPLIFIED: closed code spans retain literal comment openers.
  # Lift when: block parsing and code-span preservation share paragraph boundaries.
  $codeSpan = [regex]::new('^(`+)(?!`)(?:(?!\n[ \t]*\n)(?!\n' + $interrupt.Replace('!--|', '').Replace('$', '(?=\n|$)') + ')[\s\S])*?(?<!`)\1(?!`)')
  $label = '\[(?<label>(?:\\.|[^\[\]\\\n]|' + $continuation + ')+)\]'
  $destination = '(?<destination><(?:\\.|[^<>\\\n])*>|(?:\\.|[^\x00-\x20\x7f<>\\])+)'
  $title = '(?:"(?:[^"\\\n]|\\.|' + $continuation + ')*"|''(?:[^''\\\n]|\\.|' + $continuation + ')*''|\((?:[^()\\\n]|\\.|' + $continuation + ')*\))'
  $spacing = '(?:[ \t]+(?:' + $continuation + '[ \t]*)?|[ \t]*' + $continuation + '[ \t]*)'
  $definition = '(?m)^(?: {0,3}(?:>[ \t]?|(?:[-*+]|\d{1,9}[.)])[ \t]+))*[ \t]*' + $label + ':[ \t]*(?:' + $continuation + '[ \t]*)?' + $destination + '(?:' + $spacing + $title + ')?[ \t]*$'
  $link = '(?m)\G\[(?<text>(?:\\.|[^\[\]\\\n]|' + $continuation + ')*)\]\([ \t]*(?:' + $continuation + '[ \t]*)?(?:' + $destination + ')?(?:' + $spacing + $title + ')?[ \t]*(?:' + $continuation + '[ \t]*)?\)'
  $linkPattern = [regex]::new($link)
  $referenceImage = [regex]::new('\G\[(?<text>(?:\\.|[^\[\]\\\n]|' + $continuation + ')*)\](?:\[(?<reference>(?:\\.|[^\[\]\\\n]|' + $continuation + ')*)\])?')
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
    $definitionLabels.Add($reference.Index, (& $normalizeLabel $referenceLabel))
  }
  for ($pass = 0; $pass -lt 2; $pass += 1) {
    $referenceEnd = 0
    $linkStart = 0
    $linkEnd = 0
    $fence = ""
    $fenceContentColumn = 0
    $fenceContainer = ""
    $inComment = $false
    $spanEnd = 0
    $offset = 0
    $htmlEnd = ""
    $htmlTextVisible = $false
    $htmlContentColumn = 0
    $htmlContainer = ""
    $listContentColumns = [System.Collections.Generic.Stack[int]]::new()
    $listContainer = ""
    $footnoteColumn = $null
    $footnoteParagraph = $false
    $footnoteContainer = ""
    $columnAfter = {
      param([string]$Prefix)
      $column = 0
      foreach ($character in $Prefix.ToCharArray()) {
        $column += if ($character -eq "`t") { 4 - ($column % 4) } else { 1 }
      }
      return $column
    }
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
      $previousContainer = $listContainer
      $content = $line -replace '^ {0,3}(?:> ?)+', ''
      $container = [regex]::Match($line, '^ {0,3}(?:> ?)*').Value -replace '[^>]', ''
      $indentation = & $columnAfter ([regex]::Match($content, '^[ \t]*').Value)
      $blank = [string]::IsNullOrWhiteSpace($line)
      if ($null -ne $footnoteColumn -and $container -ceq $footnoteContainer -and ($blank -or $indentation -ge $footnoteColumn -or ($footnoteParagraph -and -not $paragraphInterrupt.IsMatch($content)))) {
        $footnoteParagraph = -not $blank -and $indentation -lt $footnoteColumn + 4 -and -not $paragraphInterrupt.IsMatch($content.TrimStart())
        $paragraph = $false
        $line -replace '[^\r\n]', ' '
        $offset += $line.Length + 1
        continue
      }
      $footnoteColumn = $null
      if ($container -cne $listContainer) { $listContentColumns.Clear(); $listContainer = $container }
      while (-not $blank -and $listContentColumns.Count -gt 0 -and $indentation -lt $listContentColumns.Peek()) { [void]$listContentColumns.Pop() }
      if ($fence.Length -gt 0 -and ($container -cne $fenceContainer -or (-not $blank -and $indentation -lt $fenceContentColumn))) { $fence = "" }
      if ($htmlEnd.Length -gt 0 -and ($container -cne $htmlContainer -or (-not $blank -and $indentation -lt $htmlContentColumn))) { $htmlEnd = "" }
      $insideHtml = $htmlEnd.Length -gt 0
      if ($fence.Length -gt 0) {
        $paragraph = $false
        $closing = [regex]::Match(($content -replace '^[ \t]*', ''), '^(`{3,}|~{3,})[ \t]*\r?$').Groups[1].Value
        if ($indentation -le $fenceContentColumn + 3 -and $closing.Length -ge $fence.Length -and $closing[0] -eq $fence[0]) { $fence = "" }
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
      $contentColumn = if ($listContentColumns.Count -gt 0) { $listContentColumns.Peek() } else { 0 }
      $htmlAllowed = $indentation -ge $contentColumn -and $indentation -le $contentColumn + 3
      $htmlLine = $content
      $marker = [regex]::Match($content, '^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)')
      if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $htmlAllowed -and $marker.Success -and (-not $paragraph -or $contentColumn -gt 0 -or ($marker.Groups[2].Value -match '^(?:[-*+]|0{0,8}1[.)])$' -and $content.Substring($marker.Length) -match '^\S'))) {
        $markerEnd = & $columnAfter ($marker.Groups[1].Value + $marker.Groups[2].Value)
        $gap = (& $columnAfter $marker.Value) - $markerEnd
        $padding = if ($gap -gt 4) { 1 } else { $gap }
        $listContentColumns.Push($markerEnd + $padding)
        $htmlLine = $content.Substring($marker.Length)
        $htmlAllowed = $gap -le 4
        $paragraph = $false
        $paragraphStart = -1
      }
      $htmlLine = $htmlLine -replace '^[ \t]*', ''
      $opening = [regex]::Match($htmlLine, '^(`{3,}|~{3,})(.*)$')
      if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $htmlAllowed -and $opening.Success -and -not ($opening.Groups[1].Value[0] -eq '`' -and $opening.Groups[2].Value.Contains('`'))) {
        $fence = $opening.Groups[1].Value
        $fenceContentColumn = if ($listContentColumns.Count -gt 0) { $listContentColumns.Peek() } else { 0 }
        $fenceContainer = $container
        $paragraph = $false
        $line -replace '[^\r\n]', ' '
        $offset += $line.Length + 1
        continue
      }
      if (-not $inComment -and -not $insideHtml -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $htmlAllowed) {
        $htmlTextVisible = $false
        if ($htmlLine -match '^<(?:pre|script|style|textarea)(?=[ \t>]|$)') {
          $htmlEnd = '</(?:pre|script|style|textarea)>'
        } elseif ($htmlLine -match '^<\?') {
          $htmlEnd = '\?>'
        } elseif ($htmlLine -match '^<![A-Za-z]') {
          $htmlEnd = '>'
        } elseif ($htmlLine -cmatch '^<!\[CDATA\[') {
          $htmlEnd = '\]\]>'
        } elseif ($htmlLine -match '^</?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|/>|$)') {
          $htmlEnd = '^[ \t]*\r?$'
          $htmlTextVisible = $true
        } elseif (-not $paragraph -and $htmlLine -match '^(?:<(?!pre(?:[ \t/>]|$)|script(?:[ \t/>]|$)|style(?:[ \t/>]|$)|textarea(?:[ \t/>]|$))[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9:._-]*(?:[ \t]*=[ \t]*(?:[^"''=<>`\x00-\x20]+|''[^'']*''|"[^"]*"))?)*[ \t]*/?>|</[A-Za-z][A-Za-z0-9-]*[ \t]*>)[ \t]*\r?$') {
          $htmlEnd = '^[ \t]*\r?$'
          $htmlTextVisible = $true
        }
        if ($htmlEnd.Length -gt 0) {
          $htmlContentColumn = if ($listContentColumns.Count -gt 0) { $listContentColumns.Peek() } else { 0 }
          $htmlContainer = $container
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
      $footnote = [regex]::Match($htmlLine, '^\[\^[^\]\r\n]+\]:[ \t]*(.*)')
      if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $htmlAllowed -and $footnote.Success) {
        $footnoteColumn = 4 + $(if ($listContentColumns.Count -gt 0) { $listContentColumns.Peek() } else { 0 })
        $footnoteParagraph = $footnote.Groups[1].Value.Trim().Length -gt 0 -and -not $paragraphInterrupt.IsMatch($footnote.Groups[1].Value)
        $footnoteContainer = $container
        $paragraph = $false
        $line -replace '[^\r\n]', ' '
        $offset += $line.Length + 1
        continue
      }
      if (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $htmlAllowed -and (-not $paragraph -or ($container.Length -gt 0 -and $container -cne $previousContainer)) -and $definitions.ContainsKey($offset)) {
        $referenceEnd = $definitions[$offset]
        [void]$referenceLabels.Add($definitionLabels[$offset])
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
            $start = $offset + $position
            $inline = $linkPattern.Match($Body, $start)
            $imageEscapes = 0
            for ($before = $position - 2; $before -ge 0 -and $line[$before] -eq '\'; $before -= 1) { $imageEscapes += 1 }
            $image = $position -gt 0 -and $line[$position - 1] -eq '!' -and $imageEscapes % 2 -eq 0
            if ($escapes % 2 -eq 0 -and $inline.Success) {
              $target = $inline.Groups['destination']
              $length = & $destinationLength $target.Value $true
              if ($length -ge 0 -and $length -lt $target.Length) {
                $complete = $inline.Value.Substring(0, $target.Index - $inline.Index + $length + 1)
                $inline = $linkPattern.Match($complete)
              }
              if ($length -ge 0 -and $inline.Success -and (& $destinationLength $inline.Groups['destination'].Value) -ge 0) {
                $visible = $visible.Remove($position, 1).Insert($position, ' ')
                $linkStart = if ($image) { $start } else { $start + 1 + $inline.Groups['text'].Length }
                $linkEnd = $start + $inline.Length
                $hasInlineLink = $true
                if ($image) { continue }
              }
            }
            if ($image -and $escapes % 2 -eq 0) {
              $reference = $referenceImage.Match($Body, $start)
              $text = $reference.Groups['reference'].Value
              if ($text.Length -eq 0) { $text = $reference.Groups['text'].Value }
              if ($reference.Success -and [Text.Encoding]::UTF8.GetByteCount($text) -le 1000 -and $referenceLabels.Contains((& $normalizeLabel $text))) {
                $linkStart = $start
                $linkEnd = $start + $reference.Length
                $hasInlineLink = $true
                continue
              }
            }
          }
          if (-not $insideHtml -and $line[$position] -eq '`') {
            $tail = $Body.Substring($offset + $position)
            $span = $codeSpan.Match($tail)
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
        $fenceContentColumn = if ($listContentColumns.Count -gt 0) { $listContentColumns.Peek() } else { 0 }
        $fenceContainer = $container
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
      $equalsUnderline = $wasParagraph -and $line -match '^ {0,3}=+[ \t]*\r?$'
      $paragraph = -not $insideHtml -and -not $equalsUnderline -and ($hasInlineLink -or -not [string]::IsNullOrWhiteSpace($visible)) -and $visible -notmatch '^ {0,3}(?:#{1,6}(?:[ \t]|$)|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})\r?$)'
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
  return [regex]::Replace($raw.Substring($answer.Index, $answer.Length).TrimEnd(), '\A(?:[ \t]*\n)*', '')
}
