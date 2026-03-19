"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Eye, CheckCircle, XCircle, Loader, Save, RefreshCw } from "@/components/ui/icons";

type Connection = {
  id: string;
  name: string;
  description: string | null;
  dialect: "mysql" | "postgresql";
  host: string;
  port: number;
  databaseName: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  description: string;
  dialect: "mysql" | "postgresql";
  host: string;
  port: string;
  databaseName: string;
  username: string;
  password: string;
};

const PORT_DEFAULTS: Record<"mysql" | "postgresql", number> = {
  mysql: 3306,
  postgresql: 5432,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

/** Connection edit/detail page — pre-populated form with test before save. */
export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    dialect: "mysql",
    host: "",
    port: "3306",
    databaseName: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: connection, isLoading, isError } = useQuery<Connection>({
    queryKey: ["connection", id],
    queryFn: () => fetchJson(`/api/connections/${id}`),
  });

  // Populate form once connection loads
  useEffect(() => {
    if (connection) {
      setForm({
        name: connection.name,
        description: connection.description ?? "",
        dialect: connection.dialect,
        host: connection.host,
        port: String(connection.port),
        databaseName: connection.databaseName,
        username: connection.username,
        password: "", // never pre-fill password
      });
    }
  }, [connection]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "dialect") {
        next.port = String(PORT_DEFAULTS[value as "mysql" | "postgresql"]);
      }
      return next;
    });
    setTestStatus(null);
  }

  async function handleTest() {
    setIsTesting(true);
    setTestStatus(null);
    try {
      // If no new password provided, test the existing connection
      if (!form.password) {
        const result = await fetchJson<{ success: boolean; message: string }>(
          `/api/connections/${id}/test`,
          { method: "POST" },
        );
        setTestStatus(result);
      } else {
        // Test with new credentials
        const result = await fetchJson<{ success: boolean; message: string }>(
          "/api/connections/test",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dialect: form.dialect,
              host: form.host,
              port: parseInt(form.port, 10),
              databaseName: form.databaseName,
              username: form.username,
              password: form.password,
            }),
          },
        );
        setTestStatus(result);
      }
    } catch (err) {
      setTestStatus({
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        dialect: form.dialect,
        host: form.host,
        port: parseInt(form.port, 10),
        databaseName: form.databaseName,
        username: form.username,
      };
      if (form.password) body.password = form.password;

      await fetchJson(`/api/connections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("Connection saved");
      router.push("/connections");
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete connection "${connection?.name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await fetchJson(`/api/connections/${id}`, { method: "DELETE" });
      toast.success("Connection deleted");
      router.push("/connections");
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsDeleting(false);
    }
  }

  const canSave = form.name && form.host && form.databaseName && form.username;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-xl">
        <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (isError || !connection) {
    return (
      <div className="p-6">
        <p className="text-red-400">Failed to load connection.</p>
        <Link href="/connections" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
          Back to Connections
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/connections" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-bold text-zinc-100">{connection.name}</h1>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-2.5 py-1.5 text-xs rounded border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-900 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <input
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Optional description…"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Dialect */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Dialect <span className="text-red-400">*</span>
          </label>
          <select
            value={form.dialect}
            onChange={(e) => setField("dialect", e.target.value as "mysql" | "postgresql")}
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
          >
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
          </select>
        </div>

        {/* Host + Port */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Host <span className="text-red-400">*</span>
            </label>
            <input
              value={form.host}
              onChange={(e) => setField("host", e.target.value)}
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Port</label>
            <input
              value={form.port}
              onChange={(e) => setField("port", e.target.value)}
              type="number"
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Database name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Database Name <span className="text-red-400">*</span>
          </label>
          <input
            value={form.databaseName}
            onChange={(e) => setField("databaseName", e.target.value)}
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Username <span className="text-red-400">*</span>
          </label>
          <input
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            New Password <span className="text-zinc-600 text-xs">(leave blank to keep current)</span>
          </label>
          <div className="relative">
            <input
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 pr-10 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Test */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleTest}
            disabled={isTesting || !form.host || !form.databaseName || !form.username}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50 transition-colors"
          >
            {isTesting ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Test Connection
          </button>

          {testStatus && (
            <div className="flex items-center gap-1.5 text-sm">
              {testStatus.success ? (
                <CheckCircle size={15} className="text-emerald-400" />
              ) : (
                <XCircle size={15} className="text-red-400" />
              )}
              <span className={testStatus.success ? "text-emerald-400" : "text-red-400"}>
                {testStatus.message}
              </span>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/connections" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
