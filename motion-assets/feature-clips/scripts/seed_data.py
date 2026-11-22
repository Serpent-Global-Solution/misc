"""Demo data for the §3–§6 clips (idempotent-ish: skips what already exists)."""
from api import *
import json
ids = json.load(open("ids.json")); t = login("demo-test@gmail.com")
B, O, P, E = ids["brand"], ids["outlet"], ids["products"], ids["employees"]

# retail products with stock
cats = {c["name"]: c["id"] for c in api("GET", "/api/v1/categories", token=t)}
have = {p["name"]: p["id"] for p in api("GET", f"/api/v1/brands/{B}/products", token=t)}
retail = {}
for name, cents, cost, qty in [("Matte Clay Pomade", 3500, 1800, 12), ("Beard Oil 30ml", 2800, 1300, 8), ("Daily Shampoo 250ml", 2200, 900, 15)]:
    pid = have.get(name) or api("POST", f"/api/v1/brands/{B}/products", {"categoryId": cats["Grooming"], "name": name, "type": "Retail", "basePriceCents": cents,
                                  "commissionEnabled": True, "defaultLowStockThreshold": 3, "unitCostCents": cost}, token=t)["id"]
    api("PUT", f"/api/v1/products/{pid}/stock/{O}", {"quantityOnHand": qty, "lowStockThreshold": 3}, token=t)
    retail[name] = pid
ids["retail"] = retail

# rental barber
emps = {e["fullName"]: e["id"] for e in api("GET", f"/api/v1/outlets/{O}/employees", token=t)}
if "Kamal Ariffin" not in emps:
    k = api("POST", f"/api/v1/outlets/{O}/employees", {"type": "Barber", "fullName": "Kamal Ariffin", "barberType": "Rental", "startDate": "2026-11-01",
            "rental": {"cutFeeType": "Percentage", "cutFeePercent": 30, "paidForRandomJobs": False, "eligibleForRandomAssignment": False, "retailRevenueToBarber": True}}, token=t)
    emps["Kamal Ariffin"] = k["id"]
    api("PUT", f"/api/v1/employees/{k['id']}/skills", {"productIds": list(P.values())}, token=t)
    api("PUT", f"/api/v1/employees/{k['id']}/schedule", {"days": [{"dayOfWeek": d, "isOff": d == "Monday", "startTime": "11:00:00", "endTime": "21:00:00"} for d in ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]]}, token=t)
E["Kamal Ariffin"] = emps["Kamal Ariffin"]; ids["employees"] = E

# customers with visits (paid in cash)
people = [("Nurul Aisyah", "nurul-test@gmail.com", "+60173345120", [("Haircut", "Faiz Hakimi"), ("Hair Wash", "Daniel Lim")]),
          ("Tan Wei Ming", "weiming-test@gmail.com", "+60126678231", [("Haircut + Beard", "Daniel Lim")]),
          ("Muthu Raj", "muthu-test@gmail.com", "+60192231784", [("Haircut", "Arun Kumar"), ("Haircut", "Arun Kumar")]),
          ("Hafizuddin Razak", "hafizuddin-test@gmail.com", "+60135567342", [("Haircut + Beard", "Kamal Ariffin")]),
          ("Siti Khadijah", "siti-test@gmail.com", "+60118894521", [("Kids Cut", "Faiz Hakimi")])]
ids.setdefault("clients", {})
for name, email, phone, visits in people:
    if name in ids["clients"]: continue
    c = api("POST", "/api/v1/clients/staff-provisioned", {"fullName": name, "email": email, "phone": phone}, token=t)
    cid = c.get("id") or c.get("clientId"); ids["clients"][name] = cid
    for prod, emp in visits:
        tk = api("POST", f"/api/v1/outlets/{O}/queue/join", {"type": "WalkIn", "clientId": cid, "lines": [{"productId": P[prod], "employeeId": E[emp]}]}, token=t)
        serve_and_pay(t, O, tk)

# second outlet
outs = {o["code"]: o["id"] for o in api("GET", f"/api/v1/brands/{B}/outlets", token=t)}
if "Setia Alam" not in outs:
    hours = json.dumps({d: {"open": "10:00", "close": "22:00"} for d in ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]})
    outs["Setia Alam"] = api("POST", f"/api/v1/brands/{B}/outlets", {"code": "Setia Alam", "address": "No. 21, Jalan Setia Prima S U13/S, Setia Alam, 40170 Shah Alam, Selangor",
                              "phoneNumber": "+60355123456", "businessHoursJson": hours}, token=t)["id"]
ids["outlet2"] = outs["Setia Alam"]
json.dump(ids, open("ids.json", "w"), indent=1)
print("retail", list(retail), "| rental", E["Kamal Ariffin"][:8], "| clients", len(ids["clients"]), "| outlet2", ids["outlet2"][:8])
