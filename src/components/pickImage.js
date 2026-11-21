import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const OPTS = { quality: 0.5, base64: true, allowsEditing: false };

function toImage(result) {
  if (!result || result.canceled || !result.assets || !result.assets.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, base64: a.base64 };
}

async function fromCamera() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera permission needed', 'Allow camera access in your phone settings to take a photo.');
    return null;
  }
  return toImage(await ImagePicker.launchCameraAsync(OPTS));
}

async function fromGallery() {
  return toImage(await ImagePicker.launchImageLibraryAsync(OPTS));
}

// Asks "Take photo" or "Choose from gallery" and resolves to { uri, base64 } or null.
export function pickImage() {
  return new Promise((resolve) => {
    Alert.alert(
      'Add a photo',
      undefined,
      [
        { text: 'Take photo', onPress: () => fromCamera().then(resolve, () => resolve(null)) },
        { text: 'Choose from gallery', onPress: () => fromGallery().then(resolve, () => resolve(null)) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
