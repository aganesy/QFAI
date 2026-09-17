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
  $imageSuffix = [regex]::new('\G\]\([ \t]*(?:' + $continuation + '[ \t]*)?(?:' + $destination + ')?(?:' + $spacing + $title + ')?[ \t]*(?:' + $continuation + '[ \t]*)?\)')
  $imageReference = [regex]::new('\G\[(?<reference>(?:\\.|[^\[\]\\\n]|' + $continuation + ')*)\]')
  $imageLabelEnds = [System.Collections.Generic.Dictionary[int, int]]::new()
  $labelStack = [System.Collections.Generic.Stack[int]]::new()
  $labelContinuation = [regex]::new('\G' + $continuation)
  $labelCodeSpan = [regex]::new('\G' + $codeSpan.ToString().Substring(1))
  $tableBoundaries = [System.Collections.Generic.List[int]]::new()
  $tableDelimiter = [regex]::new('^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$')
  $tableOffset = 0
  $previousLine = ''
  foreach ($tableLine in ($Body -split "`n")) {
    if ($tableDelimiter.IsMatch($tableLine) -and $previousLine -match '^ {0,3}\S') {
      $header = $previousLine.Trim()
      $headerCells = $header -replace '^\||(?<!\\)(?:\\\\)*\|$', ''
      $separator = $tableLine.Trim() -replace '^\||\|$', ''
      if ($header -match '(?<!\\)(?:\\\\)*\|' -and [regex]::Matches($headerCells, '(?<!\\)(?:\\\\)*\|').Count -eq [regex]::Matches($separator, '\|').Count) { $tableBoundaries.Add($tableOffset) }
    }
    $previousLine = $tableLine
    $tableOffset += $tableLine.Length + 1
  }
  $crossesTable = {
    param([int]$Start, [int]$End)
    $low = 0
    $high = $tableBoundaries.Count
    while ($low -lt $high) {
      $middle = $low + [int][Math]::Floor(($high - $low) / 2)
      if ($tableBoundaries[$middle] -le $Start) { $low = $middle + 1 } else { $high = $middle }
    }
    return $low -lt $tableBoundaries.Count -and $tableBoundaries[$low] -lt $End
  }
  $htmlSpace = '(?:[ \t]|' + $continuation + ')'
  $htmlValue = '(?:[^"''=<>`\x00-\x20]+|''(?:[^''\n]|' + $continuation + ')*''|"(?:[^"\n]|' + $continuation + ')*")'
  $htmlTag = '(?:<[A-Za-z][A-Za-z0-9-]*(?:' + $htmlSpace + '+[A-Za-z_:][A-Za-z0-9:._-]*(?:' + $htmlSpace + '*=' + $htmlSpace + '*' + $htmlValue + ')?)*' + $htmlSpace + '*/?>|</[A-Za-z][A-Za-z0-9-]*' + $htmlSpace + '*>)'
  $labelHtml = [regex]::new('\G(?:' + $htmlTag + '|<!--(?!>|->)(?:(?!--)[^\n]|' + $continuation + ')*(?<!-)-->|<\?(?:[^\n]|' + $continuation + ')*?\?>|<![A-Z]+(?:[ \t]|' + $continuation + ')+(?:[^>\n]|' + $continuation + ')*>|<!\[CDATA\[(?:[^\n]|' + $continuation + ')*?\]\]>|<(?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\x00-\x20<>]*|[A-Za-z0-9.!#$%&''*+/=?^_\x60{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)>)')
  $isEscaped = {
    param([int]$Start)
    $slashes = 0
    for ($before = $Start - 1; $before -ge 0 -and $Body[$before] -eq '\'; $before -= 1) { $slashes += 1 }
    return $slashes % 2 -ne 0
  }
  $labelHtmlPrefix = [regex]::new('\G<(?:(\?)|(!\[CDATA\[)|(![A-Z]+(?=[ \t\n])))')
  $failedLabelHtmlEnds = @(0, 0, 0)
  $labelParagraphEnd = {
    param([int]$Start)
    $newline = $Body.IndexOf("`n", $Start)
    while ($newline -ge 0) {
      if (-not $labelContinuation.Match($Body, $newline).Success -or (& $crossesTable $newline ($newline + 2))) { return $newline }
      $newline = $Body.IndexOf("`n", $newline + 1)
    }
    return $Body.Length
  }
  for ($labelIndex = 0; $labelIndex -lt $Body.Length; $labelIndex += 1) {
    $character = $Body[$labelIndex]
    if ($character -eq '\' -and $labelIndex + 1 -lt $Body.Length -and $Body[$labelIndex + 1] -match '[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]') { $labelIndex += 1; continue }
    if ($character -eq "`n" -and (-not $labelContinuation.Match($Body, $labelIndex).Success -or (& $crossesTable $labelIndex ($labelIndex + 2)))) { $labelStack.Clear() }
    if ($character -eq '`') {
      $span = $labelCodeSpan.Match($Body, $labelIndex)
      if ($span.Success -and -not (& $crossesTable $labelIndex ($labelIndex + $span.Length))) { $labelIndex += $span.Length - 1; continue }
    }
    if ($character -eq '<') {
      $prefix = $labelHtmlPrefix.Match($Body, $labelIndex)
      $family = -1
      if ($prefix.Success) {
        if ($prefix.Groups[1].Success) { $family = 0 }
        elseif ($prefix.Groups[2].Success) { $family = 1 }
        else { $family = 2 }
      }
      if ($family -lt 0 -or $labelIndex -ge $failedLabelHtmlEnds[$family]) {
        $html = $labelHtml.Match($Body, $labelIndex)
        if ($html.Success -and -not (& $crossesTable $labelIndex ($labelIndex + $html.Length))) { $labelIndex += $html.Length - 1; continue }
        if ($family -ge 0) { $failedLabelHtmlEnds[$family] = & $labelParagraphEnd $labelIndex }
      }
    }
    if ($character -eq '[') { $labelStack.Push($labelIndex) }
    if ($character -eq ']' -and $labelStack.Count -gt 0) { $imageLabelEnds.Add($labelStack.Pop(), $labelIndex) }
  }
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
    # The destination of a link whose label holds another one. Kept apart
    # from the pair above because the scan walks into that label and the
    # inner link overwrites them, which would drop the outer destination.
    $labelLinkStart = 0
    $labelLinkEnd = 0
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
      # A container opened inside a list item is stripped here, not by the
      # line-leading pass above: that pass reads quote markers standing before
      # the list marker, so a fence behind one was never seen as an opener.
      # List markers and quote markers alternate freely, so both are consumed
      # in one loop until neither matches.
      while (-not $insideHtml -and -not $inComment -and $offset -ge $spanEnd -and $offset -ge $linkEnd -and $htmlAllowed -and $listContentColumns.Count -gt 0) {
        $quoted = [regex]::Match($htmlLine, '^ {0,3}(?:> ?)+')
        if ($quoted.Success) {
          $container += ($quoted.Value -replace '[^>]', '')
          # Zero, not an addition: the line-leading pass strips each later
          # line's own quote prefix, so its content is measured from after the
          # marker, and a column counting the marker would read that content as
          # dedented out of the block it is inside.
          $listContentColumns.Push(0)
          $htmlLine = $htmlLine.Substring($quoted.Length)
          $paragraph = $false
          $paragraphStart = -1
          continue
        }
        $nested = [regex]::Match($htmlLine, '^ {0,3}([-*+]|\d{1,9}[.)])([ \t]{1,4})(?![ \t])')
        if (-not $nested.Success) { break }
        $nestedColumn = & $columnAfter $nested.Value
        $listContentColumns.Push($listContentColumns.Peek() + $nestedColumn)
        $htmlLine = $htmlLine.Substring($nested.Length)
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
      $hasInlineLink = $offset -lt [Math]::Max($linkEnd, $labelLinkEnd)
      $position = 0
      while ($position -lt $line.Length) {
        $inLink = $offset + $position -ge $linkStart -and $offset + $position -lt $linkEnd
        $inLabelLink = $offset + $position -ge $labelLinkStart -and $offset + $position -lt $labelLinkEnd
        if ($inLink -or $inLabelLink) {
          $reach = 0
          if ($inLink) { $reach = $linkEnd }
          if ($inLabelLink -and $labelLinkEnd -gt $reach) { $reach = $labelLinkEnd }
          $next = [Math]::Min($line.Length, $reach - $offset)
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
            $flatLink = $false
            if ($image -and $escapes % 2 -eq 0 -and $imageLabelEnds.ContainsKey($start)) {
              $close = $imageLabelEnds[$start]
              $suffix = $imageSuffix.Match($Body, $close)
              if ($suffix.Success -and -not (& $crossesTable $start ($close + $suffix.Length))) {
                $target = $suffix.Groups['destination']
                $length = & $destinationLength $target.Value $true
                if ($length -ge 0 -and $length -lt $target.Length) {
                  $complete = $suffix.Value.Substring(0, $target.Index - $suffix.Index + $length + 1)
                  $suffix = $imageSuffix.Match($complete)
                }
                if ($length -ge 0 -and $suffix.Success -and (& $destinationLength $suffix.Groups['destination'].Value) -ge 0) {
                  $linkStart = $start
                  $linkEnd = $close + $suffix.Length
                  $hasInlineLink = $true
                  continue
                }
              }
              $reference = $imageReference.Match($Body, $close + 1)
              $text = $reference.Groups['reference'].Value
              if ($text.Length -eq 0) { $text = $Body.Substring($start + 1, $close - $start - 1) }
              if (-not (& $crossesTable $start ($close + 1 + $(if ($reference.Success) { $reference.Length } else { 0 }))) -and [Text.Encoding]::UTF8.GetByteCount($text) -le 1000 -and $referenceLabels.Contains((& $normalizeLabel $text))) {
                $linkStart = $start
                $linkEnd = $close + 1 + $(if ($reference.Success) { $reference.Length } else { 0 })
                $hasInlineLink = $true
                continue
              }
            }
            # A link whose label holds an image is one the flat pattern cannot
            # read: its brackets nest. Read the label off the balanced map the
            # scan already builds, so the destination is masked rather than
            # left standing as the only text an image-only answer shows.
            if (-not $image -and $escapes % 2 -eq 0 -and $imageLabelEnds.ContainsKey($start)) {
              $close = $imageLabelEnds[$start]
              $suffix = $imageSuffix.Match($Body, $close)
              if ($suffix.Success -and -not (& $crossesTable $start ($close + $suffix.Length))) {
                $target = $suffix.Groups['destination']
                $length = & $destinationLength $target.Value $true
                if ($length -ge 0 -and $length -lt $target.Length) {
                  $complete = $suffix.Value.Substring(0, $target.Index - $suffix.Index + $length + 1)
                  $suffix = $imageSuffix.Match($complete)
                }
                if ($length -ge 0 -and $suffix.Success -and (& $destinationLength $suffix.Groups['destination'].Value) -ge 0) {
                  $visible = $visible.Remove($position, 1).Insert($position, ' ')
                  # The label itself stays scanned: an image inside it is
                  # masked by its own branch, and prose inside it is visible.
                  $labelLinkStart = $close
                  $labelLinkEnd = $close + $suffix.Length
                  $hasInlineLink = $true
                  $flatLink = $true
                }
              }
              # And the reference forms of the same link: full `][label]`,
              # collapsed `][]`, and shortcut, where the label alone carries the
              # reference. Read only for the inline form, a linked image written
              # any of those three ways left its label letters standing as the
              # only text the answer showed.
              if (-not $flatLink) {
                $reference = $imageReference.Match($Body, $close + 1)
                $text = $reference.Groups['reference'].Value
                if ($text.Length -eq 0) { $text = $Body.Substring($start + 1, $close - $start - 1) }
                $referenceLength = if ($reference.Success) { $reference.Length } else { 0 }
                if (-not (& $crossesTable $start ($close + 1 + $referenceLength)) -and [Text.Encoding]::UTF8.GetByteCount($text) -le 1000 -and $referenceLabels.Contains((& $normalizeLabel $text))) {
                  $visible = $visible.Remove($position, 1).Insert($position, ' ')
                  $labelLinkStart = $close
                  $labelLinkEnd = $close + 1 + $referenceLength
                  $hasInlineLink = $true
                  $flatLink = $true
                }
              }
            }
            if (-not $flatLink -and $escapes % 2 -eq 0 -and $inline.Success -and -not (& $crossesTable $start ($start + $inline.Length))) {
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
                $flatLink = $true
                if ($image) { continue }
              }
            }
            if ($image -and $escapes % 2 -eq 0) {
              $reference = $referenceImage.Match($Body, $start)
              $text = $reference.Groups['reference'].Value
              if ($text.Length -eq 0) { $text = $reference.Groups['text'].Value }
              if ($reference.Success -and -not (& $crossesTable $start ($start + $reference.Length)) -and [Text.Encoding]::UTF8.GetByteCount($text) -le 1000 -and $referenceLabels.Contains((& $normalizeLabel $text))) {
                $linkStart = $start
                $linkEnd = $start + $reference.Length
                $hasInlineLink = $true
                continue
              }
            }
          }
          if (-not $insideHtml -and $line[$position] -eq '`') {
            if (& $isEscaped ($offset + $position)) { $position += 1; continue }
            $tail = $Body.Substring($offset + $position)
            $span = $codeSpan.Match($tail)
            if ($span.Success -and -not (& $crossesTable ($offset + $position) ($offset + $position + $span.Length))) {
              $spanEnd = $offset + $position + $span.Length
              $position = [Math]::Min($line.Length, $spanEnd - $offset)
              continue
            }
            $position += [regex]::Match($tail, '^`+').Length
            continue
          }
          if (-not $line.Substring($position).StartsWith('<!--', [System.StringComparison]::Ordinal) -or (& $isEscaped ($offset + $position))) {
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
  # A quote and a list marker interleave, and one pass per kind left the
  # nested one in place: `> - TODO` kept its list marker and `- - TODO` its
  # second, so the anchored placeholder test matched neither.
  $meaningful = [regex]::Replace($answer.Value, '(?m)^(?:[ \t]*(?:>+|(?:[-*+]|\d+[.)])(?:[ \t]*\[[ xX-]?\])?)[ \t]*)+', '')
  $meaningful = [regex]::Replace($meaningful, '</?[A-Za-z][A-Za-z0-9:-]*(?:[ \t\n]+[A-Za-z_:][A-Za-z0-9:._-]*(?:[ \t\n]*=[ \t\n]*(?:[^"''=<>`\x00-\x20]+|''[^'']*''|"[^"]*"))?)*[ \t\n]*/?>', '')
  $entities = [regex]::new('(?<literal>\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|(?<ticks>`+)(?!`)[\s\S]*?(?<!`)\k<ticks>(?!`))|&(?<entity>#[xX][0-9A-Fa-f]{1,6}|#\d{1,7}|[A-Za-z][A-Za-z0-9]*);')
  # SIMPLIFIED: other named references remain separators, not a full HTML5 decode.
  # Lift when: the body readers can share a complete installed entity decoder.
  $namedEntities = [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
  foreach ($entry in (@{ sol='/'; period='.'; lbrack='['; rbrack=']'; lsqb='['; rsqb=']'; nbsp=[string][char]0xa0; Tab="`t"; NewLine="`n" }).GetEnumerator()) { $namedEntities.Add($entry.Key, [string]$entry.Value) }
  $meaningful = $entities.Replace($meaningful, [System.Text.RegularExpressions.MatchEvaluator]{
    param($entityMatch)
    if ($entityMatch.Groups['literal'].Success) { return $entityMatch.Value }
    $entity = $entityMatch.Groups['entity'].Value
    if ($entity.StartsWith('#', [System.StringComparison]::Ordinal)) {
      $value = if ($entity.Length -gt 1 -and $entity[1] -in @('x', 'X')) { [Convert]::ToInt32($entity.Substring(2), 16) } else { [int]$entity.Substring(1) }
      if ($value -eq 0 -or $value -gt 0x10ffff -or ($value -ge 0xd800 -and $value -le 0xdfff)) { return [string][char]0xfffd }
      return [char]::ConvertFromUtf32($value)
    }
    if ($namedEntities.ContainsKey($entity)) { return [string]$namedEntities[$entity] }
    return ' '
  })
  # Emphasis, strikethrough and a leading heading marker render as formatting,
  # not as text, so a placeholder wearing one still reads as the placeholder.
  # A backslash escape renders as the punctuation alone, so `N\/A` reads as the
  # placeholder it is.
  $meaningful = [regex]::Replace($meaningful, '\\([\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e])', '$1')
  $meaningful = [regex]::Replace($meaningful, '[`*_]|~~', '').Trim()
  $meaningful = [regex]::Replace($meaningful, '^(?:#{1,6}[ 	]+|>[ 	]*)+', '').Trim()
  if ($meaningful -notmatch '[\p{L}\p{N}]' -or $meaningful -match '^(?:TBD|TODO|FIXME|HACK)(?:[^\p{L}\p{N}]|$)' -or $meaningful -match '^(?:TBD|TODO|FIXME|HACK|None|N/?A|Not applicable|\[.*\])\.?$') { return "" }
  return [regex]::Replace($raw.Substring($answer.Index, $answer.Length).TrimEnd(), '\A(?:[ \t]*\n)*', '')
}
