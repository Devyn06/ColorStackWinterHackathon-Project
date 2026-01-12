Responsible AI for Motorcycle Group Safety
Tech Stack: Kotlin 1.9, Java 21, Spring Boot 3.4.1, Angular 20/Ionic 8, Capacitor 8

🚀 Quick Start
To get the project running locally, follow these steps in order.

1. Prerequisites
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
 2.7 run app


5. Firebase Setup
5.1 **Add google-services.json**: Download this file in Firebase Console in project settings, copy file to app folder in Android Studio, then go back to Github
5.2 **Edit set-env.js file**: Add a new key called firebase to the content string. Get its value from "firebaseConfig" in project settings under the Web App
5.3 **Make environment.ci.ts, environment.developments.ts**: Fill with dictionary below including the info from "firebaseConfig"

    export const environment = {
        production: false,
        firebase: {
            
        }
    };
    
5.4 **Edit environment.prod.ts, environment.ts**: Add firebase key and all associated info
