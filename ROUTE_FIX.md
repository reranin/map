# 🛣️ رفع مشکل رسم مسیر

## مشکل قبلی

مسیر به صورت **خطوط مستقیم** بین نقاط رسم می‌شد و مسیر واقعی جاده‌ای را نشان نمی‌داد.

## راه‌حل پیاده‌سازی شده

### 1. استفاده از Neshan Direction API

سیستم حالا از **Neshan Direction API** برای دریافت مسیر واقعی جاده‌ای استفاده می‌کند.

#### تغییرات در Frontend (`script.js`):

```javascript
// تابع جدید برای رسم مسیر با استفاده از Direction API
async function drawRoute(optimizedOrder) {
  // برای هر دو نقطه متوالی
  for (let i = 0; i < optimizedOrder.length - 1; i++) {
    const from = optimizedOrder[i];
    const to = optimizedOrder[i + 1];
    
    // درخواست مسیر واقعی از سرور
    const response = await fetch("/api/get-route", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: from.lat, lng: from.lng },
        destination: { lat: to.lat, lng: to.lng },
      }),
    });
    
    const data = await response.json();
    
    // رسم polyline روی نقشه
    if (data.success && data.route) {
      L.polyline(data.route, {
        color: "#667eea",
        weight: 5,
        opacity: 0.7,
      }).addTo(map);
    }
  }
}
```

#### تغییرات در Backend (`server.js`):

```javascript
// API endpoint جدید برای دریافت مسیر
app.post("/api/get-route", async (req, res) => {
  const { origin, destination } = req.body;
  
  // استفاده از Neshan Direction API
  const directionUrl = `${config.NESHAN_BASE_URL}/direction?type=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&api_key=${config.NESHAN_API_KEY}`;
  
  const response = await axios.get(directionUrl);
  
  // استخراج و decode کردن polyline
  const coordinates = decodePolyline(route.polyline);
  
  res.json({
    success: true,
    route: coordinates,
    distance: route.distance,
    duration: route.duration,
  });
});
```

### 2. نمایش شماره توقف‌گاه‌ها

مارکرها حالا با شماره‌های دایره‌ای شکل نمایش داده می‌شوند که ترتیب مسیر را مشخص می‌کنند.

```javascript
function updateMarkerNumbers(optimizedOrder) {
  optimizedOrder.forEach((location, index) => {
    const markerIcon = L.divIcon({
      html: `<div style="
        background: #667eea;
        color: white;
        border-radius: 50%;
        width: 35px;
        height: 35px;
        ...
      ">${index + 1}</div>`,
    });
    
    L.marker([location.lat, location.lng], { icon: markerIcon }).addTo(map);
  });
}
```

### 3. Fallback برای موارد خطا

اگر Neshan Direction API در دسترس نباشد، سیستم به صورت خودکار خط مستقیم رسم می‌کند:

```javascript
// Fallback: draw straight line with dashed style
const straightLine = L.polyline(
  [[from.lat, from.lng], [to.lat, to.lng]],
  {
    color: "#667eea",
    weight: 5,
    opacity: 0.5,
    dashArray: "10, 10",  // خط چین برای تمایز
  }
).addTo(map);
```

## نتیجه

✅ مسیر واقعی جاده‌ای نمایش داده می‌شود  
✅ شماره توقف‌گاه‌ها به صورت واضح مشخص است  
✅ سیستم fallback برای مواقع خطا دارد  
✅ عملکرد بهینه با Direction API نشان  

## API های مورد استفاده

- **Neshan Direction API**: `https://api.neshan.org/v1/direction`
- **نوع مسیریابی**: `type=car` (خودرو)
- **فرمت خروجی**: Polyline (Google encoding format)

## تست

برای تست عملکرد:

1. سرور را اجرا کنید: `npm start`
2. به آدرس http://localhost:3000 بروید
3. چند لوکیشن اضافه کنید
4. روی "بهینه‌سازی مسیر" کلیک کنید
5. مسیر واقعی جاده‌ای روی نقشه نمایش داده می‌شود

## لینک‌های مفید

- [Neshan Direction API Docs](https://platform.neshan.org/api/direction)
- [Polyline Encoding Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)

