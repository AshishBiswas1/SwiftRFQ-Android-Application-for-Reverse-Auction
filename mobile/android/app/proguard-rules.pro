# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Truecaller OAuth SDK
-keep class com.truecaller.android.sdk.** { *; }
-dontwarn com.truecaller.android.sdk.**

# Socket.io & OkHttp
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }
-dontwarn io.socket.**
-dontwarn okhttp3.**
