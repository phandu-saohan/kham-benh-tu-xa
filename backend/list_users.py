import urllib.request, ssl, json, sys
sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl._create_unverified_context()

req = urllib.request.Request('https://app-bypass-back-end-circuit-7mgyyh-664221-72-61-123-73.sslip.io/api/v1/auth/login',
    data=json.dumps({'email': 'admin@example.test', 'password': 'ChangeMe123!'}).encode(),
    headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req, context=ctx) as r:
    token = json.loads(r.read())['access_token']

req2 = urllib.request.Request('https://app-bypass-back-end-circuit-7mgyyh-664221-72-61-123-73.sslip.io/api/v1/admin/users',
    headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req2, context=ctx) as r:
    users = json.loads(r.read())
    for u in users:
        print(f"ID={u.get('id')} | Email={u.get('email')} | Phone={u.get('phone_number')} | Role={u.get('role')} | Name={u.get('full_name')}")
