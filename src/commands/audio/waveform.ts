import {
    AttachmentBuilder,
    ContextMenuCommand,
    Declare,
    Embed,
    MenuCommandContext,
    MessageCommandInteraction
} from 'seyfert';
import { ApplicationCommandType } from 'seyfert/lib/types';
import { ColorResolvable } from 'seyfert/lib/common';
import selectAttachment from '../../reuseables/selectAttachment';

import config from '../../../config.json';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';

const instructions = [
    '-lavfi showwavespic=s=1024x512:split_channels=1:colors=white|white',
    '-frames:v 1'
]

@Declare({
    name: 'Generate Waveform',
    type: ApplicationCommandType.Message,
    integrationTypes: ['UserInstall', 'GuildInstall'],
})
export default class WaveformCommand extends ContextMenuCommand {
    async run(ctx: MenuCommandContext<MessageCommandInteraction>) {
        ctx.deferReply();
        
        const attachment = await selectAttachment(ctx);
        
        if(!attachment) {
            throw new Error('No attachments found');
        } else if (attachment === "idle") {
            return;
        }

        const res = await fetch(attachment.url);
        if (!res.ok) throw new Error('Failed to fetch the attachment.');

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${config.tmpDir}/${attachment.filename}`;
        await fs.writeFile(fileName, buffer);

        const ffmpegCommand = ffmpeg();
        const output = `${config.tmpDir}/${attachment.id}.png`;

        ffmpegCommand.input(fileName).outputOptions(instructions)
        .output(output)
        .on('end', async () => {
            let embed = new Embed()
                .setColor(config.colors.primary as ColorResolvable) 
                .setTitle('Successfully generated!')
                .setDescription(`Waveform generated for \`${attachment.filename}\``)
                .setFooter({text: `Requested by ${ctx.interaction.user.tag}`, iconUrl: ctx.interaction.user.avatarURL()})
        
            // Renamed the variable to avoid conflict
            let outputAttachment = new AttachmentBuilder()
                .setFile('path', output)
                .setName(`waveform-${attachment.filename}-${attachment.id}.png`)

            await ctx.editOrReply({
                embeds: [embed],
                files: [outputAttachment]
            })

            // Clean up temp files
            await fs.unlink(fileName);
            await fs.unlink(output);

            return;
        })
        .on('error', async (err) => {
            let embed = new Embed()
                .setColor(config.colors.error as ColorResolvable)
                .setTitle('Failed to generate')
                .setDescription(`An error occurred while generating the waveform.\n\`\`\`${err}\`\`\``)
        
            console.error(err);
            fs.unlink(fileName);

            return ctx.editOrReply({
                embeds: [embed]
            })
        })
        .run();
    }

    async onRunError(ctx: MenuCommandContext<MessageCommandInteraction>, error: Error) {
        ctx.client.logger.error(error);

        const errorEmbed = new Embed()
            .setTitle('Error')
            .setDescription(error.message)
            .setColor(config.colors.error as ColorResolvable);

        return ctx.editOrReply({
            embeds: [errorEmbed]
        })
    }
}