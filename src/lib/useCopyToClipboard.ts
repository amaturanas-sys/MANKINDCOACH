/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de copiar-al-portapapeles con feedback temporal ("Copiado"). Centraliza
 * el patrón repetido (writeText + flag + reset) usado en varios paneles.
 */
import { useCallback, useState } from 'react';

export function useCopyToClipboard(resetMs = 2000): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), resetMs);
    } catch {
      /* el navegador puede bloquear el portapapeles sin gesto de usuario */
    }
  }, [resetMs]);
  return [copied, copy];
}
