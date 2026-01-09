# used for traffic ratio extraction

def traffic_ratio(route):
    leg = route["legs"][0]

    normal = leg["duration"]["value"]
    traffic = leg.get("duration_in_traffic", {}).get("value", normal)

    return traffic / normal if normal > 0 else 1.0