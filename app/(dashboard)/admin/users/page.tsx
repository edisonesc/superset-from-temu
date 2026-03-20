"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { USER_ROLES } from "@/lib/constants";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

/** Admin-only user management page — view and change user roles. */
export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  const { data: users = [], isLoading, isError } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetchJson("/api/admin/users"),
    enabled: session?.user?.role === "admin",
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetchJson(`/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_, { role }) => {
      toast.success(`Role updated to ${role}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  if (status === "loading" || (status === "authenticated" && session?.user?.role !== "admin")) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>User Management</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Admin only — manage user roles</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load users.</p>
        ) : users.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users found.</p>
        ) : (
          <div style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", overflow: "hidden" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }}>
                <tr>
                  {["Name", "Email", "Role", "Joined"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const isSelf = user.id === session?.user?.id;
                  return (
                    <tr
                      key={user.id}
                      style={{
                        background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                        borderBottom: "1px solid var(--bg-border)",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                        {user.name}
                        {isSelf && (
                          <span
                            className="ml-2 text-[10px] px-1.5 py-0.5"
                            style={{
                              background: "rgba(32,167,201,0.1)",
                              color: "var(--accent)",
                              borderRadius: "2px",
                              border: "1px solid rgba(32,167,201,0.2)",
                            }}
                          >
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            disabled={isSelf || updateRole.isPending}
                            onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value })}
                            className="text-xs px-2 py-1 outline-none transition-colors disabled:opacity-50"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--bg-border)",
                              color: "var(--text-primary)",
                              borderRadius: "2px",
                              appearance: "none",
                              WebkitAppearance: "none",
                              paddingRight: "28px",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                          >
                            {USER_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ display: "block", color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
