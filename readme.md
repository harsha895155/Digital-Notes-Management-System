# Gnapika (StudyHub) 📝 — Production MERN Web Application

A full-stack, production-ready Note-taking and Task Management web application built with React 19, Vite, Node.js, Express, and MongoDB Atlas.

![Banner](./banner.png)

---

## 🏗️ Architecture

```
User (Browser)
      ↓
Vercel (Production React Frontend SPA)
      ↓ HTTPS API Requests
Render / Railway (Production Express REST API)
      ↓ Mongoose Connection (TLS)
MongoDB Atlas (Cloud Database Cluster)
```

- **Frontend**: React 19 SPA bundled with Vite, hosted on **Vercel** with client-side SPA routing rewrites.
- **Backend**: Real Node.js/Express REST server deployed on **Render** (or Railway).
- **Database**: **MongoDB Atlas** cloud cluster with automated replica sets.
- **Security**: JWT tokens, bcrypt password hashing, configurable production CORS, and zero hardcoded secrets.

---

## ✨ Features

- **Authentication & Security**: Secure user registration, login, and password management with JWT tokens and bcrypt password hashing.
- **Notes Management**: Complete CRUD operations for notes (Create, Read, Update, Delete).
- **Category Organization**: Categorize notes dynamically and filter with instant state synchronization.
- **Deadline Tracking**: Set deadlines for notes with automatic categorization for today's and upcoming tasks.
- **Daily To-Do List**: Quick task list with real-time toggle completion and daily date filtering.
- **Interactive Calendar**: Integrated calendar view for planning and schedule visualization.
- **Production Health Monitoring**: Dedicated `/health` endpoint for uptime monitoring and database connectivity checks.
- **SPA Routing**: Single Page Application rewrite rules ensuring direct URL navigation and page reloads work seamlessly.

---

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **Vite** (Rolldown / Fast production bundler)
- **React Router DOM v7**
- **Bootstrap 5 & Bootstrap Icons**
- **React Calendar**
- **Axios** (Centralized API client)

### Backend
- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **JSON Web Tokens (JWT)** for stateless authentication
- **Bcryptjs** for secure password hashing
- **CORS** (Configurable for production domains & Vercel previews)
- **dotenv** (Environment configuration)

---

## 🔐 Environment Variables

### Backend (`Backend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Port the Express server listens on | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | `your-secure-random-secret` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `https://your-app.vercel.app` |

### Frontend (`Frontend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the deployed Express backend | `https://digital-notes-management-system.onrender.com` |

---

## 🚀 Deployment Instructions

### 1. Backend Deployment (Render / Railway)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository: `https://github.com/harsha895155/Digital-Notes-Management-System`.
3. Configure the service:
   - **Root Directory**: `Backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables in the Render dashboard:
   - `PORT`: `5000`
   - `MONGO_URI`: *Your MongoDB Atlas connection URI*
   - `JWT_SECRET`: *Your secure random JWT secret*
   - `FRONTEND_URL`: *Your Vercel frontend URL*
5. Deploy and verify health check:
   ```bash
   curl https://<YOUR-RENDER-BACKEND>.onrender.com/health
   ```

### 2. Full-Stack Deployment on Vercel (Frontend + Serverless Backend)
1. Go to [Vercel Dashboard](https://vercel.com/new) and import your GitHub repository.
2. Ensure the **Root Directory** is set to `./` (the repository root).
3. Vercel automatically detects [`vercel.json`](./vercel.json) to build the Vite frontend and deploy the Express backend as serverless functions.
4. Add Environment Variables in your Vercel Project Settings:
   - `MONGO_URI`: `mongodb+srv://...` (Your MongoDB Atlas connection string)
   - `JWT_SECRET`: `your_jwt_secret_key`
   - *(Optional)* `VITE_API_URL`: Leave empty to use the unified Vercel backend directly on the same domain (recommended), or set your Render URL.
5. Click **Deploy**. Both the React frontend and Express serverless backend will be live on your Vercel URL!

---

## 💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Atlas](https://www.mongodb.com/) cluster or local MongoDB instance

### Quick Start
1. **Clone the repository**:
   ```bash
   git clone https://github.com/harsha895155/Digital-Notes-Management-System.git
   cd Digital-Notes-Management-System
   ```

2. **Backend**:
   ```bash
   cd Backend
   cp .env.example .env
   npm install
   npm start
   ```

3. **Frontend**:
   ```bash
   cd ../Frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & DB status |
| `POST` | `/api/register` | Register a new user account |
| `POST` | `/api/login` | Authenticate user & return JWT |
| `PUT` | `/api/change-password` | Update account password |
| `GET` | `/api/notes/:email` | Fetch all notes for user |
| `POST` | `/api/notes` | Create a new note |
| `PUT` | `/api/notes/:id` | Update an existing note |
| `DELETE` | `/api/notes/:id` | Delete a note |
| `GET` | `/api/categories/:email` | Fetch categories for user |
| `POST` | `/api/categories` | Create a category |
| `DELETE` | `/api/categories/:id` | Delete a category |
| `GET` | `/api/todos/:email` | Fetch today's todos |
| `POST` | `/api/todos` | Add a new todo item |
| `PUT` | `/api/todos/:id` | Toggle todo completion |
| `DELETE` | `/api/todos/:id` | Delete a todo item |

---

## 📄 License
This project is open-source and licensed under the ISC License.
