import { describe, it, expect, beforeEach } from 'vitest';
import { neonAuth, hashPassword } from '@/lib/neonAuth';

describe('Invite-Only Authentication Engine & Neon Integration', () => {
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
    const regRes = await neonAuth.registerWithInvite({
      code: 'ANSH-VIP-2026',
      name: 'John CCNA Learner',
      email: 'john@ccna.org',
      password: 'password123',
    });

    expect(regRes.success).toBe(true);
    expect(regRes.user?.email).toBe('john@ccna.org');
    expect(regRes.user?.inviteCodeUsed).toBe('ANSH-VIP-2026');

    // Verify session was saved
    const activeSession = neonAuth.getActiveSession();
    expect(activeSession?.email).toBe('john@ccna.org');

    // Duplicate email registration should fail
    const dupRes = await neonAuth.registerWithInvite({
      code: 'ANSH-VIP-2026',
      name: 'John Duplicate',
      email: 'john@ccna.org',
      password: 'password123',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('already exists');
  });

  it('allows registered user to login every time with email and password', async () => {
    // 1. Register with invite
    await neonAuth.registerWithInvite({
      code: 'TOPOSPHERE-PRO',
      name: 'Alice Engineer',
      email: 'alice@networks.com',
      password: 'mypassword789',
    });

    // 2. Clear active session to simulate return visit
    neonAuth.logout();
    expect(neonAuth.getActiveSession()).toBeNull();

    // 3. Login with wrong password fails
    const badLogin = await neonAuth.loginUser({
      email: 'alice@networks.com',
      password: 'wrongpassword',
    });
    expect(badLogin.success).toBe(false);
    expect(badLogin.error).toContain('Incorrect password');

    // 4. Login with correct password succeeds
    const goodLogin = await neonAuth.loginUser({
      email: 'alice@networks.com',
      password: 'mypassword789',
    });
    expect(goodLogin.success).toBe(true);
    expect(goodLogin.user?.name).toBe('Alice Engineer');
    expect(neonAuth.getActiveSession()?.email).toBe('alice@networks.com');
  });

  it('allows Ansh to create new invite codes and enforce max uses', async () => {
    const createRes = await neonAuth.createInviteCode({
      code: 'STUDENT-ONE-USE',
      maxUses: 1,
      note: 'Single use invite for student',
    });
    expect(createRes.success).toBe(true);
    expect(createRes.invite?.code).toBe('STUDENT-ONE-USE');

    // First redemption succeeds
    const user1 = await neonAuth.registerWithInvite({
      code: 'STUDENT-ONE-USE',
      name: 'Student 1',
      email: 'student1@test.com',
      password: 'pass123456',
    });
    expect(user1.success).toBe(true);

    // Second redemption should be blocked as limit reached
    const user2 = await neonAuth.registerWithInvite({
      code: 'STUDENT-ONE-USE',
      name: 'Student 2',
      email: 'student2@test.com',
      password: 'pass123456',
    });
    expect(user2.success).toBe(false);
    expect(user2.error).toContain('limit');
  });
});
