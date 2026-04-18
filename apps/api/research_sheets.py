from sheets import fetch_sheet_data
import json

ids = {
    '2021': '1eEUDdRLbwnekYTO7p2vBaWj5EhzCBbPfK1Va7xfE93E',
    '2024': '1d-leFCxEQ6xyuw13YX-CtUiD-erEiUUFiPhiVR9A1uo',
    '2025': '1YIoU6AsMsUeKwQ3Til91VU1weyzeRIaojP1ZtelKlVE',
    '2026': '1aJMpVilVlep3ggNcOn-FuGjFGzrtCdFOU44MrflXbzY'
}

def research():
    results = {}
    for year, spreadsheet_id in ids.items():
        print(f"Researching structure for {year}...")
        results[year] = {
            'Expenses': fetch_sheet_data(spreadsheet_id, "'Expenses'!A1:Z500"),
            'Income': fetch_sheet_data(spreadsheet_id, "'Income'!A1:Z500"),
            'Assets': fetch_sheet_data(spreadsheet_id, "'Assets'!A1:Z500")
        }
    
    with open('research_results_v2.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Research complete. Results saved to research_results_v2.json")

if __name__ == "__main__":
    research()
