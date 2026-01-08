from haversine import haversine

# Samples points from a list of (lat, lng) tuples along route so that consecutive points are at least meters_between apart
def sample_points(points, meters_between=50):
    sampled = [points[0]]
    last = points[0]

    for p in points[1:]:
        if haversine(last, p) >= meters_between:
            sampled.append(p)
            last = p

    return sampled
