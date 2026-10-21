import csv
import json
from pathlib import Path

def summarize(path):
    with open(path, newline='', encoding='utf-8') as source:
        rows = list(csv.DictReader(source))
    amounts = [int(row['amount_cents']) for row in rows]
    if any(value < 0 for value in amounts):
        raise ValueError('Negative order amount')
    if len({row['order_id'] for row in rows}) != len(rows):
        raise ValueError('Duplicate order ID')
    return {'orders': len(rows), 'totalCents': sum(amounts)}

if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    result = summarize(root / 'orders.csv')
    result.update(json.loads((root / 'release.json').read_text()))
    print(json.dumps(result))
