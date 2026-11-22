"""Morning scene for the re-shoot: two paid walk-ins, Faiz and Daniel mid-cut, Arun free."""
from api import *
import json, os
ids = json.load(open(os.path.join(S, "ids.json"))); t = login("demo-test@gmail.com"); O = ids["outlet"]; P = ids["products"]; E = ids["employees"]
open_tix = [x for x in api("GET", f"/api/v1/outlets/{O}/queue-tickets", token=t) if x["status"] in ("Waiting", "InProgress")]
for x in open_tix:  # leftovers would show up on the board; a cancelled ticket keeps its line in the chair, so pay those off
    if x["status"] == "InProgress":
        serve_and_pay(t, O, x, start=False)
    else:
        api("POST", f"/api/v1/queue-tickets/{x['id']}/cancel", {"reason": "Reset before recording"}, token=t)
def walk_in(prod, emp):
    return api("POST", f"/api/v1/outlets/{O}/queue/join", {"type": "WalkIn", "walkInLabel": "Walk-in", "lines": [{"productId": P[prod], "employeeId": E[emp]}]}, token=t)
for prod, emp in [("Haircut", "Faiz Hakimi"), ("Kids Cut", "Daniel Lim")]:
    serve_and_pay(t, O, walk_in(prod, emp))
for prod, emp in [("Haircut", "Faiz Hakimi"), ("Haircut", "Daniel Lim")]:
    tk = walk_in(prod, emp)
    for l in tk["lines"]: api("POST", f"/api/v1/queue-lines/{l['id']}/start", {}, token=t)
print({x["displayNumber"]: x["status"] for x in api("GET", f"/api/v1/outlets/{O}/queue-tickets", token=t)})
