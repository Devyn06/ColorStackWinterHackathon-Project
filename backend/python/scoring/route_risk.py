# scoring/route_risk.py

"""
Scores route based on factors including 
curvature, traffic congestion, speed limits, weather
"""
def calculate_score(features, weights):
    score = 100.0  # Start with perfect score
    reasons = []
    
    # Speed factor (lower speeds are safer)
    avg_speed = features.get("avg_speed_limit", 45)
    if avg_speed > 65: # High speed
        penalty = min((avg_speed - 65) * 1.0, 20) * weights.get("speed_weight", 1.0)
        score -= penalty
        reasons.append(f"High average speed limit ({avg_speed:.0f} mph)")
    elif avg_speed > 55: # Moderate speeds
        penalty = min((avg_speed - 55) * 0.5, 10) * weights.get("speed_weight", 1.0)
        score -= penalty
        reasons.append(f"Moderate-high speed ({avg_speed:.0f} mph)")
    elif avg_speed < 30: # Low speeds
        bonus = min((30 - avg_speed) * 0.5, 5) * weights.get("speed_weight", 1.0)
        score += bonus
        reasons.append(f"Low speed roads ({avg_speed:.0f} mph) - safer for groups")
    
    # Curvature factor (more curves = less safe)
    avg_curv = features.get("avg_curvature", 0)
    max_curv = features.get("max_curvature", 0)
    if max_curv > 0.2:
        penalty = min(avg_curv * 30, 20) * weights.get("curv_weight", 1.0)
        score -= penalty
        reasons.append(f"Sharp turns detected (max {max_curv:.2f})")
    elif avg_curv > 0.3:
        penalty = min(avg_curv * 15, 10) * weights.get("curv_weight", 1.0)
        score -= penalty
        reasons.append(f"Moderate curvature (avg {avg_curv:.2f})")
    elif avg_curv < 0.1:
        reasons.append(f"Mostly straight roads (avg {avg_curv:.2f}) - safer")
    
    # Traffic factor
    traffic = features.get("traffic_ratio", 0)
    if traffic > 0.7:
        penalty = traffic * 25 * weights.get("traffic_weight", 1.0)
        score -= penalty
        reasons.append(f"Very heavy traffic (ratio {traffic:.2f})")
    elif traffic > 0.5:
        penalty = traffic * 15 * weights.get("traffic_weight", 1.0)
        score -= penalty
        reasons.append(f"Heavy traffic (ratio {traffic:.2f})")
    elif traffic > 0.3:
        penalty = traffic * 8 * weights.get("traffic_weight", 1.0)
        score -= penalty
        reasons.append(f"Moderate traffic (ratio {traffic:.2f})")
    elif traffic < 0.2:
        reasons.append(f"Light traffic (ratio {traffic:.2f}) - safer")
    
    # Weather factor
    if features.get("adverse_weather", False):
        weather_weight = weights.get("weather_weight", 1.0)
        weather = features.get("weather", {})
        penalty = 0

        rain = weather.get("rain", 0)
        if rain > 2.0: # Consider rain
            penalty += 20 * weather_weight
            reasons.append(f"Heavy rain ({rain:.1f}mm/hr)")
        elif rain > 0.5:
            penalty += 10 * weather_weight
            reasons.append(f"Light rain ({rain:.1f}mm/hr)")

        visibility = weather.get("visibility", 10000)
        if visibility < 3000: # Consider visibility
            penalty += 15 * weather_weight
            reasons.append(f"Poor visibility ({visibility}m)")
        elif visibility < 7000:
            penalty += 5 * weather_weight
            reasons.append(f"Reduced visibility ({visibility}m)")

        wind = weather.get("wind", 0)
        if wind > 20: # Consider wind
            penalty += 15 * weather_weight
            reasons.append(f"High winds ({wind:.0f} mph)")
        elif wind > 10:
            penalty += 5 * weather_weight
            reasons.append(f"Moderate winds ({wind:.0f} mph)")

        score -= penalty
    
    # Put score in 0-100 range
    score = max(0, min(100, score))
    
    if not reasons:
        reasons.append("Good conditions overall")
    
    return score, reasons