// services/user-service/index.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { getRegistry } = require("../../shared/serviceRegistry");
const JsonDatabase = require("../../shared/JsonDatabase");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Initialize database
const db = new JsonDatabase("users", path.join(__dirname, "data"));

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[User Service] ${req.method} ${req.path}`);
  next();
});

// Helper functions
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware for authentication
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = decoded;
  next();
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "user-service",
    timestamp: new Date().toISOString(),
  });
});

// Register new user
app.post("/auth/register", async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, preferences } =
      req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({
        error: "Email, username, and password are required",
      });
    }

    // Check if user already exists
    const existingEmail = db.findOne("users", { email });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = db.findOne("users", { username });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = db.create("users", {
      email,
      username,
      password: hashedPassword,
      firstName: firstName || "",
      lastName: lastName || "",
      preferences: preferences || {
        defaultStore: "",
        currency: "BRL",
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        error: "Login (email or username) and password are required",
      });
    }

    // Find user by email or username
    let user = db.findOne("users", { email: login });
    if (!user) {
      user = db.findOne("users", { username: login });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID
app.get("/users/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;

    // Users can only access their own data
    if (req.user.id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = db.findById("users", id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
app.put("/users/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Users can only update their own data
    if (req.user.id !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Don't allow password update through this endpoint
    delete updates.password;
    delete updates.id;
    delete updates.email; // Email should not be changed without verification

    const user = db.update("users", id, updates);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Profile updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token endpoint (for other services)
app.post("/auth/verify", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);

  // Register with service registry
  const registry = getRegistry();
  registry.register("user-service", {
    port: PORT,
    healthEndpoint: "/health",
    metadata: {
      version: "1.0.0",
      description: "User management and authentication service",
    },
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down User Service...");
  const registry = getRegistry();
  registry.deregister("user-service");
  process.exit(0);
});
