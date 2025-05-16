import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { User } from '~/api/models';
import { zustandStorage } from '~/lib/utils';

interface AuthStateStore {
  user: User | undefined;
  serverUrl: string | undefined;
  authorized: boolean;
  setUser: (newUser: User | undefined) => void;
  setServerUrl: (newUrl: string | undefined) => void;
  setAuthorized: (newState: boolean) => void;
}

export const useAuthStore = create<AuthStateStore>()(
  persist(
    (set) => ({
      user: undefined,
      serverUrl: undefined,
      authorized: false,
      setUser: (newUser) => set({ user: newUser }),
      setServerUrl: (newUrl) => set({ serverUrl: newUrl }),
      setAuthorized: (newState) => set({ authorized: newState }),
    }),
    {
      name: 'vinu-auth-state',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) =>
        ({ user: state.user, serverUrl: state.serverUrl }) as Partial<AuthStateStore>,
    }
  )
);

export const useUser = () => useAuthStore((state) => state.user);
export const useServerUrl = () => useAuthStore((state) => state.serverUrl);
export const useAuthorized = () => useAuthStore((state) => state.authorized);

export const useAuthActions = () =>
  useAuthStore((state) => ({
    setUser: state.setUser,
    setServerUrl: state.setServerUrl,
    setAuthorized: state.setAuthorized,
  }));
