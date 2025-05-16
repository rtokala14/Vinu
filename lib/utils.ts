import { clsx, type ClassValue } from 'clsx';
import { MMKV } from 'react-native-mmkv';
import { twMerge } from 'tailwind-merge';
import { StateStorage } from 'zustand/middleware';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const storageMM = new MMKV({
  id: 'vinu-storage',
});

export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storageMM.set(name, value);
  },
  getItem: (name) => {
    const value = storageMM.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storageMM.delete(name);
  },
};

export function parseServerUrl(fullUrl: string | undefined): {
  protocol: 'http' | 'https';
  serverAddress: string;
  serverPort: string;
} {
  if (fullUrl === undefined) {
    return {
      protocol: 'https',
      serverAddress: '',
      serverPort: '',
    };
  }
  try {
    const url = new URL(fullUrl);

    const protocol = url.protocol.slice(0, -1);

    const serverAddress = url.hostname;

    const serverPort = url.port;

    const finalProtocol = protocol === 'http' ? 'http' : 'https';

    return {
      protocol: finalProtocol,
      serverAddress,
      serverPort,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      protocol: 'https',
      serverAddress: '',
      serverPort: '',
    };
  }
}
