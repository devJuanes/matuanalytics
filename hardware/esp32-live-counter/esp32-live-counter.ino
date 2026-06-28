/**
 * MatuAnalytics — ESP32 DevKit + display 5641AS (cátodo común)
 *
 * Display fijo (sin parpadeo) — refresco por timer independiente del WiFi.
 * Suben conectados: 2 tonos ascendentes. Bajan: 2 tonos descendentes.
 *
 * Cableado 5641AS → ESP32:
 *   1=E→26  2=D→27  3=DP(suelto)  4=C→14  5=G→32  6=D4→4
 *   7=B→12  8=D3→5  9=D2→18  10=F→25  11=A→13  12=D1→19
 *   Buzzer + → GPIO 33
 *
 * Librerías: solo SevSeg (Dean Reading)
 */

// ============ EDITA AQUÍ ============
#define WIFI_SSID "LANDA"
#define WIFI_PASSWORD "@jlanda73$JL"
#define SITE_ID "MA-A37CA49956E8"
#define API_HOST "matuanalytics.matubyte.com"
#define POLL_MS 3000
// ===================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <SevSeg.h>
#include <esp_timer.h>

SevSeg sevseg;

const int buzzerPin = 33;

byte numDigits = 4;
byte digitPins[] = {19, 18, 5, 4};
byte segmentPins[] = {13, 12, 14, 27, 26, 25, 32, 0};

volatile int displayValue = 0;
int activeUsers = 0;
int lastActiveUsers = 0;

unsigned long lastPoll = 0;
unsigned long lastWifiTry = 0;
bool wifiStarted = false;

esp_timer_handle_t displayTimer = nullptr;
portMUX_TYPE displayMux = portMUX_INITIALIZER_UNLOCKED;

// Melodía buzzer (no bloqueante)
const int FREQ_UP_1 = 900;
const int FREQ_UP_2 = 1400;
const int FREQ_DOWN_1 = 1200;
const int FREQ_DOWN_2 = 650;
const int TONE_MS = 110;
const int GAP_MS = 90;

int melodyNotes[2];
byte melodyLen = 0;
byte melodyStep = 0;
byte melodyPhase = 0; // 0=idle 1=sonando 2=pausa
unsigned long melodyT = 0;

void onDisplayTimer(void *arg) {
  (void)arg;
  portENTER_CRITICAL(&displayMux);
  sevseg.refreshDisplay();
  portEXIT_CRITICAL(&displayMux);
}

void setDisplayValue(int value) {
  if (value < 0) value = 0;
  if (value > 9999) value = 9999;
  if (value == displayValue) return;

  portENTER_CRITICAL(&displayMux);
  displayValue = value;
  sevseg.setNumber(value);
  portEXIT_CRITICAL(&displayMux);
}

void startMelody(int f1, int f2) {
  melodyNotes[0] = f1;
  melodyNotes[1] = f2;
  melodyLen = 2;
  melodyStep = 0;
  melodyPhase = 1;
  melodyT = millis();
  tone(buzzerPin, melodyNotes[0], TONE_MS);
}

void startMelodyUp() {
  startMelody(FREQ_UP_1, FREQ_UP_2);
}

void startMelodyDown() {
  startMelody(FREQ_DOWN_1, FREQ_DOWN_2);
}

void serviceMelody() {
  if (melodyPhase == 0) return;

  unsigned long now = millis();

  if (melodyPhase == 1 && now - melodyT >= TONE_MS) {
    noTone(buzzerPin);
    melodyPhase = 2;
    melodyT = now;
    return;
  }

  if (melodyPhase == 2 && now - melodyT >= GAP_MS) {
    melodyStep++;
    if (melodyStep >= melodyLen) {
      melodyPhase = 0;
      melodyLen = 0;
      return;
    }
    melodyPhase = 1;
    melodyT = now;
    tone(buzzerPin, melodyNotes[melodyStep], TONE_MS);
  }
}

int parseActiveUsers(const String &body) {
  int key = body.indexOf("\"activeUsers\"");
  if (key < 0) return -1;
  int colon = body.indexOf(':', key);
  if (colon < 0) return -1;
  return body.substring(colon + 1).toInt();
}

void onCountUpdate(int users) {
  if (users < 0) users = 0;
  if (users > 9999) users = 9999;

  if (users > lastActiveUsers) {
    startMelodyUp();
  } else if (users < lastActiveUsers) {
    startMelodyDown();
  }

  lastActiveUsers = users;
  activeUsers = users;
  setDisplayValue(users);
}

bool fetchLiveCount() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(4000);

  if (!client.connect(API_HOST, 443)) {
    Serial.println("[api] sin conexion SSL");
    return false;
  }

  client.print("GET /api/live/");
  client.print(SITE_ID);
  client.println(" HTTP/1.1");
  client.print("Host: ");
  client.println(API_HOST);
  client.println("Connection: close");
  client.println();

  String response;
  response.reserve(512);
  unsigned long t0 = millis();
  while (client.connected() || client.available()) {
    while (client.available()) {
      response += (char)client.read();
    }
    if (millis() - t0 > 5000) break;
    yield();
  }
  client.stop();

  int jsonStart = response.indexOf('{');
  if (jsonStart < 0) {
    Serial.println("[api] sin JSON");
    return false;
  }

  int users = parseActiveUsers(response.substring(jsonStart));
  if (users < 0) {
    Serial.println("[api] JSON invalido");
    return false;
  }

  onCountUpdate(users);
  Serial.printf("[api] en vivo: %d\n", users);
  return true;
}

void serviceWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (!wifiStarted) {
    Serial.printf("WiFi -> %s\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    wifiStarted = true;
    lastWifiTry = now;
    return;
  }

  if (now - lastWifiTry < 10000) return;

  lastWifiTry = now;
  Serial.println("WiFi reintento...");
  WiFi.disconnect();
  wifiStarted = false;
}

void startDisplayTimer() {
  esp_timer_create_args_t args = {};
  args.callback = &onDisplayTimer;
  args.name = "sevseg";
  args.dispatch_method = ESP_TIMER_TASK;

  esp_timer_create(&args, &displayTimer);
  // 1.5 ms → multiplexado estable, sin parpadeo ni cambios de brillo
  esp_timer_start_periodic(displayTimer, 1500);
}

void setup() {
  Serial.begin(115200);

  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  sevseg.begin(
    COMMON_CATHODE,
    numDigits,
    digitPins,
    segmentPins,
    true,   // resistorsOnSegments
    false,  // updateWithDelays
    false,  // leadingZeros
    true    // disableDecPoint
  );
  sevseg.setBrightness(90);

  activeUsers = 0;
  lastActiveUsers = 0;
  setDisplayValue(0);

  startDisplayTimer();
}

void loop() {
  serviceMelody();
  serviceWifi();

  if (WiFi.status() == WL_CONNECTED && millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    fetchLiveCount();
  }
}
