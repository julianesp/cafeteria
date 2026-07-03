import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function ResumenMensualScreen({ mesInicial, anioInicial, onCerrar }) {
  const { resumenMensual } = useVentas();
  const ahora = new Date();
  const [mes, setMes] = useState(mesInicial ?? (ahora.getMonth() === 0 ? 11 : ahora.getMonth() - 1));
  const [anio, setAnio] = useState(anioInicial ?? (ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear()));

  const datos = resumenMensual(mes, anio);
  const totalGeneral = datos.reduce((s, d) => s + d.totalMes, 0);
  const pendienteGeneral = datos.reduce((s, d) => s + d.pendiente, 0);

  const cambiarMes = (dir) => {
    let nuevoMes = mes + dir;
    let nuevoAnio = anio;
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio--; }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const generarMensaje = (dato) => {
    const nombreMes = MESES[mes];
    const lineas = dato.items.map(i => `  • ${i.nombre} x${i.cantidad} = ${formatoPrecio(i.subtotal)}`).join('\n');
    return (
      `Hola, le informamos el consumo de *${dato.cliente.nombre}* en la cafetería escolar durante *${nombreMes} ${anio}*:\n\n` +
      `${lineas}\n\n` +
      `*Total del mes: ${formatoPrecio(dato.totalMes)}*\n` +
      (dato.pendiente > 0 ? `*Saldo pendiente: ${formatoPrecio(dato.pendiente)}*\n` : `✅ Sin saldo pendiente\n`) +
      `\nGracias por su atención. 🙏`
    );
  };

  const enviarWhatsApp = (dato) => {
    const tel = dato.cliente.telefono?.replace(/\D/g, '');
    if (!tel) {
      avisar('Sin teléfono', `${dato.cliente.nombre} no tiene número de WhatsApp registrado.\nEdita el cliente para agregarlo.`);
      return;
    }
    const mensaje = generarMensaje(dato);
    // wa.me funciona en el teléfono (abre la app) y en el navegador (WhatsApp Web)
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch(() => {
      avisar('WhatsApp no disponible', 'Asegúrate de tener WhatsApp instalado.');
    });
  };

  const enviarTodos = async () => {
    const sinTelefono = datos.filter(d => !d.cliente.telefono);
    if (sinTelefono.length > 0) {
      const ok = await confirmar(
        'Clientes sin teléfono',
        `${sinTelefono.map(d => d.cliente.nombre).join(', ')} no tienen número registrado y serán omitidos.`,
        'Enviar a los demás'
      );
      if (ok) datos.filter(d => d.cliente.telefono).forEach(d => enviarWhatsApp(d));
    } else {
      datos.forEach(d => enviarWhatsApp(d));
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado con navegación de mes */}
      <View style={styles.header}>
        {onCerrar && (
          <TouchableOpacity onPress={onCerrar} style={styles.btnCerrarHeader}>
            <Text style={styles.btnCerrarHeaderTexto}>✕</Text>
          </TouchableOpacity>
        )}
        <View style={styles.navMes}>
          <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.btnNavMes}>
            <Text style={styles.btnNavTexto}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.tituloMes}>{MESES[mes]} {anio}</Text>
          <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.btnNavMes}>
            <Text style={styles.btnNavTexto}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalesHeader}>
          <View style={styles.totalBox}>
            <Text style={styles.totalBoxLabel}>Total consumido</Text>
            <Text style={styles.totalBoxMonto}>{formatoPrecio(totalGeneral)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalBoxLabel}>Pendiente</Text>
            <Text style={[styles.totalBoxMonto, { color: '#FF9800' }]}>{formatoPrecio(pendienteGeneral)}</Text>
          </View>
        </View>
      </View>

      {datos.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioEmoji}>📭</Text>
          <Text style={styles.vacioTexto}>Sin fiados en {MESES[mes]}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
          {datos.map(dato => (
            <View key={dato.cliente.id} style={styles.tarjeta}>
              <View style={styles.tarjetaHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetra}>{dato.cliente.nombre[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clienteNombre}>{dato.cliente.nombre}</Text>
                  <Text style={styles.clienteTipo}>{dato.cliente.tipo}</Text>
                </View>
                <View style={styles.montosDer}>
                  <Text style={styles.totalTarjeta}>{formatoPrecio(dato.totalMes)}</Text>
                  {dato.pendiente > 0
                    ? <Text style={styles.pendienteTarjeta}>Debe: {formatoPrecio(dato.pendiente)}</Text>
                    : <Text style={styles.pagadoTarjeta}>✓ Pagado</Text>
                  }
                </View>
              </View>

              <View style={styles.divider} />

              {dato.items.map((item, i) => (
                <View key={i} style={styles.itemFila}>
                  <Text style={styles.itemNombre}>{item.nombre} x{item.cantidad}</Text>
                  <Text style={styles.itemSubtotal}>{formatoPrecio(item.subtotal)}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.btnWhatsapp} onPress={() => enviarWhatsApp(dato)}>
                <Text style={styles.btnWhatsappTexto}>📲 Enviar a WhatsApp</Text>
                {dato.cliente.telefono
                  ? <Text style={styles.btnWhatsappTel}>{dato.cliente.telefono}</Text>
                  : <Text style={styles.sinTelTexto}>Sin número registrado</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {datos.length > 1 && (
        <View style={styles.barraEnviarTodos}>
          <TouchableOpacity style={styles.btnEnviarTodos} onPress={enviarTodos}>
            <Text style={styles.btnEnviarTodosTexto}>📲 Enviar a todos ({datos.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a1a2e', padding: 16, paddingTop: 12 },
  btnCerrarHeader: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  btnCerrarHeaderTexto: { color: '#aaa', fontSize: 23 },
  navMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnNavMes: { padding: 8 },
  btnNavTexto: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  tituloMes: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginHorizontal: 16, minWidth: 160, textAlign: 'center' },
  totalesHeader: { flexDirection: 'row', gap: 10 },
  totalBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, alignItems: 'center' },
  totalBoxLabel: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  totalBoxMonto: { color: '#fff', fontSize: 23, fontWeight: 'bold' },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioEmoji: { fontSize: 48, marginBottom: 8 },
  vacioTexto: { fontSize: 19, color: '#888' },
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4,
  },
  tarjetaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2e',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarLetra: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  clienteNombre: { fontSize: 18, fontWeight: '700', color: '#222' },
  clienteTipo: { fontSize: 14, color: '#999' },
  montosDer: { alignItems: 'flex-end' },
  totalTarjeta: { fontSize: 19, fontWeight: 'bold', color: '#222' },
  pendienteTarjeta: { fontSize: 14, color: '#f44336', marginTop: 2 },
  pagadoTarjeta: { fontSize: 14, color: '#4CAF50', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 8 },
  itemFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemNombre: { fontSize: 15, color: '#555' },
  itemSubtotal: { fontSize: 15, fontWeight: '600', color: '#222' },
  btnWhatsapp: {
    marginTop: 10, backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#4CAF50',
  },
  btnWhatsappTexto: { fontSize: 17, fontWeight: '600', color: '#2e7d32' },
  btnWhatsappTel: { fontSize: 14, color: '#4CAF50' },
  sinTelTexto: { fontSize: 14, color: '#f44336' },
  barraEnviarTodos: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 12,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  btnEnviarTodos: {
    backgroundColor: '#25D366', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  btnEnviarTodosTexto: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
