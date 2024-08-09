import {
    ActionRow,
    AttachmentBuilder,
    Button,
    ContextMenuCommand,
    Declare,
    Embed,
    MenuCommandContext,
    MessageCommandInteraction,
} from 'seyfert';
import { ApplicationCommandType, ButtonStyle } from 'seyfert/lib/types';
import { ColorResolvable, InteractionCreateBodyRequest, InteractionMessageUpdateBodyRequest } from 'seyfert/lib/common';

import { Shazam } from 'node-shazam';
import config from '../../../config.json';
import fs from 'fs/promises';

@Declare({
    name: 'Use Shazam',
    type: ApplicationCommandType.Message,
    integrationTypes: ['UserInstall', 'GuildInstall'],
})

export default class ShazamCommand extends ContextMenuCommand {
    async run(ctx: MenuCommandContext<MessageCommandInteraction>) {
        ctx.deferReply();

        const message = Object.values(ctx.interaction.data.resolved.messages)[0];
        const attachments = message.attachments;

        if (!attachments) {
            throw new Error('No attachments found');
        }

        const attachment = attachments[0];

        const res = await fetch(attachment.url);
        if (!res.ok) throw new Error('Failed to fetch the attachment.');

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${config.tmpDir}/${attachment.filename}`;
        await fs.writeFile(fileName, buffer);

        const shazam = new Shazam();
        const recognise = await shazam.recognise(fileName);

        await fs.unlink(fileName); // Clean up

        if (!recognise) {
            throw new Error('No results found');
        }

        if ('track' in recognise) {
            let primaryColor = config.colors.shazam;

            if (recognise.track.images && recognise.track.images.joecolor) {
                const match = recognise.track.images.joecolor.match(/b:([0-9a-fA-F]{6})/);
                if (match) {
                    primaryColor = `#${match[1]}`;
                }
            }

            const fields = [
                { name: 'Album', value: recognise.track.sections[0].metadata?.find(x => x.title === 'Album')?.text || "Unknown", inline: true },
                { name: 'Released', value: recognise.track.sections[0].metadata?.find(x => x.title === 'Released')?.text || "Unknown", inline: true },
                { name: 'Genre', value: recognise.track.genres.primary || "Unknown", inline: true },
                { name: 'Label', value: recognise.track.sections[0].metadata?.find(x => x.title === 'Label')?.text || "Unknown", inline: true },
                { name: 'ISRC', value: recognise.track.isrc || "Unknown", inline: true },
                { name: 'Explicit', value: recognise.track.hub.explicit === undefined ? '❔' : (recognise.track.hub.explicit ? '✅' : '❌'), inline: true },
            ];
            const filteredFields = fields.filter(field => field.value !== "Unknown");

            const embed = new Embed()
                .setColor(primaryColor as ColorResolvable)
                .setTitle(`${recognise.track.subtitle} - ${recognise.track.title}`)
                .addFields(filteredFields)
                .setFooter({text: `Requested by ${ctx.interaction.user.tag}`, iconUrl: ctx.interaction.user.avatarURL()})

            const coverAttachment = new AttachmentBuilder()
                .setName('cover.jpg')
                .setFile('url', recognise.track.images.coverarthq || recognise.track.images.coverart)

            let payload: InteractionCreateBodyRequest | InteractionMessageUpdateBodyRequest = {
                embeds: [embed],
                files: [coverAttachment]
            };

            const appleUrl = recognise.track.hub.options.find(x => x.caption === 'OPEN IN')?.actions.find(x => x.uri.includes('music.apple.com') && !x.uri.includes('/subscribe'))?.uri;

            if (appleUrl) {
                const odesliRes = await fetch('https://api.odesli.co/resolve?url=' + appleUrl)
                const data = await odesliRes.json();

                if (data.code === "COULD_NOT_RESOLVE_ENTITY") {
                    throw new Error('Could not resolve entity');
                }

                const songRes = await fetch(`https://api.song.link/v1-alpha.1/links?id=${data.id}&type=song&platform=${data.provider}`)
                const songData = await songRes.json();

                const buttons: Button[] = [];

                for (const [key, value] of Object.entries(config.emojis.links)) {
                    if (songData.linksByPlatform[key]) {
                        const url = songData.linksByPlatform[key].url;

                        const button = new Button()
                            .setStyle(ButtonStyle.Link)
                            .setEmoji(value)
                            .setURL(url);

                        buttons.push(button);
                    }
                }

                const actionRows: ActionRow<Button>[] = [];
                
                for (let i = 0; i < buttons.length; i += 5) {
                    const chunk = buttons.slice(i, i + 5);
                    const row = new ActionRow<Button>().setComponents(chunk);
                    actionRows.push(row);
                }
                
                payload = { ...payload, components: actionRows };
            }

            return ctx.editOrReply(payload);
        } else {
            const embed = new Embed()
                .setColor(config.colors.shazam as ColorResolvable)
                .setTitle(`🎶  ${recognise.artist} - ${recognise.title}`)
                .addFields([
                    { name: 'Album', value: recognise.album || "Unknown", inline: true },
                    { name: 'Year', value: recognise.year || "Unknown", inline: true }
                ])
                .setFooter({text: `Requested by ${ctx.interaction.user.tag}`, iconUrl: ctx.interaction.user.avatarURL()})

            return ctx.editOrReply({
                embeds: [embed]
            });
        }
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