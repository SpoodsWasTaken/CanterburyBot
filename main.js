require("dotenv").config();
const { Client, Events, GatewayIntentBits, MessageFlags } = require("discord.js");
const token = process.env.DISCORD_TOKEN;
const boot = require("./boot.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]});
boot.boot(client);

client.once(Events.ClientReady, readyClient => {
    console.log(`[BOOT-END] Ready! Logged in as ${readyClient.user.tag}`);
})

client.login(token);

client.on(Events.InteractionCreate, async interaction => {
    if(!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if(!command) {
        console.error(`[WARN] No command matching ${interaction.commandName} was found.`);
        return;
    }
    try {
        await command.execute(interaction);
    } catch(error) {
        console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
    }
})

module.exports = {client};