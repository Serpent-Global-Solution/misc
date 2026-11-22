import json, os, sys, urllib.request, urllib.error
S = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
K = dict(l.strip().split("=", 1) for l in open(f"{S}/sb.env") if "=" in l)
SB, API = "http://127.0.0.1:54321", "http://meiki-api.test:8083"
def req(method, url, body=None, token=None, key=None, ok=(200, 201, 204)):
    h = {"Content-Type": "application/json"}
    if key: h["apikey"] = key
    if token: h["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            t = resp.read().decode(); return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {url} -> {e.code}: {e.read().decode()[:600]}")
def login(email, pw="Demo-pass-2026!"):
    return req("POST", f"{SB}/auth/v1/token?grant_type=password", {"email": email, "password": pw}, key=K["ANON_KEY"])["access_token"]
def admin_user(email, name, pw="Demo-pass-2026!"):
    return req("POST", f"{SB}/auth/v1/admin/users", {"email": email, "password": pw, "email_confirm": True, "user_metadata": {"name": name, "full_name": name}}, token=K["SERVICE_ROLE_KEY"], key=K["SERVICE_ROLE_KEY"])
def api(method, path, body=None, token=None): return req(method, API + path, body, token)
def claims(tok):
    import base64; p = tok.split(".")[1]; return json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))

def serve_and_pay(token, outlet, ticket, start=True):
    """Start each waiting line, take cash for the ticket, settle, complete — what the POS does."""
    for l in ticket["lines"]:
        if start and l["status"] == "Waiting":
            api("POST", f"/api/v1/queue-lines/{l['id']}/start", {}, token=token)
    txn = api("POST", f"/api/v1/outlets/{outlet}/transactions", {"queueTicketId": ticket["id"], "clientId": ticket.get("clientId"), "paymentMethod": "Cash",
        "lines": [{"productId": l["productId"], "quantity": 1, "employeeId": l["employeeId"], "queueLineId": l["id"]} for l in ticket["lines"]]}, token=token)
    if txn.get("status") != "Settled":
        txn = api("POST", f"/api/v1/transactions/{txn['id']}/settle-cash", {}, token=token)
    for l in ticket["lines"]:
        try: api("POST", f"/api/v1/queue-lines/{l['id']}/complete", {}, token=token)
        except SystemExit: pass  # paying already completes the ticket
    return txn
