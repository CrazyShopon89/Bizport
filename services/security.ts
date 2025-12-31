
export const SecurityService = {
  /**
   * Simple synchronous hash function for client-side storage simulation.
   * In a real app, use bcrypt/argon2 on the server.
   */
  hashPassword: (password: string): string => {
    // Simple transformation to simulate hashing (Base64 of reversed string + salt)
    // This is NOT secure for production backend, but sufficient for this frontend-only mock.
    return btoa(password.split('').reverse().join('') + "_HM_SALT");
  },

  /**
   * Verify password against hash
   */
  verifyPassword: (password: string, hash: string): boolean => {
    return SecurityService.hashPassword(password) === hash;
  },

  /**
   * Generate a strong random password
   */
  generateStrongPassword: (length: number = 12): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  },

  /**
   * Basic Input Sanitization to prevent simple injection in UI
   */
  sanitizeInput: (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Validate password complexity
   * Min 8 chars, 1 uppercase, 1 lowercase, 1 number
   */
  validatePasswordStrength: (password: string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  },

  /**
   * Obfuscate sensitive data (like SMTP pass) for local storage
   */
  encryptData: (data: string): string => {
    return btoa(data); // Simple obfuscation for mock
  },

  decryptData: (data: string): string => {
    try {
      return atob(data);
    } catch {
      return '';
    }
  }
};
