// Formatea un valor como pesos colombianos: 1500 -> "$1.500"
// Implementación manual para no depender de Intl (Hermes/web).
export function formatoPrecio(valor) {
  const n = Math.round(Number(valor) || 0);
  const signo = n < 0 ? '-' : '';
  const texto = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${texto}`;
}
