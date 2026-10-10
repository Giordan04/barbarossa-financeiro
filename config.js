/* Configuração do sistema. Preencha supabaseUrl e supabaseAnonKey (Supabase → Project Settings → API).
   A chave "anon" é pública por desenho — quem protege os dados são as regras do banco (RLS).
   NUNCA coloque aqui a chave "service_role". Sem as duas, o app roda só no aparelho, como antes. */
window.APP_CONFIG = {
  nome: 'Barber Gestão Financeira',   // nome do produto (aparece na tela de login) — troque quando escolher o nome final
  supabaseUrl: '',
  supabaseAnonKey: ''
};
