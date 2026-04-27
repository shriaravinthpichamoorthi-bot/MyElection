import { useState, useMemo } from 'react';

export function useSortable(data, defaultCol, defaultDir = 'asc') {
  const [col, setCol] = useState(defaultCol);
  const [dir, setDir] = useState(defaultDir);

  function toggle(c) {
    if (col === c) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setCol(c); setDir('asc'); }
  }

  const sorted = useMemo(() => {
    if (!data || !data.length) return data || [];
    return [...data].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [data, col, dir]);

  return { sorted, col, dir, toggle };
}
