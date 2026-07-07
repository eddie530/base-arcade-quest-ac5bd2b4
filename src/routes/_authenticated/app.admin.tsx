import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminListUsers, adminUpdateUser, getMyProfile } from "@/lib/games.functions";
import { toast } from "sonner";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Admin — Resident Arcade" }] }),
  // Server-side gate: verify admin role before the route renders.
  // The server fn re-checks via assertAdmin — this is defense in depth.
  beforeLoad: async () => {
    const profile = await getMyProfile();
    if (!profile?.isAdmin) throw redirect({ to: "/app" });
  },
  component: Admin,
});

function Admin() {
  const list = useServerFn(adminListUsers);
  const update = useServerFn(adminUpdateUser);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const mut = useMutation({
    mutationFn: (v: { user_id: string; xp?: number; streak?: number }) => update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Updated");
    },
  });

  const [q, setQ] = useState("");
  const rows = (data?.rows ?? []).filter(
    (r: any) =>
      !q ||
      (r.username ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (r.wallet_address ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const exportCsv = () => {
    const headers = [
      "user_id",
      "username",
      "wallet_address",
      "xp",
      "streak",
      "last_claim_at",
      "created_at",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resident-arcade-users.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black gradient-text">Admin</h1>
          <p className="text-sm text-muted-foreground">{rows.length} users</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or wallet"
            className="glass rounded-full px-4 py-2 text-sm w-64"
          />
          <button
            onClick={exportCsv}
            className="rounded-full glass px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </header>

      <div className="glass-strong rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left">
              <th>User</th>
              <th>Wallet</th>
              <th>XP</th>
              <th>Streak</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="text-center p-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {rows.map((r: any) => (
              <Row
                key={r.user_id}
                row={r}
                onSave={(v) => mut.mutate({ user_id: r.user_id, ...v })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, onSave }: { row: any; onSave: (v: { xp?: number; streak?: number }) => void }) {
  const [xp, setXp] = useState(row.xp);
  const [streak, setStreak] = useState(row.streak);
  const dirty = xp !== row.xp || streak !== row.streak;
  return (
    <tr className="border-t border-white/5 [&>td]:px-3 [&>td]:py-2">
      <td className="font-semibold">{row.username ?? "—"}</td>
      <td className="font-mono text-xs text-muted-foreground">
        {row.wallet_address?.slice(0, 10) ?? "—"}…
      </td>
      <td>
        <input
          type="number"
          value={xp}
          onChange={(e) => setXp(+e.target.value)}
          className="glass rounded-md px-2 py-1 w-24 font-mono"
        />
      </td>
      <td>
        <input
          type="number"
          value={streak}
          onChange={(e) => setStreak(+e.target.value)}
          className="glass rounded-md px-2 py-1 w-16 font-mono"
        />
      </td>
      <td>
        <button
          disabled={!dirty}
          onClick={() => onSave({ xp, streak })}
          className="rounded-md bg-[var(--gradient-neon)] text-background px-3 py-1 text-xs font-semibold disabled:opacity-30"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
