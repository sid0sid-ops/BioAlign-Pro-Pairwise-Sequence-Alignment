Get-ChildItem -Path "." -Recurse -Filter "*.js" |
  Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\\dist\\" } |
  ForEach-Object {
    $path = $_.FullName
    $content = Get-Content -Raw -Path $path
    $updated = $content -replace '\?v=2[3456]', '?v=27'
    if ($content -ne $updated) {
      Write-Host "Updated: $path"
      Set-Content -Path $path -Value $updated
    }
  }
Write-Host "Done."
