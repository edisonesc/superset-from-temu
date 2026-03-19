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
          <div key={i} className="h-12 bg-zinc-800 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">User Management</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Admin only — manage user roles</p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800 animate-pulse rounded" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-red-400 text-sm">Failed to load users.</div>
      ) : users.length === 0 ? (
        <div className="text-zinc-500 text-sm">No users found.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => {
                const isSelf = user.id === session?.user?.id;
                return (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {user.name}
                      {isSelf && (
                        <span className="ml-2 text-[10px] bg-indigo-900/40 text-indigo-300 rounded px-1.5 py-0.5">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={isSelf || updateRole.isPending}
                        onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value })}
                        className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors disabled:opacity-50"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
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
  );
}
