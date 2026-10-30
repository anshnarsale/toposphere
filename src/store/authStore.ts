import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { neonAuth, type UserAccount, type InviteCode } from '@/lib/neonAuth';

interface AuthState {
  currentUser: UserAccount | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isInviteAdminOpen: boolean;
  inviteCodes: InviteCode[];
  registeredUsers: UserAccount[];
  isNeonConnected: boolean;
  neonMaskedUrl: string;

  // Actions
  checkSession: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openInviteAdmin: () => void;
  closeInviteAdmin: () => void;
  login: (params: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithInvite: (params: {
    code: string;
    email: string;
    name: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchInviteCodes: () => Promise<void>;
  fetchRegisteredUsers: () => Promise<void>;
  createInviteCode: (params: { code: string; maxUses?: number; note?: string }) => Promise<{ success: boolean; error?: string }>;
  toggleInviteCode: (code: string) => Promise<void>;
  testNeonConnection: () => Promise<{ success: boolean; message: string }>;
}

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    currentUser: neonAuth.getActiveSession(),
    isLoading: false,
    isAuthModalOpen: !neonAuth.getActiveSession(), // Automatically open if user is not logged in!
    isInviteAdminOpen: false,
    inviteCodes: [],
    registeredUsers: [],
    isNeonConnected: neonAuth.isUsingNeon(),
    neonMaskedUrl: neonAuth.getNeonUrlMasked(),

    checkSession: () => {
      const user = neonAuth.getActiveSession();
      set((state) => {
        state.currentUser = user;
        if (!user) {
          state.isAuthModalOpen = true;
        }
      });
    },

    openAuthModal: () => {
      set((state) => {
        state.isAuthModalOpen = true;
      });
    },

    closeAuthModal: () => {
      // Only allow closing if a user is logged in
      if (get().currentUser) {
        set((state) => {
          state.isAuthModalOpen = false;
        });
      }
    },

    openInviteAdmin: () => {
      set((state) => {
        state.isInviteAdminOpen = true;
      });
      get().fetchInviteCodes();
    },

    closeInviteAdmin: () => {
      set((state) => {
        state.isInviteAdminOpen = false;
      });
    },

    login: async ({ email, password }) => {
      set((state) => {
        state.isLoading = true;
      });
      const res = await neonAuth.loginUser({ email, password });
      set((state) => {
        state.isLoading = false;
        if (res.success && res.user) {
          state.currentUser = res.user;
          state.isAuthModalOpen = false;
        }
      });
      return { success: res.success, error: res.error };
    },

    adminLogin: async (password: string) => {
      set((state) => {
        state.isLoading = true;
      });
      const res = await neonAuth.adminLogin(password);
      set((state) => {
        state.isLoading = false;
        if (res.success && res.user) {
          state.currentUser = res.user;
          state.isAuthModalOpen = false;
        }
      });
      return { success: res.success, error: res.error };
    },

    fetchRegisteredUsers: async () => {
      const users = await neonAuth.listRegisteredUsers();
      set((state) => {
        state.registeredUsers = users;
      });
    },

    registerWithInvite: async (params) => {
      set((state) => {
        state.isLoading = true;
      });
      const res = await neonAuth.registerWithInvite(params);
      set((state) => {
        state.isLoading = false;
        if (res.success && res.user) {
          state.currentUser = res.user;
          state.isAuthModalOpen = false;
        }
      });
      return { success: res.success, error: res.error };
    },

    logout: () => {
      neonAuth.logout();
      set((state) => {
        state.currentUser = null;
        state.isAuthModalOpen = true;
      });
    },

    fetchInviteCodes: async () => {
      const codes = await neonAuth.listInviteCodes();
      set((state) => {
        state.inviteCodes = codes;
      });
    },

    createInviteCode: async (params) => {
      const res = await neonAuth.createInviteCode(params);
      if (res.success) {
        await get().fetchInviteCodes();
      }
      return { success: res.success, error: res.error };
    },

    toggleInviteCode: async (code) => {
      await neonAuth.toggleInviteActive(code);
      await get().fetchInviteCodes();
    },

    testNeonConnection: async () => {
      return await neonAuth.initNeonTables();
    },
  }))
);

