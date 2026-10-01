import { redirect } from 'next/navigation';

// A tela inicial agora é o dashboard de investimentos.
// A navegação entre as telas fica na barra lateral (ou inferior, no celular).
export default function Home() {
  redirect('/investimentos');
}