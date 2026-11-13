import { useEffect, useState } from 'react';
import API from '../api/axios';

let cache = null; // { storeName, currency }
let inflight = null;
const listeners = new Set();

const fetchInfo = () => {
  inflight ||= API.get('/settings/public')
    .then((r) => {
      cache = { storeName: r.data?.storeName || '', currency: r.data?.currency || 'KES' };
      listeners.forEach((fn) => fn(cache));
    })
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
};

// SettingsManagement fires this after a successful save
if (typeof window !== 'undefined') window.addEventListener('store-settings-updated', fetchInfo);

export default function useStoreInfo() {
  const [info, setInfo] = useState(cache);
  useEffect(() => {
    listeners.add(setInfo);
    if (cache === null) fetchInfo(); else setInfo(cache);
    return () => { listeners.delete(setInfo); };
  }, []);
  return info || { storeName: '', currency: 'KES' };
}
