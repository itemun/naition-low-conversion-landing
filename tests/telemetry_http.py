"""Run against an isolated local PHP server, never the deployed site."""
import http.cookiejar, json, os, urllib.request, urllib.error
base = os.environ.get('ANALYTICS_TEST_URL', 'http://127.0.0.1:8767')
assert base.startswith('http://127.0.0.1:')
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, data=None, headers=None):
    req = urllib.request.Request(base+path, data=data, headers=headers or {})
    try:
        with client.open(req) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
payload = {'id':'0123456789abcdef0123456789abcdef','version':'baseline-15.6-heatmap-v1','device':'desktop','qa':True,'events':[{'seq':1,'ms':0,'kind':'page','target':'page','value':0,'x':-1,'y':-1},{'seq':2,'ms':1000,'kind':'click','target':'cta-hero','value':0,'x':.5,'y':.5}]}
def post(p, origin=base): return request('/telemetry/collect.php',json.dumps(p).encode(),{'Content-Type':'application/json','Origin':origin})[0]
assert request('/admin/analytics.php?export=1')[0] == 401
assert request('/telemetry/collect.php')[0] == 405
assert post(payload, 'https://unrelated.example') == 403
assert post(payload) == 204
assert post(payload) == 204
bad = json.loads(json.dumps(payload)); bad['events'][0]['target']='private@example.com'
assert post(bad) == 400
bad = json.loads(json.dumps(payload)); bad['events'][0]['x']=10
assert post(bad) == 400
assert request('/telemetry/collect.php',b'x'*48001,{'Content-Type':'application/json'})[0] == 413
request('/admin/orders.php', b'password=FirstAid2026%21', {'Content-Type':'application/x-www-form-urlencoded'})
status, body = request('/admin/analytics.php?export=1'); assert status == 200
report = json.loads(body)
rows=[e for e in report['events'] if e['sid']==payload['id']]
assert len(rows)==2, rows
assert len([s for s in report['sessions'] if s['id']==payload['id']])==1
assert 'private@example.com' not in body.decode()
assert request('/admin/analytics.php')[0] == 200
print('PASS: authorization, origin, payload limits, target validation, coordinate validation, duplicate delivery, export')
