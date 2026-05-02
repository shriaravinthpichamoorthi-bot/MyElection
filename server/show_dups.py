import json

results = json.load(open('api_full_results.json'))

print('=== Kalyanpur ===')
for cid, r in results.items():
    if 'kalyanpur' in r['name'].lower():
        print(f'ID={cid}, name="{r["name"]}", candidate="{r.get("leading_candidate", "N/A")}", party="{r.get("leading_party", "N/A")}"')

print('\n=== Pipra ===')
for cid, r in results.items():
    if 'pipra' in r['name'].lower():
        print(f'ID={cid}, name="{r["name"]}", candidate="{r.get("leading_candidate", "N/A")}", party="{r.get("leading_party", "N/A")}"')
