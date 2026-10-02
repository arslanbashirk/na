"""Build lightweight display geometries; preserve original administrative files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent / 'polygons'


def simplify(points, tolerance=0.008):
    if len(points) <= 4:
        return points
    first, last = points[0], points[-1]
    dx, dy = last[0] - first[0], last[1] - first[1]
    denominator = dx * dx + dy * dy
    best, index = 0, 0
    for i, point in enumerate(points[1:-1], 1):
        t = max(0, min(1, ((point[0] - first[0]) * dx + (point[1] - first[1]) * dy) / denominator)) if denominator else 0
        distance = (point[0] - first[0] - t * dx) ** 2 + (point[1] - first[1] - t * dy) ** 2
        if distance > best:
            best, index = distance, i
    if best > tolerance * tolerance:
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [first, last]


def ring(points):
    result = simplify(points)
    if len(result) < 4:
        result = points
    return [[round(p[0], 5), round(p[1], 5)] for p in result]


for source, target in [('provinces', 'province'), ('divisions', 'division'), ('districts', 'district')]:
    records = json.loads((ROOT / (source + '.json')).read_text(encoding='utf-8-sig'))
    output = []
    for record in records:
        geometry = record['boundary']
        if geometry['type'] == 'MultiPolygon':
            coordinates = [[ring(r) for r in polygon] for polygon in geometry['coordinates']]
        elif geometry['type'] == 'Polygon':
            coordinates = [ring(r) for r in geometry['coordinates']]
        else:
            raise ValueError('Unsupported geometry type: ' + geometry['type'])
        output.append({'code': record['code'], 'name': record['name'], 'boundary': {'type': geometry['type'], 'coordinates': coordinates}})
    destination = ROOT / ('atlas-' + target + '.json')
    destination.write_text(json.dumps(output, separators=(',', ':')), encoding='utf-8')
    print(f'{target}: {len(output)} features, {destination.stat().st_size:,} bytes')
