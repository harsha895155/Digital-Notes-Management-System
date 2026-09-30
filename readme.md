# Gnapika (StudyHub) 📝

A modern, full-stack Note-taking and Task Management web application built with React, Node.js, Express, and MongoDB.

![Banner](./banner.png)

## ✨ Features

- **User Authentication**: Secure user registration, login, and password management using JWT and bcrypt.
- **Notes Management**: Create, view, categorize, update, and delete notes.
- **Deadline Tracking**: Set deadlines for notes with automatic categorization for today's and upcoming tasks.
- **Daily To-Do List**: Quick task list to check off items and stay organized throughout the day.
- **Interactive Calendar**: Integrated calendar to plan and visualize schedules.
- **Responsive UI**: Clean, responsive layout styled with Bootstrap 5 and modern styling.

---

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **Vite**
- **React Router DOM v7**
- **Bootstrap 5 & Bootstrap Icons**
- **React Calendar**
- **Axios**

### Backend
- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **JSON Web Tokens (JWT)** for authentication
- **Bcryptjs** for secure password hashing
- **CORS** & **dotenv**

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <YOUR_REPOSITORY_URL>
   cd Gnapika-main
   ```

2. **Backend Setup**:
   ```bash
   cd Backend
   npm install
   ```
   Create a `.env` file in the `Backend` directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```
   Start the backend server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../Frontend
   npm install
   npm run dev
   ```

4. **Open in Browser**:
   Open [http://localhost:5173](http://localhost:5173) to view the application.

---

## 📁 Project Structure

```
├── Backend/
│   ├── models/           # Mongoose schemas (User, Note, Todo, Category)
│   ├── package.json
│   └── server.js         # Express API routes and server configuration
├── Frontend/
│   ├── src/
│   │   ├── pages/        # Welcome, Login, Register, Dashboard, MyNotes
│   │   ├── App.jsx       # App routing & protected routes
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── banner.png
└── .gitignore
```

---

## 📄 License
This project is open-source and available under the ISC License.
