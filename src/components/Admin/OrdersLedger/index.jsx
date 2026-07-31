// src/components/Admin/OrdersLedger/index.jsx
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import ViewItemsModal from '../ViewItemsModal';

import SummaryCards from './SummaryCards';
import TabsBar from './TabsBar';
import HistoryFilters from './HistoryFilters';
import OrdersTable from './OrdersTable';
import ComboPayModal from './ComboPayModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

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
    const [summary, setSummary] = useState({ paidToday: 0, paidTodayCount: 0, unpaidToday: 0, unpaidTodayCount: 0 });

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
        const socket = io(SOCKET_URL);
        if (branch) socket.emit('join_room', `branch:${branch}`);

        socket.on('receipt:paid', () => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); });
        socket.on('receipt:updated', () => { fetchData(); fetchPendingOnline(); fetchAllReceipts(allPage); });
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

    const balanceDue = (r) => Number((r.subtotal - (r.amountPaid || 0)).toFixed(2));

    const rowHighlight = (status) => {
        if (status === 'paid') return 'bg-emerald-50/40 hover:bg-emerald-50/70';
        if (status === 'voided') return 'bg-red-50/40 hover:bg-red-50/70';
        if (status === 'partial') return 'bg-blue-50/40 hover:bg-blue-50/70';
        return 'bg-amber-50/40 hover:bg-amber-50/70';
    };

    const paymentInfo = (r) =>
        r.status === 'paid' || r.status === 'partial'
            ? {
                  method: r.paymentMethod,
                  cashAmount: r.cashAmount,
                  tillAmount: r.tillAmount,
                  amountPaid: r.amountPaid,
                  changeGiven: r.changeGiven,
                  mpesaReceiptNumber: r.mpesaReceiptNumber,
                  paidAt: r.paidAt,
              }
            : null;

    const rows = tab === 'unpaid'
        ? unpaid
        : tab === 'paid'
        ? paidList
        : tab === 'pending-online'
        ? pendingOnline
        : allReceipts;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Sales & Receipts</h2>
                    <p className="text-sm text-gray-500">Track unpaid bills and payment history</p>
                </div>
                <button
                    onClick={() => { fetchData(); fetchSummary(); fetchPendingOnline(); fetchAllReceipts(allPage); }}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading || allLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <SummaryCards summary={summary} />

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
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                />
            )}

            <OrdersTable
                tab={tab}
                rows={rows}
                loading={loading}
                allLoading={allLoading}
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

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `${viewing.branch?.name || ''} · ${viewing.cashierName || 'No cashier'}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.productName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
                payment={viewing ? paymentInfo(viewing) : null}
            />

            <ComboPayModal
                receipt={paying}
                onClose={() => setPaying(null)}
                onPaid={() => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); }}
            />
        </div>
    );
            }
