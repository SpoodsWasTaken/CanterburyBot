const { handleApprovalDropdown } = require("./suggestions.js");

function handleStringSelectMenu(interaction) {
    if(interaction.customId === "select_channel") {
        handleApprovalDropdown(interaction);
    }
}

module.exports = { handleStringSelectMenu }