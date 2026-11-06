// Utility to generate and download standard GPX tracks from GPS routes

export function generateGpx(path = [], startTime = Date.now(), totalSeconds = 0) {
  const points = Array.isArray(path) ? path : [];
  const count = points.length;
  const timeStep = count > 1 ? (totalSeconds * 1000) / count : 1000;
  const startMs = startTime - totalSeconds * 1000;

  const trackPointsXml = points
    .map(([lat, lon], idx) => {
      const pointTime = new Date(startMs + idx * timeStep).toISOString();
      return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">
        <ele>0</ele>
        <time>${pointTime}</time>
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Claimr Fitness - https://claimr.app" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Claimr Run - ${new Date(startMs).toLocaleDateString()}</name>
    <time>${new Date(startMs).toISOString()}</time>
  </metadata>
  <trk>
    <name>Territory Run</name>
    <type>Running</type>
    <trkseg>
${trackPointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadGpxFile(gpxString, filename = 'claimr-run.gpx') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([gpxString], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

