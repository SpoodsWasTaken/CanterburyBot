const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const { pool, runQuery } = require("../../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggestions")
        .setDescription("Suggestion commands.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
        const prompts = await runQuery(`
            SELECT channel_id, COUNT(*) as count
            FROM prompts
            WHERE guild_id = $1
            AND deck_id IS NULL
            GROUP BY channel_id
        `, [guild.id])
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
        await interaction.reply({
            content: "Select a channel from the list:",
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    } catch(err) {
        console.log("[WARN]", err);
    }
}
async function checkApprover(guild, user) {
    const approver = await runQuery(
        "SELECT 1 FROM approvers WHERE guild_id = $1 AND user_id = $2",
        [guild.id, user.id]
    );
    const member = await guild.members.fetch(user.id);
    const admin = member.permissions.has(PermissionFlagsBits.Administrator)
    if(approver.rowCount === 0 && !admin) {
        return false;
    }
    return true;
}