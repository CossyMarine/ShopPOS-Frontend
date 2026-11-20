import { useState, useEffect } from 'react';
import API from '../../../api/axios';

// ---- VAT settings, for the live cart estimate ----
export default function useVatSettings() {
    const [vatSettings, setVatSettings] = useState(null);

    useEffect(() => {
        API.get('/settings/public')
            .then((res) => setVatSettings(res.data.vat || { enabled: false }))
            .catch(() => setVatSettings({ enabled: false }));
    }, []);

    return vatSettings;
}
