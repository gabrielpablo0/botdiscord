const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Configurações
const DISCORD_TOKEN = '1317186985160609862';
const CLICKUP_TOKEN = 'pk_49018384_V99LN7PCXED4T9BFGQWE2U68IKEW58FJ';
const SPACE_ID = 'ID_DO_SEU_SPACE'; // Substitua pelo ID do Space no ClickUp

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Função para buscar as pastas no Space
async function getClickUpFolders() {
    try {
        const response = await axios.get(`https://api.clickup.com/api/v2/space/${SPACE_ID}/folder`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return response.data.folders.map(folder => ({ name: folder.name, id: folder.id }));
    } catch (err) {
        console.error('Erro ao obter pastas do ClickUp:', err);
        return [];
    }
}

// Função para buscar listas em uma pasta específica
async function getClickUpLists(folderId) {
    try {
        const response = await axios.get(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return response.data.lists.map(list => ({ name: list.name, id: list.id }));
    } catch (err) {
        console.error('Erro ao obter listas do ClickUp:', err);
        return [];
    }
}

// Função para buscar tarefas de uma lista específica
async function getClickUpTasks(listId) {
    try {
        const response = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return response.data.tasks.map(task => task.name);
    } catch (err) {
        console.error('Erro ao obter tarefas do ClickUp:', err);
        return [];
    }
}

// Estado para armazenar seleções do usuário
let userSelections = {};

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comando para listar pastas
    if (message.content.startsWith('!pastas')) {
        const folders = await getClickUpFolders();
        if (folders.length === 0) {
            message.reply('Nenhuma pasta encontrada no ClickUp.');
            return;
        }

        // Armazena o estado do usuário
        userSelections[message.author.id] = { step: 'select_folder', folders };

        const folderText = folders.map((folder, index) => `${index + 1}. ${folder.name}`).join('\n');
        message.reply(`Selecione uma pasta respondendo o número correspondente:\n${folderText}`);
        return;
    }

    // Seleção da pasta
    if (userSelections[message.author.id]?.step === 'select_folder') {
        const selectedIndex = parseInt(message.content.trim()) - 1;
        const folders = userSelections[message.author.id].folders;

        if (selectedIndex < 0 || selectedIndex >= folders.length) {
            message.reply('Seleção inválida. Por favor, responda com o número correto.');
            return;
        }

        const selectedFolder = folders[selectedIndex];
        userSelections[message.author.id] = { step: 'select_list', folderId: selectedFolder.id };

        message.reply(`Você selecionou a pasta: ${selectedFolder.name}. Digite "!listas" para ver as listas.`);
        return;
    }

    // Comando para listar listas
    if (message.content.startsWith('!listas')) {
        const folderId = userSelections[message.author.id]?.folderId;

        if (!folderId) {
            message.reply('Por favor, selecione uma pasta primeiro usando o comando "!pastas".');
            return;
        }

        const lists = await getClickUpLists(folderId);
        if (lists.length === 0) {
            message.reply('Nenhuma lista encontrada na pasta selecionada.');
            return;
        }

        // Armazena o estado do usuário
        userSelections[message.author.id].step = 'select_task';
        userSelections[message.author.id].lists = lists;

        const listText = lists.map((list, index) => `${index + 1}. ${list.name}`).join('\n');
        message.reply(`Selecione uma lista respondendo o número correspondente:\n${listText}`);
        return;
    }

    // Seleção da lista
    if (userSelections[message.author.id]?.step === 'select_task') {
        const selectedIndex = parseInt(message.content.trim()) - 1;
        const lists = userSelections[message.author.id].lists;

        if (selectedIndex < 0 || selectedIndex >= lists.length) {
            message.reply('Seleção inválida. Por favor, responda com o número correto.');
            return;
        }

        const selectedList = lists[selectedIndex];
        const tasks = await getClickUpTasks(selectedList.id);

        if (tasks.length === 0) {
            message.reply('Nenhuma tarefa encontrada na lista selecionada.');
            return;
        }

        const taskText = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
        message.reply(`Tarefas disponíveis na lista "${selectedList.name}":\n${taskText}`);

        // Limpa a seleção do usuário
        delete userSelections[message.author.id];
    }
});

client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
