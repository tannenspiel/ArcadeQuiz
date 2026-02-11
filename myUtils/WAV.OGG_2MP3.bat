@echo off
setlocal enabledelayedexpansion

REM ================================================
REM Универсальный OGG/WAV to MP3 Converter (64k+)
REM Сохраняет исходники, MP3 в папку mp3/
REM ================================================

set "TARGET_BITRATE=64k"
set "OUTPUT_DIR=mp3"

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [ERROR] FFmpeg not found in PATH.
    echo Install: https://ffmpeg.org/download.html
    pause
    goto :eof
)

echo ================================================
echo Universal Audio to MP3 Converter
echo ================================================
echo Default bitrate: %TARGET_BITRATE% ^(change below if needed^)
echo Output: %OUTPUT_DIR%\
echo Sources preserved
echo.
set /p BITRATE="Enter bitrate (Enter=64k, or 128k/192k/320k): "
if "!BITRATE!"=="" set "BITRATE=%TARGET_BITRATE%"

echo Using bitrate: !BITRATE!
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

REM Создаём папку mp3/
if not exist "%OUTPUT_DIR%" (
    echo Creating: %OUTPUT_DIR%\
    mkdir "%OUTPUT_DIR%"
)

echo Converting OGG/WAV to MP3...
echo.

set "COUNT=0"
set "SUCCESS=0"
set "FAILED=0"

REM OGG files
for %%F in (*.ogg) do (
    set /a COUNT+=1
    set "IN_FILE=%%F"
    set "OUT_FILE=%OUTPUT_DIR%\%%~nF.mp3"
    echo [!COUNT!] OGG: "!IN_FILE!" -^> "!OUT_FILE!"
    ffmpeg -y -i "!IN_FILE!" -c:a libmp3lame -b:a !BITRATE! "!OUT_FILE!" -loglevel error
    if !errorlevel! == 0 (
        set /a SUCCESS+=1
        echo OK: !OUT_FILE!
    ) else (
        set /a FAILED+=1
        echo ERROR: !IN_FILE!
    )
    echo.
)

REM WAV files
for %%F in (*.wav) do (
    set /a COUNT+=1
    set "IN_FILE=%%F"
    set "OUT_FILE=%OUTPUT_DIR%\%%~nF.mp3"
    echo [!COUNT!] WAV: "!IN_FILE!" -^> "!OUT_FILE!"
    ffmpeg -y -i "!IN_FILE!" -c:a libmp3lame -b:a !BITRATE! "!OUT_FILE!" -loglevel error
    if !errorlevel! == 0 (
        set /a SUCCESS+=1
        echo OK: !OUT_FILE!
    ) else (
        set /a FAILED+=1
        echo ERROR: !IN_FILE!
    )
    echo.
)

echo ================================================
echo Conversion complete!
echo ================================================
echo Total: !COUNT! files
echo Success: !SUCCESS!
echo Failed: !FAILED!
echo MP3 in: %OUTPUT_DIR%\
echo Sources: preserved here
echo.
echo Next: Test MP3 in game/player, then del/archive sources if OK.
pause
