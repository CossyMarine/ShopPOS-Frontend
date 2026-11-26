import { lineQtyPrice } from '../utils/packLine';

export default function PrintReceipt({ receipt }) {
    if (!receipt) return null;

    const date = new Date(receipt.createdAt);
    const dateStr = date.toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });

    // Bills given on credit carry a "credit" entry in payments[] (the sale, not money received)
    const creditEntry = (receipt.payments || []).find((p) => p.method === 'credit');
    const onCredit = receipt.status === 'credit' || !!creditEntry;
    const creditCustomer = (creditEntry?.reference || '').replace(/^Credit\s*—\s*/, '');
    const paidSoFar = Number((receipt.amountPaid || 0).toFixed(2));
    const balanceOwed = receipt.status === 'credit'
        ? Math.max(0, Number(((receipt.totalDue ?? receipt.subtotal) - paidSoFar).toFixed(2)))
        : 0;

    return (
        <div id="print-receipt" className="hidden print:block font-mono text-black bg-white p-4 w-72 text-sm">
            <div className="text-center mb-2">
                <p>=====================================</p>
                <p className="font-bold">CHEMALUG MUGUNDOI SUPERMARKET</p>
                <p>{receipt.branch?.name || ''}</p>
                <p>SALES RECEIPT</p>
                <p>=====================================</p>
            </div>

            <p>Receipt No : {receipt.billId}</p>
            <p>Cashier    : {receipt.cashierName}</p>
            <p>Date       : {dateStr}</p>
            <p>Time       : {timeStr}</p>

            <p>-------------------------------------</p>
            <p>Item              Qty   Price   Total</p>
            <p>-------------------------------------</p>

            {receipt.items?.map((item, i) => {
                const l = lineQtyPrice(item);
                const isPack = !!item.packId;
                // Normal line: name + numbers on one row.
                // Pack line: name on its own row, then "Carton of 12" + numbers,
                // so the pack label is never cut off.
                const label = isPack
                    ? `  ${item.packName} of ${item.packQty}`
                    : item.productName;
                return (
                    <div key={i}>
                        {isPack && <p>{item.productName.slice(0, 37)}</p>}
                        <p>
                            {label.padEnd(18).slice(0, 18)}
                            {String(l.qty).padStart(3)}
                            {String(l.price).padStart(7)}
                            {String(item.lineTotal).padStart(7)}
                        </p>
                    </div>
                );
            })}

            <p>-------------------------------------</p>
            {receipt.vatEnabled ? (
                <>
                    <p>Subtotal                 KES {receipt.subtotal}</p>
                    <p>VAT ({receipt.vatRate}%)               KES {receipt.vatAmount}</p>
                    <p>-------------------------------------</p>
                    <p className="font-bold">TOTAL                    KES {receipt.totalDue}</p>
                </>
            ) : (
                <p className="font-bold">TOTAL                    KES {receipt.totalDue}</p>
            )}

            {onCredit ? (
                <>
                    <p>Payment: ON CREDIT</p>
                    {creditCustomer && <p>Customer: {creditCustomer}</p>}
                    {paidSoFar > 0 && <p>Paid so far              KES {paidSoFar}</p>}
                    {balanceOwed > 0 ? (
                        <p className="font-bold">BALANCE OWED            KES {balanceOwed}</p>
                    ) : (
                        <p>Credit settled in full</p>
                    )}
                </>
            ) : (
                receipt.amountPaid > 0 && (
                    <>
                        <p>Amount Paid              KES {Number((receipt.amountPaid + (receipt.changeGiven || 0)).toFixed(2))}</p>
                        <p>Change                   KES {receipt.changeGiven || 0}</p>
                        <p>Payment: {receipt.paymentMethod}</p>
                    </>
                )
            )}

            {receipt.rewardPointsEarned > 0 && (
                <p>Points Earned            {receipt.rewardPointsEarned}</p>
            )}
            <div className="text-center mt-2">
                <p>=====================================</p>
                <p>Thank You! Visit Again</p>
                <p>=====================================</p>
            </div>
        </div>
    );
                          }
