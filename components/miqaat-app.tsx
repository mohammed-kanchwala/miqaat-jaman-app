"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  AdminBookingRow,
  FamilyNameRow,
  FamilyRow,
  MiqaatStatusAdminRow,
  MiqaatStatusRow,
  MyBookingRow,
} from "@/lib/types";
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
import { cn } from "@/lib/utils";
import { Moon, MoonStar, MapPin, Clock, Check, X, ShieldCheck, Loader2, CalendarPlus, Trash2, Pencil } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const HIJRI_MONTHS = [
  "Shehre Moharramul Haram",
  "Safarul Muzaffar",
  "Rabiul Awwal",
  "Rabiul Akhar",
  "Jamadal Ula",
  "Jamadal Ukhra",
  "Shehre Rajabul Asab",
  "Shabanul Karim",
  "Shehre Ramzanul Moazzam",
  "Shawwalul Mukarram",
  "Zilqadatil Haram",
  "Zilhijatil Haram",
];

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
  const [calendarFilter, setCalendarFilter] = useState<
    "all" | "open" | "taken" | "no_jaman" | "community_niyaz"
  >("all");
  const [calendarFamily, setCalendarFamily] = useState<string | null>(null);

  // ---- Calendar ----
  const [miqaats, setMiqaats] = useState<MiqaatStatusRow[]>([]);
  const [adminMiqaats, setAdminMiqaats] = useState<MiqaatStatusAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [claimTarget, setClaimTarget] = useState<MiqaatStatusRow | null>(null);
  const [claimFamily, setClaimFamily] = useState("");
  const [claimAccessCode, setClaimAccessCode] = useState("");
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
      p_access_code: claimAccessCode,
      p_notes: claimNotes || null,
    });
    setClaiming(false);
    if (error) {
      setClaimError(error.message);
      return;
    }
    setClaimTarget(null);
    setClaimAccessCode("");
    setClaimNotes("");
    loadMiqaats();
  }

  // ---- My Jaman ----
  const [families, setFamilies] = useState<FamilyNameRow[]>([]);
  const [myFamily, setMyFamily] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [verifiedFamily, setVerifiedFamily] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [myBookings, setMyBookings] = useState<MyBookingRow[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const loadMyBookings = useCallback(async (family: string, code: string) => {
    setMyLoading(true);
    setBookingsError(null);
    const { data, error } = await supabase.rpc("get_my_bookings", {
      p_family_name: family,
      p_access_code: code,
    });
    if (error) {
      setBookingsError(error.message);
      setMyBookings([]);
    } else {
      setMyBookings((data as MyBookingRow[]) ?? []);
      setVerifiedFamily(family);
    }
    setMyLoading(false);
  }, []);

  async function handleRequestCancellation(bookingId: string) {
    const { error } = await supabase.rpc("request_cancellation", {
      p_booking_id: bookingId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    if (verifiedFamily) loadMyBookings(verifiedFamily, accessCode);
  }

  // Load family names from DB for dropdowns
  const [claimFamilies, setClaimFamilies] = useState<FamilyNameRow[]>([]);

  useEffect(() => {
    supabase.from("family_names").select("*").then(({ data }) => {
      if (data) {
        const names = data as FamilyNameRow[];
        setFamilies(names);
        setClaimFamilies(names);
        if (names.length > 0 && !myFamily) setMyFamily(names[0].name);
        if (names.length > 0 && !claimFamily) setClaimFamily(names[0].name);
      }
    });
  }, []);

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

  // Load the admin-only miqaat list (with sponsor names) while signed in,
  // and drop it as soon as the admin signs out.
  useEffect(() => {
    if (!session) {
      setAdminMiqaats([]);
      return;
    }
    supabase
      .from("miqaat_status_admin")
      .select("*")
      .order("gregorian_date")
      .then(({ data, error }) => {
        if (!error) setAdminMiqaats((data as MiqaatStatusAdminRow[]) ?? []);
      });
  }, [session]);

  const loadAdminBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("booking")
      .select("*, miqaat:miqaat_id(*)")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (!error) setAdminBookings((data as unknown as AdminBookingRow[]) ?? []);
  }, []);

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

  // ---- Admin: Family Management ----
  const [adminFamilies, setAdminFamilies] = useState<FamilyRow[]>([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [addingFamily, setAddingFamily] = useState(false);
  const [familyMsg, setFamilyMsg] = useState<string | null>(null);

  const loadAdminFamilies = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_families");
    if (!error) setAdminFamilies((data as FamilyRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (tab === "admin" && session) {
      loadAdminBookings();
      loadAdminFamilies();
    }
  }, [tab, session, loadAdminBookings, loadAdminFamilies]);

  async function handleAddFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    setAddingFamily(true);
    setFamilyMsg(null);
    const { data, error } = await supabase.rpc("add_family", {
      p_name: newFamilyName.trim(),
    });
    setAddingFamily(false);
    if (error) {
      setFamilyMsg(`Error: ${error.message}`);
      return;
    }
    const added = (data as FamilyRow[])[0];
    setFamilyMsg(`Added "${added.name}" — Access code: ${added.access_code}`);
    setNewFamilyName("");
    loadAdminFamilies();
    // Refresh the family dropdowns
    const { data: names } = await supabase.from("family_names").select("*");
    if (names) {
      setFamilies(names as FamilyNameRow[]);
      setClaimFamilies(names as FamilyNameRow[]);
    }
  }

  async function handleDeleteFamily(id: string) {
    if (!confirm("Delete this family? This cannot be undone.")) return;
    const { error } = await supabase.rpc("delete_family", { p_family_id: id });
    if (error) return alert(error.message);
    loadAdminFamilies();
    const { data: names } = await supabase.from("family_names").select("*");
    if (names) {
      setFamilies(names as FamilyNameRow[]);
      setClaimFamilies(names as FamilyNameRow[]);
    }
  }

  async function handleResetCode(familyId: string) {
    const { data, error } = await supabase.rpc("reset_access_code", {
      p_family_id: familyId,
    });
    if (error) return alert(error.message);
    setFamilyMsg(`New access code generated: ${data}`);
    loadAdminFamilies();
  }

  // ---- Admin: Miqaat add/edit (shared dialog) ----
  const [miqaatDialogOpen, setMiqaatDialogOpen] = useState(false);
  const [editingMiqaat, setEditingMiqaat] = useState<MiqaatStatusRow | null>(null);
  const [miqaatMonth, setMiqaatMonth] = useState(HIJRI_MONTHS[0]);
  const [miqaatDay, setMiqaatDay] = useState("");
  const [miqaatDate, setMiqaatDate] = useState("");
  const [miqaatName, setMiqaatName] = useState("");
  const [miqaatLocation, setMiqaatLocation] = useState("");
  const [miqaatNotes, setMiqaatNotes] = useState("");
  const [miqaatCommunityNiyaz, setMiqaatCommunityNiyaz] = useState(false);
  const [savingMiqaat, setSavingMiqaat] = useState(false);
  const [miqaatError, setMiqaatError] = useState<string | null>(null);
  const [miqaatMsg, setMiqaatMsg] = useState<string | null>(null);

  function openAddMiqaatDialog() {
    setEditingMiqaat(null);
    setMiqaatMonth(HIJRI_MONTHS[0]);
    setMiqaatDay("");
    setMiqaatDate("");
    setMiqaatName("");
    setMiqaatLocation("");
    setMiqaatNotes("");
    setMiqaatCommunityNiyaz(false);
    setMiqaatError(null);
    setMiqaatDialogOpen(true);
  }

  function openEditMiqaatDialog(miqaat: MiqaatStatusRow) {
    setEditingMiqaat(miqaat);
    setMiqaatMonth(miqaat.hijri_month);
    setMiqaatDay(miqaat.hijri_day);
    setMiqaatDate(miqaat.gregorian_date);
    setMiqaatName(miqaat.name);
    setMiqaatLocation(miqaat.location ?? "");
    setMiqaatNotes(miqaat.niyaz_notes ?? "");
    setMiqaatCommunityNiyaz(miqaat.availability === "community_niyaz");
    setMiqaatError(null);
    setMiqaatDialogOpen(true);
  }

  async function handleSaveMiqaat(e: React.FormEvent) {
    e.preventDefault();
    if (!miqaatDay.trim() || !miqaatDate || !miqaatName.trim()) return;
    setSavingMiqaat(true);
    setMiqaatError(null);
    const payload = {
      p_hijri_month: miqaatMonth,
      p_hijri_day: miqaatDay.trim(),
      p_gregorian_date: miqaatDate,
      p_name: miqaatName.trim(),
      p_location: miqaatLocation.trim() || null,
      p_niyaz_notes: miqaatNotes.trim() || null,
      p_community_niyaz: miqaatCommunityNiyaz,
    };
    const { error } = editingMiqaat
      ? await supabase.rpc("update_miqaat", { p_miqaat_id: editingMiqaat.id, ...payload })
      : await supabase.rpc("add_miqaat", payload);
    setSavingMiqaat(false);
    if (error) {
      setMiqaatError(error.message);
      return;
    }
    setMiqaatMsg(
      editingMiqaat
        ? `Updated "${miqaatName.trim()}".`
        : `Added "${miqaatName.trim()}" — families can now claim it.`
    );
    setMiqaatDialogOpen(false);
    setEditingMiqaat(null);
    loadMiqaats();
  }

  async function handleDeleteMiqaat(miqaat: MiqaatStatusRow) {
    if (
      !confirm(
        `Delete "${miqaat.name}" (${miqaat.hijri_day})? This removes the miqaat and its bookings permanently.`
      )
    )
      return;
    const { error } = await supabase.rpc("delete_miqaat", {
      p_miqaat_id: miqaat.id,
    });
    if (error) return alert(error.message);
    setMiqaatMsg(`Deleted "${miqaat.name}".`);
    loadMiqaats();
  }

  const visibleMiqaats =
    calendarFilter === "all"
      ? miqaats
      : miqaats.filter((m) => m.availability === calendarFilter);

  // Family filter (admin-only, via adminMiqaats) applies on top of the status filter.
  const familyFiltered =
    calendarFamily && session
      ? visibleMiqaats.filter(
          (m) =>
            adminMiqaats.find((am) => am.id === m.id)?.family_name === calendarFamily
        )
      : visibleMiqaats;
  const grouped = groupByMonth(familyFiltered);
  const pendingCancellations = adminBookings.filter(
    (b) => b.status === "cancellation_requested"
  );
  const takenMiqaats = miqaats.filter((m) => m.availability === "taken").length;
  const noJamanMiqaats = miqaats.filter((m) => m.availability === "no_jaman").length;
  const communityNiyazMiqaats = miqaats.filter(
    (m) => m.availability === "community_niyaz"
  ).length;
  // Community niyaz and no-jaman days are not claimable, so they're not "remaining".
  const remainingMiqaats =
    miqaats.length - takenMiqaats - noJamanMiqaats - communityNiyazMiqaats;
  const bookingsByFamily = adminBookings.reduce<Record<string, number>>(
    (acc, b) => {
      acc[b.family_name] = (acc[b.family_name] ?? 0) + 1;
      return acc;
    },
    {}
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
            {!loading && !loadError && miqaats.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Filter</span>
                  {(
                    [
                      ["all", "All", miqaats.length],
                      ["taken", "Taken", takenMiqaats],
                      ["open", "Remaining", remainingMiqaats],
                      ["community_niyaz", "Community", communityNiyazMiqaats],
                      ["no_jaman", "No Jaman", noJamanMiqaats],
                    ] as const
                  ).map(([value, label, count]) => (
                    <button
                      key={value}
                      onClick={() => setCalendarFilter(value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        calendarFilter === value
                          ? "border-slate-900 bg-slate-900 text-stone-50"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                      )}
                    >
                      {label} · {count}
                    </button>
                  ))}
                </div>
                {session && (
                  <Button size="sm" onClick={openAddMiqaatDialog}>
                    <CalendarPlus className="mr-1 h-4 w-4" /> Add miqaat
                  </Button>
                )}
              </div>
            )}
            {!loading &&
              !loadError &&
              familyFiltered.length === 0 &&
              (calendarFilter !== "all" || (calendarFamily && session)) && (
                <p className="text-sm text-slate-500">
                  No {calendarFilter === "all" ? "" : `${calendarFilter} `}miqaats
                  {calendarFamily && session ? ` for ${calendarFamily}` : ""} found.
                </p>
              )}
            {!loading && !loadError && calendarFamily && session && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span>
                  Showing jaman for <span className="font-semibold">{calendarFamily}</span>
                  {familyFiltered.length > 0 ? ` — ${familyFiltered.length} total` : ""}.
                </span>
                <button
                  onClick={() => setCalendarFamily(null)}
                  className="font-medium underline hover:text-amber-900"
                >
                  Show all
                </button>
              </div>
            )}
            {Object.entries(grouped).map(([month, items]) => (
              <div key={month}>
                <h2 className="mb-3 font-serif text-lg text-slate-700">{month}</h2>
                <div className="space-y-3">
                  {items.map((m) => {
                    const isOpen = m.availability === "open";
                    const isNoJaman = m.availability === "no_jaman";
                    const isCommunityNiyaz = m.availability === "community_niyaz";
                    const familyName = adminMiqaats.find(
                      (am) => am.id === m.id
                    )?.family_name;
                    return (
                      <Card key={m.id}>
                        <CardContent className="flex items-start justify-between gap-4 py-4">
                          <div className="flex items-start gap-3">
                            {isNoJaman || isCommunityNiyaz ? (
                              <MoonStar className="mt-0.5 h-5 w-5 text-slate-400" />
                            ) : isOpen ? (
                              <Moon className="mt-0.5 h-5 w-5 text-amber-500" />
                            ) : (
                              <MoonStar className="mt-0.5 h-5 w-5 text-slate-400" />
                            )}
                            <div>
                              <p className="font-medium">{m.name}</p>
                              <p className="text-sm text-slate-500">
                                {m.hijri_day} · {formatDate(m.gregorian_date)} · {m.day_of_week}
                              </p>
                              {familyName && (
                                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-900">
                                  <Moon className="h-3.5 w-3.5 text-amber-500" />
                                  Sponsored by {familyName}
                                </p>
                              )}
                              {m.location && (
                                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                                  <MapPin className="h-3.5 w-3.5" /> {m.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isCommunityNiyaz ? (
                              // Community niyaz: jaman is done by everyone, not claimed by a family.
                              // Public visitors see no badge; admins see a subtle note.
                              session ? (
                                <Badge tone="pending">Community niyaz</Badge>
                              ) : null
                            ) : isNoJaman ? (
                              <Badge tone="neutral">No Jaman</Badge>
                            ) : isOpen ? (
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
                            {session && (
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => openEditMiqaatDialog(m)}
                                  className="flex items-center gap-1 text-slate-500 underline hover:text-slate-700"
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMiqaat(m)}
                                  className="flex items-center gap-1 text-red-500 underline hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                              </div>
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
            {!verifiedFamily ? (
              <Card>
                <CardContent className="space-y-4 py-5">
                  <p className="font-serif text-lg">View your family&apos;s jaman</p>
                  <p className="text-sm text-slate-500">
                    Select your family name and enter your access code to see your bookings.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Family</label>
                      <Select value={myFamily} onChange={(e) => setMyFamily(e.target.value)}>
                        {families.length === 0 && <option value="">Loading…</option>}
                        {families.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Access code</label>
                      <Input
                        type="text"
                        placeholder="e.g. XK7M2P"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() => loadMyBookings(myFamily, accessCode)}
                      disabled={myLoading || !myFamily || !accessCode}
                    >
                      {myLoading ? "Loading…" : "View my jaman"}
                    </Button>
                    {bookingsError && (
                      <p className="text-sm text-red-600">{bookingsError}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Showing jaman for <span className="font-semibold">{verifiedFamily}</span>
                  </p>
                  <button
                    onClick={() => {
                      setVerifiedFamily(null);
                      setAccessCode("");
                      setMyBookings([]);
                      setBookingsError(null);
                    }}
                    className="text-sm text-slate-500 underline hover:text-slate-700"
                  >
                    Not you? Change
                  </button>
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
              </>
            )}
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

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCalendarFilter("all");
                      setTab("calendar");
                    }}
                    className="block"
                  >
                    <Card className="border-slate-200 bg-white transition hover:border-slate-400">
                      <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold">{miqaats.length}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Total miqaats
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCalendarFilter("taken");
                      setTab("calendar");
                    }}
                    className="block"
                  >
                    <Card className="border-emerald-200 bg-emerald-50 transition hover:border-emerald-400">
                      <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{takenMiqaats}</p>
                        <p className="text-xs uppercase tracking-wide text-emerald-700">
                          Taken
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCalendarFilter("open");
                      setTab("calendar");
                    }}
                    className="block"
                  >
                    <Card className="border-sky-200 bg-sky-50 transition hover:border-sky-400">
                      <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-sky-700">{remainingMiqaats}</p>
                        <p className="text-xs uppercase tracking-wide text-sky-700">
                          Remaining
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCalendarFilter("no_jaman");
                      setTab("calendar");
                    }}
                    className="block"
                  >
                    <Card className="border-slate-200 bg-slate-50 transition hover:border-slate-400">
                      <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-slate-600">{noJamanMiqaats}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          No Jaman
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCalendarFilter("community_niyaz");
                      setTab("calendar");
                    }}
                    className="block"
                  >
                    <Card className="border-indigo-200 bg-indigo-50 transition hover:border-indigo-400">
                      <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-indigo-700">
                          {communityNiyazMiqaats}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-indigo-700">
                          Community
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                </div>

                <div>
                  <h3 className="mb-3 font-serif text-lg">Bookings by family</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {adminFamilies.map((f) => (
                      <a
                        key={f.id}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          // Clicking the selected family clears the filter; clicking another selects it.
                          setCalendarFamily(calendarFamily === f.name ? null : f.name);
                          setTab("calendar");
                        }}
                        className="block"
                      >
                        <Card
                          className={cn(
                            "border-slate-200 transition hover:border-amber-400",
                            calendarFamily === f.name && "border-amber-400 ring-1 ring-amber-200"
                          )}
                        >
                          <CardContent className="flex items-center justify-between py-4">
                            <span className="font-medium">{f.name}</span>
                            <Badge tone={bookingsByFamily[f.name] ? "taken" : "neutral"}>
                              {bookingsByFamily[f.name] ?? 0} jaman
                            </Badge>
                          </CardContent>
                        </Card>
                      </a>
                    ))}
                  </div>
                </div>

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

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="mb-3 font-serif text-lg">Manage families</h3>

                  {familyMsg && (
                    <p className="mb-3 text-sm font-medium text-emerald-700">{familyMsg}</p>
                  )}

                  {/* Add family form */}
                  <form onSubmit={handleAddFamily} className="mb-4 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">New family name</label>
                      <Input
                        placeholder="e.g. Abbas Bhai"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={addingFamily}>
                      {addingFamily ? "Adding…" : "Add family"}
                    </Button>
                  </form>

                  {/* Family table */}
                  <div className="space-y-2">
                    {adminFamilies.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between border-b border-slate-200 py-2 text-sm"
                      >
                        <span className="font-medium">{f.name}</span>
                        <div className="flex items-center gap-3">
                          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs tracking-wider">
                            {f.access_code}
                          </code>
                          <button
                            onClick={() => handleResetCode(f.id)}
                            className="text-xs text-slate-500 underline hover:text-slate-700"
                            title="Reset access code"
                          >
                            Reset code
                          </button>
                          <button
                            onClick={() => handleDeleteFamily(f.id)}
                            className="text-xs text-red-500 underline hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {adminFamilies.length === 0 && (
                      <p className="text-sm text-slate-500">No families yet.</p>
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
                  {claimFamilies.length === 0 && <option value="">Loading…</option>}
                  {claimFamilies.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Family access code</label>
                <Input
                  type="text"
                  placeholder="e.g. XK7M2P"
                  value={claimAccessCode}
                  onChange={(e) => setClaimAccessCode(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Your family&apos;s code — ask the admin if you don&apos;t know it.
                </p>
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
              <Button onClick={handleClaim} disabled={claiming || !claimAccessCode}>
                {claiming ? "Saving…" : "Confirm claim"}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* ---------------- ADD/EDIT MIQAAT DIALOG ---------------- */}
      <Dialog open={miqaatDialogOpen} onOpenChange={(o) => !o && setMiqaatDialogOpen(false)}>
        <form onSubmit={handleSaveMiqaat}>
          <DialogHeader>
            <DialogTitle>{editingMiqaat ? "Edit miqaat" : "Add miqaat"}</DialogTitle>
            <DialogDescription>
              {editingMiqaat
                ? `Update the details for ${editingMiqaat.name}.`
                : "Create a new miqaat — families can claim it right away."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Hijri month</label>
                <Select value={miqaatMonth} onChange={(e) => setMiqaatMonth(e.target.value)}>
                  {HIJRI_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Hijri day</label>
                <Input
                  placeholder="e.g. 22mi tarekh"
                  value={miqaatDay}
                  onChange={(e) => setMiqaatDay(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Gregorian date</label>
                <Input
                  type="date"
                  value={miqaatDate}
                  onChange={(e) => setMiqaatDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Occasion name</label>
                <Input
                  placeholder="e.g. 16mi Darees"
                  value={miqaatName}
                  onChange={(e) => setMiqaatName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location (optional)</label>
              <Input
                placeholder="e.g. Madina"
                value={miqaatLocation}
                onChange={(e) => setMiqaatLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Niyaz notes (optional)</label>
              <Input
                placeholder="e.g. Maula TUS Ashara"
                value={miqaatNotes}
                onChange={(e) => setMiqaatNotes(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={miqaatCommunityNiyaz}
                onChange={(e) => setMiqaatCommunityNiyaz(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Community niyaz — jaman done by the whole community,{" "}
                <span className="font-medium">not claimable by a family</span>
              </span>
            </label>
            {miqaatError && <p className="text-sm text-red-600">{miqaatError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMiqaatDialogOpen(false)}
              disabled={savingMiqaat}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingMiqaat}>
              {savingMiqaat
                ? "Saving…"
                : editingMiqaat
                ? "Save changes"
                : "Add miqaat"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
