'use client';

import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from 'react';

export interface DialogHandle<T = void> {
  open: (payload: T) => void;
  close: () => void;
}

export interface DialogState<T> {
  isOpen: boolean;
  payload: T | null;
  setOpen: (open: boolean) => void;
  close: () => void;
}

export function useDialog<T = void>(ref?: Ref<DialogHandle<T>>): DialogState<T> {
  const [payload, setPayload] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback((next: T) => {
    setPayload(next);
    setIsOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  return { isOpen, payload, setOpen: setIsOpen, close };
}

export function useDialogRef<T = void>(): RefObject<DialogHandle<T> | null> {
  return useRef<DialogHandle<T> | null>(null);
}
