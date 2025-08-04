const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { pool, runQuery } = require("../../db/db.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("approver")
        .setDescription("Approver commands.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Allow another user to approve prompts.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Allow this user to approve prompts.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Disallow another user from approving prompts.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Disallow this user from approving prompts.")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List users who can approve prompts in this server.")
        ),
    async execute(interaction) {
        if(interaction.options.getSubcommand() === "add") {
            if(!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: "You need administrator permissions to use this command.",
                    flags: MessageFlags.Ephemeral
                })
            }
            try {
                const guild = interaction.guild;
                const user = interaction.options.getUser("user");
                const approvedBy = interaction.user;

                if(user.bot) {
                    return interaction.reply({
                        content: "You can't assign approval powers to bots.",
                        flags: MessageFlags.Ephemeral
                    })
                }
                const member = await guild.members.fetch(user.id);
                if(member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({
                        content: "You can't assign approval powers to admins.",
                        flags: MessageFlags.Ephemeral
                    })
                }

                const existing = await runQuery(
                    "SELECT 1 FROM approvers WHERE guild_id = $1 AND user_id = $2",
                    [guild.id, user.id]
                );
                if(existing.rowCount > 0) {
                    return interaction.reply({
                        content: `${user.username} already has approval powers.`,
                        flags: MessageFlags.Ephemeral
                    })
                }

                await runQuery(
                    "INSERT INTO approvers (guild_id, user_id, added_by) VALUES ($1, $2, $3)",
                    [guild.id, user.id, approvedBy.id]
                );
                console.log(`[APPR] ${user.username} was added as an approver in ${guild.name} by ${approvedBy.name}`)
                await interaction.reply({
                    content: `Successfully granted approval powers to ${user.username}`,
                    flags: MessageFlags.Ephemeral
                })
            } catch(err) {
                console.error("[WARN] Error in adding approver:", err);
                await interaction.reply({
                    content: `Failed to grant approval powers. Try again later.`,
                    flags: MessageFlags.Ephemeral
                })
            }
        }
        if(interaction.options.getSubcommand() === "remove") {
            if(!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: "You need administrator permissions to use this command.",
                    flags: MessageFlags.Ephemeral
                })
            }
            try {
                const guild = interaction.guild;
                const user = interaction.options.getUser("user");

                const existing = await runQuery(
                    "SELECT 1 FROM approvers WHERE guild_id = $1 AND user_id = $2",
                    [guild.id, user.id]
                );
                if(existing.rowCount === 0) {
                    return interaction.reply({
                        content: `${user.username} does not haave approval powers.`,
                        flags: MessageFlags.Ephemeral
                    })
                }
                await runQuery(
                    "DELETE FROM approvers WHERE guild_id = $1 AND user_id = $2",
                    [guild.id, user.id]
                );
                console.log(`[APPR] ${user.username} was removed as an approver in ${guild.name} by ${approvedBy.name}`)
                await interaction.reply({
                    content: `Successfully revoked approval powers from ${user.username}`,
                    flags: MessageFlags.Ephemeral
                })
            } catch(err) {
                console.error("[WARN] Error in removing approver:", err);
                await interaction.reply({
                    content: `Failed to revoke approval powers from ${user.username}`,
                    flags: MessageFlags.Ephemeral
                })
            }
        }
        if(interaction.options.getSubcommand() === "list") {
            try {
                const guild = interaction.guild;
                const admins = guild.members.cache.filter((member) => member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot)
                const listApprovers = new EmbedBuilder()
                    .setColor(0x2596BE)
                    .setDescription("-# Note: recently added admins might take some time to show up on this list.")
                    .setAuthor({ name: `Prompt Approvers for ${guild.name}` });

                let adminValue = ""
                for(const admin of admins) {
                    adminValue += `${admin[1].user.username}\n`
                }
                const { rows } = await runQuery(
                    "SELECT user_id, added_by FROM approvers WHERE guild_id = $1",
                    [guild.id]
                );
                const userPromises = rows.map(async(row) => {
                    const user = await interaction.client.users.fetch(row.user_id);
                    const isMember = await checkUserInGuild(guild, user);

                    if(isMember) {
                        const addedBy = await interaction.client.users.fetch(row.added_by);
                        return {
                            username: user.username,
                            addedByUsername: addedBy.username
                        }
                    } else {
                        return null;
                    }
                })

                const userPromisesResults = await Promise.all(userPromises);
                let usersValue = ""

                for (const res of userPromisesResults) {
                    if(res) {
                        usersValue += `${res.username}\n` + `-# Added by ${res.addedByUsername}\n`;
                    }
                }
                const fields = [
                    {
                        name: "Administrators",
                        value: adminValue
                    },
                    {
                        name: "Users",
                        value: `${usersValue}` || "None",
                    }
                ]
                
                listApprovers.addFields(fields);
                console.log(`[APPR] ${interaction.user.username} listed approvers in ${guild.name}`)
                interaction.reply({
                    embeds: [listApprovers]
                });
                
            } catch(err) {
                console.error("[WARN] Error in listing approvers:", err);
                await interaction.reply({
                    content: `Goblins ate the list, try again later.`,
                    flags: MessageFlags.Ephemeral
                })
            }
        }
    }
}

async function checkUserInGuild(guild, user) {
    const isMember = await guild.members.fetch(user.id).then(() => true).catch(() => false);
        
    if(!isMember) {
        await runQuery(
            "DELETE FROM approvers WHERE guild_id = $1 AND user_id = $2",
            [guild.id, user.id]
        );
        return false;
    }
    return true;
}