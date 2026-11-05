/** Triggers a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give slow mobile browsers time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}
