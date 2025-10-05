const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'locations.db');
  }

  // اتصال به دیتابیس
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('خطا در اتصال به دیتابیس:', err.message);
          reject(err);
        } else {
          console.log('✅ اتصال به دیتابیس SQLite برقرار شد');
          this.initializeTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // ایجاد جداول مورد نیاز
  async initializeTables() {
    return new Promise((resolve, reject) => {
      const createCategoriesTable = `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          icon TEXT,
          color TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createLocationsTable = `
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          category_id INTEGER,
          address TEXT,
          phone TEXT,
          website TEXT,
          rating REAL DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        )
      `;

      this.db.serialize(() => {
        this.db.run(createCategoriesTable, (err) => {
          if (err) {
            console.error('خطا در ایجاد جدول categories:', err.message);
            reject(err);
          } else {
            console.log('✅ جدول categories ایجاد شد');
          }
        });

        this.db.run(createLocationsTable, (err) => {
          if (err) {
            console.error('خطا در ایجاد جدول locations:', err.message);
            reject(err);
          } else {
            console.log('✅ جدول locations ایجاد شد');
            this.seedData().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  // اضافه کردن داده‌های اولیه
  async seedData() {
    return new Promise((resolve, reject) => {
      // بررسی وجود داده‌ها
      this.db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count > 0) {
          console.log('✅ داده‌های اولیه قبلاً اضافه شده‌اند');
          resolve();
          return;
        }

        // اضافه کردن دسته‌بندی‌ها
        const categories = [
          { name: 'مراکز تفریحی تهران', description: 'مکان‌های تفریحی و سرگرمی در تهران', icon: 'fas fa-theater-masks', color: '#e74c3c' },
          { name: 'مراکز خرید', description: 'مراکز خرید و بازارهای تهران', icon: 'fas fa-shopping-cart', color: '#3498db' },
          { name: 'رستوران‌ها', description: 'رستوران‌ها و کافه‌های تهران', icon: 'fas fa-utensils', color: '#f39c12' },
          { name: 'پارک‌ها', description: 'پارک‌ها و فضای سبز تهران', icon: 'fas fa-tree', color: '#27ae60' },
          { name: 'موزه‌ها', description: 'موزه‌ها و مراکز فرهنگی تهران', icon: 'fas fa-museum', color: '#9b59b6' },
          { name: 'مراکز درمانی', description: 'بیمارستان‌ها و کلینیک‌های تهران', icon: 'fas fa-hospital', color: '#e67e22' }
        ];

        const insertCategory = `INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)`;
        
        this.db.serialize(() => {
          categories.forEach((category, index) => {
            this.db.run(insertCategory, [category.name, category.description, category.icon, category.color], (err) => {
              if (err) {
                console.error('خطا در اضافه کردن دسته‌بندی:', err.message);
              } else {
                console.log(`✅ دسته‌بندی "${category.name}" اضافه شد`);
              }
            });
          });

          // اضافه کردن موقعیت‌ها
          setTimeout(() => {
            this.addInitialLocations();
            resolve();
          }, 1000);
        });
      });
    });
  }

  // اضافه کردن موقعیت‌های اولیه
  addInitialLocations() {
    const locations = [
      // مراکز تفریحی تهران
      { name: 'برج آزادی', description: 'نماد تهران و یکی از مهم‌ترین بناهای تاریخی', latitude: 35.6961, longitude: 51.3378, category: 'مراکز تفریحی تهران', address: 'میدان آزادی، تهران', rating: 4.5 },
      { name: 'برج میلاد', description: 'بلندترین برج ایران و ششمین برج مخابراتی جهان', latitude: 35.7444, longitude: 51.3753, category: 'مراکز تفریحی تهران', address: 'جاده همت، تهران', rating: 4.7 },
      { name: 'شهربازی توحید', description: 'یکی از بزرگ‌ترین شهربازی‌های تهران', latitude: 35.6961, longitude: 51.3378, category: 'مراکز تفریحی تهران', address: 'میدان توحید، تهران', rating: 4.2 },
      { name: 'سینما تربیت', description: 'سینمای قدیمی و معروف تهران', latitude: 35.6961, longitude: 51.3378, category: 'مراکز تفریحی تهران', address: 'خیابان تربیت، تهران', rating: 4.0 },
      
      // مراکز خرید
      { name: 'بازار بزرگ تهران', description: 'بازار سنتی و تاریخی تهران', latitude: 35.6762, longitude: 51.4183, category: 'مراکز خرید', address: 'بازار بزرگ، تهران', rating: 4.3 },
      { name: 'مرکز خرید تیراژه', description: 'یکی از بزرگ‌ترین مراکز خرید تهران', latitude: 35.7444, longitude: 51.3753, category: 'مراکز خرید', address: 'جاده همت، تهران', rating: 4.4 },
      { name: 'پالادیوم', description: 'مرکز خرید مدرن در شمال تهران', latitude: 35.7444, longitude: 51.3753, category: 'مراکز خرید', address: 'خیابان ولیعصر، تهران', rating: 4.1 },
      
      // رستوران‌ها
      { name: 'رستوران شاندیز', description: 'رستوران معروف با غذاهای ایرانی', latitude: 35.7444, longitude: 51.3753, category: 'رستوران‌ها', address: 'خیابان شاندیز، تهران', rating: 4.6 },
      { name: 'کافه نادری', description: 'کافه قدیمی و معروف تهران', latitude: 35.6961, longitude: 51.3378, category: 'رستوران‌ها', address: 'خیابان نادری، تهران', rating: 4.2 },
      
      // پارک‌ها
      { name: 'پارک ملت', description: 'یکی از بزرگ‌ترین پارک‌های تهران', latitude: 35.7444, longitude: 51.3753, category: 'پارک‌ها', address: 'خیابان ولیعصر، تهران', rating: 4.5 },
      { name: 'پارک ساعی', description: 'پارک زیبا در مرکز تهران', latitude: 35.6961, longitude: 51.3378, category: 'پارک‌ها', address: 'خیابان ساعی، تهران', rating: 4.3 },
      
      // موزه‌ها
      { name: 'موزه ملی ایران', description: 'بزرگ‌ترین موزه باستان‌شناسی ایران', latitude: 35.6762, longitude: 51.4183, category: 'موزه‌ها', address: 'خیابان سی‌تیر، تهران', rating: 4.7 },
      { name: 'موزه هنرهای معاصر', description: 'موزه معروف هنرهای معاصر', latitude: 35.7444, longitude: 51.3753, category: 'موزه‌ها', address: 'خیابان ولیعصر، تهران', rating: 4.4 },
      
      // مراکز درمانی
      { name: 'بیمارستان امام خمینی', description: 'یکی از بزرگ‌ترین بیمارستان‌های تهران', latitude: 35.6961, longitude: 51.3378, category: 'مراکز درمانی', address: 'خیابان امام خمینی، تهران', rating: 4.1 },
      { name: 'بیمارستان سینا', description: 'بیمارستان معروف و قدیمی تهران', latitude: 35.7444, longitude: 51.3753, category: 'مراکز درمانی', address: 'خیابان سینا، تهران', rating: 4.2 }
    ];

    const insertLocation = `
      INSERT INTO locations (name, description, latitude, longitude, category_id, address, rating)
      VALUES (?, ?, ?, ?, (SELECT id FROM categories WHERE name = ?), ?, ?)
    `;

    locations.forEach((location, index) => {
      this.db.run(insertLocation, [
        location.name,
        location.description,
        location.latitude,
        location.longitude,
        location.category,
        location.address,
        location.rating
      ], (err) => {
        if (err) {
          console.error('خطا در اضافه کردن موقعیت:', err.message);
        } else {
          console.log(`✅ موقعیت "${location.name}" اضافه شد`);
        }
      });
    });
  }

  // دریافت تمام دسته‌بندی‌ها
  getCategories() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM categories ORDER BY name", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // دریافت موقعیت‌ها بر اساس دسته‌بندی
  getLocationsByCategory(categoryId) {
    return new Promise((resolve, reject) => {
      const query = categoryId 
        ? "SELECT l.*, c.name as category_name, c.icon, c.color FROM locations l JOIN categories c ON l.category_id = c.id WHERE l.category_id = ? AND l.is_active = 1 ORDER BY l.name"
        : "SELECT l.*, c.name as category_name, c.icon, c.color FROM locations l JOIN categories c ON l.category_id = c.id WHERE l.is_active = 1 ORDER BY l.name";
      
      const params = categoryId ? [categoryId] : [];
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // جستجوی موقعیت‌ها
  searchLocations(searchTerm) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT l.*, c.name as category_name, c.icon, c.color 
        FROM locations l 
        JOIN categories c ON l.category_id = c.id 
        WHERE (l.name LIKE ? OR l.description LIKE ? OR l.address LIKE ?) 
        AND l.is_active = 1 
        ORDER BY l.name
      `;
      
      const searchPattern = `%${searchTerm}%`;
      
      this.db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // اضافه کردن موقعیت جدید
  addLocation(locationData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO locations (name, description, latitude, longitude, category_id, address, phone, website, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        locationData.name,
        locationData.description,
        locationData.latitude,
        locationData.longitude,
        locationData.category_id,
        locationData.address,
        locationData.phone,
        locationData.website,
        locationData.rating
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...locationData });
        }
      });
    });
  }

  // بستن اتصال دیتابیس
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('خطا در بستن دیتابیس:', err.message);
        } else {
          console.log('✅ اتصال دیتابیس بسته شد');
        }
      });
    }
  }
}

module.exports = Database;
