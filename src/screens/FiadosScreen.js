import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import ResumenMensualScreen from './ResumenMensualScreen';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export default function FiadosScreen({ navigation }) {
  const { clientes, agregarCliente, editarCliente, eliminarCliente, registrarAbono, deudaTotalCliente, setClienteParaFiar } = useVentas();

  const [modalCliente, setModalCliente] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalAbono, setModalAbono] = useState(false);
  const [modalResumen, setModalResumen] = useState(false);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [deudaActiva, setDeudaActiva] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ nombre: '', tipo: 'Estudiante', telefono: '' });

  const totalDeudaGeneral = clientes.reduce((s, c) => s + deudaTotalCliente(c.id), 0);

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Lleva a la pantalla de venta con el cliente ya elegido para fiarle
  const fiarACliente = (cliente) => {
    setClienteParaFiar(cliente);
    setModalDetalle(false);
    navigation.navigate('Venta');
  };

  const abrirNuevoCliente = () => {
    setEditandoId(null);
    setForm({ nombre: '', tipo: 'Estudiante', telefono: '57' });
    setModalCliente(true);
  };

  const abrirEditarCliente = (cliente) => {
    setEditandoId(cliente.id);
    setForm({ nombre: cliente.nombre, tipo: cliente.tipo, telefono: cliente.telefono || '57' });
    setModalCliente(true);
  };

  const guardarCliente = async () => {
    if (!form.nombre.trim()) return avisar('Error', 'El nombre es obligatorio.');
    const datos = { nombre: form.nombre.trim(), tipo: form.tipo, telefono: form.telefono.trim() };
    if (editandoId) {
      await editarCliente(editandoId, datos);
    } else {
      await agregarCliente(datos);
    }
    setModalCliente(false);
  };

  const confirmarEliminar = async (id, nombre) => {
    const ok = await confirmar(
      'Eliminar cliente',
      `¿Eliminar a "${nombre}"? Se borrará todo su historial de deudas.`,
      'Eliminar',
      true
    );
    if (ok) await eliminarCliente(id);
  };

  const abrirDetalle = (cliente) => {
    setClienteActivo(cliente);
    setModalDetalle(true);
  };

  const abrirAbono = (deuda) => {
    setDeudaActiva(deuda);
    setMontoAbono('');
    setModalAbono(true);
  };

  const confirmarAbono = async () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) return avisar('Error', 'Ingresa un monto válido.');
    if (monto > deudaActiva.saldoPendiente) return avisar('Error', 'El abono supera el saldo pendiente.');
    await registrarAbono(clienteActivo.id, deudaActiva.id, monto);
    setModalAbono(false);
    setMontoAbono('');
  };

  const clienteActualizado = clienteActivo ? clientes.find(c => c.id === clienteActivo.id) : null;

  if (modalResumen) {
    return <ResumenMensualScreen onCerrar={() => setModalResumen(false)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.resumen}>
        <Text style={styles.resumenLabel}>Total en fiados</Text>
        <Text style={styles.resumenTotal}>{formatoPrecio(totalDeudaGeneral)}</Text>
        <Text style={styles.resumenSub}>{clientes.length} clientes registrados</Text>
        <TouchableOpacity style={styles.btnResumenMensual} onPress={() => setModalResumen(true)}>
          <Text style={styles.btnResumenMensualTexto}>📊 Ver resumen mensual</Text>
        </TouchableOpacity>
      </View>

      {clientes.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioEmoji}>👤</Text>
          <Text style={styles.vacioTexto}>Sin clientes aún</Text>
          <Text style={styles.vacioSub}>Toca "+" para agregar estudiantes o profesores</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.buscador}
            placeholder="🔍 Buscar niñ@ o profesor..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor="#999"
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 90 }}
            ListEmptyComponent={
              <Text style={styles.sinResultados}>No se encontró "{busqueda}"</Text>
            }
            renderItem={({ item }) => {
              const deuda = deudaTotalCliente(item.id);
              return (
                <TouchableOpacity style={styles.fila} onPress={() => abrirDetalle(item)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetra}>{item.nombre[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <Text style={styles.tipo}>{item.tipo}</Text>
                    <Text style={[styles.deuda, deuda > 0 ? styles.deudaRoja : styles.deudaVerde]}>
                      {deuda > 0 ? `Debe ${formatoPrecio(deuda)}` : '✓ Al día'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.btnFiarFila} onPress={() => fiarACliente(item)}>
                    <Text style={styles.btnFiarFilaTexto}>🛒 Fiar</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      <TouchableOpacity style={styles.fab} onPress={abrirNuevoCliente}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      {/* Modal nuevo/editar cliente */}
      <Modal visible={modalCliente} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>{editandoId ? 'Editar cliente' : 'Nuevo cliente'}</Text>
              <TouchableOpacity style={styles.btnX} onPress={() => setModalCliente(false)}>
                <Text style={styles.btnXTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={form.nombre}
              onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
              placeholder="Nombre completo"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoRow}>
              {['Estudiante', 'Profesor'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoBtn, form.tipo === t && styles.tipoBtnActivo]}
                  onPress={() => setForm(f => ({ ...f, tipo: t }))}
                >
                  <Text style={[styles.tipoBtnTexto, form.tipo === t && styles.tipoBtnTextoActivo]}>
                    {t === 'Estudiante' ? '🎒 Estudiante' : '👨‍🏫 Profesor'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>WhatsApp (código Colombia 57 + número, ej: 573001234567)</Text>
            <TextInput
              style={styles.input}
              value={form.telefono}
              onChangeText={v => setForm(f => ({ ...f, telefono: v }))}
              placeholder="573001234567"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.btnCancelarModal} onPress={() => setModalCliente(false)}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarCliente}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal detalle de cliente */}
      <Modal visible={modalDetalle} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            {clienteActualizado && (
              <>
                <View style={styles.detalleHeader}>
                  <View style={styles.avatarGrande}>
                    <Text style={styles.avatarLetraGrande}>{clienteActualizado.nombre[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalTitulo}>{clienteActualizado.nombre}</Text>
                    <Text style={styles.detalleTipo}>{clienteActualizado.tipo}</Text>
                    {clienteActualizado.telefono ? <Text style={styles.detalleTel}>📱 {clienteActualizado.telefono}</Text> : null}
                  </View>
                </View>

                <View style={styles.deudaResumen}>
                  <Text style={styles.deudaResumenLabel}>Saldo total pendiente</Text>
                  <Text style={[styles.deudaResumenMonto, deudaTotalCliente(clienteActualizado.id) > 0 ? styles.deudaRoja : styles.deudaVerde]}>
                    {formatoPrecio(deudaTotalCliente(clienteActualizado.id))}
                  </Text>
                </View>

                <Text style={styles.seccionLabel}>Deudas</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {(clienteActualizado.deudas || []).length === 0 ? (
                    <Text style={styles.sinDeudas}>Sin deudas registradas</Text>
                  ) : (
                    (clienteActualizado.deudas || []).map(d => (
                      <View key={d.id} style={styles.deudaItem}>
                        <View style={styles.deudaItemHeader}>
                          <Text style={styles.deudaFecha}>{formatFecha(d.fecha)}</Text>
                          <View style={styles.deudaMontos}>
                            <Text style={styles.deudaOriginal}>Total: {formatoPrecio(d.monto)}</Text>
                            <Text style={[styles.deudaPendiente, d.saldoPendiente > 0 ? styles.deudaRoja : styles.deudaVerde]}>
                              Pendiente: {formatoPrecio(d.saldoPendiente)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.deudaProductos}>
                          {d.items.map(i => `${i.nombre} x${i.cantidad}`).join(', ')}
                        </Text>
                        {d.abonos.length > 0 && (
                          <View style={styles.abonosLista}>
                            {d.abonos.map(a => (
                              <Text key={a.id} style={styles.abonoItem}>
                                ✓ Abono {formatoPrecio(a.monto)} — {formatFecha(a.fecha)}
                              </Text>
                            ))}
                          </View>
                        )}
                        {d.saldoPendiente > 0 && (
                          <TouchableOpacity style={styles.btnAbono} onPress={() => abrirAbono(d)}>
                            <Text style={styles.btnAbonoTexto}>+ Registrar abono</Text>
                          </TouchableOpacity>
                        )}
                        {d.saldoPendiente === 0 && (
                          <Text style={styles.pagadoTag}>✓ Pagado</Text>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.btnFiarGrande} onPress={() => fiarACliente(clienteActualizado)}>
                  <Text style={styles.btnFiarGrandeTexto}>🛒 Fiar productos</Text>
                </TouchableOpacity>
                <View style={styles.accionesDetalle}>
                  <TouchableOpacity style={styles.btnAccion} onPress={() => { setModalDetalle(false); abrirEditarCliente(clienteActualizado); }}>
                    <Text style={styles.btnAccionTexto}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnAccion} onPress={() => { setModalDetalle(false); confirmarEliminar(clienteActualizado.id, clienteActualizado.nombre); }}>
                    <Text style={[styles.btnAccionTexto, { color: '#c62828' }]}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.btnCerrar} onPress={() => setModalDetalle(false)}>
              <Text style={styles.btnCerrarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal registrar abono */}
      <Modal visible={modalAbono} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Registrar abono</Text>
            {deudaActiva && (
              <Text style={styles.abonoInfo}>
                Saldo pendiente: {formatoPrecio(deudaActiva.saldoPendiente)}
              </Text>
            )}
            <Text style={styles.label}>Monto del abono ($)</Text>
            <TextInput
              style={styles.input}
              value={montoAbono}
              onChangeText={setMontoAbono}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#bbb"
              autoFocus
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.btnCancelarModal} onPress={() => setModalAbono(false)}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={confirmarAbono}>
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
  resumen: { backgroundColor: '#1a1a2e', padding: 20, alignItems: 'center' },
  resumenLabel: { color: '#aaa', fontSize: 15 },
  resumenTotal: { color: '#FF9800', fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  resumenSub: { color: '#666', fontSize: 14 },
  btnResumenMensual: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  btnResumenMensualTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioEmoji: { fontSize: 48, marginBottom: 8 },
  vacioTexto: { fontSize: 22, fontWeight: '600', color: '#444' },
  vacioSub: { fontSize: 15, color: '#999', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  fila: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8,
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2e',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarLetra: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  info: { flex: 1 },
  nombre: { fontSize: 18, fontWeight: '600', color: '#222' },
  tipo: { fontSize: 14, color: '#999', marginTop: 1 },
  deuda: { fontSize: 17, fontWeight: 'bold', marginTop: 2 },
  deudaRoja: { color: '#f44336' },
  deudaVerde: { color: '#4CAF50' },
  buscador: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginHorizontal: 12, marginTop: 10, fontSize: 18,
    borderWidth: 1, borderColor: '#e0e0e0', color: '#222',
  },
  sinResultados: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 30 },
  btnFiarFila: {
    backgroundColor: '#FF9800', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16, marginLeft: 8,
  },
  btnFiarFilaTexto: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  btnFiarGrande: {
    backgroundColor: '#FF9800', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 12,
  },
  btnFiarGrandeTexto: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  accionesDetalle: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnAccion: {
    flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  btnAccionTexto: { fontSize: 16, color: '#444', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#FF9800', width: 66, height: 66,
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
  tipoRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  tipoBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: '#fafafa',
  },
  tipoBtnActivo: { borderColor: '#FF9800', backgroundColor: '#fff3e0' },
  tipoBtnTexto: { fontSize: 17, color: '#666' },
  tipoBtnTextoActivo: { color: '#e65100', fontWeight: '600' },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  btnCancelarModal: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0' },
  btnGuardar: { padding: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#FF9800' },
  detalleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarGrande: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#1a1a2e',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetraGrande: { color: '#fff', fontWeight: 'bold', fontSize: 25 },
  detalleTipo: { fontSize: 15, color: '#999' },
  detalleTel: { fontSize: 14, color: '#4CAF50', marginTop: 2 },
  deudaResumen: {
    backgroundColor: '#fff8f0', borderRadius: 10, padding: 12,
    marginBottom: 12, alignItems: 'center',
  },
  deudaResumenLabel: { fontSize: 14, color: '#888' },
  deudaResumenMonto: { fontSize: 28, fontWeight: 'bold', marginTop: 2 },
  seccionLabel: { fontSize: 15, color: '#888', marginBottom: 6, fontWeight: '600' },
  sinDeudas: { color: '#bbb', textAlign: 'center', paddingVertical: 20 },
  deudaItem: {
    backgroundColor: '#fafafa', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#eee',
  },
  deudaItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  deudaFecha: { fontSize: 15, fontWeight: '600', color: '#555' },
  deudaMontos: { alignItems: 'flex-end' },
  deudaOriginal: { fontSize: 14, color: '#888' },
  deudaPendiente: { fontSize: 15, fontWeight: 'bold' },
  deudaProductos: { fontSize: 14, color: '#888', marginBottom: 6 },
  abonosLista: { marginBottom: 6 },
  abonoItem: { fontSize: 14, color: '#4CAF50', marginBottom: 2 },
  btnAbono: {
    backgroundColor: '#fff3e0', borderRadius: 8, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#FF9800',
  },
  btnAbonoTexto: { color: '#e65100', fontWeight: '600', fontSize: 15 },
  pagadoTag: { color: '#4CAF50', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  abonoInfo: { fontSize: 17, color: '#e65100', fontWeight: '600', marginBottom: 8 },
  btnCerrar: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  btnCerrarTexto: { fontSize: 18, color: '#444', fontWeight: '600' },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  btnX: {
    backgroundColor: '#f0f0f0', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  btnXTexto: { fontSize: 18, color: '#444', fontWeight: 'bold' },
});
