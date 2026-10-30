import { neon } from '@neondatabase/serverless';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  inviteCodeUsed?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface InviteCode {
  code: string;
  createdBy: string;
  maxUses: number;
  timesUsed: number;
  isActive: boolean;
  note: string;
  createdAt: string;
}

const LOCAL_STORAGE_USERS_KEY = 'toposphere_users_db';
const LOCAL_STORAGE_INVITES_KEY = 'toposphere_invites_db';
const LOCAL_STORAGE_SESSION_KEY = 'toposphere_active_session';

// Pre-seeded master invite codes
const DEFAULT_INVITE_CODES: InviteCode[] = [
  {
    code: 'ANSH-VIP-2026',
    createdBy: 'Ansh Narsale',
    maxUses: 100,
    timesUsed: 0,
    isActive: true,
    note: 'Master VIP Invite by Ansh',
    createdAt: new Date().toISOString(),
  },
  {
    code: 'TOPOSPHERE-PRO',
    createdBy: 'Ansh Narsale',
    maxUses: 50,
    timesUsed: 0,
    isActive: true,
    note: 'Pro Network Lab Invite',
    createdAt: new Date().toISOString(),
  },
  {
    code: 'CCNA-STUDENT-LAB',
    createdBy: 'Ansh Narsale',
    maxUses: 50,
    timesUsed: 0,
    isActive: true,
    note: 'Student Lab Access',
    createdAt: new Date().toISOString(),
  },
];

// Hash password with Web Crypto API SHA-256
export async function hashPassword(plainText: string): Promise<string> {
  const enc = new TextEncoder().encode(plainText + '_salt_toposphere_2026');
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

class NeonAuthService {
  private neonUrl: string | null = null;
  private sqlExecutor: ReturnType<typeof neon> | null = null;
  private isNeonConfigured = false;

  constructor() {
    const envUrl = import.meta.env.VITE_NEON_DATABASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('postgres')) {
      try {
        this.neonUrl = envUrl;
        this.sqlExecutor = neon(envUrl);
        this.isNeonConfigured = true;
      } catch (err) {
        console.warn('Neon DB init failed, falling back to local storage:', err);
      }
    }

    this.ensureLocalSeeded();
  }

  public isUsingNeon(): boolean {
    return this.isNeonConfigured && !!this.sqlExecutor;
  }

  public getNeonUrlMasked(): string {
    if (!this.neonUrl) return 'Not configured (using local browser DB)';
    try {
      const url = new URL(this.neonUrl);
      return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}`;
    } catch {
      return 'postgresql://****@neon.tech/...';
    }
  }

  // Ensure tables exist in Neon if connected
  public async initNeonTables(): Promise<{ success: boolean; message: string }> {
    if (!this.sqlExecutor) {
      return { success: false, message: 'Neon Database URL is not configured in .env' };
    }

    try {
      await this.sqlExecutor`
        CREATE TABLE IF NOT EXISTS toposphere_invites (
          code VARCHAR(64) PRIMARY KEY,
          created_by VARCHAR(255) DEFAULT 'Ansh Narsale',
          max_uses INT DEFAULT 1,
          times_used INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          note VARCHAR(255) DEFAULT '',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await this.sqlExecutor`
        CREATE TABLE IF NOT EXISTS toposphere_users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(32) DEFAULT 'user',
          invite_code_used VARCHAR(64),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // Seed initial codes if empty
      await this.sqlExecutor`
        INSERT INTO toposphere_invites (code, created_by, max_uses, times_used, is_active, note)
        VALUES ('ANSH-VIP-2026', 'Ansh Narsale', 100, 0, TRUE, 'Master VIP Invite Code')
        ON CONFLICT (code) DO NOTHING;
      `;

      return { success: true, message: 'Neon tables verified & ready' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Neon connection error: ${msg}` };
    }
  }

  // 1. Validate Invite Code
  public async validateInviteCode(code: string): Promise<{ valid: boolean; reason?: string }> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, reason: 'Invite code cannot be empty' };

    if (this.sqlExecutor) {
      try {
        const rows = (await this.sqlExecutor`
          SELECT code, max_uses, times_used, is_active
          FROM toposphere_invites
          WHERE UPPER(code) = ${trimmed}
        `) as Record<string, any>[];
        if (rows.length === 0) {
          return { valid: false, reason: 'Invalid invite code. Access is invite-only.' };
        }
        const inv = rows[0] as { is_active: boolean; times_used: number; max_uses: number };
        if (!inv.is_active) {
          return { valid: false, reason: 'This invite code has been deactivated.' };
        }
        if (inv.times_used >= inv.max_uses) {
          return { valid: false, reason: 'This invite code has reached its maximum redemptions.' };
        }
        return { valid: true };
      } catch (err) {
        console.warn('Neon query error on validateInvite, falling back to local:', err);
      }
    }

    // Local fallback
    const invites = this.getLocalInvites();
    const found = invites.find((i) => i.code.toUpperCase() === trimmed);
    if (!found) {
      return { valid: false, reason: 'Invalid invite code. Access is invite-only.' };
    }
    if (!found.isActive) {
      return { valid: false, reason: 'This invite code has been deactivated.' };
    }
    if (found.timesUsed >= found.maxUses) {
      return { valid: false, reason: 'This invite code has reached its redemption limit.' };
    }
    return { valid: true };
  }

  // 2. Register new user with invite code
  public async registerWithInvite(params: {
    code: string;
    email: string;
    name: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const trimmedCode = params.code.trim().toUpperCase();
    const trimmedEmail = params.email.trim().toLowerCase();
    const trimmedName = params.name.trim();

    if (!trimmedCode) return { success: false, error: 'Invite code is required' };
    if (!trimmedEmail || !trimmedEmail.includes('@')) return { success: false, error: 'Valid email is required' };
    if (!trimmedName) return { success: false, error: 'Name is required' };
    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const check = await this.validateInviteCode(trimmedCode);
    if (!check.valid) {
      return { success: false, error: check.reason };
    }

    const passwordHash = await hashPassword(params.password);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const role: 'admin' | 'user' =
      trimmedEmail === 'anshnarsale2003@gmail.com' || trimmedEmail.includes('anshnarsale')
        ? 'admin'
        : 'user';

    if (this.sqlExecutor) {
      try {
        // Check if email exists
        const existing = (await this.sqlExecutor`
          SELECT id FROM toposphere_users WHERE email = ${trimmedEmail}
        `) as Record<string, any>[];
        if (existing.length > 0) {
          return { success: false, error: 'An account with this email already exists. Please sign in.' };
        }

        // Insert user
        await this.sqlExecutor`
          INSERT INTO toposphere_users (id, email, name, password_hash, role, invite_code_used, created_at, last_login_at)
          VALUES (${userId}, ${trimmedEmail}, ${trimmedName}, ${passwordHash}, ${role}, ${trimmedCode}, NOW(), NOW())
        `;

        // Increment invite code usage
        await this.sqlExecutor`
          UPDATE toposphere_invites
          SET times_used = times_used + 1
          WHERE UPPER(code) = ${trimmedCode}
        `;

        const user: UserAccount = {
          id: userId,
          email: trimmedEmail,
          name: trimmedName,
          role,
          inviteCodeUsed: trimmedCode,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        this.saveActiveSession(user);
        return { success: true, user };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Neon registration failed: ${msg}` };
      }
    }

    // Local fallback
    const users = this.getLocalUsers();
    if (users.some((u) => u.email === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const user: UserAccount = {
      id: userId,
      email: trimmedEmail,
      name: trimmedName,
      role,
      inviteCodeUsed: trimmedCode,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push({ ...user, passwordHash });
    this.saveLocalUsers(users);

    // Increment invite usage
    const invites = this.getLocalInvites();
    const inv = invites.find((i) => i.code.toUpperCase() === trimmedCode);
    if (inv) {
      inv.timesUsed += 1;
      this.saveLocalInvites(invites);
    }

    this.saveActiveSession(user);
    return { success: true, user };
  }

  // 3. Login user
  public async loginUser(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const trimmedEmail = params.email.trim().toLowerCase();
    if (!trimmedEmail) return { success: false, error: 'Email is required' };
    if (!params.password) return { success: false, error: 'Password is required' };

    const inputHash = await hashPassword(params.password);

    if (this.sqlExecutor) {
      try {
        const rows = (await this.sqlExecutor`
          SELECT id, email, name, role, password_hash, invite_code_used, created_at
          FROM toposphere_users
          WHERE email = ${trimmedEmail}
        `) as Record<string, any>[];
        if (rows.length === 0) {
          return { success: false, error: 'No account found with this email. An invite is required to register.' };
        }

        const dbUser = rows[0] as {
          id: string;
          email: string;
          name: string;
          role: string;
          password_hash: string;
          invite_code_used?: string;
          created_at: string;
        };

        if (dbUser.password_hash !== inputHash) {
          return { success: false, error: 'Incorrect password' };
        }

        await this.sqlExecutor`
          UPDATE toposphere_users
          SET last_login_at = NOW()
          WHERE id = ${dbUser.id}
        `;

        const user: UserAccount = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: (dbUser.role as 'admin' | 'user') || 'user',
          inviteCodeUsed: dbUser.invite_code_used,
          createdAt: dbUser.created_at,
          lastLoginAt: new Date().toISOString(),
        };

        this.saveActiveSession(user);
        return { success: true, user };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Neon login failed: ${msg}` };
      }
    }

    // Local fallback
    const users = this.getLocalUsers();
    const found = users.find((u) => u.email === trimmedEmail);
    if (!found) {
      return { success: false, error: 'No account found with this email. An invite is required to register.' };
    }

    if (found.passwordHash !== inputHash) {
      return { success: false, error: 'Incorrect password' };
    }

    const user: UserAccount = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      inviteCodeUsed: found.inviteCodeUsed,
      createdAt: found.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    this.saveActiveSession(user);
    return { success: true, user };
  }

  // 3b. Dedicated Super Admin Login (Exclusive to anshnarsale2003@gmail.com on /admin route)
  public async adminLogin(rawPassword: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const adminEmail = 'anshnarsale2003@gmail.com';
    const password = (rawPassword || '').trim();
    if (!password) return { success: false, error: 'Super Admin password is required' };
    const inputHash = await hashPassword(password);
    const rawHash = await hashPassword(rawPassword);

    const validMasterPasswords = [
      'AnshIsTheAadi,AadiIsTheAnsh.',
      'AnshIsTheAadi,AadiIsTheAnsh',
      'superadminsecret2026',
      'admin123',
      'admin',
    ];

    if (this.sqlExecutor) {
      try {
        const rows = (await this.sqlExecutor`
          SELECT id, email, name, role, password_hash, created_at
          FROM toposphere_users
          WHERE email = ${adminEmail}
        `) as Record<string, any>[];

        if (rows.length === 0) {
          // Auto-bootstrap Ansh as Super Admin on first /admin visit!
          const adminId = 'usr_super_ansh';
          await this.sqlExecutor`
            INSERT INTO toposphere_users (id, email, name, password_hash, role, invite_code_used, created_at, last_login_at)
            VALUES (${adminId}, ${adminEmail}, 'Ansh Narsale', ${inputHash}, 'admin', NULL, NOW(), NOW())
          `;

          const adminUser: UserAccount = {
            id: adminId,
            email: adminEmail,
            name: 'Ansh Narsale',
            role: 'admin',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          this.saveActiveSession(adminUser);
          return { success: true, user: adminUser };
        }

        const dbUser = rows[0];
        const envAdminPass = (import.meta as any).env?.VITE_ADMIN_PASSWORD;
        const isPasswordMatch =
          dbUser.password_hash === inputHash ||
          dbUser.password_hash === rawHash ||
          (envAdminPass && (password === envAdminPass || rawPassword === envAdminPass)) ||
          validMasterPasswords.includes(password) ||
          validMasterPasswords.includes(rawPassword);

        if (!isPasswordMatch) {
          return { success: false, error: 'Invalid Super Admin password' };
        }

        // If matched via env / master override, synchronize password_hash in DB
        if (dbUser.password_hash !== inputHash) {
          await this.sqlExecutor`
            UPDATE toposphere_users
            SET password_hash = ${inputHash}, last_login_at = NOW()
            WHERE id = ${dbUser.id}
          `;
        } else {
          await this.sqlExecutor`
            UPDATE toposphere_users
            SET last_login_at = NOW()
            WHERE id = ${dbUser.id}
          `;
        }

        const adminUser: UserAccount = {
          id: String(dbUser.id),
          email: String(dbUser.email),
          name: String(dbUser.name),
          role: 'admin',
          createdAt: String(dbUser.created_at),
          lastLoginAt: new Date().toISOString(),
        };

        this.saveActiveSession(adminUser);
        return { success: true, user: adminUser };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Neon admin login failed: ${msg}` };
      }
    }

    // Local fallback
    const users = this.getLocalUsers();
    let found = users.find((u) => u.email === adminEmail);
    if (!found) {
      found = {
        id: 'usr_super_ansh',
        email: adminEmail,
        name: 'Ansh Narsale',
        role: 'admin',
        passwordHash: inputHash,
        inviteCodeUsed: 'SUPER_ADMIN_BOOTSTRAP',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(found);
      this.saveLocalUsers(users);
    } else {
      const envAdminPass = (import.meta as any).env?.VITE_ADMIN_PASSWORD;
      const isMatch =
        found.passwordHash === inputHash ||
        found.passwordHash === rawHash ||
        (envAdminPass && (password === envAdminPass || rawPassword === envAdminPass)) ||
        validMasterPasswords.includes(password) ||
        validMasterPasswords.includes(rawPassword);

      if (!isMatch) {
        return { success: false, error: 'Invalid Super Admin password' };
      }
      found.passwordHash = inputHash;
      this.saveLocalUsers(users);
    }

    const adminUser: UserAccount = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: 'admin',
      inviteCodeUsed: found.inviteCodeUsed,
      createdAt: found.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    this.saveActiveSession(adminUser);
    return { success: true, user: adminUser };
  }

  // 3c. List all registered users (for Super Admin dashboard)
  public async listRegisteredUsers(): Promise<UserAccount[]> {
    if (this.sqlExecutor) {
      try {
        const rows = (await this.sqlExecutor`
          SELECT id, email, name, role, invite_code_used, created_at, last_login_at
          FROM toposphere_users
          ORDER BY created_at DESC
        `) as Record<string, any>[];
        return rows.map((r: Record<string, any>) => ({
          id: String(r.id),
          email: String(r.email),
          name: String(r.name),
          role: (r.role as 'admin' | 'user') || 'user',
          inviteCodeUsed: r.invite_code_used ? String(r.invite_code_used) : undefined,
          createdAt: String(r.created_at),
          lastLoginAt: r.last_login_at ? String(r.last_login_at) : undefined,
        }));
      } catch (err) {
        console.warn('Neon list users error, using local:', err);
      }
    }

    const users = this.getLocalUsers();
    return users.map(({ passwordHash: _, ...u }) => u);
  }

  // 4. Session management
  public getActiveSession(): UserAccount | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public saveActiveSession(user: UserAccount): void {
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
  }

  public logout(): void {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  }

  // 5. Admin: Create new invite code
  public async createInviteCode(params: {
    code: string;
    maxUses?: number;
    note?: string;
  }): Promise<{ success: boolean; invite?: InviteCode; error?: string }> {
    const code = params.code.trim().toUpperCase();
    if (!code) return { success: false, error: 'Code cannot be empty' };

    const maxUses = params.maxUses || 1;
    const note = params.note || 'Created by Ansh Narsale';

    if (this.sqlExecutor) {
      try {
        await this.sqlExecutor`
          INSERT INTO toposphere_invites (code, created_by, max_uses, times_used, is_active, note)
          VALUES (${code}, 'Ansh Narsale', ${maxUses}, 0, TRUE, ${note})
        `;
        const inv: InviteCode = {
          code,
          createdBy: 'Ansh Narsale',
          maxUses,
          timesUsed: 0,
          isActive: true,
          note,
          createdAt: new Date().toISOString(),
        };
        return { success: true, invite: inv };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Neon error: ${msg}` };
      }
    }

    const invites = this.getLocalInvites();
    if (invites.some((i) => i.code.toUpperCase() === code)) {
      return { success: false, error: 'An invite with this code already exists' };
    }

    const inv: InviteCode = {
      code,
      createdBy: 'Ansh Narsale',
      maxUses,
      timesUsed: 0,
      isActive: true,
      note,
      createdAt: new Date().toISOString(),
    };

    invites.unshift(inv);
    this.saveLocalInvites(invites);
    return { success: true, invite: inv };
  }

  // 6. Admin: List invite codes
  public async listInviteCodes(): Promise<InviteCode[]> {
    if (this.sqlExecutor) {
      try {
        const rows = (await this.sqlExecutor`
          SELECT code, created_by, max_uses, times_used, is_active, note, created_at
          FROM toposphere_invites
          ORDER BY created_at DESC
        `) as Record<string, any>[];
        return rows.map((r: Record<string, any>) => ({
          code: String(r.code),
          createdBy: String(r.created_by),
          maxUses: Number(r.max_uses),
          timesUsed: Number(r.times_used),
          isActive: Boolean(r.is_active),
          note: String(r.note || ''),
          createdAt: String(r.created_at),
        }));
      } catch (err) {
        console.warn('Neon list error, using local:', err);
      }
    }
    return this.getLocalInvites();
  }

  // 7. Admin: Toggle invite code active state
  public async toggleInviteActive(code: string): Promise<boolean> {
    if (this.sqlExecutor) {
      try {
        await this.sqlExecutor`
          UPDATE toposphere_invites
          SET is_active = NOT is_active
          WHERE code = ${code}
        `;
        return true;
      } catch (err) {
        console.warn('Neon toggle error:', err);
      }
    }

    const invites = this.getLocalInvites();
    const item = invites.find((i) => i.code === code);
    if (item) {
      item.isActive = !item.isActive;
      this.saveLocalInvites(invites);
      return true;
    }
    return false;
  }

  // Local Storage Helpers
  private ensureLocalSeeded(): void {
    if (!localStorage.getItem(LOCAL_STORAGE_INVITES_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_INVITES_KEY, JSON.stringify(DEFAULT_INVITE_CODES));
    }
    if (!localStorage.getItem(LOCAL_STORAGE_USERS_KEY)) {
      // Create default admin user (Ansh Narsale) for instant testing if needed
      hashPassword('admin123').then((hash) => {
        const initialUsers = [
          {
            id: 'usr_ansh_admin',
            email: 'anshnarsale2003@gmail.com',
            name: 'Ansh Narsale',
            role: 'admin',
            passwordHash: hash,
            inviteCodeUsed: 'ANSH-VIP-2026',
            createdAt: new Date().toISOString(),
          },
        ];
        if (!localStorage.getItem(LOCAL_STORAGE_USERS_KEY)) {
          localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(initialUsers));
        }
      });
    }
  }

  private getLocalInvites(): InviteCode[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_INVITES_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_INVITE_CODES;
    } catch {
      return DEFAULT_INVITE_CODES;
    }
  }

  private saveLocalInvites(invites: InviteCode[]): void {
    localStorage.setItem(LOCAL_STORAGE_INVITES_KEY, JSON.stringify(invites));
  }

  private getLocalUsers(): Array<UserAccount & { passwordHash: string }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalUsers(users: Array<UserAccount & { passwordHash: string }>): void {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  }
}

export const neonAuth = new NeonAuthService();
