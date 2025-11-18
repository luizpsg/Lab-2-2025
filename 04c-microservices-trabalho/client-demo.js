// client-demo.js
const axios = require("axios");

const API_URL = "http://localhost:3000";
let authToken = "";
let currentUserId = "";
let currentListId = "";

// Utility function to delay between operations
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility function to print formatted output
function printSection(title) {
  console.log("\n" + "=".repeat(50));
  console.log(`  ${title}`);
  console.log("=".repeat(50));
}

// Utility function to handle API errors
async function makeRequest(method, endpoint, data = null, useToken = false) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {},
    };

    if (useToken && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error in ${method} ${endpoint}:`,
      error.response?.data?.error || error.message
    );
    console.error(`Status: ${error.response?.status}`);
    console.error(`Full URL: http://localhost:3000${endpoint}`);
    if (error.response?.data) {
      console.error(`Response data:`, error.response.data);
    }
    throw error;
  }
}

// Demo functions

async function checkHealth() {
  printSection("HEALTH CHECK");

  try {
    const health = await makeRequest("GET", "/../health");
    console.log("✅ API Gateway Status:", health.status);
    console.log("📊 Services:");
    health.services.forEach((service) => {
      const statusEmoji = service.status === "healthy" ? "✅" : "❌";
      console.log(
        `   ${statusEmoji} ${service.name}: ${service.status} (${service.url})`
      );
    });
  } catch (error) {
    console.log("❌ Gateway not ready");
  }
}

async function registerUser() {
  printSection("1. REGISTRO DE USUÁRIO");

  const userData = {
    email: `user_${Date.now()}@example.com`,
    username: `user_${Date.now()}`,
    password: "senha123",
    firstName: "João",
    lastName: "Silva",
    preferences: {
      defaultStore: "Supermercado Central",
      currency: "BRL",
    },
  };

  console.log("📝 Registrando usuário:", userData.username);

  const result = await makeRequest("POST", "/api/auth/register", userData);

  authToken = result.token;
  currentUserId = result.user.id;

  console.log("✅ Usuário registrado com sucesso!");
  console.log("   ID:", currentUserId);
  console.log("   Email:", result.user.email);
  console.log("   Token:", authToken.substring(0, 30) + "...");

  return result;
}

async function loginUser() {
  printSection("2. LOGIN DE USUÁRIO");

  const loginData = {
    login: `user_${Date.now()}@example.com`,
    password: "senha123",
  };

  console.log("🔐 Fazendo login com:", loginData.login);

  const result = await makeRequest("POST", "/api/auth/login", loginData);

  authToken = result.token;

  console.log("✅ Login realizado com sucesso!");
  console.log("   User:", result.user.username);

  return result;
}

async function searchItems() {
  printSection("3. BUSCA DE ITENS NO CATÁLOGO");

  // Buscar todos os itens
  console.log("🔍 Buscando todos os itens...");
  const allItemsResponse = await makeRequest("GET", "/api/items");
  const allItems = allItemsResponse.items || [];
  console.log(`   Encontrados ${allItems.length} itens no catálogo`);

  // Buscar por categoria
  console.log('\n🔍 Buscando itens da categoria "Alimentos"...');
  const foodItemsResponse = await makeRequest(
    "GET",
    "/api/items?category=Alimentos"
  );
  const foodItems = foodItemsResponse.items || [];
  console.log("   Itens encontrados:");
  foodItems.slice(0, 3).forEach((item) => {
    console.log(`   • ${item.name} - R$ ${item.averagePrice}`);
  });

  // Buscar por nome
  console.log('\n🔍 Buscando por "arroz"...');
  const searchResults = await makeRequest("GET", "/api/search?q=arroz");
  if (searchResults.items.length > 0) {
    console.log("   Resultado:", searchResults.items[0].name);
  }

  return allItems;
}

async function createList() {
  printSection("4. CRIAÇÃO DE LISTA DE COMPRAS");

  const listData = {
    name: "Compras da Semana",
    description: "Lista para fazer as compras do fim de semana",
  };

  console.log("📋 Criando lista:", listData.name);

  const result = await makeRequest("POST", "/api/lists", listData, true);

  currentListId = result.id;

  console.log("✅ Lista criada com sucesso!");
  console.log("   ID:", currentListId);
  console.log("   Status:", result.status);

  return result;
}

async function addItemsToList(items) {
  printSection("5. ADICIONANDO ITENS À LISTA");

  const itemsToAdd = [
    { itemId: items[0].id, quantity: 2, notes: "Preferência: Tio João" },
    { itemId: items[1].id, quantity: 1, notes: "" },
    { itemId: items[2].id, quantity: 3, notes: "Integral se tiver" },
    { itemId: items[4].id, quantity: 2, notes: "" },
    { itemId: items[10].id, quantity: 1, notes: "Folha dupla" },
  ];

  for (const item of itemsToAdd) {
    const itemDetails = items.find((i) => i.id === item.itemId);
    console.log(`➕ Adicionando: ${itemDetails.name} (Qtd: ${item.quantity})`);

    await makeRequest("POST", `/api/lists/${currentListId}/items`, item, true);
    await delay(500); // Small delay between requests
  }

  console.log("✅ Todos os itens foram adicionados!");
}

async function updateItemStatus() {
  printSection("6. ATUALIZANDO STATUS DE ITENS");

  // Get current list
  const list = await makeRequest(
    "GET",
    `/api/lists/${currentListId}`,
    null,
    true
  );

  if (list.items.length > 0) {
    const firstItem = list.items[0];
    console.log(`📝 Marcando "${firstItem.itemName}" como comprado...`);

    await makeRequest(
      "PUT",
      `/api/lists/${currentListId}/items/${firstItem.itemId}`,
      {
        purchased: true,
      },
      true
    );

    console.log("✅ Item marcado como comprado!");
  }
}

async function viewListSummary() {
  printSection("8. RESUMO DA LISTA");

  const summary = await makeRequest(
    "GET",
    `/api/lists/${currentListId}/summary`,
    null,
    true
  );

  console.log("📊 Resumo da Lista:", summary.listName);
  console.log("   Status:", summary.status);
  console.log("   Total de itens:", summary.totalItems);
  console.log("   Itens comprados:", summary.purchasedItems);
  console.log("   Total estimado: R$", summary.estimatedTotal.toFixed(2));

  if (summary.unpurchasedItems && summary.unpurchasedItems.length > 0) {
    console.log("\n   Itens pendentes:");
    summary.unpurchasedItems.forEach((item) => {
      console.log(
        `   • ${item.name} (${
          item.quantity
        }x) - R$ ${item.estimatedCost.toFixed(2)}`
      );
    });
  }
}

async function checkoutList() {
  printSection("7. FINALIZAÇÃO DE COMPRA (CHECKOUT)");

  const response = await makeRequest(
    "POST",
    `/api/lists/${currentListId}/checkout`,
    null,
    true
  );

  console.log("🚀 Checkout enviado com sucesso!");
  console.log("   Status:", response.status);
  console.log("   Total estimado:", response.summary.estimatedTotal);
  console.log("   Acompanhe os consumers para ver os eventos no RabbitMQ.");
}

async function viewDashboard() {
  printSection("9. DASHBOARD AGREGADO");

  const dashboard = await makeRequest("GET", "/api/dashboard", null, true);

  console.log("👤 Usuário:", dashboard.user.username);
  console.log("\n📈 Estatísticas:");
  console.log("   Total de listas:", dashboard.statistics.totalLists);
  console.log("   Listas ativas:", dashboard.statistics.activeLists);
  console.log("   Total de itens:", dashboard.statistics.totalItems);
  console.log("   Itens comprados:", dashboard.statistics.purchasedItems);
  console.log(
    "   Custo total estimado: R$",
    dashboard.statistics.totalEstimatedCost.toFixed(2)
  );

  if (dashboard.recentItems && dashboard.recentItems.length > 0) {
    console.log("\n🆕 Itens recentes no catálogo:");
    dashboard.recentItems.forEach((item) => {
      console.log(`   • ${item.name} (${item.category})`);
    });
  }
}

async function globalSearch() {
  printSection("10. BUSCA GLOBAL");

  const query = "pão";
  console.log(`🔍 Buscando por "${query}" em todo o sistema...`);

  const results = await makeRequest("GET", `/search?q=${query}`, null, true);

  console.log(`\n📦 Itens encontrados: ${results.items.length}`);
  results.items.forEach((item) => {
    console.log(
      `   • ${item.name} (${item.category}) - R$ ${item.averagePrice}`
    );
  });

  console.log(`\n📋 Listas encontradas: ${results.lists.length}`);
  results.lists.forEach((list) => {
    console.log(`   • ${list.name}`);
  });
}

// Main demo function
async function runDemo() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   DEMO - SISTEMA DE LISTA DE COMPRAS        ║");
  console.log("║   Arquitetura de Microsserviços             ║");
  console.log("╚══════════════════════════════════════════════╝");

  try {
    // Wait for services to be ready
    console.log("\n⏳ Aguardando serviços iniciarem...");
    await delay(3000);

    // Check health
    await checkHealth();
    await delay(1000);

    // Run demo steps
    await registerUser();
    await delay(1000);

    const items = await searchItems();
    await delay(1000);

    await createList();
    await delay(1000);

    await addItemsToList(items);
    await delay(1000);

    await updateItemStatus();
    await delay(1000);

    await checkoutList();
    await delay(1000);

    await viewListSummary();
    await delay(1000);

    await viewDashboard();
    await delay(1000);

    await globalSearch();

    printSection("DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO! ✅");
    console.log("\n🎉 Todos os fluxos foram executados com sucesso!");
    console.log("📝 O sistema está pronto para uso.\n");
  } catch (error) {
    console.error("\n❌ Erro durante a demonstração:", error.message);
    console.log("\nVerifique se todos os serviços estão rodando:");
    console.log("  1. cd services/user-service && npm start");
    console.log("  2. cd services/item-service && npm start");
    console.log("  3. cd services/list-service && npm start");
    console.log("  4. cd api-gateway && npm start\n");
  }
}

// Run the demo
runDemo();
