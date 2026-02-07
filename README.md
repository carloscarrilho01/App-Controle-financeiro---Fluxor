# App Controle Financeiro

Aplicativo mobile para controle financeiro pessoal desenvolvido com React Native + Expo.

## Funcionalidades

- **Autenticação**: Login/Registro com email e senha via Supabase
- **Dashboard**: Visão geral do saldo, receitas e despesas do mês
- **Múltiplas Contas**: Gerencie diferentes contas (corrente, poupança, cartão de crédito, etc.)
- **Transações**: Registre receitas, despesas e transferências entre contas
- **Categorias**: Organize suas transações por categorias personalizáveis
- **Metas de Economia**: Defina e acompanhe suas metas financeiras
- **Contas a Pagar**: Lembretes de contas recorrentes
- **Gráficos**: Visualize sua evolução financeira e gastos por categoria
- **Exportação**: Exporte seus dados em CSV ou backup JSON

## Requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI
- Conta no Supabase (gratuita)

## Configuração do Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. No SQL Editor, execute o script SQL disponível em `src/services/supabase.ts` (nos comentários)
4. Copie a URL do projeto e a chave anônima (anon key)
5. Edite o arquivo `src/services/supabase.ts` e substitua:
   - `YOUR_SUPABASE_URL` pela URL do seu projeto
   - `YOUR_SUPABASE_ANON_KEY` pela sua chave anônima

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar o projeto
npm start
```

## Executar no dispositivo

```bash
# Android
npm run android

# iOS (apenas macOS)
npm run ios

# Web
npm run web
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # Contextos React (Auth)
├── hooks/          # Hooks personalizados
├── navigation/     # Configuração de navegação
├── screens/        # Telas do app
├── services/       # Configuração do Supabase
├── types/          # Tipos TypeScript
└── utils/          # Utilitários (formatadores, exportação)
```

## Tecnologias

- React Native + Expo
- TypeScript
- React Navigation
- Supabase (Auth + Database)
- react-native-chart-kit
- date-fns
- expo-notifications
- expo-file-system
- expo-sharing

## Licença

MIT
