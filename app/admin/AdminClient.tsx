"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Sparkles,
  Activity,
  Shield,
  Trash2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";

interface AdminClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function AdminClient({ user }: AdminClientProps) {
  const [statsData, setStatsData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStats, resUsers] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
      ]);

      if (resStats.ok) {
        const stats = await resStats.json();
        setStatsData(stats);
      }
      if (resUsers.ok) {
        const u = await resUsers.json();
        setUsersData(u.users || []);
      }
    } catch (e: any) {
      setMessage({ type: "error", text: "Data load nahi ho saka." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleToggle = async (targetEmail: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Kya aap ${targetEmail} ko ${newRole} banana chahte hain?`)) return;

    setActionLoading(targetEmail);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-role", targetEmail, newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: `${targetEmail} ka role ${newRole} ho gaya.` });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update role." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetEmail: string) => {
    if (!confirm(`⚠️ Dhyaan dein: ${targetEmail} ka pura account aur chat history delete ho jayegi. Kya aap sure hain?`)) return;

    setActionLoading(targetEmail);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-user", targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: `${targetEmail} delete ho gaya.` });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Delete fail ho gaya." });
    } finally {
      setActionLoading(null);
    }
  };

  const getHealthBadge = (status?: string) => {
    if (status === "OK") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={12} /> OK
        </span>
      );
    }
    if (status === "Failing") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <XCircle size={12} /> Failing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-white/40 border border-white/10">
        <AlertTriangle size={12} /> Missing
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-amber-500/30 selection:text-white">
      {/* Ambient background */}
      <div className="ambient-orbs">
        <div className="ambient-orb-saffron" />
        <div className="ambient-orb-green" />
      </div>

      {/* Admin Header */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 text-xs sm:text-sm"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Chat</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Shield className="text-amber-400" size={18} />
              <span className="font-bold text-base sm:text-lg">Admin Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="hidden sm:block text-xs text-white/40 border-l border-white/10 pl-3">
              Admin: <span className="text-white/80 font-medium">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm border flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* 1. Stat Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between text-white/40 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Registered Users</span>
              <Users size={16} className="text-[#FF9933]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {statsData?.stats?.totalUsers ?? "—"}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              +{statsData?.stats?.newSignupsToday ?? 0} today &nbsp;|&nbsp; +{statsData?.stats?.newSignupsThisWeek ?? 0} this week
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between text-white/40 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Chats</span>
              <MessageSquare size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {statsData?.stats?.totalChats ?? "—"}
            </div>
            <div className="text-[11px] text-white/40 mt-1">Saved across accounts</div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between text-white/40 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Messages</span>
              <Activity size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {statsData?.stats?.totalMessages ?? "—"}
            </div>
            <div className="text-[11px] text-white/40 mt-1">User &amp; AI exchanges</div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between text-white/40 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Images Generated</span>
              <Sparkles size={16} className="text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {statsData?.stats?.totalImages ?? "—"}
            </div>
            <div className="text-[11px] text-white/40 mt-1">Via Pollinations Flux</div>
          </div>

          <div className="glass-card p-5 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-white/40 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Signups (7d)</span>
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {statsData?.stats?.newSignupsThisWeek ?? "—"}
            </div>
            <div className="text-[11px] text-white/40 mt-1">Weekly user growth</div>
          </div>
        </section>

        {/* 2. System Health Panel */}
        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#FF9933]" />
            System Health &amp; Provider Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">Upstash Redis</div>
                <div className="text-white/40 text-[11px]">Database &amp; History</div>
              </div>
              {getHealthBadge(statsData?.health?.redis)}
            </div>

            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">Groq SDK</div>
                <div className="text-white/40 text-[11px] font-mono">{statsData?.health?.groqModel || "Groq"}</div>
              </div>
              {getHealthBadge(statsData?.health?.groq)}
            </div>

            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">Google Gemini</div>
                <div className="text-white/40 text-[11px] font-mono">{statsData?.health?.geminiModel || "Gemini"}</div>
              </div>
              {getHealthBadge(statsData?.health?.gemini)}
            </div>

            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">Tavily Web Search</div>
                <div className="text-white/40 text-[11px]">Live External Search</div>
              </div>
              {getHealthBadge(statsData?.health?.tavily)}
            </div>

            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">Serper Search</div>
                <div className="text-white/40 text-[11px]">Real Photo Lookup</div>
              </div>
              {getHealthBadge(statsData?.health?.serper)}
            </div>

            <div className="glass p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-white/90">NextAuth Secret</div>
                <div className="text-white/40 text-[11px]">JWT Session Encryption</div>
              </div>
              {getHealthBadge(statsData?.health?.nextauthSecret)}
            </div>
          </div>
        </section>

        {/* 3. Users Management Table */}
        <section className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                Registered Users ({usersData.length})
              </h2>
              <p className="text-xs text-white/40 mt-0.5">Manage accounts, assign roles, or delete users safely.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Chats</th>
                  <th className="py-3 px-3">Registered</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersData.map((u) => {
                  const isCurrent = u.email?.toLowerCase() === user.email?.toLowerCase();
                  return (
                    <tr key={u.email} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-white/90">{u.name}</div>
                        <div className="text-[11px] text-white/40">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.role === "admin"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-white/5 text-white/50 border border-white/10"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white/80">{u.chatCount}</td>
                      <td className="py-3 px-3 text-white/50">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-3 text-white/50">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleRoleToggle(u.email, u.role)}
                            disabled={actionLoading === u.email || isCurrent}
                            title={isCurrent ? "Aap khud ka role change nahi kar sakte" : "Role Toggle"}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]"
                          >
                            {u.role === "admin" ? "Make User" : "Make Admin"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.email)}
                            disabled={actionLoading === u.email || isCurrent}
                            title={isCurrent ? "Aap khud ka account delete nahi kar sakte" : "Delete Account"}
                            className="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Recent Activity Metadata */}
        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-1">
            Recent Chat Activity (Latest 20)
          </h2>
          <p className="text-xs text-white/40 mb-4">
            Privacy Protected: Only chat metadata and titles are displayed. User message content is private.
          </p>

          <div className="space-y-2">
            {(statsData?.recentChats || []).length === 0 ? (
              <div className="text-xs text-white/30 py-6 text-center">Koi chat activity nahi mili.</div>
            ) : (
              (statsData?.recentChats || []).map((chat: any) => (
                <div
                  key={chat.id + chat.userEmail}
                  className="glass p-3 rounded-xl flex items-center justify-between text-xs gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white/90 truncate">{chat.title}</div>
                    <div className="text-[11px] text-white/40 truncate">{chat.userEmail}</div>
                  </div>
                  <div className="text-right flex-shrink-0 text-[11px] text-white/50">
                    <div>{chat.messageCount} messages</div>
                    <div className="text-[10px] text-white/30">
                      {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString("en-IN") : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

