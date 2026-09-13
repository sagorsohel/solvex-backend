# 🚀 Solvex Backend - Hostinger Deployment Guide (হোস্টিংগার সেটআপ গাইড)

এই গাইডে Hostinger-এ Solvex Backend API হোস্ট করার সম্পূর্ণ ধাপ বিস্তারিত দেওয়া হয়েছে। 
আপনার প্যাকেজিং এবং ফাইলগুলো ইতোমধ্যে তৈরি করা আছে:
- **ডিপ্লয়মেন্ট জিপ ফাইল**: `solvex-backend-deploy.zip` (সম্পূর্ণ প্রস্তুত)
- **ডাটাবেস ব্যাকআপ ফাইল**: `database_backup.sql` (সবগুলো ১৮টি টেবিল ও রিয়েল ডাটা সহ)
- **স্টার্টআপ ফাইল**: `server.js` এবং `app.js` (Hostinger Node.js এর জন্য অপ্টিমাইজড)
- **এনভায়রনমেন্ট টেমপ্লেট**: `.env.production.example`
- **VPS কনফিগ**: `ecosystem.config.cjs` এবং `hostinger-nginx.conf`

---

## সূচিপত্র (Table of Contents)
1. [পদ্ধতি ১: Hostinger Cloud / Web Hosting (hPanel Node.js Selector) - সবচেয়ে সহজ](#পদ্ধতি-১-hostinger-cloud--web-hosting-hpanel-nodejs)
2. [পদ্ধতি ২: Hostinger VPS (Virtual Private Server - Ubuntu + PM2 + Nginx)](#পদ্ধতি-২-hostinger-vps)
3. [ফ্রন্টএন্ড ও অ্যাডমিন প্যানেলের সাথে কানেক্ট করা](#ফ্রন্টএন্ড-ও-অ্যাডমিন-প্যানেল-কানেকশন)
4. [সমস্যা হলে সমাধান (Troubleshooting)](#সমস্যা-ও-সমাধান)

---

<a name="পদ্ধতি-১-hostinger-cloud--web-hosting-hpanel-nodejs"></a>
## 🌟 পদ্ধতি ১: Hostinger Web / Cloud Hosting (hPanel Node.js Selector)

আপনার যদি Hostinger Business Web Hosting বা Cloud Hosting থাকে, তবে hPanel এর মাধ্যমে খুব সহজেই হোস্ট করতে পারবেন:

### ধাপ ১: Hostinger-এ MySQL ডাটাবেস তৈরি করুন
1. **Hostinger hPanel**-এ লগইন করুন।
2. বাম পাশের মেনু থেকে **Databases** ➔ **MySQL Databases**-এ যান।
3. **Create a New MySQL Database And Database User**:
   - **Database Name**: যেমন `solvex_db` (পুরো নাম হবে `u123456789_solvex_db` এর মতো)
   - **Username**: যেমন `solvex_user` (পুরো নাম হবে `u123456789_solvex_user`)
   - **Password**: একটি শক্তিশালী পাসওয়ার্ড দিন এবং এটি নোট করে রাখুন।
4. **Create** বাটনে ক্লিক করুন।

### ধাপ ২: ডাটাবেস ইমপোর্ট করুন (phpMyAdmin)
1. তৈরি করা ডাটাবেসের পাশে **Enter phpMyAdmin** লিঙ্কে ক্লিক করুন।
2. phpMyAdmin ওপেন হলে উপরের মেনু থেকে **Import** ট্যাবে ক্লিক করুন।
3. **Choose File**-এ ক্লিক করে আপনার প্রজেক্টের `database_backup.sql` ফাইলটি সিলেক্ট করুন।
4. পেজের নিচে গিয়ে **Import** / **Go** বাটনে ক্লিক করুন। 
   *(কয়েক সেকেন্ডের মধ্যে সব ১৮টি টেবিল ও সম্পূর্ণ ডাটা সফলভাবে ইমপোর্ট হয়ে যাবে)*

### ধাপ ৩: সাবডোমেন তৈরি করুন (সুপারিশকৃত)
Backend API এর জন্য একটি সাবডোমেন ব্যবহার করা সবচেয়ে ভালো (যেমন `api.yourdomain.com`):
1. hPanel-এ **Domains** ➔ **Subdomains**-এ যান।
2. **Subdomain Name**: লিখুন `api`
3. **Custom folder for subdomain** টিক দিয়ে ফোল্ডার নাম দিন: `public_html/api`
4. **Create** এ ক্লিক করুন।

### ধাপ ৪: ফাইল আপলোড ও এক্সট্র্যাক্ট করুন
1. hPanel-এ **Files** ➔ **File Manager**-এ যান।
2. সাবডোমেনের ফোল্ডারে যান (যেমন `public_html/api`)।
3. উপরের **Upload** আইকনে ক্লিক করে আপনার কম্পিউটার থেকে **`solvex-backend-deploy.zip`** ফাইলটি আপলোড করুন।
4. আপলোড শেষ হলে জিপ ফাইলের উপর রাইট ক্লিক করে **Extract** করুন (একই ফোল্ডারে)।
5. এক্সট্র্যাক্ট হওয়ার পর `solvex-backend-deploy.zip` ফাইলটি ডিলিট করে দিন।

### ধাপ ৫: `.env` ফাইল কনফিগার করুন
1. File Manager-এ `.env` ফাইলটি ডাবল ক্লিক করে ওপেন করুন (যদি লুকানো থাকে তবে Settings থেকে "Show Hidden Files" অন করুন, অথবা `.env.production.example` রিনেম করে `.env` করুন)।
2. নিচের মতো করে আপনার তথ্যগুলো বসান:
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=solvex_super_secret_jwt_key_2026_change_this_to_random_string
JWT_EXPIRES_IN=7d

# Hostinger এ তৈরি করা ডাটাবেস তথ্য
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_solvex_user
DB_PASSWORD=আপনার_ডাটাবেস_পাসওয়ার্ড
DB_NAME=u123456789_solvex_db

# আপনার API সাবডোমেন URL (শেষে স্ল্যাশ ছাড়া)
APP_URL=https://api.yourdomain.com

# ফ্রন্টএন্ড ডোমেন (CORS)
CORS_ORIGIN=*
```
3. **Save** করে ফাইলটি বন্ধ করুন।

### ধাপ ৬: Hostinger Node.js Application সেটআপ করুন
1. hPanel-এ ফিরে এসে সার্চ বারে লিখুন **Node.js** অথবা **Advanced** ➔ **Node.js** এ যান।
2. **Create Application** বাটনে ক্লিক করুন:
   - **Node.js version**: `20.x` অথবা `18.x` সিলেক্ট করুন।
   - **Application mode**: `Production`
   - **Application root**: আপনার ফোল্ডার পাথ সিলেক্ট করুন (যেমন `domains/yourdomain.com/public_html/api`)
   - **Application URL**: `api.yourdomain.com` সিলেক্ট করুন।
   - **Application startup file**: লিখুন `server.js`
3. **Create** বাটনে ক্লিক করুন।
4. এবার অ্যাপ্লিকেশনের পেজে **Run NPM Install** (বা **Install Dependencies**) বাটনে ক্লিক করুন।
5. ইন্সটল সম্পন্ন হলে **Restart Application** বাটনে ক্লিক করুন।

### ধাপ ৭: পরীক্ষা করুন
ব্রাউজারে গিয়ে ভিজিট করুন:
👉 `https://api.yourdomain.com/api/health`

আপনি নিচের মতো JSON রেসপন্স দেখতে পাবেন:
```json
{
  "status": "ok",
  "service": "Solvex Backend API",
  "orm": "Drizzle ORM (MySQL)",
  "auth": "JWT Authentication",
  "timestamp": "2026-..."
}
```
🎉 **অভিনন্দন! আপনার ব্যাকএন্ড সফলভাবে লাইভ হয়ে গেছে!**

---

<a name="পদ্ধতি-২-hostinger-vps"></a>
## 💻 পদ্ধতি ২: Hostinger VPS (Ubuntu + PM2 + Nginx)

আপনার যদি Hostinger VPS (KVM VPS) থাকে:

### ধাপ ১: VPS এ SSH দিয়ে লগইন করুন
```bash
ssh root@YOUR_VPS_IP
```

### ধাপ ২: সার্ভার আপডেট ও প্রয়োজনীয় সফটওয়্যার ইন্সটল করুন
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx mysql-server certbot python3-certbot-nginx

# Node.js 20 LTS ইন্সটল করুন
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 ইন্সটল করুন
sudo npm install -g pm2
```

### ধাপ ৩: MySQL ডাটাবেস তৈরি করুন
```bash
sudo mysql -u root

# MySQL এর ভেতরে নিচের কমান্ডগুলো চালান:
CREATE DATABASE solvex_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'solvex_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON solvex_db.* TO 'solvex_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### ধাপ ৪: ব্যাকএন্ড কোড আপলোড করুন
আপনার লোকাল পিসি থেকে SCP দিয়ে জিপ ফাইল আপলোড করতে পারেন:
```bash
# লোকাল টার্মিনালে:
scp d:\Demo\solvex\backend\solvex-backend-deploy.zip root@YOUR_VPS_IP:/var/www/
```
অথবা VPS এ:
```bash
sudo mkdir -p /var/www/solvex-backend
cd /var/www/solvex-backend
sudo apt install -y unzip
sudo unzip /var/www/solvex-backend-deploy.zip -d /var/www/solvex-backend/
```

### ধাপ ৫: ডাটাবেস ব্যাকআপ ইমপোর্ট করুন
```bash
cd /var/www/solvex-backend
mysql -u solvex_user -p solvex_db < database_backup.sql
# পাসওয়ার্ড চাইলে আপনার দেওয়া পাসওয়ার্ড দিন
```

### ধাপ ৬: ডিপেন্ডেন্সি ইন্সটল ও `.env` তৈরি করুন
```bash
npm install --omit=dev
cp .env.production.example .env
nano .env
# .env ফাইলে আপনার DB_PASSWORD এবং APP_URL সেট করুন (Ctrl+O দিয়ে Save, Ctrl+X দিয়ে Exit)
```

### ধাপ ৭: PM2 দিয়ে ব্যাকএন্ড চালু করুন
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# টার্মিনালে যে কমান্ড দেখাবে সেটি কপি করে রান করুন যাতে সার্ভার রিবুট হলেও স্বয়ংক্রিয়ভাবে ব্যাকএন্ড রান থাকে
```

### ধাপ ৮: Nginx Reverse Proxy ও ফ্রি SSL কনফিগার করুন
```bash
sudo cp hostinger-nginx.conf /etc/nginx/sites-available/api.yourdomain.com
sudo nano /etc/nginx/sites-available/api.yourdomain.com
# api.yourdomain.com এর জায়গায় আপনার আসল ডোমেন বসান

sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Let's Encrypt ফ্রি SSL সার্টিফিকেট নিন
sudo certbot --nginx -d api.yourdomain.com
```

---

<a name="ফ্রন্টএন্ড-ও-অ্যাডমিন-প্যানেল-কানেকশন"></a>
## 🔗 ফ্রন্টএন্ড ও অ্যাডমিন প্যানেল কানেকশন

ব্যাকএন্ড লাইভ করার পর ফ্রন্টএন্ড এবং অ্যাডমিন প্যানেলে লাইভ API URL টি বসিয়ে দিতে হবে:

### ১. মেইন ওয়েবসাইট (`solvex-global-ltd/.env`):
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### ২. অ্যাডমিন প্যানেল (`adminpanel/.env`):
```env
VITE_API_URL=https://api.yourdomain.com/api
```

সেট করার পর ফ্রন্টএন্ড ও অ্যাডমিন প্যানেলে `npm run build` করে Hostinger-এ হোস্ট করে দিলেই পুরো সিস্টেম লাইভ কাজ করবে।

---

<a name="সমস্যা-ও-সমাধান"></a>
## 🛠️ সাধারণ সমস্যা ও সমাধান (Troubleshooting)

1. **Upload ফোল্ডার পারমিশন সমস্যা (Cannot upload images)**:
   - Hostinger File Manager-এ গিয়ে `uploads` ফোল্ডারের Permissions `755` বা `775` আছে কিনা দেখে নিন।
2. **CORS Error**:
   - `.env` ফাইলে `CORS_ORIGIN=*` দেওয়া আছে কিনা চেক করুন অথবা আপনার ফ্রন্টএন্ড ডোমেন দিন (যেমন `https://solvexgloballtd.com`).
3. **Database Connection Error (ECONNREFUSED / Access Denied)**:
   - Hostinger hPanel-এ ডাটাবেসের ইউজার ও ডাটাবেস নেমের প্রিফিক্স চেক করুন (যেমন `u123456789_solvex_db`)।
   - পাসওয়ার্ডে কোনো ভুল আছে কিনা চেক করুন।
   - হোস্ট সবসময় `localhost` রাখবেন।
4. **ভবিষ্যতে ডাটাবেস নতুন করে ব্যাকআপ নিতে চাইলে**:
   - লোকাল প্রজেক্টের টার্মিনালে চালান: `npm run db:export`
5. **ভবিষ্যতে নতুন ডিপ্লয়মেন্ট জিপ তৈরি করতে চাইলে**:
   - লোকাল প্রজেক্টের টার্মিনালে চালান: `npm run package:deploy`
