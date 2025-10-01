#!/bin/bash

echo "🚀 شروع راه‌اندازی پروژه بهینه‌ساز مسیر Neshan..."
echo ""

# نصب وابستگی‌ها
echo "📦 نصب وابستگی‌های npm..."
npm install

# ایجاد فایل .env
echo ""
echo "⚙️ ایجاد فایل .env..."
cat > .env << 'EOF'
NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
PORT=3000
NESHAN_BASE_URL=https://api.neshan.org/v1
EOF

echo ""
echo "✅ فایل .env با موفقیت ساخته شد!"
echo ""

# نمایش محتوای فایل .env
echo "📄 محتوای فایل .env:"
cat .env
echo ""

echo "🎉 راه‌اندازی با موفقیت انجام شد!"
echo ""
echo "برای اجرای پروژه از دستورات زیر استفاده کنید:"
echo "  npm run dev    (حالت development)"
echo "  npm start      (حالت production)"
echo ""
echo "سپس به آدرس http://localhost:3000 بروید"
echo ""

