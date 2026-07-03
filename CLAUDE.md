@AGENTS.md

# Registro Cafetería

App móvil (Expo / React Native) de punto de venta para una **cafetería escolar en Colombia**. La usa una sola persona (quien atiende la cafetería) para registrar ventas del día, llevar los fiados de estudiantes y profesores, y enviar los estados de cuenta por WhatsApp.

## Stack

- Expo SDK 54, React Native 0.81, React 19.
- Navegación: `@react-navigation/bottom-tabs` (6 pestañas).
- Persistencia: `AsyncStorage` (todo local en el dispositivo, sin backend). Claves: `productos`, `ventas`, `clientes`, `gastos`, `ultimoMesAlerta`.
- Gestor de paquetes: **pnpm** (usar `npx expo install` para dependencias nativas; detecta pnpm solo).
- Funciona en Android, iOS y web (`react-native-web`).

## Comandos

- `pnpm run web` — abrir en el navegador (así prueba el usuario normalmente).
- `pnpm start` — servidor de desarrollo (Expo Go).
- `pnpm run android` / `pnpm run ios` — en dispositivo/emulador.
- `npx expo export --platform web` — verificar que el bundle web compila.

## Estructura

- `App.js` — navegación por pestañas (Cobrar, Productos, Historial, Caja, Fiados, Resumen) y alerta de cambio de mes.
- `src/context/VentasContext.js` — **único** estado global: productos, carrito, ventas, clientes/deudas/abonos, gastos, respaldo (exportar/importar). Toda mutación de datos pasa por aquí. `clienteParaFiar` conecta la pestaña Fiados con la de Venta: el botón "Fiar" de un cliente lo deja preseleccionado y la venta se le carga directo.
- `src/screens/` — una pantalla por pestaña + `ResumenMensualScreen` (estados de cuenta mensuales y envío por WhatsApp).
- `src/utils/formato.js` — `formatoPrecio(n)` → `"$1.500"`.
- `src/utils/alerta.js` — `avisar()` y `confirmar()` multiplataforma.

## Modelo de datos

- **producto**: `{ id, nombre, precio, emoji, foto }` (foto = uri local o null).
- **venta**: `{ id, items[], total, fecha ISO, clienteId, metodoPago, fiado, pagado }`. `metodoPago`: `'efectivo' | 'nequi' | 'transferencia' | 'fiado'` (ventas antiguas pueden no tenerlo: tratar como efectivo, o fiado si `fiado === true`).
- **cliente**: `{ id, nombre, tipo ('Estudiante'|'Profesor'), telefono, deudas[] }`. El teléfono es WhatsApp con código de país (`573001234567`).
- **deuda**: `{ id (= id de la venta), fecha, monto, items[], abonos[], saldoPendiente }`. Anular una venta fiada elimina la deuda del cliente con el mismo id.
- **gasto**: `{ id, concepto, monto, fecha ISO }`.

## Convenciones (importante)

- **Todo en español**: UI, nombres de funciones/variables, comentarios y mensajes.
- **Moneda**: pesos colombianos sin decimales. Siempre usar `formatoPrecio()` de `src/utils/formato.js`; nunca `toFixed(2)`.
- **Alertas**: `Alert.alert` de React Native **no funciona en web** (los botones no hacen nada). Usar siempre `avisar()` / `confirmar()` de `src/utils/alerta.js`. Cualquier funcionalidad nueva debe funcionar también en web (`Platform.OS === 'web'` cuando haga falta).
- **WhatsApp**: enlaces `https://wa.me/<tel>?text=...` (funcionan en teléfono y navegador), nunca `whatsapp://`.
- **Estilos**: `StyleSheet.create` al final de cada archivo. Paleta: `#1a1a2e` (oscuro, headers/tab bar), `#4CAF50` (verde, cobros/positivo), `#FF9800` (naranja, fiados), `#f44336` (rojo, deudas/gastos), `#da0081` (Nequi), `#1976d2` (transferencia), fondo `#f5f5f5`.
- **Patrones de UI**: modales tipo bottom-sheet (`justifyContent: 'flex-end'`, esquinas superiores redondeadas), FAB `+` para crear, tarjetas blancas con `borderRadius: 12-14`, íconos con emoji. Los modales con inputs llevan `KeyboardAvoidingView`.
- Sin TypeScript, sin tests: verificar con `npx expo export --platform web` y probando en el navegador.
