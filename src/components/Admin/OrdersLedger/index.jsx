// src/components/Admin/OrdersLedger/index.jsx
import { useState, useEffect, useCallback } from 'react';
import { createSocket } from '../../../lib/socket';import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { lineLabel, lineQtyPrice } from '../../../utils/packLine';
import { receiptPaymentInfo } from '../../../utils/dashboardHelpers';
import ViewItemsModal from '../ViewItemsModal';
import CreditRecordsTab from '../CreditRecordsTab';
import SummaryCards from './SummaryCards';
import TabsBar from './TabsBar';
import HistoryFilters from './HistoryFilters';
import OrdersTable from './OrdersTable';
import ComboPayModal from './ComboPayModal';
import ShiftHistory from './ShiftHistory';
import DailySales from './DailySales';
import useDailySales from './useDailySales';


export default function OrdersLedger({ branch } = {}) {
    const [tab, setTab] = useState('unpaid');
    const [unpaid, setUnpaid] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [paying, setPaying] = useState(null); // receipt selected for ComboPayModal

    // Online bills — no claiming step needed, any cashier at the branch can act on them
    const [pendingOnline, setPendingOnline] = useState([]);

    // ---- "All" tab: paginated history, search, date filter, today summary ----
    const [allReceipts, setAllReceipts] = useState([]);
    const [allPage, setAllPage] = useState(1);
    const [allTotalPages, setAllTotalPages] = useState(1);
    const [allTotal, setAllTotal] = useState(0);
    const [allLoading, setAllLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [summary, setSummary] = useState({
        paidToday: 0, paidTodayCount: 0,
        creditToday: 0, creditTodayCount: 0,
        unpaidToday: 0, unpaidTodayCount: 0,
    });

    // ---- Daily Sales (period dropdown, default Last Month) ----
    const [range, setRange] = useState('last_month');
    const [pFrom, setPFrom] = useState('');
    const [pTo, setPTo] = useState('');
    const [tick, setTick] = useState(0);          // bumped by Refresh
    const [pickedDay, setPickedDay] = useState(null);

    const daily = useDailySales({ branch, range, from: pFrom, to: pTo, tick });

    const changeRange = (r) => { setRange(r); setPickedDay(null); };

    // Tapping a day jumps to the "All" tab filtered to that day
    const pickDay = (d) => {
        setPickedDay(d);
        setDateFrom(`${d}T00:00`);
        setDateTo(`${d}T23:59`);
        setTab('all');
    };

    const branchParams = branch ? { branch } : {};

    // ---- Quick lists (unpaid/paid tabs + tab counts) ----
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [unpaidRes, paidRes] = await Promise.all([
                API.get('/receipts', { params: branchParams }),
                API.get('/receipts/paid', { params: branchParams }),
            ]);
            setUnpaid(unpaidRes.data);
            setPaidList(paidRes.data);
        } catch (err) {
            console.error('Failed to fetch receipts', err);
            toast.error('Failed to load receipts');
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await API.get('/receipts/summary/today', { params: branchParams });
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch summary', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    const fetchPendingOnline = useCallback(async () => {
        try {
            const res = await API.get('/receipts/online-pending', { params: branchParams });
            setPendingOnline(res.data);
        } catch (err) {
            console.error('Failed to fetch pending online bills', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    const fetchAllReceipts = useCallback(async (page = 1) => {
        setAllLoading(true);
        try {
            const params = { page, limit: 10, q: search || undefined, ...branchParams };
            if (dateFrom) params.from = new Date(dateFrom).toISOString();
            if (dateTo) params.to = new Date(dateTo).toISOString();
            const res = await API.get('/receipts/history', { params });
            setAllReceipts(res.data.receipts);
            setAllPage(res.data.page);
            setAllTotalPages(res.data.totalPages);
            setAllTotal(res.data.total);
        } catch (err) {
            console.error('Failed to fetch bill history', err);
            toast.error('Failed to load bill history');
        }
        setAllLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, dateFrom, dateTo, branch]);

    useEffect(() => {
        fetchData();
        fetchSummary();
        fetchPendingOnline();
        fetchAllReceipts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, fetchSummary, fetchPendingOnline, branch]);

    useEffect(() => {
        if (tab !== 'all') return;
        const t = setTimeout(() => fetchAllReceipts(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, search, dateFrom, dateTo]);

    useEffect(() => {
        const socket = createSocket();
        if (branch) socket.emit('join_room', `branch:${branch}`);

        socket.on('receipt:paid', () => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); setTick((t) => t + 1); });
        socket.on('receipt:updated', () => { fetchData(); fetchPendingOnline(); fetchAllReceipts(allPage); });
        // Credit given / settled — changes today's totals, the sales figures and the bill statuses
        const onCredit = () => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); setTick((t) => t + 1); };
        socket.on('credit:created', onCredit);
        socket.on('credit:updated', onCredit);
        socket.on('sale:created', ({ order } = {}) => {
            fetchData();
            fetchSummary();
            fetchAllReceipts(allPage);
            if (order?.source === 'online') {
                fetchPendingOnline();
                toast.info('🔔 New online bill from the Customer Portal');
            }
        });
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    // totalDue = what the customer actually owes (VAT included).
    // subtotal is net-of-VAT, so it must not be used for balance math.
    // Falls back to subtotal for old receipts that predate totalDue.
    const amountOwed = (r) => r.totalDue ?? r.subtotal;
    const balanceDue = (r) => Number((amountOwed(r) - (r.amountPaid || 0)).toFixed(2));

    const rowHighlight = (status) => {
        if (status === 'paid') return 'bg-emerald-50/40 hover:bg-emerald-50/70';
        if (status === 'voided') return 'bg-red-50/40 hover:bg-red-50/70';
        if (status === 'partial') return 'bg-blue-50/40 hover:bg-blue-50/70';
        if (status === 'credit') return 'bg-rose-50/40 hover:bg-rose-50/70';
        return 'bg-amber-50/40 hover:bg-amber-50/70';
    };

    // Paid and credit bills share the helper used by the dashboard (it also
    // handles the credit given / still owing / time paid details).
    const paymentInfo = (r) => {
        const info = receiptPaymentInfo(r);
        if (info) return info;
        if (r.status === 'partial') {
            return {
                method: r.paymentMethod,
                cashAmount: r.cashAmount,
                tillAmount: r.tillAmount,
                amountPaid: r.amountPaid,
                changeGiven: r.changeGiven,
                mpesaReceiptNumber: r.mpesaReceiptNumber,
                paidAt: r.paidAt,
            };
        }
        return null;
    };

    const rows = tab === 'unpaid'
        ? unpaid
        : tab === 'paid'
        ? paidList
        : tab === 'pending-online'
        ? pendingOnline
        : allReceipts;

    const isShifts = tab === 'shifts';
    const isCredit = tab === 'credit';

    const refreshAll = () => {
        fetchData();
        fetchSummary();
        fetchPendingOnline();
        fetchAllReceipts(allPage);
        setTick((t) => t + 1); // reload Daily Sales too
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Sales & Receipts</h2>
                    <p className="text-sm text-gray-500">
                        {isShifts
                            ? 'Cashier shifts, sales totals and cash reconciliation'
                            : 'Daily sales, unpaid bills, credit, payment history and shifts'}
                    </p>
                </div>
                <button
                    onClick={refreshAll}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading || allLoading || daily.loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Daily Sales first (period dropdown, totals, day-by-day table) */}
            {!isShifts && (
                <DailySales
                    range={range} setRange={changeRange}
                    from={pFrom} setFrom={setPFrom} to={pTo} setTo={setPTo}
                    data={daily} onPickDay={pickDay} selectedDay={pickedDay}
                />
            )}

            {/* Receipt summary only makes sense on receipt tabs, not Shift History */}
            {!isShifts && <SummaryCards summary={summary} />}

            <TabsBar
                tab={tab}
                onSelectTab={(t) => { setTab(t); if (t === 'all') fetchAllReceipts(1); }}
                unpaidCount={unpaid.length}
                paidCount={paidList.length}
                allTotal={allTotal}
                pendingOnlineCount={pendingOnline.length}
            />

            {tab === 'all' && (
                <HistoryFilters
                    search={search}
                    setSearch={setSearch}
                    dateFrom={dateFrom}
                    setDateFrom={(v) => { setDateFrom(v); setPickedDay(null); }}
                    dateTo={dateTo}
                    setDateTo={(v) => { setDateTo(v); setPickedDay(null); }}
                />
            )}

            {isShifts ? (
                <ShiftHistory key="shifts" branch={branch} />
            ) : isCredit ? (
                <CreditRecordsTab key="credit" onChanged={refreshAll} />
            ) : (
                <OrdersTable
                    key={tab}
                    tab={tab}
                    rows={rows}
                    loading={loading}
                    allLoading={allLoading}
                    amountOwed={amountOwed}
                    balanceDue={balanceDue}
                    rowHighlight={rowHighlight}
                    setViewing={setViewing}
                    setSelected={setPaying}
                    setRewardPayTarget={() => {}}
                    showRewardButton={false}
                    allPage={allPage}
                    allTotalPages={allTotalPages}
                    allTotal={allTotal}
                    fetchAllReceipts={fetchAllReceipts}
                />
            )}

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `${viewing.branch?.name || ''} · ${viewing.cashierName || 'No cashier'}` : ''}
                items={(viewing?.items || []).map((i) => {
                    const l = lineQtyPrice(i);
                    return { name: lineLabel(i), qty: l.qty, price: l.price };
                })}
                total={viewing ? amountOwed(viewing) : undefined}
                payment={viewing ? paymentInfo(viewing) : null}
            />

            <ComboPayModal
                receipt={paying}
                onClose={() => setPaying(null)}
                onPaid={() => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); setTick((t) => t + 1); }}
            />
        </div>
    );
}
