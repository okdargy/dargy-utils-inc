import { Client, ParseClient } from 'seyfert';
import { ActivityType, PresenceUpdateStatus } from 'seyfert/lib/types';
import { promises as fs } from 'fs';

import config from '../config.json';

const client = new Client();

client.start().then(async () => {
    client.uploadCommands();

    client.gateway.setPresence({
        activities: [{
            type: ActivityType.Watching,
            name: "you",
            state: " ",
        }],
        afk: false,
        since: Date.now(),
        status: PresenceUpdateStatus.Online,
    })

    try {
        await fs.access(config.tmpDir);
        client.logger.info(`Successfully verified tmp directory: ${config.tmpDir}`);
    } catch (error) {
        await fs.mkdir(config.tmpDir);
        client.logger.info(`Successfully created tmp directory: ${config.tmpDir}`);
    }
});


declare module 'seyfert' {
    interface UsingClient extends ParseClient<Client<true>> { }
}