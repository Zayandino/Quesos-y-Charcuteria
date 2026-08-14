import urllib.request, json

url = 'https://api.cohablosandes.cloud/rest/v1/dcava_productos?id=in.(5,6)'
req = urllib.request.Request(url, method='PATCH')
req.add_header('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg')
req.add_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg')
req.add_header('Content-Type', 'application/json')
data = json.dumps({"imagen_url": None}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as res:
        print(f"Status: {res.status}")
except Exception as e:
    print(f"Error: {e}")
