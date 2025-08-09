const { ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");

class Paginated {
    constructor(_interaction, _pages, _options) {
        this.interaction = _interaction;
        this.pages = _pages; 
        this.currentPage = 0;
        this.components = [];

        let pageIndex = this.currentPage;
        for(const page of this.pages) {
            page.setFooter({
                text: `Page ${pageIndex + 1} of ${this.pages.length}`
            })
            pageIndex++;
        }
        if(_options) {
            this.components.push(_options);
        } 
        if(this.pages.length > 1) {
            const firstButton = new ButtonBuilder()
                .setCustomId("pageFirst")
                .setLabel("⏮")
                .setStyle(ButtonStyle.Secondary)
            const backButton = new ButtonBuilder()
                .setCustomId("pageBack")
                .setLabel("◀")
                .setStyle(ButtonStyle.Primary)
            const nextButton = new ButtonBuilder()
                .setCustomId("pageNext")
                .setLabel("▶")
                .setStyle(ButtonStyle.Primary)
            const lastButton = new ButtonBuilder()
                .setCustomId("pageLast")
                .setLabel("⏭")
                .setStyle(ButtonStyle.Secondary)
            const row = new ActionRowBuilder()
                .addComponents(firstButton, backButton, nextButton, lastButton);
            this.components.push(row);
        }

        this.init();
    }
    async init() {
        const contents = {
            embeds: [this.pages[this.currentPage]],
            components: this.components,
            flags: MessageFlags.Ephemeral,
            withResponse: true
        }
        const response = await this.interaction.reply(contents);
        const message = response.resource.message;
        const collector = message.createMessageComponentCollector({
            time: 600000
        });
        collector.on("collect", async (i) => {
            if(i.customId === "pageFirst") {
                this.currentPage = 0;
            } else if(i.customId === "pageLast") {
                this.currentPage = this.pages.length - 1;
            } else if(i.customId === "pageBack") {
                this.currentPage = (this.currentPage - 1 + this.pages.length) % this.pages.length;
            } else if(i.customId === "pageBack") {
                this.currentPage = (this.currentPage + 1) % this.pages.length;
            }
            await i.update({
                embeds: [this.pages[this.currentPage]],
                components: this.components
            });
        });
        collector.on("end", () => {
            message.edit({ components: [] }).catch(() => {});
        })
    }
}

module.exports = Paginated;