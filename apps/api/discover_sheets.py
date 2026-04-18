from sheets import get_spreadsheet_metadata, fetch_sheet_data
import json

ids = {
    '2021': '1eEUDdRLbwnekYTO7p2vBaWj5EhzCBbPfK1Va7xfE93E',
    '2022': '1AA9zxJy8zLSmGo94_avHDpspQcNlcm8VlqsFZuRyFCM',
    '2023': '12UaF_9Jh2465zx-tZ1RE5BsaLBsME9eBXnSxSWrA7_w',
    '2024': '1d-leFCxEQ6xyuw13YX-CtUiD-erEiUUFiPhiVR9A1uo',
    '2025': '1YIoU6AsMsUeKwQ3Til91VU1weyzeRIaojP1ZtelKlVE',
    '2026': '1aJMpVilVlep3ggNcOn-FuGjFGzrtCdFOU44MrflXbzY'
}

def discover():
    summary = {}
    for year, spreadsheet_id in ids.items():
        print(f"Discovering {year}...")
        meta = get_spreadsheet_metadata(spreadsheet_id)
        if not meta:
            print(f"Failed to get metadata for {year}")
            continue
            
        sheet_info = []
        for s in meta.get('sheets', []):
            title = s['properties']['title']
            # Fetch first row for headers
            rows = fetch_sheet_data(spreadsheet_id, f"'{title}'!A1:Z1")
            headers = rows[0] if rows else []
            sheet_info.append({
                'title': title,
                'headers': headers
            })
            
        summary[year] = {
            'spreadsheet_title': meta['properties']['title'],
            'sheets': sheet_info
        }
    
    with open('sheet_discovery_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print("Discovery complete. Summary saved to sheet_discovery_summary.json")

if __name__ == "__main__":
    discover()
