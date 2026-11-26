import { Eye } from 'lucide-react';
import { money, formatDateTime } from '../../../utils/dashboardHelpers';

const PILL = {
  paid: 'bg-emerald-50 text-emerald-700', unpaid: 'bg-amber-50 text-amber-700',
  partial: 'bg-amber-50 text-amber-700', voided: 'bg-red-50 text-red-600',
  credit: 'bg-rose-50 text-rose-700',
};

export default function Receipts({ D, onView }) {
  return (
    <section className="dcard p-6">
      <h4 className="font-semibold text-lg mb-4">Recent receipts</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              {['Bill', 'Cashier', 'Branch', 'Time', 'Status'].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}
              <th className="pb-2 font-medium text-right">Amount</th>
              <th className="pb-2 font-medium text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {D.recent.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-400">No receipts yet.</td></tr>
            )}
            {D.recent.map((r) => (
              <tr key={r._id} className="border-t border-slate-100">
                <td className="py-3 font-medium">{r.billId}</td>
                <td>{r.cashierName || '-'}</td>
                <td>{r.branch?.name || '-'}</td>
                <td className="text-slate-500 text-xs">
                  {formatDateTime(r.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td><span className={`text-[11px] font-medium px-2 py-0.5 rounded-md capitalize ${PILL[r.status] || PILL.unpaid}`}>{r.status === 'credit' ? 'on credit' : r.status}</span></td>
                <td className="text-right font-medium">{money(r.totalDue ?? r.subtotal)}</td>
                <td className="text-right">
                  <button onClick={() => onView(r)} className="inline-flex items-center gap-1 text-slate-400 hover:text-accent text-xs font-medium transition-colors" aria-label="View receipt">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
            }
