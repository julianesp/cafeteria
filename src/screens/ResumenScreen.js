import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useVentas } from '../context/VentasContext';
import { formatoPrecio } from '../utils/formato';
import { avisar, confirmar } from '../utils/alerta';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function ventasDeHoy(ventas) {
  const hoy = new Date().toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
}

function ventasSemana(ventas) {
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  return ventas.filter(v => new Date(v.fecha) >= hace7);
}

// Lunes de la semana a la que pertenece la fecha (semana lunes-domingo).
function inicioSemana(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

// Agrupa las ventas por día, semana o mes y devuelve una lista ordenada
// del periodo más reciente al más antiguo, con total y cantidad de ventas.
function agruparVentas(ventas, modo) {
  const grupos = {};
  ventas.forEach(v => {
    const fecha = new Date(v.fecha);
    let clave, orden, titulo, subtitulo;

    if (modo === 'dia') {
      fecha.setHours(0, 0, 0, 0);
      clave = fecha.toDateString();
      orden = fecha.getTime();
      titulo = `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
      subtitulo = `${fecha.getFullYear()}`;
    } else if (modo === 'semana') {
      const ini = inicioSemana(fecha);
      const fin = new Date(ini);
      fin.setDate(fin.getDate() + 6);
      clave = ini.toDateString();
      orden = ini.getTime();
      titulo = `${ini.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0, 3)}`;
      subtitulo = `Semana de ${ini.getFullYear()}`;
    } else {
      clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      orden = fecha.getFullYear() * 12 + fecha.getMonth();
      titulo = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
      subtitulo = null;
    }

    if (!grupos[clave]) grupos[clave] = { clave, orden, titulo, subtitulo, total: 0, cantidad: 0 };
    grupos[clave].total += v.total;
    grupos[clave].cantidad += 1;
  });
  return Object.values(grupos).sort((a, b) => b.orden - a.orden);
}

function productosMasVendidos(ventas) {
  const conteo = {};
  ventas.forEach(v => {
    (v.items || []).forEach(i => {
      // Ventas antiguas pueden no traer cantidad: contar al menos 1.
      const cant = i.cantidad || 1;
      if (!conteo[i.nombre]) conteo[i.nombre] = { nombre: i.nombre, emoji: i.emoji || '🍽️', cantidad: 0, total: 0 };
      conteo[i.nombre].cantidad += cant;
      conteo[i.nombre].total += i.precio * cant;
    });
  });
  return Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
}

// Filtra las ventas al periodo elegido, coherente con el selector del desglose.
function ventasDelPeriodo(ventas, modo) {
  const ahora = new Date();
  if (modo === 'dia') {
    return ventas.filter(v => new Date(v.fecha).toDateString() === ahora.toDateString());
  }
  if (modo === 'semana') {
    const ini = inicioSemana(ahora);
    return ventas.filter(v => new Date(v.fecha) >= ini);
  }
  // mes
  return ventas.filter(v => {
    const f = new Date(v.fecha);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  });
}

export default function ResumenScreen() {
  const { ventas, gastos, exportarDatos, importarDatos } = useVentas();
  const [vistaPeriodo, setVistaPeriodo] = useState('dia');

  const hoy = ventasDeHoy(ventas);
  const semana = ventasSemana(ventas);
  const totalHoy = hoy.reduce((s, v) => s + v.total, 0);
  const totalSemana = semana.reduce((s, v) => s + v.total, 0);
  const totalGeneral = ventas.reduce((s, v) => s + v.total, 0);
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const balance = totalGeneral - totalGastos;
  const desglose = agruparVentas(ventas, vistaPeriodo);
  const masVendidos = productosMasVendidos(ventasDelPeriodo(ventas, vistaPeriodo));
  const ETIQUETA_PERIODO = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' };

  const exportarRespaldo = async () => {
    try {
      const json = exportarDatos();
      const nombre = `respaldo-cafeteria-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(url);
      } else {
        const { File, Paths } = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const archivo = new File(Paths.cache, nombre);
        if (archivo.exists) archivo.delete();
        archivo.create();
        archivo.write(json);
        await Sharing.shareAsync(archivo.uri, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo' });
      }
    } catch (e) {
      avisar('Error', 'No se pudo exportar el respaldo.');
    }
  };

  const importarRespaldo = async () => {
    const ok = await confirmar(
      'Importar respaldo',
      'Esto reemplazará TODOS los datos actuales (productos, ventas, clientes y gastos). ¿Continuar?',
      'Importar',
      true
    );
    if (!ok) return;
    try {
      let texto = null;
      if (Platform.OS === 'web') {
        texto = await new Promise(resolve => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.onchange = () => {
            const archivo = input.files && input.files[0];
            if (!archivo) return resolve(null);
            archivo.text().then(resolve);
          };
          input.click();
        });
      } else {
        const DocumentPicker = require('expo-document-picker');
        const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
        if (resultado.canceled) return;
        const { File } = require('expo-file-system');
        texto = await new File(resultado.assets[0].uri).text();
      }
      if (!texto) return;
      const resumen = await importarDatos(texto);
      avisar('Respaldo importado', `Se restauraron ${resumen.productos} productos, ${resumen.ventas} ventas y ${resumen.clientes} clientes.`);
    } catch (e) {
      avisar('Error al importar', e.message || 'No se pudo leer el archivo.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.encabezado}>
        <Text style={styles.encabezadoTexto}>Resumen</Text>
      </View>

      <View style={styles.tarjetasRow}>
        <View style={[styles.tarjeta, styles.tarjetaVerde]}>
          <Text style={styles.tarjetaLabel}>Hoy</Text>
          <Text style={styles.tarjetaValor}>{formatoPrecio(totalHoy)}</Text>
          <Text style={styles.tarjetaSub}>{hoy.length} ventas</Text>
        </View>
        <View style={[styles.tarjeta, styles.tarjetaAzul]}>
          <Text style={styles.tarjetaLabel}>Esta semana</Text>
          <Text style={styles.tarjetaValor}>{formatoPrecio(totalSemana)}</Text>
          <Text style={styles.tarjetaSub}>{semana.length} ventas</Text>
        </View>
      </View>

      <View style={[styles.tarjeta, styles.tarjetaOscura, { marginHorizontal: 12 }]}>
        <Text style={[styles.tarjetaLabel, { color: '#aaa' }]}>Total acumulado</Text>
        <Text style={[styles.tarjetaValor, { fontSize: 32, color: '#fff' }]}>{formatoPrecio(totalGeneral)}</Text>
        <Text style={styles.tarjetaSub}>{ventas.length} ventas totales</Text>
      </View>

      <View style={styles.tarjetasRow}>
        <View style={[styles.tarjeta, styles.tarjetaRoja]}>
          <Text style={styles.tarjetaLabel}>Gastos totales</Text>
          <Text style={[styles.tarjetaValor, { color: '#c62828' }]}>{formatoPrecio(totalGastos)}</Text>
          <Text style={styles.tarjetaSub}>{gastos.length} gastos</Text>
        </View>
        <View style={[styles.tarjeta, styles.tarjetaAmarilla]}>
          <Text style={styles.tarjetaLabel}>Balance</Text>
          <Text style={[styles.tarjetaValor, balance < 0 && { color: '#c62828' }]}>{formatoPrecio(balance)}</Text>
          <Text style={styles.tarjetaSub}>ventas − gastos</Text>
        </View>
      </View>

      <Text style={styles.seccionTitulo}>¿Cuándo se vendió?</Text>

      <View style={styles.selectorRow}>
        {[
          { clave: 'dia', etiqueta: 'Por día' },
          { clave: 'semana', etiqueta: 'Por semana' },
          { clave: 'mes', etiqueta: 'Por mes' },
        ].map(op => (
          <TouchableOpacity
            key={op.clave}
            style={[styles.selectorBtn, vistaPeriodo === op.clave && styles.selectorBtnActivo]}
            onPress={() => setVistaPeriodo(op.clave)}
          >
            <Text style={[styles.selectorTexto, vistaPeriodo === op.clave && styles.selectorTextoActivo]}>
              {op.etiqueta}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {desglose.length === 0 ? (
        <View style={styles.sinDatos}>
          <Text style={styles.sinDatosTexto}>Sin ventas registradas aún</Text>
        </View>
      ) : (
        desglose.map(g => (
          <View key={g.clave} style={styles.periodoFila}>
            <View style={styles.periodoInfo}>
              <Text style={styles.periodoTitulo}>{g.titulo}</Text>
              <Text style={styles.periodoSub}>
                {g.cantidad} {g.cantidad === 1 ? 'venta' : 'ventas'}
                {g.subtitulo ? ` · ${g.subtitulo}` : ''}
              </Text>
            </View>
            <Text style={styles.periodoTotal}>{formatoPrecio(g.total)}</Text>
          </View>
        ))
      )}

      <Text style={styles.seccionTitulo}>Más vendidos ({ETIQUETA_PERIODO[vistaPeriodo]})</Text>

      {masVendidos.length === 0 ? (
        <View style={styles.sinDatos}>
          <Text style={styles.sinDatosTexto}>Sin ventas en este periodo</Text>
        </View>
      ) : (
        masVendidos.map((p, i) => (
          <View key={p.nombre} style={styles.rankFila}>
            <Text style={styles.rankNum}>#{i + 1}</Text>
            <Text style={styles.rankEmoji}>{p.emoji}</Text>
            <View style={styles.rankInfo}>
              <Text style={styles.rankNombre}>{p.nombre}</Text>
              <Text style={styles.rankSub}>{p.cantidad} unidades</Text>
            </View>
            <Text style={styles.rankTotal}>{formatoPrecio(p.total)}</Text>
          </View>
        ))
      )}

      <Text style={styles.seccionTitulo}>Respaldo de datos</Text>
      <View style={styles.respaldoRow}>
        <TouchableOpacity style={styles.btnExportar} onPress={exportarRespaldo}>
          <Text style={styles.btnExportarTexto}>⬇️ Exportar respaldo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnImportar} onPress={importarRespaldo}>
          <Text style={styles.btnImportarTexto}>⬆️ Importar respaldo</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.respaldoNota}>
        Exporta un archivo con todos los datos (productos, ventas, clientes y gastos) para guardarlo
        como copia de seguridad. Al importar, los datos actuales se reemplazan por los del archivo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  encabezado: { backgroundColor: '#1a1a2e', padding: 20, paddingTop: 16 },
  encabezadoTexto: { color: '#fff', fontSize: 25, fontWeight: 'bold' },
  tarjetasRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 10 },
  tarjeta: {
    flex: 1, borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    marginBottom: 10,
  },
  tarjetaVerde: { backgroundColor: '#e8f5e9' },
  tarjetaAzul: { backgroundColor: '#e3f2fd' },
  tarjetaOscura: { backgroundColor: '#1a1a2e' },
  tarjetaRoja: { backgroundColor: '#ffebee' },
  tarjetaAmarilla: { backgroundColor: '#fffde7' },
  tarjetaLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  tarjetaValor: { fontSize: 25, fontWeight: 'bold', color: '#1a1a2e' },
  tarjetaSub: { fontSize: 14, color: '#888', marginTop: 4 },
  seccionTitulo: {
    fontSize: 19, fontWeight: '700', color: '#222',
    marginHorizontal: 12, marginTop: 8, marginBottom: 8,
  },
  sinDatos: { padding: 20, alignItems: 'center' },
  sinDatosTexto: { color: '#999', fontSize: 17 },
  selectorRow: {
    flexDirection: 'row', marginHorizontal: 12, marginBottom: 10, gap: 8,
  },
  selectorBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  selectorBtnActivo: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  selectorTexto: { fontSize: 15, fontWeight: '600', color: '#666' },
  selectorTextoActivo: { color: '#fff' },
  periodoFila: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
  },
  periodoInfo: { flex: 1 },
  periodoTitulo: { fontSize: 17, fontWeight: '600', color: '#222' },
  periodoSub: { fontSize: 14, color: '#999', marginTop: 2 },
  periodoTotal: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  rankFila: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
  },
  rankNum: { fontSize: 19, fontWeight: 'bold', color: '#bbb', width: 28 },
  rankEmoji: { fontSize: 28, marginRight: 10 },
  rankInfo: { flex: 1 },
  rankNombre: { fontSize: 17, fontWeight: '600', color: '#222' },
  rankSub: { fontSize: 14, color: '#999', marginTop: 2 },
  rankTotal: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  respaldoRow: { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 4 },
  btnExportar: {
    flex: 1, backgroundColor: '#e8f5e9', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#4CAF50',
  },
  btnExportarTexto: { color: '#2e7d32', fontWeight: 'bold', fontSize: 15 },
  btnImportar: {
    flex: 1, backgroundColor: '#e3f2fd', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#1976d2',
  },
  btnImportarTexto: { color: '#1565c0', fontWeight: 'bold', fontSize: 15 },
  respaldoNota: { fontSize: 14, color: '#999', marginHorizontal: 12, marginTop: 8, lineHeight: 17 },
});
