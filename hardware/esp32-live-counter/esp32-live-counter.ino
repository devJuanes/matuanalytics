/**
 * MatuAnalytics — ESP32 DevKit + display 5641AS (cátodo común)
 *
 * Muestra usuarios en vivo (0 si no hay nadie).
 * 2 bips cuando entra alguien nuevo.
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

SevSeg sevseg;

const int buzzerPin = 33;

byte numDigits = 4;
byte digitPins[] = {19, 18, 5, 4};
byte segmentPins[] = {13, 12, 14, 27, 26, 25, 32, 0};

int activeUsers = 0;
int lastActiveUsers = 0;

unsigned long lastPoll = 0;
unsigned long lastWifiTry = 0;
bool wifiStarted = false;

// Buzzer: 2 bips sin bloquear el display
byte beepsRemaining = 0;
byte beepPhase = 0; // 0=idle 1=on 2=gap
unsigned long buzzerT = 0;
const int BEEP_ON_MS = 80;
const int BEEP_GAP_MS = 100;

void refreshDisplayNow() {
  sevseg.setNumber(activeUsers);
  sevseg.refreshDisplay();
}

void waitWithDisplay(unsigned long ms) {
  unsigned long t0 = millis();
  while (millis() - t0 < ms) {
    refreshDisplayNow();
  }
}

void startDoubleBeep() {
  beepsRemaining = 2;
  beepPhase = 1;
  digitalWrite(buzzerPin, HIGH);
  buzzerT = millis();
}

void serviceBuzzer() {
  if (beepsRemaining == 0) return;

  unsigned long now = millis();

  if (beepPhase == 1 && now - buzzerT >= BEEP_ON_MS) {
    digitalWrite(buzzerPin, LOW);
    beepPhase = 2;
    buzzerT = now;
    return;
  }

  if (beepPhase == 2 && now - buzzerT >= BEEP_GAP_MS) {
    beepsRemaining--;
    if (beepsRemaining > 0) {
      digitalWrite(buzzerPin, HIGH);
      beepPhase = 1;
      buzzerT = now;
    } else {
      beepPhase = 0;
    }
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
    startDoubleBeep();
  }

  lastActiveUsers = users;
  activeUsers = users;
}

bool fetchLiveCount() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(5000);

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
  unsigned long t0 = millis();
  while (client.connected() || client.available()) {
    while (client.available()) {
      response += (char)client.read();
    }
    refreshDisplayNow();
    if (millis() - t0 > 6000) break;
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

void setup() {
  Serial.begin(115200);

  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  byte hardwareConfig = COMMON_CATHODE;
  bool resistorsOnSegments = true;
  bool updateWithDelays = false;
  bool leadingZeros = false;
  bool disableDecPoint = true;

  sevseg.begin(
    hardwareConfig,
    numDigits,
    digitPins,
    segmentPins,
    resistorsOnSegments,
    updateWithDelays,
    leadingZeros,
    disableDecPoint
  );
  sevseg.setBrightness(90);

  activeUsers = 0;
  lastActiveUsers = 0;
  sevseg.setNumber(0);

  // Prueba rápida display + buzzer al encender (como tu main.c)
  for (int i = 0; i < 500; i++) {
    refreshDisplayNow();
  }
  startDoubleBeep();
}

void loop() {
  serviceBuzzer();
  serviceWifi();

  if (WiFi.status() == WL_CONNECTED && millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    fetchLiveCount();
  }

  // Igual que tu main.c: siempre refrescar el display
  refreshDisplayNow();
}
