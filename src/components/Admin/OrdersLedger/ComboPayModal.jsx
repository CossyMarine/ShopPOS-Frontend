// src/components/Admin/OrdersLedger/ComboPayModal.jsx
import PrintReceipt from '../../PrintReceipt';
import useComboPayment from '../../../hooks/useComboPayment';
import PaymentMethodSelector from './ComboPay/PaymentMethodSelector';
import { CashPanel, TillPanel, PromptPanel, RewardPanel } from './ComboPay/CashTillPromptRewardPanels';
import BothPanel from './ComboPay/BothPanel';
import PaymentFooter from './ComboPay/PaymentFooter';
import MpesaPendingPanel from './ComboPay/MpesaPendingPanel';

export default function ComboPayModal({ receipt, onClose, onPaid }) {
    const p = useComboPayment({ receipt, onClose, onPaid });

    // Only bail out fully once there's neither a modal to show NOR a receipt
    // still queued to print — otherwise printTarget never gets a chance to render.
    if (!receipt && !p.printTarget) return null;

    const rewardBlockProps = {
        giveReward: p.giveReward, setGiveReward: p.setGiveReward,
        giveRewardIdentifier: p.giveRewardIdentifier, setGiveRewardIdentifier: p.setGiveRewardIdentifier,
    };

    const confirmHandler = {
        cash: p.handleCashPay,
        till: p.handleTillPay,
        reward: p.handleRewardPay,
        prompt: p.handleSendStk,
    }[p.paymentMethod];

    return (
        <>
            {/* Rendered unconditionally so it survives the modal below closing —
               printPaidReceipt's setTimeout needs this still mounted when it fires. */}
            <PrintReceipt receipt={p.printTarget} />

            {receipt && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-2">Process Payment</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {receipt.billId} · {receipt.branch?.name || ''}
                            {receipt.status === 'partial' && (
                                <span className="ml-2 text-blue-600 font-bold">· Partially paid</span>
                            )}
                        </p>

                        <div className="mb-1 text-3xl font-black text-orange-500">
                            KES {p.remaining.toLocaleString()}
                        </div>
                        {receipt.amountPaid > 0 && (
                            <p className="text-xs text-gray-400 mb-6">
                                Balance due · KES {receipt.amountPaid.toLocaleString()} already paid of KES {receipt.subtotal.toLocaleString()}
                            </p>
                        )}
                        {!receipt.amountPaid && <div className="mb-6" />}

                        {(p.mpesaState === 'idle' || p.mpesaState === 'failed') && (
                            <>
                                <PaymentMethodSelector paymentMethod={p.paymentMethod} setPaymentMethod={p.setPaymentMethod} />

                                {p.paymentMethod === 'cash' && (
                                    <CashPanel
                                        amountPaid={p.amountPaid} setAmountPaid={p.setAmountPaid}
                                        remaining={p.remaining} cashChange={p.cashChange}
                                        {...rewardBlockProps}
                                    />
                                )}

                                {p.paymentMethod === 'prompt' && (
                                    <PromptPanel mpesaPhone={p.mpesaPhone} setMpesaPhone={p.setMpesaPhone} remaining={p.remaining} />
                                )}

                                {p.paymentMethod === 'till' && (
                                    <TillPanel
                                        tillAmount={p.tillAmount} setTillAmount={p.setTillAmount}
                                        remaining={p.remaining}
                                        {...rewardBlockProps}
                                    />
                                )}

                                {p.paymentMethod === 'reward' && (
                                    <RewardPanel
                                        rewardAmount={p.rewardAmount} setRewardAmount={p.setRewardAmount}
                                        rewardIdentifier={p.rewardIdentifier} setRewardIdentifier={p.setRewardIdentifier}
                                        rewardRemainder={p.rewardRemainder} remaining={p.remaining}
                                    />
                                )}

                                {p.paymentMethod === 'both' && (
                                    <BothPanel
                                        comboCash={p.comboCash} setComboCash={p.setComboCash}
                                        comboTill={p.comboTill} setComboTill={p.setComboTill}
                                        comboAfterApply={p.comboAfterApply} comboEntered={p.comboEntered}
                                        remaining={p.remaining}
                                        comboApplying={p.comboApplying}
                                        onApply={p.handleComboApply}
                                        onCancel={p.handleClose}
                                        comboPromptPhone={p.comboPromptPhone} setComboPromptPhone={p.setComboPromptPhone}
                                        comboSendingPrompt={p.comboSendingPrompt}
                                        onSendPrompt={p.handleComboSendPrompt}
                                        {...rewardBlockProps}
                                    />
                                )}

                                {p.paymentMethod !== 'both' && (
                                    <PaymentFooter
                                        paymentMethod={p.paymentMethod}
                                        processing={p.processing}
                                        cashChange={p.cashChange}
                                        onCancel={p.handleClose}
                                        onConfirm={confirmHandler}
                                    />
                                )}
                            </>
                        )}

                        {p.mpesaState === 'pending' && (
                            <MpesaPendingPanel message={p.mpesaMessage} onClose={p.handleClose} />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
