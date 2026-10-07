/*
 ============================================================================
  Project: SOS Guardian - ESP32 Emergency Wi-Fi AP Firmware
  Board:   ESP32 Dev Module / ESP32 WROOM-32
  
  Summary:
  - Creates a local Wi-Fi Access Point (SSID: SOS_DEVICE, Pass: 12345678)
  - Configures static AP IP: 192.168.4.1
  - Monitors physical push button on GPIO 4 with 3-second continuous hold.
  - LATCHED SINGLE-FIRE TRIGGER: Prevents continuous SOS firing even if held.
  - While holding (0 to 3s), blinks onboard LED rapidly.
  - When held for 3 seconds, triggers SOS event ONCE and sets solid LED.
  - Runs HTTP Web Server on port 80:
      • GET  /ping   -> Health check
      • GET  /status -> Poll endpoint returning { "event": "SOS", "sos": true/false }
      • POST /ack    -> Android app acknowledges & clears the SOS state
      • POST /sos    -> Manual test trigger
  - ZERO battery monitoring / calculations.
 ============================================================================
*/

#include <WiFi.h>
#include <WebServer.h>

// --------------------------------------------------------------------------
// Wi-Fi Access Point Configuration
// --------------------------------------------------------------------------
const char* AP_SSID     = "SOS_DEVICE";
const char* AP_PASSWORD = "12345678";

// Static IP configuration for the Access Point
IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// Web Server listening on default HTTP port 80
WebServer server(80);

// --------------------------------------------------------------------------
// Hardware Pin Definitions
// --------------------------------------------------------------------------
// GPIO 4 connected to push button with internal pull-up.
// Connect one terminal of push button to GPIO 4, other terminal to GND.
const int BUTTON_PIN = 4;

// Button Polarity:
// Standard push button to GND = Active-LOW (true)
// Button module that outputs 3.3V when pressed = Active-HIGH (false)
const bool BUTTON_ACTIVE_LOW = true;

// GPIO 2 is standard onboard blue LED on most ESP32 DevKit boards.
const int LED_PIN = 2;

// --------------------------------------------------------------------------
// Button Timing & State Variables
// --------------------------------------------------------------------------
const unsigned long HOLD_DURATION_MS = 3000; // Required 3-second hold time
unsigned long buttonPressStartTime = 0;
bool isButtonPressed = false;
bool hasFiredThisPress = false; // LATCH: Prevents continuous SOS loop
bool sosTriggered = false;

// LED feedback timing during button hold
unsigned long lastBlinkTime = 0;
bool blinkState = false;

// --------------------------------------------------------------------------
// HTTP Helper: Add CORS headers for React Native client
// --------------------------------------------------------------------------
void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Handle OPTIONS preflight requests
void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

// --------------------------------------------------------------------------
// HTTP Handlers
// --------------------------------------------------------------------------

// GET /ping - Simple health check
void handlePing() {
  addCorsHeaders();
  String json = "{\"status\":\"ok\",\"device\":\"SOS_DEVICE_ESP32\",\"uptime\":" + String(millis() / 1000) + "}";
  server.send(200, "application/json", json);
}

// GET /status - Polled by the Android application
void handleStatus() {
  addCorsHeaders();
  String eventName = sosTriggered ? "SOS" : "IDLE";
  String sosBool = sosTriggered ? "true" : "false";

  String json = "{\"connected\":true,\"event\":\"" + eventName + "\",\"sos\":" + sosBool + "}";
  server.send(200, "application/json", json);
}

// POST /ack - Clears the active SOS state once received by the phone
void handleAck() {
  addCorsHeaders();
  sosTriggered = false;
  digitalWrite(LED_PIN, LOW); // Turn off emergency LED indicator
  Serial.println("[ESP32] SOS event ACK received from phone. State reset to IDLE.");

  String json = "{\"status\":\"acknowledged\",\"sos\":false,\"event\":\"IDLE\"}";
  server.send(200, "application/json", json);
}

// POST /sos or GET /sos - Test trigger endpoint
void handleTriggerSos() {
  addCorsHeaders();
  sosTriggered = true;
  digitalWrite(LED_PIN, HIGH);
  Serial.println("[ESP32] SOS triggered via HTTP endpoint.");

  String json = "{\"event\":\"SOS\",\"status\":\"triggered\",\"sos\":true}";
  server.send(200, "application/json", json);
}

// 404 Not Found Handler
void handleNotFound() {
  addCorsHeaders();
  server.send(404, "application/json", "{\"error\":\"Endpoint not found\"}");
}

// --------------------------------------------------------------------------
// SETUP
// --------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("   SOS GUARDIAN - ESP32 FIRMWARE");
  Serial.println("========================================");

  // Initialize Hardware Pins
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Hardware Diagnostic
  int bootPinState = digitalRead(BUTTON_PIN);
  Serial.print("[Hardware Diagnostic] GPIO 4 State: ");
  Serial.println(bootPinState == LOW ? "LOW (Ground / Pressed)" : "HIGH (Pull-up / Idle)");

  if (BUTTON_ACTIVE_LOW && bootPinState == LOW) {
    Serial.println("\n⚠️ WARNING: GPIO 4 is reading LOW at startup!");
    Serial.println("   If push button is NOT pressed, your button is shorted to GND");
    Serial.println("   or connected to the wrong terminals of a 4-pin button.");
    Serial.println("   -> Connect your wires to DIAGONAL pins of the 4-pin switch.\n");
  }

  // Configure ESP32 Access Point
  Serial.println("[Wi-Fi] Configuring Access Point...");
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  
  bool apSuccess = WiFi.softAP(AP_SSID, AP_PASSWORD);
  if (apSuccess) {
    Serial.print("[Wi-Fi] Access Point Started successfully!");
    Serial.print("\n[Wi-Fi] SSID:     "); Serial.println(AP_SSID);
    Serial.print("[Wi-Fi] Password: "); Serial.println(AP_PASSWORD);
    Serial.print("[Wi-Fi] IP:       "); Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("[Wi-Fi] ERROR: Failed to start Access Point!");
  }

  // Register HTTP Server Routes
  server.on("/ping", HTTP_GET, handlePing);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/ack", HTTP_POST, handleAck);
  server.on("/ack", HTTP_OPTIONS, handleOptions);
  server.on("/sos", HTTP_POST, handleTriggerSos);
  server.on("/sos", HTTP_GET, handleTriggerSos);
  server.on("/sos", HTTP_OPTIONS, handleOptions);
  server.onNotFound(handleNotFound);

  // Start HTTP Server
  server.begin();
  Serial.println("[HTTP] Server listening on port 80");
  Serial.println("[System] Ready. Hold physical button for 3 seconds to trigger SOS.");
  Serial.println("----------------------------------------\n");
}

// --------------------------------------------------------------------------
// MAIN LOOP
// --------------------------------------------------------------------------
void loop() {
  // 1. Handle incoming HTTP client requests
  server.handleClient();

  // 2. Read physical push-button state (Active LOW with INPUT_PULLUP)
  int rawReading = digitalRead(BUTTON_PIN);
  bool isPressed = BUTTON_ACTIVE_LOW ? (rawReading == LOW) : (rawReading == HIGH);

  if (isPressed) {
    // Button is currently being pressed down
    if (!isButtonPressed) {
      // First detection of button press
      isButtonPressed = true;
      hasFiredThisPress = false;
      buttonPressStartTime = millis();
      Serial.println("[Button] Press started. Hold for 3.0s to trigger SOS...");
    } else {
      // Button continues to be held down
      unsigned long heldDuration = millis() - buttonPressStartTime;

      if (!hasFiredThisPress) {
        // Blink LED rapidly (every 100ms) to give visual feedback that hold is registering
        if (millis() - lastBlinkTime >= 100) {
          lastBlinkTime = millis();
          blinkState = !blinkState;
          digitalWrite(LED_PIN, blinkState ? HIGH : LOW);
        }

        // Check if held for full 3 seconds
        if (heldDuration >= HOLD_DURATION_MS) {
          sosTriggered = true;
          hasFiredThisPress = true; // LATCH: Arm trigger ONCE per hold
          digitalWrite(LED_PIN, HIGH); // Solid ON when armed
          Serial.println("\n🚨 [ALERT] 3-Second Hold Complete! SOS TRIGGERED!");
          Serial.println("[ALERT] Latched. Ready for phone to collect event at /status.");
        }
      }
    }
  } else {
    // Button has been released
    if (isButtonPressed) {
      unsigned long totalHold = millis() - buttonPressStartTime;
      if (!hasFiredThisPress) {
        // Released before 3 seconds -> Cancelled / accidental tap
        Serial.print("[Button] Released after ");
        Serial.print(totalHold);
        Serial.println("ms (Under 3 seconds -> Accidental press ignored).");
        digitalWrite(LED_PIN, LOW);
      } else {
        Serial.println("[Button] Released. Ready for next button hold.");
      }
      isButtonPressed = false;
      hasFiredThisPress = false;
    }
  }

  // Small delay to conserve CPU cycles & debounce
  delay(10);
}
