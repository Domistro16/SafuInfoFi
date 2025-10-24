import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'SafuInfoFi Dashboard',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains: [
    ...(process.env.NEXT_PUBLIC_CHAIN_ID === '1' ? [mainnet] : []),
    ...(process.env.NEXT_PUBLIC_CHAIN_ID === '11155111' ? [sepolia] : []),
  ],
  ssr: true,
});
