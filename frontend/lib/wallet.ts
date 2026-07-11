import { create } from 'zustand';
import {
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

interface WalletStore {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = create<WalletStore>((set) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      const connected = await isConnected();
      if (!connected) {
        set({
          error: 'Freighter wallet not found. Please install it.',
          isConnecting: false,
        });
        return;
      }
      const result = await requestAccess();
      if (result.error) {
        set({ error: result.error, isConnecting: false });
        return;
      }
      set({ address: result.address, isConnected: true, isConnecting: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Connection failed', isConnecting: false });
    }
  },

  disconnect: () => {
    set({ address: null, isConnected: false, error: null });
  },
}));

export { signTransaction };