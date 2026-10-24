# Builds index-documents-pudi.json: for each normalised word of the two PUDi PDFs, the PDF FILE
# pages (1-based) where it appears. Same normalisation as utils/recherche.ts normaliser().
# Usage: python genere-index-documents.py <pudi.pdf> <reglements.pdf>   (needs pdftotext / poppler)
import sys, re, json, subprocess, unicodedata, datetime
STOP = set("les des une pour dans avec sur par qui que est aux ces son ses pas plus leur leurs cette ont sont ete etre elle ils nous vous mais sans tout tous toute toutes comme ainsi entre lors dont donc car tres peut sous afin vers chez aussi deja meme autre autres".split())
def norm(s):
    s = s.replace('œ', 'oe').replace('Œ', 'Oe')
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()
docs = [('pudi', sys.argv[1]), ('reglements', sys.argv[2])]
mots, pages = {}, {}
for did, path in docs:
    txt = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True).stdout.decode('utf-8', 'ignore')
    pp = txt.split('\f')
    if pp and not pp[-1].strip(): pp = pp[:-1]
    pages[did] = len(pp)
    for i, p in enumerate(pp, 1):
        for w in sorted(set(norm(p).split())):
            if len(w) < 3 or w.isdigit() or w in STOP: continue
            mots.setdefault(w, {}).setdefault(did, []).append(i)
out = {'version': 1, 'genere': datetime.date.today().isoformat(), 'pagesFichier': pages,
       'note': 'pages = PDF file pages (1-based), not printed numbers', 'mots': dict(sorted(mots.items()))}
open('index-documents-pudi.json', 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(len(mots), 'words', pages)
