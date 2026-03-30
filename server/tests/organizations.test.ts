import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';

describe('Organizations API — CRUD, membership, and RBAC', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    // Setup initial user
    const user = await User.create({
      name: 'Org User',
      email: 'owner@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);
  });

  it('should create a new organization successfully', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Test Org',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Org');
    expect(res.body.createdBy).toBe(userId);
    
    // Check membership was created as owner
    const membership = await Membership.findOne({ user: userId, organization: res.body._id });
    expect(membership).toBeTruthy();
    expect(membership?.role).toBe('owner');
  });

  it('should get all organizations for a user', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should add a member to the organization (RBAC: owner only)', async () => {
    // Create new user to add
    const newUser = await User.create({
      name: 'New Member',
      email: 'member@test.com',
      password: 'password123',
    });

    const org = await Organization.findOne({ createdBy: userId });

    const res = await request(app)
      .post(`/api/organizations/${org!._id}/members`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        email: 'member@test.com',
        role: 'member',
      });

    expect(res.status).toBe(200);
    expect(res.body.members.length).toBeGreaterThan(1);
    
    // Ensure membership was created
    const membership = await Membership.findOne({ user: newUser._id, organization: org!._id });
    expect(membership).toBeTruthy();
    expect(membership?.role).toBe('member');
  });

  it('should fail adding member if not owner/admin (RBAC: regular member)', async () => {
    // Create a regular member
    const memberUser = await User.create({
      name: 'Regular Member',
      email: 'regular@test.com',
      password: 'password123',
    });
    const org = await Organization.findOne({ createdBy: userId });
    
    // Join then as a regular member
    await Membership.create({ user: memberUser._id, organization: org!._id, role: 'member' });
    
    const memberToken = getTestToken(memberUser._id.toString());
    
    const res = await request(app)
      .post(`/api/organizations/${org!._id}/members`)
      .set('Cookie', [`jwt=${memberToken}`])
      .send({
        email: 'another@test.com',
        role: 'member',
      });

    expect(res.status).toBe(403); // Forbidden
    expect(res.body.message).toMatch(/denied/i);
  });

  it('should update organization details (RBAC: owner only)', async () => {
    const org = await Organization.findOne({ createdBy: userId });
    
    const res = await request(app)
      .put(`/api/organizations/${org!._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Updated Org Name',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Org Name');
  });

  it('should fail update organization if not authorized', async () => {
    const memberUser = await User.findOne({ email: 'regular@test.com' });
    const memberToken = getTestToken(memberUser!._id.toString());
    const org = await Organization.findOne({ createdBy: userId });
    
    const res = await request(app)
      .put(`/api/organizations/${org!._id}`)
      .set('Cookie', [`jwt=${memberToken}`])
      .send({
        name: 'Unauthorized Edit',
      });

    expect(res.status).toBe(403);
  });
});
