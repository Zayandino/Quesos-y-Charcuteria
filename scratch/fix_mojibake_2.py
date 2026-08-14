import json
import urllib.request

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg',
    'Content-Type': 'application/json'
}

replacements = {
    'emblem??tica': 'emblemática',
    'r??stica': 'rústica',
    'L??minas': 'Láminas',
    'fr??o': 'frío',
    'coraz??n': 'corazón'
}

def fix_text(text):
    if not isinstance(text, str):
        return text
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

with open('scratch/db_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for table, rows in data.items():
    for row in rows:
        updated_fields = {}
        for key, value in row.items():
            if isinstance(value, str):
                fixed = fix_text(value)
                if fixed != value:
                    updated_fields[key] = fixed
        
        if updated_fields:
            url = f"https://api.cohablosandes.cloud/rest/v1/dcava_{table}?id=eq.{row['id']}"
            req = urllib.request.Request(url, method='PATCH')
            for k, v in headers.items():
                req.add_header(k, v)
            
            payload = json.dumps(updated_fields).encode('utf-8')
            with urllib.request.urlopen(req, data=payload) as res:
                pass

print("Update completed.")
