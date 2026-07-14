import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  Order, Worker, WorkerPayment, WorkerFinalPayment, WorkerAdvance,
  Salesman, SalesmanLedgerEntry, SalesmanAdvance,
  CashbookEntry,
} from './types';

export interface DashboardData {
  orders: Order[];
  workers: Worker[];
  salesmen: Salesman[];
  workerPayments: WorkerPayment[];
  workerFinalPayments: WorkerFinalPayment[];
  workerAdvances: WorkerAdvance[];
  salaryLedger: SalesmanLedgerEntry[];
  salesmanAdvances: SalesmanAdvance[];
  cashbook: CashbookEntry[];
  loading: boolean;
  refresh: () => void;
}

export function useDashboardData(): DashboardData {
  const [state, setState] = useState<Omit<DashboardData, 'loading' | 'refresh'>>({
    orders: [], workers: [], salesmen: [], workerPayments: [], workerFinalPayments: [],
    workerAdvances: [], salaryLedger: [], salesmanAdvances: [], cashbook: [],
  });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('orders').select('*').then((r) => r.data as Order[] || []),
      supabase.from('workers').select('*').then((r) => r.data as Worker[] || []),
      supabase.from('salesmen').select('*').then((r) => r.data as Salesman[] || []),
      supabase.from('worker_payments').select('*').then((r) => r.data as WorkerPayment[] || []),
      supabase.from('worker_final_payments').select('*').then((r) => r.data as WorkerFinalPayment[] || []),
      supabase.from('worker_advances').select('*').then((r) => r.data as WorkerAdvance[] || []),
      supabase.from('salesman_salary_ledger').select('*').then((r) => r.data as SalesmanLedgerEntry[] || []),
      supabase.from('salesman_advances').select('*').then((r) => r.data as SalesmanAdvance[] || []),
      supabase.from('cashbook').select('*').then((r) => r.data as CashbookEntry[] || []),
    ]).then(([
      orders, workers, salesmen, workerPayments, workerFinalPayments,
      workerAdvances, salaryLedger, salesmanAdvances, cashbook,
    ]) => {
      setState({
        orders, workers, salesmen, workerPayments, workerFinalPayments,
        workerAdvances, salaryLedger, salesmanAdvances, cashbook,
      });
      setLoading(false);
    });
  }, [tick]);

  return { ...state, loading, refresh: () => setTick((t) => t + 1) };
}

export function monthKey(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export function lastNMonths(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

// ── Shared business-logic calculations ──────────────────────────────────────

export interface BusinessStats {
  totalOrders: number;
  totalSales: number;
  advanceReceived: number;
  customerBalanceDue: number;
  readymadeSales: number;
  fabricSales: number;
  tailoringSales: number;
  todaysCashIn: number;
  todaysCashOut: number;
  totalExpenses: number;
  cashInDrawer: number;
  profit: number;
  deliveredCount: number;
  notDeliveredCount: number;
  workerAdvancesTotal: number;
  salaryPaidTotal: number;
}

function isToday(d: string): boolean {
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate();
}

export function computeStats(
  data: Pick<DashboardData, 'orders' | 'cashbook' | 'workerAdvances' | 'salaryLedger' | 'salesmanAdvances'>,
  openingCash: number,
): BusinessStats {
  const { orders, cashbook, workerAdvances, salaryLedger, salesmanAdvances } = data;

  // Total Orders = count of all orders
  const totalOrders = orders.length;

  // Tailoring sales = delivered tailoring orders
  const tailoringOrders = orders.filter((o) => o.sale_type === 'tailoring');
  const tailoringSales = tailoringOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount), 0);

  // Readymade sales = all readymade orders (they're immediate sales)
  const readymadeSales = orders.filter((o) => o.sale_type === 'readymade').reduce((s, o) => s + Number(o.total_amount), 0);

  // Fabric sales = all fabric orders
  const fabricSales = orders.filter((o) => o.sale_type === 'fabric').reduce((s, o) => s + Number(o.total_amount), 0);

  // Total Sales = delivered tailoring + readymade + fabric
  const totalSales = tailoringSales + readymadeSales + fabricSales;

  // Advance Received = sum of all customer advances
  const advanceReceived = orders.reduce((s, o) => s + Number(o.advance), 0);

  // Customer Balance Due = sum(order total - advance - additional_payment) for undelivered tailoring
  const customerBalanceDue = tailoringOrders
    .filter((o) => o.status !== 'delivered')
    .reduce((s, o) => s + (Number(o.total_amount) - Number(o.advance) - Number(o.additional_payment || 0)), 0);

  // Worker Advances total (for display; cash-out is recorded in cashbook)
  const workerAdvancesTotal = workerAdvances.reduce((s, a) => s + Number(a.amount), 0);

  // Salary Paid total (for display; cash-out is recorded in cashbook)
  const salaryPaidTotal = salaryLedger.filter((l) => l.type !== 'advance').reduce((s, l) => s + Number(l.amount), 0)
    + salesmanAdvances.reduce((s, a) => s + Number(a.amount), 0);

  // Total Expenses = cashbook expenses only (worker advances & salary payments
  // auto-create cashbook entries, so counting them separately would double-count)
  const totalExpenses = cashbook.filter((c) => c.type === 'expense').reduce((s, c) => s + Number(c.amount), 0);

  // Today's Cash In
  const todaysAdvances = orders.filter((o) => isToday(o.order_date)).reduce((s, o) => s + Number(o.advance), 0);
  const todaysDeliveredPayments = orders
    .filter((o) => o.status === 'delivered' && isToday(o.delivery_date || o.order_date))
    .reduce((s, o) => s + (Number(o.balance) + Number(o.additional_payment || 0)), 0);
  const todaysReadymade = orders.filter((o) => o.sale_type === 'readymade' && isToday(o.order_date)).reduce((s, o) => s + Number(o.total_amount), 0);
  const todaysFabric = orders.filter((o) => o.sale_type === 'fabric' && isToday(o.order_date)).reduce((s, o) => s + Number(o.total_amount), 0);
  const todaysOtherIncome = cashbook.filter((c) => c.type === 'income' && isToday(c.entry_date)).reduce((s, c) => s + Number(c.amount), 0);
  const todaysCashIn = todaysAdvances + todaysDeliveredPayments + todaysReadymade + todaysFabric + todaysOtherIncome;

  // Today's Cash Out (from cashbook only — advances & salaries create cashbook entries)
  const todaysCashOut = cashbook.filter((c) => c.type === 'expense' && isToday(c.entry_date)).reduce((s, c) => s + Number(c.amount), 0);

  // Total Cash In / Out for drawer
  const totalCashIn = advanceReceived
    + orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (Number(o.balance) + Number(o.additional_payment || 0)), 0)
    + readymadeSales + fabricSales
    + cashbook.filter((c) => c.type === 'income').reduce((s, c) => s + Number(c.amount), 0);
  const totalCashOut = totalExpenses;

  // Cash in Drawer = Opening + Cash In - Cash Out
  const cashInDrawer = openingCash + totalCashIn - totalCashOut;

  // Profit = Total Sales - Total Expenses
  const profit = totalSales - totalExpenses;

  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const notDeliveredCount = orders.filter((o) => o.status !== 'delivered').length;

  return {
    totalOrders, totalSales, advanceReceived, customerBalanceDue,
    readymadeSales, fabricSales, tailoringSales,
    todaysCashIn, todaysCashOut, totalExpenses, cashInDrawer, profit,
    deliveredCount, notDeliveredCount, workerAdvancesTotal, salaryPaidTotal,
  };
}
