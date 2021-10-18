const DTF = require("@eartharoid/dtf");
const dtf = new DTF();
const { MessageAttachment, MessageEmbed } = require("discord.js");
const fetch = require('node-fetch');
const url = require('url');

module.exports = (Plugin) =>
  class DemoPlugin extends Plugin {
    constructor(client, id) {
      super(client, id, {
        commands: [],
        name: "Ticket Transcripts",
      });
    }

    preload() {
      this.config = this.client.config[this.id];

      this.client.tickets.on("close", async (id) => {
        const ticket = await this.client.db.models.Ticket.findOne({
          where: { id },
        });
        if (!ticket) return;

        const category = await this.client.db.models.Category.findOne({
          where: { id: ticket.category },
        });
        if (!category) return;

        const guild = await this.client.db.models.Guild.findOne({
          where: { id: category.guild },
        });
        if (!guild) return;
        if(this.config.disabled_servers ||[].includes(guild.id)) return

        const creator = await this.client.db.models.UserEntity.findOne({
          where: {
            ticket: id,
            user: ticket.creator,
          },
        });
        if (!creator)
          return this.client.log.warn(
            `Can't create text transcript for ticket #${ticket.number} due to missing creator`
          );

        const lines = [];
        let closer;

        lines.push(
          `Ticket Transcript\n--------------------------------------------------------------------\nID: ${
            ticket.number
          }\nCreated (opened) by: ${this.client.cryptr.decrypt(
            creator.username
          )}#${creator.discriminator} (${
            ticket.creator || "?"
          })\nCreated (opened) at: ${ticket.createdAt}`
        );
        if (ticket.closed_by) {
          closer = await this.client.db.models.UserEntity.findOne({
            where: {
              ticket: id,
              user: ticket.closed_by,
            },
          });
        }

        if (closer)
          lines.push(
            `Closed by: ${this.client.cryptr.decrypt(closer.username)}#${
              closer.discriminator
            } (${ticket.closed_by || "?"})\nClosed at: ${ticket.updatedAt}`
          );
        if (ticket.topic)
          lines.push(`Topic: ${this.client.cryptr.decrypt(ticket.topic)}`);
        if (ticket.closed_reason)
          lines.push(
            `Close reason: ${this.client.cryptr.decrypt(
              ticket.closed_reason
            )}`
          );

        lines.push(
          `--------------------------------------------------------------------`
        );

        const messages = await this.client.db.models.Message.findAll({
          where: { ticket: id },
        });

        for (const message of messages) {
          const user = await this.client.db.models.UserEntity.findOne({
            where: {
              ticket: id,
              user: message.author,
            },
          });

          if (!user) continue;

          const timestamp = dtf.fill(
            "DD-MM-YYYY HH:mm:ss",
            new Date(ticket.createdAt),
            true
          );
          const username = this.client.cryptr.decrypt(user.username);
          const display_name = this.client.cryptr.decrypt(user.display_name);
          const data = JSON.parse(this.client.cryptr.decrypt(message.data));
          let content = data.content ? data.content.replace(/\n/g, "\n\t") : "";
          data.attachments?.forEach((a) => {
            content += "\n\t" + a.url;
          });
          data.embeds?.forEach(() => {
            content += "\n\t[embedded content]";
          });
          lines.push(
            `[${timestamp}] ${display_name} (${username}#${user.discriminator}): ${content}`
          );
        }

        const channel_name = category.name_format
          .replace(
            /{+\s?(user)?name\s?}+/gi,
            this.client.cryptr.decrypt(creator.display_name)
          )
          .replace(/{+\s?num(ber)?\s?}+/gi, ticket.number);

        if (this.config.channels[guild.id]) {
          try {
            const g = await this.client.guilds.fetch(guild.id);
            const embed = new MessageEmbed()
              .setColor(guild.colour)
              .setTitle(`Ticket Closed`)
              .addField("ID", `${ticket.number}`, true)
              .addField("Creator", `<@${ticket.creator}>`, true)
              .setTimestamp()
              .setFooter(guild.footer, g.iconURL());

            if (ticket.topic)
              embed.addField(
                "Topic",
                `\`${this.client.cryptr.decrypt(ticket.topic)}\``,
                true
              );
            if (closer)
              embed.addField("Closed by", `<@${ticket.closed_by}>`, true);
            if (ticket.closed_reason)
              embed.addField(
                "Close reason",
                `\`${this.client.cryptr.decrypt(ticket.closed_reason)}\``,
                true
              );

            const log_channel = await this.client.channels.fetch(
              this.config.channels[guild.id]
            );
            if(!log_channel) return
            let transcript;

            if (this.config.type && this.config.type == "attachment") {
              const attachment = new MessageAttachment(
                Buffer.from(lines.join("\n")),
                channel_name + ".txt"
              );
              embed.addField(
                "Transcript",
                "Uploaded as attachment below",
                true
              );
              transcript = { embeds: [embed], files: [attachment] };
            }
            if (this.config.type && this.config.type == "hastebin") {
              
              const haste = await uploadToHastebin(lines.join("\n"), this.config.hastebin_url ? this.config.hastebin_url : "https://hastebin.com", "txt").catch((err) => {
                this.client.log.warn(
                  "Failed to upload ticket transcript to hastebin"
                );
                this.client.log.error(err);
              });
              embed.addField("Transcript", `[here](${haste})`, true);
              transcript = { embeds: [embed] };
            }
            if (!transcript) return this.client.log.warn("Transcript object is missing");
            log_channel.send(transcript);
          } catch (error) {
            this.client.log.warn(
              "Failed to send ticket transcript to the guild's log channel"
            );
            this.client.log.error(error);
          }
        }

        if (this.config.send_to_user && this.config.send_to_user == true) {
          try {
            const user = await this.client.users.fetch(ticket.creator);
            if (!transcript)
              return this.client.log.warn("Transcript object is missing");
            user.send(transcript);
          } catch (error) {
            this.client.log.warn(
              "Failed to send ticket transcript to the ticket creator"
            );
            this.client.log.error(error);
          }
        }
      });
    }

    load() {}
  };



const uploadToHastebin = async (code, domain, format) => {
  const response = await fetch(`${domain}/documents`, {
    method: 'POST',
    body: code.toString()
  });

  if (response.ok) {
    const { key } = await response.json();
    const parsedURL = url.parse(`${domain}/${key}.${format ? format : "txt"}`);
    return parsedURL;
  } else {
    throw new Error(
      `Could not PORT to ${domain}/documents (status: ${
        response.status
      })`
    );
  }
};

