import { useEffect, useState } from 'react';
export function useLocalNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setNow(Date.now());
    };
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}
