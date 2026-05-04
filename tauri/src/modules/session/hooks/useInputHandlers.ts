// hooks/useInputHandlers.ts
import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useInputHandlers(id: string | undefined, canvasRef: React.RefObject<HTMLCanvasElement | null>, dimensions: { width: number, height: number }) {
  const getCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((clientX - rect.left) * (dimensions.width / rect.width));
    const y = Math.round((clientY - rect.top) * (dimensions.height / rect.height));
    return { x, y };
  }, [canvasRef, dimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const c = getCoords(e.clientX, e.clientY);
    if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: true });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const c = getCoords(e.clientX, e.clientY);
    if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: false });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const c = getCoords(e.clientX, e.clientY);
    if (c && id) invoke('send_mouse_move', { id, ...c });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const c = getCoords(e.clientX, e.clientY);
    if (c && id) invoke('send_wheel', { id, ...c, deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (id) invoke('send_key_event', {
      id, key: e.code, pressed: true,
      ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey
    });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (id) invoke('send_key_event', {
      id, key: e.code, pressed: false,
      ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey
    });
  };

  return { handleMouseDown, handleMouseUp, handleMouseMove, handleWheel, handleKeyDown, handleKeyUp };
}
