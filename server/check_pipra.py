import json

# Use the saved API names
api = json.load(open('api_constituency_names.json'))

# We need the full results with IDs. Let's load from a fresh scrape or use cached data
from scraper import ECIScraper
import asyncio

async def main():
    scraper = ECIScraper()
    await scraper.start()
    results = await scraper.fetch_all_summaries('ResultAcGenNov2025', 'S04')
    await scraper.stop()
    
    # Save full results
    with open('api_full_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    for cid, r in results.items():
        if 'kalyanpur' in r['name'].lower():
            print(f'Kalyanpur: ID={cid}, name="{r["name"]}"')
        if 'pipra' in r['name'].lower():
            print(f'Pipra: ID={cid}, name="{r["name"]}"')

asyncio.run(main())
