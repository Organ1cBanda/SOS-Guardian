package com.sosguardian.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.telephony.SmsManager;
import android.text.TextUtils;
import android.util.Log;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

public class SosNativeModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SosNativeModule";
    private final ReactApplicationContext reactContext;

    public SosNativeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SosNativeModule";
    }

    /**
     * Sends background Direct SMS without launching any app UI.
     * Automatically splits unicode and multi-part messages.
     */
    @ReactMethod
    public void sendDirectSms(String phoneNumber, String message, Promise promise) {
        try {
            if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                    != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "SEND_SMS permission not granted");
                return;
            }

            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                promise.reject("INVALID_PHONE", "Recipient phone number is empty");
                return;
            }

            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            if (cleanPhone.isEmpty()) {
                promise.reject("INVALID_PHONE", "Invalid phone number format");
                return;
            }

            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = reactContext.getSystemService(SmsManager.class);
                if (smsManager == null) {
                    smsManager = SmsManager.getDefault();
                }
            } else {
                smsManager = SmsManager.getDefault();
            }

            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts != null && parts.size() > 1) {
                smsManager.sendMultipartTextMessage(cleanPhone, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(cleanPhone, null, message, null, null);
            }

            Log.d(TAG, "Sent Direct SMS to " + cleanPhone);
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("recipient", cleanPhone);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "sendDirectSms failed: " + e.getMessage());
            promise.reject("SMS_SEND_FAILED", e.getMessage());
        }
    }

    /**
     * Retrieves live GPS/Network location.
     * Guaranteed to NEVER hang: uses cached location, dual-provider query, and a strict 3.5s timeout.
     */
    @ReactMethod
    public void getLiveLocation(Promise promise) {
        try {
            boolean hasFine = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) 
                    == PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) 
                    == PackageManager.PERMISSION_GRANTED;

            if (!hasFine && !hasCoarse) {
                promise.reject("LOCATION_PERMISSION_DENIED", "Location permission not granted");
                return;
            }

            final LocationManager locationManager = (LocationManager) reactContext.getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) {
                promise.reject("NO_LOCATION_MANAGER", "Location service unavailable");
                return;
            }

            // 1. Check cached locations across all providers
            Location bestCached = null;
            String[] providers = {LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER};
            for (String p : providers) {
                try {
                    if (locationManager.isProviderEnabled(p)) {
                        Location loc = locationManager.getLastKnownLocation(p);
                        if (loc != null) {
                            if (bestCached == null || loc.getTime() > bestCached.getTime()) {
                                bestCached = loc;
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            // If we have a cached location from the last 2 minutes, return it immediately!
            long now = System.currentTimeMillis();
            if (bestCached != null && (now - bestCached.getTime() < 120000)) {
                resolveLocation(promise, bestCached);
                return;
            }

            // 2. Request single update concurrently on NETWORK and GPS with a strict 3500ms timeout
            final AtomicBoolean resolved = new AtomicBoolean(false);
            final Handler timeoutHandler = new Handler(Looper.getMainLooper());
            final Location fallback = bestCached;

            final LocationListener locationListener = new LocationListener() {
                @Override
                public void onLocationChanged(Location location) {
                    if (resolved.compareAndSet(false, true)) {
                        timeoutHandler.removeCallbacksAndMessages(null);
                        try {
                            locationManager.removeUpdates(this);
                        } catch (Exception ignored) {}
                        resolveLocation(promise, location);
                    }
                }

                @Override
                public void onStatusChanged(String provider, int status, Bundle extras) {}
                @Override
                public void onProviderEnabled(String provider) {}
                @Override
                public void onProviderDisabled(String provider) {}
            };

            boolean anyRegistered = false;
            for (String p : new String[]{LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER}) {
                try {
                    if (locationManager.isProviderEnabled(p)) {
                        locationManager.requestSingleUpdate(p, locationListener, Looper.getMainLooper());
                        anyRegistered = true;
                    }
                } catch (Exception ignored) {}
            }

            if (!anyRegistered) {
                if (fallback != null) {
                    resolveLocation(promise, fallback);
                } else {
                    promise.reject("NO_PROVIDER_ENABLED", "Neither GPS nor Network location provider is enabled");
                }
                return;
            }

            // 3. Strict 3500ms timeout so we NEVER hang
            timeoutHandler.postDelayed(() -> {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        locationManager.removeUpdates(locationListener);
                    } catch (Exception ignored) {}

                    if (fallback != null) {
                        Log.d(TAG, "Location timeout reached, using cached location");
                        resolveLocation(promise, fallback);
                    } else {
                        Log.w(TAG, "Location timeout reached, no cached location available");
                        promise.reject("LOCATION_TIMEOUT", "Timed out waiting for location fix");
                    }
                }
            }, 3500);

        } catch (Exception e) {
            promise.reject("LOCATION_ERROR", e.getMessage());
        }
    }

    private void resolveLocation(Promise promise, Location loc) {
        double lat = loc.getLatitude();
        double lon = loc.getLongitude();
        String mapsUrl = "https://maps.google.com/?q=" + lat + "," + lon;

        Log.d(TAG, "Resolved live location: " + mapsUrl);
        WritableMap map = Arguments.createMap();
        map.putDouble("latitude", lat);
        map.putDouble("longitude", lon);
        map.putDouble("accuracy", loc.getAccuracy());
        map.putString("mapsUrl", mapsUrl);
        promise.resolve(map);
    }

    /**
     * Checks if SOS Accessibility Service is active for WhatsApp auto-send.
     */
    @ReactMethod
    public void isAccessibilityEnabled(Promise promise) {
        try {
            int accessibilityEnabled = 0;
            final String service = reactContext.getPackageName() + "/" + SosAccessibilityService.class.getCanonicalName();
            try {
                accessibilityEnabled = Settings.Secure.getInt(
                        reactContext.getContentResolver(),
                        Settings.Secure.ACCESSIBILITY_ENABLED);
            } catch (Settings.SettingNotFoundException ignored) {}

            TextUtils.SimpleStringSplitter colonSplitter = new TextUtils.SimpleStringSplitter(':');

            if (accessibilityEnabled == 1) {
                String settingValue = Settings.Secure.getString(
                        reactContext.getContentResolver(),
                        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
                if (settingValue != null) {
                    colonSplitter.setString(settingValue);
                    while (colonSplitter.hasNext()) {
                        String accessibilityService = colonSplitter.next();
                        if (accessibilityService.equalsIgnoreCase(service) || 
                            accessibilityService.contains("SosAccessibilityService")) {
                            promise.resolve(true);
                            return;
                        }
                    }
                }
            }
            promise.resolve(false);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    /**
     * Opens Android System Accessibility Settings page.
     */
    @ReactMethod
    public void openAccessibilitySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("OPEN_SETTINGS_FAILED", e.getMessage());
        }
    }

    /**
     * Arms WhatsApp Auto-Send so that opening WhatsApp automatically clicks Send.
     */
    @ReactMethod
    public void prepareWhatsAppAutoSend(Promise promise) {
        try {
            SosAccessibilityService.prepareAutoSend();
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }
}
