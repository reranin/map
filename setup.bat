@echo off
chcp 65001 >nul
echo 🚀 شروع راه‌اندازی پروژه بهینه‌ساز مسیر Neshan...
echo.

REM نصب وابستگی‌ها
echo 📦 نصب وابستگی‌های npm...
call npm install

REM ایجاد فایل .env
echo.
echo ⚙️ ایجاد فایل .env...
(
echo NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
echo PORT=3000
echo NESHAN_BASE_URL=https://api.neshan.org/v1
) > .env

echo.
echo ✅ فایل .env با موفقیت ساخته شد!
echo.

REM نمایش محتوای فایل .env
echo 📄 محتوای فایل .env:
type .env
echo.

echo 🎉 راه‌اندازی با موفقیت انجام شد!
echo.
echo برای اجرای پروژه از دستورات زیر استفاده کنید:
echo   npm run dev    (حالت development)
echo   npm start      (حالت production)
echo.
echo سپس به آدرس http://localhost:3000 بروید
echo.
pause

