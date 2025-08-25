const mongodb = require("./mongodb");

class DatabaseFactory {
  constructor() {
    console.log("🍃 Using MongoDB database");
    this.db = mongodb;
  }

  // Initialize database connection
  async init() {
    await this.db.connect();
  }

  // User operations
  async createUser(userData) {
    const result = await this.db.insertOne("users", userData);
    return { id: result.id, changes: 1 };
  }

  async getUserByEmail(email) {
    return await this.db.findOne("users", { email });
  }

  async getUserById(userId) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof userId === "string" && ObjectId.isValid(userId)
          ? new ObjectId(userId)
          : userId;
      return await this.db.findOne("users", { _id: id });
    } catch (error) {
      console.error("MongoDB getUserById error:", error);
      return null;
    }
  }

  async updateUserPassword(userId, passwordHash) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof userId === "string" && ObjectId.isValid(userId)
          ? new ObjectId(userId)
          : userId;
      return await this.db.updateOne(
        "users",
        { _id: id },
        { $set: { password_hash: passwordHash } }
      );
    } catch (error) {
      console.error("MongoDB updateUserPassword error:", error);
      return { changes: 0 };
    }
  }

  async updateUser(userId, updates) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof userId === "string" && ObjectId.isValid(userId)
          ? new ObjectId(userId)
          : userId;
      return await this.db.updateOne("users", { _id: id }, { $set: updates });
    } catch (error) {
      console.error("MongoDB updateUser error:", error);
      return { changes: 0 };
    }
  }

  // Gmail credentials operations
  async saveGmailCredentials(credData) {
    // Try to update existing, if not found, insert new
    const existing = await this.db.findOne("gmail_credentials", {
      user_id: credData.user_id,
      email: credData.email,
    });

    if (existing) {
      return await this.db.updateOne(
        "gmail_credentials",
        { user_id: credData.user_id, email: credData.email },
        { $set: credData }
      );
    } else {
      return await this.db.insertOne("gmail_credentials", credData);
    }
  }

  async getGmailCredentials(userId, email = null) {
    const filter = { user_id: userId, is_active: true };
    if (email) filter.email = email;
    return await this.db.findOne("gmail_credentials", filter);
  }

  async disconnectGmail(userId) {
    return await this.db.updateMany(
      "gmail_credentials",
      { user_id: userId },
      { $set: { is_active: false } }
    );
  }

  // Email campaign operations
  async createCampaign(campaignData) {
    console.log("🔨 MongoDB createCampaign - Input data:", campaignData);
    const result = await this.db.insertOne("email_campaigns", campaignData);
    console.log("🔨 MongoDB createCampaign - Insert result:", result);
    console.log("🔨 MongoDB createCampaign - Generated ID:", result.id);
    return { id: result.id, changes: 1 };
  }

  async getCampaign(campaignId) {
    const { ObjectId } = require("mongodb");
    console.log(
      "🔍 MongoDB getCampaign - Input ID:",
      campaignId,
      "Type:",
      typeof campaignId
    );

    try {
      const id =
        typeof campaignId === "string" ? new ObjectId(campaignId) : campaignId;
      console.log("🔍 MongoDB getCampaign - Converted ObjectId:", id);

      const campaign = await this.db.findOne("email_campaigns", { _id: id });
      console.log("🔍 MongoDB getCampaign - Found campaign:", !!campaign);

      // Normalize _id to id for compatibility
      if (campaign && campaign._id) {
        campaign.id = campaign._id.toString();
        console.log("🔍 MongoDB getCampaign - Normalized ID:", campaign.id);
      }
      return campaign;
    } catch (error) {
      console.error("❌ MongoDB getCampaign error:", error);
      return null;
    }
  }

  async getUserCampaigns(userId, limit = 10, offset = 0) {
    // MongoDB aggregation to get campaign stats
    const pipeline = [
      { $match: { user_id: userId } },
      {
        $lookup: {
          from: "email_logs",
          localField: "_id",
          foreignField: "campaign_id",
          as: "logs",
        },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
          // Use stored counts if available, otherwise calculate from logs
          sent_count: {
            $ifNull: [
              "$sent_count",
              {
                $size: {
                  $filter: {
                    input: "$logs",
                    cond: { $eq: ["$$this.status", "sent"] },
                  },
                },
              },
            ],
          },
          failed_count: {
            $ifNull: [
              "$failed_count",
              {
                $size: {
                  $filter: {
                    input: "$logs",
                    cond: { $eq: ["$$this.status", "failed"] },
                  },
                },
              },
            ],
          },
          total_recipients: { $ifNull: ["$total_recipients", 0] },
          // Calculate progress percentage
          progress_percentage: {
            $ifNull: [
              "$progress_percentage",
              {
                $cond: {
                  if: { $gt: ["$total_recipients", 0] },
                  then: {
                    $round: [
                      {
                        $multiply: [
                          {
                            $divide: [
                              {
                                $ifNull: [
                                  "$sent_count",
                                  {
                                    $size: {
                                      $filter: {
                                        input: "$logs",
                                        cond: {
                                          $eq: ["$$this.status", "sent"],
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                              "$total_recipients",
                            ],
                          },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                  else: 0,
                },
              },
            ],
          },
        },
      },
      { $sort: { created_at: -1 } },
      { $skip: offset },
      { $limit: limit },
    ];

    return await this.db.aggregate("email_campaigns", pipeline);
  }

  async updateCampaignStatus(campaignId, status, updates = {}) {
    const { ObjectId } = require("mongodb");
    const finalUpdates = { ...updates, status };

    try {
      const id =
        typeof campaignId === "string" ? new ObjectId(campaignId) : campaignId;

      console.log("🔄 Updating campaign status:", campaignId, "to:", status);
      const result = await this.db.updateOne(
        "email_campaigns",
        { _id: id },
        { $set: finalUpdates }
      );
      console.log("✅ Campaign status update result:", result);
      return result;
    } catch (error) {
      console.error("❌ MongoDB updateCampaignStatus error:", error);
      return { matchedCount: 0, modifiedCount: 0 };
    }
  }

  async updateCampaign(campaignId, updates) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof campaignId === "string" ? new ObjectId(campaignId) : campaignId;
      return await this.db.updateOne(
        "email_campaigns",
        { _id: id },
        { $set: updates }
      );
    } catch (error) {
      console.error("❌ MongoDB updateCampaign error:", error);
      return { matchedCount: 0, modifiedCount: 0 };
    }
  }

  async deleteCampaign(campaignId) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof campaignId === "string" ? new ObjectId(campaignId) : campaignId;
      return await this.db.deleteOne("email_campaigns", { _id: id });
    } catch (error) {
      console.error("❌ MongoDB deleteCampaign error:", error);
      return { deletedCount: 0 };
    }
  }

  // Email log operations
  async logEmail(logData) {
    return await this.db.insertOne("email_logs", logData);
  }

  async getCampaignLogs(campaignId, limit = 100, offset = 0) {
    const { ObjectId } = require("mongodb");
    try {
      const id =
        typeof campaignId === "string" ? new ObjectId(campaignId) : campaignId;
      const filter = { campaign_id: id };
      const options = {
        sort: { created_at: -1 },
        limit,
        skip: offset,
      };
      return await this.db.find("email_logs", filter, options);
    } catch (error) {
      console.error("❌ MongoDB getCampaignLogs error:", error);
      return [];
    }
  }

  // Close database connection
  async close() {
    await this.db.close();
  }
}

module.exports = new DatabaseFactory();
