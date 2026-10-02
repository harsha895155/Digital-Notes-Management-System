# MindDesk 📝 — Production Digital Notes & Task Management System

**Official Platform Email:** `minddesk43@gmail.com`

A full-stack, production-ready Note-taking and Task Management web application built with React 19, Vite, Node.js, Express, Cloudinary, and MongoDB Atlas.

![Banner](./banner.png)

---

## 🏗️ Architecture

```
User (Browser)
      ↓
Vercel (Production React 19 Frontend SPA)
      ↓ HTTPS API Requests with JWT Bearer Token
Render / Railway / Vercel (Production Express REST API)
      ├─→ MongoDB Atlas (Cloud Database Cluster: Notes, Tasks, Users & Attachment Metadata)
      └─→ Cloudinary Object Storage (Persistent Cloud Files & Raw Document Storage)
```

- **Frontend**: React 19 SPA bundled with Vite, hosted on **Vercel** with client-side SPA routing rewrites and Bootstrap 5.
- **Backend**: Real Node.js/Express REST server deployed on **Render** (or Railway / Vercel serverless).
- **Database**: **MongoDB Atlas** cloud cluster with automated replica sets.
- **Object Storage**: **Cloudinary** for persistent document and media hosting (in-memory streaming, no ephemeral disk dependency on Render/Vercel, zero binaries inside MongoDB documents).
- **Security**: JWT authentication, bcrypt password hashing, cross-user ownership verification, strict file extension & MIME validation, executable rejection, and zero client-exposed cloud secrets.

---

## ✨ Features

- **Authentication & Security**: Secure user registration, login, and password management with JWT tokens and bcrypt password hashing.
- **Notes Management**: Complete CRUD operations for notes (Create, Read, Update, Delete) with state synchronization.
- **File Upload & Attachment Management**:
  - Drag-and-drop file upload zone + browse files dialog.
  - Multi-file attachment support for both **Notes** and **Daily To-Do Tasks**.
  - Real-time upload progress tracking and loading indicators.
  - Interactive file previews (modal viewers for Images and PDFs).
  - Authenticated, secure file downloads with proper `Content-Disposition`.
  - Independent attachment deletion with cloud storage cleanup.
  - Preserves attachments when editing note metadata (title, category, deadline).
  - Cascade cleanup: Deleting a note, task, or category automatically removes all associated files from cloud storage.
- **Category Organization**: Categorize notes dynamically and filter with instant state synchronization.
- **Deadline Tracking**: Set deadlines for notes with automatic categorization for today's and upcoming tasks.
- **Daily To-Do List**: Quick task list with real-time toggle completion, daily date filtering, and task reference file attachments.
- **Interactive Calendar**: Integrated calendar view for planning and schedule visualization.
- **Production Health Monitoring**: Dedicated `/health` endpoint for uptime monitoring and database connectivity checks.

---

## 📎 File Attachment Architecture & Supported Types

### Supported Formats
| Category | File Extensions | MIME Types |
|---|---|---|
| **PDF Documents** | `.pdf` | `application/pdf` |
| **Word Documents** | `.doc`, `.docx` | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| **Spreadsheets** | `.xls`, `.xlsx`, `.csv` | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv` |
| **Presentations** | `.ppt`, `.pptx` | `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp` | `image/png`, `image/jpeg`, `image/webp` |
| **Plain Text** | `.txt` | `text/plain` |
| **Archives** | `.zip` | `application/zip`, `application/x-zip-compressed` |

### Storage Architecture
1. **Zero Disk Dependency**: Uploaded files stream directly through Node.js memory buffers into Cloudinary. This guarantees 100% compatibility with ephemeral container filesystems like Render, Railway, and Vercel.
2. **MongoDB Metadata**: File binaries are **never** stored inside MongoDB documents. MongoDB stores clean metadata subdocuments:
   ```json
   {
     "originalName": "CS_Lecture_Notes.pdf",
     "storageKey": "notes/user_abc123/1741234567890_CS_Lecture_Notes",
     "url": "https://res.cloudinary.com/.../raw/upload/...",
     "mimeType": "application/pdf",
     "size": 2450000,
     "uploadedAt": "2026-10-02T16:00:00.000Z",
     "storageProvider": "cloudinary",
     "resourceType": "raw",
     "userEmail": "user@example.com"
   }
   ```
3. **Local Development Fallback**: If Cloudinary credentials are not provided during local development, the backend automatically falls back to saving files in `Backend/uploads/` and serves them statically at `/uploads`, ensuring zero setup friction for new contributors.
4. **Cascade Cleanup**: When a note, task, or entire category is deleted, the backend iterates through all associated attachments and deletes the remote files from Cloudinary to prevent orphaned storage.

---

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **Vite** (Fast production bundler)
- **React Router DOM v7**
- **Bootstrap 5 & Bootstrap Icons**
- **React Calendar**
- **Axios** (Centralized API client with JWT headers)

### Backend
- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **Multer** (Memory storage streaming)
- **Cloudinary SDK** (Cloud object storage)
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
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/studyhub` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | `your-secure-random-secret` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `https://your-app.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account Cloud Name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary account API Key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary account API Secret | `your_api_secret` |
| `MAX_FILE_SIZE_MB` | Maximum allowed upload file size (in MB) | `10` |

### Frontend (`Frontend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the deployed Express backend | `https://digital-notes-management-system.onrender.com` |

---

## 🚀 Deployment Instructions

### 1. Cloudinary Object Storage Setup (Manual)
1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. On your Cloudinary Dashboard, locate:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. These credentials must only be added to your Backend environment variables on Render / Railway / Vercel. **Never** expose them in frontend `.env` files.

### 2. Backend Deployment (Render / Railway)
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
   - `CLOUDINARY_CLOUD_NAME`: *Your Cloudinary cloud name*
   - `CLOUDINARY_API_KEY`: *Your Cloudinary API key*
   - `CLOUDINARY_API_SECRET`: *Your Cloudinary API secret*
   - `MAX_FILE_SIZE_MB`: `10`
5. Deploy and verify health check:
   ```bash
   curl https://<YOUR-RENDER-BACKEND>.onrender.com/health
   ```

### 3. Frontend Deployment on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new) and import your GitHub repository.
2. In Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `Frontend` (or `./` if using root `vercel.json`)
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<YOUR-RENDER-BACKEND>.onrender.com`
4. Click **Deploy**.

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
   # Add your MONGO_URI and JWT_SECRET. Cloudinary credentials are optional for local dev.
   npm install
   npm run dev
   ```

3. **Frontend**:
   ```bash
   cd ../Frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Run Integration Tests**:
   ```bash
   cd Backend
   node test_attachments.js
   ```

---

## 📡 API Endpoints Reference

### Core Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & DB status |
| `POST` | `/api/register` | Register a new user account |
| `POST` | `/api/login` | Authenticate user & return JWT |
| `PUT` | `/api/change-password` | Update account password |
| `GET` | `/api/notes/:email` | Fetch all notes for user |
| `POST` | `/api/notes` | Create a new note (with optional attachments) |
| `PUT` | `/api/notes/:id` | Update an existing note (preserves attachments) |
| `DELETE` | `/api/notes/:id` | Delete a note and its attached files |
| `GET` | `/api/categories/:email` | Fetch categories for user |
| `POST` | `/api/categories` | Create a category |
| `DELETE` | `/api/categories/:id` | Delete category & related notes & attachments |
| `GET` | `/api/todos/:email` | Fetch today's todos |
| `POST` | `/api/todos` | Add a new todo item |
| `PUT` | `/api/todos/:id` | Toggle todo completion (preserves attachments) |
| `DELETE` | `/api/todos/:id` | Delete a todo item and its attached files |

### File & Attachment Endpoints
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/attachments/config` | Get max file size limit and allowed file types | No |
| `POST` | `/api/upload` | Direct multi-file upload returning metadata array | Yes (JWT) |
| `POST` | `/api/notes/:id/attachments` | Upload and attach files to an existing note | Yes (JWT + Owner) |
| `GET` | `/api/notes/:id/attachments` | Fetch attachments list for a note | Yes (JWT + Owner) |
| `DELETE` | `/api/notes/:id/attachments/:attachmentId` | Permanently remove single attachment from note & cloud storage | Yes (JWT + Owner) |
| `POST` | `/api/todos/:id/attachments` | Upload and attach files to a todo task | Yes (JWT + Owner) |
| `DELETE` | `/api/todos/:id/attachments/:attachmentId` | Permanently remove attachment from task & cloud storage | Yes (JWT + Owner) |
| `GET` | `/api/attachments/:attachmentId/download` | Authenticated download stream with `Content-Disposition` | Yes (JWT / Token query) |

---

## 📱 MindDesk Mobile Application (Android & iOS)

MindDesk features a production-ready native mobile app built with **React Native + Expo SDK 57 + TypeScript**, connecting directly to the same existing production Express backend and MongoDB Atlas database.

### Unified Architecture

```
                    ┌─────────────────────────┐
                    │    MindDesk Android     │
                    │   (React Native/Expo)   │
                    └────────────┬────────────┘
                                 │
                                 │ HTTPS (Bearer JWT)
                                 │
                    ┌────────────▼────────────┐
                    │      MindDesk iOS       │
                    │   (React Native/Expo)   │
                    └────────────┬────────────┘
                                 │
                                 │
                    ┌────────────▼────────────┐
                    │   Express REST API      │
                    │   (Render Production)   │
                    └──────┬───────────▲──────┘
                           │           │
                           │           │ HTTPS (Bearer JWT)
                           │           │
                           │   ┌───────┴─────────┐
                           │   │  MindDesk Web   │
                           │   │  (React + Vite) │
                           │   └─────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
    ┌───────▼────────┐           ┌────────▼────────┐
    │ MongoDB Atlas  │           │ Cloud Storage   │
    │  (Single DB)   │           │ (Cloudinary)    │
    └────────────────┘           └─────────────────┘
```

### Mobile Features

- **Native Bottom Tab Navigation**: Home, Notes, Calendar, Tasks, and Profile.
- **Home Dashboard**: Live greeting, real MongoDB statistics (Total Notes, Categories, Tasks Done, Deadlines), Today's Tasks preview with checkboxes, and Upcoming Deadlines list.
- **Notes Screen**: Fast FlatList rendering, keyword search, category filter chips, note creation modal, edit & delete actions.
- **Full File Attachment Support**: Pick documents (`expo-document-picker`) or photos (`expo-image-picker`), preview metadata, upload to `/api/upload`, and download/open attachments securely (`expo-file-system` & `expo-sharing`).
- **Interactive Calendar**: Full month navigation, today marker, date event indicators, and day inspection showing deadlines and tasks.
- **Tasks Management**: Quick-add bar, filters (All, Pending, Done), toggle completion, and deletion.
- **User Profile**: View/edit profile details (Full Name, Username, Phone, Bio), upload/change profile photo, and view real activity metrics.
- **Security & Storage**: JWT tokens stored securely using `expo-secure-store` (never in plain AsyncStorage), automatic token refresh, and auto-logout on 401 session expiry.
- **Visual Consistency**: Exact MindDesk aesthetic with warm ivory background (`#F5EBDD`), espresso dark (`#24160F`), saddle brown (`#8B4F27`), gold accents (`#D69A55`), rounded cards, and clean typography.

### Mobile Setup & Development

1. **Navigate to the Mobile directory**:
   ```bash
   cd Mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create `Mobile/.env`:
   ```bash
   EXPO_PUBLIC_API_URL=https://digital-notes-management-system.onrender.com
   ```
   *(For testing on a physical device on your local Wi-Fi, change to your PC's LAN IP, e.g. `http://192.168.1.100:5000`)*

4. **Start the Expo Development Server**:
   ```bash
   npx expo start
   ```
   - Scan the QR code using the **Expo Go** app on Android or the Camera app on iOS.
   - Press `a` for Android emulator or `i` for iOS simulator.

### Android & iOS Production Builds (EAS)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Generate Android Preview APK (Directly installable on phones)**:
   ```bash
   cd Mobile
   eas build --platform android --profile preview
   ```

4. **Generate Android Production AAB (Google Play Store)**:
   ```bash
   cd Mobile
   eas build --platform android --profile production
   ```

5. **Generate iOS Build**:
   ```bash
   cd Mobile
   eas build --platform ios --profile production
   ```

---

## 🔒 Security Behavior

- **Stateless JWT Verification**: All upload, download, and deletion requests must supply a valid JWT token in `Authorization: Bearer <token>` or `?token=` parameter.
- **Strict User Ownership**: File deletion and downloading verifies that the logged-in user's email matches the owner email stored on the note or task. Users cannot view, download, or delete other users' files.
- **Validation Pipeline**:
  - File extensions are validated against an allowlist on both frontend and backend.
  - MIME types are verified.
  - Dangerous executables (`.exe`, `.bat`, `.cmd`, `.sh`, `.bin`, `.msi`, `.dll`, `.com`, `.vbs`, etc.) are explicitly blocked.
  - Maximum upload size (default 10 MB per file) is enforced by Multer in memory before saving.
- **Private Credentials**: Storage secrets (`CLOUDINARY_API_SECRET`, etc.) are never exposed to the client or embedded into Vite bundles.

---

## 📄 License
This project is open-source and licensed under the ISC License.
