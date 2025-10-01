# 📦 راهنمای نصب و راه‌اندازی

## مرحله 1️⃣: نصب وابستگی‌ها

```bash
npm install
```

## مرحله 2️⃣: ایجاد فایل .env

فایل `.env` را در ریشه پروژه بسازید و محتوای زیر را در آن قرار دهید:

```env
NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
PORT=3000
NESHAN_BASE_URL=https://api.neshan.org/v1
```

### دستورات ایجاد فایل:

**لینوکس/مک:**
```bash
cat > .env << 'EOF'
NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
PORT=3000
NESHAN_BASE_URL=https://api.neshan.org/v1
EOF
```

**ویندوز (PowerShell):**
```powershell
@"
NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
PORT=3000
NESHAN_BASE_URL=https://api.neshan.org/v1
"@ | Out-File -FilePath .env -Encoding utf8
```

**ویندوز (CMD):**
```cmd
(
echo NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
echo PORT=3000
echo NESHAN_BASE_URL=https://api.neshan.org/v1
) > .env
```

## مرحله 3️⃣: اجرای پروژه

```bash
# حالت development (با nodemon)
npm run dev

# یا حالت production
npm start
```

## مرحله 4️⃣: دسترسی به اپلیکیشن

پس از اجرای سرور، به آدرس‌های زیر بروید:

- **اپلیکیشن اصلی**: http://localhost:3000
- **تست ساده نقشه**: http://localhost:3000/test-simple
- **تست کامل**: http://localhost:3000/test-neshan

## ✅ بررسی نصب صحیح

اگر نقشه نشان به درستی نمایش داده شد، یعنی نصب موفقیت‌آمیز بوده است! 🎉

## 🔑 دریافت API Key اختصاصی

برای استفاده تجاری و حرفه‌ای، API Key اختصاصی خود را از [پنل نشان](https://platform.neshan.org) دریافت کنید.

## 🐛 رفع مشکلات رایج

### نقشه نمایش داده نمی‌شود
- اتصال اینترنت خود را بررسی کنید
- مطمئن شوید که فایل `.env` ساخته شده است
- Console مرورگر را بررسی کنید (F12)

### پورت 3000 در حال استفاده است
پورت را در فایل `.env` تغییر دهید:
```env
PORT=3001
```

### خطای "Cannot find module 'dotenv'"
دستور `npm install` را مجدداً اجرا کنید.

