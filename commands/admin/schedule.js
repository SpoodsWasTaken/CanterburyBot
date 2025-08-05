const cron = require("node-cron");
const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { runQuery } = require("../../db/db.js");
const { activeQotdJobs, sendQotd } = require("../../handlers/qotdPost.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("schedule")
        .setDescription("Schedule your QOTD prompts.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription("Time of day to post, in HH:MM (24h) format. E.g.: 19:00")
                .setMaxLength(5)
                .setRequired(true)
        )
        .addStringOption(option => 
            option
                .setName("timezone")
                .setDescription("Timezone. Relative to UTC, in +/-H format. E.g.: +11")
                .setMaxLength(3)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to schedule posts for. Defaults to current channel.")
                .addChannelTypes(ChannelType.GuildText)
        ),
    async execute(interaction) {
        try {
            const time = interaction.options.getString("time");
            const timezone = interaction.options.getString("timezone");
            const channel = interaction.options.getChannel("channel") || interaction.channel;

            if(!await validateTime(interaction, time)) return;
            if(!await validateTimezone(interaction, timezone)) return;
            if(!await validateChannel(interaction, channel)) return;
            
            const [hours, min] = time.split(":");
            const cronEx = `${min} ${hours} * * *`;

            const cronTz = `Etc/GMT${parseInt(timezone) > 0 ? "-" : "+"}${Math.abs(parseInt(timezone))}`;

            await runQuery(`
                INSERT INTO channels (
                    id,
                    cron_expression,
                    utc_offset,
                    suggestion_limit
                ) VALUES ($1, $2, $3, $4)
            `, [channel.id, cronEx, cronTz, 50]);

            const job = cron.schedule(cronEx, async() => {
                sendQotd(interaction.client, channel);
            }, {
                timezone: cronTz,
                scheduled: true
            })
            activeQotdJobs.set(channel.id, job);
            const successCard = new EmbedBuilder()
                .setColor(0x2596BE)
                .setTitle("QOTD Scheduled")
                .setDescription(`I will post every day in #${channel.name} at ${time} (UTC ${timezone})!`)

            await interaction.reply({
                embeds: [successCard],
                flags: MessageFlags.Ephemeral
            })

        } catch(err) {
            console.log("[WARN]", err);
        }
    }
}
async function validateTime(interaction, time) {
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        await interaction.reply({ 
            content: 'Invalid time format. Please use HH:MM (24-hour format).', 
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    return true;
}
async function validateTimezone(interaction, tz) {
    if (!/^[+-]?(0?[0-9]|1[0-4])$/.test(tz)) {
        await interaction.reply({ 
            content: 'Invalid UTC offset. Use between -12 and +14 (e.g., -5, +8, 0).', 
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    return true;
}
async function validateChannel(interaction, channel) {
    const channelDeckCount = await runQuery(`
        SELECT COUNT(*) AS count
        FROM decks
        WHERE channel_id = $1
        `, [channel.id])
    
    if(channelDeckCount.rows[0].count < 1) {
        await interaction.reply({ 
            content: 'Invalid channel. Ensure the channel has at least one associated deck.', 
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    return true;
}