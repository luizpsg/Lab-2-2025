# Relatório - Laboratório 2: Interface Profissional

## Task Manager Pro - Aplicativo de Gerenciamento de Tarefas

**Aluno:** Luiz Paulo Saud Goncalves
**Data:** 26 de Outubro de 2025
**Disciplina:** Desenvolvimento Mobile com Flutter

---

## 1. Implementações Realizadas

### 1.1 Sistema de Data de Vencimento ✅

**Funcionalidades:**

- Campo `DateTime? dueDate` adicionado ao modelo Task
- DatePicker nativo do Flutter para seleção de data
- Alertas visuais para tarefas vencidas:
  - Fundo vermelho claro no card
  - Borda vermelha mais grossa (3px)
  - Badge "VENCIDA" em destaque
  - Ícone de aviso (warning)
- Ordenação inteligente por data de vencimento:
  - Tarefas com vencimento próximo aparecem primeiro
  - Tarefas sem data aparecem por último
  - Ordenação secundária por data de criação

**Componentes Material Design 3 Utilizados:**

- `DatePicker` - Seletor de data Material Design
- `Card` com elevation dinâmica
- `Container` com decoração personalizada
- `Icon` com cores contextuais

### 1.2 Sistema de Categorias 🎨

**Funcionalidades:**

- 8 categorias predefinidas com cores e ícones únicos:

  1. 🔵 Trabalho (Azul - #2196F3)
  2. 🟢 Pessoal (Verde - #4CAF50)
  3. 🟣 Estudos (Roxo - #9C27B0)
  4. 🔴 Saúde (Rosa - #E91E63)
  5. 🟠 Compras (Laranja - #FF9800)
  6. 💚 Finanças (Verde Escuro - #4CAF50)
  7. 🟤 Casa (Marrom - #795548)
  8. ⚪ Outros (Cinza Azulado - #607D8B)
- Dropdown de seleção de categoria no formulário
- Filtro por categoria no menu superior
- Badge colorido nos cards das tarefas
- Borda do card na cor da categoria

**Componentes Material Design 3 Utilizados:**

- `DropdownButtonFormField` para seleção
- `PopupMenuButton` para filtros
- `Container` com gradientes e cores dinâmicas
- `Wrap` para layout responsivo dos badges

### 1.3 Sistema de Lembretes e Notificações 🔔

**Funcionalidades:**

- Campo `DateTime? reminderTime` no modelo Task
- Seletor de data E hora (DatePicker + TimePicker)
- Notificações locais agendadas com precisão de minuto
- Gerenciamento inteligente:
  - Agenda notificação ao criar tarefa
  - Cancela ao completar tarefa
  - Reagenda ao desmarcar tarefa
  - Cancela ao deletar tarefa
- Badge roxo visual para tarefas com lembrete
- Suporte a timezone (America/Sao_Paulo)
- Permissões automáticas no Android 13+

**Pacotes Utilizados:**

- `flutter_local_notifications: ^19.5.0`
- `timezone: ^0.10.1`

**Componentes Material Design 3 Utilizados:**

- `TimePicker` - Seletor de hora Material Design
- `ListTile` com trailing actions
- `Icon` com estados visuais dinâmicos
- Notificações nativas do sistema

### 1.4 Sistema de Migração de Banco de Dados 🗄️

**Funcionalidades:**

- Migração inteligente de versão 1 → 4
- Verificação de colunas existentes antes de adicionar
- Callback `onOpen` para garantir integridade
- Método `resetDatabase()` para debug
- Tratamento de erros robusto

**Versões do Banco:**

- **v1**: Estrutura básica (id, title, description, completed, priority, createdAt)
- **v2**: Adicionado `dueDate`
- **v3**: Adicionado `categoryId`
- **v4**: Adicionado `reminderTime`

### 1.5 Interface e UX Aprimoradas 🎨

**Melhorias Visuais:**

- Card de estatísticas com gradiente
- Badges coloridos para prioridade, categoria e vencimento
- Estados visuais claros (completo, vencido, pendente)
- Ícones contextuais e intuitivos
- Feedback visual para todas as ações
- Empty states informativos

**Componentes Material Design 3:**

- `FloatingActionButton.extended` com label
- `SnackBar` para feedback
- `RefreshIndicator` para pull-to-refresh
- `AlertDialog` para confirmações
- `CircularProgressIndicator` para loading
- `SwitchListTile` para toggles
- `TextFormField` com validação
- `ElevatedButton` e `OutlinedButton`

---

## 2. Desafios Encontrados

### 2.1 Problema: Migração de Banco de Dados

**Dificuldade:**
Ao adicionar novas colunas (`dueDate`, `categoryId`, `reminderTime`), tarefas antigas retornavam `null` causando erros de tipo.

**Erro Específico:**

```
type 'Null' is not a subtype of type 'String' of 'function result'
table tasks has no column named categoryId
```

**Solução Implementada:**

1. Criado arquivo `database_migration.dart` com helpers
2. Método `columnExists()` para verificar colunas
3. Adição condicional de colunas no `onOpen` callback
4. Botão de reset do banco para casos extremos
5. Valores padrão seguros (`categoryId = 'other'`)

### 2.2 Problema: Configuração de Notificações Locais

**Dificuldade:**
Múltiplos erros ao configurar `flutter_local_notifications`:

1. **API Deprecated:** Parâmetro `uiLocalNotificationDateInterpretation` não existe na v19.5.0
2. **Core Library Desugaring:** Pacote requer desugaring para APIs Java 8+
3. **Versão Incompatível:** `desugar_jdk_libs` 2.0.4 insuficiente

**Erros Específicos:**

```
UILocalNotificationDateInterpretation isn't defined
Dependency requires core library desugaring
desugar_jdk_libs version to be 2.1.4 or above
```

**Soluções Implementadas:**

1. **Removido parâmetro deprecated:**

```dart
await _notifications.zonedSchedule(
  id, title, body,
  tz.TZDateTime.from(scheduledDate, tz.local),
  notificationDetails,
  androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
  // Removido: uiLocalNotificationDateInterpretation
);
```

2. **Habilitado desugaring no build.gradle.kts:**

```kotlin
compileOptions {
    isCoreLibraryDesugaringEnabled = true
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
```

3. **Adicionadas permissões no AndroidManifest.xml:**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

### 2.3 Problema: Localização do DatePicker

**Dificuldade:**
DatePicker aparecia em inglês, causando erro de localização.

**Erro Específico:**

```
No MaterialLocalizations found
DatePickerDialog widgets require MaterialLocalizations
```

**Solução:**

1. Adicionado pacote `flutter_localizations` ao pubspec.yaml
2. Atualizado `intl` para versão compatível (^0.20.2)
3. Configurado delegates de localização no MaterialApp:

```dart
localizationsDelegates: const [
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
],
supportedLocales: const [Locale('pt', 'BR')],
locale: const Locale('pt', 'BR'),
```

---

## 3. Melhorias Implementadas

### 3.1 Além do Roteiro Original

**1. Sistema de Filtros Duplo:**

- Filtro por status (todas/pendentes/concluídas) - Roteiro original
- **Filtro por categoria** - EXTRA
- Ícone do filtro de categoria fica amarelo quando ativo
- Combinação de ambos os filtros

**2. Indicadores Visuais Avançados:**

- Badge "VENCIDA" para tarefas atrasadas - Roteiro básico
- **Badge roxo para lembretes configurados** - EXTRA
- **Badge azul para data de vencimento futura** - EXTRA
- Contador de tarefas vencidas nas estatísticas - EXTRA

**3. Botão de Reset do Banco (Debug):**

- Ferramenta de desenvolvedor para resetar banco
- Diálogo de confirmação com aviso claro
- Útil para resolver problemas de migração
- Pode ser removido em produção

**4. Agendamento Inteligente de Notificações:**

- Reagendamento ao desmarcar tarefa - EXTRA
- Validação de data (não agenda se já passou)
- ID único baseado no hashCode da tarefa
- Mensagens de log para debugging

### 3.2 Customizações de Design

**1. Paleta de Cores Personalizada:**

- Verde principal: `#3DA872` (61, 168, 114)
- Cores de categorias baseadas em Material Design
- Esquema de cores consistente em todo o app

**2. Cards com Elevação Dinâmica:**

- Tarefas completas: elevation 1
- Tarefas pendentes: elevation 3
- Tarefas vencidas: fundo vermelho + borda grossa

**3. Badges Informativos:**

- Fundo colorido com 10% de opacidade
- Bordas coloridas (1.5px para categorias)
- Ícones contextuais para cada tipo
- Layout responsivo com Wrap

**4. Gradientes nas Estatísticas:**

```dart
gradient: LinearGradient(
  colors: [
    Color.fromARGB(255, 61, 168, 114),
    Color.fromARGB(255, 85, 179, 132),
  ],
)
```

### 3.3 Arquitetura e Boas Práticas

**1. Separação de Responsabilidades:**

- `models/` - Modelos de dados
- `services/` - Lógica de negócio (Database, Notifications)
- `screens/` - Telas do app
- `widgets/` - Componentes reutilizáveis
- `utils/` - Utilitários (migrations)

**2. Tratamento de Erros:**

- Try-catch em todas operações assíncronas
- Feedback visual com SnackBars
- Estados de loading
- Validações de formulário

**3. Documentação:**

- Comentários em código complexo
- JSDoc para métodos públicos
- README.md detalhado
- Guias específicos (REMINDERS_GUIDE.md, MIGRATION_FIX.md)

---

## 4. Aprendizados

### 4.1 Principais Conceitos Aprendidos

**1. Gerenciamento de Estado:**

- `StatefulWidget` vs `StatelessWidget`
- `setState()` para atualizações de UI
- Callbacks para comunicação entre widgets
- Lifecycle de widgets (initState, dispose)

**2. Banco de Dados Local (SQLite):**

- CRUD completo (Create, Read, Update, Delete)
- Migrações de schema entre versões
- Queries SQL com ordenação complexa
- Transações e integridade de dados

**3. Material Design 3:**

- Sistema de componentes
- Temas e cores
- Elevation e shadows
- Ripple effects e feedback tátil

**4. Notificações Locais:**

- Agendamento com timezone
- Permissões runtime no Android
- Channels de notificação
- Callbacks de interação

**5. Programação Assíncrona:**

- `async`/`await` para operações assíncronas
- `Future` para valores futuros
- Tratamento de erros com try-catch
- `mounted` check para widgets

**6. Internacionalização (i18n):**

- Delegates de localização
- Formatação de datas (DateFormat)
- Suporte a múltiplos idiomas
- Locale configuration

### 4.2 Diferenças entre Lab 1 e Lab 2

| Aspecto                       | Lab 1                               | Lab 2                                      |
| ----------------------------- | ----------------------------------- | ------------------------------------------ |
| **Persistência**       | Lista em memória (perde ao fechar) | SQLite (persiste dados)                    |
| **Interface**           | Básica, componentes simples        | Profissional, Material Design 3            |
| **Funcionalidades**     | CRUD básico                        | CRUD + Categorias + Vencimento + Lembretes |
| **Validação**         | Mínima ou ausente                  | Validação completa de formulários       |
| **Feedback**            | Pouco feedback visual               | SnackBars, LoadingStates, Confirmações   |
| **Arquitetura**         | Tudo em um arquivo                  | Separação clara de responsabilidades     |
| **Estados**             | Simples                             | Complexos (loading, empty, error)          |
| **Filtros**             | Nenhum ou básico                   | Duplo (status + categoria)                 |
| **Notificações**      | Nenhuma                             | Sistema completo de lembretes              |
| **Migração de Dados** | Não aplicável                     | Sistema robusto de migrações             |

### 4.3 Habilidades Técnicas Desenvolvidas

1. **Debugging Avançado:**

   - Leitura de stack traces
   - Identificação de erros de tipo
   - Uso de logs estratégicos
2. **Configuração Android:**

   - Gradle (build.gradle.kts)
   - AndroidManifest.xml
   - Permissões e receivers
3. **Gerenciamento de Pacotes:**

   - pubspec.yaml
   - Compatibilidade de versões
   - Resolução de conflitos de dependências
4. **Git e Versionamento:**

   - Commits organizados
   - Migrações de código
   - Documentação de mudanças

---

## 5. Próximos Passos

### 5.1 Melhorias Sugeridas (Curto Prazo)

**1. Busca de Tarefas 🔍**

```dart
// TextField no AppBar para buscar tarefas
TextField(
  decoration: InputDecoration(
    hintText: 'Buscar tarefas...',
    prefixIcon: Icon(Icons.search),
  ),
  onChanged: (query) => _filterTasksByTitle(query),
)
```

**2. Temas Claro/Escuro ☀️🌙**

```dart
// ThemeMode dinâmico
ThemeData.light() / ThemeData.dark()
SharedPreferences para persistir preferência
```

**3. Estatísticas Visuais 📊**

- Gráfico de tarefas por categoria (pizza/barra)
- Tendências de produtividade
- Taxa de conclusão semanal
- Pacote sugerido: `fl_chart`

**4. Anexos em Tarefas 📎**

- Upload de imagens
- Documentos PDF
- Links externos
- Pacotes: `image_picker`, `file_picker`

**5. Subtarefas (Checklist) ☑️**

```dart
class Subtask {
  final String id;
  final String title;
  final bool completed;
}
// Lista de subtasks dentro de cada Task
```

### 5.2 Funcionalidades Avançadas (Médio Prazo)

**1. Sincronização em Nuvem ☁️**

- Backend com Firebase/Supabase
- Sync automático entre dispositivos
- Backup automático

**2. Colaboração em Tarefas 👥**

- Compartilhar tarefas com outros usuários
- Atribuição de responsáveis
- Comentários em tarefas

**3. Recorrência de Tarefas 🔄**

```dart
enum Recurrence {
  daily,
  weekly,
  monthly,
  yearly,
  custom
}
// Criar automaticamente próxima ocorrência
```

**4. Modo Pomodoro ⏱️**

- Timer integrado para foco
- Estatísticas de tempo trabalhado
- Notificações de intervalos

**5. Integração com Calendário 📅**

- Sincronizar com Google Calendar
- Visualização de calendário mensal
- Eventos e tarefas unificados

### 5.3 Melhorias Técnicas

**1. Testes Automatizados:**

```dart
// Unit tests
test('Task creation', () {
  final task = Task(title: 'Test');
  expect(task.title, 'Test');
});

// Widget tests
testWidgets('TaskCard displays title', (tester) async {
  await tester.pumpWidget(TaskCard(task: testTask));
  expect(find.text('Test'), findsOneWidget);
});
```

**2. CI/CD:**

- GitHub Actions para builds automáticos
- Testes em cada commit
- Deploy automatizado

**3. Internacionalização Completa:**

- Múltiplos idiomas (EN, ES, FR)
- Arquivos .arb para traduções
- Detecção automática de locale

**4. Acessibilidade:**

- Suporte a screen readers
- Contraste adequado de cores
- Tamanhos de fonte ajustáveis
- Navegação por teclado

**5. Performance:**

- Lazy loading de tarefas
- Paginação para listas grandes
- Cache de imagens
- Otimização de queries SQL

### 5.4 Ideias Criativas

**1. Gamificação 🎮**

- Pontos por tarefas completadas
- Badges de conquistas
- Níveis de produtividade
- Streaks (sequências de dias)

**2. Widget de Home Screen 📱**

- Ver tarefas na tela inicial
- Quick actions para criar tarefa
- Contador de pendentes

**3. Integração com Assistentes 🗣️**

- "Ok Google, adicionar tarefa"
- Siri Shortcuts
- Alexa Skills

**4. Modo Offline Robusto 🔌**

- Queue de sincronização
- Resolução de conflitos
- Indicador de status de sync

**5. Exportação de Dados 📤**

- Export para CSV/JSON
- Backup completo do banco
- Relatórios em PDF

---

## 6. Conclusão

O Laboratório 2 foi fundamental para desenvolver habilidades práticas em Flutter, indo muito além do básico. Implementamos um aplicativo completo e profissional com:

✅ **Persistência de dados** robusta com SQLite
✅ **Interface moderna** com Material Design 3
✅ **Funcionalidades avançadas** (categorias, vencimento, lembretes)
✅ **Arquitetura escalável** e bem organizada
✅ **Tratamento de erros** e feedback ao usuário
✅ **Sistema de notificações** completo

Os desafios encontrados (migrações de banco, configuração de notificações, localização) foram valiosos para aprender debugging e resolução de problemas reais.

O aplicativo está pronto para uso no dia a dia e possui uma base sólida para futuras expansões. Os próximos passos incluem funcionalidades ainda mais avançadas como sincronização em nuvem, colaboração e gamificação.

**Principais Aprendizados:**

- Flutter é extremamente produtivo para desenvolvimento mobile
- Material Design 3 oferece componentes poderosos e bonitos
- SQLite é ideal para apps offline-first
- Notificações locais exigem configuração cuidadosa no Android
- Migrações de banco são críticas para manutenção de apps

**Tempo Investido:** ~4-5 horas de desenvolvimento focado
**Linhas de Código:** ~2500+ linhas
**Commits:** 25+ commits organizados

---

**Documentação Adicional Criada:**

- `REMINDERS_GUIDE.md` - Guia completo de lembretes
- `MIGRATION_FIX.md` - Solução de problemas de migração
- `README.md` - Documentação geral do projeto

**Repositório:** [Link do GitHub]
**APK de Demonstração:** [Link para download]

---

_Relatório elaborado em 26/10/2025_
_Task Manager Pro - Versão 1.0.0_
