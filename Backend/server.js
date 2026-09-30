const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const Category = require("./models/Category");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Todo = require("./models/Todo");
const User = require("./models/User");
const Note = require("./models/Note");
const jwt = require("jsonwebtoken");

const app = express();

// Configurable CORS for production & local development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback to allow initial setup
    },
    credentials: true,
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Cloud Connected Successfully");
  })
  .catch((error) => {
    console.log("MongoDB Connection Failed", error);
  });

// Health check endpoint for monitoring (Render, Railway, UptimeRobot)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Backend Server Running",
    status: "ok",
  });
});


// ==================== REGISTER ====================

app.post("/api/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration Successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration Failed",
      error: error.message,
    });
  }
});
//=================TODO====================
app.post("/api/todos", async (req, res) => {
  try {
    const todo = await Todo.create(req.body);
    res.status(201).json(todo);
  } catch (error) {
    res.status(500).json(error);
  }
});
app.get("/api/todos/:email", async (req, res) => {
  try {

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const todos = await Todo.find({
      userEmail: req.params.email,
      taskDate: today,
    });

    res.status(200).json(todos);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch todos",
      error: error.message,
    });

  }
});
app.put("/api/todos/:id", async (req, res) => {
  try {
    const todo =
      await Todo.findById(req.params.id);

    todo.completed = !todo.completed;

    await todo.save();

    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json(error);
  }
});
app.delete("/api/todos/:id", async (req, res) => {
  try {
    await Todo.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message: "Deleted",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});
//==============category=========================
app.post("/api/categories", async (req, res) => {
  try {
    const { name, userEmail } = req.body;

    const category = await Category.create({
      name,
      userEmail,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create category",
      error: error.message,
    });
  }
});

app.get("/api/categories/:email", async (req, res) => {
  try {
    const categories = await Category.find({
      userEmail: req.params.email,
    });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});


// ==================== LOGIN ====================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

     const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login Failed",
      error: error.message,
    });
  }
});


// ==================== CHANGE PASSWORD ====================

app.put("/api/change-password", async (req, res) => {
  try {
    const {
      email,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Password update failed",
      error: error.message,
    });
  }
});

// ==================== ADD NOTE ====================

app.post("/api/notes", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      deadline,
      userEmail,
    } = req.body;

    const note = await Note.create({
      title,
      description,
      category,
      deadline,
      userEmail,
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create note",
      error: error.message,
    });
  }
});

// ==================== GET NOTES ====================

app.get("/api/notes/:email", async (req, res) => {
  try {
    const notes = await Note.find({
      userEmail: req.params.email,
    }).sort({ createdAt: -1 });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
});
// ==================== UPDATE NOTE ====================

app.put("/api/notes/:id", async (req, res) => {
  try {
    const updatedNote =
      await Note.findByIdAndUpdate(
        req.params.id,
        {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          deadline:req.body.deadline,
        },
        { new: true }
      );

    res.status(200).json(updatedNote);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update note",
      error: error.message,
    });
  }
});


// ==================== DELETE NOTE ====================

app.delete("/api/notes/:id", async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Note deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete note",
      error: error.message,
    });
  }
});

// ==================== DELETE CATEGORY ====================
app.delete("/api/categories/:id", async (req, res) => {
  try {
    const category =
      await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const notesCount = await Note.countDocuments({
      category: category.name,
      userEmail: category.userEmail,
    });

    await Note.deleteMany({
      category: category.name,
      userEmail: category.userEmail,
    });

    await Category.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message: `Category deleted with ${notesCount} notes`,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete category",
      error: error.message,
    });
  }
});

// ==================== SERVER ====================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});