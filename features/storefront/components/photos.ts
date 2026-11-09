/** Dusk project photography in /public/photos, chosen by what the project is. */
export function projectPhoto(title: string, index = 0): string {
  const t = title.toLowerCase();
  if (/maple|elementary|school|classroom/.test(t)) return "/photos/maple.jpg";
  if (/riverside|library|branch/.test(t)) return "/photos/riverside.jpg";
  if (/fire|station|safety/.test(t)) return "/photos/fire.jpg";
  if (/civic|learning|center|community/.test(t)) return "/photos/civic.jpg";
  return ["/photos/civic.jpg", "/photos/maple.jpg", "/photos/riverside.jpg", "/photos/fire.jpg"][index % 4];
}
