import { contextBridge } from 'electron';

// Expose minimal API to the renderer if required, otherwise leave empty
// Since Alfred AI communicates directly with localhost:5000 via standard fetch,
// we don't necessarily need to expose node internals.
contextBridge.exposeInMainWorld('electronAPI', {
  // Safe generic metadata
  platform: process.platform,
});
