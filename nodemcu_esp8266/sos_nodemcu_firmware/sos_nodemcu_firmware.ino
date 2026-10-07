/*
 ============================================================================
  Project: SOS Guardian - NodeMCU V3 (ESP8266) Emergency Wi-Fi AP Firmware
  Board:   NodeMCU 1.0 (ESP-12E Module) / NodeMCU V3 (ESP8266)
  
  Summary:
  - Creates a high-power local Wi-Fi Access Point:
      • SSID:     SOS_DEVICE
      • Password: 12345678
      • AP IP:    192.168.4.1
      • Channel:  1 (2.4 GHz, visible broadcast)
  - Disables modem sleep (WIFI_NONE_SLEEP) to ensure 100% discoverability.
  - Monitors physical push button on Pin D2 (GPIO 4) with 3-second continuous hold.
  - LATCHED SINGLE-FIRE TRIGGER: Prevents continuous SOS firing even if held.
  - While holding (0 to 3s), blinks NodeMCU onboard LED (LED_BUILTIN / Pin D4) rapidly.
  - When held for 3.0 seconds, triggers SOS event ONCE and turns LED solid ON.
  - Runs HTTP Web Server on port 80:
      • GET  /ping   -> Health check
      • GET  /status -> Poll endpoint returning { "event": "SOS", "sos": true/false }
      • POST /ack    -> Android app acknowledges & clears the SOS state
      • POST /sos    -> Manual test trigger
  - ZERO battery monitoring / calculations.
 ============================================================================
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

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
ESP8266WebServer server(80);

// --------------------------------------------------------------------------
// Hardware Pin Definitions for NodeMCU V3 (ESP8266)
// --------------------------------------------------------------------------
// Pin D2 = GPIO 4: Connected to physical push button.
// Connect one terminal of push button to Pin D2, and other terminal to GND.
const int BUTTON_PIN = D2; // GPIO 4

// Button Polarity:
// Standard push button connected to GND = Active-LOW (true)
// Button module that outputs 3.3V when pressed = Active-HIGH (false)
const bool BUTTON_ACTIVE_LOW = true;

// NodeMCU V3 Onboard Blue LED is on Pin D4 (GPIO 2 / LED_BUILTIN).
// Note: On ESP8266/NodeMCU, the onboard LED is Active-LOW:
// LOW = LED ON, HIGH = LED OFF.
const int LED_PIN = LED_BUILTIN; 

// --------------------------------------------------------------------------
// Button Timing & State Variables
// --------------------------------------------------------------------------
const unsigned long HOLD_DURATION_MS = 3000; // Required 3-second hold time
unsigned long buttonPressStartTime = 0;
bool isButtonPressed = false;
bool hasFiredThisPress = false; // LATCH: Ensures SOS fires ONLY ONCE per press
bool sosTriggered = false;

// LED feedback timing during button hold
unsigned long lastBlinkTime = 0;
bool blinkState = false;

// Helper function to handle NodeMCU active-low LED logic
void setOnboardLed(bool turnOn) {
  // On NodeMCU: LOW turns LED ON, HIGH turns LED OFF
  digitalWrite(LED_PIN, turnOn ? LOW : HIGH);
}

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
  String json = "{\"status\":\"ok\",\"device\":\"NODEMCU_V3_ESP8266\",\"uptime\":" + String(millis() / 1000) + "}";
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

// POST /ack - Clears active SOS state once received by the phone
void handleAck() {
  addCorsHeaders();
  sosTriggered = false;
  setOnboardLed(false); // Turn off emergency LED indicator
  Serial.println("[NodeMCU] SOS ACK received from phone. State reset to IDLE.");

  String json = "{\"status\":\"acknowledged\",\"sos\":false,\"event\":\"IDLE\"}";
  server.send(200, "application/json", json);
}

// POST /sos or GET /sos - Test trigger endpoint
void handleTriggerSos() {
  addCorsHeaders();
  sosTriggered = true;
  setOnboardLed(true);
  Serial.println("[NodeMCU] SOS triggered via HTTP endpoint.");

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
  delay(1000); // Give serial monitor time to connect

  Serial.println("\n\n========================================");
  Serial.println("  SOS GUARDIAN - NODEMCU V3 (ESP8266)");
  Serial.println("========================================");

  // Initialize Hardware Pins
  // INPUT_PULLUP: pin is HIGH when unpressed, LOW when pressed to GND
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  setOnboardLed(false); // Start with LED OFF

  // Startup Pin Diagnostic
  int bootPinState = digitalRead(BUTTON_PIN);
  Serial.print("[Hardware Diagnostic] Pin D2 State: ");
  Serial.println(bootPinState == LOW ? "LOW (Ground / Pressed)" : "HIGH (Pull-up / Idle)");

  if (BUTTON_ACTIVE_LOW && bootPinState == LOW) {
    Serial.println("\n⚠️ WARNING: Pin D2 is reading LOW right now!");
    Serial.println("   If the push button is NOT pressed, your button is shorted to GND");
    Serial.println("   or connected to the wrong terminals of a 4-pin button.");
    Serial.println("   -> Connect your wires to DIAGONAL pins of the 4-pin tactile switch.\n");
  }

  // ------------------------------------------------------------------------
  // Robust ESP8266 Wi-Fi AP Initialization:
  // 1. Wipe old saved STA settings to avoid conflicts
  // 2. Disable Wi-Fi modem sleep so the radio beacons continuously
  // 3. Set maximum RF output power (20.5 dBm) for long range
  // ------------------------------------------------------------------------
  Serial.println("[Wi-Fi] Initializing RF transceiver...");
  WiFi.persistent(false);               // Do not save Wi-Fi state to flash
  WiFi.disconnect(true);                // Disconnect any stale station connections
  delay(100);

  WiFi.mode(WIFI_OFF);                  // Cycle Wi-Fi radio
  delay(100);

  WiFi.mode(WIFI_AP);                   // Set to pure Access Point mode
  WiFi.setSleepMode(WIFI_NONE_SLEEP);   // CRITICAL: Disable modem sleep so AP never disappears
  WiFi.setOutputPower(20.5);            // Set max TX power (20.5 dBm) for maximum signal strength

  // Configure Static IP
  WiFi.softAPConfig(local_ip, gateway, subnet);
  
  // Start Soft AP:
  // Parameters: SSID, Password, Channel 1, Hidden = 0 (Visible), Max Clients = 4
  bool apSuccess = WiFi.softAP(AP_SSID, AP_PASSWORD, 1, 0, 4);

  if (apSuccess) {
    Serial.println("\n[Wi-Fi] ✅ Access Point STARTED & BROADCASTING!");
    Serial.print("[Wi-Fi] SSID:       "); Serial.println(AP_SSID);
    Serial.print("[Wi-Fi] Password:   "); Serial.println(AP_PASSWORD);
    Serial.print("[Wi-Fi] IP Address: "); Serial.println(WiFi.softAPIP());
    Serial.print("[Wi-Fi] MAC Addr:   "); Serial.println(WiFi.softAPmacAddress());
    Serial.println("[Wi-Fi] Channel:    1 (2.4 GHz)");
  } else {
    Serial.println("\n[Wi-Fi] ❌ ERROR: Failed to start Access Point!");
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
  Serial.println("\n[Wiring Guide]");
  Serial.println("  • Push Button: Connect between Pin D2 and GND");
  Serial.println("  • Hold button for 3 seconds to trigger SOS");
  Serial.println("----------------------------------------\n");
}

// --------------------------------------------------------------------------
// MAIN LOOP
// --------------------------------------------------------------------------
unsigned long lastHeartbeatTime = 0;

void loop() {
  // 1. Handle incoming HTTP client requests
  server.handleClient();

  // 2. Periodic serial heartbeat every 5 seconds with connected clients count
  if (millis() - lastHeartbeatTime >= 5000) {
    lastHeartbeatTime = millis();
    int connectedPhones = WiFi.softAPgetStationNum();
    Serial.print("[Heartbeat] Wi-Fi AP '");
    Serial.print(AP_SSID);
    Serial.print("' Active | Connected Devices: ");
    Serial.println(connectedPhones);
  }

  // 3. Read physical push-button state on Pin D2
  int rawReading = digitalRead(BUTTON_PIN);
  bool isPressed = BUTTON_ACTIVE_LOW ? (rawReading == LOW) : (rawReading == HIGH);

  if (isPressed) {
    // Button is currently being pressed down
    if (!isButtonPressed) {
      // First detection of button press
      isButtonPressed = true;
      hasFiredThisPress = false; // Fresh new press cycle
      buttonPressStartTime = millis();
      Serial.println("[Button] Press started on Pin D2. Hold for 3.0s to trigger SOS...");
    } else {
      // Button continues to be held down
      unsigned long heldDuration = millis() - buttonPressStartTime;

      // Only evaluate if we haven't already fired an alert during this single hold
      if (!hasFiredThisPress) {
        // Blink LED rapidly (every 100ms) to give visual feedback that hold is registering
        if (millis() - lastBlinkTime >= 100) {
          lastBlinkTime = millis();
          blinkState = !blinkState;
          setOnboardLed(blinkState);
        }

        // Check if held for full 3 seconds
        if (heldDuration >= HOLD_DURATION_MS) {
          sosTriggered = true;
          hasFiredThisPress = true; // LATCH: Arm trigger ONCE. Will not repeat until released!
          setOnboardLed(true);      // Solid ON when armed
          Serial.println("\n🚨 [ALERT] 3-Second Hold Complete! SOS TRIGGERED on NodeMCU!");
          Serial.println("[ALERT] Latched. Next poll from phone receives SOS. Awaiting button release.");
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
        setOnboardLed(false);
      } else {
        Serial.println("[Button] Released. Ready for next button hold.");
      }
      isButtonPressed = false;
      hasFiredThisPress = false; // Reset latch on release
    }
  }

  // Small delay to yield to Wi-Fi background task
  delay(10);
}
