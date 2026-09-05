import urllib.request
import json

vids = [
    '4Nqx6mKTGr4', 'cwV2ycLSaY8', 'dGSliL4IrCg', 'uLLJ9vYAeWw', '1p7HEhdzVf4',
    'JJEXvK6nDRM', 'xzZXcwVwz3s', 'ZDlcI80eAp0', 'LnldPitDTwU', 'wBOYwcYs87g',
    'qk4ne7yJbh0', '2Fg4uuMtKj4', '9JfeF9ZDZtI', 'qAxH_87WvGk', 'hUK37R55IQY'
]

for vid in vids:
    try:
        url = f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"{vid} | {data.get('title')} | {data.get('thumbnail_url')}")
    except Exception as e:
        print(f"{vid} | error: {e}")
