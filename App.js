import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { VentasProvider, useVentas } from './src/context/VentasContext';
import VentaScreen from './src/screens/VentaScreen';
import ProductosScreen from './src/screens/ProductosScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import ResumenScreen from './src/screens/ResumenScreen';
import FiadosScreen from './src/screens/FiadosScreen';
import ResumenMensualScreen from './src/screens/ResumenMensualScreen';
import CajaScreen from './src/screens/CajaScreen';
import ComprasScreen from './src/screens/ComprasScreen';

const Tab = createBottomTabNavigator();

// Secciones que viven en el menú hamburguesa (☰), fuera de la barra inferior.
const SECCIONES_MENU = [
  { clave: 'Resumen', titulo: 'Resumen', emoji: '📊', componente: ResumenScreen },
  { clave: 'Historial', titulo: 'Historial', emoji: '🗂️', componente: HistorialScreen },
  { clave: 'Compras', titulo: 'Compras / Inversión', emoji: '🛍️', componente: ComprasScreen },
];

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: focused ? 34 : 30 }}>{emoji}</Text>
    </View>
  );
}

function AlertaMensual() {
  const { alertaMensual, mesCerrado, cerrarAlertaMensual } = useVentas();
  const [verResumen, setVerResumen] = useState(false);

  if (verResumen && mesCerrado) {
    return (
      <Modal visible animationType="slide">
        <ResumenMensualScreen
          mesInicial={mesCerrado.mes}
          anioInicial={mesCerrado.anio}
          onCerrar={() => { setVerResumen(false); cerrarAlertaMensual(); }}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={alertaMensual} transparent animationType="fade">
      <View style={styles.alertaOverlay}>
        <View style={styles.alertaBox}>
          <Text style={styles.alertaEmoji}>📅</Text>
          <Text style={styles.alertaTitulo}>¡Nuevo mes!</Text>
          {mesCerrado && (
            <Text style={styles.alertaSubtitulo}>
              Hay fiados pendientes de {MESES[mesCerrado.mes]} {mesCerrado.anio}
            </Text>
          )}
          <Text style={styles.alertaTexto}>
            ¿Deseas ver el resumen y enviar los estados de cuenta por WhatsApp?
          </Text>
          <TouchableOpacity style={styles.alertaBtnVer} onPress={() => setVerResumen(true)}>
            <Text style={styles.alertaBtnVerTexto}>📲 Ver resumen y enviar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.alertaBtnCerrar} onPress={cerrarAlertaMensual}>
            <Text style={styles.alertaBtnCerrarTexto}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Menú hamburguesa: botón ☰ en el header que abre un panel con las secciones
// secundarias (Resumen, Historial, Compras) y las muestra a pantalla completa.
function MenuHamburguesa() {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [seccion, setSeccion] = useState(null);

  const abrirSeccion = (clave) => {
    setSeccion(clave);
    setPanelAbierto(false);
  };

  const activa = SECCIONES_MENU.find(s => s.clave === seccion);
  const Pantalla = activa?.componente;

  return (
    <>
      <TouchableOpacity style={styles.btnMenu} onPress={() => setPanelAbierto(true)}>
        <Text style={styles.btnMenuTexto}>☰</Text>
      </TouchableOpacity>

      {/* Panel lateral con la lista de secciones */}
      <Modal visible={panelAbierto} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setPanelAbierto(false)}>
          <TouchableOpacity style={styles.menuPanel} activeOpacity={1}>
            <Text style={styles.menuTitulo}>Menú</Text>
            {SECCIONES_MENU.map(s => (
              <TouchableOpacity key={s.clave} style={styles.menuItem} onPress={() => abrirSeccion(s.clave)}>
                <Text style={styles.menuItemEmoji}>{s.emoji}</Text>
                <Text style={styles.menuItemTexto}>{s.titulo}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sección seleccionada a pantalla completa */}
      <Modal visible={!!seccion} animationType="slide" onRequestClose={() => setSeccion(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e' }} edges={['top']}>
          <View style={styles.seccionHeader}>
            <TouchableOpacity style={styles.btnCerrarSeccion} onPress={() => setSeccion(null)}>
              <Text style={styles.btnCerrarSeccionTexto}>‹ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.seccionHeaderTitulo}>{activa?.titulo}</Text>
            <View style={{ width: 72 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {Pantalla && <Pantalla />}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Navegacion() {
  return (
    <>
      <AlertaMensual />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTitleStyle: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
          headerRight: () => <MenuHamburguesa />,
          tabBarStyle: { backgroundColor: '#1a1a2e', borderTopWidth: 0, height: 76, paddingBottom: 10 },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Venta"
          component={VentaScreen}
          options={{
            title: 'Cobrar',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Productos"
          component={ProductosScreen}
          options={{
            title: 'Productos',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Caja"
          component={CajaScreen}
          options={{
            title: 'Caja',
            tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Fiados"
          component={FiadosScreen}
          options={{
            title: 'Fiados',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VentasProvider>
        <NavigationContainer>
          <Navegacion />
        </NavigationContainer>
      </VentasProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  alertaOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  alertaBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', width: '100%',
  },
  alertaEmoji: { fontSize: 48, marginBottom: 8 },
  alertaTitulo: { fontSize: 25, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  alertaSubtitulo: { fontSize: 17, color: '#FF9800', fontWeight: '600', marginBottom: 8 },
  alertaTexto: { fontSize: 17, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  alertaBtnVer: {
    backgroundColor: '#25D366', borderRadius: 12, padding: 14,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  alertaBtnVerTexto: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  alertaBtnCerrar: { padding: 10 },
  alertaBtnCerrarTexto: { color: '#aaa', fontSize: 17 },
  btnMenu: { paddingHorizontal: 16, paddingVertical: 4 },
  btnMenuTexto: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
  menuPanel: {
    backgroundColor: '#fff', width: 260, paddingTop: 50, paddingHorizontal: 16,
    height: '100%',
  },
  menuTitulo: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16, paddingHorizontal: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  menuItemEmoji: { fontSize: 26, marginRight: 14 },
  menuItemTexto: { fontSize: 18, fontWeight: '600', color: '#222' },
  seccionHeader: {
    backgroundColor: '#1a1a2e', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12,
  },
  btnCerrarSeccion: { padding: 6, width: 72 },
  btnCerrarSeccionTexto: { color: '#fff', fontSize: 18, fontWeight: '600' },
  seccionHeaderTitulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
});
