import requests
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
import re
import csv
from io import StringIO

LINES = ['A','C','E','B','D','F','M','G','J','Z',
    'N','Q','R','W','L','1','2','3','4','5','6','7','SI']

DATADIR = Path('./src/data')
SVGDIR = DATADIR / 'lineIcons'
STATIONSFILE = DATADIR / 'stations.json'
LINECOLORSFILE = DATADIR / 'lineColors.json'
ICON_SIZE = 128

PX_RE = re.compile(r'(?P<dim>\d+)px')

# GET SVG LINE ICONS

svg_url = 'https://api.mta.info/lineIcons/{}.svg'

if not DATADIR.is_dir():
    DATADIR.mkdir()

if not SVGDIR.is_dir():
    SVGDIR.mkdir()

line_colors = {}

for l in LINES:
    r = requests.get(svg_url.format(l))
    r.raise_for_status()

    tree = ET.fromstring(r.text)
    dims = [int(PX_RE.match(tree.attrib[k]).group('dim')) for k in ['width', 'height']]
    scale_factor = int(round(ICON_SIZE / max(dims)))
    new_dims = [d*scale_factor for d in dims]
    tree.attrib['width'] = f'{new_dims[0]}px'
    tree.attrib['height'] = f'{new_dims[1]}px'

    fill_colors = [elem.attrib['fill'] for elem in tree.findall(".//*[@fill]")]
    fill_colors = [c for c in fill_colors if not c in ['#FFFFFF', '#000000', 'none']]
    assert(len(fill_colors) == 1)

    hex_color = fill_colors[0]
    line_colors[l] = {
        'hex': hex_color,
        'rgb': [int(hex_color.lstrip('#')[i:i+2], 16) for i in (0,2,4)]
    }

    svgfile = SVGDIR / f'{l}.svg'
    with open(svgfile, 'w') as file_obj:
        file_obj.write(ET.tostring(tree, encoding='unicode'))

    print(f'Wrote {svgfile}')

    # subprocess.check_output([
    #     'inkscape',
    #     '--export-type=png',
    #     '-w',
    #     str(PNG_WIDTH),
    #     str(svgfile)
    # ])
    # print(f'Wrote {svgfile.replace('.svg', '.png')}')

with open(LINECOLORSFILE, 'w') as file_obj:
    json.dump(line_colors, file_obj, indent=2)

print(f'Wrote {LINECOLORSFILE}')

# GET STATION CSV FILE

stations_url = 'https://atisdata.s3.amazonaws.com/Station/Stations.csv'

r = requests.get(stations_url)
r.raise_for_status()

sIO = StringIO(r.text)
csvdata = [row for row in csv.reader(sIO, delimiter=',')]
headers = csvdata[0]
datarows = csvdata[1:]

station_dicts = [{k:v.strip() for k,v in zip(headers, row)} for row in datarows]

station_dicts = [dict(s, **{'Daytime Routes': [r for r in s['Daytime Routes'].split(' ') if not r == 'S']}) for s in station_dicts]
station_dicts = [s for s in station_dicts if len(s['Daytime Routes']) > 0]

with open(STATIONSFILE, 'w') as file_obj:
    json.dump(station_dicts, file_obj, indent=2)

print(f'Wrote {STATIONSFILE}')



