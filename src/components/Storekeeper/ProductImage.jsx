import { useRef, useState } from 'react';
import { Image as ImageIcon, Eye, Camera, Trash2, X, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmDialog from './ConfirmDialog';

export default function ProductImage({ product: p, branch, onChanged, compact = false }) {
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const [askDel, setAskDel] = useState(false);

    const save = async (data, msg) => {
        await API.put(`/products/${p._id}`, { ...data, branch });
        toast.success(msg);
        await onChanged?.();
    };
    const change = async (e) => {
        const file = e.target.files?.[0]; e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
            const c = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, initialQuality: 0.85 });
            const fd = new FormData(); fd.append('image', c, file.name);
            const up = await API.post('/products/upload-image', fd, { timeout: 30000 });
            await save({ imageUrl: up.data.url, imagePublicId: up.data.publicId }, 'Image updated');
        } catch (er) { toast.error(er.response?.data?.message || 'Image upload failed'); }
        setBusy(false);
    };
    const remove = async () => {
        setBusy(true);
        try { await save({ imageUrl: null, imagePublicId: null }, 'Image removed'); setAskDel(false); }
        catch (er) { toast.error(er.response?.data?.message || 'Could not remove image'); }
        setBusy(false);
    };

    const box = compact ? 'h-16 w-16 rounded-xl' : 'h-32 w-32 rounded-2xl';
    const btn = 'p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-brand-orange hover:text-white transition';

    return (
        <div className="shrink-0">
            <button type="button" onClick={() => p.imageUrl && setOpen(true)}
                className={`${box} relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-1 ring-black/5`}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon size={compact ? 20 : 34} className="text-gray-400" />}
                {busy && <span className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-brand-orange" /></span>}
            </button>
            <div className="flex justify-center gap-1 mt-1.5">
                {p.imageUrl && <button type="button" title="View image" onClick={() => setOpen(true)} className={btn}><Eye size={13} /></button>}
                <button type="button" title={p.imageUrl ? 'Change image' : 'Add image'} onClick={() => fileRef.current?.click()} className={btn}><Camera size={13} /></button>
                {p.imageUrl && <button type="button" title="Delete image" onClick={() => setAskDel(true)} className={`${btn} hover:!bg-red-600`}><Trash2 size={13} /></button>}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={change} className="hidden" />

            {open && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
                    <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white"><X size={22} /></button>
                    <img src={p.imageUrl} alt={p.name} className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
            <ConfirmDialog open={askDel} tone="danger" loading={busy} title="Delete image?" description={`Remove the picture of "${p.name}"?`}
                confirmLabel="Delete image" onConfirm={remove} onClose={() => setAskDel(false)} />
        </div>
    );
}
