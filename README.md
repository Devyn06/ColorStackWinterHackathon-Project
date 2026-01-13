 colorstackwinterhack2025-SafeRide
Project Description: 
## Inspiration
Riding a motorcycle requires 100% of a rider's focus. Standard navigation apps often lead riders through high-traffic areas, dangerous intersections, or poor weather conditions without warning. We wanted to create a safety first navigator that doesn't just find the fastest route, but the safest one.
 ## What it does
Instead of just giving a "safe" route, SafeRide uses Gemini to provide a "Safety Rationale." It explains why it chose a specific path, empowering the rider to make the final informed decision rather than blindly following an algorithm.
## How we built it
The project is built on a modern Ionic/Angular mobile framework with a FastAPI backend. For the front end we used Ionic's Capacitor Google Maps for the mapping interface and used Angular signals to manage complex UI transitions. Our backend is a python-based server that retrieves data from three different API's, Google Maps API: core polyline and routing data, Openweather: real time conditions, Google Gemini: Performs a safety audit of the route, weighting factors like curve and traffic density. With this data we created our own polylines factoring in the data and provided a prompt for the user which responsibly shows the usage of AI.
For our realtime database and authentication we used Firebase. Firebase allowed us to create listeners that would update the database everytime a user would move which made it real time and allowed riders in a group to see each other's markers live on the map. 

## Challenges we ran into
Our biggest hurdle was creating that live effect with self trimming and rerouting. To avoid high API costs and rerouting each time the user gained distance, we performed the geometric calculations locally on the device for the live trimming. We used the haversine formula to determine the distance between the rider and the path. Another big challenge was the mobile UI constraints.
## Accomplishments that we're proud of
Our main accomplishments that we are proud of is the real time group synchronization. We successfully implemented a real time firebase listener that syncs rider locations every 10 seconds to not hit any API limits. This really brings adds joy and safety to the app because when you are out riding you will have your groups location in real time and will know if someone got lost or suddenly stopped. 
## What we learned
What we learned when building this app was mastering the google maps SDK through capacitor. We learned how to handle asynchronous polyline rendering, where the app must decode complex string geometries into coordinate arrays in real time. We also gained experience in map lifecycle management, we had to make sure that markers and polylines were properly destroyed in the DOM to prevent memory leaks. A pattern we learned and used was the singleton pattern, without it the location of the device would not be tracked throughout the entire application and we also used that for the authentication to keep a user logged. On the frontend we dived into Angular signals. We learned how to build a reactive UI that automatically updates whenever the rider's state changes from search to tracking or rerouting.
## What's next for Motorcycle Safety App "SafeRide"
Currently our app handles the primary route and reroutes automatically. Our next step is to implement a reactive direction engine that sync with the users location to improve the user experience. This will sync live turn by turn instructions with the user's GPS coordinates. Unlike standard GPS, these directions will be safety aware and suggest potential warnings to lookout for. We plan to evolve our routing algorithm from a static weighted system to a dynamic safety model. If we collect anonymized near miss data and road surface quality reports from the riding community we would be able to train a local model to identify high-risk zones.

DEMO VIDEO LINK: https://youtu.be/bplrNkmVgw0

##  Technologies used:
Java 21, Python, Angular 20/Ionic 8, Capacitor 8, Typescript, express


# Setup & installation instructions
You must have these versions installed to avoid build failures:

Java: JDK 21 (Verify with java -version)

Node: Version 22 (Verify with node -version)

Android Studio: Latest version (for SDK management)


2. Launch App on mobile

**Insert keys**
create .env in /backened with required API keys

**1.directory**
cd backend/python

**2.creates virtual environment**
 python -m venv venv 
 
**3.active virtual environment**
    Windows: venv\Scripts\activate
    Mac/Linux: source venv/bin/activate

**4.download requirements.txt**
pip install -r requirements.txt

**5.run express server**
 uvicorn app:app --reload (Runs server)

 6 cd frontend
 7 create .env inside frontend folder
 8 copy .env.example variables -> .env and fill in appropiate keys **MUST BE .ENV FILE FOR SCRIPT TO WORK**
 9 npm install 
 10 npm run android **opens android sdk** 
 2.6 **add MAPS_API_KEY to android/local.properties**
 2.7 run app **Pixel 8 android 14 API 34 new versions might not work**


5. Firebase Setup
5.1 **Add google-services.json**: Download this file in Firebase Console in project settings, copy file to app folder in Android Studio, then go back to Github
 fill in .env with firebase keys example in .env.example

 ## Team members & contributions
 #Isiah
 Backend routing algorithm
 #Devyn
 Frontend + User authentication + real time UI sync updates
 #Leo
 Group location sharing + firebase integration + pitch/demo slides/format
 #Erick 
 Interactive UI design (signals) + FE and BE connection, live rerouting, live trim polyline, Location services.

 # Demo video link
 https://youtu.be/bplrNkmVgw0
