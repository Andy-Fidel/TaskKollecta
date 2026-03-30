import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Set test environment variables immediately
process.env.JWT_SECRET = 'testsecret';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test'; // Garbage URI, doesn't matter, we'll override

// Mock Redis before anything else imports it
vi.mock('../config/redisClient', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(null),
    disconnect: vi.fn().mockResolvedValue(null),
  },
  isRedisConnected: () => false,
}));

// @ts-ignore
const { app } = require('../server');
console.log('--- TEST APP LOADED ---', !!app);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  // Set test environment variables
  process.env.JWT_SECRET = 'testsecret';
  process.env.NODE_ENV = 'test';

  // Start in-memory mongodb
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // If already connected, disconnect first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clear all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * Helper to generate a valid JWT for testing
 */
export const getTestToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '24h',
  });
};

/**
 * Shared test app instance
 */
export { app };
