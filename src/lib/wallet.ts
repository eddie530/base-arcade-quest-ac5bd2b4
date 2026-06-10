import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

// Client-only wagmi config. Imported via dynamic import inside the Web3Provider
// so SSR never touches window/localStorage.
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: "Resident Arcade",
      preference: { options: "smartWalletOnly" },
    }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});