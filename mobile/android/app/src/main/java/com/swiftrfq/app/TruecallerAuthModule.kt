package com.swiftrfq.app

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.truecaller.android.sdk.oAuth.*
import java.math.BigInteger
import java.security.SecureRandom

@ReactModule(name = TruecallerAuthModule.NAME)
class TruecallerAuthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val NAME = "TruecallerAuthModule"
    }

    private var pendingPromise: Promise? = null
    private var pendingCodeVerifier: String? = null
    private var pendingState: String? = null
    private var isInitialized = false

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    private fun initSdk(activity: Activity?) {
        if (activity == null || isInitialized) return
        try {
            val tcOAuthCallback = object : TcOAuthCallback {
                override fun onSuccess(tcOAuthData: TcOAuthData) {
                    val map = Arguments.createMap()
                    map.putString("code", tcOAuthData.authorizationCode)
                    map.putString("codeVerifier", pendingCodeVerifier ?: "")
                    map.putString("state", tcOAuthData.state ?: pendingState ?: "")
                    pendingPromise?.resolve(map)
                    pendingPromise = null
                    pendingCodeVerifier = null
                    pendingState = null
                }

                override fun onFailure(tcOAuthError: TcOAuthError) {
                    val errorMsg = tcOAuthError.errorMessage ?: "Truecaller verification failed"
                    pendingPromise?.reject(tcOAuthError.errorCode.toString(), errorMsg)
                    pendingPromise = null
                    pendingCodeVerifier = null
                    pendingState = null
                }

                override fun onVerificationRequired(tcOAuthError: TcOAuthError?) {
                    val errorMsg = tcOAuthError?.errorMessage ?: "Verification required on Truecaller"
                    pendingPromise?.reject("VERIFICATION_REQUIRED", errorMsg)
                    pendingPromise = null
                    pendingCodeVerifier = null
                    pendingState = null
                }

                override fun onSdkReady() {
                    isInitialized = true
                }
            }

            val tcSdkOptions = TcSdkOptions.Builder(activity, tcOAuthCallback)
                .build()

            TcSdk.initAsync(tcSdkOptions)
            isInitialized = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun isUsable(promise: Promise) {
        val activity = reactContext.currentActivity
        if (!isInitialized && activity != null) {
            initSdk(activity)
        }
        try {
            val usable = TcSdk.getInstance().isOAuthFlowUsable
            promise.resolve(usable)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun authenticate(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current Android activity is unavailable")
            return
        }

        if (!isInitialized) {
            initSdk(activity)
        }

        try {
            if (!TcSdk.getInstance().isOAuthFlowUsable) {
                promise.reject(
                    "NOT_USABLE",
                    "Truecaller 1-tap verification is not available on this device. Please make sure the Truecaller app is installed and you are logged in."
                )
                return
            }

            val codeVerifier = CodeVerifierUtil.generateRandomCodeVerifier()
            val codeChallenge = CodeVerifierUtil.getCodeChallenge(codeVerifier)
            val stateRequested = BigInteger(130, SecureRandom()).toString(32)

            pendingPromise = promise
            pendingCodeVerifier = codeVerifier
            pendingState = stateRequested

            codeChallenge?.let {
                TcSdk.getInstance().setCodeChallenge(it)
            }

            TcSdk.getInstance().setOAuthState(stateRequested)
            TcSdk.getInstance().setOAuthScopes(arrayOf("profile", "phone", "email"))

            val mainActivity = activity as? MainActivity
            val launcher = mainActivity?.tcLauncher
            if (mainActivity != null && launcher != null) {
                TcSdk.getInstance().getAuthorizationCode(mainActivity, launcher)
            } else {
                promise.reject("NO_LAUNCHER", "Activity launcher is not available")
            }
        } catch (e: Exception) {
            pendingPromise = null
            pendingCodeVerifier = null
            pendingState = null
            promise.reject("AUTH_ERROR", e.message ?: "Failed to initiate Truecaller verification")
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        try {
            TcSdk.getInstance().onActivityResultObtained(activity, resultCode, data)
        } catch (e: Exception) {
            // Ignore if not handled
        }
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }
}
