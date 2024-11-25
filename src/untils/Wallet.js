// src/utils/wallet.js
import { PhantomProvider } from '@solana/wallet-adapter-react'; // Nếu bạn sử dụng Phantom Wallet Adapter

export const getProvider = () => {
  if (window.solana && window.solana.isPhantom) {
    return window.solana;
  }
  throw new Error("Phantom Wallet không được cài đặt");
};
