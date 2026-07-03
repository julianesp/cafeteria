import { Alert, Platform } from 'react-native';

// Alert.alert no funciona en react-native-web (los botones no hacen nada),
// por eso en web se usan window.alert / window.confirm.

export function avisar(titulo, mensaje) {
  if (Platform.OS === 'web') {
    window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
  } else {
    Alert.alert(titulo, mensaje);
  }
}

// Devuelve una Promise<boolean>: true si el usuario confirma.
export function confirmar(titulo, mensaje, textoBoton = 'Aceptar', destructivo = false) {
  return new Promise(resolve => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(mensaje ? `${titulo}\n\n${mensaje}` : titulo));
    } else {
      Alert.alert(titulo, mensaje, [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: textoBoton, style: destructivo ? 'destructive' : 'default', onPress: () => resolve(true) },
      ]);
    }
  });
}
