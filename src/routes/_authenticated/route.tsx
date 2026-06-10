import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/arcade/NavBar";
import { Web3Provider } from "@/components/Web3Provider";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <Web3Provider>
      <div className="min-h-screen pb-24 md:pb-8">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </Web3Provider>
  );
}