const DTF = require('@eartharoid/dtf');
const dtf = new DTF();
const {
	MessageAttachment,
	MessageEmbed
} = require('discord.js');

module.exports = {
	emitter: 'client.tickets',
	event: 'close',
	execute: async (plugin, id) => {
		const { client } = plugin;

		const ticket = await client.db.models.Ticket.findOne({ where: { id } });
		if (!ticket) return;

		const category = await client.db.models.Category.findOne({ where: { id: ticket.category } });
		if (!category) return;

		const guild = await client.db.models.Guild.findOne({ where: { id: category.guild } });
		if (!guild) return;

		const lines = [];
		const creator = await client.db.models.UserEntity.findOne({
			where: {
				ticket: id,
				user: ticket.creator
			}
		});

		if (creator) lines.push(`Ticket ${ticket.number}, created by ${client.cryptr.decrypt(creator.username)}#${creator.discriminator} at ${ticket.createdAt}\n`);

		if (ticket.closed_by) {
			const closer = await client.db.models.UserEntity.findOne({
				where: {
					ticket: id,
					user: ticket.closed_by
				}
			});

			if (closer) lines.push(`Closed by ${client.cryptr.decrypt(closer.username)}#${closer.discriminator} at ${ticket.updatedAt}\n`);
		}

		const messages = await client.db.models.Message.findAll({ where : { ticket: id } });

		for (const message of messages) {
			const user = await client.db.models.UserEntity.findOne({
				where: {
					ticket: id,
					user: message.author
				}
			});

			if (!user) continue;

			const timestamp = dtf.fill('YYYY-MM-DD HH:mm:ss', new Date(ticket.createdAt), true);
			const username = client.cryptr.decrypt(user.username);
			const display_name = client.cryptr.decrypt(user.display_name);
			const data = JSON.parse(client.cryptr.decrypt(message.data));
			let content = data.content ? data.content.replace(/\n/g, '\n\t') : '';
			data.attachments?.forEach(a => {
				content += '\n\t' + a.url;
			});
			data.embeds?.forEach(() => {
				content += '\n\t[embedded content]';
			});
			lines.push(`[${timestamp}] ${display_name} (${username}#${user.discriminator}) :> ${content}\n`);
		}


		const file_name = (category.name_format + '.txt')
			.replace(/{+\s?(user)?name\s?}+/gi, client.cryptr.decrypt(creator.display_name))
			.replace(/{+\s?num(ber)?\s?}+/gi, ticket.number);


		const attachment = new MessageAttachment(Buffer.from(lines.join('\n')), file_name);

		if (plugin.config.channels[guild.id]) {
			try {
				const log_channel = await client.channels.fetch(plugin.config.channels[guild.id]);
				await log_channel.send({
					embeds: [
						new MessageEmbed()
							.setColor(guild.colour)
							.setTitle(`Ticket ${ticket.number} closed by ${client.cryptr.decrypt(creator.username)}#${creator.discriminator}`)
					],
					files: [attachment]
				});
			} catch {
				client.log.warn('Failed to send text transcript to the guild\'s log channel');
			}
		}

		try {
			const user = await client.users.fetch(ticket.creator);
			user.send({ files: [attachment] });
		} catch {
			client.log.warn('Failed to send text transcript to the ticket creator');
		}

	}
};