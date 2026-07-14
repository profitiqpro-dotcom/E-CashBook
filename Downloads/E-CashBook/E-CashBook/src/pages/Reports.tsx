import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useDashboardData, computeStats, monthKey } from '../lib/hooks';
import { useSettings } from '../lib/store';
import { Card, Button, Input, Spinner } from '../components/ui';
import { fmtMoney, fmtDate, exportCSV, printHTML } from '../lib/format';


type ReportTab = 'daily' | 'monthly' | 'yearly';

export function Reports() {
  const data = useDashboardData();
  const settings = useSettings();
  const currency = settings?.currency || 'OMR';
  const openingCash = Number(settings?.opening_cash ?? 0);
  const [tab, setTab] = useState<ReportTab>('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [monthSel, setMonthSel] = useState('');
  const [yearSel, setYearSel] = useState('');

  const filtered = useMemo(() => {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if (f) f.setHours(0, 0, 0, 0);
    if (t) t.setHours(23, 59, 59, 999);
    const inRange = (d: string) => {
      const dt = new Date(d);
      if (f && dt < f) return false;
      if (t && dt > t) return false;
      return true;
    };

    let orders = data.orders.filter((o) => inRange(o.order_date));
    let cashbook = data.cashbook.filter((c) => inRange(c.entry_date));
    let workerAdvances = data.workerAdvances.filter((a) => inRange(a.advance_date));
    let salaryLedger = data.salaryLedger.filter((l) => inRange(l.payment_date));
    let salesmanAdvances = data.salesmanAdvances.filter((a) => inRange(a.advance_date));

    if (tab === 'monthly' && monthSel) {
      orders = data.orders.filter((o) => monthKey(o.order_date) === monthSel);
      cashbook = data.cashbook.filter((c) => monthKey(c.entry_date) === monthSel);
      workerAdvances = data.workerAdvances.filter((a) => monthKey(a.advance_date) === monthSel);
      salaryLedger = data.salaryLedger.filter((l) => monthKey(l.payment_date) === monthSel);
      salesmanAdvances = data.salesmanAdvances.filter((a) => monthKey(a.advance_date) === monthSel);
    }

    if (tab === 'yearly' && yearSel) {
      orders = data.orders.filter((o) => new Date(o.order_date).getFullYear() === Number(yearSel));
      cashbook = data.cashbook.filter((c) => new Date(c.entry_date).getFullYear() === Number(yearSel));
      workerAdvances = data.workerAdvances.filter((a) => new Date(a.advance_date).getFullYear() === Number(yearSel));
      salaryLedger = data.salaryLedger.filter((l) => new Date(l.payment_date).getFullYear() === Number(yearSel));
      salesmanAdvances = data.salesmanAdvances.filter((a) => new Date(a.advance_date).getFullYear() === Number(yearSel));
    }

    return { orders, cashbook, workerAdvances, salaryLedger, salesmanAdvances };
  }, [data, from, to, tab, monthSel, yearSel]);

  const stats = useMemo(() => computeStats(filtered, openingCash), [filtered, openingCash]);

  const periodLabel = tab === 'daily'
    ? `${from || 'All'} to ${to || 'Today'}`
    : tab === 'monthly'
    ? monthSel || 'All Months'
    : yearSel || 'All Years';

  if (data.loading) return <div className="flex justify-center py-20"><Spinner className="text-sky-600" /></div>;

  const shop = settings?.shop_name || 'Tailor Shop';

  // Build report rows based on tab
  const dailyMetrics = [
    { label: 'Orders', value: stats.totalOrders },
    { label: 'Sales', value: fmtMoney(stats.totalSales, currency) },
    { label: 'Readymade Sales', value: fmtMoney(stats.readymadeSales, currency) },
    { label: 'Fabric Sales', value: fmtMoney(stats.fabricSales, currency) },
    { label: 'Advances Received', value: fmtMoney(stats.advanceReceived, currency) },
    { label: 'Customer Balance Due', value: fmtMoney(stats.customerBalanceDue, currency) },
    { label: 'Cash In', value: fmtMoney(stats.todaysCashIn, currency) },
    { label: 'Cash Out', value: fmtMoney(stats.todaysCashOut, currency) },
    { label: 'Expenses', value: fmtMoney(stats.totalExpenses, currency) },
    { label: 'Profit', value: fmtMoney(stats.profit, currency) },
    { label: 'Cash Drawer', value: fmtMoney(stats.cashInDrawer, currency) },
  ];

  const monthlyMetrics = [
    { label: 'Orders', value: stats.totalOrders },
    { label: 'Delivered Orders', value: stats.deliveredCount },
    { label: 'Readymade Sales', value: fmtMoney(stats.readymadeSales, currency) },
    { label: 'Fabric Sales', value: fmtMoney(stats.fabricSales, currency) },
    { label: 'Advance Received', value: fmtMoney(stats.advanceReceived, currency) },
    { label: 'Worker Advances', value: fmtMoney(stats.workerAdvancesTotal, currency) },
    { label: 'Salary Paid', value: fmtMoney(stats.salaryPaidTotal, currency) },
    { label: 'Expenses', value: fmtMoney(stats.totalExpenses, currency) },
    { label: 'Cash In', value: fmtMoney(stats.todaysCashIn, currency) },
    { label: 'Cash Out', value: fmtMoney(stats.todaysCashOut, currency) },
    { label: 'Profit', value: fmtMoney(stats.profit, currency) },
  ];

  const yearlyMetrics = [
    { label: 'Total Orders', value: stats.totalOrders },
    { label: 'Total Sales', value: fmtMoney(stats.totalSales, currency) },
    { label: 'Readymade Sales', value: fmtMoney(stats.readymadeSales, currency) },
    { label: 'Fabric Sales', value: fmtMoney(stats.fabricSales, currency) },
    { label: 'Total Advances', value: fmtMoney(stats.advanceReceived, currency) },
    { label: 'Total Expenses', value: fmtMoney(stats.totalExpenses, currency) },
    { label: 'Worker Salaries', value: fmtMoney(stats.salaryPaidTotal, currency) },
    { label: 'Worker Advances', value: fmtMoney(stats.workerAdvancesTotal, currency) },
    { label: 'Cash Flow (In - Out)', value: fmtMoney(stats.todaysCashIn - stats.todaysCashOut, currency) },
    { label: 'Profit', value: fmtMoney(stats.profit, currency) },
  ];

  const activeMetrics = tab === 'daily' ? dailyMetrics : tab === 'monthly' ? monthlyMetrics : yearlyMetrics;

  function exportReport() {
    const rows: (string | number)[][] = [
      [shop, `${tab.charAt(0).toUpperCase() + tab.slice(1)} Report`],
      ['Period', periodLabel], [],
      ['Metric', 'Value'],
      ...activeMetrics.map((m) => [m.label, m.value]),
      [],
      ['Receipt #', 'Customer', 'Type', 'Order Date', 'Delivery Date', 'Total', 'Advance', 'Balance', 'Status'],
      ...filtered.orders.map((o) => [o.receipt_number, o.customer_name, o.sale_type, fmtDate(o.order_date), fmtDate(o.delivery_date), o.total_amount, o.advance, o.balance, o.status]),
    ];
    exportCSV(`${tab}-report.csv`, rows);
  }

  function printReport() {
    const body = `
      <h1>${shop} — ${tab.charAt(0).toUpperCase() + tab.slice(1)} Report</h1>
      <h2>Period: ${periodLabel}</h2>
      <table><tr><th>Metric</th><th class="right">Value</th></tr>
      ${activeMetrics.map((m) => `<tr><td>${m.label}</td><td class="right">${m.value}</td></tr>`).join('')}
      </table>
      <h3 style="margin-top:24px">Orders</h3>
      <table><tr><th>Receipt #</th><th>Customer</th><th>Type</th><th>Order Date</th><th>Delivery</th><th class="right">Total</th><th class="right">Advance</th><th class="right">Balance</th><th>Status</th></tr>
      ${filtered.orders.map((o) => `<tr><td>${o.receipt_number}</td><td>${o.customer_name}</td><td>${o.sale_type}</td><td>${fmtDate(o.order_date)}</td><td>${fmtDate(o.delivery_date)}</td><td class="right">${fmtMoney(o.total_amount, currency)}</td><td class="right">${fmtMoney(o.advance, currency)}</td><td class="right">${fmtMoney(o.balance, currency)}</td><td>${o.status}</td></tr>`).join('')}
      </table>`;
    printHTML(`${tab} Report`, body);
  }

  return (
    <div className="space-y-4 animate-fade">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Reports</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportReport}><Download size={16} /> Excel</Button>
          <Button variant="ghost" onClick={printReport}><Printer size={16} /> PDF</Button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['daily', 'monthly', 'yearly'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition ${
              tab === t ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500'
            }`}>
            {t} Report
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        {tab === 'daily' && (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <div>
              <label className="label">From Date</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
        {tab === 'monthly' && (
          <div>
            <label className="label">Month</label>
            <Input type="month" value={monthSel} onChange={(e) => setMonthSel(e.target.value)} />
          </div>
        )}
        {tab === 'yearly' && (
          <div>
            <label className="label">Year</label>
            <Input type="number" min="2020" max="2099" value={yearSel} onChange={(e) => setYearSel(e.target.value)} placeholder="2026" />
          </div>
        )}
      </Card>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeMetrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold">Orders in Period</h3>
        </div>
        {filtered.orders.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">No orders in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">Receipt #</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Order Date</th>
                  <th className="text-left p-3">Delivery</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Advance</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-mono text-xs">{o.receipt_number}</td>
                    <td className="p-3">{o.customer_name}</td>
                    <td className="p-3 capitalize">{o.sale_type}</td>
                    <td className="p-3">{fmtDate(o.order_date)}</td>
                    <td className="p-3">{fmtDate(o.delivery_date)}</td>
                    <td className="p-3 text-right">{fmtMoney(o.total_amount, currency)}</td>
                    <td className="p-3 text-right">{fmtMoney(o.advance, currency)}</td>
                    <td className="p-3 text-right font-bold">{fmtMoney(o.balance, currency)}</td>
                    <td className="p-3 capitalize">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
