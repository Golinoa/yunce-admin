$ErrorActionPreference = 'Stop'

Write-Host '== Git Secret Audit =='

if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  throw 'Current directory is not a Git repository.'
}

Write-Host "`n[1] Local env files in working tree"
$localEnvFiles = @()
if (Test-Path .env) {
  $localEnvFiles += '.env'
}
$localEnvFiles += Get-ChildItem -Force -Name .env.* -ErrorAction SilentlyContinue

if ($localEnvFiles.Count -eq 0) {
  Write-Host '(none)'
} else {
  $localEnvFiles | Sort-Object -Unique
}

Write-Host "`n[2] Tracked env files"
$trackedEnvFiles = git ls-files .env .env.*
if ([string]::IsNullOrWhiteSpace(($trackedEnvFiles -join ''))) {
  Write-Host '(none)'
} else {
  $trackedEnvFiles
}

Write-Host "`n[3] Env-like files in history"
$historyEnvFiles = git log --all --name-only --pretty=format: |
  Select-String -Pattern '^\.env(\..+)?$' |
  ForEach-Object { $_.Line } |
  Sort-Object -Unique

if ($null -eq $historyEnvFiles -or $historyEnvFiles.Count -eq 0) {
  Write-Host '(none)'
} else {
  $historyEnvFiles
}

Write-Host "`n[4] Tracked files that contain secret-like keys in HEAD (file path only)"
$headSecretFiles = git grep -l -I -E 'JWT_SECRET=|DATABASE_URL=|MYSQL_PASSWORD=|ACCESS_TOKEN_SECRET=|REFRESH_TOKEN_SECRET=' HEAD -- . ':!*.example' ':!package-lock.json'
if ([string]::IsNullOrWhiteSpace(($headSecretFiles -join ''))) {
  Write-Host '(none)'
} else {
  $headSecretFiles
}

Write-Host "`n[5] Recent commits"
git log --oneline -n 20

Write-Host "`n[6] Audit reminders"
Write-Host '- Do not print or copy any secret value into tickets, chat, or audit records.'
Write-Host '- If local .env or .env.* exists, record only file presence and handling result.'
Write-Host '- If history or HEAD contains secret-like files, rotate corresponding credentials immediately.'

Write-Host "`nAudit finished. Rotate secrets immediately if any real credentials were found."
