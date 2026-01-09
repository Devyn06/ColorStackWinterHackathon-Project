# api/routes_api.py
import requests
import json

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
DIRECTIONS_API_URL = "https://maps.googleapis.com/maps/api/directions/json"

# Get multiple route options using Routes API v2 with waypoint variations from point A to point B
def get_multiple_route_options(origin, destination, api_key):
    """
    Get multiple route variations. Try Routes API first, fall back to Directions API.
    """
    from .waypoint_generator import generate_strategic_waypoints
    
    # Parse coordinates
    origin_coords = _parse_coords(origin)
    dest_coords = _parse_coords(destination)
    
    # Generate waypoint variations
    waypoints = generate_strategic_waypoints(origin_coords, dest_coords, num_waypoints=2)
    
    all_routes = []
    use_directions_api = False
    
    # Try Routes API first for direct route
    try:
        print("Attempting Routes API...")
        direct = get_routes_v2(origin, destination, api_key)
        if direct:
            print(f"Routes API succeeded - got {len(direct)} direct routes")
            all_routes.extend(direct)
            
            # Try waypoints with Routes API
            for wp in waypoints:
                wp_routes = get_routes_v2(origin, destination, api_key, waypoints=[wp])
                all_routes.extend(wp_routes)
        else:
            use_directions_api = True
    except requests.exceptions.HTTPError as e:
        print(f"Routes API HTTP error: {e}")
        if e.response is not None:
            print(f"Response body: {e.response.text}")
        use_directions_api = True
    except Exception as e:
        print(f"Routes API failed: {e}")
        use_directions_api = True
    
    # If Routes API failed or returned nothing, use Directions API as backup option
    if use_directions_api or not all_routes:
        print("Using Directions API...")
        
        # Direct routes
        direct = get_routes_directions(origin, destination, api_key)
        print(f"Got {len(direct)} direct routes from Directions API")
        all_routes.extend(direct)
        
        # Waypoint routes
        for idx, wp in enumerate(waypoints):
            print(f"Getting waypoint route {idx+1}...")
            wp_routes = get_routes_directions(origin, destination, api_key, waypoint=wp)
            print(f"Got {len(wp_routes)} routes via waypoint {idx+1}")
            all_routes.extend(wp_routes)
    
    # Deduplicate by polyline, remove repeats
    seen = set()
    unique = []
    for route in all_routes:
        poly = route["polyline"]
        if poly and poly not in seen:
            seen.add(poly)
            unique.append(route)
    
    print(f"Returning {len(unique)} unique routes")
    return unique


def get_routes_v2(origin, destination, api_key, waypoints=None):
    """Get routes using Routes API v2"""
    origin_coords = _parse_coords(origin)
    dest_coords = _parse_coords(destination)
    
    request_body = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin_coords[0],
                    "longitude": origin_coords[1]
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": dest_coords[0],
                    "longitude": dest_coords[1]
                }
            }
        },
        "travelMode": "DRIVE", # could try two-wheel option, but more expensive credits-wise
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": True,
        "languageCode": "en-US",
        "units": "IMPERIAL"
    }
    
    if waypoints:
        request_body["intermediates"] = []
        for wp in waypoints:
            wp_coords = _parse_coords(wp)
            request_body["intermediates"].append({
                "location": {
                    "latLng": {
                        "latitude": wp_coords[0],
                        "longitude": wp_coords[1]
                    }
                }
            })
    
    headers = { # can adjust these if want more data from API
        "Content-Type": "application/json", 
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "routes.duration,"
            "routes.staticDuration,"
            "routes.distanceMeters,"
            "routes.polyline.encodedPolyline,"
            "routes.legs.travelAdvisory.speedReadingIntervals,"
            "routes.travelAdvisory,"
            "routes.description"
        )
    }
    
    print(f"Routes API request body: {json.dumps(request_body, indent=2)}")
    
    res = requests.post(ROUTES_API_URL, headers=headers, data=json.dumps(request_body))
    res.raise_for_status()
    data = res.json()
    
    routes = data.get("routes", [])
    processed_routes = []
    
    for route in routes:
        all_speed_intervals = []
        for leg in route.get("legs", []):
            advisory = leg.get("travelAdvisory", {})
            if "speedReadingIntervals" in advisory:
                all_speed_intervals.extend(advisory["speedReadingIntervals"])
        
        processed_routes.append({
            "polyline": route.get("polyline", {}).get("encodedPolyline", ""),
            "duration_seconds": int(route.get("duration", "0s").replace("s", "")),
            "static_duration_seconds": int(route.get("staticDuration", "0s").replace("s", "")),
            "distance_meters": route.get("distanceMeters", 0),
            "description": route.get("description", ""),
            "speed_intervals": all_speed_intervals,
            "travel_advisory": route.get("travelAdvisory", {}),
        })
    
    return processed_routes


def get_routes_directions(origin, destination, api_key, waypoint=None):
    """Get routes using Directions API (fallback)"""
    origin_str = _format_coord_string(origin)
    dest_str = _format_coord_string(destination)
    
    params = {
        "origin": origin_str,
        "destination": dest_str,
        "alternatives": "true",
        "departure_time": "now",
        "key": api_key
    }
    
    if waypoint:
        params["waypoints"] = f"via:{waypoint[0]},{waypoint[1]}"
    
    print(f"Directions API request: {DIRECTIONS_API_URL}?origin={origin_str}&destination={dest_str}")
    
    try:
        res = requests.get(DIRECTIONS_API_URL, params=params)
        res.raise_for_status()
        data = res.json()
        
        status = data.get("status")
        print(f"Directions API status: {status}")
        
        if status != "OK":
            if "error_message" in data:
                print(f"Directions API error message: {data['error_message']}")
            return []
        
        routes = []
        for route in data.get("routes", []):
            # Get duration with and without traffic
            duration_in_traffic = 0
            duration = 0
            distance = 0
            
            for leg in route.get("legs", []):
                if "duration_in_traffic" in leg:
                    duration_in_traffic += leg["duration_in_traffic"]["value"]
                if "duration" in leg:
                    duration += leg["duration"]["value"]
                if "distance" in leg:
                    distance += leg["distance"]["value"]
            
            routes.append({
                "polyline": route["overview_polyline"]["points"],
                "duration_seconds": duration_in_traffic or duration,
                "static_duration_seconds": duration,
                "distance_meters": distance,
                "description": route.get("summary", ""),
                "speed_intervals": [],  # Not available in Directions API
                "travel_advisory": {},
            })
        
        return routes
        
    except Exception as e:
        print(f"Directions API error: {e}")
        import traceback
        traceback.print_exc()
        return []


def _format_coord_string(coord):
    """Format coordinate as string for Directions API"""
    if isinstance(coord, (tuple, list)):
        return f"{coord[0]},{coord[1]}"
    return str(coord)


def _parse_coords(coord):
    """Helper to parse coordinates into tuple"""
    if isinstance(coord, (tuple, list)):
        return coord
    parts = str(coord).split(",")
    return (float(parts[0]), float(parts[1]))