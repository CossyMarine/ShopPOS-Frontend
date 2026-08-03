import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';

// Single source of truth for "which branch's data is the Admin/Manager
// screen currently showing". Super Admin can switch freely (or view "All
// Branches" — represented as selectedBranch: null); a Branch Manager is
// locked to their own branch, matching "manager shares everything with
// admin but scoped to their own branch" from the spec.
//
// For the Super Admin, the choice is persisted on the User document in the
// database (via PATCH /auth/selected-branch), so it's restored automatically
// on refresh or next login instead of resetting to "All Branches" every time.
const BranchContext = createContext(null);

export function BranchProvider({ children }) {
    const { user, setUser } = useAuth();
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranchState] = useState(
        user?.isAdmin ? (user?.selectedBranch || null) : (user?.branch || null)
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.isAdmin) {
            setSelectedBranchState(user?.branch || null);
            setLoading(false);
            return;
        }
        // Restore whatever branch this admin was last viewing, straight from the DB
        setSelectedBranchState(user?.selectedBranch || null);
        API.get('/branches')
            .then((res) => setBranches(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    // Switching branches updates the UI immediately, and — for admins —
    // persists the choice to the DB so it "sticks" until they switch again.
    const setSelectedBranch = useCallback((branchId) => {
        const value = branchId || null;
        setSelectedBranchState(value);
        if (!user?.isAdmin) return;
        API.patch('/auth/selected-branch', { branch: value })
            .then((res) => setUser?.(res.data.user))
            .catch(() => {});
    }, [user, setUser]);

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
