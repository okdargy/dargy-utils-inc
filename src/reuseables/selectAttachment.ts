import { ActionRow, Button, Embed, MenuCommandContext, MessageCommandInteraction } from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";

import config from '../../config.json';
import { ColorResolvable } from "seyfert/lib/common";

export default async function selectAttachment(ctx: MenuCommandContext<MessageCommandInteraction>) {
    const message = Object.values(ctx.interaction.data.resolved.messages)[0];
    const attachments = message.attachments;

    switch(attachments.length) {
        case 0:
            return null
        case 1:
            return attachments[0]
        default:
            const buttons = [];

            for (let i = 0; i < attachments.length; i++) {
                buttons.push(new Button()
                    .setLabel(`${i + 1}. ${attachments[i].filename}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`selectAttachment:${i}`));
            }

            const actionRows: ActionRow<Button>[] = [];

            for (let i = 0; i < buttons.length; i += 5) {
                const chunk = buttons.slice(i, i + 5);
                const row = new ActionRow<Button>().setComponents(chunk);
                actionRows.push(row);
            }

            const embed = new Embed()
                .setColor(config.colors.primary as ColorResolvable)
                .setTitle('Multiple Attachments Found')
                .setDescription("Please select an attachment to use by clicking the corresponding button.")

            const reply = await ctx.editOrReply({
                embeds: [embed],
                components: actionRows
            }, true);

            return new Promise((resolve: (value: typeof attachments[0] | "idle" | null) => void) => {
                const collector = reply.createComponentCollector({
                    filter: (interaction) => interaction.user.id === ctx.interaction.user.id,
                    onStop(reason) {
                        if(reason === 'idle') {
                            const timeoutEmbed = new Embed()
                                .setColor(config.colors.error as ColorResolvable)
                                .setTitle('Timeout')
                                .setDescription('You took too long to select an attachment.');
        
                            ctx.editOrReply({
                                embeds: [timeoutEmbed],
                                components: []
                            })

                            resolve(reason);
                        } 
    
                        resolve(null);
                    },
                    idle: config.timeout
                });
                
                // collector.run(customId)
                for (let i = 0; i < attachments.length; i++) {
                    collector.run(`selectAttachment:${i}`, async () => {
                        console.log(attachments[i]);
                        resolve(attachments[i]);
                        collector.stop();

                        const embed = new Embed()
                            .setColor(config.colors.processing as ColorResolvable)
                            .setTitle('Attachment Selected')
                            .setDescription(`Processing attachment: \`${attachments[i].filename}\``);

                        await reply.edit({
                            embeds: [embed],
                            components: []
                        });
                    });
                }
            })
    }
}