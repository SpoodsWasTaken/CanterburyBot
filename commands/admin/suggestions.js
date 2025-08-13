const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, ThreadAutoArchiveDuration,
    ChannelType, EmbedBuilder
 } = require("discord.js");
const { pool, runQuery } = require("../../db/db.js");
const { promptMenus, checkApprover } = require("../../handlers/suggestions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggestions")
        .setDescription("Suggestion commands.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("approve")
                .setDescription("View and approve the queue of user-submitted prompt suggestions.")
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "approve") {
            try {
                const guild = interaction.guild;
                const user = interaction.user;
                const isApprover = await checkApprover(guild, user);
                const count = interaction.options.getNumber("count") || 10;

                if(!isApprover) {
                    return interaction.reply({
                        content: "You are not a prompt approver on this server.",
                        flags: MessageFlags.Ephemeral
                    });
                }
                sendList(interaction, guild, count);

            } catch(err) {
                console.log("[WARN]", err);
            }
        }
    }
}
async function sendList(interaction, guild) {
    try {
        if(promptMenus.has(guild.id)) {
            return interaction.reply({
                content: `Someone else in this server is currently approving prompts. Try again later.`,
                flags: MessageFlags.Ephemeral
            })
        }
        promptMenus.set(guild.id, null);
        const prompts = await runQuery(`
            SELECT channel_id, COUNT(*) as count
            FROM prompts
            WHERE guild_id = $1
            AND deck_id IS NULL
            GROUP BY channel_id
        `, [guild.id])
        if(prompts.rows.length === 0) {
            console.log(`[QOTD] ${interaction.user.username} tried approving prompts in ${guild.name}, but no pending suggestions were found`);
            return interaction.reply({
                content: "There are no pending suggestions to approve in this server.",
                flags: MessageFlags.Ephemeral
            })
        }
        console.log(`[QOTD] ${interaction.user.username} is approving prompts in ${guild.name}`)
        const channelData = {};
        await Promise.all(
            prompts.rows.map(async ({ channel_id }) => {
                try {
                    const channel = await interaction.guild.channels.fetch(channel_id);
                    channelData[channel_id] = channel.name;
                } catch (err) {
                    channelData[channel_id] = "[Deleted Channel]";
                    console.log("[WARN]", err);
                }
            })
        );
        const options = prompts.rows.map(({ channel_id, count }) => {
            const channelName = channelData[channel_id] || "[Unknown Channel]";
            const truncatedName = channelName.length > 100 ? channelName.slice(0, 96) + "..." : channelName;

            return {
                label: `#${truncatedName}`,
                description: `${count} prompt(s) pending`,
                value: channel_id
            };
        });
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_channel")
            .setPlaceholder("Choose a channel")
            .addOptions(options);
        const row = new ActionRowBuilder().addComponents(selectMenu);

        const thread = await interaction.channel.threads.create({
            name: `QOTD Prompts Approval`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            type: ChannelType.PrivateThread,
            reason: "Approve QOTD prompts for this channel. Expires in one hour."
        });
        await thread.members.add(interaction.user.id);
        const newThreadCard = new EmbedBuilder()
            .setColor(0x2596BE)
            .setTitle("Private thread created!")
            .setDescription(`Check it out here: ${thread}`)
        await thread.send({
            content: "Select a channel from the list:",
            components: [row],
        });
        await interaction.reply({
            embeds: [newThreadCard],
            flags: MessageFlags.Ephemeral
        })
    } catch(err) {
        console.log("[WARN]", err);
    }
}
