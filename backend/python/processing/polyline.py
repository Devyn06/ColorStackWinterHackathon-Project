import polyline

def decode_polyline(encoded_polyline):
    """
    Decode an encoded polyline string into a list of (lat, lng) tuples.
    
    Args:
        encoded_polyline: Either a polyline string directly, or a route dict
    
    Returns:
        List of (lat, lng) tuples
    """
    # If it's a string, decode directly
    if isinstance(encoded_polyline, str):
        return polyline.decode(encoded_polyline)
    
    # If it's a dict, extract the polyline
    if isinstance(encoded_polyline, dict):
        # Routes API format
        if "polyline" in encoded_polyline:
            return polyline.decode(encoded_polyline["polyline"])
        # Old Directions API format
        if "overview_polyline" in encoded_polyline:
            return polyline.decode(encoded_polyline["overview_polyline"]["points"])
    
    raise ValueError(f"Cannot decode polyline from type: {type(encoded_polyline)}")