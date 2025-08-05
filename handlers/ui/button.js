const { handleExitApproval, handleApprovalButton } = require("../suggestions.js");
const handled = new Set(); 

function handleButton(interaction) {
    try {
        args = interaction.customId.split(" ")
        if(args[0] === "approve") {
            if(args[1] === "exit") {
                handleExitApproval(interaction);
            } else { handleApprovalButton(interaction); }
        }
    } catch(err) {
        console.log("[WARN]:", err);
    }
}

module.exports = { handleButton }