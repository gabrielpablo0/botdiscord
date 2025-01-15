const { Client, GatewayIntentBits, Partials, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const express = require('express');
const { parse } = require('url');
require('dotenv').config();

// Configuração do Express (para Vercel)
const app = express();
app.get('/', (req, res) => {
    res.send('Bot do Discord está rodando!');
});

module.exports = (req, res) => {
    const parsedUrl = parse(req.url, true);
    app.handle(req, res);
};

// Variáveis de ambiente
const DISCORD_TOKEN = process.env.DISCORDID;
const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN || 'pk_49018384_V99LN7PCXED4T9BFGQWE2U68IKEW58FJ';
const TEAM_ID = process.env.TEAM_ID || '31137452';
const CLIENT_ID = process.env.CLIENT_ID || '1317186985160609862';
const GUILD_ID = process.env.GUILD_ID || '1153425757020885142';
const OPERACIONAL_SPACE_ID = process.env.OPERACIONAL_SPACE_ID || '90130840358';

// Configurando o cliente Discord
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
});

// Funções auxiliares para ClickUp
async function getFoldersInSpace(spaceId) {
    try {
        const { data } = await axios.get(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return data.folders || [];
    } catch (error) {
        console.error('Erro ao buscar pastas na API do ClickUp:', error.message);
        return [];
    }
}

async function getListsInFolder(folderId) {
    try {
        const { data } = await axios.get(`https://api.clickup.com/api/v2/folder/${folderId}/list`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return data.lists || [];
    } catch (error) {
        console.error('Erro ao buscar listas na API do ClickUp:', error.message);
        return [];
    }
}

async function getTasksInList(listId) {
    try {
        const { data } = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            headers: { Authorization: CLICKUP_TOKEN },
        });
        return data.tasks.map(task => ({
            name: task.name,
            id: task.id,
            due_date: task.due_date ? new Date(Number(task.due_date)) : null,
            url: task.url,
        }));
    } catch (error) {
        console.error('Erro ao buscar tarefas na API do ClickUp:', error.message);
        return [];
    }
}

// Registro de comandos no Discord
const commands = [
    new SlashCommandBuilder()
        .setName('tarefas')
        .setDescription('Selecionar pasta, lista e tarefa')
        .addStringOption(option =>
            option.setName('pasta').setDescription('Selecione a pasta').setRequired(true).setAutocomplete(true),
        )
        .addStringOption(option =>
            option.setName('lista').setDescription('Selecione a lista').setRequired(true).setAutocomplete(true),
        )
        .addStringOption(option =>
            option.setName('tarefa').setDescription('Selecione a tarefa').setRequired(true).setAutocomplete(true),
        ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registrando comando /tarefas...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Comando /tarefas registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comando:', error.message);
    }
})();

// Eventos do cliente Discord
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isAutocomplete()) {
        console.log('Autocomplete acionado:', interaction.commandName);

        const focusedOption = interaction.options.getFocused(true);
        const pastaEscolhida = interaction.options.getString('pasta');
        const listaEscolhida = interaction.options.getString('lista');

        try {
            if (focusedOption.name === 'pasta') {
                console.log('Buscando pastas...');
                const folders = await getFoldersInSpace(OPERACIONAL_SPACE_ID);
                console.log('Pastas obtidas:', folders);
                const suggestions = folders.slice(0, 25).map(f => ({ name: f.name, value: f.id }));
                return interaction.respond(suggestions);
            }

            if (focusedOption.name === 'lista' && pastaEscolhida) {
                console.log('Buscando listas na pasta:', pastaEscolhida);
                const lists = await getListsInFolder(pastaEscolhida);
                console.log('Listas obtidas:', lists);
                const suggestions = lists.slice(0, 25).map(l => ({ name: l.name, value: l.id }));
                return interaction.respond(suggestions);
            }

            if (focusedOption.name === 'tarefa' && listaEscolhida) {
                console.log('Buscando tarefas na lista:', listaEscolhida);
                const tasks = await getTasksInList(listaEscolhida);
                console.log('Tarefas obtidas:', tasks);
                const suggestions = tasks.slice(0, 25).map(t => ({ name: t.name, value: t.id }));
                return interaction.respond(suggestions);
            }

            return interaction.respond([]);
        } catch (error) {
            console.error('Erro no autocomplete:', error.message);
            return interaction.respond([]);
        }
    }

    if (interaction.commandName === 'tarefas') {
        await interaction.reply('Comando /tarefas executado com sucesso!');
    }
});

client.login(DISCORD_TOKEN);
