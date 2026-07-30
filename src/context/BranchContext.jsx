import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';

// Single source of truth for "which branch's data is the Admin/Manager
// screen currently showing". Super Admin can switch freely (or view "All
// Branches" — represented as selectedBranch: null); a Branch Manager is
// locked to their own branch, matching "manager shares everything with
// admin but scoped to their own branch" from the spec.
const BranchContext = createContext(null);

export function BranchProvider({ children }) {
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(user?.isAdmin ? null : user?.branch || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.isAdmin) {
            setSelectedBranch(user?.branch || null);
            setLoading(false);
            return;
        }
        API.get('/branches')
            .then((res) => setBranches(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch, loading, isAdmin: !!user?.isAdmin }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const ctx = useContext(BranchContext);
    if (!ctx) throw new Error('useBranch must be used within a <BranchProvider>');
    return ctx;
}
