from app import summarize
assert summarize('orders.csv')['orders'] == 3
print('CSV input contract checked')
