# processing/average_route.py

def compute_features(sampled_points, speed_data, curvatures):
    """
    Compute averaged features for a route.
    
    Args:
        sampled_points: List of (lat, lng) tuples
        speed_data: Dictionary with speed statistics from extract_speed_info
        curvatures: List of curvature values
    
    Returns:
        Dictionary of computed features
    """
    features = {}
    
    # Speed features
    if speed_data["has_speed_data"]:
        features["avg_speed_limit"] = speed_data["average_mph"]
        features["min_speed_limit"] = speed_data["min_mph"]
        features["max_speed_limit"] = speed_data["max_mph"]
    else:
        # Default values if no speed data available
        features["avg_speed_limit"] = 45.0  # Assume moderate speed
        features["min_speed_limit"] = 25.0
        features["max_speed_limit"] = 65.0
    
    # Curvature features
    if curvatures:
        features["avg_curvature"] = sum(curvatures) / len(curvatures)
        features["max_curvature"] = max(curvatures)
    else:
        features["avg_curvature"] = 0.0
        features["max_curvature"] = 0.0
    
    return features