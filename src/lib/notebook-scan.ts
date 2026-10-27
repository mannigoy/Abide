import { requireOptionalNativeModule } from 'expo';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Reading a photo of the notebook page, entirely on the phone.
 *
 * Text recognition uses Google ML Kit through `expo-text-extractor`. That's
 * native code, so it only exists in a development build, not in Expo Go.
 * We check first, so Expo Go simply hides the scan buttons instead of crashing.
 *
 * Privacy: the photo is never uploaded or saved. As soon as the text has been
 * read, our copies of the photo are deleted.
 */
export const isScanAvailable = requireOptionalNativeModule('ExpoTextExtractor') !== null;

export type ScanSource = 'camera' | 'library';

export type ScanOutcome =
  | { status: 'ok'; lines: string[] }
  | { status: 'cancelled' }
  | { status: 'no-permission' }
  | { status: 'no-text' }
  | { status: 'error' };

// Big enough for ML Kit to read handwriting, small enough to be quick.
const MAX_WIDTH = 2000;

export async function scanNotebookPage(source: ScanSource): Promise<ScanOutcome> {
  if (!isScanAvailable) return { status: 'error' };

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'no-permission' };

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Lets the leader crop to just the page, which helps recognition.
    allowsEditing: true,
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  const temporaryFiles = [asset.uri];

  try {
    // Shrink large photos before reading them.
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
    const image = await context.renderAsync();
    const shrunk = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    temporaryFiles.push(shrunk.uri);

    // Loaded only now, because importing it in Expo Go would crash.
    const { extractTextFromImage } = await import('expo-text-extractor');
    const lines = (await extractTextFromImage(shrunk.uri)).map((line) => line.trim()).filter(Boolean);
    return lines.length > 0 ? { status: 'ok', lines } : { status: 'no-text' };
  } catch (error) {
    console.warn('Could not read the notebook page', error);
    return { status: 'error' };
  } finally {
    temporaryFiles.forEach(deleteOurCopy);
  }
}

/**
 * Deletes a photo file if it's one of ours (in the app's cache folder).
 * A photo picked from the gallery is copied into the cache first, so this
 * deletes that copy and never touches the original in the person's gallery.
 */
function deleteOurCopy(uri: string) {
  if (!uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete temporary photo', error);
  }
}
