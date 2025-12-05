const crypto = require('crypto');

/**
 * Airtel PIN Encryption Utility
 * Implements RSA encryption with:
 * - Mode: ECB
 * - Padding: OAEPWithSHA-256AndMGF1Padding
 * - Key Length: 2048-bit
 */
class AirtelEncryption {
  /**
   * Encrypt PIN using RSA-OAEP with SHA-256 and MGF1
   * Algorithm: RSA-OAEP with SHA-256 and MGF1 padding
   * Key Length: 2048-bit
   * Mode: ECB (implicit for RSA)
   * @param {string} plaintext - The PIN to encrypt
   * @param {string} publicKeyPEM - The RSA public key in PEM format
   * @returns {string} Base64 encoded encrypted PIN
   */
  static encryptPIN(plaintext, publicKeyPEM) {
    try {
      // Ensure public key is in proper PEM format
      let formattedKey = publicKeyPEM;
      
      // If key doesn't have headers, add them
      if (!formattedKey.includes('-----BEGIN')) {
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
      }

      // Encrypt using RSA-OAEP with SHA-256
      // Node.js crypto.publicEncrypt with oaepHash: 'sha256' uses:
      // - OAEP padding
      // - SHA-256 for the hash function
      // - MGF1 with SHA-256 (automatically used when oaepHash is specified)
      const encrypted = crypto.publicEncrypt(
        {
          key: formattedKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256', // This sets both the hash and MGF1 to use SHA-256
        },
        Buffer.from(plaintext, 'utf8')
      );

      // Return base64 encoded string
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`PIN encryption failed: ${error.message}`);
    }
  }

  /**
   * Format public key from Airtel API response
   * Converts the key string to proper PEM format
   * @param {string} keyString - The key string from Airtel API
   * @returns {string} Formatted PEM key
   */
  static formatPublicKey(keyString) {
    try {
      // Remove any existing headers/footers
      let cleanKey = keyString
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');

      // Add proper PEM headers
      return `-----BEGIN PUBLIC KEY-----\n${cleanKey}\n-----END PUBLIC KEY-----`;
    } catch (error) {
      throw new Error(`Key formatting failed: ${error.message}`);
    }
  }

  /**
   * Encrypt PIN using public key from Airtel encryption keys API
   * @param {string} plaintext - The PIN to encrypt
   * @param {object} encryptionKeyData - The encryption key data from Airtel API
   * @returns {object} Encrypted PIN with key_id
   */
  static encryptPINWithKey(plaintext, encryptionKeyData) {
    try {
      if (!encryptionKeyData || !encryptionKeyData.data || !encryptionKeyData.data.key) {
        throw new Error('Invalid encryption key data');
      }

      const publicKey = this.formatPublicKey(encryptionKeyData.data.key);
      const encryptedPIN = this.encryptPIN(plaintext, publicKey);

      return {
        key_id: encryptionKeyData.data.key_id,
        encrypted_pin: encryptedPIN,
        valid_upto: encryptionKeyData.data.valid_upto
      };
    } catch (error) {
      throw new Error(`PIN encryption with key failed: ${error.message}`);
    }
  }

  /**
   * Validate encryption key expiration
   * @param {object} encryptionKeyData - The encryption key data from Airtel API
   * @returns {boolean} True if key is valid, false if expired
   */
  static isKeyValid(encryptionKeyData) {
    try {
      if (!encryptionKeyData || !encryptionKeyData.data || !encryptionKeyData.data.valid_upto) {
        return false;
      }

      const expiryDate = new Date(encryptionKeyData.data.valid_upto);
      const now = new Date();

      return expiryDate > now;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AirtelEncryption;

