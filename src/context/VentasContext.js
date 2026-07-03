import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VentasContext = createContext();

export function VentasProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [compras, setCompras] = useState([]);
  // Cliente elegido desde la lista de Fiados para registrarle productos directamente
  const [clienteParaFiar, setClienteParaFiar] = useState(null);
  const [alertaMensual, setAlertaMensual] = useState(false);
  const [mesCerrado, setMesCerrado] = useState(null); // { mes, anio }

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const prodGuardados = await AsyncStorage.getItem('productos');
      const ventasGuardadas = await AsyncStorage.getItem('ventas');
      const clientesGuardados = await AsyncStorage.getItem('clientes');
      const gastosGuardados = await AsyncStorage.getItem('gastos');
      const comprasGuardadas = await AsyncStorage.getItem('compras');
      const ultimoMes = await AsyncStorage.getItem('ultimoMesAlerta');

      if (prodGuardados) setProductos(JSON.parse(prodGuardados));
      if (ventasGuardadas) setVentas(JSON.parse(ventasGuardadas));
      if (gastosGuardados) setGastos(JSON.parse(gastosGuardados));
      if (comprasGuardadas) setCompras(JSON.parse(comprasGuardadas));
      if (clientesGuardados) {
        const lista = JSON.parse(clientesGuardados);
        setClientes(lista);
        verificarCambioMes(ultimoMes, lista);
      }
    } catch (e) {}
  };

  const verificarCambioMes = async (ultimoMesStr, listaClientes) => {
    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${ahora.getMonth() + 1}`;
    if (ultimoMesStr && ultimoMesStr !== mesActual) {
      // Cambió el mes — calcular mes anterior
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const tieneDeudas = listaClientes.some(c =>
        (c.deudas || []).some(d => {
          const fd = new Date(d.fecha);
          return fd.getFullYear() === fecha.getFullYear() && fd.getMonth() === fecha.getMonth() && d.saldoPendiente > 0;
        })
      );
      if (tieneDeudas) {
        setMesCerrado({ mes: fecha.getMonth(), anio: fecha.getFullYear() });
        setAlertaMensual(true);
      }
    }
    await AsyncStorage.setItem('ultimoMesAlerta', mesActual);
  };

  const cerrarAlertaMensual = () => setAlertaMensual(false);

  const guardarProductos = async (lista) => {
    await AsyncStorage.setItem('productos', JSON.stringify(lista));
    setProductos(lista);
  };

  const guardarClientes = async (lista) => {
    await AsyncStorage.setItem('clientes', JSON.stringify(lista));
    setClientes(lista);
  };

  const guardarGastos = async (lista) => {
    await AsyncStorage.setItem('gastos', JSON.stringify(lista));
    setGastos(lista);
  };

  const guardarCompras = async (lista) => {
    await AsyncStorage.setItem('compras', JSON.stringify(lista));
    setCompras(lista);
  };

  // --- Productos ---
  const agregarProducto = async (producto) => {
    await guardarProductos([...productos, { ...producto, id: Date.now().toString() }]);
  };

  const editarProducto = async (id, datos) => {
    await guardarProductos(productos.map(p => p.id === id ? { ...p, ...datos } : p));
  };

  const eliminarProducto = async (id) => {
    await guardarProductos(productos.filter(p => p.id !== id));
  };

  // --- Carrito ---
  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const quitarDelCarrito = (id) => {
    setCarrito(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.cantidad > 1) return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
      return prev.filter(i => i.id !== id);
    });
  };

  const limpiarCarrito = () => setCarrito([]);

  // --- Ventas ---
  // metodoPago: 'efectivo' | 'nequi' | 'transferencia' | 'fiado'
  const registrarVenta = async (clienteId = null, metodoPago = 'efectivo') => {
    if (carrito.length === 0) return;
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const venta = {
      id: Date.now().toString(),
      items: [...carrito],
      total,
      fecha: new Date().toISOString(),
      clienteId,
      metodoPago: clienteId !== null ? 'fiado' : metodoPago,
      fiado: clienteId !== null,
      pagado: clienteId === null,
    };
    const nuevasVentas = [venta, ...ventas];
    await AsyncStorage.setItem('ventas', JSON.stringify(nuevasVentas));
    setVentas(nuevasVentas);

    if (clienteId) {
      const nuevosClientes = clientes.map(c => {
        if (c.id !== clienteId) return c;
        const nuevaDeuda = {
          id: venta.id,
          fecha: venta.fecha,
          monto: total,
          items: [...carrito],
          abonos: [],
          saldoPendiente: total,
        };
        return { ...c, deudas: [...(c.deudas || []), nuevaDeuda] };
      });
      await guardarClientes(nuevosClientes);
    }

    setCarrito([]);
    return venta;
  };

  // Anula una venta; si era fiado, elimina también la deuda del cliente
  const eliminarVenta = async (ventaId) => {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;
    const nuevasVentas = ventas.filter(v => v.id !== ventaId);
    await AsyncStorage.setItem('ventas', JSON.stringify(nuevasVentas));
    setVentas(nuevasVentas);

    if (venta.fiado && venta.clienteId) {
      const nuevosClientes = clientes.map(c =>
        c.id === venta.clienteId
          ? { ...c, deudas: (c.deudas || []).filter(d => d.id !== ventaId) }
          : c
      );
      await guardarClientes(nuevosClientes);
    }
  };

  // --- Gastos ---
  const agregarGasto = async (datos) => {
    await guardarGastos([{ ...datos, id: Date.now().toString(), fecha: new Date().toISOString() }, ...gastos]);
  };

  const eliminarGasto = async (id) => {
    await guardarGastos(gastos.filter(g => g.id !== id));
  };

  // --- Compras / Inversión (mercancía adquirida: nombre, cantidad, total) ---
  const agregarCompra = async (datos) => {
    await guardarCompras([{ ...datos, id: Date.now().toString(), fecha: new Date().toISOString() }, ...compras]);
  };

  const eliminarCompra = async (id) => {
    await guardarCompras(compras.filter(c => c.id !== id));
  };

  // --- Respaldo ---
  const exportarDatos = () => {
    return JSON.stringify({
      app: 'registro-cafeteria',
      version: 1,
      exportado: new Date().toISOString(),
      productos, ventas, clientes, gastos, compras,
    }, null, 2);
  };

  const importarDatos = async (json) => {
    const datos = JSON.parse(json);
    if (datos.app !== 'registro-cafeteria' || !Array.isArray(datos.productos) ||
        !Array.isArray(datos.ventas) || !Array.isArray(datos.clientes)) {
      throw new Error('El archivo no es un respaldo válido de esta app.');
    }
    await guardarProductos(datos.productos);
    await AsyncStorage.setItem('ventas', JSON.stringify(datos.ventas));
    setVentas(datos.ventas);
    await guardarClientes(datos.clientes);
    await guardarGastos(Array.isArray(datos.gastos) ? datos.gastos : []);
    await guardarCompras(Array.isArray(datos.compras) ? datos.compras : []);
    return { productos: datos.productos.length, ventas: datos.ventas.length, clientes: datos.clientes.length };
  };

  // --- Clientes ---
  const agregarCliente = async (datos) => {
    const nuevo = { ...datos, id: Date.now().toString(), deudas: [] };
    await guardarClientes([...clientes, nuevo]);
    return nuevo;
  };

  const editarCliente = async (id, datos) => {
    await guardarClientes(clientes.map(c => c.id === id ? { ...c, ...datos } : c));
  };

  const eliminarCliente = async (id) => {
    await guardarClientes(clientes.filter(c => c.id !== id));
  };

  const registrarAbono = async (clienteId, deudaId, monto) => {
    const nuevosClientes = clientes.map(c => {
      if (c.id !== clienteId) return c;
      const nuevasDeudas = c.deudas.map(d => {
        if (d.id !== deudaId) return d;
        const abono = { id: Date.now().toString(), fecha: new Date().toISOString(), monto };
        const totalAbonado = [...d.abonos, abono].reduce((s, a) => s + a.monto, 0);
        return { ...d, abonos: [...d.abonos, abono], saldoPendiente: Math.max(0, d.monto - totalAbonado) };
      });
      return { ...c, deudas: nuevasDeudas };
    });
    await guardarClientes(nuevosClientes);
  };

  const deudaTotalCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return 0;
    return (cliente.deudas || []).reduce((s, d) => s + d.saldoPendiente, 0);
  };

  // Devuelve deudas de un cliente filtradas por mes/año
  const deudasDelMes = (clienteId, mes, anio) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return [];
    return (cliente.deudas || []).filter(d => {
      const fd = new Date(d.fecha);
      return fd.getMonth() === mes && fd.getFullYear() === anio;
    });
  };

  // Resumen de todos los clientes con deudas en un mes dado
  const resumenMensual = (mes, anio) => {
    return clientes
      .map(c => {
        const deudas = deudasDelMes(c.id, mes, anio);
        const totalMes = deudas.reduce((s, d) => s + d.monto, 0);
        const pendiente = deudas.reduce((s, d) => s + d.saldoPendiente, 0);
        const itemsAgrupados = {};
        deudas.forEach(d => {
          d.items.forEach(i => {
            if (!itemsAgrupados[i.nombre]) itemsAgrupados[i.nombre] = { nombre: i.nombre, cantidad: 0, subtotal: 0 };
            itemsAgrupados[i.nombre].cantidad += i.cantidad;
            itemsAgrupados[i.nombre].subtotal += i.precio * i.cantidad;
          });
        });
        return {
          cliente: c,
          totalMes,
          pendiente,
          items: Object.values(itemsAgrupados),
          cantidadFiados: deudas.length,
        };
      })
      .filter(r => r.cantidadFiados > 0);
  };

  const totalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <VentasContext.Provider value={{
      productos, ventas, carrito, clientes, gastos, compras,
      alertaMensual, mesCerrado, cerrarAlertaMensual,
      agregarProducto, editarProducto, eliminarProducto,
      agregarAlCarrito, quitarDelCarrito, limpiarCarrito,
      registrarVenta, eliminarVenta, totalCarrito,
      clienteParaFiar, setClienteParaFiar,
      agregarGasto, eliminarGasto,
      agregarCompra, eliminarCompra,
      exportarDatos, importarDatos,
      agregarCliente, editarCliente, eliminarCliente,
      registrarAbono, deudaTotalCliente, deudasDelMes, resumenMensual,
    }}>
      {children}
    </VentasContext.Provider>
  );
}

export const useVentas = () => useContext(VentasContext);
