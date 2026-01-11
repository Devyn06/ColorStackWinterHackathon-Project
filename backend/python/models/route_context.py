from pydantic import BaseModel
from typing import List

class RoutePointContext(BaseModel):
    lat: float
    lng: float

    speed_limit: int | None
    traffic_ratio: float | None
    curvature: float | None

class RouteContext(BaseModel):
    route_id: int
    safety_score: float | None
    points: List[RoutePointContext]
    explanation: List[str]
