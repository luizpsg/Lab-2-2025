// shared/JsonDatabase.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class JsonDatabase {
  constructor(dbName, dataDir = "./data") {
    this.dbName = dbName;
    this.dataDir = dataDir;
    this.filePath = path.join(this.dataDir, `${dbName}.json`);
    this.data = {};
    this.initDatabase();
  }

  initDatabase() {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load existing data or create new file
    if (fs.existsSync(this.filePath)) {
      try {
        const fileContent = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(fileContent);
      } catch (error) {
        console.error(`Error loading database ${this.dbName}:`, error);
        this.data = {};
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error(`Error saving database ${this.dbName}:`, error);
    }
  }

  generateId() {
    return crypto.randomBytes(16).toString("hex");
  }

  // CRUD Operations
  create(collection, document) {
    if (!this.data[collection]) {
      this.data[collection] = {};
    }

    const id = document.id || this.generateId();
    const timestamp = new Date().toISOString();

    const newDocument = {
      ...document,
      id,
      createdAt: document.createdAt || timestamp,
      updatedAt: timestamp,
    };

    this.data[collection][id] = newDocument;
    this.save();
    return newDocument;
  }

  findById(collection, id) {
    if (!this.data[collection]) return null;
    return this.data[collection][id] || null;
  }

  find(collection, query = {}) {
    if (!this.data[collection]) return [];

    const documents = Object.values(this.data[collection]);

    if (Object.keys(query).length === 0) {
      return documents;
    }

    return documents.filter((doc) => {
      return Object.entries(query).every(([key, value]) => {
        // Support nested queries (e.g., "user.id")
        const keys = key.split(".");
        let currentValue = doc;

        for (const k of keys) {
          currentValue = currentValue?.[k];
        }

        // Support different operators
        if (typeof value === "object" && value !== null) {
          if ("$regex" in value) {
            const regex = new RegExp(value.$regex, value.$options || "i");
            return regex.test(currentValue);
          }
          if ("$in" in value) {
            return value.$in.includes(currentValue);
          }
          if ("$gt" in value) {
            return currentValue > value.$gt;
          }
          if ("$lt" in value) {
            return currentValue < value.$lt;
          }
        }

        return currentValue === value;
      });
    });
  }

  findOne(collection, query) {
    const results = this.find(collection, query);
    return results.length > 0 ? results[0] : null;
  }

  update(collection, id, updates) {
    if (!this.data[collection] || !this.data[collection][id]) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const updatedDocument = {
      ...this.data[collection][id],
      ...updates,
      id, // Preserve original ID
      createdAt: this.data[collection][id].createdAt, // Preserve creation date
      updatedAt: timestamp,
    };

    this.data[collection][id] = updatedDocument;
    this.save();
    return updatedDocument;
  }

  delete(collection, id) {
    if (!this.data[collection] || !this.data[collection][id]) {
      return false;
    }

    delete this.data[collection][id];
    this.save();
    return true;
  }

  // Utility methods
  count(collection, query = {}) {
    return this.find(collection, query).length;
  }

  exists(collection, query) {
    return this.findOne(collection, query) !== null;
  }

  clear(collection) {
    if (collection) {
      this.data[collection] = {};
    } else {
      this.data = {};
    }
    this.save();
  }

  // Aggregate operations
  aggregate(collection, pipeline) {
    let documents = this.find(collection);

    for (const stage of pipeline) {
      if (stage.$match) {
        documents = documents.filter((doc) => {
          return Object.entries(stage.$match).every(
            ([key, value]) => doc[key] === value
          );
        });
      }

      if (stage.$group) {
        const groups = {};
        const { _id, ...aggregations } = stage.$group;

        documents.forEach((doc) => {
          const groupKey = doc[_id.replace("$", "")];
          if (!groups[groupKey]) {
            groups[groupKey] = { _id: groupKey };

            Object.entries(aggregations).forEach(([field, operation]) => {
              if (operation.$sum === 1) {
                groups[groupKey][field] = 0;
              } else if (typeof operation.$sum === "string") {
                groups[groupKey][field] = 0;
              }
            });
          }

          Object.entries(aggregations).forEach(([field, operation]) => {
            if (operation.$sum === 1) {
              groups[groupKey][field]++;
            } else if (typeof operation.$sum === "string") {
              const value = doc[operation.$sum.replace("$", "")];
              groups[groupKey][field] += value || 0;
            }
          });
        });

        documents = Object.values(groups);
      }

      if (stage.$sort) {
        const [field, order] = Object.entries(stage.$sort)[0];
        documents.sort((a, b) => {
          if (order === 1) return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }
    }

    return documents;
  }
}

module.exports = JsonDatabase;
