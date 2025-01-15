const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot do Discord está rodando!');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const {
  Client, 
  GatewayIntentBits, 
  Partials, 
  Events, 
  SlashCommandBuilder, 
  REST,
  Routes
} = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = DISCORDID;
const CLICKUP_TOKEN = 'pk_49018384_V99LN7PCXED4T9BFGQWE2U68IKEW58FJ';
const TEAM_ID = '31137452'; 
const CLIENT_ID = '1317186985160609862';
const GUILD_ID = '1153425757020885142';
const OPERACIONAL_SPACE_ID = '90130840358';

const client = new Client({ 
intents: [GatewayIntentBits.Guilds],
partials: [Partials.Channel] 
});

// Funções auxiliares
async function getFoldersInSpace(spaceId) {
  const foldersRes = await axios.get(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, {
    headers: { Authorization: CLICKUP_TOKEN }
  }).catch(() => null);

  if (!foldersRes || !foldersRes.data.folders) return [];
  return foldersRes.data.folders;
}

async function getListsInFolder(folderId) {
  const listsRes = await axios.get(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
    headers: { Authorization: CLICKUP_TOKEN }
  }).catch(() => null);

  if (!listsRes || !listsRes.data.lists) return [];
  return listsRes.data.lists;
}

async function getTasksInList(listId) {
  const response = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    headers: { Authorization: CLICKUP_TOKEN }
  }).catch(() => null);

  if (!response || !response.data.tasks) return [];

  return response.data.tasks.map(task => ({
    name: task.name,
    id: task.id,
    due_date: task.due_date ? new Date(Number(task.due_date)) : null,
    url: task.url
  }));
}

// Criar o comando /tarefas
const commands = [
  new SlashCommandBuilder()
    .setName('tarefas')
    .setDescription('Selecionar pasta, lista e tarefa')
    .addStringOption(option => 
      option.setName('pasta')
        .setDescription('Selecione a pasta')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('lista')
        .setDescription('Selecione a lista')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('tarefa')
        .setDescription('Selecione a tarefa')
        .setRequired(true)
        .setAutocomplete(true)
    )
].map(cmd => cmd.toJSON());

// Registrar comando no servidor
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    console.log('Registrando comando /tarefas...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Comando /tarefas registrado com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comando:', error);
  }
})();

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'tarefas') {
      const focusedOption = interaction.options.getFocused(true);

      const pastaEscolhida = interaction.options.getString('pasta');
      const listaEscolhida = interaction.options.getString('lista');

      try {
        if (focusedOption.name === 'pasta') {
          const query = focusedOption.value.toLowerCase();
          const folders = await getFoldersInSpace(OPERACIONAL_SPACE_ID);
          const filteredFolders = folders.filter(f =>
            f.name.toLowerCase().includes(query) || f.id.includes(query)
          );
          const suggestions = filteredFolders.slice(0, 25).map(f => ({ name: f.name, value: f.id }));
          return interaction.respond(suggestions);
        }

        if (!pastaEscolhida) {
          return interaction.respond([]);
        }

        const folders = await getFoldersInSpace(OPERACIONAL_SPACE_ID);
        let selectedFolder = folders.find(f => f.id === pastaEscolhida);
        if (!selectedFolder) {
          selectedFolder = folders.find(f => f.name.toLowerCase() === pastaEscolhida.toLowerCase());
        }
        if (!selectedFolder) {
          return interaction.respond([]);
        }

        if (focusedOption.name === 'lista') {
          const lists = await getListsInFolder(selectedFolder.id) || [];
          const query = focusedOption.value.toLowerCase();
          const filteredLists = lists.filter(l =>
            l.name.toLowerCase().includes(query) || l.id.includes(query)
          );
          const suggestions = filteredLists.slice(0, 25).map(l => ({ name: l.name, value: l.id }));
          return interaction.respond(suggestions);
        }

        if (!listaEscolhida) {
          return interaction.respond([]);
        }

        const lists = await getListsInFolder(selectedFolder.id) || [];
        let selectedList = lists.find(l => l.id === listaEscolhida);
        if (!selectedList) {
          selectedList = lists.find(l => l.name.toLowerCase() === listaEscolhida.toLowerCase());
        }
        if (!selectedList) {
          return interaction.respond([]);
        }

        if (focusedOption.name === 'tarefa') {
          const tasks = await getTasksInList(selectedList.id) || [];
          const query = focusedOption.value.toLowerCase();
          const filteredTasks = tasks.filter(t =>
            t.name.toLowerCase().includes(query) || t.id.includes(query)
          );
          const suggestions = filteredTasks.slice(0, 25).map(t => ({ name: t.name, value: t.id }));
          return interaction.respond(suggestions);
        }

        return interaction.respond([]);
      } catch (e) {
        console.error('Erro no autocomplete:', e);
        return interaction.respond([]);
      }
    }
    return;
  }

  // Execução normal do comando
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'tarefas') {
    const pastaInput = interaction.options.getString('pasta');
    const listaInput = interaction.options.getString('lista');
    const tarefaInput = interaction.options.getString('tarefa');
    
    await interaction.deferReply();

    const folders = await getFoldersInSpace(OPERACIONAL_SPACE_ID);
    let selectedFolder = folders.find(f => f.id === pastaInput);
    if (!selectedFolder) {
      selectedFolder = folders.find(f => f.name.toLowerCase() === pastaInput.toLowerCase());
    }
    if (!selectedFolder) {
      return interaction.editReply('Pasta não encontrada.');
    }

    const lists = await getListsInFolder(selectedFolder.id) || [];
    let selectedList = lists.find(l => l.id === listaInput);
    if (!selectedList) {
      selectedList = lists.find(l => l.name.toLowerCase() === listaInput.toLowerCase());
    }
    if (!selectedList) {
      return interaction.editReply('Lista não encontrada.');
    }

    const tasks = await getTasksInList(selectedList.id) || [];
    if (tasks.length === 0) {
      return interaction.editReply('Nenhuma tarefa encontrada nesta lista.');
    }

    let selectedTask = tasks.find(t => t.id === tarefaInput);
    if (!selectedTask) {
      selectedTask = tasks.find(t => t.name.toLowerCase() === tarefaInput.toLowerCase());
    }
    if (!selectedTask) {
      return interaction.editReply('Tarefa não encontrada.');
    }

    let dueDateText = 'Sem data de vencimento';
    if (selectedTask.due_date) {
      dueDateText = `📅  Vencimento: ${selectedTask.due_date.toLocaleDateString()}`;
    }

    const finalMessage = `✏️  Tarefa: ${selectedTask.name}\n${dueDateText}\n🔗  Link: ${selectedTask.url}`;
    await interaction.editReply(finalMessage);
  }
});

client.login(DISCORD_TOKEN);
