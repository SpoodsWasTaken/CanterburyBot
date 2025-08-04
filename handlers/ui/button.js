const { handleApprovalButton } = require("../suggestions.js");
const handled = new Set(); 

function handleButton(interaction) {
    try {
        if(interaction.customId.split(" ")[0] === "approve") {
            handleApprovalButton(interaction);
        }
    } catch(err) {
        console.log("[WARN]:", err);
    }
}

module.exports = { handleButton }