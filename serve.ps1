param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

Write-Host "Serving $root" -ForegroundColor Cyan
Write-Host "Open: $prefix" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

$listener.Start()

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg' = 'image/svg+xml; charset=utf-8'
  '.ico' = 'image/x-icon'
  '.txt' = 'text/plain; charset=utf-8'
}

function Get-SafePath([string]$urlPath) {
  $p = $urlPath -replace '\\','/'
  if ([string]::IsNullOrWhiteSpace($p) -or $p -eq '/') { $p = '/index.html' }
  if ($p.EndsWith('/')) { $p = $p + 'index.html' }

  $p = [System.Uri]::UnescapeDataString($p)
  $p = $p.TrimStart('/')

  # Prevent traversal
  if ($p -match '(^|/|\\)\.\.(/|\\|$)') { return $null }

  $full = Join-Path $root $p
  $resolvedRoot = (Resolve-Path $root).Path
  try { $resolvedFull = (Resolve-Path $full).Path } catch { return $full }
  if (-not $resolvedFull.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
  return $full
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $req = $ctx.Request
      $res = $ctx.Response

      $path = Get-SafePath $req.Url.AbsolutePath
      if (-not $path) {
        $res.StatusCode = 400
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Bad request')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
      }

      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
      }

      $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
      $res.ContentType = $mime[$ext]
      if (-not $res.ContentType) { $res.ContentType = 'application/octet-stream' }

      $res.AddHeader('Cache-Control', 'no-store')

      $bytes = [System.IO.File]::ReadAllBytes($path)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
    } catch {
      try {
        $ctx.Response.StatusCode = 500
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Server error')
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $ctx.Response.Close()
      } catch {}
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}