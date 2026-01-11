# api/waypoint_generator.py
import math

# used to generate alternative waypoints for routing, giving more route options
def generate_strategic_waypoints(origin, destination, num_waypoints=2):
    """
    Generate strategic waypoints perpendicular to the direct route.
    
    Args:
        origin: Tuple (lat, lng)
        destination: Tuple (lat, lng)
        num_waypoints: Number of waypoint variations to generate
    
    Returns:
        List of waypoint coordinates as tuples
    """
    mid_lat = (origin[0] + destination[0]) / 2
    mid_lng = (origin[1] + destination[1]) / 2
    
    distance = haversine_distance(origin, destination)
    offset_km = distance * 0.15  # 15% offset
    
    bearing = calculate_bearing(origin, destination)
    
    waypoints = []
    for i in range(num_waypoints):
        # Alternate perpendicular directions
        perp_bearing = bearing + (90 if i % 2 == 0 else -90)
        
        waypoint = calculate_destination_point(
            (mid_lat, mid_lng),
            offset_km,
            perp_bearing
        )
        waypoints.append(waypoint)
    
    return waypoints


# haversine useful for distance calculations
def haversine_distance(point1, point2):
    #Calculate distance in km between two lat/lng points
    R = 6371.0
    lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
    lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def calculate_bearing(point1, point2):
    #Calculate bearing in degrees from point1 to point2
    lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
    lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])
    
    dlon = lon2 - lon1
    
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360


def calculate_destination_point(start, distance_km, bearing_degrees):
    #Calculate destination point given distance and bearing
    R = 6371.0
    bearing = math.radians(bearing_degrees)
    lat1 = math.radians(start[0])
    lon1 = math.radians(start[1])
    
    lat2 = math.asin(
        math.sin(lat1) * math.cos(distance_km / R) +
        math.cos(lat1) * math.sin(distance_km / R) * math.cos(bearing)
    )
    
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(distance_km / R) * math.cos(lat1),
        math.cos(distance_km / R) - math.sin(lat1) * math.sin(lat2)
    )
    
    return (math.degrees(lat2), math.degrees(lon2))