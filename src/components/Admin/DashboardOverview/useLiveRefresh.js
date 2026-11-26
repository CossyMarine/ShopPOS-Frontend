import { useEffect, useRef } from 'react';
import { createSocket } from '../../../lib/socket';
import { LIVE_EVENTS } from './constants';

/* Live refresh for the dashboard.

   One socket for the life of the screen. `load` and `delayMs` are read
   through refs, so changing the range never tears the connection down.
   createSocket() authenticates with a short-lived ticket (no cookies), and the
   server only lets it join its own branch room (Super Admin: any branch).

   delayMs is the debounce before a burst of events triggers one reload.
   The heavy ranges (This Year / All) pass a longer delay.

   A selected branch listens to that branch only. "All branches" (Super Admin)
   listens to every branch room, so sales anywhere still refresh the dashboard. */
export default function useLiveRefresh(load, branch, branches, delayMs = 1500) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const delayRef = useRef(delayMs);
  delayRef.current = delayMs;
  const sockRef = useRef(null);
  const roomsRef = useRef([]);

  useEffect(() => {
    const sock = createSocket();
    sockRef.current = sock;

    // The server forgets rooms when a socket drops, so re-join on every (re)connect
    const joinAll = () => roomsRef.current.forEach((r) => sock.emit('join_room', r));
    sock.on('connect', joinAll);

    let t;
    const kick = () => { clearTimeout(t); t = setTimeout(() => loadRef.current(), delayRef.current); };
    LIVE_EVENTS.forEach((e) => sock.on(e, kick));

    return () => {
      clearTimeout(t);
      sock.disconnect();
      sockRef.current = null;
    };
  }, []);

  const roomKey = branch
    ? `branch:${branch}`
    : branches.map((b) => `branch:${b._id}`).join(',');

  useEffect(() => {
    const next = roomKey ? roomKey.split(',') : [];
    const prev = roomsRef.current;
    const sock = sockRef.current;
    if (sock?.connected) {
      prev.filter((r) => !next.includes(r)).forEach((r) => sock.emit('leave_room', r));
      next.filter((r) => !prev.includes(r)).forEach((r) => sock.emit('join_room', r));
    }
    roomsRef.current = next; // if not connected yet, the 'connect' handler joins these
  }, [roomKey]);
}
