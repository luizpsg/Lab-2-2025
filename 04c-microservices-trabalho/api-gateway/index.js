// api-gateway/index.js
const express = require("express");
const axios = require("axios");
const { getRegistry } = require("../shared/serviceRegistry");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - From: ${req.ip}`);

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(
      `[${timestamp}] Response ${res.statusCode} for ${req.method} ${req.path}`
    );
    originalSend.apply(res, arguments);
  };

  next();
});

// Circuit breaker middleware
async function withCircuitBreaker(serviceName, requestFn) {
  const registry = getRegistry();

  if (!registry.canCallService(serviceName)) {
    throw new Error(
      `Service ${serviceName} is currently unavailable (circuit open)`
    );
  }

  try {
    const result = await requestFn();
    registry.recordSuccess(serviceName);
    return result;
  } catch (error) {
    registry.recordFailure(serviceName);
    throw error;
  }
}

// Generic proxy function
async function proxyRequest(serviceName, path, req, res) {
  try {
    const registry = getRegistry();
    const service = registry.getService(serviceName);

    const response = await withCircuitBreaker(serviceName, async () => {
      const config = {
        method: req.method,
        url: `${service.url}${path}`,
        headers: {
          ...req.headers,
          host: service.host,
        },
      };

      if (req.body && Object.keys(req.body).length > 0) {
        config.data = req.body;
      }

      if (req.query && Object.keys(req.query).length > 0) {
        config.params = req.query;
      }

      return await axios(config);
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    handleError(error, res);
  }
}

// Error handler
function handleError(error, res) {
  if (error.response) {
    // Forward error from service
    res.status(error.response.status).json(error.response.data);
  } else if (error.message.includes("Service not found")) {
    res.status(503).json({ error: "Service not available" });
  } else if (error.message.includes("circuit open")) {
    res.status(503).json({ error: "Service temporarily unavailable" });
  } else {
    console.error("Gateway error:", error);
    res.status(500).json({ error: "Gateway error" });
  }
}

// Routes

// Health check
app.get("/health", (req, res) => {
  const registry = getRegistry();
  const services = registry.getAllServices();

  res.json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    services: Object.keys(services).map((name) => ({
      name,
      status: services[name].status,
      url: services[name].url,
    })),
  });
});

// Service registry status
app.get("/registry", (req, res) => {
  const registry = getRegistry();
  res.json(registry.getAllServices());
});

// Auth routes -> User Service
app.post("/api/auth/register", (req, res) => {
  proxyRequest("user-service", "/auth/register", req, res);
});

app.post("/api/auth/login", (req, res) => {
  proxyRequest("user-service", "/auth/login", req, res);
});

app.post("/api/auth/verify", (req, res) => {
  proxyRequest("user-service", "/auth/verify", req, res);
});

// User routes -> User Service
app.all("/api/users/*", (req, res) => {
  const path = req.path.replace("/api/users", "/users");
  proxyRequest("user-service", path, req, res);
});

// Item routes -> Item Service
app.all("/api/items/*", (req, res) => {
  const path = req.path.replace("/api/items", "/items");
  proxyRequest("item-service", path, req, res);
});

app.get("/api/items", (req, res) => {
  proxyRequest("item-service", "/items", req, res);
});

app.get("/api/categories", (req, res) => {
  proxyRequest("item-service", "/categories", req, res);
});

// List routes -> List Service
app.all("/api/lists/*", (req, res) => {
  const path = req.path.replace("/api/lists", "/lists");
  proxyRequest("list-service", path, req, res);
});

app.get("/api/lists", (req, res) => {
  proxyRequest("list-service", "/lists", req, res);
});

app.post("/api/lists", (req, res) => {
  proxyRequest("list-service", "/lists", req, res);
});

// Aggregated endpoints

// Dashboard - aggregate user statistics
app.get("/api/dashboard", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const registry = getRegistry();

    // Verify user
    const userService = registry.getService("user-service");
    const authResponse = await axios.post(`${userService.url}/auth/verify`, {
      token: token.replace("Bearer ", ""),
    });

    if (!authResponse.data.valid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = authResponse.data.user.id;

    // Get user lists
    const listService = registry.getService("list-service");
    const listsResponse = await axios.get(`${listService.url}/lists`, {
      headers: { authorization: token },
    });

    const lists = listsResponse.data;

    // Calculate statistics
    const totalLists = lists.length;
    const activeLists = lists.filter((l) => l.status === "active").length;
    const completedLists = lists.filter((l) => l.status === "completed").length;

    let totalItems = 0;
    let totalEstimatedCost = 0;
    let purchasedItems = 0;

    lists.forEach((list) => {
      if (list.summary) {
        totalItems += list.summary.totalItems || 0;
        totalEstimatedCost += list.summary.estimatedTotal || 0;
        purchasedItems += list.summary.purchasedItems || 0;
      } else {
        // Fallback: calculate from items if summary doesn't exist
        totalItems += (list.items || []).length;
        const listItems = list.items || [];
        purchasedItems += listItems.filter((item) => item.purchased).length;
        totalEstimatedCost += listItems.reduce((sum, item) => {
          return sum + (item.quantity || 0) * (item.estimatedPrice || 0);
        }, 0);
      }
    });

    // Get recent items
    const itemService = registry.getService("item-service");
    const itemsResponse = await axios.get(`${itemService.url}/items?limit=5`);

    res.json({
      user: authResponse.data.user,
      statistics: {
        totalLists,
        activeLists,
        completedLists,
        totalItems,
        purchasedItems,
        pendingItems: totalItems - purchasedItems,
        totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      },
      recentItems: (itemsResponse.data.items || itemsResponse.data).slice(0, 5),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Global search
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    const token = req.headers.authorization;

    if (!q) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }

    const registry = getRegistry();
    const results = {
      items: [],
      lists: [],
    };

    // Search items
    try {
      const itemService = registry.getService("item-service");
      const itemsResponse = await axios.get(`${itemService.url}/search`, {
        params: { q },
      });
      results.items = itemsResponse.data;
    } catch (error) {
      console.error("Error searching items:", error.message);
    }

    // Search lists (if authenticated)
    if (token) {
      try {
        const listService = registry.getService("list-service");
        const listsResponse = await axios.get(`${listService.url}/lists`, {
          headers: { authorization: token },
        });

        // Filter lists by name
        results.lists = listsResponse.data.filter((list) =>
          list.name.toLowerCase().includes(q.toLowerCase())
        );
      } catch (error) {
        console.error("Error searching lists:", error.message);
      }
    }

    res.json(results);
  } catch (error) {
    handleError(error, res);
  }
});

// Legacy search endpoint (without /api prefix)
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    const token = req.headers.authorization;

    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const registry = getRegistry();
    const results = {
      items: [],
      lists: [],
    };

    // Search items
    try {
      const itemService = registry.getService("item-service");
      const itemsResponse = await axios.get(`${itemService.url}/items`, {
        params: { search: q },
      });
      results.items = itemsResponse.data.items || itemsResponse.data;
    } catch (error) {
      console.error("Error searching items:", error.message);
    }

    // Search lists (if authenticated)
    if (token) {
      try {
        const listService = registry.getService("list-service");
        const listsResponse = await axios.get(`${listService.url}/lists`, {
          headers: { authorization: token },
        });

        // Filter lists by name
        results.lists = listsResponse.data.filter((list) =>
          list.name.toLowerCase().includes(q.toLowerCase())
        );
      } catch (error) {
        console.error("Error searching lists:", error.message);
      }
    }

    res.json(results);
  } catch (error) {
    handleError(error, res);
  }
});

// Start server and initialize
async function start() {
  const registry = getRegistry();

  // Start health checks
  registry.startHealthChecks(30000); // 30 seconds

  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log("Waiting for services to register...");

    // Check services after a delay
    setTimeout(() => {
      const services = registry.getAllServices();
      console.log("Registered services:", Object.keys(services));
    }, 2000);
  });
}

start();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down API Gateway...");
  const registry = getRegistry();
  registry.cleanup();
  process.exit(0);
});
