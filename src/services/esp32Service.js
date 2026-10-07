/**
 * ESP32 Wi-Fi Communication Service for SOS Guardian
 * 
 * Communicates with ESP32 Access Point via HTTP:
 * - Default Base URL: http://192.168.4.1
 * - Endpoints:
 *     GET  /status  -> Returns { connected: true, event: "SOS" | "IDLE", sos: boolean }
 *     GET  /ping    -> Lightweight health check
 *     POST /ack     -> Acknowledges and resets the SOS event state on the ESP32
 *     POST /sos     -> Manual trigger endpoint for testing
 * 
 * Features:
 * - Robust polling loop (1.2s intervals)
 * - Strict timeout protection (2500ms) to prevent UI blocking
 * - Duplicate SOS suppression / debouncing (10-second cooldown)
 * - Automatic acknowledgment to clear physical ESP32 LED and state
 * - Zero battery monitoring
 */

const DEFAULT_IP = '192.168.4.1';
const REQUEST_TIMEOUT_MS = 2500;
const POLL_INTERVAL_MS = 1200;
const SOS_COOLDOWN_MS = 10000; // 10s cooldown to suppress duplicate alerts

class ESP32Service {
  constructor() {
    this.ip = DEFAULT_IP;
    this.isPolling = false;
    this.pollTimer = null;
    this.lastSosTimestamp = 0;
    this.isConnected = false;
    this.onSosCallback = null;
    this.onStatusCallback = null;
  }

  /**
   * Set target IP address
   * @param {string} newIp 
   */
  setIp(newIp) {
    if (newIp && typeof newIp === 'string') {
      this.ip = newIp.trim();
    }
  }

  getIp() {
    return this.ip;
  }

  getBaseUrl() {
    return `http://${this.ip}`;
  }

  /**
   * Safe fetch with AbortController timeout.
   * @param {string} url 
   * @param {object} options 
   * @param {number} timeoutMs 
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out. ESP32 did not respond.');
      }
      throw error;
    }
  }

  /**
   * Checks if ESP32 is reachable over Wi-Fi.
   * @param {string} [customIp] 
   * @returns {Promise<{ connected: boolean, latencyMs?: number, error?: string }>}
   */
  async checkConnection(customIp) {
    const targetIp = customIp || this.ip;
    const url = `http://${targetIp}/ping`;
    const startTime = Date.now();

    try {
      const response = await this._fetchWithTimeout(url, { method: 'GET' }, 2000);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        this.isConnected = true;
        return { connected: true, latencyMs };
      } else {
        // Fallback check to /status if /ping returned non-200
        const statusRes = await this._fetchWithTimeout(`http://${targetIp}/status`, { method: 'GET' }, 2000);
        if (statusRes.ok) {
          this.isConnected = true;
          return { connected: true, latencyMs: Date.now() - startTime };
        }
        this.isConnected = false;
        return { connected: false, error: `HTTP status: ${response.status}` };
      }
    } catch (error) {
      this.isConnected = false;
      return { connected: false, error: error.message || 'ESP32 unreachable' };
    }
  }

  /**
   * Sends ACK to ESP32 to clear the SOS state after processing.
   */
  async acknowledgeSos() {
    const url = `${this.getBaseUrl()}/ack`;
    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify({ acknowledged: true, timestamp: Date.now() }),
      }, 2000);
      return response.ok;
    } catch (err) {
      console.warn('Failed to send SOS ACK to ESP32:', err.message);
      return false;
    }
  }

  /**
   * Starts periodic polling for SOS events from ESP32.
   * @param {Function} onSosTriggered 
   * @param {Function} onStatusChange 
   */
  startPolling(onSosTriggered, onStatusChange) {
    this.onSosCallback = onSosTriggered;
    this.onStatusCallback = onStatusChange;

    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    console.log(`Starting ESP32 polling at ${this.getBaseUrl()}`);

    const executePoll = async () => {
      if (!this.isPolling) return;

      try {
        const url = `${this.getBaseUrl()}/status`;
        const response = await this._fetchWithTimeout(url, { method: 'GET' });

        if (response.ok) {
          const data = await response.json();

          // Update connection status
          if (!this.isConnected) {
            this.isConnected = true;
            if (this.onStatusCallback) this.onStatusCallback(true);
          }

          // Check if SOS event is triggered
          const isSos = data.event === 'SOS' || data.sos === true;
          if (isSos) {
            const now = Date.now();
            const timeSinceLast = now - this.lastSosTimestamp;

            // Debounce / duplicate prevention
            if (timeSinceLast > SOS_COOLDOWN_MS) {
              this.lastSosTimestamp = now;
              console.log('🚨 SOS Event received from ESP32!');

              // Acknowledge to ESP32 so it turns off alert LED and clears flag
              this.acknowledgeSos();

              if (this.onSosCallback) {
                this.onSosCallback({
                  source: 'ESP32',
                  timestamp: now,
                });
              }
            } else {
              console.log('Duplicate SOS ignored within cooldown window');
            }
          }
        } else {
          if (this.isConnected) {
            this.isConnected = false;
            if (this.onStatusCallback) this.onStatusCallback(false);
          }
        }
      } catch (err) {
        if (this.isConnected) {
          this.isConnected = false;
          if (this.onStatusCallback) this.onStatusCallback(false);
        }
      } finally {
        if (this.isPolling) {
          this.pollTimer = setTimeout(executePoll, POLL_INTERVAL_MS);
        }
      }
    };

    executePoll();
  }

  /**
   * Stops polling
   */
  stopPolling() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('ESP32 polling stopped');
  }

  /**
   * Manually trigger simulated SOS from app (for testing endpoint)
   */
  async triggerTestSosOnEsp32() {
    const url = `${this.getBaseUrl()}/sos`;
    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify({ event: 'SOS', source: 'MANUAL_TEST' }),
      });
      return response.ok;
    } catch (err) {
      console.warn('Failed to trigger test SOS on ESP32:', err.message);
      return false;
    }
  }
}

// Singleton instance
export const esp32Service = new ESP32Service();
export default esp32Service;
