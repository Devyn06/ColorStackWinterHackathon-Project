from google import genai
from config import GEMINI_API_KEY

# instruction prompt for LLM
prompt = """
You are a helpful guide that helps provide explanations for why some routes are safer than others based on 
various factors such as road curvature, traffic, weather, and road speed limits. All of the calculations are already done.
Do not make up any new data, just explain based on the provided data. Users of the app will want help to understand which
route is safer than another, so you should focus on explaining the tradeoffs between different routes based on the data and scores.

The provided data includes the following for each route:
    -"route_id": unique identifier for the route
    -"score": safety score (higher is safer)
    -"reasons": list of reasons affecting the score
    -"duration_minutes": estimated travel time in minutes
    -"distance_miles": distance of the route in miles
    -"description": brief text description of the route
    -"speed_data": information about average, min, max speeds on the route
    -"avg_curvature": average curvature of the route (higher means more curves)
    -"weather": weather conditions along the route
    -"polyline": encoded polyline of the route for mapping

Additionally, you will be given the weights the user provided for different safety factors:
    - Speed Limit Weight
    - Curvature Weight
    - Traffic Weight
    - Weather Weight    

Your task is to explain why one route is safer than the rest of the data. Write ONLY Two sentences, informative, focusing
on the key factors influencing safety such as speed limits, curvature, traffic conditions, and weather based on the provided data analysis. 
Use user-friendly language, be nice, and communicate like a human. Avoid too much technical jargon and keep explanations concise.
"""

client = genai.Client(api_key=GEMINI_API_KEY)

# Uses Gemini LLM to explain route safety comparisons
def explain_routes(routes_data, weights):
    """
    Generate explanations for route safety comparisons using Gemini LLM.
    
    Args:
        routes_data (list): List of route data dictionaries with analysis results.
        weights (dict): Weights for different safety factors provided by the user.
    Returns:
        str: Generated explanation text.
    """

    # format routes data
    formated_routes = ""
    for route in routes_data:
        formated_routes += f"""
        Route ID: {route['route_id']}
        Safety Score: {route['score']}
        Reasons: {', '.join(route['reasons'])}
        Duration (minutes): {route['duration_minutes']:.2f}
        Distance (miles): {route['distance_miles']:.2f}
        Description: {route['description']}
        Speed Data: Average: {route['speed_data']['average_mph']:.2f} mph, Min: {route['speed_data']['min_mph']:.2f} mph, Max: {route['speed_data']['max_mph']:.2f} mph
        Average Curvature: {route['avg_curvature']:.4f}
        Weather: {route['weather']}
        """
    
    # format weights
    formated_weights = f"""
    Weights Provided:
    - Speed Limit Weight: {weights.get('speed_limit_weight', 0)}
    - Curvature Weight: {weights.get('curvature_weight', 0)}
    - Traffic Weight: {weights.get('traffic_weight', 0)}
    - Weather Weight: {weights.get('weather_weight', 0)}
    """

    # combine prompts for model to use
    combined_prompt = f"{prompt}\n\nRoutes Data:\n{formated_routes}\n\nUser Specified Weights:\n{formated_weights}"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=combined_prompt
    )

    text = extract_text(response)
    print(f"Gemini response: {text}")
    return text

# Helper function to extract text from Gemini response
def extract_text(response):
    try:
        return response.candidates[0].content.parts[0].text
    except (IndexError, AttributeError):
        return ""
