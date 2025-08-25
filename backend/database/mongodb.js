const { MongoClient } = require("mongodb");

class MongoDB {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Get MongoDB connection string from environment variables
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is not set");
      }

      console.log("🔄 Connecting to MongoDB...");

      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        retryWrites: true, // Retry failed writes
        retryReads: true, // Retry failed reads
        heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
      });

      await this.client.connect();

      // Get database name from URI or use default
      const dbName = process.env.MONGODB_DB_NAME || "bulk_email_platform";
      this.db = this.client.db(dbName);

      this.isConnected = true;
      console.log(`✅ Connected to MongoDB database: ${dbName}`);

      // Create indexes for better performance
      await this.createIndexes();

      return this.db;
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      console.log("🔄 Creating MongoDB indexes...");

      // Users collection indexes
      await this.db
        .collection("users")
        .createIndex({ email: 1 }, { unique: true });

      // Gmail credentials indexes
      await this.db.collection("gmail_credentials").createIndex({ user_id: 1 });
      await this.db.collection("gmail_credentials").createIndex({ email: 1 });
      await this.db
        .collection("gmail_credentials")
        .createIndex({ user_id: 1, email: 1 }, { unique: true });

      // Email campaigns indexes
      await this.db.collection("email_campaigns").createIndex({ user_id: 1 });
      await this.db.collection("email_campaigns").createIndex({ status: 1 });
      await this.db
        .collection("email_campaigns")
        .createIndex({ created_at: -1 });

      // Email logs indexes
      await this.db.collection("email_logs").createIndex({ campaign_id: 1 });
      await this.db
        .collection("email_logs")
        .createIndex({ recipient_email: 1 });
      await this.db.collection("email_logs").createIndex({ status: 1 });
      await this.db.collection("email_logs").createIndex({ sent_at: -1 });

      console.log("✅ MongoDB indexes created successfully");
    } catch (error) {
      console.error("⚠️ Error creating indexes:", error);
      // Don't throw error for index creation failures
    }
  }

  // Ensure connection is available
  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.db;
  }

  // Get collection
  collection(name) {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db.collection(name);
  }

  // Helper method to insert a document (equivalent to SQLite run with INSERT)
  async insertOne(collection, document) {
    const db = await this.ensureConnection();
    const result = await db.collection(collection).insertOne({
      ...document,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: result.insertedId, changes: 1 };
  }

  // Helper method to find one document (equivalent to SQLite get)
  async findOne(collection, filter) {
    const db = await this.ensureConnection();
    return await db.collection(collection).findOne(filter);
  }

  // Helper method to find multiple documents (equivalent to SQLite all)
  async find(collection, filter = {}, options = {}) {
    const db = await this.ensureConnection();
    return await db.collection(collection).find(filter, options).toArray();
  }

  // Helper method to update a document (equivalent to SQLite run with UPDATE)
  async updateOne(collection, filter, update) {
    const db = await this.ensureConnection();
    const result = await db.collection(collection).updateOne(filter, {
      ...update,
      $set: {
        ...update.$set,
        updated_at: new Date(),
      },
    });
    return { changes: result.modifiedCount };
  }

  // Helper method to update multiple documents
  async updateMany(collection, filter, update) {
    const db = await this.ensureConnection();
    const result = await db.collection(collection).updateMany(filter, {
      ...update,
      $set: {
        ...update.$set,
        updated_at: new Date(),
      },
    });
    return { changes: result.modifiedCount };
  }

  // Helper method to delete a document (equivalent to SQLite run with DELETE)
  async deleteOne(collection, filter) {
    const db = await this.ensureConnection();
    const result = await db.collection(collection).deleteOne(filter);
    return { changes: result.deletedCount };
  }

  // Helper method to delete multiple documents
  async deleteMany(collection, filter) {
    const db = await this.ensureConnection();
    const result = await db.collection(collection).deleteMany(filter);
    return { changes: result.deletedCount };
  }

  // Helper method to count documents
  async count(collection, filter = {}) {
    const db = await this.ensureConnection();
    return await db.collection(collection).countDocuments(filter);
  }

  // Helper method for aggregation pipelines
  async aggregate(collection, pipeline) {
    const db = await this.ensureConnection();
    return await db.collection(collection).aggregate(pipeline).toArray();
  }

  // Close connection
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log("📴 MongoDB connection closed");
    }
  }

  // Legacy compatibility methods to match SQLite interface
  async run(collection, operation, filter, data) {
    switch (operation) {
      case "INSERT":
        return await this.insertOne(collection, data);
      case "UPDATE":
        return await this.updateOne(collection, filter, { $set: data });
      case "DELETE":
        return await this.deleteOne(collection, filter);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async get(collection, filter) {
    return await this.findOne(collection, filter);
  }

  async all(collection, filter = {}, options = {}) {
    return await this.find(collection, filter, options);
  }
}

module.exports = new MongoDB();
