# college-tracker-backend# 🎓 College Tracker Backend

A RESTful backend API for the **College Tracker** application built with **Node.js**, **Express.js**, and **MongoDB**. It provides secure APIs for managing students, attendance, assignments, notices, and other college-related data.

---

## 🚀 Features

- 👨‍🎓 Student Management
- 📝 Attendance Management
- 📚 Assignment Management
- 📢 Notices & Announcements
- 🔐 Secure REST APIs
- 🌐 MongoDB Database Integration
- ⚡ Fast & Lightweight Express Server

---

## 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **dotenv**
- **CORS**
- **Nodemon**

---

## 📂 Project Structure

```text
college-tracker-backend/
│── .github/
│   └── workflows/
│       └── keep-alive.yml
│── models/
│── routes/
│── server.js
│── package.json
│── package-lock.json
│── .gitignore
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/AyushDheerajPatel/college-tracker-backend.git
```

### Navigate to Project

```bash
cd college-tracker-backend
```

### Install Dependencies

```bash
npm install
```

### Create Environment File

Create a `.env` file in the project root.

Example:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_secret_key
```

### Run Development Server

```bash
npm run dev
```

or

```bash
node server.js
```

---

## 🌐 API Base URL

### Production

```
https://college-tracker-backend.onrender.com
```

---

## 📌 Available Routes

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Server Status |
| GET | `/health` | Health Check |
| POST | `/...` | Create Resource |
| GET | `/...` | Fetch Resource |
| PUT | `/...` | Update Resource |
| DELETE | `/...` | Delete Resource |

> Replace the above endpoints with your actual API routes.

---

## 🔒 Environment Variables

Required variables:

```env
MONGO_URI=
PORT=
JWT_SECRET=
```

---

## 🚀 Deployment

Backend is deployed on **Render**.

---

## 👨‍💻 Author

**Ayush Patel**

- GitHub: https://github.com/AyushDheerajPatel
- LinkedIn: https://www.linkedin.com/in/ayush-patel-seri/

---

## 📄 License

This project is licensed under the MIT License.
