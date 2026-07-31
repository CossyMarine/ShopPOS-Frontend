import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../api/axios';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const IDLE_TIMEOUT_MS = 20000; // switches to the marketing loop after 20s of no scan activity

export default function PublicDisplayPage() {
    const { branchId, registerId } = useParams();
    const [cart, setCart] = useState([]);
    const [branchName, setBranchName] = useState('');
    const [receipt, setReceipt] = useState(null); // set once checkout finalizes -> shows the M-Pesa Till/QR panel
    const [idle, setIdle] = useState(false);
    const idleTimerRef = useRef(null);

    const resetIdleTimer = () => {
        setIdle(false);
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    };

    useEffect(() => {
        API.get('/branches').then((res) => {
            const b = res.data.find((x) => x._id === branchId);
            if (b) setBranchName(b.name);
        }).catch(() => {});

        const socket = io(SOCKET_URL);
        socket.emit('register:join', { branchId, registerId });

        socket.on('cart:sync', (incomingCart) => {
            setCart(incomingCart || []);
            setReceipt(null); // a new scan means we're back to a live cart, not a finalized bill
            resetIdleTimer();
        });

        socket.on('sale:created', ({ receipt: r, order }) => {
            // Only react if this sale belongs to our own register's cart —
            // matched loosely by branch, since the room is already scoped to it.
            if (order?.branch === branchId) {
                setReceipt(r);
                setCart([]);
                resetIdleTimer();
            }
        });

        resetIdleTimer();
        return () => { socket.disconnect(); clearTimeout(idleTimerRef.current); };
    }, [branchId, registerId]);

    const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);

    // ---- Idle marketing loop ----
    if (idle && !receipt) {
        return (
            <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center font-black text-4xl">B</div>
                <h1 className="text-3xl font-black">Welcome to {branchName || 'Babylon Supermarket'}</h1>
                <p className="text-gray-400 text-sm">Ask our cashier to enroll your phone number for loyalty points!</p>
            </div>
        );
    }

    // ---- Finalized bill: show M-Pesa Till + QR for the customer to pay from their own phone ----
    if (receipt) {
        return (
            <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4 p-8">
                <span className="text-xs font-black uppercase tracking-widest text-orange-500">Receipt {receipt.billId}</span>
                <p className="text-5xl font-black">{receipt.subtotal.toLocaleString()} <span className="text-2xl text-orange-500">KES</span></p>
                <div className="w-32 h-32 bg-white p-2 rounded-xl">
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Bill:${receipt.billId}`}
                        alt="Payment QR" className="w-full h-full object-contain"
                    />
                </div>
                <p className="text-gray-400 text-xs text-center max-w-xs">
                    Pay via M-Pesa or scan the code, or hand cash/card to the cashier
                </p>
            </div>
        );
    }

    // ---- Live cart mirroring the cashier's scans ----
    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <header className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-black text-lg text-white">B</div>
                    <h1 className="font-black text-base text-gray-900">{branchName || 'Babylon Supermarket'}</h1>
                </div>
                <span className="text-xs font-bold bg-orange-50 text-orange-500 px-2.5 py-1 rounded-md">{totalQty} Items</span>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <section className="w-7/12 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-2.5">
                    {cart.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-16">Waiting for items to be scanned…</p>
                    ) : (
                        cart.map((item, i) => (
                            <div key={`${item.productId}-${i}`} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[8px] font-black text-gray-400 text-center px-0.5">{item.productName}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-extrabold text-gray-900 truncate">{item.productName}</h3>
                                        <span className="text-xs text-gray-500">{item.unitPrice} KES × {item.quantity}</span>
                                    </div>
                                </div>
                                <span className="text-base font-black text-orange-500 shrink-0">{item.unitPrice * item.quantity} KES</span>
                            </div>
                        ))
                    )}
                </section>

                <section className="w-5/12 bg-gray-900 text-white flex flex-col justify-between p-8">
                    <div>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Running Total</span>
                        <p className="text-5xl font-black mt-2">{subtotal.toLocaleString()} <span className="text-2xl text-orange-500">KES</span></p>
                    </div>
                    <p className="text-center text-xs text-gray-400">Thank you for shopping with us</p>
                </section>
            </main>
        </div>
    );
              }
