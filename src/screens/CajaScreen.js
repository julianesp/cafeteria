import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

function mismoDia(iso, fecha) {
  return new Date(iso).toDateString() === fecha.toDateString();
}

function esHoy(fecha) {
  return fecha.toDateString() === new Date().toDateString();
}

function tituloDia(fecha) {
  if (esHoy(fecha)) return 'Hoy';
  return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function CajaScreen() {
  const { ventas, gastos, agregarGasto, eliminarGasto } = useVentas();
  const [fecha, setFecha] = useState(new Date());
  const [modalGasto, setModalGasto] = useState(false);
  const [form, setForm] = useState({ concepto: '', monto: '' });

  const cambiarDia = (dir) => {
    const nueva = new Date(fecha);
    nueva.setDate(nueva.getDate() + dir);
    setFecha(nueva);
  };

  const ventasDia = ventas.filter(v => mismoDia(v.fecha, fecha));
  const gastosDia = gastos.filter(g => mismoDia(g.fecha, fecha));

  const totalPorMetodo = (metodo) => ventasDia
    .filter(v => (v.metodoPago || (v.fiado ? 'fiado' : 'efectivo')) === metodo)
    .reduce((s, v) => s + v.total, 0);

  const efectivo = totalPorMetodo('efectivo');
  const nequi = totalPorMetodo('nequi');
  const transferencia = totalPorMetodo('transferencia');
  const fiado = totalPorMetodo('fiado');
  const cobrado = efectivo + nequi + transferencia;
  const totalGastos = gastosDia.reduce((s, g) => s + g.monto, 0);
  const balance = cobrado - totalGastos;

  const abrirNuevoGasto = () => {
    setForm({ concepto: '', monto: '' });
    setModalGasto(true);
  };

  const guardarGasto = async () => {
    if (!form.concepto.trim()) return avisar('Error', 'Escribe en qué se gastó.');
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) return avisar('Error', 'Ingresa un monto válido.');
    await agregarGasto({ concepto: form.concepto.trim(), monto });
    setModalGasto(false);
  };

  const confirmarEliminarGasto = async (gasto) => {
    const ok = await confirmar('Eliminar gasto', `¿Eliminar "${gasto.concepto}" (${formatoPrecio(gasto.monto)})?`, 'Eliminar', true);
    if (ok) await eliminarGasto(gasto.id);
  };

  return (
    <View style={styles.container}>
      {/* Navegación por día */}
      <View style={styles.header}>
        <View style={styles.navDia}>
          <TouchableOpacity onPress={() => cambiarDia(-1)} style={styles.btnNav}>
            <Text style={styles.btnNavTexto}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.tituloDia}>{tituloDia(fecha)}</Text>
          <TouchableOpacity onPress={() => cambiarDia(1)} style={styles.btnNav} disabled={esHoy(fecha)}>
            <Text style={[styles.btnNavTexto, esHoy(fecha) && { opacity: 0.25 }]}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Balance del día (cobrado − gastos)</Text>
          <Text style={[styles.balanceMonto, balance < 0 && { color: '#f44336' }]}>
            {formatoPrecio(balance)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
        {/* Cierre del día */}
        <Text style={styles.seccionTitulo}>Ventas del día ({ventasDia.length})</Text>
        <View style={styles.tarjeta}>
          <View style={styles.filaMetodo}>
            <Text style={styles.metodoNombre}>💵 Efectivo</Text>
            <Text style={styles.metodoMonto}>{formatoPrecio(efectivo)}</Text>
          </View>
          <View style={styles.filaMetodo}>
            <Text style={styles.metodoNombre}>📱 Nequi</Text>
            <Text style={styles.metodoMonto}>{formatoPrecio(nequi)}</Text>
          </View>
          <View style={styles.filaMetodo}>
            <Text style={styles.metodoNombre}>🏦 Transferencia</Text>
            <Text style={styles.metodoMonto}>{formatoPrecio(transferencia)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.filaMetodo}>
            <Text style={styles.metodoTotal}>Total cobrado</Text>
            <Text style={[styles.metodoTotal, { color: '#4CAF50' }]}>{formatoPrecio(cobrado)}</Text>
          </View>
          <View style={styles.filaMetodo}>
            <Text style={styles.metodoFiado}>📋 Fiado (por cobrar)</Text>
            <Text style={styles.metodoFiado}>{formatoPrecio(fiado)}</Text>
          </View>
        </View>

        {/* Gastos del día */}
        <Text style={styles.seccionTitulo}>Gastos del día ({gastosDia.length})</Text>
        {gastosDia.length === 0 ? (
          <View style={styles.tarjeta}>
            <Text style={styles.sinGastos}>Sin gastos registrados este día.</Text>
          </View>
        ) : (
          <View style={styles.tarjeta}>
            {gastosDia.map(g => (
              <View key={g.id} style={styles.filaGasto}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gastoConcepto}>{g.concepto}</Text>
                  <Text style={styles.gastoHora}>{formatHora(g.fecha)}</Text>
                </View>
                <Text style={styles.gastoMonto}>-{formatoPrecio(g.monto)}</Text>
                <TouchableOpacity style={styles.btnEliminarGasto} onPress={() => confirmarEliminarGasto(g)}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.filaMetodo}>
              <Text style={styles.metodoTotal}>Total gastos</Text>
              <Text style={[styles.metodoTotal, { color: '#f44336' }]}>-{formatoPrecio(totalGastos)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={abrirNuevoGasto}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      {/* Modal nuevo gasto */}
      <Modal visible={modalGasto} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Nuevo gasto</Text>

            <Text style={styles.label}>Concepto</Text>
            <TextInput
              style={styles.input}
              value={form.concepto}
              onChangeText={v => setForm(f => ({ ...f, concepto: v }))}
              placeholder="Ej: Compra de pan, bolsa de leche..."
              placeholderTextColor="#bbb"
            />

            <Text style={styles.label}>Monto ($)</Text>
            <TextInput
              style={styles.input}
              value={form.monto}
              onChangeText={v => setForm(f => ({ ...f, monto: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#bbb"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalGasto(false)}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarGasto}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a1a2e', padding: 16, paddingTop: 12 },
  navDia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnNav: { padding: 8 },
  btnNavTexto: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  tituloDia: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginHorizontal: 16, minWidth: 160, textAlign: 'center' },
  balanceBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, alignItems: 'center' },
  balanceLabel: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  balanceMonto: { color: '#4CAF50', fontSize: 30, fontWeight: 'bold' },
  seccionTitulo: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 8, marginTop: 4 },
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4,
  },
  filaMetodo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metodoNombre: { fontSize: 17, color: '#555' },
  metodoMonto: { fontSize: 17, fontWeight: '600', color: '#222' },
  metodoTotal: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  metodoFiado: { fontSize: 15, color: '#e65100' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  sinGastos: { color: '#999', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  filaGasto: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gastoConcepto: { fontSize: 17, fontWeight: '600', color: '#222' },
  gastoHora: { fontSize: 13, color: '#999', marginTop: 1 },
  gastoMonto: { fontSize: 17, fontWeight: 'bold', color: '#f44336', marginRight: 6 },
  btnEliminarGasto: { padding: 6 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#f44336', width: 66, height: 66,
    borderRadius: 33, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
  },
  fabTexto: { color: '#fff', fontSize: 34, fontWeight: 'bold', lineHeight: 38 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  label: { fontSize: 15, color: '#666', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 18, color: '#222', backgroundColor: '#fafafa',
  },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  btnCancelar: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0' },
  btnGuardar: { padding: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#f44336' },
});
