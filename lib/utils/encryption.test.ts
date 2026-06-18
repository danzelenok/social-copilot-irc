import { encrypt, decrypt } from './encryption';
import assert from 'assert';

// Set a mock 32-byte hex encryption key for testing (64 hex characters)
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

try {
  console.log('Running encryption unit tests...');
  
  const testPayloads = [
    'hello world',
    '{"telegram_token": "123456:ABC-DEF", "chat_id": "@channel"}',
    '',
    'special characters: !@#$%^&*()_+{}|:"<>?`-=[]\\;\',./',
    'A'.repeat(1000) // longer text
  ];

  for (const payload of testPayloads) {
    const encrypted = encrypt(payload);
    assert.ok(encrypted, 'Ciphertext should not be empty');
    assert.notStrictEqual(encrypted, payload, 'Ciphertext should be different from plaintext');
    
    // Ensure format is iv:authTag:ciphertext
    const parts = encrypted.split(':');
    assert.strictEqual(parts.length, 3, 'Ciphertext should have three parts separated by colons');
    
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, payload, `Decrypted value should match original payload. Got "${decrypted}", expected "${payload}"`);
  }

  console.log('✓ All encryption unit tests passed successfully!');
} catch (error) {
  console.error('✗ Encryption unit test failed:', error);
  process.exit(1);
}
