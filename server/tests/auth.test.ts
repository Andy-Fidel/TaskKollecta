import { it, expect, describe } from 'vitest';
import request from 'supertest';
import { app } from './setup';
import User from '../models/User';

describe('Auth API — registration and login', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'Test Artist',
        email: 'artist@test.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.email).toBe('artist@test.com');
    expect(res.body).toHaveProperty('token');
    
    // Ensure user was actually saved in DB
    const user = await User.findOne({ email: 'artist@test.com' });
    expect(user).toBeTruthy();
  });

  it('should fail registration with duplicate email', async () => {
    // Save user first
    await User.create({
      name: 'Existing User',
      email: 'duplicate@test.com',
      password: 'password123',
    });

    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'Another User',
        email: 'duplicate@test.com',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should login successfully with valid credentials', async () => {
    // Register user first
    await request(app)
      .post('/api/users')
      .send({
        name: 'Login User',
        email: 'login@test.com',
        password: 'password123',
      });

    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'login@test.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should fail login with wrong password', async () => {
    // Create user
    await User.create({
      name: 'Login User',
      email: 'wrong-pass@test.com',
      password: 'password123',
    });

    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'wrong-pass@test.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('should prevent unauthorized access to protected routes', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
