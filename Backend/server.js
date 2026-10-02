try {
  const dns = require("dns");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignored in environments where custom DNS servers are restricted
}

const Category = require("./models/Category");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();
const Todo = require("./models/Todo");
const User = require("./models/User");
const Note = require("./models/Note");
const jwt = require("jsonwebtoken");
const { deleteFileFromStorage } = require("./services/storage");
const attachmentRoutes = require("./routes/attachments");

const app = express();

// Configurable CORS for production & local development
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins (dynamically echo) so credentials and custom headers always work
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local fallback uploads statically if in local development
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Resilient MongoDB connection handling (supports both standalone & Vercel serverless)
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGO_URI) {
    console.error("Warning: MONGO_URI is not set in environment variables");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Cloud Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed", error);
  }
};

// Initiate connection immediately
if (process.env.MONGO_URI) {
  connectDB();
}

// Middleware to ensure DB connection is active for each request
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState < 1 && process.env.MONGO_URI) {
    await connectDB();
  }
  next();
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

// Attachment and file upload endpoints
app.use("/api", attachmentRoutes);


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
    const todo = await Todo.findById(req.params.id);
    if (todo && todo.attachments && todo.attachments.length > 0) {
      for (const att of todo.attachments) {
        await deleteFileFromStorage(att.storageKey, att.storageProvider, att.resourceType);
      }
    }

    await Todo.findByIdAndDelete(req.params.id);

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
      attachments,
    } = req.body;

    const note = await Note.create({
      title,
      description,
      category,
      deadline,
      userEmail,
      attachments: Array.isArray(attachments) ? attachments : [],
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
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      deadline: req.body.deadline,
    };

    if (req.body.attachments !== undefined) {
      updateData.attachments = req.body.attachments;
    }
    if (req.body.status !== undefined) {
      updateData.status = req.body.status;
    }

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Clean up all cloud attachments for this note
    if (note.attachments && note.attachments.length > 0) {
      for (const att of note.attachments) {
        await deleteFileFromStorage(att.storageKey, att.storageProvider, att.resourceType);
      }
    }

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

    const categoryNotes = await Note.find({
      category: category.name,
      userEmail: category.userEmail,
    });

    for (const note of categoryNotes) {
      if (note.attachments && note.attachments.length > 0) {
        for (const att of note.attachments) {
          await deleteFileFromStorage(att.storageKey, att.storageProvider, att.resourceType);
        }
      }
    }

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

// Only start standalone HTTP server when executed directly (not when imported as a serverless function)
if (require.main === module) {
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
}

module.exports = app;