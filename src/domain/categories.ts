export interface Category {
  name: string;
  subs: string[];
  icon: string;
}

export const MAIN_CATEGORIES: Category[] = [
  { name: "Moradia", icon: "🏠", subs: ["Aluguel","Condominio","IPTU","Manutencao","Financiamento","Agua","Luz","Gas","Internet","Outros"] },
  { name: "Alimentação", icon: "🍽️", subs: ["Supermercado","Restaurante","Delivery","Padaria","Feira","Outros"] },
  { name: "Transporte e Mobilidade", icon: "🚗", subs: ["Combustivel","Uber/99","Onibus/Metro","Estacionamento","IPVA","Seguro Auto","Manutencao","Outros"] },
  { name: "Saúde", icon: "💊", subs: ["Plano de Saúde","Farmacia","Consulta Medica","Exames","Academia","Outros"] },
  { name: "Educação e Desenvolvimento", icon: "📚", subs: ["Cursos","Livros","Pos-graduacao","Idiomas","Outros"] },
  { name: "Família e Crianças", icon: "👨‍👩‍👧", subs: ["Escola","Material Escolar","Brinquedos","Babysitter","Outros"] },
  { name: "Contas e Assinaturas", icon: "📱", subs: ["Celular","Software","Streaming","Clube","Outros"] },
  { name: "Cuidados Pessoais", icon: "💅", subs: ["Cabelo","Estetica","Vestuario","Outros"] },
  { name: "Compras e Vida Doméstica", icon: "🛒", subs: ["Eletronicos","Moveis","Utensilios","Outros"] },
  { name: "Lazer e Cultura", icon: "🎭", subs: ["Cinema","Shows","Viagem","Hobbies","Streaming","Outros"] },
  { name: "Pets", icon: "🐾", subs: ["Racao","Veterinario","Banho/Tosa","Outros"] },
  { name: "Dívidas e Obrigações", icon: "💳", subs: ["Cartao de Credito","Emprestimo","Outros"] },
  { name: "Impostos e Taxas", icon: "🏛️", subs: ["IRPF","IPTU","IPVA","IOF","Outros"] },
  { name: "Seguros e Proteção", icon: "🛡️", subs: ["Seguro de Vida","Seguro Auto","Seguro Residencial","Outros"] },
  { name: "Doações e Solidariedade", icon: "❤️", subs: ["Doacao","Dizimo","Outros"] },
  { name: "Investimentos e Reserva", icon: "📈", subs: ["Reserva de Emergencia","Acoes","Fundos","Previdencia","Outros"] },
  { name: "Despesas Eventuais", icon: "🎲", subs: ["Presente","Multa","Conserto","Outros"] },
  { name: "Transferências e Ajustes", icon: "↔️", subs: ["Transferencia","Reembolso","Ajuste","Outros"] },
  { name: "Advocacia", icon: "⚖️", subs: ["Honorarios","OAB","Material","Escritorio","Outros"] },
];

export function getSubcategories(main: string): string[] {
  return MAIN_CATEGORIES.find(c => c.name === main)?.subs || [];
}
