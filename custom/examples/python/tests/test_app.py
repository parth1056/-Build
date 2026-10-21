import tempfile
import unittest
from pathlib import Path
from app import summarize

class OrdersTests(unittest.TestCase):
    def test_known_total(self):
        self.assertEqual(summarize('orders.csv'), {'orders': 3, 'totalCents': 6000})

    def test_negative_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.csv'
            path.write_text('order_id,amount_cents\nA,-1\n')
            with self.assertRaises(ValueError):
                summarize(path)

if __name__ == '__main__':
    unittest.main()
