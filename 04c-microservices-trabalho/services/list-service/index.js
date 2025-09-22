// services/list-service/index.js
const express = require("express");
const axios = require("axios");
const path = require("path");
const { getRegistry } = require("../../shared/serviceRegistry");
const JsonDatabase = require("../../shared/JsonDatabase");

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize database
const db = new JsonDatabase("lists", path.join(__dirname, "data"));

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[List Service] ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token with user service
    const registry = getRegistry();
    const userService = registry.getService("user-service");

    const response = await axios.post(`${userService.url}/auth/verify`, {
      token,
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Authentication failed" });
  }
}

// Helper function to get item details from Item Service
async function getItemDetails(itemId) {
  try {
    const registry = getRegistry();
    const itemService = registry.getService("item-service");

    const response = await axios.get(`${itemService.url}/items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching item details:", error.message);
    return null;
  }
}

// Helper function to calculate list summary
function calculateSummary(items) {
  const totalItems = items.length;
  const purchasedItems = items.filter((item) => item.purchased).length;
  const estimatedTotal = items.reduce((sum, item) => {
    if (!item.purchased) {
      return sum + item.quantity * (item.estimatedPrice || 0);
    }
    return sum;
  }, 0);

  return {
    totalItems,
    purchasedItems,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
  };
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "list-service",
    timestamp: new Date().toISOString(),
    listsCount: db.count("lists"),
  });
});

// Create new list
app.post("/lists", authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "List name is required" });
    }

    const list = db.create("lists", {
      userId: req.user.id,
      name,
      description: description || "",
      status: "active",
      items: [],
      summary: {
        totalItems: 0,
        purchasedItems: 0,
        estimatedTotal: 0,
      },
    });

    res.status(201).json(list);
  } catch (error) {
    console.error("Create list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's lists
app.get("/lists", authenticate, (req, res) => {
  try {
    const { status } = req.query;
    let query = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    const lists = db.find("lists", query);
    res.json(lists);
  } catch (error) {
    console.error("Get lists error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific list
app.get("/lists/:id", authenticate, (req, res) => {
  try {
    const list = db.findById("lists", req.params.id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(list);
  } catch (error) {
    console.error("Get list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update list
app.put("/lists/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const list = db.findById("lists", id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    const updatedList = db.update("lists", id, updates);
    res.json(updatedList);
  } catch (error) {
    console.error("Update list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete list
app.delete("/lists/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const list = db.findById("lists", id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    db.delete("lists", id);
    res.json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Delete list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to list
app.post("/lists/:id/items", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId, quantity, unit, notes } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        error: "Item ID and quantity are required",
      });
    }

    const list = db.findById("lists", id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get item details from Item Service
    const itemDetails = await getItemDetails(itemId);
    if (!itemDetails) {
      return res.status(404).json({ error: "Item not found in catalog" });
    }

    // Check if item already exists in list
    const existingItemIndex = list.items.findIndex(
      (item) => item.itemId === itemId
    );

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      list.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to list
      const listItem = {
        itemId,
        itemName: itemDetails.name,
        quantity,
        unit: unit || itemDetails.unit,
        estimatedPrice: itemDetails.averagePrice,
        purchased: false,
        notes: notes || "",
        addedAt: new Date().toISOString(),
      };

      list.items.push(listItem);
    }

    // Update summary
    list.summary = calculateSummary(list.items);

    const updatedList = db.update("lists", id, list);
    res.json(updatedList);
  } catch (error) {
    console.error("Add item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update item in list
app.put("/lists/:id/items/:itemId", authenticate, (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, purchased, notes } = req.body;

    const list = db.findById("lists", id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Find item in list
    const itemIndex = list.items.findIndex((item) => item.itemId === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in list" });
    }

    // Update item
    if (quantity !== undefined) list.items[itemIndex].quantity = quantity;
    if (purchased !== undefined) list.items[itemIndex].purchased = purchased;
    if (notes !== undefined) list.items[itemIndex].notes = notes;

    // Update summary
    list.summary = calculateSummary(list.items);

    const updatedList = db.update("lists", id, list);
    res.json(updatedList);
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove item from list
app.delete("/lists/:id/items/:itemId", authenticate, (req, res) => {
  try {
    const { id, itemId } = req.params;

    const list = db.findById("lists", id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Remove item from list
    const initialLength = list.items.length;
    list.items = list.items.filter((item) => item.itemId !== itemId);

    if (list.items.length === initialLength) {
      return res.status(404).json({ error: "Item not found in list" });
    }

    // Update summary
    list.summary = calculateSummary(list.items);

    const updatedList = db.update("lists", id, list);
    res.json(updatedList);
  } catch (error) {
    console.error("Remove item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get list summary
app.get("/lists/:id/summary", authenticate, (req, res) => {
  try {
    const list = db.findById("lists", req.params.id);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check ownership
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const summary = {
      ...list.summary,
      listName: list.name,
      status: list.status,
      unpurchasedItems: list.items
        .filter((item) => !item.purchased)
        .map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
          estimatedCost: item.quantity * item.estimatedPrice,
        })),
    };

    res.json(summary);
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`List Service running on port ${PORT}`);

  // Register with service registry
  const registry = getRegistry();
  registry.register("list-service", {
    port: PORT,
    healthEndpoint: "/health",
    metadata: {
      version: "1.0.0",
      description: "Shopping list management service",
    },
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down List Service...");
  const registry = getRegistry();
  registry.deregister("list-service");
  process.exit(0);
});
