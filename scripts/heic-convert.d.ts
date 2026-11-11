declare module 'heic-convert' {
  const convert: (options: { buffer: Buffer | Uint8Array; format: 'JPEG' | 'PNG'; quality?: number }) => Promise<ArrayBuffer>;
  export default convert;
}
