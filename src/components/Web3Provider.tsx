import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wallet";

/**
 * Wagmi wrapper. The wagmi config is created with `ssr: true`, so it is safe
 * to mount during SSR — this ensures `useAccount` / `useConnect` always find
 * the provider on the very first render (fixes "WagmiProvider not found").
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
