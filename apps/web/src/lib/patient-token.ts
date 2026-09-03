import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const keyFor = (publicId: string): string => `pharmacy-prescription-token:${publicId}`;

export const readPatientToken = async (publicId: string): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      return (await SecureStoragePlugin.get({ key: keyFor(publicId) })).value;
    } catch {
      return null;
    }
  }
  return sessionStorage.getItem(keyFor(publicId));
};

export const writePatientToken = async (publicId: string, token: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await SecureStoragePlugin.set({ key: keyFor(publicId), value: token });
    return;
  }
  sessionStorage.setItem(keyFor(publicId), token);
};
