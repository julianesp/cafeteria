import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Modal, ScrollView, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar } from '../utils/alerta';

export default function VentaScreen() {
  const {
    productos, carrito, clientes, agregarAlCarrito, quitarDelCarrito,
    limpiarCarrito, registrarVenta, totalCarrito, agregarCliente,
    clienteParaFiar, setClienteParaFiar,
  } = useVentas();
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFiadoVisible, setModalFiadoVisible] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [registrandoCliente, setRegistrandoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nombre: '', tipo: 'Estudiante', telefono: '57' });

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const cantidadEnCarrito = (id) => {
    const item = carrito.find(i => i.id === id);
    return item ? item.cantidad : 0;
  };

  const confirmarVenta = () => {
    if (carrito.length === 0) {
      avisar('Carrito vacío', 'Agrega productos antes de cobrar.');
      return;
    }
    setClienteSeleccionado(null);
    setModalVisible(true);
  };

  const NOMBRES_METODO = { efectivo: 'Efectivo' };

  const finalizarPago = async (metodo) => {
    const total = totalCarrito;
    await registrarVenta(null, metodo);
    setModalVisible(false);
    avisar('¡Venta registrada!', `Total cobrado: ${formatoPrecio(total)} (${NOMBRES_METODO[metodo]})`);
  };

  const abrirSeleccionCliente = () => {
    setBusquedaCliente('');
    setRegistrandoCliente(false);
    setModalVisible(false);
    setModalFiadoVisible(true);
  };

  const confirmarFiado = async () => {
    if (!clienteSeleccionado) {
      avisar('Sin cliente', 'Selecciona un cliente para fiar.');
      return;
    }
    const total = totalCarrito;
    await registrarVenta(clienteSeleccionado.id);
    setModalFiadoVisible(false);
    setClienteSeleccionado(null);
    avisar('¡Fiado registrado!', `${formatoPrecio(total)} cargado a ${clienteSeleccionado.nombre}`);
  };

  // Fiado directo cuando se llegó desde la pestaña Fiados con el cliente ya elegido
  const confirmarFiadoDirecto = async () => {
    const total = totalCarrito;
    const nombre = clienteParaFiar.nombre;
    await registrarVenta(clienteParaFiar.id);
    setModalVisible(false);
    setClienteParaFiar(null);
    avisar('¡Fiado registrado!', `${formatoPrecio(total)} cargado a ${nombre}`);
  };

  // Registrar un cliente nuevo sin salir del cobro (el carrito no se pierde)
  const abrirRegistroCliente = () => {
    setFormCliente({ nombre: busquedaCliente.trim(), tipo: 'Estudiante', telefono: '57' });
    setRegistrandoCliente(true);
  };

  const guardarNuevoCliente = async () => {
    if (!formCliente.nombre.trim()) return avisar('Error', 'El nombre es obligatorio.');
    const nuevo = await agregarCliente({
      nombre: formCliente.nombre.trim(),
      tipo: formCliente.tipo,
      telefono: formCliente.telefono.trim(),
    });
    setClienteSeleccionado(nuevo);
    setRegistrandoCliente(false);
    setBusquedaCliente('');
  };

  return (
    <View style={styles.container}>
      {clienteParaFiar && (
        <View style={styles.bannerFiando}>
          <Text style={styles.bannerFiandoTexto}>📋 Fiando a: {clienteParaFiar.nombre}</Text>
          <TouchableOpacity onPress={() => setClienteParaFiar(null)} style={styles.bannerFiandoBtn}>
            <Text style={styles.bannerFiandoBtnTexto}>✕ Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
      <TextInput
        style={styles.buscador}
        placeholder="Buscar producto..."
        value={busqueda}
        onChangeText={setBusqueda}
        placeholderTextColor="#999"
      />

      {productos.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTexto}>No hay productos registrados.</Text>
          <Text style={styles.vacioSub}>Ve a "Productos" para agregar.</Text>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.fila}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => {
            const cant = cantidadEnCarrito(item.id);
            return (
              <View style={styles.tarjeta}>
                {item.foto
                  ? <Image source={{ uri: item.foto }} style={styles.fotoTarjeta} />
                  : <Text style={styles.emoji}>{item.emoji || '🍽️'}</Text>
                }
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.precio}>{formatoPrecio(item.precio)}</Text>
                <View style={styles.controles}>
                  <TouchableOpacity style={styles.btnMenos} onPress={() => quitarDelCarrito(item.id)}>
                    <Text style={styles.btnTexto}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.cantidad}>{cant}</Text>
                  <TouchableOpacity style={styles.btnMas} onPress={() => agregarAlCarrito(item)}>
                    <Text style={styles.btnTexto}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {carrito.length > 0 && (
        <View style={styles.barraInferior}>
          <View>
            <Text style={styles.itemsTexto}>{carrito.reduce((s, i) => s + i.cantidad, 0)} items</Text>
            <Text style={styles.totalTexto}>Total: {formatoPrecio(totalCarrito)}</Text>
          </View>
          <View style={styles.botonesBar}>
            <TouchableOpacity style={styles.btnCancelar} onPress={limpiarCarrito}>
              <Text style={styles.btnCancelarTexto}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCobrar, clienteParaFiar && styles.btnCobrarFiado]}
              onPress={confirmarVenta}
            >
              <Text style={styles.btnCobrarTexto}>{clienteParaFiar ? 'Fiar' : 'Cobrar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal resumen / elegir forma de pago */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Resumen de venta</Text>
            <ScrollView style={{ maxHeight: 180 }}>
              {carrito.map(item => (
                <View key={item.id} style={styles.modalFila}>
                  <Text style={styles.modalItem}>{item.nombre} x{item.cantidad}</Text>
                  <Text style={styles.modalSubtotal}>{formatoPrecio(item.precio * item.cantidad)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalDivider} />
            <Text style={styles.modalTotal}>Total: {formatoPrecio(totalCarrito)}</Text>

            {clienteParaFiar ? (
              <>
                <Text style={styles.formaPagoLabel}>Confirmar fiado</Text>
                <TouchableOpacity style={styles.btnFiadoDirecto} onPress={confirmarFiadoDirecto}>
                  <Text style={styles.btnFiadoDirectoTexto}>📋 Fiar a {clienteParaFiar.nombre}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formaPagoLabel}>¿Cómo se paga?</Text>
                <View style={styles.formaPagoBotones}>
                  <TouchableOpacity style={styles.btnEfectivo} onPress={() => finalizarPago('efectivo')}>
                    <Text style={styles.btnEfectivoTexto}>💵 Efectivo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnFiado} onPress={abrirSeleccionCliente}>
                    <Text style={styles.btnFiadoTexto}>📋 Fiar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#666', textAlign: 'center' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal seleccionar cliente para fiar */}
      <Modal visible={modalFiadoVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            {registrandoCliente ? (
              <>
                <Text style={styles.modalTitulo}>Registrar nuevo cliente</Text>

                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={formCliente.nombre}
                  onChangeText={v => setFormCliente(f => ({ ...f, nombre: v }))}
                  placeholder="Nombre completo"
                  placeholderTextColor="#bbb"
                  autoFocus
                />

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.tipoRow}>
                  {['Estudiante', 'Profesor'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tipoBtn, formCliente.tipo === t && styles.tipoBtnActivo]}
                      onPress={() => setFormCliente(f => ({ ...f, tipo: t }))}
                    >
                      <Text style={[styles.tipoBtnTexto, formCliente.tipo === t && styles.tipoBtnTextoActivo]}>
                        {t === 'Estudiante' ? '🎒 Estudiante' : '👨‍🏫 Profesor'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>WhatsApp (57 + número, opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={formCliente.telefono}
                  onChangeText={v => setFormCliente(f => ({ ...f, telefono: v }))}
                  placeholder="573001234567"
                  placeholderTextColor="#bbb"
                  keyboardType="phone-pad"
                />

                <View style={styles.modalBotones}>
                  <TouchableOpacity style={styles.btnModalCancelarSm} onPress={() => setRegistrandoCliente(false)}>
                    <Text style={{ color: '#666', fontSize: 16 }}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnModalConfirmar} onPress={guardarNuevoCliente}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Guardar y elegir</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitulo}>Seleccionar cliente</Text>
                <TextInput
                  style={styles.buscadorModal}
                  placeholder="Buscar cliente..."
                  value={busquedaCliente}
                  onChangeText={setBusquedaCliente}
                  placeholderTextColor="#bbb"
                />

                <TouchableOpacity style={styles.btnRegistrarCliente} onPress={abrirRegistroCliente}>
                  <Text style={styles.btnRegistrarClienteTexto}>➕ Registrar nuevo cliente</Text>
                </TouchableOpacity>

                {clientes.length === 0 ? (
                  <View style={styles.sinClientes}>
                    <Text style={styles.sinClientesTexto}>No hay clientes registrados.</Text>
                    <Text style={styles.sinClientesSub}>Toca "Registrar nuevo cliente" para agregarlo sin perder la venta.</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 220 }}>
                    {clientesFiltrados.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.filaCliente, clienteSeleccionado?.id === c.id && styles.filaClienteActiva]}
                        onPress={() => setClienteSeleccionado(c)}
                      >
                        <Text style={styles.clienteLetra}>{c.nombre[0].toUpperCase()}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clienteNombre}>{c.nombre}</Text>
                          <Text style={styles.clienteTipo}>{c.tipo}</Text>
                        </View>
                        {clienteSeleccionado?.id === c.id && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <View style={styles.modalDivider} />
                {clienteSeleccionado && (
                  <Text style={styles.fiadoResumen}>
                    Fiar {formatoPrecio(totalCarrito)} a {clienteSeleccionado.nombre}
                  </Text>
                )}
                <View style={styles.modalBotones}>
                  <TouchableOpacity style={styles.btnModalCancelarSm} onPress={() => { setModalFiadoVisible(false); setModalVisible(true); }}>
                    <Text style={{ color: '#666', fontSize: 16 }}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnModalConfirmar, !clienteSeleccionado && { opacity: 0.4 }]}
                    onPress={confirmarFiado}
                    disabled={!clienteSeleccionado}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirmar fiado</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  buscador: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    marginBottom: 12, fontSize: 18, borderWidth: 1, borderColor: '#e0e0e0',
  },
  fila: { justifyContent: 'space-between', marginBottom: 10 },
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    width: '48%', alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  emoji: { fontSize: 44, marginBottom: 4 },
  fotoTarjeta: { width: 84, height: 84, borderRadius: 10, marginBottom: 6 },
  nombre: { fontSize: 17, fontWeight: '600', textAlign: 'center', color: '#222' },
  precio: { fontSize: 15, color: '#4CAF50', fontWeight: '700', marginVertical: 4 },
  controles: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  btnMenos: { backgroundColor: '#ff6b6b', borderRadius: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  btnMas: { backgroundColor: '#4CAF50', borderRadius: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  btnTexto: { color: '#fff', fontSize: 28, fontWeight: 'bold', lineHeight: 32 },
  cantidad: { fontSize: 22, fontWeight: 'bold', marginHorizontal: 12, minWidth: 30, textAlign: 'center' },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioTexto: { fontSize: 19, color: '#666', marginBottom: 4 },
  vacioSub: { fontSize: 15, color: '#999' },
  barraInferior: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1a1a2e', padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  itemsTexto: { color: '#aaa', fontSize: 14 },
  totalTexto: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  botonesBar: { flexDirection: 'row', gap: 10 },
  btnCancelar: { backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnCancelarTexto: { color: '#fff', fontSize: 17 },
  btnCobrar: { backgroundColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  btnCobrarFiado: { backgroundColor: '#FF9800' },
  btnCobrarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  bannerFiando: {
    backgroundColor: '#fff3e0', borderRadius: 12, padding: 12, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FF9800',
  },
  bannerFiandoTexto: { color: '#e65100', fontWeight: 'bold', fontSize: 17, flex: 1 },
  bannerFiandoBtn: { padding: 6 },
  bannerFiandoBtnTexto: { color: '#e65100', fontSize: 15, fontWeight: '600' },
  btnFiadoDirecto: {
    backgroundColor: '#FF9800', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 10,
  },
  btnFiadoDirectoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  btnRegistrarCliente: {
    backgroundColor: '#e8f5e9', borderRadius: 10, padding: 13,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#4CAF50', marginBottom: 10,
  },
  btnRegistrarClienteTexto: { color: '#2e7d32', fontWeight: 'bold', fontSize: 16 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#222' },
  modalFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modalItem: { fontSize: 17, color: '#444' },
  modalSubtotal: { fontSize: 17, fontWeight: '600', color: '#222' },
  modalDivider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  modalTotal: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', color: '#4CAF50' },
  formaPagoLabel: { fontSize: 15, color: '#888', marginTop: 14, marginBottom: 8 },
  formaPagoBotones: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btnEfectivo: { flex: 1, backgroundColor: '#e8f5e9', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#4CAF50' },
  btnEfectivoTexto: { color: '#2e7d32', fontWeight: 'bold', fontSize: 18 },
  btnFiado: { flex: 1, backgroundColor: '#fff3e0', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FF9800' },
  btnFiadoTexto: { color: '#e65100', fontWeight: 'bold', fontSize: 18 },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  btnModalCancelar: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', marginTop: 6 },
  btnModalCancelarSm: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0' },
  btnModalConfirmar: { padding: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#FF9800' },
  buscadorModal: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 10, fontSize: 17, marginBottom: 10, color: '#222',
  },
  filaCliente: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 10, marginBottom: 6, backgroundColor: '#fafafa',
    borderWidth: 1, borderColor: '#eee',
  },
  filaClienteActiva: { backgroundColor: '#fff3e0', borderColor: '#FF9800' },
  clienteLetra: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a2e',
    color: '#fff', textAlign: 'center', lineHeight: 44, fontWeight: 'bold',
    marginRight: 10, fontSize: 20,
  },
  clienteNombre: { fontSize: 17, fontWeight: '600', color: '#222' },
  clienteTipo: { fontSize: 14, color: '#999', marginTop: 1 },
  checkmark: { fontSize: 22, color: '#FF9800', fontWeight: 'bold' },
  fiadoResumen: { fontSize: 17, color: '#e65100', textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  sinClientes: { padding: 20, alignItems: 'center' },
  sinClientesTexto: { fontSize: 17, color: '#666' },
  sinClientesSub: { fontSize: 14, color: '#999', marginTop: 4 },
});
