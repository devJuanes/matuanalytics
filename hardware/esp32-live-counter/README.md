# ESP32 + display 5641AS

## Librería

Solo **SevSeg** (Dean Reading). Ya no hace falta ArduinoJson.

## Configurar

Edita al inicio del `.ino`:

```cpp
#define WIFI_SSID "TuRed"
#define WIFI_PASSWORD "TuClave"
#define SITE_ID "MA-A37CA49956E8"
```

## Comportamiento

- Pantalla muestra **0** si no hay nadie conectado
- **2 bips** cuando sube el número de conectados
- Consulta la API cada 3 segundos
- El display se refresca siempre (como tu `main.c` original)

## Cableado 5641AS

| Pin | Función | ESP32 |
|-----|---------|-------|
| 1 | E | D26 |
| 2 | D | D27 |
| 3 | DP | suelto |
| 4 | C | D14 |
| 5 | G | D32 |
| 6 | D4 | D4 |
| 7 | B | D12 |
| 8 | D3 | D5 |
| 9 | D2 | D18 |
| 10 | F | D25 |
| 11 | A | D13 |
| 12 | D1 | D19 |
| Buzzer + | | D33 |

## Si el display no enciende

Prueba en `setup()` cambiar `COMMON_CATHODE` por `COMMON_ANODE`.

## Monitor serie (115200)

```
WiFi -> TuRed
[api] en vivo: 0
[api] en vivo: 1
```

Si ves `[api] sin conexion SSL` o HTTP error, revisa WiFi y que el servidor tenga `/api/live/`.
