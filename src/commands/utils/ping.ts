import {
    Command,
    Declare,
    Embed,
    type CommandContext
} from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types';
import { ColorResolvable } from 'seyfert/lib/common';

import config from '../../../config.json';
import os from 'os';

@Declare({
    name: 'ping',
    description: 'Show the bot latency and other general stats to help determine the bot\'s health',
})
export default class PingCommand extends Command {
    async run(ctx: CommandContext) {
        const ping = ctx.client.gateway.latency;

        const embed = new Embed()
            .setColor(config.colors.primary as ColorResolvable)
            .setTitle('Latency')
            .setDescription('Here are some stats to help determine the bot\'s health')
            .addFields([
                {
                    name: ":stopwatch: Ping",
                    value: `${ping}ms`,
                    inline: true
                },
                {
                    name: ":person_running: CPU",
                    value: `${os.loadavg()[0]}%`,
                    inline: true
                },
                {
                    name: ":brain: Memory",
                    value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    inline: true
                },
                {
                    name: ":clock1: Uptime",
                    value: getFormattedUptime(),
                    inline: true
                }
            ])

        await ctx.write({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

}

const getFormattedUptime = () => {
    const uptimeSeconds = process.uptime();
    
    const timeUnits = [
        { unit: 'm', value: Math.floor(uptimeSeconds / (30 * 24 * 60 * 60)) },
        { unit: 'd', value: Math.floor((uptimeSeconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60)) },
        { unit: 'h', value: Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60)) },
        { unit: 'm', value: Math.floor((uptimeSeconds % (60 * 60)) / 60) },
        { unit: 's', value: Math.floor(uptimeSeconds % 60) }
    ];

    return timeUnits
        .filter(({ value }) => value > 0)
        .map(({ unit, value }) => `${value}${unit}`)
        .join(' ');
}