import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, X, Camera, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import API from '../../api/axios';

const REASONS = [
    { value: 'damaged', label: 'Damaged', photoRequired: true },
    { value: 'stolen', label: 'Stolen', photoRequired: true },
    { value: 'expired', label: 'Expired', photoRequired: false },
    { value: 'spillage', label: 'Spillage / Wastage', photoRequired: false },
    { value: 'count_correction', label: 'Count Correction', photoRequired: false },
    { value: 'other', label: 'Other', photoRequired: false },
];

export default function StockAdjustmentModal({ product, open, onClose, onSubmitted }) {
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoPublicId, setPhotoPublicId] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef(null);

    if (!open || !product) return null;

    const selectedReason = REASONS.find((r) => r.value === reason);
    const photoRequired = selectedReason?.photoRequired;

    const reset = () => {
        setQuantity(''); setReason(''); setNote('');
        setPhotoUrl(''); setPhotoPublicId('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handlePhoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error('Max file size is 5MB');

        try {
            setUploading(true);
            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
                initialQuality: 0.85,
            });
            const formData = new FormData();
            formData.append('image', compressed, file.name);
            const res = await API.post('/products/upload-image', formData, { timeout: 30000 });
            setPhotoUrl(res.data.url);
            setPhotoPublicId(res.data.publicId);
            toast.success('Photo attached');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Photo upload failed');
        } finally {
            setUploading(false);
        }
    };

    const submit = async () => {
        const qty = Number(quantity);
        if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
        if (qty > (product.currentStock || 0)) return toast.error(`Only ${product.currentStock} in stock`);
        if (!reason) return toast.error('Select a reason');
        if (photoRequired && !photoUrl) return toast.error(`A photo is required for "${selectedReason.label}"`);

        setSubmitting(true);
        try {
            await API.post('/stock-adjustments', {
                productId: product._id,
                quantity: qty,
                reason,
                note: note.trim(),
                photoUrl: photoUrl || undefined,
                photoPublicId: photoPublicId || undefined,
            });
            toast.success('Sent to your manager for approval');
            reset();
            onSubmitted?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" /> Report Stock Loss
                    </h3>
                    <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    {product.name} — currently {product.currentStock} in stock
                </p>

                <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-400 block">Quantity Lost</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" />

                    <label className="text-xs font-semibold text-gray-400 block">Reason</label>
                    <div className="grid grid-cols-2 gap-2">
                        {REASONS.map((r) => (
                            <button key={r.value} type="button" onClick={() => setReason(r.value)}
                                className={`text-xs font-bold py-2 rounded-lg border transition ${
                                    reason === r.value
                                        ? 'bg-red-500 text-white border-red-500'
                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <label className="text-xs font-semibold text-gray-400 block">Note (optional)</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                        placeholder="Any extra detail your manager should know…"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" />

                    {photoRequired && (
                        <div>
                            <label className="text-xs font-semibold text-gray-400 block mb-1">
                                Photo evidence (required for {selectedReason.label})
                            </label>
                            {photoUrl ? (
                                <div className="relative">
                                    <img src={photoUrl} alt="evidence" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                                    <button onClick={() => { setPhotoUrl(''); setPhotoPublicId(''); }}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-xs font-semibold text-gray-400 hover:border-red-300 hover:text-red-500 transition">
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                    {uploading ? 'Uploading…' : 'Attach photo'}
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" capture="environment"
                                onChange={handlePhoto} className="hidden" />
                        </div>
                    )}

                    <button onClick={submit} disabled={submitting || uploading}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 mt-1">
                        {submitting ? 'Submitting…' : 'Submit for Manager Approval'}
                    </button>
                </div>
            </div>
        </div>
    );
      }
