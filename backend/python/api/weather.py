# api/weather.py
import requests

# extract weather data from OpenWeather One Call API
def get_weather(lat, lng, api_key):
    url = "https://api.openweathermap.org/data/3.0/onecall" # paid, up to 1000 calls/day for free

    params = {
        "lat": lat,
        "lon": lng,
        "appid": api_key,
        "units": "imperial"
    }

    res = requests.get(url, params=params)
    res.raise_for_status()
    data = res.json()

    current = data.get("current", {})
    weather_arr = current.get("weather", [{}])
    weather0 = weather_arr[0] if weather_arr else {}

    return {
        "rain": current.get("rain", {}).get("1h", 0),
        "visibility": current.get("visibility", 10000),
        "wind": current.get("wind_speed", 0),
        "conditions": weather0.get("main", "Clear"),
        "description": weather0.get("description", ""),
        "temp": current.get("temp", 0),
        "uvi": current.get("uvi", 0)
    }
