import { MMKV } from 'react-native-mmkv';

const deviceStorage = new MMKV({ id: 'vinu-player' });

/**
 * Stable per-install device id used in ABS deviceInfo payloads (play sessions
 * and offline session uploads). Generated once and persisted in MMKV.
 */
export function getDeviceId(): string {
  let id = deviceStorage.getString('deviceId');
  if (!id) {
    id = `vinu-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    deviceStorage.set('deviceId', id);
  }
  return id;
}
