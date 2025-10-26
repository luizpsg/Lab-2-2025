# 🔧 Como Resolver Problemas de Migração do Banco de Dados

## Problema

Se você ver erros como:

- `type 'Null' is not a subtype of type 'String'`
- `table tasks has no column named categoryId`

Isso significa que o banco de dados existente não foi migrado corretamente para incluir as novas colunas.

## Solução

### Opção 1: Usar o Botão de Reset no App (Recomendado) 🔄

1. Abra o aplicativo
2. Na tela principal, clique no ícone de **refresh (↻)** no canto superior direito
3. Confirme que deseja resetar o banco de dados
4. Todas as tarefas serão apagadas e o banco será recriado com a estrutura correta

### Opção 2: Hot Restart

1. No terminal ou VS Code, pressione **R** (maiúsculo) ou **Ctrl+Shift+F5**
2. O aplicativo reiniciará completamente e aplicará as migrações

### Opção 3: Desinstalar e Reinstalar o App

1. Desinstale o aplicativo do dispositivo/emulador
2. Execute `flutter run` novamente
3. O banco de dados será criado do zero com todas as colunas

## O que foi implementado?

✅ **Sistema de Migração Inteligente**:

- Verifica se cada coluna existe antes de tentar adicioná-la
- Adiciona colunas automaticamente ao abrir o banco (callback `onOpen`)
- Funciona mesmo se a migração falhar na primeira vez

✅ **Botão de Debug**:

- Ícone de refresh no menu superior
- Permite resetar o banco de dados a qualquer momento
- Útil durante o desenvolvimento

✅ **Valores Padrão**:

- `categoryId`: 'other' (categoria padrão)
- `dueDate`: null (sem data de vencimento)

## Estrutura Atual do Banco de Dados

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL,
  priority TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  dueDate TEXT,                    -- ✅ Versão 2
  categoryId TEXT NOT NULL DEFAULT 'other'  -- ✅ Versão 3
)
```

## Após Resolver

Depois de resetar o banco:

1. Crie uma nova tarefa
2. Selecione uma categoria
3. Defina uma data de vencimento (opcional)
4. Tudo deve funcionar perfeitamente! 🎉

## Remover o Botão de Debug (Produção)

Quando não precisar mais do botão de reset, você pode removê-lo ou comentá-lo no arquivo `lib/screens/task_list_screen.dart` (linhas ~197-249).
