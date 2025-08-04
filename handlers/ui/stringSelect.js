const { handleApprovalDropdown, handleApprovalDeck } = require("../suggestions.js");

const handled = new Set();

function handleStringSelectMenu(interaction) {
    let done = false; 
    if (interaction.customId === "select_approval_deck") {
        handleApprovalDeck(interaction);
        done = true; 
    }
    if(!done) {
        const msgId = interaction.message.id;

        if(handled.has(msgId)) return
        handled.add(msgId);

        if(interaction.customId === "select_channel") {
            handleApprovalDropdown(interaction);
        } 
        setTimeout(() => handled.delete(msgId), 10 * 60 * 1000)
    }
}

module.exports = { handleStringSelectMenu }