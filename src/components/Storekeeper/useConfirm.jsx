import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function useConfirm() {
    const [state, setState] = useState(null);
    const resolver = useRef(null);
    const confirm = useCallback((opts) => new Promise((res) => { resolver.current = res; setState(opts); }), []);
    const close = (v) => { resolver.current?.(v); resolver.current = null; setState(null); };
    const dialog = <ConfirmDialog open={!!state} {...(state || {})} onConfirm={() => close(true)} onClose={() => close(false)} />;
    return [confirm, dialog];
}
