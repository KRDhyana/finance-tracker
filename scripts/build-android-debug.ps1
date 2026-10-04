$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$sdkCandidates = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  "$env:LOCALAPPDATA\Android\Sdk"
) | Where-Object { $_ -and (Test-Path $_) }

# Where-Object returns a scalar when only one match — wrap so [0] is the path, not a char.
$sdkList = @($sdkCandidates)

if ($sdkList.Length -eq 0) {
  Write-Error @"
Android SDK not found.

Install Android Studio, then set ANDROID_HOME or create android/local.properties:

  sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk

See MOBILE.md for full instructions.
"@
}

$localProps = Join-Path $root "android\local.properties"
if (-not (Test-Path $localProps)) {
  $sdkPath = $sdkList[0]
  $sdk = $sdkPath.Replace('\', '\\')
  "sdk.dir=$sdk" | Set-Content -Path $localProps -Encoding ASCII
  Write-Host "Created android/local.properties -> $sdkPath"
}

$jbrCandidates = @(
  "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr",
  "C:\Program Files\Android\Android Studio\jbr",
  "C:\Program Files\Android\Android Studio1\jbr"
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\java.exe")) }

$jbrList = @($jbrCandidates)
if ($jbrList.Length -gt 0) {
  $env:JAVA_HOME = $jbrList[0]
  Write-Host "Using JAVA_HOME: $env:JAVA_HOME"
} elseif (-not $env:JAVA_HOME) {
  Write-Warning "JAVA_HOME not set. Capacitor 7 needs JDK 21+. Set JAVA_HOME to Android Studio's jbr folder."
}

pnpm run cap:sync:android
Set-Location (Join-Path $root "android")
.\gradlew.bat assembleDebug

$apk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  Write-Host ""
  Write-Host "APK ready: $apk" -ForegroundColor Green
} else {
  Write-Error "Build finished but APK not found at $apk"
}
