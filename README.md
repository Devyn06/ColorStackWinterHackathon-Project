Responsible AI for Motorcycle Group Safety
Tech Stack: Kotlin 1.9, Java 21, Spring Boot 3.4.1, Angular 20/Ionic 8, Capacitor 8

🚀 Quick Start
To get the project running locally, follow these steps in order.

1. Prerequisites
You must have these versions installed to avoid build failures:

Java: JDK 21 (Verify with java -version)

Node: Version 22 (Verify with node -version)

Android Studio: Latest version (for SDK management)

2. Backend Setup (Spring Boot)
cd backend
./gradlew clean build
Note: The contextLoads test is currently @Disabled. Once you configure your local MySQL database in application.properties, you can re-enable it.

Kotlin Developers: If using VS Code, install the Kotlin extension by Mathias Fröhlich to fix syntax highlighting.

3. Frontend & Mobile Setup (Ionic/Capacitor)

cd frontend
npm install
ionic build
npx cap sync android

4. Android Build
Open the /android folder directly in Android Studio.

Let the Gradle sync finish (it will automatically generate your local.properties).

Run the app on an emulator or physical device.

Gradle Version: This project uses 8.11.1. If prompted to upgrade by Android Studio, click "Don't remind me."

Known Issues & Troubleshooting

1. SDK Not Found: If Android fails to build, ensure your ANDROID_HOME environment variable is set or check the local.properties file in the /android folder.