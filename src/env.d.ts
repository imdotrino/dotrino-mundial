// Lo que los pilares no declaran, con la forma que tiene su código. SOLO lo que usa la app.

import '@dotrino/identity'

// @dotrino/identity 0.116.0: `verifyDeviceSig` se exporta en src/index.js (desde
// vault/capabilities.js) pero no está en su index.d.ts.
declare module '@dotrino/identity' {
  export function verifyDeviceSig (args: { publickey: string, data: unknown, signature: string }): Promise<boolean>
}
