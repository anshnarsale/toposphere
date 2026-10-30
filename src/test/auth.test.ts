import { describe, it, expect, beforeEach } from 'vitest';
import { neonAuth, hashPassword } from '@/lib/neonAuth';

describe('Invite-Only Authentication Engine & Neon Integration', { timeout: 15000 }, () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates pre-seeded master invite codes and rejects invalid codes', async () => {
    const validCheck = await neonAuth.validateInviteCode('ANSH-VIP-2026');
    expect(validCheck.valid).toBe(true);

    const invalidCheck = await neonAuth.validateInviteCode('RANDOM-FAKE-CODE-999');
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.reason).toContain('Invalid invite code');
  });

  it('registers a new user with an invite code, hashes password, and saves session', async () => {
    const testEmail = `john_${Date.now()}@ccna.org`;
    const regRes = await neonAuth.registerWithInvite({
      code: 'ANSH-VIP-2026',
      name: 'John CCNA Learner',
      email: testEmail,
      password: 'password123',
    });

    expect(regRes.success).toBe(true);
    expect(regRes.user?.email).toBe(testEmail);
    expect(regRes.user?.inviteCodeUsed).toBe('ANSH-VIP-2026');

    // Verify session was saved
    const activeSession = neonAuth.getActiveSession();
    expect(activeSession?.email).toBe(testEmail);

    // Duplicate email registration should fail
    const dupRes = await neonAuth.registerWithInvite({
      code: 'ANSH-VIP-2026',
      name: 'John Duplicate',
      email: testEmail,
      password: 'password123',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('already exists');
  });

  it('allows registered user to login every time with email and password', async () => {
    const testEmail = `alice_${Date.now()}@networks.com`;
    // 1. Register with invite
    await neonAuth.registerWithInvite({
      code: 'TOPOSPHERE-PRO',
      name: 'Alice Engineer',
      email: testEmail,
      password: 'mypassword789',
    });

    // 2. Clear active session to simulate return visit
    neonAuth.logout();
    expect(neonAuth.getActiveSession()).toBeNull();

    // 3. Login with wrong password fails
    const badLogin = await neonAuth.loginUser({
      email: testEmail,
      password: 'wrongpassword',
    });
    expect(badLogin.success).toBe(false);
    expect(badLogin.error).toContain('Incorrect password');

    // 4. Login with correct password succeeds
    const goodLogin = await neonAuth.loginUser({
      email: testEmail,
      password: 'mypassword789',
    });
    expect(goodLogin.success).toBe(true);
    expect(goodLogin.user?.name).toBe('Alice Engineer');
    expect(neonAuth.getActiveSession()?.email).toBe(testEmail);
  });

  it('allows Ansh to create new invite codes and enforce max uses', async () => {
    const uniqueCode = `STU_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const createRes = await neonAuth.createInviteCode({
      code: uniqueCode,
      maxUses: 1,
      note: 'Single use invite for student',
    });
    expect(createRes.success).toBe(true);
    expect(createRes.invite?.code).toBe(uniqueCode);

    // First redemption succeeds
    const user1 = await neonAuth.registerWithInvite({
      code: uniqueCode,
      name: 'Student 1',
      email: `student1_${Date.now()}@test.com`,
      password: 'pass123456',
    });
    expect(user1.success).toBe(true);

    // Second redemption should be blocked as limit reached
    const user2 = await neonAuth.registerWithInvite({
      code: uniqueCode,
      name: 'Student 2',
      email: `student2_${Date.now()}@test.com`,
      password: 'pass123456',
    });
    expect(user2.success).toBe(false);
    expect(user2.error).toMatch(/redemption|limit/i);
  });

  it('supports dedicated super admin login for anshnarsale2003@gmail.com and lists users', async () => {
    const adminRes = await neonAuth.adminLogin('AnshIsTheAadi,AadiIsTheAnsh.');
    expect(adminRes.success).toBe(true);
    expect(adminRes.user?.email).toBe('anshnarsale2003@gmail.com');
    expect(adminRes.user?.role).toBe('admin');

    const usersList = await neonAuth.listRegisteredUsers();
    expect(Array.isArray(usersList)).toBe(true);
    expect(usersList.length).toBeGreaterThan(0);
  });
});

