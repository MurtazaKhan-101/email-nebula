const crypto = require("crypto");

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-32-character-encryption-key-here";
const ALGORITHM = "aes-256-gcm";

// Ensure the key is exactly 32 bytes for AES-256
const getKey = () => {
  if (ENCRYPTION_KEY.length >= 32) {
    return Buffer.from(ENCRYPTION_KEY.substring(0, 32), "utf8");
  } else {
    // Pad the key to 32 bytes
    const paddedKey = ENCRYPTION_KEY.padEnd(32, "0");
    return Buffer.from(paddedKey, "utf8");
  }
};

class Encryption {
  // Modern GCM encryption using createCipheriv (non-deprecated)
  static encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = getKey();

      // Use createCipheriv - the modern non-deprecated method
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  static decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const key = getKey();

      // Use createDecipheriv - the modern non-deprecated method
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, "hex")
      );
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  // Modern token encryption using createCipheriv
  static encryptToken(token) {
    try {
      const iv = crypto.randomBytes(16);
      const key = getKey();

      // Use createCipheriv - the modern non-deprecated method
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(token, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encrypted
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
      console.error("Token encryption error:", error);
      throw new Error("Failed to encrypt token");
    }
  }

  static decryptToken(encryptedToken) {
    try {
      const parts = encryptedToken.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted token format");
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const key = getKey();

      // Use createDecipheriv - the modern non-deprecated method
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Token decryption error:", error);
      throw new Error("Failed to decrypt token");
    }
  }
}

module.exports = Encryption;
