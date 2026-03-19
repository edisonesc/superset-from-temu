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

const DIALECT_META = {
  mysql:      { label: "MySQL",      color: "#EA580C", bg: "rgba(234,88,12,0.08)",  border: "rgba(234,88,12,0.25)" },
  postgresql: { label: "PostgreSQL", color: "var(--accent)", bg: "rgba(32,167,201,0.08)", border: "rgba(32,167,201,0.25)" },
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
        password: "",
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
      let result: { success: boolean; message: string };
      if (!form.password) {
        result = await fetchJson(`/api/connections/${id}/test`, { method: "POST" });
      } else {
        result = await fetchJson("/api/connections/test", {
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
      }
      setTestStatus(result);
      if (result.success) toast.success("Connection successful");
      else toast.error(result.message ?? "Connection failed");
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

  const inp = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
    borderRadius: "2px",
  };
  const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--accent)");
  const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--bg-border)");

  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
        <div className="px-6 py-4" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
          <div className="h-5 w-40 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        </div>
        <div className="p-6 max-w-2xl space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !connection) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load connection.</p>
        <Link href="/connections" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)" }}>
          Back to Connections
        </Link>
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
        <div className="flex items-center gap-3">
          <Link href="/connections" className="transition-colors" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{connection.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Edit database connection</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--bg-border)", color: "var(--text-muted)", borderRadius: "2px" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
          }}
        >
          {isDeleting ? "Deleting…" : "Delete Connection"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-5">

          {/* Section: General */}
          <div
            className="p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>General</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Display Name <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Production MySQL"
                  className="w-full text-sm px-3 py-2 outline-none"
                  style={inp}
                  onFocus={onF}
                  onBlur={onB}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Optional description…"
                  rows={2}
                  className="w-full text-sm px-3 py-2 outline-none resize-none"
                  style={{ ...inp }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
                />
              </div>
            </div>

            {/* Dialect selector */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Database Type <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="flex gap-3">
                {(["mysql", "postgresql"] as const).map((d) => {
                  const meta = DIALECT_META[d];
                  const isActive = form.dialect === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setField("dialect", d)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        border: `1px solid ${isActive ? meta.border : "var(--bg-border)"}`,
                        background: isActive ? meta.bg : "var(--bg-elevated)",
                        color: isActive ? meta.color : "var(--text-secondary)",
                        borderRadius: "2px",
                        flex: 1,
                        justifyContent: "center",
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: isActive ? meta.color : "var(--bg-border)" }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Connection */}
          <div
            className="p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Connection</h2>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Host <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.host}
                  onChange={(e) => setField("host", e.target.value)}
                  placeholder="localhost or IP address"
                  className="w-full text-sm px-3 py-2 outline-none"
                  style={inp}
                  onFocus={onF}
                  onBlur={onB}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Port</label>
                <input
                  value={form.port}
                  onChange={(e) => setField("port", e.target.value)}
                  type="number"
                  className="w-full text-sm px-3 py-2 outline-none"
                  style={inp}
                  onFocus={onF}
                  onBlur={onB}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Database Name <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                value={form.databaseName}
                onChange={(e) => setField("databaseName", e.target.value)}
                placeholder="my_database"
                className="w-full text-sm px-3 py-2 outline-none"
                style={inp}
                onFocus={onF}
                onBlur={onB}
              />
            </div>
          </div>

          {/* Section: Credentials */}
          <div
            className="p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Credentials</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Username <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                  placeholder="root"
                  className="w-full text-sm px-3 py-2 outline-none"
                  style={inp}
                  onFocus={onF}
                  onBlur={onB}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  New Password{" "}
                  <span className="font-normal" style={{ color: "var(--text-muted)" }}>(blank = keep current)</span>
                </label>
                <div className="relative">
                  <input
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full text-sm px-3 py-2 pr-9 outline-none"
                    style={inp}
                    onFocus={onF}
                    onBlur={onB}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={isTesting || !form.host || !form.databaseName || !form.username}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                border: "1px solid var(--bg-border)",
                color: "var(--text-secondary)",
                background: "var(--bg-surface)",
                borderRadius: "2px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {isTesting ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Test Connection
            </button>

            {testStatus && (
              <div className="flex items-center gap-1.5 text-sm">
                {testStatus.success
                  ? <CheckCircle size={15} style={{ color: "var(--success)" }} />
                  : <XCircle size={15} style={{ color: "var(--error)" }} />}
                <span style={{ color: testStatus.success ? "var(--success)" : "var(--error)" }}>
                  {testStatus.message}
                </span>
              </div>
            )}

            <div className="flex-1" />

            <Link href="/connections" className="px-4 py-2 text-sm transition-colors" style={{ color: "var(--text-muted)" }}>
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", borderRadius: "2px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
            >
              {isSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
