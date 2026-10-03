"""Encode our HTML preview screenshots; never read or modify a PDF."""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
screenshots = root / '.tools/owned-design-previews'
renders = json.loads((screenshots / 'renders.json').read_text())
assert len(renders) == 144 and len({item['id'] for item in renders}) == 144
target = root / 'assets/media/template-previews'
target.mkdir(parents=True, exist_ok=True)
records = []
requested = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
existing = {r['id']: r for r in json.loads((target / 'sources.json').read_text())['templates']} if requested else {}
for record in renders:
    if requested and record['id'] not in requested:
        records.append(existing[record['id']])
        continue
    with Image.open(screenshots / (record['id'] + '.png')) as image:
        assert image.width > 500 and image.height > 600
        height = round(image.height * 480 / image.width)
        image = image.convert('RGB').resize((480, height), Image.Resampling.LANCZOS)
        dest = target / record.get('file', record['id'] + '.webp')
        image.save(dest, 'WEBP', quality=90, method=6)
    with Image.open(dest) as check:
        check.verify()
    raw = dest.read_bytes()
    assert len(raw) > 1000
    records.append({
        'id': record['id'], 'name': record['name'], 'group': record['group'],
        'renderer': record['renderer'], 'file': dest.name, 'width': 480, 'height': height,
        'origin': record.get('origin', 'legacy'),
        'photo': record.get('photo', False),
        'sha256': hashlib.sha256(raw).hexdigest(),
    })
manifest = {
    'generated': datetime.now().astimezone().date().isoformat(),
    'source': 'first page rendered by our own HTML/CSS composers',
    'fixture': 'drafts/templates/fixtures.mjs: draftSample',
    'photoFixture': 'drafts/templates/sample-portrait-v1.png: fictional portrait generated with ImageGen; used only where photos are supported',
    'method': 'Chromium print-media screenshot; Pillow WebP encoding',
    'originalCatalogImagesUsed': False, 'pdfFilesCreatedOrModified': False,
    'extractedDecorationsRemoved': ['creative', 'pastel', 'visionary', 'confetti'],
    'templates': records,
}
(target / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'previews': len(records), 'bytes': sum((target / r['file']).stat().st_size for r in records)}))
