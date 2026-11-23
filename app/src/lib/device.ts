function browser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome|CriOS/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Navegador';
}

/** Nombre legible del dispositivo, para el aviso "tu cuenta está abierta en …". */
export function deviceName(ua: string = navigator.userAgent): string {
  if (/Tizen/i.test(ua)) return 'Smart TV · Samsung';
  if (/Web0S|webOS/i.test(ua)) return 'Smart TV · LG';
  if (/AFT[A-Z]/.test(ua)) return 'Fire TV';
  if (/Android/.test(ua) && /(\bTV\b|GoogleTV|BRAVIA|AndroidTV)/i.test(ua)) return 'Android TV';
  if (/SMART-TV|SmartTV|HbbTV|NetCast/i.test(ua)) return 'Smart TV';
  if (/iPhone/.test(ua)) return `iPhone · ${browser(ua)}`;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return `iPad · ${browser(ua)}`;
  if (/Android/.test(ua)) return `Android · ${browser(ua)}`;
  return `Computadora · ${browser(ua)}`;
}
