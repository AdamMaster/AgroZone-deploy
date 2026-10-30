# Локальная сборка и подпись APK для RuStore (вместо EAS Build).
#
# Запуск из папки mobile:
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-android-local.ps1 -VersionCode 9
#
# Что делает:
#   1. создаёт нативный проект android (expo prebuild --clean) с настройками из app.json и плагинов;
#   2. ставит versionCode (должен быть БОЛЬШЕ, чем у любой уже выпущенной сборки);
#   3. собирает release APK через Gradle;
#   4. подписывает APK ключом AgroZone (тем же, что хранил EAS) и сверяет отпечаток.
# Пароли от ключа спрашиваются в консоли и нигде не сохраняются.

param(
  [Parameter(Mandatory = $true)][int]$VersionCode,
  [string]$KeystorePath = 'C:\Users\Bberd\keys\@agrozone__agrozone.jks',
  [string]$KeyAlias = 'e0c49ae0b21dbcf172f148b7f56f1049',
  [string]$OutDir = (Join-Path $env:USERPROFILE 'Desktop\agrozone-apk'),
  # Только подписать уже собранный APK (android\app\build\outputs\apk\release\app-release.apk), без новой сборки.
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

# SHA-1 отпечаток ключа EAS (из `eas credentials`). Подписанный APK обязан его показать.
$ExpectedSha1 = '79:92:B9:4A:7E:E3:5A:60:2D:D4:22:45:AE:78:F2:FC:25:65:74:5B'.Replace(':', '').ToLower()

function Fail($message) {
  Write-Host "ОШИБКА: $message" -ForegroundColor Red
  exit 1
}

# Запуск внешней программы: предупреждения в stderr (например, у keytool про формат JKS)
# не должны считаться ошибкой, решает только код возврата.
function Invoke-Native([scriptblock]$command) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & $command 2>&1 | ForEach-Object { "$_" }
    return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = ($output -join "`n") }
  } finally {
    $ErrorActionPreference = $previous
  }
}

function Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

$mobileDir = Split-Path -Parent $PSScriptRoot
Set-Location $mobileDir

# --- Окружение: JDK и Android SDK из Android Studio -------------------------
Step 'Проверка окружения'

if (-not (Test-Path $KeystorePath)) { Fail "Нет файла ключа: $KeystorePath" }

# Нужен JDK 17 или 21. В новых версиях JDK (24+) в Android Studio (jbr) Java печатает
# предупреждение, и Android Gradle Plugin принимает его за ошибку (сборка падает в Prefab).
function Get-JdkMajor($home_) {
  $release = Join-Path $home_ 'release'
  if (-not (Test-Path (Join-Path $home_ 'bin\java.exe')) -or -not (Test-Path $release)) { return 0 }
  $line = Get-Content $release | Where-Object { $_ -match '^JAVA_VERSION=' } | Select-Object -First 1
  if ($line -match 'JAVA_VERSION="?(\d+)') { return [int]$Matches[1] }
  return 0
}

$jdkCandidates = @()
if ($env:JAVA_HOME) { $jdkCandidates += $env:JAVA_HOME }
foreach ($root in @('C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java', 'C:\Program Files\Microsoft', 'C:\Program Files\Zulu', 'C:\Program Files\Amazon Corretto')) {
  if (Test-Path $root) { $jdkCandidates += (Get-ChildItem $root -Directory | ForEach-Object { $_.FullName }) }
}
$jdkCandidates += 'C:\Program Files\Android\Android Studio\jbr'

$chosenJdk = $jdkCandidates | Where-Object { (Get-JdkMajor $_) -in 17, 21 } | Select-Object -First 1
if (-not $chosenJdk) {
  Fail 'Не найден JDK 17 или 21 (JDK новее, как в Android Studio jbr, не подходит). Установите: winget install EclipseAdoptium.Temurin.21.JDK  (потом откройте новое окно терминала).'
}
$env:JAVA_HOME = $chosenJdk
Write-Host "JDK          = $chosenJdk (версия $(Get-JdkMajor $chosenJdk))"

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
  $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $sdk) { $env:ANDROID_HOME = $sdk }
  else { Fail 'Не найден Android SDK. Откройте Android Studio -> SDK Manager и установите его.' }
}
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

$apksigner = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory -ErrorAction SilentlyContinue |
  Sort-Object { [version]($_.Name -replace '[^\d\.].*$', '') } -Descending |
  ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
if (-not $apksigner) { Fail 'Не найден apksigner. В SDK Manager -> SDK Tools поставьте Android SDK Build-Tools.' }

Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"
Write-Host "apksigner    = $apksigner"

# Лицензии SDK (без них Gradle не скачает нужные компоненты). Если уже приняты — ничего не изменится.
$sdkmanager = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\sdkmanager.bat'
if (Test-Path $sdkmanager) {
  Write-Host 'Принимаю лицензии Android SDK...'
  (1..30 | ForEach-Object { 'y' }) | & $sdkmanager --licenses | Out-Null
}

# --- Пароли -----------------------------------------------------------------
function Read-Secret($prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$keyFile = Get-Item -LiteralPath $KeystorePath
$keyHash = (Get-FileHash -LiteralPath $KeystorePath -Algorithm SHA256).Hash.Substring(0, 12)
Write-Host "`nФайл ключа: $($keyFile.FullName)  ($($keyFile.Length) байт, sha256 $keyHash...)"

# Пароли спрашиваем до трёх раз: опечатка не должна стоить нового запуска.
# Пароли состоят из цифр и латинских букв a-f; раскладка должна быть английской.
$passwordsOk = $false
for ($attempt = 1; $attempt -le 3 -and -not $passwordsOk; $attempt++) {
  Step "Пароли от ключа, попытка $attempt из 3 (при вводе не отображаются; можно вставлять правой кнопкой мыши)"
  $env:AZ_KS_PASS = (Read-Secret 'Keystore password').Trim()
  $env:AZ_KEY_PASS = (Read-Secret 'Key password').Trim()
  Write-Host "Длина: Keystore password = $($env:AZ_KS_PASS.Length), Key password = $($env:AZ_KEY_PASS.Length) (должно быть 32 и 32)"

  $listing = Invoke-Native { & $keytool -list -keystore $KeystorePath -storepass:env AZ_KS_PASS -alias $KeyAlias }
  if ($listing.ExitCode -ne 0) {
    Write-Host 'Keystore password не подошёл. Проверьте английскую раскладку и введите ещё раз.' -ForegroundColor Yellow
    continue
  }

  # Пароль ключа проверяем на временной копии, чтобы не трогать оригинал.
  $tempCopy = Join-Path $env:TEMP ('az-check-' + [guid]::NewGuid().ToString('N') + '.jks')
  Copy-Item $KeystorePath $tempCopy
  try {
    $keyCheck = Invoke-Native { & $keytool -keypasswd -keystore $tempCopy -storepass:env AZ_KS_PASS -alias $KeyAlias -keypass:env AZ_KEY_PASS -new:env AZ_KEY_PASS }
  } finally {
    Remove-Item $tempCopy -Force -ErrorAction SilentlyContinue
  }
  if ($keyCheck.ExitCode -ne 0) {
    Write-Host 'Key password не подошёл (это третья строка из EAS, не alias). Введите оба пароля ещё раз.' -ForegroundColor Yellow
    continue
  }

  $passwordsOk = $true
  Write-Host 'Пароли верные.' -ForegroundColor Green
}
if (-not $passwordsOk) { Fail 'Пароли не подошли за три попытки.' }

try {
  # --- Публичные ключи клиента берём из eas.json (профиль production) ---------
  Step 'Переменные сборки'
  $eas = Get-Content (Join-Path $mobileDir 'eas.json') -Raw | ConvertFrom-Json
  foreach ($property in $eas.build.production.env.PSObject.Properties) {
    Set-Item -Path "env:$($property.Name)" -Value $property.Value
    Write-Host "$($property.Name) задан"
  }
  $env:NODE_ENV = 'production'

  if (-not $SkipBuild) {
    # --- Нативный проект --------------------------------------------------------
    Step 'expo prebuild'
    & npx --yes expo prebuild --platform android --clean --no-install
    if ($LASTEXITCODE -ne 0) { Fail 'expo prebuild завершился с ошибкой.' }

    # --- versionCode ------------------------------------------------------------
    Step "versionCode = $VersionCode"
    $appGradle = Join-Path $mobileDir 'android\app\build.gradle'
    $content = [IO.File]::ReadAllText($appGradle)
    $patched = [regex]::Replace($content, 'versionCode\s+\d+', "versionCode $VersionCode")
    if ($patched -eq $content -and $content -notmatch "versionCode\s+$VersionCode\b") {
      Fail 'Не удалось найти versionCode в android/app/build.gradle.'
    }
    # Без BOM: Gradle не принимает файл, начинающийся с BOM (Set-Content -Encoding UTF8 его добавляет).
    [IO.File]::WriteAllText($appGradle, $patched, (New-Object System.Text.UTF8Encoding($false)))

    # --- Сборка -----------------------------------------------------------------
    Step 'Gradle assembleRelease (первый раз 15-30 минут)'
    Push-Location (Join-Path $mobileDir 'android')
    try {
      & .\gradlew.bat assembleRelease --console=plain
      if ($LASTEXITCODE -ne 0) { Fail 'Gradle завершился с ошибкой. Пришлите последние ~40 строк вывода.' }
    } finally {
      Pop-Location
    }

  }

  $builtApk = Join-Path $mobileDir 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $builtApk)) { Fail "Не найден собранный APK: $builtApk" }

  # --- Подпись ключом AgroZone -----------------------------------------------
  Step 'Подпись APK'
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
  $version = (Get-Content (Join-Path $mobileDir 'app.json') -Raw | ConvertFrom-Json).expo.version
  $outApk = Join-Path $OutDir "agrozone-$version-$VersionCode.apk"
  Copy-Item $builtApk $outApk -Force

  & $apksigner sign --ks $KeystorePath --ks-key-alias $KeyAlias `
    --ks-pass env:AZ_KS_PASS --key-pass env:AZ_KEY_PASS $outApk
  if ($LASTEXITCODE -ne 0) { Fail 'apksigner не смог подписать APK (проверьте пароли и alias).' }

  $certs = & $apksigner verify --print-certs $outApk
  if ($LASTEXITCODE -ne 0) { Fail 'Проверка подписи не пройдена.' }
  $sha1Line = $certs | Where-Object { $_ -match 'certificate SHA-1 digest' } | Select-Object -First 1
  $actualSha1 = ($sha1Line -replace '.*digest:\s*', '').Trim().ToLower()

  if ($actualSha1 -ne $ExpectedSha1) {
    Remove-Item $outApk -Force
    Fail "Отпечаток подписи не совпал с ключом EAS ($actualSha1). APK удалён, в RuStore его заливать нельзя."
  }

  Write-Host "`nГОТОВО. Подпись совпадает с ключом EAS." -ForegroundColor Green
  Write-Host "APK: $outApk" -ForegroundColor Green
} finally {
  Remove-Item env:AZ_KS_PASS -ErrorAction SilentlyContinue
  Remove-Item env:AZ_KEY_PASS -ErrorAction SilentlyContinue
}
