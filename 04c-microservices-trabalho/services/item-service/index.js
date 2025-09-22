// services/item-service/index.js
const express = require("express");
const axios = require("axios");
const path = require("path");
const { getRegistry } = require("../../shared/serviceRegistry");
const JsonDatabase = require("../../shared/JsonDatabase");

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize database
const db = new JsonDatabase("items", path.join(__dirname, "data"));

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[Item Service] ${req.method} ${req.path}`);
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

// Seed initial data
function seedItems() {
  const existingItems = db.count("items");
  if (existingItems > 0) {
    console.log(`Database already has ${existingItems} items`);
    return;
  }

  const items = [
    // Alimentos
    {
      name: "Arroz 5kg",
      category: "Alimentos",
      brand: "Tio João",
      unit: "pacote",
      averagePrice: 25.9,
      barcode: "7891234567890",
      description: "Arroz branco tipo 1",
      active: true,
    },
    {
      name: "Feijão Preto 1kg",
      category: "Alimentos",
      brand: "Camil",
      unit: "pacote",
      averagePrice: 8.5,
      barcode: "7891234567891",
      description: "Feijão preto tipo 1",
      active: true,
    },
    {
      name: "Macarrão Espaguete 500g",
      category: "Alimentos",
      brand: "Barilla",
      unit: "pacote",
      averagePrice: 4.9,
      barcode: "7891234567892",
      description: "Massa de sêmola",
      active: true,
    },
    {
      name: "Óleo de Soja 900ml",
      category: "Alimentos",
      brand: "Soya",
      unit: "garrafa",
      averagePrice: 7.9,
      barcode: "7891234567893",
      description: "Óleo de soja refinado",
      active: true,
    },
    {
      name: "Sal Refinado 1kg",
      category: "Alimentos",
      brand: "Cisne",
      unit: "pacote",
      averagePrice: 2.5,
      barcode: "7891234567894",
      description: "Sal refinado iodado",
      active: true,
    },

    // Limpeza
    {
      name: "Detergente Líquido 500ml",
      category: "Limpeza",
      brand: "Ypê",
      unit: "frasco",
      averagePrice: 2.9,
      barcode: "7891234567895",
      description: "Detergente neutro",
      active: true,
    },
    {
      name: "Sabão em Pó 1kg",
      category: "Limpeza",
      brand: "OMO",
      unit: "caixa",
      averagePrice: 15.9,
      barcode: "7891234567896",
      description: "Sabão em pó para roupas",
      active: true,
    },
    {
      name: "Água Sanitária 1L",
      category: "Limpeza",
      brand: "Qboa",
      unit: "garrafa",
      averagePrice: 4.5,
      barcode: "7891234567897",
      description: "Água sanitária 2%",
      active: true,
    },
    {
      name: "Desinfetante 500ml",
      category: "Limpeza",
      brand: "Pinho Sol",
      unit: "frasco",
      averagePrice: 6.9,
      barcode: "7891234567898",
      description: "Desinfetante pinho",
      active: true,
    },
    {
      name: "Esponja de Aço",
      category: "Limpeza",
      brand: "Bombril",
      unit: "pacote",
      averagePrice: 3.5,
      barcode: "7891234567899",
      description: "Pacote com 8 unidades",
      active: true,
    },

    // Higiene
    {
      name: "Papel Higiênico 12 rolos",
      category: "Higiene",
      brand: "Neve",
      unit: "pacote",
      averagePrice: 18.9,
      barcode: "7891234567900",
      description: "Folha dupla",
      active: true,
    },
    {
      name: "Sabonete 90g",
      category: "Higiene",
      brand: "Dove",
      unit: "unidade",
      averagePrice: 3.5,
      barcode: "7891234567901",
      description: "Sabonete hidratante",
      active: true,
    },
    {
      name: "Shampoo 350ml",
      category: "Higiene",
      brand: "Head & Shoulders",
      unit: "frasco",
      averagePrice: 15.9,
      barcode: "7891234567902",
      description: "Anticaspa",
      active: true,
    },
    {
      name: "Creme Dental 90g",
      category: "Higiene",
      brand: "Colgate",
      unit: "tubo",
      averagePrice: 4.9,
      barcode: "7891234567903",
      description: "Proteção total",
      active: true,
    },
    {
      name: "Desodorante Roll-on 50ml",
      category: "Higiene",
      brand: "Rexona",
      unit: "frasco",
      averagePrice: 12.9,
      barcode: "7891234567904",
      description: "Antitranspirante 48h",
      active: true,
    },

    // Bebidas
    {
      name: "Refrigerante Cola 2L",
      category: "Bebidas",
      brand: "Coca-Cola",
      unit: "garrafa",
      averagePrice: 9.9,
      barcode: "7891234567905",
      description: "Refrigerante cola",
      active: true,
    },
    {
      name: "Suco de Laranja 1L",
      category: "Bebidas",
      brand: "Del Valle",
      unit: "caixa",
      averagePrice: 7.5,
      barcode: "7891234567906",
      description: "Suco integral",
      active: true,
    },
    {
      name: "Água Mineral 500ml",
      category: "Bebidas",
      brand: "Crystal",
      unit: "garrafa",
      averagePrice: 2.5,
      barcode: "7891234567907",
      description: "Água sem gás",
      active: true,
    },
    {
      name: "Cerveja Lata 350ml",
      category: "Bebidas",
      brand: "Brahma",
      unit: "lata",
      averagePrice: 3.9,
      barcode: "7891234567908",
      description: "Cerveja pilsen",
      active: true,
    },

    // Padaria
    {
      name: "Pão Francês",
      category: "Padaria",
      brand: "Padaria",
      unit: "kg",
      averagePrice: 14.9,
      barcode: "7891234567909",
      description: "Pão francês fresco",
      active: true,
    },
    {
      name: "Pão de Forma 500g",
      category: "Padaria",
      brand: "Pullman",
      unit: "pacote",
      averagePrice: 7.9,
      barcode: "7891234567910",
      description: "Pão integral",
      active: true,
    },
    {
      name: "Bolo Pronto 400g",
      category: "Padaria",
      brand: "Ana Maria",
      unit: "unidade",
      averagePrice: 12.9,
      barcode: "7891234567911",
      description: "Bolo de chocolate",
      active: true,
    },
    {
      name: "Biscoito Recheado 140g",
      category: "Padaria",
      brand: "Oreo",
      unit: "pacote",
      averagePrice: 4.5,
      barcode: "7891234567912",
      description: "Biscoito com recheio",
      active: true,
    },
  ];

  console.log(`Seeding ${items.length} items...`);

  items.forEach((item) => {
    const createdItem = db.create("items", item);
    console.log(`Created item: ${item.name} (ID: ${createdItem.id})`);
  });

  console.log("Items seeded successfully!");
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "item-service" });
});

// Get all items with pagination and filters
app.get("/items", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      search,
      active = "true",
      sortBy = "name",
      order = "asc",
    } = req.query;

    let items = db.find("items");

    // Filter by active status
    if (active !== "all") {
      items = items.filter((item) => item.active === (active === "true"));
    }

    // Filter by category
    if (category) {
      items = items.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by brand
    if (brand) {
      items = items.filter(
        (item) => item.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Search in name, description, or barcode
    if (search) {
      const searchTerm = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          item.barcode.includes(searchTerm)
      );
    }

    // Sort items
    items.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (order === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedItems = items.slice(startIndex, endIndex);

    res.json({
      items: paginatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(items.length / limit),
        totalItems: items.length,
        itemsPerPage: parseInt(limit),
      },
      filters: {
        category,
        brand,
        search,
        active,
        sortBy,
        order,
      },
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get item by ID
app.get("/items/:id", (req, res) => {
  try {
    const { id } = req.params;
    const item = db.findById("items", id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get item by barcode
app.get("/items/barcode/:barcode", (req, res) => {
  try {
    const { barcode } = req.params;
    const items = db.find("items");
    const item = items.find((item) => item.barcode === barcode);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching item by barcode:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get categories
app.get("/categories", (req, res) => {
  try {
    const items = db.find("items");
    const categories = [
      ...new Set(
        items.filter((item) => item.active).map((item) => item.category)
      ),
    ];

    res.json(categories.sort());
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get brands
app.get("/brands", (req, res) => {
  try {
    const { category } = req.query;
    let items = db.find("items");

    if (category) {
      items = items.filter(
        (item) =>
          item.active && item.category.toLowerCase() === category.toLowerCase()
      );
    } else {
      items = items.filter((item) => item.active);
    }

    const brands = [...new Set(items.map((item) => item.brand))];

    res.json(brands.sort());
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new item (requires authentication)
app.post("/items", authenticate, (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      unit,
      averagePrice,
      barcode,
      description,
      active = true,
    } = req.body;

    // Validation
    if (!name || !category || !brand || !unit || !averagePrice || !barcode) {
      return res.status(400).json({
        error:
          "Missing required fields: name, category, brand, unit, averagePrice, barcode",
      });
    }

    // Check if barcode already exists
    const existingItems = db.find("items");
    const existingItem = existingItems.find((item) => item.barcode === barcode);
    if (existingItem) {
      return res
        .status(409)
        .json({ error: "Item with this barcode already exists" });
    }

    const newItem = {
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      unit: unit.trim(),
      averagePrice: parseFloat(averagePrice),
      barcode: barcode.trim(),
      description: description ? description.trim() : "",
      active: Boolean(active),
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdItem = db.create("items", newItem);

    res.status(201).json(createdItem);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update item (requires authentication)
app.put("/items/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      brand,
      unit,
      averagePrice,
      barcode,
      description,
      active,
    } = req.body;

    const existingItem = db.findById("items", id);
    if (!existingItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if barcode is being changed and if new barcode already exists
    if (barcode && barcode !== existingItem.barcode) {
      const existingItems = db.find("items");
      const duplicateItem = existingItems.find(
        (item) => item.barcode === barcode && item.id !== id
      );
      if (duplicateItem) {
        return res
          .status(409)
          .json({ error: "Item with this barcode already exists" });
      }
    }

    const updatedData = {
      name: name !== undefined ? name.trim() : existingItem.name,
      category:
        category !== undefined ? category.trim() : existingItem.category,
      brand: brand !== undefined ? brand.trim() : existingItem.brand,
      unit: unit !== undefined ? unit.trim() : existingItem.unit,
      averagePrice:
        averagePrice !== undefined
          ? parseFloat(averagePrice)
          : existingItem.averagePrice,
      barcode: barcode !== undefined ? barcode.trim() : existingItem.barcode,
      description:
        description !== undefined
          ? description.trim()
          : existingItem.description,
      active: active !== undefined ? Boolean(active) : existingItem.active,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    };

    db.update("items", id, updatedData);
    const updatedItem = db.findById("items", id);

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete item (requires authentication)
app.delete("/items/:id", authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = db.findById("items", id);
    if (!existingItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    db.delete("items", id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk create items (requires authentication)
app.post("/items/bulk", authenticate, (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    const results = [];
    const errors = [];

    items.forEach((itemData, index) => {
      try {
        const {
          name,
          category,
          brand,
          unit,
          averagePrice,
          barcode,
          description,
          active = true,
        } = itemData;

        // Validation
        if (
          !name ||
          !category ||
          !brand ||
          !unit ||
          !averagePrice ||
          !barcode
        ) {
          errors.push({
            index,
            error: "Missing required fields",
            item: itemData,
          });
          return;
        }

        // Check if barcode already exists
        const existingItems = db.find("items");
        const existingItem = existingItems.find(
          (item) => item.barcode === barcode
        );
        if (existingItem) {
          errors.push({
            index,
            error: "Item with this barcode already exists",
            item: itemData,
          });
          return;
        }

        const newItem = {
          name: name.trim(),
          category: category.trim(),
          brand: brand.trim(),
          unit: unit.trim(),
          averagePrice: parseFloat(averagePrice),
          barcode: barcode.trim(),
          description: description ? description.trim() : "",
          active: Boolean(active),
          createdBy: req.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const createdItem = db.create("items", newItem);
        results.push(createdItem);
      } catch (error) {
        errors.push({
          index,
          error: error.message,
          item: itemData,
        });
      }
    });

    res.status(201).json({
      created: results,
      errors,
      summary: {
        total: items.length,
        created: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("Error in bulk create:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Advanced search items
app.post("/items/search", (req, res) => {
  try {
    const {
      query,
      categories = [],
      brands = [],
      priceRange = {},
      active = true,
      sortBy = "name",
      order = "asc",
      page = 1,
      limit = 20,
    } = req.body;

    let items = db.find("items");

    // Filter by active status
    if (active !== null) {
      items = items.filter((item) => item.active === active);
    }

    // Text search
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          item.barcode.includes(searchTerm) ||
          item.category.toLowerCase().includes(searchTerm) ||
          item.brand.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by categories
    if (categories.length > 0) {
      items = items.filter((item) =>
        categories
          .map((c) => c.toLowerCase())
          .includes(item.category.toLowerCase())
      );
    }

    // Filter by brands
    if (brands.length > 0) {
      items = items.filter((item) =>
        brands.map((b) => b.toLowerCase()).includes(item.brand.toLowerCase())
      );
    }

    // Filter by price range
    if (priceRange.min !== undefined) {
      items = items.filter((item) => item.averagePrice >= priceRange.min);
    }
    if (priceRange.max !== undefined) {
      items = items.filter((item) => item.averagePrice <= priceRange.max);
    }

    // Sort items
    items.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (order === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedItems = items.slice(startIndex, endIndex);

    res.json({
      items: paginatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(items.length / limit),
        totalItems: items.length,
        itemsPerPage: parseInt(limit),
      },
      filters: {
        query,
        categories,
        brands,
        priceRange,
        active,
        sortBy,
        order,
      },
    });
  } catch (error) {
    console.error("Error in advanced search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Statistics endpoint
app.get("/stats", (req, res) => {
  try {
    const items = db.find("items");
    const activeItems = items.filter((item) => item.active);

    const categoryStats = {};
    activeItems.forEach((item) => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = {
          count: 0,
          totalValue: 0,
          averagePrice: 0,
        };
      }
      categoryStats[item.category].count++;
      categoryStats[item.category].totalValue += item.averagePrice;
    });

    // Calculate average prices
    Object.keys(categoryStats).forEach((category) => {
      categoryStats[category].averagePrice =
        categoryStats[category].totalValue / categoryStats[category].count;
    });

    const brandStats = {};
    activeItems.forEach((item) => {
      if (!brandStats[item.brand]) {
        brandStats[item.brand] = 0;
      }
      brandStats[item.brand]++;
    });

    const priceStats = {
      min: Math.min(...activeItems.map((item) => item.averagePrice)),
      max: Math.max(...activeItems.map((item) => item.averagePrice)),
      average:
        activeItems.reduce((sum, item) => sum + item.averagePrice, 0) /
        activeItems.length,
    };

    res.json({
      totalItems: items.length,
      activeItems: activeItems.length,
      inactiveItems: items.length - activeItems.length,
      categories: Object.keys(categoryStats).length,
      brands: Object.keys(brandStats).length,
      categoryStats,
      brandStats,
      priceStats,
    });
  } catch (error) {
    console.error("Error generating stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Service registration and startup
const registry = getRegistry();

app.listen(PORT, () => {
  console.log(`Item Service running on port ${PORT}`);

  // Register service
  registry.register("item-service", {
    host: "localhost",
    port: PORT,
    metadata: {
      description: "Item management service",
      version: "1.0.0",
      endpoints: [
        "GET /health",
        "GET /items",
        "GET /items/:id",
        "GET /items/barcode/:barcode",
        "GET /categories",
        "GET /brands",
        "GET /stats",
        "POST /items",
        "PUT /items/:id",
        "DELETE /items/:id",
        "POST /items/bulk",
        "POST /items/search",
      ],
    },
  });

  // Seed initial data
  seedItems();
});
