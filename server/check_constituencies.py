import asyncio
import json
from scraper import ECIScraper

async def get_names():
    scraper = ECIScraper()
    await scraper.start()
    folder = 'ResultAcGenNov2025'
    results = await scraper.fetch_all_summaries(folder, 'S04')
    api_names = {r['id']: r['name'] for r in results.values()}
    print('Total from API:', len(api_names))
    
    # Load static JSON
    static = json.load(open(r'C:\ai-pro\MyElection\myelection\public\bihar_candidates_2025.json'))
    static_names = set(static.get('constituencies', {}).keys())
    print('Total from static:', len(static_names))
    
    # Find API names not in static
    api_norms = {}
    for cid, name in api_names.items():
        norm = name.lower().replace(' ', '').replace('(sc)', '').replace('(st)', '')
        api_norms[norm] = (cid, name)
    
    static_norms = {}
    for name in static_names:
        norm = name.lower().replace(' ', '').replace('(sc)', '').replace('(st)', '')
        static_norms[norm] = name
    
    missing_in_static = []
    for norm, (cid, name) in api_norms.items():
        if norm not in static_norms:
            missing_in_static.append((cid, name))
    
    print('Missing from static JSON:')
    for cid, name in missing_in_static:
        print(f'  ID {cid}: {name}')
    
    # Check Bhore specifically
    for cid, name in api_names.items():
        if 'bhore' in name.lower():
            print(f'Bhore in API: ID={cid}, name="{name}"')
    
    # Check all B names in API vs static
    api_b = sorted([name for name in api_names.values() if name.upper().startswith('B')])
    static_b = sorted([name for name in static_names if name.upper().startswith('B')])
    print('\nB names in API but not static:')
    for name in api_b:
        norm = name.lower().replace(' ', '').replace('(sc)', '').replace('(st)', '')
        if norm not in static_norms:
            print(f'  {name}')
    
    await scraper.stop()

asyncio.run(get_names())
