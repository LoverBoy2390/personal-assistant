param(
    [string]$RootPath = (Join-Path $PSScriptRoot "..\.."),
    [ValidateRange(1024, 65535)]
    [int]$Port = 8765,
    [switch]$NoBrowser,
    [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppPath = "/src/aegis-champion/"
$AppUrl = "http://127.0.0.1:$Port$AppPath"
$PageCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'"
$ServiceWorkerCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'"
$ServiceWorkerRelativePath = "src/aegis-champion/sw.js"

function Get-PathComparison {
    if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
        return [System.StringComparison]::OrdinalIgnoreCase
    }
    return [System.StringComparison]::Ordinal
}

function Resolve-AegisRoot {
    param([string]$Path)

    $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
    $root = [System.IO.Path]::GetFullPath($resolved.Path)
    $required = @(
        "src/aegis-champion/index.html",
        "src/aegis-champion/champion.mjs",
        "src/aegis-champion/sw.js",
        "src/aegis-synthetic-coach/fixtures.mjs",
        "src/aegis-synthetic-coach/vault-ui.mjs"
    )

    foreach ($relative in $required) {
        $candidate = Join-Path $root ($relative -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            throw "Required AEGIS file is missing: $relative"
        }
    }

    return $root
}

function Get-ContentType {
    param([string]$Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "text/javascript; charset=utf-8" }
        ".mjs" { return "text/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".webmanifest" { return "application/manifest+json; charset=utf-8" }
        ".svg" { return "image/svg+xml" }
        ".png" { return "image/png" }
        ".ico" { return "image/x-icon" }
        ".txt" { return "text/plain; charset=utf-8" }
        default { return "application/octet-stream" }
    }
}

function Write-HttpResponse {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$Reason,
        [byte[]]$Body,
        [string]$ContentType,
        [string]$ContentSecurityPolicy,
        [bool]$HeadOnly = $false
    )

    $header = @(
        "HTTP/1.1 $StatusCode $Reason",
        "Content-Type: $ContentType",
        "Content-Length: $($Body.Length)",
        "Connection: close",
        "Cache-Control: no-cache",
        "X-Content-Type-Options: nosniff",
        "Referrer-Policy: no-referrer",
        "Cross-Origin-Opener-Policy: same-origin",
        "Content-Security-Policy: $ContentSecurityPolicy",
        ""
    ) -join "`r`n"
    $header += "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

function Write-TextError {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$Reason,
        [string]$Message,
        [bool]$HeadOnly = $false
    )

    $body = [System.Text.Encoding]::UTF8.GetBytes("AEGIS Champion: $Message`n")
    Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -Reason $Reason -Body $body -ContentType "text/plain; charset=utf-8" -ContentSecurityPolicy $PageCsp -HeadOnly $HeadOnly
}

function Resolve-RequestFile {
    param(
        [string]$Root,
        [string]$RequestTarget
    )

    $pathOnly = ($RequestTarget -split '\?', 2)[0]
    if (-not $pathOnly.StartsWith('/')) {
        throw [System.UnauthorizedAccessException]::new("Invalid request target")
    }

    $decoded = [System.Uri]::UnescapeDataString($pathOnly).Replace('\', '/')
    if ($decoded.IndexOf([char]0) -ge 0) {
        throw [System.UnauthorizedAccessException]::new("Invalid path")
    }

    if ($decoded.EndsWith('/')) {
        $decoded += "index.html"
    }

    $relative = $decoded.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relative))
    $rootPrefix = $Root.TrimEnd([char[]]@('\', '/')) + [System.IO.Path]::DirectorySeparatorChar
    $comparison = Get-PathComparison

    if (-not $candidate.StartsWith($rootPrefix, $comparison)) {
        throw [System.UnauthorizedAccessException]::new("Path traversal rejected")
    }

    if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $candidate "index.html"))
        if (-not $candidate.StartsWith($rootPrefix, $comparison)) {
            throw [System.UnauthorizedAccessException]::new("Path traversal rejected")
        }
    }

    return $candidate
}

$resolvedRoot = Resolve-AegisRoot -Path $RootPath
$PathComparison = Get-PathComparison
$serviceWorkerPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot ($ServiceWorkerRelativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)))

if ($ValidateOnly) {
    [ordered]@{
        status = "passed"
        root = $resolvedRoot
        bind = "127.0.0.1"
        port = $Port
        app = $AppPath
        externalNetwork = $false
        pageConnectSrc = "none"
        serviceWorkerConnectSrc = "self"
        serviceWorkerScope = "exact canonical sw.js only"
        administratorRequired = $false
        pythonRequired = $false
    } | ConvertTo-Json
    exit 0
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    Write-Host "AEGIS Champion could not start on port $Port." -ForegroundColor Red
    Write-Host "Another program may already be using that local port. Close other AEGIS windows and try again."
    exit 1
}

try {
    try { $Host.UI.RawUI.WindowTitle = "AEGIS BioCore Heart" } catch { }
    Write-Host "AEGIS BioCore Heart is running on this PC only." -ForegroundColor Cyan
    Write-Host "Address: $AppUrl"
    Write-Host "External accounts: 0 | Paid services: 0 | Page network: blocked"
    Write-Host "Close this window to stop AEGIS BioCore Heart."

    if (-not $NoBrowser) {
        try {
            Start-Process $AppUrl | Out-Null
        } catch {
            Write-Host "Open this address in your browser: $AppUrl" -ForegroundColor Yellow
        }
    }

    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 5000
        $client.SendTimeout = 5000
        $stream = $null
        $reader = $null

        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::ASCII,
                $false,
                1024,
                $true
            )

            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
            }

            if ($requestLine -notmatch '^(GET|HEAD)\s+(\S+)\s+HTTP/1\.[01]$') {
                Write-TextError -Stream $stream -StatusCode 405 -Reason "Method Not Allowed" -Message "Only GET and HEAD are allowed."
                continue
            }

            $method = $Matches[1]
            $target = $Matches[2]
            $headOnly = $method -eq "HEAD"

            try {
                $filePath = Resolve-RequestFile -Root $resolvedRoot -RequestTarget $target
            } catch [System.UnauthorizedAccessException] {
                Write-TextError -Stream $stream -StatusCode 403 -Reason "Forbidden" -Message "The requested path is not allowed." -HeadOnly $headOnly
                Write-Host "403 $method path-rejected"
                continue
            } catch {
                Write-TextError -Stream $stream -StatusCode 400 -Reason "Bad Request" -Message "The request path is invalid." -HeadOnly $headOnly
                Write-Host "400 $method invalid-path"
                continue
            }

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                Write-TextError -Stream $stream -StatusCode 404 -Reason "Not Found" -Message "The requested file was not found." -HeadOnly $headOnly
                Write-Host "404 $method $target"
                continue
            }

            $body = [System.IO.File]::ReadAllBytes($filePath)
            $contentType = Get-ContentType -Path $filePath
            $responseCsp = if ([System.String]::Equals($filePath, $serviceWorkerPath, $PathComparison)) {
                $ServiceWorkerCsp
            } else {
                $PageCsp
            }
            Write-HttpResponse -Stream $stream -StatusCode 200 -Reason "OK" -Body $body -ContentType $contentType -ContentSecurityPolicy $responseCsp -HeadOnly $headOnly
            Write-Host "200 $method $target"
        } catch {
            Write-Host "Request rejected: $($_.Exception.Message)" -ForegroundColor Yellow
        } finally {
            if ($null -ne $reader) { $reader.Dispose() }
            if ($null -ne $stream) { $stream.Dispose() }
            $client.Dispose()
        }
    }
} finally {
    $listener.Stop()
}
