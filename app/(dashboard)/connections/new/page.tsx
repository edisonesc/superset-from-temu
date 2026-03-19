"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, CheckCircle, XCircle, Loader, Save, RefreshCw } from "@/components/ui/icons";

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

const DEFAULTS: Record<"mysql" | "postgresql", number> = {
  mysql: 3306,
  postgresql: 5432,
};

/** Create connection form — tests connectivity before saving. */
export default function NewConnectionPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    dialect: "mysql",
    host: "localhost",
    port: "3306",
    databaseName: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-update port when dialect changes
      if (key === "dialect") {
        next.port = String(DEFAULTS[value as "mysql" | "postgresql"]);
      }
      return next;
    });
    setTestStatus(null); // Reset test status on any change
  }

  async function handleTest() {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/connections/test", {
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
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTestStatus(json.data);
      if (json.data?.success) toast.success("Connected");
      else toast.error(json.data?.message ?? "Connection failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestStatus({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          dialect: form.dialect,
          host: form.host,
          port: parseInt(form.port, 10),
          databaseName: form.databaseName,
          username: form.username,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success("Connection created");
      router.push("/connections");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  const canSave =
    form.name && form.host && form.databaseName && form.username && form.password;

  return (
    <div className="flex flex-col h-full p-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/connections" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-zinc-100">New Connection</h1>
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
            placeholder="My Database"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
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
              placeholder="localhost"
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
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
            placeholder="my_database"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
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
            placeholder="root"
            className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-2 outline-none placeholder:text-zinc-600 border border-zinc-700 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Password <span className="text-red-400">*</span>
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

        {/* Test connection */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleTest}
            disabled={isTesting || !form.host || !form.databaseName || !form.username || !form.password}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50 transition-colors"
          >
            {isTesting ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
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
            {isSaving ? "Saving…" : "Save Connection"}
          </button>
          <Link href="/connections" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
