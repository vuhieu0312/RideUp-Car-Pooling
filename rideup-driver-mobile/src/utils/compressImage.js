import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1600;

export async function compressImage(asset) {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const { width = 0, height = 0 } = asset;
    if (width > MAX_SIDE || height > MAX_SIDE) {
      context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return { uri: result.uri, name: 'image.jpg', type: 'image/jpeg' };
  } catch {
    return { uri: asset.uri, name: asset.fileName || 'image.jpg', type: asset.mimeType || 'image/jpeg' };
  }
}
