import { redirect } from 'next/navigation';

// A tela inicial é o dashboard de investimentos.
export default function Home() {
  redirect('/investimentos');
}