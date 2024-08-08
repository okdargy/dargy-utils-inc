const { config } = require('seyfert');
require('dotenv').config();

module.exports = config.bot({
    token: process.env.TOKEN ?? "",
    intents: ["Guilds"],
    locations: {
        base: "src",
        output: "dist",
        commands: "commands",
        events: "events",
    }
});