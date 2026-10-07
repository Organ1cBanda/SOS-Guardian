package com.sosguardian.app;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class SosAccessibilityService extends AccessibilityService {
    private static final String TAG = "SosAccessibility";
    private static volatile boolean autoSendTriggered = false;
    private static volatile long triggerTimestamp = 0;
    private static SosAccessibilityService instance = null;

    public static void prepareAutoSend() {
        autoSendTriggered = true;
        triggerTimestamp = System.currentTimeMillis();
        Log.d(TAG, "WhatsApp Auto-Send armed for next 20 seconds");
    }

    public static boolean isRunning() {
        return instance != null;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "SosAccessibilityService connected");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!autoSendTriggered) return;

        // Auto-expire after 25 seconds to prevent unintended clicks later
        if (System.currentTimeMillis() - triggerTimestamp > 25000) {
            autoSendTriggered = false;
            return;
        }

        CharSequence pkg = event.getPackageName();
        if (pkg == null) return;
        String pkgStr = pkg.toString();

        if (!pkgStr.equals("com.whatsapp") && !pkgStr.equals("com.whatsapp.w4b")) {
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        try {
            boolean clicked = findAndClickSend(root);
            if (clicked) {
                autoSendTriggered = false;
                Log.d(TAG, "✅ WhatsApp Send button clicked automatically!");

                // Return to SOS app after a short delay so the user is back in SOS Guardian
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        performGlobalAction(GLOBAL_ACTION_BACK);
                    } catch (Exception ignored) {}
                }, 1200);
            }
        } finally {
            root.recycle();
        }
    }

    private boolean findAndClickSend(AccessibilityNodeInfo node) {
        if (node == null) return false;

        // 1. Direct view ID search in WhatsApp (com.whatsapp:id/send)
        List<AccessibilityNodeInfo> sendById = node.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send");
        if (sendById != null && !sendById.isEmpty()) {
            for (AccessibilityNodeInfo n : sendById) {
                if (n.isVisibleToUser()) {
                    boolean success = n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    if (!success && n.getParent() != null) {
                        success = n.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    if (success) return true;
                }
            }
        }

        // WhatsApp Business ID (com.whatsapp.w4b:id/send)
        List<AccessibilityNodeInfo> sendByIdW4b = node.findAccessibilityNodeInfosByViewId("com.whatsapp.w4b:id/send");
        if (sendByIdW4b != null && !sendByIdW4b.isEmpty()) {
            for (AccessibilityNodeInfo n : sendByIdW4b) {
                if (n.isVisibleToUser()) {
                    boolean success = n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    if (!success && n.getParent() != null) {
                        success = n.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    if (success) return true;
                }
            }
        }

        // 2. By contentDescription "Send"
        List<AccessibilityNodeInfo> sendByText = node.findAccessibilityNodeInfosByText("Send");
        if (sendByText != null && !sendByText.isEmpty()) {
            for (AccessibilityNodeInfo n : sendByText) {
                CharSequence cd = n.getContentDescription();
                if (cd != null && cd.toString().equalsIgnoreCase("Send") && n.isVisibleToUser()) {
                    boolean success = n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    if (!success && n.getParent() != null) {
                        success = n.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    if (success) return true;
                }
            }
        }

        // 3. Fallback recursive traversal looking for id ending with :id/send
        return traverseForSend(node);
    }

    private boolean traverseForSend(AccessibilityNodeInfo node) {
        if (node == null) return false;

        CharSequence viewId = node.getViewIdResourceName();
        if (viewId != null && viewId.toString().endsWith(":id/send") && node.isVisibleToUser()) {
            boolean success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            if (!success && node.getParent() != null) {
                success = node.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
            if (success) return true;
        }

        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean clicked = traverseForSend(child);
                if (clicked) return true;
            }
        }
        return false;
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "SosAccessibilityService interrupted");
    }
}
