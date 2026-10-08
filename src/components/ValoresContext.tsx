'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// ============================================================================
// VISIBILIDADE DOS VALORES
// Estado global simples: quando "oculto" está ligado, todo texto de valor
// exibido nas telas é substituído por "R$ ••••". A preferência fica no
// localStorage, então continua valendo depois de recarregar a página.
// ============================================================================

const CHAVE_STORAGE = 'valores-ocultos';

interface ValoresContexto {
  oculto: boolean;
  alternar: () => void;
  mascarar: (valor: string | number | null | undefined) => string;
}

const Contexto = createContext<ValoresContexto>({
  oculto: false,
  alternar: () => {},
  mascarar: (valor) => (valor ?? '').toString(),
});

export function ValoresProvider({ children }: { children: React.ReactNode }) {
  const [oculto, setOculto] = useState(false);

  // Lido depois da montagem para o HTML do servidor e do cliente baterem.
  useEffect(() => {
    try {
      setOculto(window.localStorage.getItem(CHAVE_STORAGE) === '1');
    } catch {
      // localStorage indisponível (modo privado, por exemplo): segue visível.
    }
  }, []);

  const alternar = () => {
    setOculto((anterior) => {
      const novo = !anterior;
      try {
        window.localStorage.setItem(CHAVE_STORAGE, novo ? '1' : '0');
      } catch {
        // Sem persistência, vale só para esta sessão.
      }
      return novo;
    });
  };

  const mascarar = (valor: string | number | null | undefined) => {
    const texto = (valor ?? '').toString();
    if (!oculto) return texto;
    if (texto.trim() === '') return texto;
    return 'R$ •••••••';
  };

  return (
    <Contexto.Provider value={{ oculto, alternar, mascarar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useValores() {
  return useContext(Contexto);
}