# 🔔 Guia de Lembretes e Notificações

## 📱 Sistema de Lembretes Implementado

O aplicativo agora possui um sistema completo de lembretes com notificações locais!

### ✨ Funcionalidades

#### 1. **Configurar Lembrete** ⏰

- Ao criar ou editar uma tarefa, toque no card "Lembrete"
- Selecione a **data** do lembrete
- Selecione a **hora** do lembrete
- O lembrete será agendado automaticamente

#### 2. **Notificações Automáticas** 📬

- Receba uma notificação no horário configurado
- A notificação mostra o título e descrição da tarefa
- Som e vibração para chamar sua atenção

#### 3. **Gerenciamento Inteligente** 🧠

- **Completar tarefa**: Notificação cancelada automaticamente
- **Desmarcar tarefa**: Notificação reagendada (se ainda não passou)
- **Deletar tarefa**: Notificação removida
- **Editar lembrete**: Notificação atualizada

#### 4. **Indicadores Visuais** 👀

- Badge roxo com ícone de alarme mostra tarefas com lembrete
- Data e hora do lembrete exibidos no card da tarefa

### 🔧 Configurações Necessárias

#### Android 13+ (API 33+)

O aplicativo solicita permissão para enviar notificações automaticamente na primeira execução.

#### Permissões no AndroidManifest.xml

Já configuradas no arquivo `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Permissões de notificação -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

### 🎯 Como Usar

#### Criar Tarefa com Lembrete

1. Toque em "Nova Tarefa"
2. Preencha título e descrição
3. Toque no card **"Lembrete"**
4. Selecione data e hora
5. Salve a tarefa
6. ✅ Lembrete agendado!

#### Modificar Lembrete

1. Toque na tarefa para editar
2. Toque no card "Lembrete"
3. Escolha nova data/hora
4. Salve
5. ✅ Lembrete atualizado!

#### Remover Lembrete

1. Edite a tarefa
2. Toque no ícone **X** ao lado do lembrete
3. Salve
4. ✅ Lembrete cancelado!

### 🧪 Testar Notificações

Para testar se as notificações estão funcionando:

1. Crie uma tarefa
2. Configure um lembrete para **2 minutos no futuro**
3. Minimize o app
4. Aguarde o horário
5. Você deve receber a notificação! 🎉

### ⚙️ Estrutura do Sistema

#### Arquivos Criados/Modificados:

**Novo Serviço:**

- `lib/services/notification_service.dart` - Gerencia notificações

**Modelos Atualizados:**

- `lib/models/task.dart` - Campo `reminderTime` adicionado
- `lib/utils/database_migration.dart` - Migração para reminderTime

**Banco de Dados:**

- Versão 4 do banco
- Nova coluna: `reminderTime TEXT`

**Formulário:**

- Seletor de data e hora para lembretes
- Integração com NotificationService

**Lista de Tarefas:**

- Cancelamento automático ao completar
- Reagendamento ao desmarcar

### 🐛 Solução de Problemas

#### Notificações não aparecem?

**1. Verifique as permissões:**

- Configurações → Apps → Task Manager → Notificações
- Certifique-se que está habilitado

**2. Android em modo de economia de bateria:**

- Configurações → Bateria
- Remova o app das restrições

**3. Reinicie o app:**

- Faça um Hot Restart (Ctrl+Shift+F5)
- Ou feche e abra o app novamente

**4. Hora já passou?**

- Notificações só funcionam para horários futuros
- Configure um lembrete para daqui a 2-3 minutos para testar

### 📦 Pacotes Utilizados

- **flutter_local_notifications** (^19.5.0) - Notificações locais
- **timezone** (^0.10.1) - Gerenciamento de fusos horários

### 🎨 Recursos Visuais

- 🟣 Badge roxo para tarefas com lembrete
- ⏰ Ícone de alarme
- 📅 Data e hora formatadas (dd/MM/yyyy HH:mm)

---

**Dica:** Configure lembretes para suas tarefas mais importantes e nunca mais esqueça nada! 🚀
