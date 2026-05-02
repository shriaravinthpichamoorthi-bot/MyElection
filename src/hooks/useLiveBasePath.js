import { useLocation } from 'react-router-dom';

export function useLiveBasePath() {
  const { pathname } = useLocation();
  return pathname.startsWith('/bihar') ? '/bihar/live' : '/live';
}
