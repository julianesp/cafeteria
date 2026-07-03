import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHora(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

const METODOS = {
  efectivo: { texto: '💵 Efectivo', color: '#2e7d32', fondo: '#e8f5e9' },
  nequi: { texto: '📱 Nequi', color: '#da0081', fondo: '#fce4ec' },
  transferencia: { texto: '🏦 Transferencia', color: '#1565c0', fondo: '#e3f2fd' },
  fiado: { texto: '📋 Fiado', color: '#e65100', fondo: '#fff3e0' },
};

// Ventas viejas no tienen metodoPago guardado
function metodoDeVenta(venta) {
  return METODOS[venta.metodoPago] || (venta.fiado ? METODOS.fiado : METODOS.efectivo);
}

export default function HistorialScreen() {
  const { ventas, eliminarVenta } = useVentas();
  const [seleccionada, setSeleccionada] = useState(null);

  const anularVenta = async (venta) => {
    const extra = venta.fiado
      ? ' También se eliminará la deuda del cliente (incluidos sus abonos).'
      : '';
    const ok = await confirmar(
      'Anular venta',
      `¿Anular esta venta de ${formatoPrecio(venta.total)}?${extra}`,
      'Anular',
      true
    );
    if (!ok) return;
    await eliminarVenta(venta.id);
    setSeleccionada(null);
    avisar('Venta anulada', 'La venta fue eliminada del historial.');
  };

  const totalDia = () => {
    const hoy = new Date().toDateString();
    return ventas
      .filter(v => new Date(v.fecha).toDateString() === hoy)
      .reduce((s, v) => s + v.total, 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.resumenDia}>
        <Text style={styles.resumenLabel}>Ventas de hoy</Text>
        <Text style={styles.resumenTotal}>{formatoPrecio(totalDia())}</Text>
        <Text style={styles.resumenCantidad}>
          {ventas.filter(v => new Date(v.fecha).toDateString() === new Date().toDateString()).length} transacciones
        </Text>
      </View>

      {ventas.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioEmoji}>📋</Text>
          <Text style={styles.vacioTexto}>Sin ventas aún</Text>
        </View>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const metodo = metodoDeVenta(item);
            return (
              <TouchableOpacity style={styles.fila} onPress={() => setSeleccionada(item)}>
                <View style={styles.filaIzq}>
                  <Text style={styles.hora}>{formatHora(item.fecha)}</Text>
                  <Text style={styles.fecha}>{formatFecha(item.fecha)}</Text>
                  <View style={[styles.badge, { backgroundColor: metodo.fondo }]}>
                    <Text style={[styles.badgeTexto, { color: metodo.color }]}>{metodo.texto}</Text>
                  </View>
                </View>
                <View style={styles.filaDer}>
                  <Text style={styles.items}>{item.items.reduce((s, i) => s + i.cantidad, 0)} productos</Text>
                  <Text style={styles.total}>{formatoPrecio(item.total)}</Text>
                </View>
                <Text style={styles.flecha}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={!!seleccionada} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Detalle de venta</Text>
            {seleccionada && (
              <>
                <Text style={styles.modalFecha}>
                  {formatFecha(seleccionada.fecha)} — {formatHora(seleccionada.fecha)}
                </Text>
                <View style={[styles.badge, { backgroundColor: metodoDeVenta(seleccionada).fondo, alignSelf: 'flex-start', marginBottom: 10 }]}>
                  <Text style={[styles.badgeTexto, { color: metodoDeVenta(seleccionada).color }]}>
                    {metodoDeVenta(seleccionada).texto}
                  </Text>
                </View>
                <ScrollView style={{ maxHeight: 240 }}>
                  {seleccionada.items.map((item, idx) => (
                    <View key={idx} style={styles.modalFila}>
                      <Text style={styles.modalEmoji}>{item.emoji || '🍽️'}</Text>
                      <Text style={styles.modalItem}>{item.nombre} x{item.cantidad}</Text>
                      <Text style={styles.modalSubtotal}>{formatoPrecio(item.precio * item.cantidad)}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.divider} />
                <Text style={styles.modalTotal}>Total: {formatoPrecio(seleccionada.total)}</Text>
                <TouchableOpacity style={styles.btnAnular} onPress={() => anularVenta(seleccionada)}>
                  <Text style={styles.btnAnularTexto}>🗑️ Anular venta</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.btnCerrar} onPress={() => setSeleccionada(null)}>
              <Text style={styles.btnCerrarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  resumenDia: {
    backgroundColor: '#1a1a2e', padding: 20, alignItems: 'center',
  },
  resumenLabel: { color: '#aaa', fontSize: 15, marginBottom: 4 },
  resumenTotal: { color: '#4CAF50', fontSize: 36, fontWeight: 'bold' },
  resumenCantidad: { color: '#666', fontSize: 14, marginTop: 4 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioEmoji: { fontSize: 48, marginBottom: 8 },
  vacioTexto: { fontSize: 19, color: '#666' },
  fila: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
  },
  filaIzq: { flex: 1 },
  hora: { fontSize: 18, fontWeight: '600', color: '#222' },
  fecha: { fontSize: 14, color: '#999', marginTop: 2 },
  filaDer: { alignItems: 'flex-end', marginRight: 8 },
  items: { fontSize: 14, color: '#999' },
  total: { fontSize: 19, fontWeight: 'bold', color: '#4CAF50', marginTop: 2 },
  flecha: { fontSize: 25, color: '#ccc' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  modalFecha: { fontSize: 15, color: '#999', marginBottom: 12 },
  modalFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalEmoji: { fontSize: 23, marginRight: 8 },
  modalItem: { flex: 1, fontSize: 17, color: '#444' },
  modalSubtotal: { fontSize: 17, fontWeight: '600', color: '#222' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  modalTotal: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', color: '#4CAF50', marginBottom: 16 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  badgeTexto: { fontSize: 13, fontWeight: '600' },
  btnAnular: {
    backgroundColor: '#ffebee', borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#f44336', marginBottom: 10,
  },
  btnAnularTexto: { fontSize: 17, color: '#c62828', fontWeight: '600' },
  btnCerrar: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnCerrarTexto: { fontSize: 18, color: '#444', fontWeight: '600' },
});
