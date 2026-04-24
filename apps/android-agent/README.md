# NFN Android Agent App

Native Android app for the field agent workflow.

## Stack

- Kotlin
- Jetpack Compose
- Room
- WorkManager
- Retrofit / OkHttp
- Hilt

## Current scope

- Login
- Tour bootstrap shell
- New tonte lot draft
- Exception reporting
- Field source creation
- Sync queue review

## Build note

This repo includes the Android module and Gradle configuration, but the Gradle wrapper jar is not generated inside this workspace yet. Open the project in Android Studio or run `gradle wrapper` once Gradle is available locally to generate the wrapper files fully.

