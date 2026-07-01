"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Plus, ArrowRight, Trash2, Settings2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FinanceAccount, Transaction, ExpenseCategory } from "@/lib/types";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toaster";
import { awardXP, checkTransactionAchievements } from "@/lib/achievements";
import { XP_REWARDS } from "@/lib/xp";

type TxType = "expense" | "income" | "transfer";

type CheckItem = {
  id: string;
  amount: number;
  categoryId: string;
  subcategoryId: string;
  categoryName: string;
  subcategoryName: string;
  categoryIcon: string;
};

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === "UAH" ? "₴" : currency === "USD" ? "$" : "€";
  const formatted = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${symbol}${formatted}`;
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(",", ".")) || 0;
}
const roundMoney = (n: number) => Math.round(n * 100) / 100;

const TX_TYPES: { value: TxType; label: string }[] = [
  { value: "expense", label: "Витрата" },
  { value: "income", label: "Дохід" },
  { value: "transfer", label: "Переказ" },
];

export default function FinancePage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ExpenseCategory[]>([]);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ amount: "", categoryId: "", subcategoryId: "" });
  const [itemSubcats, setItemSubcats] = useState<ExpenseCategory[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const amountRef = useRef<HTMLInputElement>(null);
  const { toEur } = useCurrency();
  const router = useRouter();
  const supabase = createClient();

  const [txType, setTxType] = useState<TxType>("expense");
  const [txForm, setTxForm] = useState({
    amount: "",
    accountId: "",
    toAccountId: "",
    categoryId: "",
    subcategoryId: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const [accForm, setAccForm] = useState({
    name: "",
    currency: "EUR",
    icon: "💶",
    current_balance: "0",
    is_savings: false,
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (addOpen) {
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [addOpen]);

  // Reset category selection when switching income ↔ expense
  useEffect(() => {
    setTxForm((f) => ({ ...f, categoryId: "", subcategoryId: "" }));
    setSubcategories([]);
  }, [txType]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: acc }, { data: tx, error: txError }, { data: cat }, { data: allCat }] = await Promise.all([
      supabase.from("finance_accounts").select("*").eq("user_id", user.id).order("sort_order"),
      // Simple select without FK joins to expense_categories — avoids ambiguity (2 FKs to same table)
      supabase.from("transactions")
        .select("*, account:finance_accounts(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase.from("expense_categories").select("*").eq("user_id", user.id).is("parent_id", null),
      supabase.from("expense_categories").select("*").eq("user_id", user.id),
    ]);

    if (process.env.NODE_ENV !== "production") {
      console.log("[Finance] userId:", user.id, "txCount:", tx?.length ?? 0, "error:", txError);
    }

    setAccounts(acc ?? []);
    setTransactions(tx ?? []);
    setCategories(cat ?? []);
    setAllCategories(allCat ?? []);

    if (acc?.[0]) {
      setTxForm((f) => ({ ...f, accountId: f.accountId || acc[0].id }));
    }
  }

  async function handleCategorySelect(catId: string) {
    const next = txForm.categoryId === catId ? "" : catId;
    setTxForm((f) => ({ ...f, categoryId: next, subcategoryId: "" }));
    setSubcategories([]);

    if (next && userId) {
      const { data } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", userId)
        .eq("parent_id", next);
      setSubcategories(data ?? []);
    }
  }

  async function saveTx() {
    const rawAmount = parseAmount(txForm.amount);
    if (!rawAmount || !txForm.accountId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const account = accounts.find((a) => a.id === txForm.accountId);

    if (txType === "transfer") {
      if (!txForm.toAccountId || txForm.toAccountId === txForm.accountId) return;
      const toAccount = accounts.find((a) => a.id === txForm.toAccountId);

      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          account_id: txForm.accountId,
          amount: -rawAmount,
          currency: account?.currency ?? "EUR",
          amount_eur: -toEur(rawAmount, account?.currency ?? "EUR"),
          description: `→ ${toAccount?.name ?? ""}`,
          date: txForm.date,
        },
        {
          user_id: user.id,
          account_id: txForm.toAccountId,
          amount: rawAmount,
          currency: toAccount?.currency ?? "EUR",
          amount_eur: toEur(rawAmount, account?.currency ?? "EUR"),
          description: `← ${account?.name ?? ""}`,
          date: txForm.date,
        },
      ]);

      await Promise.all([
        supabase.from("finance_accounts")
          .update({ current_balance: roundMoney((account?.current_balance ?? 0) - rawAmount) })
          .eq("id", txForm.accountId),
        supabase.from("finance_accounts")
          .update({ current_balance: roundMoney(((accounts.find(a => a.id === txForm.toAccountId)?.current_balance) ?? 0) + rawAmount) })
          .eq("id", txForm.toAccountId),
      ]);
    } else {
      const signed = txType === "expense" ? -rawAmount : rawAmount;
      const amountEur = toEur(rawAmount, account?.currency ?? "EUR") * Math.sign(signed);

      await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: txForm.accountId,
        category_id: txForm.categoryId || null,
        ...(txForm.subcategoryId ? { subcategory_id: txForm.subcategoryId } : {}),
        amount: signed,
        currency: account?.currency ?? "EUR",
        amount_eur: amountEur,
        description: txForm.description || null,
        date: txForm.date,
      });

      await supabase.from("finance_accounts")
        .update({ current_balance: roundMoney((account?.current_balance ?? 0) + signed) })
        .eq("id", txForm.accountId);
    }

    await awardXP(user.id, XP_REWARDS.FINANCE_TRANSACTION, "Транзакція записана");
    await checkTransactionAchievements(user.id);
    await load();
    setAddOpen(false);
    resetForm();
    showToast("Збережено ✓");
    if (navigator.vibrate) navigator.vibrate(10);
  }

  async function addSubcategoryInline(name: string) {
    if (!txForm.categoryId || !userId) return;
    const { data: newSub } = await supabase.from("expense_categories").insert({
      user_id: userId,
      name: name.trim(),
      icon: "📌",
      color: "#6b7280",
      parent_id: txForm.categoryId,
    }).select().single();
    if (newSub) {
      setSubcategories((prev) => [...prev, newSub]);
      setTxForm((f) => ({ ...f, subcategoryId: newSub.id }));
      setSubcategorySearch("");
    }
  }

  function resetForm() {
    setTxType("expense");
    setTxForm({
      amount: "",
      accountId: accounts[0]?.id ?? "",
      toAccountId: "",
      categoryId: "",
      subcategoryId: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setSubcategories([]);
    setSubcategorySearch("");
    setCheckItems([]);
    setAddingItem(false);
    setItemForm({ amount: "", categoryId: "", subcategoryId: "" });
    setItemSubcats([]);
  }

  async function handleItemCategorySelect(catId: string) {
    setItemForm((f) => ({ ...f, categoryId: catId, subcategoryId: "" }));
    const { data } = await supabase.from("expense_categories").select("*").eq("user_id", userId).eq("parent_id", catId);
    setItemSubcats(data ?? []);
  }

  function addItemToCheck() {
    const amount = parseAmount(itemForm.amount);
    if (!amount || !itemForm.categoryId) return;
    const cat = filteredCategories.find((c) => c.id === itemForm.categoryId);
    const sub = itemSubcats.find((s) => s.id === itemForm.subcategoryId);
    const item: CheckItem = {
      id: crypto.randomUUID(),
      amount,
      categoryId: itemForm.categoryId,
      subcategoryId: itemForm.subcategoryId,
      categoryName: cat?.name ?? "",
      subcategoryName: sub?.name ?? "",
      categoryIcon: cat?.icon ?? "💡",
    };
    setCheckItems((prev) => [...prev, item]);
    setItemForm({ amount: "", categoryId: "", subcategoryId: "" });
    setItemSubcats([]);
    setAddingItem(false);
  }

  async function saveCheck() {
    if (!txForm.accountId || checkItems.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const account = accounts.find((a) => a.id === txForm.accountId);
    const today = format(new Date(), "yyyy-MM-dd");
    let totalDelta = 0;
    for (const item of checkItems) {
      const signed = txType === "expense" ? -item.amount : item.amount;
      totalDelta += signed;
      await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: txForm.accountId,
        category_id: item.categoryId || null,
        subcategory_id: item.subcategoryId || null,
        amount: signed,
        currency: account?.currency ?? "EUR",
        amount_eur: toEur(Math.abs(signed), account?.currency ?? "EUR") * Math.sign(signed),
        date: today,
      });
    }
    await supabase.from("finance_accounts")
      .update({ current_balance: roundMoney((account?.current_balance ?? 0) + totalDelta) })
      .eq("id", txForm.accountId);
    await awardXP(user.id, XP_REWARDS.FINANCE_TRANSACTION, "Транзакція записана");
    await checkTransactionAchievements(user.id);
    await load();
    setAddOpen(false);
    resetForm();
    showToast(`Збережено ${checkItems.length} позиц. ✓`);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  async function deleteTx(tx: Transaction) {
    const account = accounts.find((a) => a.id === tx.account_id);
    await supabase.from("transactions").delete().eq("id", tx.id);
    if (account) {
      await supabase.from("finance_accounts")
        .update({ current_balance: roundMoney(account.current_balance - tx.amount) })
        .eq("id", tx.account_id);
    }
    await load();
    showToast("Видалено", "error");
  }

  async function saveAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !accForm.name) return;

    await supabase.from("finance_accounts").insert({
      user_id: user.id,
      name: accForm.name,
      currency: accForm.currency,
      icon: accForm.icon,
      current_balance: parseFloat(accForm.current_balance) || 0,
      is_savings: accForm.is_savings,
      include_in_total: true,
      sort_order: accounts.length,
    });

    await load();
    setAddAccountOpen(false);
    setAccForm({ name: "", currency: "EUR", icon: "💶", current_balance: "0", is_savings: false });
    showToast("Рахунок додано ✓");
  }

  const totalEur = accounts
    .filter((a) => a.include_in_total)
    .reduce((sum, a) => sum + toEur(a.current_balance, a.currency), 0);

  const filteredCategories = txType === "income"
    ? categories.filter((c) => c.transaction_type === "income")
    : categories.filter((c) => c.transaction_type !== "income");

  const visibleTxs = transactions.slice(0, visibleCount);
  const grouped = visibleTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    const key = tx.date === today ? "Сьогодні" : tx.date === yesterday ? "Вчора" : tx.date;
    acc[key] = [...(acc[key] ?? []), tx];
    return acc;
  }, {});

  const saveDisabled =
    !parseAmount(txForm.amount) ||
    !txForm.accountId ||
    (txType === "transfer" && (!txForm.toAccountId || txForm.toAccountId === txForm.accountId));

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] pt-safe overflow-hidden">
      <header className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">💰 Фінанси</h1>
        <button
          onClick={() => setAddAccountOpen(true)}
          className="text-[#6b7280] text-sm flex items-center gap-1"
        >
          <Plus size={14} /> Рахунок
        </button>
      </header>

      {/* Account cards */}
      <div className="shrink-0 flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-hide">
        <div className="bg-[#111111] rounded-2xl p-4 min-w-[160px] h-[100px] shrink-0 flex flex-col justify-between border border-[#00FF85]/20">
          <p className="text-[#6b7280] text-xs">Загалом</p>
          <p className="text-[#00FF85] font-black text-2xl">{formatMoney(totalEur, "EUR")}</p>
        </div>
        {accounts.map((acc) => {
          const eur = toEur(acc.current_balance, acc.currency);
          return (
            <div key={acc.id} className="bg-[#111111] rounded-2xl p-4 min-w-[180px] h-[100px] shrink-0 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{acc.icon}</span>
                <p className="text-[#6b7280] text-xs">{acc.name}</p>
                {acc.is_savings && <span className="text-[#f59e0b] text-[10px]">💰</span>}
              </div>
              <div>
                <p className="text-white font-bold text-lg">
                  {formatMoney(acc.current_balance, acc.currency)}
                </p>
                {acc.currency !== "EUR" && (
                  <p className="text-[#6b7280] text-xs">≈ {formatMoney(eur, "EUR")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-4 pb-28">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12">
            <p className="text-5xl mb-3">💸</p>
            <p className="text-[#6b7280] text-sm font-medium">Ще немає транзакцій</p>
            <p className="text-[#6b7280] text-xs mt-1">Натисни + щоб додати першу</p>
          </div>
        )}
        {Object.entries(grouped).map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6b7280] text-xs uppercase tracking-wider">{date}</p>
              <p className={cn("text-xs font-semibold", txs.reduce((s, t) => s + t.amount, 0) < 0 ? "text-[#ef4444]" : "text-[#00FF85]")}>
                {txs.reduce((s, t) => s + t.amount, 0) < 0 ? "-" : "+"}
                {formatMoney(Math.abs(txs.reduce((s, t) => s + (t.amount_eur ?? t.amount), 0)), "EUR")}
              </p>
            </div>
            <div className="bg-[#111111] rounded-2xl overflow-hidden divide-y divide-white/5">
              {txs.map((tx) => {
                if (process.env.NODE_ENV !== "production") {
                  console.log("[TX]", tx.date, "cat:", tx.category_id, "subcat:", tx.subcategory_id);
                }
                const txCat = allCategories.find((c) => c.id === tx.category_id);
                const txSubcat = tx.subcategory_id ? allCategories.find((c) => c.id === tx.subcategory_id) : null;
                const primaryLabel = txSubcat
                  ? `${txCat?.name ?? "?"} / ${txSubcat.name}`
                  : txCat?.name ?? tx.description ?? (tx.amount < 0 ? "Витрата" : "Дохід");
                const subtitleLabel = new Date(tx.date).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
                return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0">
                    <span className="text-lg">
                      {txCat?.icon ?? (tx.amount < 0 ? "💸" : "💰")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{primaryLabel}</p>
                    <p className="text-[#6b7280] text-xs truncate">{subtitleLabel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("font-bold text-sm", tx.amount < 0 ? "text-[#ef4444]" : "text-[#00FF85]")}>
                      {tx.amount < 0 ? "-" : "+"}
                      {formatMoney(tx.amount, tx.currency)}
                    </p>
                    {tx.amount_eur !== null && tx.currency !== "EUR" && (
                      <p className="text-[#6b7280] text-xs">{formatMoney(tx.amount_eur ?? 0, "EUR")}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTx(tx)}
                    className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7280] active:text-[#ef4444] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        ))}
        {transactions.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => c + 30)}
            className="w-full py-3 text-[#6b7280] text-sm text-center"
          >
            Завантажити ще ({transactions.length - visibleCount} залишилось)
          </button>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-[100px] right-4 w-14 h-14 bg-[#00FF85] rounded-full flex items-center justify-center shadow-[0_0_20px_#00FF8540] active:scale-90 transition-all z-40"
      >
        <Plus size={28} className="text-black" strokeWidth={3} />
      </button>

      {/* ── Add Transaction Sheet ── */}
      <BottomSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); resetForm(); }}
        title="Нова транзакція"
      >
        <div className="space-y-4 pb-6">
          {/* Type toggle */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#1a1a1a] rounded-2xl">
            {TX_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTxType(value)}
                className={cn(
                  "py-2.5 rounded-xl text-sm font-semibold transition-all",
                  txType === value
                    ? value === "expense"
                      ? "bg-[#ef4444] text-white"
                      : value === "income"
                      ? "bg-[#00FF85] text-black"
                      : "bg-[#3b82f6] text-white"
                    : "text-[#6b7280]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* TRANSFER mode */}
          {txType === "transfer" && (
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-2xl px-4 py-5 text-center">
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={txForm.amount}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.,]/g, "") }))}
                  placeholder="0"
                  className="bg-transparent text-white text-5xl font-black text-center outline-none w-[180px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-[#6b7280] text-xs mb-1.5 block">З рахунку</Label>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {accounts.map((a) => (
                      <button key={a.id} onClick={() => setTxForm((f) => ({ ...f, accountId: a.id }))}
                        className={cn("shrink-0 px-2.5 py-1.5 rounded-xl text-xs border transition-all",
                          txForm.accountId === a.id ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-white/10 text-[#6b7280]")}>
                        {a.icon} {a.name}
                      </button>
                    ))}
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#6b7280] shrink-0 mt-4" />
                <div className="flex-1 min-w-0">
                  <Label className="text-[#6b7280] text-xs mb-1.5 block">На рахунок</Label>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {accounts.filter((a) => a.id !== txForm.accountId).map((a) => (
                      <button key={a.id} onClick={() => setTxForm((f) => ({ ...f, toAccountId: a.id }))}
                        className={cn("shrink-0 px-2.5 py-1.5 rounded-xl text-xs border transition-all",
                          txForm.toAccountId === a.id ? "border-[#00FF85] bg-[#00FF85]/10 text-[#00FF85]" : "border-white/10 text-[#6b7280]")}>
                        {a.icon} {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={saveTx} disabled={saveDisabled}
                className="w-full h-12 bg-[#3b82f6] text-white font-bold rounded-2xl disabled:opacity-40">
                Перевести
              </Button>
            </div>
          )}

          {/* CHECK mode — expense / income */}
          {txType !== "transfer" && (
            <div className="space-y-3">
              {/* Added items */}
              {checkItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3">
                  <span className="text-xl">{item.categoryIcon}</span>
                  <p className="flex-1 text-white text-sm truncate">
                    {item.subcategoryName ? `${item.categoryName} / ${item.subcategoryName}` : item.categoryName}
                  </p>
                  <p className="text-white font-semibold text-sm shrink-0">
                    {accounts.find((a) => a.id === txForm.accountId)?.currency === "UAH" ? "₴" : accounts.find((a) => a.id === txForm.accountId)?.currency === "USD" ? "$" : "€"}
                    {item.amount.toFixed(2)}
                  </p>
                  <button onClick={() => setCheckItems((prev) => prev.filter((i) => i.id !== item.id))}
                    className="text-[#6b7280] active:text-[#ef4444] shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Inline add-item form */}
              {addingItem ? (
                <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={itemForm.amount}
                    onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.,]/g, "") }))}
                    placeholder="0.00"
                    className="w-full bg-[#111] rounded-xl px-4 py-3 text-white text-3xl font-black text-center outline-none"
                    style={{ fontSize: "28px" }}
                  />
                  {filteredCategories.length === 0 ? (
                    <p className="text-[#6b7280] text-xs text-center py-2">
                      Додай категорії в Налаштування → Фінанси
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {filteredCategories.map((c) => (
                        <button key={c.id}
                          onClick={() => handleItemCategorySelect(c.id)}
                          className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                            itemForm.categoryId === c.id ? "border-[#00FF85] bg-[#00FF85]/10" : "border-white/10")}>
                          <span className="text-xl">{c.icon}</span>
                          <span className={cn("text-[9px] font-medium text-center px-0.5 leading-tight",
                            itemForm.categoryId === c.id ? "text-[#00FF85]" : "text-[#6b7280]")}>
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {itemSubcats.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {itemSubcats.map((s) => (
                        <button key={s.id}
                          onClick={() => setItemForm((f) => ({ ...f, subcategoryId: f.subcategoryId === s.id ? "" : s.id }))}
                          className={cn("px-3 py-1.5 rounded-xl text-xs border transition-all",
                            itemForm.subcategoryId === s.id ? "border-[#00FF85] text-[#00FF85]" : "border-white/10 text-[#6b7280]")}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingItem(false); setItemForm({ amount: "", categoryId: "", subcategoryId: "" }); setItemSubcats([]); }}
                      className="flex-1 py-3 bg-[#111] rounded-xl text-[#6b7280] text-sm">
                      Скасувати
                    </button>
                    <button onClick={addItemToCheck}
                      disabled={!itemForm.amount || !itemForm.categoryId}
                      className="flex-1 py-3 bg-[#00FF85] rounded-xl text-black font-semibold text-sm disabled:opacity-40">
                      Додати
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingItem(true)}
                  className="w-full py-3 border-2 border-dashed border-white/20 rounded-2xl text-[#6b7280] text-sm flex items-center justify-center gap-2">
                  <Plus size={16} /> Додати позицію
                </button>
              )}

              {/* Total + account + save */}
              {checkItems.length > 0 && (
                <>
                  <div className="flex justify-between items-center px-2 py-2 border-t border-white/10">
                    <p className="text-[#6b7280] font-medium text-sm">Разом:</p>
                    <p className="text-white text-xl font-black">
                      {txType === "expense" ? "−" : "+"}
                      {(() => { const s = accounts.find((a) => a.id === txForm.accountId)?.currency; return s === "UAH" ? "₴" : s === "USD" ? "$" : "€"; })()}
                      {checkItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] text-xs mb-2">Рахунок</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {accounts.map((a) => (
                        <button key={a.id} onClick={() => setTxForm((f) => ({ ...f, accountId: a.id }))}
                          className={cn("shrink-0 px-3 py-2 rounded-xl text-sm border transition-all",
                            txForm.accountId === a.id ? "border-[#00FF85] text-[#00FF85]" : "border-white/10 text-[#6b7280]")}>
                          {a.icon} {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={saveCheck} disabled={!txForm.accountId}
                    className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl">
                    Зберегти {checkItems.length} позиц.
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── Add Account Sheet ── */}
      <BottomSheet open={addAccountOpen} onClose={() => setAddAccountOpen(false)} title="Новий рахунок">
        <div className="space-y-4 pb-6">
          <div className="flex gap-3">
            <div className="w-20">
              <Label className="text-[#6b7280] text-xs">Іконка</Label>
              <Input
                value={accForm.icon}
                onChange={(e) => setAccForm((f) => ({ ...f, icon: e.target.value }))}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white text-2xl text-center h-12"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[#6b7280] text-xs">Назва</Label>
              <Input
                value={accForm.name}
                onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Назва рахунку"
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-12"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6b7280] text-xs">Валюта</Label>
              <select
                value={accForm.currency}
                onChange={(e) => setAccForm((f) => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full bg-[#1a1a1a] border border-white/10 rounded-xl text-white h-11 px-3 outline-none"
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="UAH">UAH ₴</option>
              </select>
            </div>
            <div>
              <Label className="text-[#6b7280] text-xs">Початковий баланс</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={accForm.current_balance}
                onChange={(e) => setAccForm((f) => ({ ...f, current_balance: e.target.value }))}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white h-11"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accForm.is_savings}
              onChange={(e) => setAccForm((f) => ({ ...f, is_savings: e.target.checked }))}
              className="w-5 h-5 rounded accent-[#00FF85]"
            />
            <span className="text-white text-sm">💰 Це накопичення</span>
          </label>
          <Button
            onClick={saveAccount}
            disabled={!accForm.name}
            className="w-full h-12 bg-[#00FF85] text-black font-bold rounded-2xl"
          >
            Додати рахунок
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
