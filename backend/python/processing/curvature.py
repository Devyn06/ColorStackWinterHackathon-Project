import math

# Returns normalized curvature proxy in [0, 1] based on turn sharpness.
def curvature(p1, p2, p3):
    
    # Convert lat/lng to approximate meters
    def to_xy(p):
        lat, lng = math.radians(p[0]), math.radians(p[1])
        x = lng * math.cos(lat)
        y = lat
        return (x, y)

    x1, y1 = to_xy(p1)
    x2, y2 = to_xy(p2)
    x3, y3 = to_xy(p3)

    v1 = (x1 - x2, y1 - y2)
    v2 = (x3 - x2, y3 - y2)

    # Cross product magnitude (2D)
    cross = abs(v1[0]*v2[1] - v1[1]*v2[0])

    # Normalize by segment length
    mag = math.hypot(*v1) + math.hypot(*v2)

    if mag == 0:
        return 0.0

    return min(cross / mag, 1.0)

