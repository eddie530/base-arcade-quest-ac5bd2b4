import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/lib/games.functions";
import { toast } from "sonner";

function short(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function WalletButton({ currentAddress }: { currentAddress?: string | null }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const qc = useQueryClient();
  const save = useServerFn(updateProfile);

  useEffect(() => {
    if (address && address.toLowerCase() !== (currentAddress ?? "").toLowerCase()) {
      save({ data: { wallet_address: address } }).then(() => {
        qc.invalidateQueries({ queryKey: ["me"] });
        toast.success("Wallet linked");
      });
    }
  }, [address, currentAddress, save, qc]);

  if (!hydrated) {
    return (
      <button className="rounded-full glass px-4 py-2 text-sm" disabled>
        <Wallet className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-full glass px-4 py-2 text-sm font-mono hover:bg-white/10"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] mr-2" />
        {short(address)}
      </button>
    );
  }

  const cb = connectors.find((c) => c.id === "coinbaseWalletSDK") ?? connectors[0];
  const injected = connectors.find((c) => c.id === "injected");

  return (
    <div className="flex flex-wrap gap-2">
      {cb && (
        <button
          onClick={() => connectAsync({ connector: cb }).catch((e) => toast.error(e.message))}
          disabled={isPending}
          className="rounded-full bg-[var(--gradient-neon)] text-background px-4 py-2 text-sm font-semibold shadow-[var(--shadow-glow)] hover:opacity-90 transition disabled:opacity-50"
        >
          <Wallet className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Base Smart Wallet
        </button>
      )}
      {injected && (
        <button
          onClick={() => connectAsync({ connector: injected }).catch((e) => toast.error(e.message))}
          disabled={isPending}
          className="rounded-full glass px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          Browser Wallet
        </button>
      )}
    </div>
  );
}
