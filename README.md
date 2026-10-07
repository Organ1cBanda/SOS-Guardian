# 🚨 SOS Guardian - Emergency Android & NodeMCU (ESP8266) / ESP32 System

### 📦 Download Ready-to-Install APK:
The offline-compiled APK is built and ready in your root directory:
👉 **[`SOS_Guardian.apk`](file:///c:/Users/arya/OneDrive/Desktop/SarveshPj/SOS_Guardian.apk)** (130 MB, signed debug APK)

Simply transfer `SOS_Guardian.apk` to your Android phone via USB, Google Drive, or WhatsApp, and tap to install!

---

**SOS Guardian** is a complete, real-time emergency distress response system comprising:
1. **A NodeMCU V3 (ESP8266) / ESP32 Microcontroller Firmware**: Operates as an independent Wi-Fi Access Point (`SOS_DEVICE`) and detects a **3-second continuous physical button press**.
2. **A React Native Android Application**: Connects over local Wi-Fi, polls for the distress event, sounds a loud siren, vibrates the phone, and dispatches an emergency SOS broadcast to up to **5 configured emergency contacts** via Direct SMS with a WhatsApp fallback option.

> **Key Design Constraints Followed:**
> - Pure JavaScript only (**No TypeScript / No TSX**).
> - **Zero battery monitoring / percentage calculations** on the NodeMCU / ESP32.
> - Maximum of **5 Emergency Contacts** saved locally using `AsyncStorage`.
> - **3-Second Hold Protection** on both the physical button (Pin D2) and the manual app button to prevent false alarms.
> - Works entirely over local Wi-Fi (No cloud servers required).

---

## 📐 System Architecture

```text
┌────────────────────────────────────────┐
│         PHYSICAL HARDWARE              │
│  ESP32 Push Button (GPIO 4 -> GND)     │
│  Held continuously for 3.0 Seconds     │
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│           ESP32 FIRMWARE               │
│  • Wi-Fi AP: "SOS_DEVICE"              │
│  • IP Address: 192.168.4.1             │
│  • Rapid LED blinking during 3s hold   │
│  • HTTP Web Server on Port 80          │
│  • GET /status -> { "event": "SOS" }   │
└───────────────────┬────────────────────┘
                    │  Wi-Fi (HTTP Polling)
                    ▼
┌────────────────────────────────────────┐
│      ANDROID REACT NATIVE APP          │
│  • Checks http://192.168.4.1/status    │
│  • Detects SOS event                   │
│  • Sends POST /ack to clear ESP32 LED  │
│  • Full-Screen "SOS ACTIVATED" Alert   │
│  • Loud Siren & Continuous Vibration   │
│  • Reads up to 5 Emergency Contacts    │
│  • Broadcasts Emergency SMS            │
│  • One-tap WhatsApp fallback buttons   │
│  • Records Incident in Local History   │
└────────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```text
SarveshPj/
├── App.js                                # Main application root with tab navigation & alert coordinator
├── index.js                              # React Native registry entry point
├── package.json                          # Project dependencies & scripts
├── app.json                              # App manifest & metadata
├── babel.config.js                       # Babel compiler preset
├── metro.config.js                       # Metro bundler config
│
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml           # SEND_SMS, VIBRATE, INTERNET, usesCleartextTraffic="true"
│       └── res/xml/
│           └── network_security_config.xml # Permitted cleartext HTTP to 192.168.4.1
│
├── esp32/
│   └── sos_esp32_firmware/
│       └── sos_esp32_firmware.ino        # Complete ESP32 Arduino Sketch (AP, 3s Hold, WebServer)
│
├── src/
│   ├── theme.js                          # Modern emergency color palette, typography & tokens
│   ├── components/
│   │   ├── ConnectionStatus.js           # ESP32 live link badge, ping indicator & Wi-Fi guidance
│   │   ├── SOSButton.js                  # Large SOS button with 3-second accidental-press modal
│   │   ├── ContactCard.js                # Contact card with edit, delete, and call buttons
│   │   └── SOSAlert.js                   # Full-screen emergency modal with strobe siren & WhatsApp
│   ├── screens/
│   │   ├── HomeScreen.js                 # Dashboard: connection state, manual SOS, last incident
│   │   ├── ContactsScreen.js             # Manage up to 5 emergency contacts with phone validation
│   │   ├── SettingsScreen.js             # ESP32 IP, distress message editor, SMS permissions
│   │   └── HistoryScreen.js              # Persistent local audit log of all triggered SOS alerts
│   ├── services/
│   │   ├── esp32Service.js               # HTTP polling, timeout handling, debouncing, and ACK
│   │   ├── smsService.js                 # Android Direct SMS, permission checks & composer fallback
│   │   ├── storageService.js             # AsyncStorage local persistence (Contacts, Settings, History)
│   │   └── notificationService.js        # Loud alarm audio & repeating high-intensity vibration
│   └── utils/
│       └── validation.js                 # Phone number, name, IP, and 5-contact quota validators
│
└── scripts/
    ├── simulate_esp32.js                 # Node.js hardware mock simulator for instant desktop testing
    └── test_validation.js               # Validation test suite
```

---

## 🔌 NodeMCU V3 (ESP8266) Hardware Setup & Wiring

### Bill of Materials:
1. **NodeMCU V3 (ESP8266 / ESP-12E Module)**.
2. **Tactile Push Button** (Normally Open).
3. **Connecting Jumper Wires**.
4. **Micro-USB Cable** for flashing and power.

### NodeMCU V3 Wiring Diagram:

```text
      NodeMCU V3 (ESP8266)
  ┌───────────────────────────┐
  │                           │
  │     Pin D2 (GPIO 4) ●─────┼──────[ Push Button Terminal 1 ]
  │                           │
  │                 GND ●─────┼──────[ Push Button Terminal 2 ]
  │                           │
  │     Pin D4 (GPIO 2) ●─────┼──────[ Onboard Blue LED (LED_BUILTIN) ]
  │                           │
  └───────────────────────────┘
```

> **Why no external resistor is needed:**  
> The firmware configures Pin D2 with `pinMode(BUTTON_PIN, INPUT_PULLUP)`. When unpressed, the pin reads `HIGH`. When pressed, it connects Pin D2 to `GND` and reads `LOW`.

---

## 🛠️ Step 1: Flashing the NodeMCU V3 (ESP8266) Firmware

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) (version 2.x recommended).
2. Install the **ESP8266 Board Package**:
   - Open **File → Preferences**.
   - In "Additional Boards Manager URLs", add:
     `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Open **Tools → Board → Boards Manager**, search for `esp8266` by ESP8266 Community, and click **Install**.
3. Open the firmware file:
   [`nodemcu_esp8266/sos_nodemcu_firmware/sos_nodemcu_firmware.ino`](file:///c:/Users/arya/OneDrive/Desktop/SarveshPj/nodemcu_esp8266/sos_nodemcu_firmware/sos_nodemcu_firmware.ino)
4. Select your board from **Tools → Board → ESP8266 Boards → NodeMCU 1.0 (ESP-12E Module)**.
5. Connect your NodeMCU V3 to your PC via USB and select the COM port under **Tools → Port**.
6. Click **Upload** (Arrow icon).
7. Open the **Serial Monitor** at `115200 baud` to observe:
   ```text
   [Wi-Fi] Access Point Started successfully!
   [Wi-Fi] SSID:     SOS_DEVICE
   [Wi-Fi] Password: 12345678
   [Wi-Fi] IP:       192.168.4.1
   [HTTP] Server listening on port 80
   [Hardware Pin Wiring]
     • Push Button: Connect between Pin D2 and GND
     • Hold button for 3 seconds to trigger SOS
   ```

---

## 🔌 (Alternative) ESP32 Hardware Setup & Wiring

### Wiring Diagram (ESP32):

```text
       ESP32 Board
  ┌───────────────────┐
  │                   │
  │     GPIO 4  ●─────┼──────[ Push Button Terminal 1 ]
  │                   │
  │        GND  ●─────┼──────[ Push Button Terminal 2 ]
  │                   │
  │     GPIO 2  ●─────┼──────[ Built-in Blue LED ]
  │                   │
  └───────────────────┘
```

---

## 🛠️ Step 1: Flashing the ESP32 Firmware

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) (version 2.x recommended).
2. Install the **ESP32 Board Package**:
   - Open **File → Preferences**.
   - In "Additional Boards Manager URLs", add:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Open **Tools → Board → Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
3. Open the firmware file:
   [`esp32/sos_esp32_firmware/sos_esp32_firmware.ino`](file:///c:/Users/arya/OneDrive/Desktop/SarveshPj/esp32/sos_esp32_firmware/sos_esp32_firmware.ino)
4. Select your board from **Tools → Board → ESP32 Arduino → ESP32 Dev Module**.
5. Connect the ESP32 to your computer via USB and select the corresponding COM port under **Tools → Port**.
6. Click **Upload** (Arrow icon).
7. Open the **Serial Monitor** at `115200 baud`. You will observe:
   ```text
   [Wi-Fi] Configuring Access Point...
   [Wi-Fi] Access Point Started successfully!
   [Wi-Fi] SSID:     SOS_DEVICE
   [Wi-Fi] Password: 12345678
   [Wi-Fi] IP:       192.168.4.1
   [HTTP] Server listening on port 80
   [System] Ready. Hold physical button for 3 seconds to trigger SOS.
   ```

---

## 📱 Step 2: React Native Android App Setup

### 1. Install Prerequisites
Ensure you have the following installed:
- **Node.js**: v18 or higher (LTS recommended).
- **Java Development Kit (JDK)**: JDK 17.
- **Android Studio**: Android SDK (API 33 or 34), Android SDK Platform-Tools.

### 2. Install Project Dependencies
Run the following commands in the project root:

```bash
# 1. Install all dependencies
npm install

# 2. Key required packages installed:
# - @react-native-async-storage/async-storage
# - react-native-get-sms-android
# - react-native-sound
```

### 3. Verify Android Permissions & Cleartext Traffic
The permissions are already configured in [`android/app/src/main/AndroidManifest.xml`](file:///c:/Users/arya/OneDrive/Desktop/SarveshPj/android/app/src/main/AndroidManifest.xml):
- `SEND_SMS`: Required to send emergency messages directly.
- `VIBRATE`: Required for high-intensity emergency vibration cadence.
- `INTERNET` & `ACCESS_WIFI_STATE`: Required to reach the ESP32 at `192.168.4.1`.
- `android:usesCleartextTraffic="true"`: **Critical** — Allows standard HTTP requests without SSL blocks on Android 9+.

---

## 📶 Step 3: Connecting Your Android Phone to ESP32 Wi-Fi

1. Power on the ESP32 board.
2. On your Android phone, go to **Settings → Wi-Fi**.
3. Locate the Wi-Fi network:
   - **SSID**: `SOS_DEVICE`
   - **Password**: `12345678`
4. Tap **Connect**.
5. ⚠️ **Important Android Notice:**  
   Because the ESP32 AP does not provide public internet access, Android may show a prompt:  
   *"This network has no internet access. Stay connected?"*  
   **Select "Yes" / "Always stay connected" / "Don't ask again"**.  
   *(If your phone keeps switching back to cellular data, temporarily turn off Mobile Data while testing).*

---

## 🧪 Step 4: Testing the Complete SOS Flow

### Testing Path A: With Physical ESP32 Hardware
1. Connect your Android phone to the `SOS_DEVICE` Wi-Fi network.
2. Launch the **SOS Guardian** Android app.
3. Observe the Home Screen indicator: it switches to **🟢 Connected (Latency: <50ms)**.
4. Go to the **Contacts** tab and verify your emergency contacts (up to 5 contacts).
5. **Press and hold the physical button on the ESP32**:
   - For seconds 0 to 2.9: The blue LED on the ESP32 **blinks rapidly** (indicating hold in progress).
   - At exactly 3.0 seconds: The blue LED turns **solid ON**, and the ESP32 activates the SOS state.
6. The Android phone immediately detects the event via polling:
   - Full-screen **SOS ACTIVATED** modal appears with pulsing red strobe.
   - The phone sounds the emergency alarm and starts intense repetitive vibration.
   - The app sends a `POST /ack` request to the ESP32, which turns off the ESP32 LED.
   - The app automatically broadcasts the SOS message to all 5 emergency contacts via SMS.
   - An incident record is written into local **History**.
7. Tap **Mute Alarm & Resolve SOS** to dismiss the alert.

### Testing Path B: Manual In-App Trigger
1. On the Home Screen, tap the large **[🚨 SOS]** button.
2. A **3-second countdown confirmation modal** appears:
   - To cancel: Tap **CANCEL (SAFE)**.
   - To send immediately: Tap **SEND NOW** or wait for the 3 seconds to elapse.
3. The exact same full-screen emergency protocol, sound, vibration, and SMS broadcast will execute.

### Testing Path C: Desktop Testing using Mock Simulator
If you do not have an ESP32 board plugged in right now:
1. Run the included Node.js mock simulator:
   ```bash
   node scripts/simulate_esp32.js 8080
   ```
2. Open the app, go to **Settings**, change the IP to `10.0.2.2:8080` (if using Android Emulator) or `<Your_PC_Local_IP>:8080` (if using a physical phone on the same Wi-Fi).
3. In the simulator terminal, type `s` and hit `Enter` to simulate the 3-second button press!

---

## ⚙️ How to Configure the ESP32 IP Address

1. In the app, tap the **Settings** tab (gear icon at the bottom right).
2. Under **ESP32 Hardware Configuration**, view or edit the **ESP32 AP IP Address**:
   - Default: `192.168.4.1`
3. Tap **Ping Test**:
   - If reachable: A confirmation dialog shows latency.
   - If unreachable: Troubleshooting suggestions are displayed.
4. Tap **Save Settings** to persist the new configuration to `AsyncStorage`.

---

## 💬 SMS & WhatsApp Integration Details

### Direct Android SMS
- The app checks for the Android runtime permission `SEND_SMS`.
- If granted, it dispatches background SMS directly to all 5 phone numbers.
- **Graceful Fallback:** If your Android carrier or OS version restricts direct background SMS sending, the app **never silently fails**; it immediately opens your device's native SMS composer prefilled with the recipient list and the emergency message.

### WhatsApp Emergency Action
- In accordance with WhatsApp's security and anti-spam protocols, WhatsApp does not allow background third-party dispatch without user confirmation unless using the enterprise WhatsApp Cloud API.
- On the **SOS Alert** screen, each contact has a dedicated **💬 WhatsApp** button that opens WhatsApp directly with the emergency distress message prefilled.
- In [`src/services/smsService.js`](file:///c:/Users/arya/OneDrive/Desktop/SarveshPj/src/services/smsService.js), an architectural stub (`sendWhatsAppViaBackendApi`) is prepared for future connection to WhatsApp Business / Twilio Cloud API backends.

---

## 🛠️ Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **App shows 🔴 Disconnected** | Phone not on ESP32 Wi-Fi | Open phone Wi-Fi settings, select `SOS_DEVICE`, enter password `12345678`. Ensure Mobile Data is temporarily disabled if Android drops Wi-Fi without internet. |
| **HTTP Request Timeout / Failed to fetch** | Cleartext traffic blocked | Verify that `android:usesCleartextTraffic="true"` is present in `AndroidManifest.xml`. |
| **Button press does not trigger SOS** | Button released too early | The button must be held continuously for **3 full seconds**. The LED blinks during the hold and stays solid when triggered. |
| **Button press not registered at all** | Incorrect pin wiring | Ensure the button connects **GPIO 4 to GND**. Ensure you are using `INPUT_PULLUP`. |
| **SMS fails to send in background** | SMS permission denied | In the app, go to **Settings → SMS Broadcast Permission** and tap **Grant**. Alternatively, the native SMS composer fallback will open. |
| **Duplicate SOS alerts appearing** | Rapid button re-presses | The app features a built-in **10-second debounce cooldown** in `esp32Service.js` to suppress duplicate events. |
| **Cannot save more than 5 contacts** | Max limit enforced | The app enforces a strict limit of 5 emergency contacts. Edit or delete an existing contact to add a new one. |
