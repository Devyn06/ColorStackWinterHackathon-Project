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
 2.1 cd frontend
 2.2 create .env inside frontend folder
 2.3 copy .env.example variables -> .env and fill in appropiate keys **MUST BE .ENV FILE FOR SCRIPT TO WORK**
 2.4 npm install 
 2.5 npm run android **opens android sdk** 
 2.6 **add MAPS_API_KEY to android/local.properties**
 2.7 run app



2. Backend Setup (Spring Boot)
cd backend
./gradlew clean build
Note: DELETE spring.autoconfigure.exclude line in applications.properties when database is added



3. Frontend Setup & Installation
This project uses a secure script to inject API keys. 
3.1 **Create Secrets**: Create a `.env` file in the `frontend/` directory.
3.2 **Add Keys**:

    MAPS_API_KEY=your_google_maps_key_here

3.3 **Install**: `npm install`
3.4 **Web Preview**: `npm start` (Runs the injector script + ng serve + creates environment files)
3.5 **Mobile Build**: `npm run android` (Syncs native variables + opens Android Studio)

4. Android Build
Open the /android folder directly in Android Studio.

Let the Gradle sync finish (it will automatically generate your local.properties).

Run the app on an emulator or physical device.

Gradle Version: This project uses 8.11.1. If prompted to upgrade by Android Studio, click "Don't remind me."

Known Issues & Troubleshooting

1. SDK Not Found: If Android fails to build, ensure your ANDROID_HOME environment variable is set or check the local.properties file in the /android folder.