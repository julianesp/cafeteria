import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function claveMes(iso) {
  const f = new Date(iso);
  return `${f.getFullYear()}-${f.getMonth()}`;
}

function tituloMes(iso) {
  const f = new Date(iso);
  return `${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function ComprasScreen() {
  const { compras, agregarCompra, eliminarCompra } = useVentas();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', cantidad: '', total: '' });

  const totalInvertido = compras.reduce((s, c) => s + c.total, 0);

  // Agrupar por mes, más reciente primero
  const grupos = {};
  compras.forEach(c => {
    const clave = claveMes(c.fecha);
    if (!grupos[clave]) grupos[clave] = { clave, titulo: tituloMes(c.fecha), orden: new Date(c.fecha).getFullYear() * 12 + new Date(c.fecha).getMonth(), items: [], total: 0 };
    grupos[clave].items.push(c);
    grupos[clave].total += c.total;
  });
  const meses = Object.values(grupos).sort((a, b) => b.orden - a.orden);

  const abrirNueva = () => {
    setForm({ nombre: '', cantidad: '', total: '' });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return avisar('Error', 'Escribe qué se adquirió.');
    const cantidad = parseInt(form.cantidad, 10);
    if (isNaN(cantidad) || cantidad <= 0) return avisar('Error', 'Ingresa una cantidad válida.');
    const total = parseFloat(form.total);
    if (isNaN(total) || total <= 0) return avisar('Error', 'Ingresa el total pagado.');
    await agregarCompra({ nombre: form.nombre.trim(), cantidad, total });
    setModal(false);
  };

  const confirmarEliminar = async (compra) => {
    const ok = await confirmar('Eliminar compra', `¿Eliminar "${compra.nombre}" (${formatoPrecio(compra.total)})?`, 'Eliminar', true);
    if (ok) await eliminarCompra(compra.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Compras / Inversión</Text>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total invertido</Text>
          <Text style={styles.totalMonto}>{formatoPrecio(totalInvertido)}</Text>
          <Text style={styles.totalSub}>{compras.length} {compras.length === 1 ? 'compra' : 'compras'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        {compras.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🛍️</Text>
            <Text style={styles.vacioTexto}>Aún no has registrado compras.</Text>
            <Text style={styles.vacioSub}>Toca el botón + para registrar mercancía adquirida (nombre, cantidad y total).</Text>
          </View>
        ) : (
          meses.map(mes => (
            <View key={mes.clave} style={{ marginBottom: 8 }}>
              <View style={styles.mesEncabezado}>
                <Text style={styles.mesTitulo}>{mes.titulo}</Text>
                <Text style={styles.mesTotal}>{formatoPrecio(mes.total)}</Text>
              </View>
              {mes.items.map(c => (
                <View key={c.id} style={styles.fila}>
                  <View style={styles.filaInfo}>
                    <Text style={styles.filaNombre}>{c.nombre}</Text>
                    <Text style={styles.filaSub}>
                      {c.cantidad} {c.cantidad === 1 ? 'unidad' : 'unidades'} · {formatFecha(c.fecha)}
                    </Text>
                  </View>
                  <Text style={styles.filaTotal}>{formatoPrecio(c.total)}</Text>
                  <TouchableOpacity style={styles.btnEliminar} onPress={() => confirmarEliminar(c)}>
                    <Text>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={abrirNueva}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Nueva compra</Text>

            <Text style={styles.label}>¿Qué se adquirió?</Text>
            <TextInput
              style={styles.input}
              value={form.nombre}
              onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
              placeholder="Ej: Choclitos, gaseosas, pan..."
              placeholderTextColor="#bbb"
            />

            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              style={styles.input}
              value={form.cantidad}
              onChangeText={v => setForm(f => ({ ...f, cantidad: v }))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.label}>Total pagado ($)</Text>
            <TextInput
              style={styles.input}
              value={form.total}
              onChangeText={v => setForm(f => ({ ...f, total: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#bbb"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal(false)}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
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
  headerTitulo: { color: '#fff', fontSize: 25, fontWeight: 'bold', marginBottom: 10 },
  totalBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, alignItems: 'center' },
  totalLabel: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  totalMonto: { color: '#f44336', fontSize: 30, fontWeight: 'bold' },
  totalSub: { color: '#888', fontSize: 13, marginTop: 2 },
  vacio: { alignItems: 'center', padding: 30, marginTop: 20 },
  vacioEmoji: { fontSize: 48, marginBottom: 8 },
  vacioTexto: { fontSize: 18, color: '#666', marginBottom: 6, textAlign: 'center' },
  vacioSub: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 21 },
  mesEncabezado: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, marginBottom: 8, paddingHorizontal: 4,
  },
  mesTitulo: { fontSize: 18, fontWeight: '700', color: '#222' },
  mesTotal: { fontSize: 16, fontWeight: 'bold', color: '#f44336' },
  fila: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
  },
  filaInfo: { flex: 1 },
  filaNombre: { fontSize: 17, fontWeight: '600', color: '#222' },
  filaSub: { fontSize: 14, color: '#999', marginTop: 2 },
  filaTotal: { fontSize: 18, fontWeight: 'bold', color: '#f44336', marginRight: 6 },
  btnEliminar: { padding: 6 },
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
