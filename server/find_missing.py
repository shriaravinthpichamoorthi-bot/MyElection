import asyncio
import json
from scraper import ECIScraper

async def main():
    scraper = ECIScraper()
    await scraper.start()
    results = await scraper.fetch_all_summaries('ResultAcGenNov2025', 'S04')
    await scraper.stop()
    
    api_names = sorted([r['name'] for r in results.values()])
    print(f'API returned {len(api_names)} constituencies')
    
    # Save API names for reference
    with open('api_constituency_names.json', 'w') as f:
        json.dump(api_names, f, indent=2)
    
    static = json.load(open(r'C:\ai-pro\MyElection\myelection\public\bihar_candidates_2025.json'))
    static_names = set(static.get('constituencies', {}).keys())
    
    def norm(name):
        return name.lower().replace(' ', '').replace('(sc)', '').replace('(st)', '')
    
    api_norms = {norm(n): n for n in api_names}
    static_norms = {norm(n): n for n in static_names}
    
    missing_from_static = [api_norms[k] for k in api_norms if k not in static_norms]
    extra_in_static = [static_norms[k] for k in static_norms if k not in api_norms]
    
    print('Missing from static:', missing_from_static)
    print('Extra in static (not in API):', extra_in_static)

asyncio.run(main())
