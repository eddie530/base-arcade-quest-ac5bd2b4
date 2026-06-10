import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider, type Config } from "wagmi";

/**
 * Client-only wagmi wrapper. Defers config creation to the browser so SSR
 * doesn't touch wallet globals. Children render either way; wagmi hooks
 * just return disconnected state until the config is ready.
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/lib/wallet.client").then((m) => {
      if (mounted) setConfig(m.wagmiConfig);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!config) return <>{children}</>;
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}