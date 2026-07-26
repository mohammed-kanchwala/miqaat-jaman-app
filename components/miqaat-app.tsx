"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { FAMILIES } from "@/lib/families";
import type { AdminBookingRow, MiqaatStatusRow, MyBookingRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoonStrip } from "@/components/moon-strip";
import { Moon, MoonStar, MapPin, Clock, Check, X, ShieldCheck, Loader2 } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByMonth<T extends { hijri_month: string }>(list: T[]) {
  const groups: Record<string, T[]> = {};
  for (const m of list) {
    if (!groups[m.hijri_month]) groups[m.hijri_month] = [];
    groups[m.hijri_month].push(m);
  }
  return groups;
}

export default function MiqaatApp() {
  const [tab, setTab] = useState<"calendar" | "my-jaman" | "admin">("calendar");

  // ---- Calendar ----
  const [miqaats, setMiqaats] = useState<MiqaatStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [claimTarget, setClaimTarget] = useState<MiqaatStatusRow | null>(null);
  const [claimFamily, setClaimFamily] = useState(FAMILIES[0]);
  const [claimNotes, setClaimNotes] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const loadMiqaats = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("miqaat_status")
      .select("*")
      .order("gregorian_date");
    if (error) setLoadError(error.message);
    else setMiqaats((data as MiqaatStatusRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMiqaats();
  }, [loadMiqaats]);

  async function handleClaim() {
    if (!claimTarget) return;
    setClaiming(true);
    setClaimError(null);
    const { error } = await supabase.rpc("claim_miqaat", {
      p_miqaat_id: claimTarget.id,
      p_family_name: claimFamily,
      p_notes: claimNotes || null,
    });
    setClaiming(false);
    if (error) {
      setClaimError(error.message);
      return;
    }
    setClaimTarget(null);
    setClaimNotes("");
    loadMiqaats();
  }

  // ---- My Jaman ----
  const [myFamily, setMyFamily] = useState(FAMILIES[0]);
  const [myBookings, setMyBookings] = useState<MyBookingRow[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const loadMyBookings = useCallback(async (family: string) => {
    setMyLoading(true);
    const { data, error } = await supabase.rpc("get_my_bookings", {
      p_family_name: family,
    });
    if (!error) setMyBookings((data as MyBookingRow[]) ?? []);
    setMyLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "my-jaman") loadMyBookings(myFamily);
  }, [tab, myFamily, loadMyBookings]);

  async function handleRequestCancellation(bookingId: string) {
    const { error } = await supabase.rpc("request_cancellation", {
      p_booking_id: bookingId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    loadMyBookings(myFamily);
  }

  // ---- Admin ----
  const [session, setSession] = useState<Session | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [adminBookings, setAdminBookings] = useState<AdminBookingRow[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAdminBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("booking")
      .select("*, miqaat:miqaat_id(*)")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (!error) setAdminBookings((data as unknown as AdminBookingRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (tab === "admin" && session) loadAdminBookings();
  }, [tab, session, loadAdminBookings]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoggingIn(false);
    if (error) setLoginError(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleApprove(bookingId: string) {
    const { error } = await supabase.rpc("approve_cancellation", {
      p_booking_id: bookingId,
    });
    if (error) return alert(error.message);
    loadAdminBookings();
    loadMiqaats();
  }

  async function handleReject(bookingId: string) {
    const { error } = await supabase.rpc("reject_cancellation", {
      p_booking_id: bookingId,
    });
    if (error) return alert(error.message);
    loadAdminBookings();
  }

  const grouped = groupByMonth(miqaats);
  const pendingCancellations = adminBookings.filter(
    (b) => b.status === "cancellation_requested"
  );

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-900 text-stone-50">
        <div className="mx-auto max-w-3xl px-5 py-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MoonStar className="h-4 w-4 text-amber-400" />
              <span className="text-xs uppercase tracking-widest text-amber-400">1448 Hijri</span>
            </div>
            <MoonStrip />
          </div>
          <h1 className="font-serif text-3xl">Jaman Calendar</h1>
          <p className="mt-1 text-sm text-slate-300">
            Select a miqaat below to sponsor jaman for the community.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="my-jaman">My Jaman</TabsTrigger>
            <TabsTrigger value="admin">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Admin
            </TabsTrigger>
          </TabsList>

          {/* ---------------- CALENDAR ---------------- */}
          <TabsContent value="calendar" className="space-y-8">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
              </div>
            )}
            {loadError && (
              <p className="text-sm text-red-600">Couldn&apos;t load the calendar: {loadError}</p>
            )}
            {!loading && !loadError && miqaats.length === 0 && (
              <p className="text-sm text-slate-500">
                No miqaats yet — the admin needs to import this year&apos;s list.
              </p>
            )}
            {Object.entries(grouped).map(([month, items]) => (
              <div key={month}>
                <h2 className="mb-3 font-serif text-lg text-slate-700">{month}</h2>
                <div className="space-y-3">
                  {items.map((m) => {
                    const isOpen = m.availability === "open";
                    return (
                      <Card key={m.id}>
                        <CardContent className="flex items-start justify-between gap-4 py-4">
                          <div className="flex items-start gap-3">
                            {isOpen ? (
                              <Moon className="mt-0.5 h-5 w-5 text-amber-500" />
                            ) : (
                              <MoonStar className="mt-0.5 h-5 w-5 text-slate-400" />
                            )}
                            <div>
                              <p className="font-medium">{m.name}</p>
                              <p className="text-sm text-slate-500">
                                {m.hijri_day} · {formatDate(m.gregorian_date)} · {m.day_of_week}
                              </p>
                              {m.location && (
                                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                                  <MapPin className="h-3.5 w-3.5" /> {m.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isOpen ? (
                              <Badge tone="open">Open</Badge>
                            ) : (
                              <Badge tone="taken">
                                {m.booking_status === "cancellation_requested"
                                  ? "Cancellation pending"
                                  : "Taken"}
                              </Badge>
                            )}
                            {isOpen && (
                              <Button size="sm" onClick={() => setClaimTarget(m)}>
                                Claim jaman
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ---------------- MY JAMAN ---------------- */}
          <TabsContent value="my-jaman" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">You are:</span>
              <Select
                className="w-56"
                value={myFamily}
                onChange={(e) => setMyFamily(e.target.value)}
              >
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>

            {myLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}

            {!myLoading && myBookings.length === 0 && (
              <p className="text-sm text-slate-500">
                No jaman claimed yet. Head to the Calendar tab to pick one.
              </p>
            )}

            <div className="space-y-3">
              {myBookings.map((b) => {
                const canCancel = b.status === "booked" && b.days_until_miqaat >= 15;
                return (
                  <Card key={b.booking_id}>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-sm text-slate-500">
                          {b.hijri_day} · {formatDate(b.gregorian_date)}
                        </p>
                        {b.status === "cancellation_requested" && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                            <Clock className="h-3 w-3" /> Cancellation requested — awaiting admin review
                          </p>
                        )}
                      </div>
                      <div>
                        {b.status === "booked" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canCancel}
                            onClick={() => handleRequestCancellation(b.booking_id)}
                            title={
                              !canCancel
                                ? "Cancellations aren't allowed within 15 days of the miqaat"
                                : undefined
                            }
                          >
                            {canCancel
                              ? "Request cancellation"
                              : `Locked (${Math.max(b.days_until_miqaat, 0)}d left)`}
                          </Button>
                        )}
                        {b.status === "cancellation_requested" && (
                          <Badge tone="pending">Pending</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ---------------- ADMIN ---------------- */}
          <TabsContent value="admin" className="space-y-6">
            {!session ? (
              <Card className="max-w-sm">
                <CardContent className="space-y-3 py-5">
                  <p className="font-serif text-lg">Admin sign in</p>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                    <Button type="submit" disabled={loggingIn} className="w-full">
                      {loggingIn ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-slate-800 bg-slate-900 text-stone-50">
                  <CardContent className="flex items-center justify-between py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Admin view — sponsor names are only ever visible here.
                    </span>
                    <button onClick={handleSignOut} className="text-slate-300 underline hover:text-white">
                      Sign out
                    </button>
                  </CardContent>
                </Card>

                {pendingCancellations.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-serif text-lg">Pending cancellation requests</h3>
                    <div className="space-y-3">
                      {pendingCancellations.map((b) => (
                        <Card key={b.id} className="border-amber-200 bg-amber-50">
                          <CardContent className="flex items-center justify-between gap-4 py-4">
                            <div>
                              <p className="font-medium">{b.miqaat.name}</p>
                              <p className="text-sm text-slate-600">
                                {b.family_name} · {formatDate(b.miqaat.gregorian_date)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleReject(b.id)}>
                                <X className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                              <Button size="sm" onClick={() => handleApprove(b.id)}>
                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 font-serif text-lg">Full sponsor list</h3>
                  <div className="space-y-2">
                    {adminBookings
                      .filter((b) => b.status !== "cancelled")
                      .map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between border-b border-slate-200 py-2 text-sm"
                        >
                          <span className="text-slate-700">
                            {b.miqaat.hijri_day} — {b.miqaat.name}
                          </span>
                          <span className="font-medium">{b.family_name}</span>
                        </div>
                      ))}
                    {adminBookings.length === 0 && (
                      <p className="text-sm text-slate-500">No bookings yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ---------------- CLAIM DIALOG ---------------- */}
      <Dialog open={!!claimTarget} onOpenChange={(o) => !o && setClaimTarget(null)}>
        {claimTarget && (
          <>
            <DialogHeader>
              <DialogTitle>Claim jaman for {claimTarget.name}</DialogTitle>
              <DialogDescription>
                {claimTarget.hijri_day} · {formatDate(claimTarget.gregorian_date)}. This saves
                immediately — no admin approval needed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Family</label>
                <Select value={claimFamily} onChange={(e) => setClaimFamily(e.target.value)}>
                  {FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Estimated headcount, dietary notes, etc."
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                />
              </div>
              {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handleClaim} disabled={claiming}>
                {claiming ? "Saving…" : "Confirm claim"}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
