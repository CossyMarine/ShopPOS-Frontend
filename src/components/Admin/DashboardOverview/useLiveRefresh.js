import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, LIVE_EVENTS } from './constants';

/* Live refresh for the dashboard.

   One socket for the life of the screen. `load` is read through a ref, so
   changing the range (which changes `load`) never tears the connection down.
   Plain io(SOCKET_URL) with no withCredentials — the socket doesn't use
   cookies, and the server's CORS doesn't send Allow-Credentials.

   A selected branch listens to that branch only. "All branches" (Super Admin)
   listens to every branch room, so sales anywhere still refresh the dashboard. */
export default function useLiveRefresh(load, branch, branches) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const sockRef = useRef(null);
  const roomsRef = useRef([]);

  useEffect(() => {
    const sock = io(SOCKET_URL);
    sockRef.current = sock;

    // The server forgets rooms when a socket drops, so re-join on every (re)connect
    const joinAll = () => roomsRef.current.forEach((r) => sock.emit('join_room', r));
    sock.on('connect', joinAll);

    let t;
    const kick = () => { clearTimeout(t); t = setTimeout(() => loadRef.current(), 1500); };
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
