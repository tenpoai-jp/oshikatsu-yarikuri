"use client";

import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Expense = { id: number; amount: number; category: string; oshi: string; date: string };
type Wages = { morning: number; day: number; evening: number; night: number };
// 新形式: start/end（時刻）。旧形式: hours/zone も一応サポート。
type Shift = { id: number; date: string; start?: string; end?: string; hours?: number; zone?: keyof Wages };
type Planned = { id: number; label: string; amount: number; date: string };

const CATEGORIES = ["グッズ", "ライブ・イベント", "投げ銭・スパチャ", "メンバーシップ", "交通費", "その他"];
const DEFAULT_WAGES: Wages = { morning: 1000, day: 1100, evening: 1200, night: 1375 };
const ZONE_LABELS: { key: keyof Wages; label: string }[] = [
  { key: "morning", label: "朝" },
  { key: "day", label: "昼" },
  { key: "evening", label: "夜" },
  { key: "night", label: "深夜" },
];
const zoneLabel = (k: keyof Wages) => ZONE_LABELS.find((z) => z.key === k)?.label ?? k;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const PALETTE = ["#ec4899", "#a855f7", "#f472b6", "#c084fc", "#f9a8d4", "#d8b4fe", "#fb7185"];

const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
const round100 = (n: number) => Math.round(n / 100) * 100;
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const minToTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const timeToMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hoursLabel = (h: number) => (h > 0 && h < 1 ? `約${h.toFixed(1)}時間【約${Math.round(h * 60)}分】` : `約${h.toFixed(1)}時間`);

type Bounds = { morning: number; day: number; evening: number; night: number };
const DEFAULT_BOUNDS: Bounds = { morning: 300, day: 600, evening: 1080, night: 1320 };

export default function Home() {
  const [tab, setTab] = useState<"home" | "calendar" | "settings">("home");
  const [breakdownBy, setBreakdownBy] = useState<"oshi" | "category">("oshi");

  const [budget, setBudget] = useState(10000);
  const [wages, setWages] = useState<Wages>(DEFAULT_WAGES);
  const [bounds, setBounds] = useState<Bounds>(DEFAULT_BOUNDS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [planned, setPlanned] = useState<Planned[]>([]);

  const [incomeMode, setIncomeMode] = useState<"shift" | "salary">("shift");
  const [monthlySalary, setMonthlySalary] = useState(0);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [oshi, setOshi] = useState("");
  const [formDate, setFormDate] = useState("");

  const [calAmount, setCalAmount] = useState("");
  const [calCategory, setCalCategory] = useState(CATEGORIES[0]);
  const [calOshi, setCalOshi] = useState("");
  const [calStart, setCalStart] = useState("18:00");
  const [calEnd, setCalEnd] = useState("22:00");

  const [plLabel, setPlLabel] = useState("");
  const [plAmount, setPlAmount] = useState("");
  const [plDate, setPlDate] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalSaved, setGoalSaved] = useState(0);
  const [goalNameInput, setGoalNameInput] = useState("");
  const [goalTargetInput, setGoalTargetInput] = useState("");
  const [goalAddInput, setGoalAddInput] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [cloudReady, setCloudReady] = useState(false);

  const [view, setView] = useState({ y: 2026, m: 5 });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 保存データを画面に反映（ローカル/クラウド共通）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyData(d: any) {
    if (!d || typeof d !== "object") return;
    if (typeof d.budget === "number") setBudget(d.budget);
    if (d.wages && typeof d.wages === "object") setWages({ ...DEFAULT_WAGES, ...d.wages });
    else if (typeof d.wage === "number") setWages({ ...DEFAULT_WAGES, day: d.wage });
    if (d.bounds && typeof d.bounds === "object") setBounds({ ...DEFAULT_BOUNDS, ...d.bounds });
    if (d.incomeMode === "salary" || d.incomeMode === "shift") setIncomeMode(d.incomeMode);
    if (typeof d.monthlySalary === "number") setMonthlySalary(d.monthlySalary);
    if (Array.isArray(d.shifts)) setShifts(d.shifts.filter((s: Shift) => typeof s?.date === "string"));
    if (Array.isArray(d.expenses)) setExpenses(d.expenses);
    if (Array.isArray(d.planned)) setPlanned(d.planned);
    if (typeof d.goalName === "string") setGoalName(d.goalName);
    if (typeof d.goalTarget === "number") setGoalTarget(d.goalTarget);
    if (typeof d.goalSaved === "number") setGoalSaved(d.goalSaved);
  }
  function currentData() {
    return { budget, wages, bounds, incomeMode, monthlySalary, shifts, expenses, planned, goalName, goalTarget, goalSaved };
  }

  // 起動時：ローカル保存の読み込み＋当月セット
  useEffect(() => {
    try {
      const raw = localStorage.getItem("oshikatsu-data");
      if (raw) applyData(JSON.parse(raw));
    } catch {}
    const now = new Date();
    const today = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    setFormDate(today);
    setPlDate(today);
    setView({ y: now.getFullYear(), m: now.getMonth() + 1 });
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 認証（ログイン状態の監視）
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ログインしたらクラウドから読み込み（空なら今のデータを初回アップロード）
  useEffect(() => {
    if (!supabase || !session) { setCloudReady(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("user_data").select("data").eq("user_id", session.user.id).maybeSingle();
      if (cancelled) return;
      if (!error && data && data.data) applyData(data.data);
      else await supabase.from("user_data").upsert({ user_id: session.user.id, data: currentData() });
      setCloudReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 変更を保存（ローカル＋ログイン中はクラウドにも）
  useEffect(() => {
    if (!loaded) return;
    const blob = { budget, wages, bounds, incomeMode, monthlySalary, shifts, expenses, planned, goalName, goalTarget, goalSaved };
    localStorage.setItem("oshikatsu-data", JSON.stringify(blob));
    if (supabase && session && cloudReady) {
      supabase.from("user_data").upsert({ user_id: session.user.id, data: blob });
    }
  }, [budget, wages, bounds, incomeMode, monthlySalary, shifts, expenses, planned, goalName, goalTarget, goalSaved, loaded, session, cloudReady]);

  // 時間帯の区切り（ユーザー設定）
  const sortedBounds = ([
    { z: "morning", s: bounds.morning },
    { z: "day", s: bounds.day },
    { z: "evening", s: bounds.evening },
    { z: "night", s: bounds.night },
  ] as { z: keyof Wages; s: number }[]).sort((a, b) => a.s - b.s);
  function zoneAt(min: number): keyof Wages {
    const t = ((min % 1440) + 1440) % 1440;
    let cur = sortedBounds[sortedBounds.length - 1].z;
    for (const b of sortedBounds) { if (t >= b.s) cur = b.z; else break; }
    return cur;
  }

  // シフト → 時間・給料・時間帯内訳（時刻ベースで自動振り分け）
  function hpOf(s: { start?: string; end?: string; hours?: number; zone?: keyof Wages }) {
    if (s.start && s.end) {
      const p = (x: string) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; };
      let a = p(s.start), b = p(s.end);
      if (b <= a) b += 1440; // 日をまたぐ
      let pay = 0;
      const seg: Partial<Record<keyof Wages, number>> = {};
      for (let t = a; t < b; t++) {
        const z = zoneAt(t);
        pay += wages[z] / 60;
        seg[z] = (seg[z] || 0) + 1 / 60;
      }
      return { hours: (b - a) / 60, pay, seg };
    }
    const z = s.zone || "day";
    return { hours: s.hours || 0, pay: wages[z] * (s.hours || 0), seg: { [z]: s.hours || 0 } as Partial<Record<keyof Wages, number>> };
  }
  function segText(seg: Partial<Record<keyof Wages, number>>) {
    return ZONE_LABELS.filter((z) => (seg[z.key] || 0) > 0.01)
      .map((z) => `${z.label}${(seg[z.key] || 0).toFixed(1)}h`)
      .join(" + ");
  }

  const monthExpenses = expenses.filter((e) => { const [y, m] = (e.date || "").split("-").map(Number); return y === view.y && m === view.m; });
  const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = remaining < 0;
  const overAmount = over ? -remaining : 0;
  const nearLimit = !over && percent >= 80;

  const refWage = wages.day || wages.morning || wages.evening || wages.night || 0;
  const spentHours = refWage > 0 ? spent / refWage : 0;
  const refNeedHours = refWage > 0 ? overAmount / refWage : 0;
  const activeZones = ZONE_LABELS.map((z) => ({ ...z, wage: wages[z.key] })).filter((z) => z.wage > 0);

  const firstWeekday = new Date(view.y, view.m - 1, 1).getDay();
  const daysInMonth = new Date(view.y, view.m, 0).getDate();

  const monthShifts = shifts.filter((s) => {
    const [y, m] = s.date.split("-").map(Number);
    return y === view.y && m === view.m;
  });
  let shiftWorkHours = 0, shiftIncome = 0;
  monthShifts.forEach((s) => { const { hours, pay } = hpOf(s); shiftWorkHours += hours; shiftIncome += pay; });
  const workDays = new Set(monthShifts.map((s) => s.date)).size;

  const monthlyIncome = incomeMode === "salary" ? monthlySalary : shiftIncome;
  const incomePct = monthlyIncome > 0 ? Math.round((spent / monthlyIncome) * 100) : 0;

  // 先読み（この先の出費予定）
  const monthPlanned = planned.filter((p) => { const [y, m] = p.date.split("-").map(Number); return y === view.y && m === view.m; });
  const plannedTotal = monthPlanned.reduce((t, p) => t + p.amount, 0);
  const projRemaining = budget - (spent + plannedTotal);
  const projOver = projRemaining < 0;
  const projNeedHours = refWage > 0 ? (projOver ? -projRemaining : 0) / refWage : 0;

  // 貯金目標
  const goalRemaining = Math.max(0, goalTarget - goalSaved);
  const goalPct = goalTarget > 0 ? Math.min(100, Math.round((goalSaved / goalTarget) * 100)) : 0;
  const goalNeedHours = refWage > 0 ? goalRemaining / refWage : 0;

  const oshiTotals: Record<string, number> = {};
  const catTotals: Record<string, number> = {};
  monthExpenses.forEach((e) => {
    oshiTotals[e.oshi] = (oshiTotals[e.oshi] || 0) + e.amount;
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const oshiEntries = Object.entries(oshiTotals).sort((a, b) => b[1] - a[1]);
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const breakdownEntries = breakdownBy === "oshi" ? oshiEntries : catEntries;

  const dayExp: Record<number, number> = {};
  const dayWork: Record<number, number> = {};
  expenses.forEach((e) => {
    if (!e.date) return;
    const [ey, em, ed] = e.date.split("-").map(Number);
    if (ey === view.y && em === view.m) dayExp[ed] = (dayExp[ed] || 0) + e.amount;
  });
  monthShifts.forEach((s) => { const ed = Number(s.date.split("-")[2]); dayWork[ed] = (dayWork[ed] || 0) + hpOf(s).hours; });
  const dayPlan: Record<number, number> = {};
  monthPlanned.forEach((p) => { const ed = Number(p.date.split("-")[2]); dayPlan[ed] = (dayPlan[ed] || 0) + p.amount; });

  const selDateStr = selectedDay != null ? dateKey(view.y, view.m, selectedDay) : "";
  const selExpenses = selectedDay != null ? expenses.filter((e) => e.date === selDateStr) : [];
  const selShifts = selectedDay != null ? shifts.filter((s) => s.date === selDateStr) : [];
  const selPlanned = selectedDay != null ? planned.filter((p) => p.date === selDateStr) : [];
  const preview = calStart && calEnd ? hpOf({ start: calStart, end: calEnd }) : null;

  function setWageZone(key: keyof Wages, value: number) { setWages({ ...wages, [key]: value }); }
  function setBound(key: keyof Bounds, t: string) { setBounds({ ...bounds, [key]: timeToMin(t) }); }
  function addExpense() {
    const a = parseInt(amount, 10);
    if (!a || a <= 0) return;
    setExpenses([{ id: Date.now(), amount: a, category, oshi: oshi.trim() || "（推し未設定）", date: formDate }, ...expenses]);
    setAmount(""); setOshi("");
  }
  function addExpenseOn(date: string) {
    const a = parseInt(calAmount, 10);
    if (!a || a <= 0) return;
    setExpenses([{ id: Date.now(), amount: a, category: calCategory, oshi: calOshi.trim() || "（推し未設定）", date }, ...expenses]);
    setCalAmount(""); setCalOshi("");
  }
  function addShiftOn(date: string) {
    if (!calStart || !calEnd) return;
    setShifts([...shifts, { id: Date.now(), date, start: calStart, end: calEnd }]);
  }
  function removeExpense(id: number) { setExpenses(expenses.filter((e) => e.id !== id)); }
  function removeShift(id: number) { setShifts(shifts.filter((s) => s.id !== id)); }
  function addPlanned() {
    const a = parseInt(plAmount, 10);
    if (!a || a <= 0) return;
    setPlanned([{ id: Date.now(), label: plLabel.trim() || "予定", amount: a, date: plDate || formDate }, ...planned]);
    setPlLabel(""); setPlAmount("");
  }
  function removePlanned(id: number) { setPlanned(planned.filter((p) => p.id !== id)); }
  function fulfillPlanned(p: Planned) {
    setExpenses([{ id: Date.now(), amount: p.amount, category: "その他", oshi: p.label, date: p.date }, ...expenses]);
    setPlanned(planned.filter((x) => x.id !== p.id));
  }
  function setGoal() {
    const t = parseInt(goalTargetInput, 10);
    if (!t || t <= 0) return;
    setGoalName(goalNameInput.trim() || "推し活の目標");
    setGoalTarget(t);
    setGoalNameInput("");
    setGoalTargetInput("");
  }
  function addSaving() {
    const a = parseInt(goalAddInput, 10);
    if (!a) return;
    setGoalSaved(Math.max(0, goalSaved + a));
    setGoalAddInput("");
  }
  function clearGoal() {
    setGoalName("");
    setGoalTarget(0);
    setGoalSaved(0);
  }
  async function sendMagicLink() {
    if (!supabase || !authEmail) return;
    setAuthMsg("送信中…");
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail.trim(), options: { emailRedirectTo: window.location.origin } });
    setAuthMsg(error ? "送信に失敗：" + error.message : "📩 メールを送りました！届いたリンクを開けばログイン完了です。");
  }
  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setCloudReady(false);
  }
  function changeMonth(delta: number) {
    let y = view.y, m = view.m + delta;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    setView({ y, m }); setSelectedDay(null);
  }

  const inputCls = "rounded-lg border border-gray-200 px-2 py-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300";

  return (
    <div className="min-h-screen bg-pink-50 flex justify-center font-sans">
      <main className="w-full max-w-md px-4 py-6 pb-24 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-pink-700">🎀 オシヤリ</h1>
            <p className="text-[10px] text-pink-400 leading-none">推し活やりくり</p>
          </div>
          <span className="text-sm text-pink-400">{view.y}年{view.m}月</span>
        </header>

        {/* ====== ホーム ====== */}
        {tab === "home" && (
          <>
            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm text-gray-500">今月つかえる残り</span>
              <span className={`text-4xl font-extrabold ${over ? "text-red-500" : "text-green-600"}`}>{over ? `−${yen(overAmount)}` : yen(remaining)}</span>
              <div className="h-3 w-full rounded-full bg-pink-100 overflow-hidden">
                <div className={`h-full rounded-full ${over ? "bg-red-500" : nearLimit ? "bg-amber-400" : "bg-pink-500"}`} style={{ width: `${percent}%` }} />
              </div>
              <div className="flex justify-between text-sm text-gray-500"><span>予算 {yen(budget)}</span><span>使った {yen(spent)}（{percent}%）</span></div>
              {nearLimit && <p className="text-sm font-medium text-amber-600">⚠️ 予算の{percent}%。そろそろ使いすぎ注意！</p>}
            </section>

            {/* 先読み：この先の出費予定 */}
            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">🔮 この先の出費予定（先読み）</span>
              {monthPlanned.length === 0 ? (
                <p className="text-sm text-gray-400">これから使う予定（ライブ・グッズ予約など）を入れると、予算オーバーを先に教えます。</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-2 text-sm">
                    {monthPlanned.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate"><span className="text-gray-400 text-xs">{p.date?.slice(5)} </span><span className="text-gray-800">{p.label}</span></span>
                        <span className="text-gray-700">{yen(p.amount)}</span>
                        <button onClick={() => fulfillPlanned(p)} className="text-[11px] text-green-600 font-bold px-1">使った</button>
                        <button onClick={() => removePlanned(p.id)} className="text-gray-300 hover:text-red-400 px-1">✕</button>
                      </li>
                    ))}
                  </ul>
                  <div className={`rounded-xl p-3 text-sm ${projOver ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {projOver ? (
                      <>予定どおりだと <span className="font-bold">{yen(-projRemaining)} オーバー</span>。あと{hoursLabel(projNeedHours)}バイトが必要！</>
                    ) : (
                      <>予定を入れても <span className="font-bold">{yen(projRemaining)}</span> 残る見込み 👍</>
                    )}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <input type="text" value={plLabel} onChange={(e) => setPlLabel(e.target.value)} placeholder="内容（例: ライブ）" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
                <input type="number" inputMode="numeric" value={plAmount} onChange={(e) => setPlAmount(e.target.value)} placeholder="金額" className={`${inputCls} w-24 py-2 text-sm placeholder-gray-400`} />
              </div>
              <div className="flex gap-2">
                <input type="date" value={plDate} onChange={(e) => setPlDate(e.target.value)} className={`${inputCls} flex-1 py-2 text-sm`} />
                <button onClick={addPlanned} disabled={!plAmount} className="bg-purple-500 text-white rounded-xl px-4 font-bold disabled:opacity-40">予定追加</button>
              </div>
            </section>

            <section className="bg-purple-600 text-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-xs opacity-80">💎 バイト時間でチェック</span>
              {over ? (
                <>
                  <p className="text-xl font-bold leading-snug">あと{hoursLabel(refNeedHours)} 働けば大丈夫！</p>
                  <p className="text-sm opacity-90">予算を {yen(overAmount)} オーバー中。取り返すのに必要なバイト時間です。</p>
                  {activeZones.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 text-center text-xs bg-white/10 rounded-xl p-2">
                      {activeZones.map((z) => (<div key={z.key}><div className="opacity-70">{z.label}</div><div className="font-bold">{(overAmount / z.wage).toFixed(1)}h</div></div>))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">✅ 今は予算内！</p>
                  <p className="text-sm opacity-90">追加で働かなくてOK。あと {yen(remaining)} 使えます。</p>
                </>
              )}
              <p className="text-[12px] opacity-80 border-t border-white/20 pt-2">これまでの出費 {yen(spent)} ＝ 約{spentHours.toFixed(1)}時間 働いた分（{yen(refWage)}/時で計算）</p>
            </section>

            {monthlyIncome > 0 && (
              <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-1">
                <span className="text-sm text-gray-500">今月の収入（{incomeMode === "shift" ? "シフトから自動計算" : "月収入力"}）</span>
                <span className="text-lg font-bold text-gray-800">{yen(round100(monthlyIncome))}</span>
                <p className="text-xs text-gray-500">{incomeMode === "shift" ? `バイト ${workDays}日・約${shiftWorkHours.toFixed(1)}時間` : "月収（入力値）"}　｜　推し活は収入の <span className="font-bold text-pink-600">{incomePct}%</span></p>
                {incomeMode === "shift" && <p className="text-[11px] text-gray-400">シフトは📅カレンダーから日ごとに追加できます</p>}
              </section>
            )}

            {/* 推し活の貯金目標 */}
            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">🎯 推し活の貯金目標</span>
              {goalTarget <= 0 ? (
                <>
                  <p className="text-sm text-gray-400">ライブ遠征・グッズ・推しの記念日…貯めたい目標を決めよう！</p>
                  <input type="text" value={goalNameInput} onChange={(e) => setGoalNameInput(e.target.value)} placeholder="目標（例: 夏のライブ遠征）" className={`${inputCls} w-full py-2 text-sm placeholder-gray-400`} />
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" value={goalTargetInput} onChange={(e) => setGoalTargetInput(e.target.value)} placeholder="目標金額（円）" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
                    <button onClick={setGoal} disabled={!goalTargetInput} className="bg-pink-500 text-white rounded-xl px-4 font-bold disabled:opacity-40">設定</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-800 truncate">{goalName}</span>
                    <button onClick={clearGoal} className="text-[11px] text-gray-300 hover:text-red-400">リセット</button>
                  </div>
                  <div className="h-3 w-full rounded-full bg-pink-100 overflow-hidden">
                    <div className="h-full rounded-full bg-pink-500" style={{ width: `${goalPct}%` }} />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{yen(goalSaved)} / {yen(goalTarget)}</span><span>{goalPct}%</span>
                  </div>
                  {goalRemaining > 0 ? (
                    <p className="text-sm text-purple-600">あと {yen(goalRemaining)}（バイト{hoursLabel(goalNeedHours)}ぶん）</p>
                  ) : (
                    <p className="text-sm font-bold text-green-600">🎉 目標達成！おめでとう！</p>
                  )}
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" value={goalAddInput} onChange={(e) => setGoalAddInput(e.target.value)} placeholder="貯金額を追加" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
                    <button onClick={addSaving} disabled={!goalAddInput} className="bg-pink-500 text-white rounded-xl px-4 font-bold disabled:opacity-40">貯金</button>
                  </div>
                </>
              )}
            </section>

            {spent > 0 && (
              <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">内訳</span>
                  <div className="flex gap-1">
                    <button onClick={() => setBreakdownBy("oshi")} className={`text-xs rounded-full px-3 py-1 font-bold ${breakdownBy === "oshi" ? "bg-pink-500 text-white" : "bg-pink-50 text-gray-500"}`}>推し別</button>
                    <button onClick={() => setBreakdownBy("category")} className={`text-xs rounded-full px-3 py-1 font-bold ${breakdownBy === "category" ? "bg-pink-500 text-white" : "bg-pink-50 text-gray-500"}`}>カテゴリ別</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {breakdownEntries.map(([name, total], i) => {
                    const w = spent > 0 ? Math.round((total / spent) * 100) : 0;
                    return (
                      <div key={name} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-gray-600"><span className="truncate">{name}</span><span>{yen(total)}（{w}%）</span></div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: PALETTE[i % PALETTE.length] }} /></div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">＋ 出費を記録</span>
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金額（円）" className={`${inputCls} w-full px-4 py-2 text-base placeholder-gray-400`} />
              <div className="flex gap-2">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} flex-1 py-2 text-sm`}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                <input type="text" value={oshi} onChange={(e) => setOshi(e.target.value)} placeholder="推しの名前" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
              </div>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={`${inputCls} w-full py-2 text-sm`} />
              <button onClick={addExpense} disabled={!amount} className="bg-pink-500 text-white rounded-full py-3 font-bold shadow-sm active:scale-95 transition disabled:opacity-40">記録する</button>
              {over && <p className="text-[11px] text-red-500">⚠️ 予算オーバー中。記録はできますが、使いすぎ注意！</p>}
            </section>

            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">最近の出費（全{expenses.length}件）</span>
              {expenses.length === 0 ? (<p className="text-sm text-gray-400">まだ記録がありません。上から追加してみよう！</p>) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {expenses.slice(0, 8).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="flex-1 truncate"><span className="text-gray-400 text-xs">{e.date?.slice(5)} </span><span className="text-gray-800">{e.oshi}</span><span className="text-gray-400"> ・ {e.category}</span></span>
                      <span className="text-gray-700">{yen(e.amount)}</span>
                      <button onClick={() => removeExpense(e.id)} className="text-gray-300 hover:text-red-400 px-1" aria-label="削除">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ====== カレンダー ====== */}
        {tab === "calendar" && (
          <>
            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button onClick={() => changeMonth(-1)} className="px-3 py-1 rounded-lg bg-pink-100 text-pink-600 font-bold">‹</button>
                <span className="font-bold text-gray-700">{view.y}年 {view.m}月</span>
                <button onClick={() => changeMonth(1)} className="px-3 py-1 rounded-lg bg-pink-100 text-pink-600 font-bold">›</button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 bg-pink-50 rounded-lg px-3 py-2">
                <span>💰 {yen(spent)}</span><span>💪 {workDays}日・約{shiftWorkHours.toFixed(1)}h</span><span>収入 {yen(round100(shiftIncome))}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">{WEEKDAYS.map((w) => <div key={w}>{w}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }).map((_, i) => <div key={"b" + i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const exp = dayExp[day] || 0;
                  const work = dayWork[day] || 0;
                  const plan = dayPlan[day] || 0;
                  const isSel = selectedDay === day;
                  return (
                    <button key={day} onClick={() => setSelectedDay(isSel ? null : day)} className={`aspect-square rounded-lg flex flex-col items-center justify-center leading-none gap-0.5 ${isSel ? "bg-pink-500 text-white" : "bg-pink-50 text-gray-700"}`}>
                      <span className="text-xs">{day}</span>
                      {exp > 0 && <span className={`text-[8px] font-bold ${isSel ? "text-white" : "text-pink-500"}`}>{exp >= 1000 ? `${Math.round(exp / 100) / 10}k` : exp}</span>}
                      {work > 0 && <span className={`text-[8px] font-bold ${isSel ? "text-white" : "text-green-600"}`}>💪{work.toFixed(0)}h</span>}
                      {plan > 0 && <span className={`text-[8px] font-bold ${isSel ? "text-white" : "text-purple-500"}`}>🔮{plan >= 1000 ? `${Math.round(plan / 100) / 10}k` : plan}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 text-center">日付をタップして、出費やバイトを追加</p>
            </section>

            {selectedDay && (
              <>
                <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  <span className="text-sm font-bold text-gray-700">💰 {view.m}月{selectedDay}日 の出費</span>
                  {selExpenses.length === 0 ? <p className="text-sm text-gray-400">記録なし</p> : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {selExpenses.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2">
                          <span className="flex-1 truncate"><span className="text-gray-800">{e.oshi}</span><span className="text-gray-400"> ・ {e.category}</span></span>
                          <span className="text-gray-700">{yen(e.amount)}</span>
                          <button onClick={() => removeExpense(e.id)} className="text-gray-300 hover:text-red-400 px-1">✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" value={calAmount} onChange={(e) => setCalAmount(e.target.value)} placeholder="金額" className={`${inputCls} w-24 py-2 text-sm placeholder-gray-400`} />
                    <select value={calCategory} onChange={(e) => setCalCategory(e.target.value)} className={`${inputCls} flex-1 py-2 text-sm`}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={calOshi} onChange={(e) => setCalOshi(e.target.value)} placeholder="推しの名前" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
                    <button onClick={() => addExpenseOn(selDateStr)} disabled={!calAmount} className="bg-pink-500 text-white rounded-xl px-4 font-bold disabled:opacity-40">追加</button>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  <span className="text-sm font-bold text-gray-700">💪 {view.m}月{selectedDay}日 のバイト</span>
                  {selShifts.length === 0 ? <p className="text-sm text-gray-400">記録なし</p> : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {selShifts.map((s) => {
                        const { hours, pay, seg } = hpOf(s);
                        return (
                          <li key={s.id} className="flex items-center justify-between gap-2">
                            <span className="flex-1 truncate">
                              <span className="text-gray-800">{s.start && s.end ? `${s.start}–${s.end}` : `${zoneLabel(s.zone || "day")}`}</span>
                              <span className="text-gray-400"> ・ {hours.toFixed(1)}h（{segText(seg)}）</span>
                            </span>
                            <span className="text-green-600">{yen(pay)}</span>
                            <button onClick={() => removeShift(s.id)} className="text-gray-300 hover:text-red-400 px-1">✕</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input type="time" value={calStart} onChange={(e) => setCalStart(e.target.value)} className={`${inputCls} flex-1 min-w-0 py-2 text-sm`} />
                      <span className="text-gray-400">〜</span>
                      <input type="time" value={calEnd} onChange={(e) => setCalEnd(e.target.value)} className={`${inputCls} flex-1 min-w-0 py-2 text-sm`} />
                    </div>
                    <button onClick={() => addShiftOn(selDateStr)} disabled={!calStart || !calEnd} className="bg-green-500 text-white rounded-xl py-2 font-bold disabled:opacity-40">追加</button>
                  </div>
                  {preview && (
                    <p className="text-xs text-gray-500">
                      → {preview.hours.toFixed(1)}時間（{segText(preview.seg)}）＝ <span className="font-bold text-green-600">{yen(preview.pay)}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">時間帯の区切りは⚙️設定で自由に変えられます。深夜をまたいでもOK。</p>
                </section>

                <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  <span className="text-sm font-bold text-gray-700">🔮 {view.m}月{selectedDay}日 の予定</span>
                  {selPlanned.length === 0 ? <p className="text-sm text-gray-400">予定なし（予定はホームの🔮から追加）</p> : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {selPlanned.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="flex-1 truncate text-gray-800">{p.label}</span>
                          <span className="text-purple-600">{yen(p.amount)}</span>
                          <button onClick={() => fulfillPlanned(p)} className="text-[11px] text-green-600 font-bold px-1">使った</button>
                          <button onClick={() => removePlanned(p.id)} className="text-gray-300 hover:text-red-400 px-1">✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* ====== 設定 ====== */}
        {tab === "settings" && (
          <>
            {supabase && (
              <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <span className="text-sm font-bold text-gray-700">☁️ クラウド保存（端末をまたいで保存）</span>
                {session ? (
                  <>
                    <p className="text-sm text-gray-600">ログイン中：{session.user.email}</p>
                    <p className="text-[11px] text-green-600">✅ データは自動でクラウド保存。別の端末でも同じデータで使えます。</p>
                    <button onClick={logout} className="self-start text-sm text-gray-400 hover:text-red-400">ログアウト</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">ログインすると、機種変しても消えない＆スマホ⇄PCで同じデータに。メールに届くリンクを開くだけ（パスワード不要）。</p>
                    <div className="flex gap-2">
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="メールアドレス" className={`${inputCls} flex-1 py-2 text-sm placeholder-gray-400`} />
                      <button onClick={sendMagicLink} disabled={!authEmail} className="bg-pink-500 text-white rounded-xl px-4 font-bold disabled:opacity-40">リンク送信</button>
                    </div>
                    {authMsg && <p className="text-[11px] text-gray-500">{authMsg}</p>}
                  </>
                )}
              </section>
            )}

            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">⚙️ 予算</span>
              <label className="flex items-center justify-between text-sm text-gray-600">今月の予算
                <input type="number" value={budget} onChange={(e) => setBudget(parseInt(e.target.value, 10) || 0)} className={`${inputCls} w-28 py-1 text-right`} />
              </label>
            </section>

            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
              <span className="text-sm font-bold text-gray-700">💰 収入の計算方法</span>
              <div className="flex gap-2">
                <button onClick={() => setIncomeMode("shift")} className={`flex-1 rounded-xl py-2 text-sm font-bold ${incomeMode === "shift" ? "bg-pink-500 text-white" : "bg-pink-50 text-gray-500"}`}>バイト（シフト）</button>
                <button onClick={() => setIncomeMode("salary")} className={`flex-1 rounded-xl py-2 text-sm font-bold ${incomeMode === "salary" ? "bg-pink-500 text-white" : "bg-pink-50 text-gray-500"}`}>月収を入力</button>
              </div>
              {incomeMode === "salary" ? (
                <label className="flex items-center justify-between text-sm text-gray-600">月収（手取り）
                  <input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(parseInt(e.target.value, 10) || 0)} className={`${inputCls} w-32 py-1 text-right`} />
                </label>
              ) : (
                <>
                  <div className="text-sm text-gray-600">バイトの時給（時間帯別）</div>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONE_LABELS.map((z) => (
                      <label key={z.key} className="flex items-center justify-between gap-2 text-sm text-gray-600 bg-pink-50 rounded-xl px-3 py-1">{z.label}
                        <input type="number" value={wages[z.key]} onChange={(e) => setWageZone(z.key, parseInt(e.target.value, 10) || 0)} className={`${inputCls} w-20 py-1 text-right`} />
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">時給が時間帯で変わらない人は、4つとも同じ金額にしてOK。</p>
                  <div className="text-sm text-gray-600 mt-1">時間帯の区切り（開始時刻）</div>
                  <div className="grid grid-cols-1 gap-2">
                    {ZONE_LABELS.map((z) => (
                      <label key={z.key} className="flex items-center justify-between gap-2 text-sm text-gray-600 bg-pink-50 rounded-xl px-3 py-2">
                        <span>{z.label}開始</span>
                        <input type="time" value={minToTime(bounds[z.key])} onChange={(e) => setBound(z.key, e.target.value)} className={`${inputCls} py-1`} />
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">各時間帯は「開始時刻」から次の時間帯の開始まで。深夜は翌朝の開始まで続きます。</p>
                  <div className="border-t border-pink-100 pt-2 text-sm text-gray-700">今月のバイト <span className="font-bold">{workDays}日・約{shiftWorkHours.toFixed(1)}時間</span>　／　収入 <span className="font-bold">{yen(round100(shiftIncome))}</span></div>
                  <p className="text-[11px] text-gray-400">シフトは📅カレンダーで「働いた日」をタップして、開始〜終了を入れるだけ。</p>
                </>
              )}
            </section>
          </>
        )}

        <p className="text-center text-xs text-gray-400 mt-2">推し活やりくりツール — v0.8</p>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100">
        <div className="max-w-md mx-auto flex justify-around py-2">
          {[{ key: "home", label: "ホーム", icon: "🏠" }, { key: "calendar", label: "カレンダー", icon: "📅" }, { key: "settings", label: "設定", icon: "⚙️" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`flex flex-col items-center text-xs flex-1 ${tab === t.key ? "text-pink-600 font-bold" : "text-gray-400"}`}>
              <span className="text-lg">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
