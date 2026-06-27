import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import AdminAuditLog from '../models/AdminAuditLog';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Task from '../models/Task';

const password = 'password123';

const createUser = async (overrides: Record<string, unknown> = {}) => User.create({
  name: 'Test User',
  email: `user-${Date.now()}-${Math.random()}@test.com`,
  password,
  role: 'user',
  status: 'active',
  ...overrides,
});

const authCookie = (user: any) => [`jwt=${getTestToken(user._id.toString())}`];

describe('Superadmin API controls', () => {
  it('requires a reason and writes an audit log for user suspension', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Target User', email: 'target@test.com' });

    const missingReason = await request(app)
      .put(`/api/admin/users/${target._id}/suspend`)
      .set('Cookie', authCookie(admin))
      .send({});

    expect(missingReason.status).toBe(400);
    expect(await AdminAuditLog.countDocuments()).toBe(0);

    const res = await request(app)
      .put(`/api/admin/users/${target._id}/suspend`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Terms of service investigation' });

    expect(res.status).toBe(200);

    const updated = await User.findById(target._id);
    expect(updated?.status).toBe('suspended');
    expect(updated?.suspendReason).toBe('Terms of service investigation');

    const audit = await AdminAuditLog.findOne({ action: 'user.suspend' });
    expect(audit).toBeTruthy();
    expect(audit?.actor.toString()).toBe(admin._id.toString());
    expect(audit?.target?.toString()).toBe(target._id.toString());
    expect(audit?.reason).toBe('Terms of service investigation');
    expect(audit?.before.status).toBe('active');
    expect(audit?.after.status).toBe('suspended');
    expect(audit?.correlationId).toBeTruthy();
  });

  it('requires re-authentication for bans and records before/after state', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Target User', email: 'target@test.com' });

    const denied = await request(app)
      .put(`/api/admin/users/${target._id}/ban`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Confirmed abuse report' });

    expect(denied.status).toBe(401);
    expect(await AdminAuditLog.countDocuments({ action: 'user.ban' })).toBe(0);

    const res = await request(app)
      .put(`/api/admin/users/${target._id}/ban`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Confirmed abuse report', currentPassword: password });

    expect(res.status).toBe(200);

    const audit = await AdminAuditLog.findOne({ action: 'user.ban' });
    expect(audit?.before.status).toBe('active');
    expect(audit?.after.status).toBe('banned');
    expect(audit?.reason).toBe('Confirmed abuse report');
  });

  it('sends reset links without changing the password directly', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Target User', email: 'target@test.com' });
    const before = await User.findById(target._id).select('password');

    const res = await request(app)
      .post(`/api/admin/users/${target._id}/reset-password`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'User requested support reset', currentPassword: password });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);

    const after = await User.findById(target._id).select('password resetPasswordToken resetPasswordExpire');
    expect(after?.password).toBe(before?.password);
    expect(after?.resetPasswordToken).toBeTruthy();
    expect(after?.resetPasswordExpire?.getTime()).toBeGreaterThan(Date.now());
    expect(await AdminAuditLog.countDocuments({ action: 'user.password_reset_link' })).toBe(1);
  });

  it('prevents demoting the last active superadmin and audits allowed role changes', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });

    const blocked = await request(app)
      .put(`/api/admin/users/${admin._id}/role`)
      .set('Cookie', authCookie(admin))
      .send({ role: 'admin', reason: 'Testing last admin guard', currentPassword: password });

    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/last active superadmin/i);

    await createUser({ name: 'Backup Admin', email: 'backup@test.com', role: 'superadmin' });

    const allowed = await request(app)
      .put(`/api/admin/users/${admin._id}/role`)
      .set('Cookie', authCookie(admin))
      .send({ role: 'admin', reason: 'Rotating platform ownership', currentPassword: password });

    expect(allowed.status).toBe(200);

    const updated = await User.findById(admin._id);
    expect(updated?.role).toBe('admin');

    const audit = await AdminAuditLog.findOne({ action: 'user.role_change' });
    expect(audit?.before.role).toBe('superadmin');
    expect(audit?.after.role).toBe('admin');
  });

  it('starts and returns from audited short-lived impersonation sessions', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Target User', email: 'target@test.com' });

    const start = await request(app)
      .post(`/api/admin/users/${target._id}/impersonate`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Support reproduction', currentPassword: password });

    expect(start.status).toBe(200);
    expect(start.body.token).toBeTruthy();
    expect(start.body.isImpersonated).toBe(true);
    expect(start.body.impersonationExpiresAt).toBeTruthy();

    const startAudit = await AdminAuditLog.findOne({ action: 'user.impersonate_start' });
    expect(startAudit?.target?.toString()).toBe(target._id.toString());
    expect(startAudit?.reason).toBe('Support reproduction');

    const returned = await request(app)
      .post('/api/admin/impersonation/return')
      .set('Cookie', [`jwt=${start.body.token}`]);

    expect(returned.status).toBe(200);
    expect(returned.body.role).toBe('superadmin');
    expect(returned.body.email).toBe(admin.email);
    expect(returned.body.token).toBeTruthy();
    expect(await AdminAuditLog.countDocuments({ action: 'user.impersonate_return' })).toBe(1);
  });

  it('exposes audit logs to superadmins only', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const member = await createUser({ name: 'Member', email: 'member@test.com', role: 'user' });

    await AdminAuditLog.create({
      actor: admin._id,
      target: member._id,
      action: 'user.suspend',
      reason: 'Review',
      before: { status: 'active' },
      after: { status: 'suspended' },
      ip: '127.0.0.1',
      userAgent: 'test',
      correlationId: 'test-correlation-id',
    });

    const denied = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', authCookie(member));

    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', authCookie(admin));

    expect(allowed.status).toBe(200);
    expect(allowed.body.logs).toHaveLength(1);
    expect(allowed.body.logs[0].actor.email).toBe(admin.email);
    expect(allowed.body.logs[0].target.email).toBe(member.email);
  });

  it('filters, sorts, and exports users for superadmins', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const owner = await createUser({
      name: 'Alice Owner',
      email: 'alice@test.com',
      role: 'admin',
      lastLogin: new Date('2026-01-01T00:00:00.000Z'),
      onboardingCompleted: true,
      googleId: 'google-1',
    });
    await createUser({
      name: 'Bob Member',
      email: 'bob@test.com',
      role: 'user',
      lastLogin: new Date('2026-06-01T00:00:00.000Z'),
    });
    const org = await Organization.create({ name: 'Tenant A', createdBy: owner._id });
    await Membership.create({ organization: org._id, user: owner._id, role: 'owner' });

    const filtered = await request(app)
      .get(`/api/admin/users?role=admin&organization=${org._id}&oauthProvider=google&onboardingState=completed&sortBy=email&sortDir=asc`)
      .set('Cookie', authCookie(admin));

    expect(filtered.status).toBe(200);
    expect(filtered.body.users).toHaveLength(1);
    expect(filtered.body.users[0].email).toBe('alice@test.com');

    const csv = await request(app)
      .get(`/api/admin/users/export?role=admin&organization=${org._id}`)
      .set('Cookie', authCookie(admin));

    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Alice Owner');
    expect(csv.text).toContain('OAuth Provider');
  });

  it('lists organization tenants with counts and returns tenant details', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const owner = await createUser({ name: 'Tenant Owner', email: 'owner@test.com' });
    const org = await Organization.create({ name: 'Tenant A', createdBy: owner._id });
    await Membership.create({ organization: org._id, user: owner._id, role: 'owner' });
    const project = await Project.create({ name: 'Project A', organization: org._id, createdBy: owner._id });
    await Task.create({ title: 'Task A', organization: org._id, project: project._id, reporter: owner._id, status: 'todo' });

    const list = await request(app)
      .get('/api/admin/organizations?search=Tenant')
      .set('Cookie', authCookie(admin));

    expect(list.status).toBe(200);
    expect(list.body.organizations).toHaveLength(1);
    expect(list.body.organizations[0].memberCount).toBe(1);
    expect(list.body.organizations[0].projectCount).toBe(1);
    expect(list.body.organizations[0].taskCount).toBe(1);

    const detail = await request(app)
      .get(`/api/admin/organizations/${org._id}`)
      .set('Cookie', authCookie(admin));

    expect(detail.status).toBe(200);
    expect(detail.body.counts.members).toBe(1);
    expect(detail.body.counts.projects).toBe(1);
    expect(detail.body.counts.tasks).toBe(1);
    expect(detail.body.health.hasOwner).toBe(true);
    expect(detail.body.storage.status).toBe('limited');
  });

  it('suspends organizations and transfers tenant ownership with audit logs', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const owner = await createUser({ name: 'Tenant Owner', email: 'owner@test.com' });
    const nextOwner = await createUser({ name: 'Next Owner', email: 'next@test.com' });
    const org = await Organization.create({ name: 'Tenant A', createdBy: owner._id });
    await Membership.create({ organization: org._id, user: owner._id, role: 'owner' });
    await Membership.create({ organization: org._id, user: nextOwner._id, role: 'member' });

    const suspended = await request(app)
      .put(`/api/admin/organizations/${org._id}/suspend`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Billing risk review' });

    expect(suspended.status).toBe(200);
    expect(suspended.body.organization.status).toBe('suspended');
    expect(await AdminAuditLog.countDocuments({ action: 'organization.suspend' })).toBe(1);

    const transferred = await request(app)
      .put(`/api/admin/organizations/${org._id}/transfer-owner`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Owner left company', currentPassword: password, newOwnerId: nextOwner._id });

    expect(transferred.status).toBe(200);

    const updatedOrg = await Organization.findById(org._id);
    expect(updatedOrg?.createdBy.toString()).toBe(nextOwner._id.toString());
    const oldMembership = await Membership.findOne({ organization: org._id, user: owner._id });
    const newMembership = await Membership.findOne({ organization: org._id, user: nextOwner._id });
    expect(oldMembership?.role).toBe('admin');
    expect(newMembership?.role).toBe('owner');
    expect(await AdminAuditLog.countDocuments({ action: 'organization.owner_transfer' })).toBe(1);
  });

  it('blocks member access to suspended tenants and restores access after activation', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const owner = await createUser({ name: 'Tenant Owner', email: 'owner@test.com' });
    const org = await Organization.create({ name: 'Tenant A', createdBy: owner._id });
    await Membership.create({ organization: org._id, user: owner._id, role: 'owner' });

    const beforeSuspend = await request(app)
      .get(`/api/projects/${org._id}`)
      .set('Cookie', authCookie(owner));

    expect(beforeSuspend.status).toBe(200);

    await request(app)
      .put(`/api/admin/organizations/${org._id}/suspend`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Security incident review' });

    const blockedByRoleGuard = await request(app)
      .get(`/api/projects/${org._id}`)
      .set('Cookie', authCookie(owner));

    expect(blockedByRoleGuard.status).toBe(423);
    expect(blockedByRoleGuard.body.message).toBe('Security incident review');

    const blockedByMembershipGuard = await request(app)
      .get(`/api/organizations/${org._id}/members`)
      .set('Cookie', authCookie(owner));

    expect(blockedByMembershipGuard.status).toBe(423);

    await request(app)
      .put(`/api/admin/organizations/${org._id}/activate`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Incident resolved' });

    const afterActivation = await request(app)
      .get(`/api/projects/${org._id}`)
      .set('Cookie', authCookie(owner));

    expect(afterActivation.status).toBe(200);
  });

  it('returns richer system health metrics', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });

    const res = await request(app)
      .get('/api/admin/health')
      .set('Cookie', authCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.api).toHaveProperty('errorRate');
    expect(res.body.api).toHaveProperty('p95ResponseMs');
    expect(res.body.databaseMetrics).toHaveProperty('latencyMs');
    expect(res.body.email).toHaveProperty('configured');
    expect(res.body.jobs.status).toBe('not_configured');
    expect(res.body.socket).toHaveProperty('connectedClients');
    expect(res.body.deploy).toHaveProperty('version');
  });

  it('tracks failed logins, exposes support timeline, and revokes sessions', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Support User', email: 'support@test.com' });

    await request(app).post('/api/users/login').send({ email: target.email, password: 'bad-password' });
    const login = await request(app).post('/api/users/login').send({ email: target.email, password });
    expect(login.status).toBe(200);

    const support = await request(app)
      .get(`/api/admin/users/${target._id}/support-timeline`)
      .set('Cookie', authCookie(admin));

    expect(support.status).toBe(200);
    expect(support.body.security.failedLoginCount).toBe(0);
    expect(support.body.security.recentFailures.length).toBe(1);
    const sessionId = support.body.security.sessions[0].sessionId;
    expect(sessionId).toBeTruthy();

    const revoke = await request(app)
      .post(`/api/admin/users/${target._id}/sessions/${sessionId}/revoke`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'Compromised device' });

    expect(revoke.status).toBe(200);

    const revokedAccess = await request(app)
      .get('/api/users/me')
      .set('Cookie', [`jwt=${login.body.token}`]);

    expect(revokedAccess.status).toBe(401);
  });

  it('supports privacy export/delete workflow and retention settings', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const target = await createUser({ name: 'Privacy User', email: 'privacy@test.com' });

    const retention = await request(app)
      .put('/api/admin/retention-settings')
      .set('Cookie', authCookie(admin))
      .send({ auditLogDays: 400, productEventDays: 800, inactiveUserDays: 900, deletedUserTombstoneDays: 45, reason: 'Annual policy update' });

    expect(retention.status).toBe(200);
    expect(retention.body.auditLogDays).toBe(400);

    const exported = await request(app)
      .get(`/api/admin/users/${target._id}/privacy-export?reason=DSAR`)
      .set('Cookie', authCookie(admin));

    expect(exported.status).toBe(200);
    expect(exported.body.user.email).toBe(target.email);

    const deleted = await request(app)
      .post(`/api/admin/users/${target._id}/privacy-delete`)
      .set('Cookie', authCookie(admin))
      .send({ reason: 'User deletion request', currentPassword: password });

    expect(deleted.status).toBe(200);
    const updated = await User.findById(target._id);
    expect(updated?.email).toContain('@privacy.local');
    expect(updated?.privacyDeletedAt).toBeTruthy();
    expect(await AdminAuditLog.countDocuments({ action: 'compliance.privacy_delete' })).toBe(1);
  });

  it('targets active announcements by schedule, role, and organization', async () => {
    const admin = await createUser({ name: 'Root Admin', email: 'root@test.com', role: 'superadmin' });
    const owner = await createUser({ name: 'Tenant Owner', email: 'owner@test.com', role: 'admin' });
    const outsider = await createUser({ name: 'Outsider', email: 'outsider@test.com', role: 'admin' });
    const org = await Organization.create({ name: 'Tenant A', createdBy: owner._id });
    await Membership.create({ organization: org._id, user: owner._id, role: 'owner' });

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const created = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', authCookie(admin))
      .send({
        message: 'Admins in Tenant A only',
        type: 'info',
        reason: 'Targeted maintenance',
        startsAt: past,
        expiresAt: soon,
        targetRoles: ['admin'],
        targetOrganizations: [org._id],
      });

    expect(created.status).toBe(201);

    const visible = await request(app)
      .get('/api/announcements/active')
      .set('Cookie', authCookie(owner));
    expect(visible.status).toBe(200);
    expect(visible.body.message).toBe('Admins in Tenant A only');

    const hidden = await request(app)
      .get('/api/announcements/active')
      .set('Cookie', authCookie(outsider));
    expect(hidden.status).toBe(200);
    expect(hidden.body).toBeNull();

    const scheduled = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', authCookie(admin))
      .send({ message: 'Future', type: 'info', reason: 'Schedule test', startsAt: future });
    expect(scheduled.status).toBe(201);

    const history = await request(app)
      .get('/api/admin/announcements')
      .set('Cookie', authCookie(admin));
    expect(history.status).toBe(200);
    expect(history.body.announcements.length).toBeGreaterThanOrEqual(2);
  });
});
