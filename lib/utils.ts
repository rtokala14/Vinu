import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
