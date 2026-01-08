from fastapi import HTTPException
from pydantic import BaseModel
from typing import Tuple, Dict, Optional
from api.routes_api import get_multiple_route_options
from api.weather import get_weather
from models.route_context import RouteContext, RoutePointContext
from processing import average_route
from processing.curvature import curvature
from processing.polyline import decode_polyline
from processing.sampleRoute import sample_points
from scoring import route_risk
from llm_explanation import explain_routes
from config import GOOGLE_MAPS_API_KEY
from config import OPENWEATHER_API_KEY


class RouteRequest(BaseModel):
    origin: Tuple[float, float]
    destination: Tuple[float, float]
    preferences: Optional[Dict[str, float]] = None


# Main pipeline: Get routes using Routes API, extract data, score them.
def analyze_routes(req: RouteRequest):
    origin = tuple(req.origin)
    destination = tuple(req.destination)
    
    # Default weights if not provided

    if req.preferences and any(req.preferences.values()):
        # User provided preferences
        weights = {
            "curv_weight": req.preferences.get("curv_weight", 1.0),
            "speed_weight": req.preferences.get("speed_weight", 1.0),
            "traffic_weight": req.preferences.get("traffic_weight", 1.5),
            "weather_weight": req.preferences.get("weather_weight", 1.2)
        }
    else:
        # Default weights
        weights = {
            "curv_weight": 1.0,
            "speed_weight": 1.0,
            "traffic_weight": 1.5,
            "weather_weight": 1.2
        }
    
    print(f"Fetching routes from {origin} to {destination}")
    # Get multiple route options using Routes API (includes waypoint variations)
    routes = get_multiple_route_options(origin, destination, GOOGLE_MAPS_API_KEY)
    print(f"Found {len(routes)} routes from {origin} to {destination}")

    if not routes:
        raise HTTPException(
            status_code=400, 
            detail="No routes found for provided origin/destination – check your API key and coordinate formatting."
        )

    results = []

    # Go through each route and extract features
    for idx, route in enumerate(routes):
        # Decode polyline from Routes API response
        points = decode_polyline(route["polyline"])
        
        # Sample points along the route
        sampled = sample_points(points, meters_between=5000)  # Sample every 5km, could change...
        
        # Extract speed data from Routes API response
        speed_data = extract_speed_info(route["speed_intervals"], route)
        
        # Calculate curvatures at sampled points
        curvatures = [
            curvature(sampled[i-1], sampled[i], sampled[i+1])
            for i in range(1, len(sampled)-1)
        ]
        
        # Calculate traffic ratio from Routes API travel advisory
        traffic = extract_traffic_ratio(route)
        
        # Compute average features for the route
        features = average_route.compute_features(
            sampled, 
            speed_data, 
            curvatures
        )
        features["traffic_ratio"] = traffic
        
        # Check weather at midpoint, assume representative of route
        mid_idx = len(sampled) // 2
        mid_point = sampled[mid_idx]
        print(f"Getting weather for point: {mid_point}")
        weather = get_weather(mid_point[0], mid_point[1], OPENWEATHER_API_KEY)
        print(f"Weather response: {weather}")
        
        # Determine adverse weather conditions
        adverse_weather = (
            weather.get("rain", 0) > 0.5 or 
            weather.get("visibility", 10000) < 5000 or 
            weather.get("wind", 0) > 10
        )
        features["adverse_weather"] = adverse_weather
        features["weather"] = weather
        
        # Calculate safety score
        score, reasons = route_risk.calculate_score(features, weights)
        
        results.append({
            "route_id": idx,
            "score": score,
            "reasons": reasons,
            "duration_minutes": route["duration_seconds"] / 60,
            "distance_miles": route["distance_meters"] * 0.000621371,
            "description": route.get("description", ""),
            "speed_data": speed_data,
            "avg_curvature": sum(curvatures) / len(curvatures) if curvatures else 0,
            "weather": weather,
            "polyline": route["polyline"]
        })

    # Sort by safety score (higher is safer)
    results.sort(key=lambda x: x["score"], reverse=True)
    
    print(f"Analyzed {len(results)} routes")
    print(f"Weights used: {weights}")
    explain_routes(results, weights)
    return results


def extract_speed_info(speed_intervals, route):
    """
    Extract speed statistics. If API doesn't provide speed intervals,
    estimate from route duration and distance.
    """
    if not speed_intervals:
        # Estimate from route data
        duration_seconds = route.get("duration_seconds", 0)
        distance_meters = route.get("distance_meters", 0)
        
        if duration_seconds > 0 and distance_meters > 0:
            avg_speed_mps = distance_meters / duration_seconds
            avg_speed_mph = avg_speed_mps * 2.237
            
            return {
                "average_mph": avg_speed_mph,
                "min_mph": avg_speed_mph * 0.8,  # Estimate range
                "max_mph": avg_speed_mph * 1.2,
                "has_speed_data": False,
                "estimated": True
            }
        
        return {
            "average_mph": None,
            "min_mph": None,
            "max_mph": None,
            "has_speed_data": False,
            "estimated": False
        }
    
    # Has actual speed data from API
    speeds_mph = []
    for interval in speed_intervals:
        if "speed" in interval:
            speed_mps = interval["speed"]
            speed_mph = speed_mps * 2.237
            speeds_mph.append(speed_mph)
    
    if not speeds_mph:
        return {
            "average_mph": None,
            "min_mph": None,
            "max_mph": None,
            "has_speed_data": False,
            "estimated": False
        }
    
    return {
        "average_mph": sum(speeds_mph) / len(speeds_mph),
        "min_mph": min(speeds_mph),
        "max_mph": max(speeds_mph),
        "speed_count": len(speeds_mph),
        "has_speed_data": True,
        "estimated": False
    }


# Extract actual traffic data from Routes API travel advisory.
def extract_traffic_ratio(route):
    travel_advisory = route.get("travel_advisory", {})
    
    # Routes API can provide traffic info in the travel advisory
    # Check if we have actual traffic delay data
    if "duration" in route and "staticDuration" in route:
        # Compare actual duration with static (no-traffic) duration
        actual_duration = int(route["duration"].replace("s", ""))
        static_duration = int(route["staticDuration"].replace("s", ""))
        
        if static_duration > 0:
            # Calculate delay ratio
            delay_ratio = (actual_duration - static_duration) / static_duration
            
            # Convert to 0-1 scale
            if delay_ratio <= 0.05:
                return 0.1  # Light traffic (< 5% delay)
            elif delay_ratio <= 0.15:
                return 0.3  # Moderate traffic (5-15% delay)
            elif delay_ratio <= 0.30:
                return 0.6  # Heavy traffic (15-30% delay)
            else:
                return 0.9  # Very heavy traffic (> 30% delay)
    
    # Fallback: estimate from average speed if no traffic data
    duration_seconds = route["duration_seconds"]
    distance_meters = route["distance_meters"]
    
    if distance_meters == 0:
        return 0.5  # Default moderate traffic
    
    avg_speed_mps = distance_meters / duration_seconds
    avg_speed_mph = avg_speed_mps * 2.237
    
    # Estimate traffic ratio based on speed
    if avg_speed_mph >= 55:
        return 0.1  # Light traffic
    elif avg_speed_mph >= 40:
        return 0.3  # Moderate traffic
    elif avg_speed_mph >= 25:
        return 0.6  # Heavy traffic
    else:
        return 0.9  # Very heavy traffic