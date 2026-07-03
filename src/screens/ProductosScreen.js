import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ScrollView, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

const EMOJIS = ['🫓', '🥐', '☕', '🥟', '🍩'];

export default function ProductosScreen() {
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useVentas();
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', precio: '', emoji: '☕', foto: null });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', precio: '', emoji: '☕', foto: null });
    setModalVisible(true);
  };

  const abrirEditar = (producto) => {
    setEditando(producto.id);
    setForm({
      nombre: producto.nombre,
      precio: String(producto.precio),
      emoji: producto.emoji || '☕',
      foto: producto.foto || null,
    });
    setModalVisible(true);
  };

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      avisar('Permiso denegado', 'Se necesita acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setForm(f => ({ ...f, foto: result.assets[0].uri }));
    }
  };

  const elegirDeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      avisar('Permiso denegado', 'Se necesita acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setForm(f => ({ ...f, foto: result.assets[0].uri }));
    }
  };

  const mostrarOpcionesFoto = () => {
    // En web no hay cámara ni Alert con botones: se abre directo el selector de archivos
    if (Platform.OS === 'web') {
      elegirDeGaleria();
      return;
    }
    Alert.alert('Foto del producto', 'Elige una opción', [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirDeGaleria },
      form.foto ? { text: 'Quitar foto', style: 'destructive', onPress: () => setForm(f => ({ ...f, foto: null })) } : null,
      { text: 'Cancelar', style: 'cancel' },
    ].filter(Boolean));
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return avisar('Error', 'El nombre es obligatorio.');
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) return avisar('Error', 'Ingresa un precio válido.');

    const datos = { nombre: form.nombre.trim(), precio, emoji: form.emoji, foto: form.foto };
    if (editando) {
      await editarProducto(editando, datos);
    } else {
      await agregarProducto(datos);
    }
    setModalVisible(false);
  };

  const confirmarEliminar = async (id, nombre) => {
    const ok = await confirmar('Eliminar', `¿Eliminar "${nombre}"?`, 'Eliminar', true);
    if (ok) await eliminarProducto(id);
  };

  return (
    <View style={styles.container}>
      {productos.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioEmoji}>🛒</Text>
          <Text style={styles.vacioTexto}>Sin productos aún</Text>
          <Text style={styles.vacioSub}>Toca "+" para agregar el primero</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <View style={styles.fila}>
              {item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.fotoItem} />
              ) : (
                <Text style={styles.emojiItem}>{item.emoji || '🍽️'}</Text>
              )}
              <View style={styles.info}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.precio}>{formatoPrecio(item.precio)}</Text>
              </View>
              <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEditar(item)}>
                <Text style={styles.btnEditarTexto}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnEliminar} onPress={() => confirmarEliminar(item.id, item.nombre)}>
                <Text style={styles.btnEliminarTexto}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={abrirNuevo}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>{editando ? 'Editar producto' : 'Nuevo producto'}</Text>

              {/* Foto */}
              <Text style={styles.label}>Foto</Text>
              <TouchableOpacity style={styles.fotoSelector} onPress={mostrarOpcionesFoto}>
                {form.foto ? (
                  <Image source={{ uri: form.foto }} style={styles.fotoPreview} />
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <Text style={styles.fotoPlaceholderEmoji}>📷</Text>
                    <Text style={styles.fotoPlaceholderTexto}>Toca para agregar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {form.foto && (
                <View style={styles.fotoAcciones}>
                  <TouchableOpacity onPress={mostrarOpcionesFoto} style={styles.btnCambiarFoto}>
                    <Text style={styles.btnCambiarFotoTexto}>Cambiar foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setForm(f => ({ ...f, foto: null }))} style={styles.btnCambiarFoto}>
                    <Text style={styles.btnQuitarFotoTexto}>Quitar foto</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={form.nombre}
                onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
                placeholder="Ej: Café con leche"
                placeholderTextColor="#bbb"
              />

              <Text style={styles.label}>Precio ($)</Text>
              <TextInput
                style={styles.input}
                value={form.precio}
                onChangeText={v => setForm(f => ({ ...f, precio: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#bbb"
              />

              {!form.foto && (
                <>
                  <Text style={styles.label}>Ícono (si no hay foto)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
                    {EMOJIS.map(e => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.emojiBtn, form.emoji === e && styles.emojiBtnActivo]}
                        onPress={() => setForm(f => ({ ...f, emoji: e }))}
                      >
                        <Text style={styles.emojiOpcion}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.btnModalCancelar} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: '#666' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnModalGuardar} onPress={guardar}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioEmoji: { fontSize: 48, marginBottom: 8 },
  vacioTexto: { fontSize: 22, fontWeight: '600', color: '#444' },
  vacioSub: { fontSize: 17, color: '#999', marginTop: 4 },
  fila: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,
  },
  fotoItem: { width: 58, height: 58, borderRadius: 10, marginRight: 12 },
  emojiItem: { fontSize: 32, marginRight: 12 },
  info: { flex: 1 },
  nombre: { fontSize: 18, fontWeight: '600', color: '#222' },
  precio: { fontSize: 15, color: '#4CAF50', fontWeight: '700', marginTop: 2 },
  btnEditar: { padding: 8 },
  btnEditarTexto: { fontSize: 22 },
  btnEliminar: { padding: 8 },
  btnEliminarTexto: { fontSize: 22 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#4CAF50', width: 66, height: 66,
    borderRadius: 33, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
  },
  fabTexto: { color: '#fff', fontSize: 34, fontWeight: 'bold', lineHeight: 38 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#222' },
  label: { fontSize: 15, color: '#666', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 18, color: '#222', backgroundColor: '#fafafa',
  },
  fotoSelector: { marginTop: 4 },
  fotoPreview: { width: '100%', height: 160, borderRadius: 12 },
  fotoPlaceholder: {
    height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#e0e0e0',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  fotoPlaceholderEmoji: { fontSize: 36, marginBottom: 6 },
  fotoPlaceholderTexto: { fontSize: 15, color: '#bbb' },
  fotoAcciones: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  btnCambiarFoto: { alignItems: 'center', marginTop: 6 },
  btnCambiarFotoTexto: { color: '#4CAF50', fontSize: 15, fontWeight: '600' },
  btnQuitarFotoTexto: { color: '#f44336', fontSize: 15, fontWeight: '600' },
  emojiScroll: { marginTop: 4, marginBottom: 8 },
  emojiBtn: { padding: 8, borderRadius: 10, marginRight: 6 },
  emojiBtnActivo: { backgroundColor: '#e8f5e9', borderWidth: 2, borderColor: '#4CAF50' },
  emojiOpcion: { fontSize: 28 },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  btnModalCancelar: { padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0' },
  btnModalGuardar: { padding: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#4CAF50' },
});
