function flattenCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

export default function MapFragmentIcon({ geometry, className = 'h-4 w-4', fill = '#60a5fa', background = '#0f172a' }) {
  const polygons = flattenCoordinates(geometry);
  if (!polygons.length) {
    return <span className={`inline-block rounded-sm bg-slate-800 ${className}`} />;
  }

  const points = [];
  polygons.forEach((ring) => {
    ring.forEach(([x, y]) => points.push([x, y]));
  });

  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const width = Math.max(maxX - minX, 0.0001);
  const height = Math.max(maxY - minY, 0.0001);
  const scale = Math.min(18 / width, 18 / height);
  const offsetX = (20 - width * scale) / 2;
  const offsetY = (20 - height * scale) / 2;

  const path = polygons
    .map((ring) => {
      if (!ring.length) return '';
      const projected = ring.map(([x, y]) => [offsetX + (x - minX) * scale, offsetY + (maxY - y) * scale]);
      const [startX, startY] = projected[0];
      return `M ${startX.toFixed(2)} ${startY.toFixed(2)} ${projected
        .slice(1)
        .map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(' ')} Z`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect width="20" height="20" rx="4" fill={background} />
      <path d={path} fill={fill} stroke="#e2e8f0" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
}
