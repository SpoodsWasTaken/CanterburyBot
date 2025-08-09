const { handleDeckEditAutocomplete } = require("../decks.js");

function handleAutocomplete(interaction) {
    try {
        const subcommand = interaction.options.getSubcommand();
        const focusedValue = interaction.options.getFocused();
        
        if(interaction.commandName === "deck" && subcommand === "edit") {
            handleDeckEditAutocomplete(interaction, focusedValue);
        }
        if(interaction.commandName === "prompts" && subcommand === "list") {
            handleDeckEditAutocomplete(interaction, focusedValue);
        }
    } catch(err) {
        console.log("[WARN]", err);
    }
}

module.exports = { handleAutocomplete }