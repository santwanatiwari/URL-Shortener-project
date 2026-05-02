# 🔗 Advanced URL Shortener API

A scalable and high-performance **URL Shortener backend system** built with **Node.js, Express, MongoDB, and Redis**.  
It supports caching, rate limiting, analytics tracking, and pagination for efficient performance.

---

## ✨ Features

- 🔗 Shorten long URLs into compact links  
- ⚡ Fast redirection using Redis caching  
- 📊 Click analytics (total clicks, tracking)  
- 📄 Pagination for URL listing  
- 🚦 Rate limiting to prevent abuse  
- 🧠 Optimized backend performance  
- 🗄️ MongoDB for persistent storage  

---

## 🛠️ Tech Stack

- Node.js  
- Express.js  
- MongoDB + Mongoose  
- Redis (Caching)  
- express-rate-limit  

---

## 📦 Installation

```bash
git clone https://github.com/yourusername/url-shortener.git

cd url-shortener

npm install

npm start

## ⚙️ Environment Variables

PORT=3000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
BASE_URL=http://localhost:3000

## 🚀 API Endpoints

### Create Short URL
POST /api/url/shorte
{
  "longUrl": "https://example.com"
}
### Redirect URL
GET /:shortId

Project Structure

SHORT-URL/
│
├── controllers/
│   └── url.js
│
├── middlewares/
│   └── rateLimiter.js
│
├── models/
│   ├── url.js
│   └── analytics.js
│
├── routes/
│   ├── url.js
│   └── staticRouter.js
│
├── views/
│   ├── home.ejs
│   └── nav.ejs
│
├── connect.js
├── redisClient.js
│
├── index.js
├── .env
├── .gitignore
├── dockerignore
├── package.json
├── package-lock.json
└── README.md
