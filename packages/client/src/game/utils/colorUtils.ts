import Phaser from 'phaser';

/** HEX 색상 문자열을 Phaser 숫자 형식으로 변환 */
export function hexStringToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** HSV에서 명도(V)를 조절한 색상 반환 */
export function adjustBrightness(
  hexColor: string,
  brightnessOffset: number,
): number {
  const color = Phaser.Display.Color.HexStringToColor(hexColor);
  const hsv = Phaser.Display.Color.RGBToHSV(color.red, color.green, color.blue);
  const newBrightness = Phaser.Math.Clamp(hsv.v + brightnessOffset, 0, 1);
  const rgbColor = Phaser.Display.Color.HSVToRGB(hsv.h, hsv.s, newBrightness);

  // HSVToRGB는 ColorObject를 반환하므로 타입 캐스팅
  const rgb = rgbColor as { r: number; g: number; b: number };
  return Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);
}
