import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import JoinRequest from '../../models/JoinRequest';

describe('Organizations API — CRUD, membership, and RBAC', () => {
  let userToken: string;
  let userId: string;

  const createOwnedOrganization = async () => {
    const org = await Organization.create({
      name: 'Seed Org',
      createdBy: userId,
    });

    await Membership.create({
      user: userId,
      organization: org._id,
      role: 'owner',
    });

    return org;
  };

  beforeEach(async () => {
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

    const membership = await Membership.findOne({ user: userId, organization: res.body._id });
    expect(membership).toBeTruthy();
    expect(membership?.role).toBe('owner');
  });

  it('should get all organizations for a user', async () => {
    await createOwnedOrganization();

    const res = await request(app)
      .get('/api/organizations')
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should search, filter, and sort organization members', async () => {
    const org = await createOwnedOrganization();
    const admin = await User.create({
      name: 'Ada Admin',
      email: 'ada@test.com',
      password: 'password123',
    });
    const guest = await User.create({
      name: 'Gina Guest',
      email: 'gina@test.com',
      password: 'password123',
    });
    const member = await User.create({
      name: 'Mona Member',
      email: 'mona@test.com',
      password: 'password123',
    });

    await Membership.create([
      { user: admin._id, organization: org._id, role: 'admin' },
      { user: guest._id, organization: org._id, role: 'guest' },
      { user: member._id, organization: org._id, role: 'member' },
    ]);

    const searchRes = await request(app)
      .get(`/api/organizations/${org._id}/members?q=gina`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.map((membership: any) => membership.user.email)).toEqual(['gina@test.com']);

    const roleRes = await request(app)
      .get(`/api/organizations/${org._id}/members?role=admin`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(roleRes.status).toBe(200);
    expect(roleRes.body.map((membership: any) => membership.user.email)).toEqual(['ada@test.com']);

    const sortRes = await request(app)
      .get(`/api/organizations/${org._id}/members?sort=name-desc`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(sortRes.status).toBe(200);
    expect(sortRes.body.map((membership: any) => membership.user.name)).toEqual([
      'Org User',
      'Mona Member',
      'Gina Guest',
      'Ada Admin',
    ]);
    expect(sortRes.body[0].createdAt).toBeTruthy();
  });

  it('should add a member to the organization (RBAC: owner only)', async () => {
    const newUser = await User.create({
      name: 'New Member',
      email: 'member@test.com',
      password: 'password123',
    });

    const org = await createOwnedOrganization();

    const res = await request(app)
      .post(`/api/organizations/${org!._id}/members`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        email: 'member@test.com',
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('member@test.com');

    const membership = await Membership.findOne({ user: newUser._id, organization: org!._id });
    expect(membership).toBeTruthy();
    expect(membership?.role).toBe('member');
  });

  it('should fail adding member if not owner/admin (RBAC: regular member)', async () => {
    const memberUser = await User.create({
      name: 'Regular Member',
      email: 'regular@test.com',
      password: 'password123',
    });
    const org = await createOwnedOrganization();

    await Membership.create({ user: memberUser._id, organization: org!._id, role: 'member' });

    const memberToken = getTestToken(memberUser._id.toString());

    const res = await request(app)
      .post(`/api/organizations/${org!._id}/members`)
      .set('Cookie', [`jwt=${memberToken}`])
      .send({
        email: 'another@test.com',
        role: 'member',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/denied/i);
  });

  it('should update organization details (RBAC: owner only)', async () => {
    const org = await createOwnedOrganization();

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
    const org = await createOwnedOrganization();
    const memberUser = await User.create({
      name: 'Regular Member',
      email: 'regular@test.com',
      password: 'password123',
    });

    await Membership.create({
      user: memberUser._id,
      organization: org._id,
      role: 'member',
    });

    const memberToken = getTestToken(memberUser._id.toString());

    const res = await request(app)
      .put(`/api/organizations/${org!._id}`)
      .set('Cookie', [`jwt=${memberToken}`])
      .send({
        name: 'Unauthorized Edit',
      });

    expect(res.status).toBe(403);
  });

  it('should remove a non-owner member and block self-removal', async () => {
    const org = await createOwnedOrganization();
    const memberUser = await User.create({
      name: 'Removed Member',
      email: 'removed@test.com',
      password: 'password123',
    });

    await Membership.create({ user: memberUser._id, organization: org._id, role: 'member' });

    const removeRes = await request(app)
      .delete(`/api/organizations/${org._id}/members/${memberUser._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(removeRes.status).toBe(200);
    await expect(Membership.findOne({ user: memberUser._id, organization: org._id })).resolves.toBeNull();

    const selfRemoveRes = await request(app)
      .delete(`/api/organizations/${org._id}/members/${userId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(selfRemoveRes.status).toBe(403);
  });

  it('should enforce owner-only admin role management', async () => {
    const org = await createOwnedOrganization();
    const adminUser = await User.create({
      name: 'Org Admin',
      email: 'admin@test.com',
      password: 'password123',
    });
    const memberUser = await User.create({
      name: 'Promoted Member',
      email: 'promoted@test.com',
      password: 'password123',
    });

    await Membership.create([
      { user: adminUser._id, organization: org._id, role: 'admin' },
      { user: memberUser._id, organization: org._id, role: 'member' },
    ]);

    const adminToken = getTestToken(adminUser._id.toString());
    const adminPromoteRes = await request(app)
      .put(`/api/organizations/${org._id}/members/${memberUser._id}`)
      .set('Cookie', [`jwt=${adminToken}`])
      .send({ role: 'admin' });

    expect(adminPromoteRes.status).toBe(403);

    const ownerPromoteRes = await request(app)
      .put(`/api/organizations/${org._id}/members/${memberUser._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ role: 'admin' });

    expect(ownerPromoteRes.status).toBe(200);
    expect(ownerPromoteRes.body.role).toBe('admin');
  });

  it('should auto-join users when approval is not required', async () => {
    const joiner = await User.create({
      name: 'Open Joiner',
      email: 'open-joiner@test.com',
      password: 'password123',
    });
    const org = await Organization.create({
      name: 'Open Org',
      createdBy: userId,
      defaultProjectSettings: {
        requireApprovalToJoin: false,
      },
    });

    const res = await request(app)
      .post(`/api/organizations/${org._id}/join`)
      .set('Cookie', [`jwt=${getTestToken(joiner._id.toString())}`]);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('joined');

    const membership = await Membership.findOne({ user: joiner._id, organization: org._id });
    expect(membership?.role).toBe('member');
  });

  it('should scope join request resolution to the route organization', async () => {
    const firstOrg = await createOwnedOrganization();
    const secondOrgOwner = await User.create({
      name: 'Second Owner',
      email: 'second-owner@test.com',
      password: 'password123',
    });
    const requester = await User.create({
      name: 'Requester',
      email: 'requester@test.com',
      password: 'password123',
    });
    const secondOrg = await Organization.create({
      name: 'Second Org',
      createdBy: secondOrgOwner._id,
    });

    await Membership.create({
      user: secondOrgOwner._id,
      organization: secondOrg._id,
      role: 'owner',
    });
    const requestDoc = await JoinRequest.create({
      user: requester._id,
      organization: secondOrg._id,
      status: 'pending',
    });

    const res = await request(app)
      .post(`/api/organizations/${firstOrg._id}/requests/${requestDoc._id}/resolve`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ action: 'accept' });

    expect(res.status).toBe(404);
    await expect(Membership.findOne({ user: requester._id, organization: secondOrg._id })).resolves.toBeNull();
  });

  it('should preserve rejected join request history while allowing a new request', async () => {
    const org = await createOwnedOrganization();
    const requester = await User.create({
      name: 'Retry Requester',
      email: 'retry-requester@test.com',
      password: 'password123',
    });
    const requestDoc = await JoinRequest.create({
      user: requester._id,
      organization: org._id,
      status: 'pending',
    });

    const rejectRes = await request(app)
      .post(`/api/organizations/${org._id}/requests/${requestDoc._id}/resolve`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ action: 'reject' });

    expect(rejectRes.status).toBe(200);

    const retryRes = await request(app)
      .post(`/api/organizations/${org._id}/join`)
      .set('Cookie', [`jwt=${getTestToken(requester._id.toString())}`]);

    expect(retryRes.status).toBe(200);

    const joinRequest = await JoinRequest.findOne({ user: requester._id, organization: org._id });
    expect(joinRequest?.status).toBe('pending');
  });
});
