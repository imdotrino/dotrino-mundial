# Mundial 2026 — Dotrino

> **Parte del ecosistema [Dotrino](https://dotrino.com).** Misión: aplicaciones que resuelven problemas comunes, respetando tu privacidad — sin anuncios, sin cookies, sin rastreo de datos, sin vender tu identidad a nadie.

App **informativa** del Mundial 2026 (`mundial.dotrino.com`): resultados oficiales en
vivo, qué equipos juegan hoy, la tabla de cada grupo (PJ, ganados, empatados,
perdidos, diferencia de gol, puntos) y **qué necesita cada selección para clasificar**.

## Cómo funciona

- **Datos**: consume el feed **firmado** del relay oficial del ecosistema
  (`results.dotrino.com` → ESPN + FIFA + overrides), y **verifica la firma**
  (ECDSA P-256, pubkey pineada) en el cliente antes de mostrarlo. La app nunca pega
  a proveedores de terceros.
- **Tablas**: se computan en el navegador desde el feed (formato 2026: 12 grupos de
  4; clasifican los 2 primeros + los 8 mejores terceros).
- **Panorama por equipo**: el estado (clasificado / en disputa / 3º / eliminado) se
  calcula por **fuerza bruta** sobre los partidos de grupo que faltan (≤3⁶ por grupo,
  exacto). Datos de equipos/grupos rescatados de `dotrino-pronostico-mundialista`.

Sin anuncios, sin cookies, sin rastreo. Vue 3 + Vite + PWA. Bilingüe es/en.

## Desarrollo

```sh
npm install
npm run dev
npm run build
```
