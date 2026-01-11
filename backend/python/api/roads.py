import requests

SNAP_TO_ROADS_URL = "https://roads.googleapis.com/v1/snapToRoads"
SPEED_LIMITS_URL = "https://roads.googleapis.com/v1/speedLimits"

def get_speed_limits(points, api_key):
    # Snap points to roads to get placeIds - Roads API has a limit of 100 points per request
    MAX_POINTS = 100
    points_subset = points[:MAX_POINTS] if len(points) > MAX_POINTS else points
    path_param = "|".join(f"{lat},{lng}" for lat, lng in points_subset)
    
    snap_params = {
        "path": path_param,
        "interpolate": "true",  # Get points along the road
        "key": api_key
    }
    
    snap_res = requests.get(SNAP_TO_ROADS_URL, params=snap_params)
    snap_res.raise_for_status()
    snap_data = snap_res.json()
    snapped_points = snap_data.get("snappedPoints", [])
    
    if not snapped_points:
        return []
    
    # Get placeIds from snapped points
    place_ids = [point["placeId"] for point in snapped_points if "placeId" in point]
    
    if not place_ids:
        return []
    
    # Get speed limits for these placeIds - batch if needed
    speed_params = {
        "placeId": place_ids,  # Can pass multiple placeIds
        "key": api_key
    }
    
    speed_res = requests.get(SPEED_LIMITS_URL, params=speed_params)
    speed_res.raise_for_status()
    speed_data = speed_res.json()
    
    # Extract speed limits
    speed_limits = speed_data.get("speedLimits", [])
    
    # Return list of speed values (in units specified by API, usually km/h or mph)
    return [limit.get("speedLimit") for limit in speed_limits if "speedLimit" in limit]


def get_average_speed_limit(points, api_key):
    #get average speed limit for a route.
    limits = get_speed_limits(points, api_key)
    
    if not limits:
        return None
    
    # Filter out None values and calculate average
    valid_limits = [l for l in limits if l is not None]
    
    if not valid_limits:
        return None
    
    return sum(valid_limits) / len(valid_limits)