# Calculadora de giro · BOB → USDT → USD → SWIFT

Versión web del libro `calculadora_giro_crypto.xlsx`. Reproduce las cinco hojas del Excel
(Calculadora, Resumen, Fondeo, Parámetros y Escalas) con un motor de cálculo validado
contra los valores del libro original.

## Qué hace

| Sección | Qué responde |
|---|---|
| **Calculadora** | Modo A «quiero entregar X» (hacia atrás) y modo B «tengo X Bs» (hacia adelante), paso a paso: compra de USDT, venta por USD y giro SWIFT con las comisiones de Tower Bank. Incluye el bloque «¿Estamos ganando o perdiendo?». |
| **Resumen** | El giro en palabras simples: a dónde va cada USD que entrega el cliente (barra segmentada) y el desglose de ambos modos lado a lado. |
| **Fondeo** | ¿Me alcanzan los USD para girar? Plan vs. lo que realmente pasó, margen de seguridad y sensibilidad al precio de venta. |
| **Escalas** | Costo de cada tamaño de giro, con la zona muerta del umbral del corresponsal y el tope del TRE. Lista de giros editable. |
| **Parámetros** | Tarifas de Tower Bank y de la plataforma crypto. Todo se recalcula desde aquí. |

Los datos se guardan en `localStorage` del navegador. Tema claro/oscuro con persistencia.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor (vitest) contra los valores del Excel
npm run build    # build estático en dist/ (base relativa, sirve desde cualquier carpeta)
```

## Estructura

```
src/
  engine/      motor puro: tipos, fórmulas (calc.ts), formato es-BO, valores por defecto, tests
  state/       store (useReducer + localStorage) y tema
  components/  sistema de diseño: Card, NumberField, Row, StatTile, StatusBadge, Segmented…
  charts/      gráficos SVG a mano (sin librerías): escalas, sensibilidad, barra segmentada
  features/    una carpeta por sección (calculadora, resumen, fondeo, escalas, parametros)
  styles/      tokens de diseño (claro/oscuro) y estilos base
```

## Correspondencia con el Excel

- `towerFees()` = SWIFT + TRE (con tope) + corresponsal (según umbral), más ITBMS sobre el subtotal.
- `calcModeA()` = columna C de la hoja Calculadora. `calcModeB()` = columna D, incluidos los tres
  candidatos auxiliares (filas 54-56) que resuelven el giro máximo y la zona muerta del umbral.
- `calcFondeo()` = hoja Fondeo, incluida la tabla de sensibilidad (−1 % … +1 %).
- `calcEscalas()` = hoja Escalas (cada fila es un modo A para ese giro).
