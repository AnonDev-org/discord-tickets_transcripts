const DTF = require("@eartharoid/dtf");
const dtf = new DTF();
const { MessageAttachment, MessageEmbed } = require("discord.js");
const axios = require("axios");
const url = require("url");

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
        if (this.config.disabled_servers || [].includes(guild.id)) return;

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
        let ticketCreatedAt = dtf.fill(
          "DD.MM.YYYY HH:mm:ss",
          new Date(ticket.createdAt),
          true
        );

        const channel_name = category.name_format
          .replace(
            /{+\s?(user)?name\s?}+/gi,
            this.client.cryptr.decrypt(creator.display_name)
          )
          .replace(/{+\s?num(ber)?\s?}+/gi, ticket.number);

        lines.push(
          `Ticket Transcript\n--------------------------------------------------------------------\nID: ${
          ticket.number
          } (${channel_name})\nCreated (opened) by: ${this.client.cryptr.decrypt(
            creator.username
          )}#${creator.discriminator} (${
          ticket.creator || "?"
          })\nCreated (opened) at: ${ticketCreatedAt}`
        );
        if (ticket.closed_by) {
          closer = await this.client.db.models.UserEntity.findOne({
            where: {
              ticket: id,
              user: ticket.closed_by,
            },
          });
        }

        if (closer) {
          let ticketClosedAt = dtf.fill(
            "DD.MM.YYYY HH:mm:ss",
            new Date(ticket.updatedAt),
            true
          );
          lines.push(
            `Closed by: ${this.client.cryptr.decrypt(closer.username)}#${
            closer.discriminator
            } (${ticket.closed_by || "?"})\nClosed at: ${ticketClosedAt}`
          );
        }
        if (ticket.topic) {
          lines.push(`Topic: ${this.client.cryptr.decrypt(ticket.topic)}`);
        }
        if (ticket.closed_reason) {
          lines.push(
            `Close reason: ${this.client.cryptr.decrypt(ticket.closed_reason)}`
          );
        }

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
            "DD.MM.YYYY HH:mm:ss",
            new Date(ticket.createdAt),
            true
          );
          const username = this.client.cryptr.decrypt(user.username);
          const display_name = this.client.cryptr.decrypt(user.display_name);
          const data = JSON.parse(this.client.cryptr.decrypt(message.data));
          let content = data.content ? data.content.replace(/\n/g, "\n\t") : "";
          data.attachments ?.forEach((a) => {
            content += "\n\t" + a.url;
          });
          data.embeds ?.forEach(() => {
            content += "\n\t[embedded content]";
          });
          lines.push(
            `[${timestamp}] ${display_name} (${username}#${user.discriminator}): ${content}`
          );
        }

        if (this.config.channels[guild.id]) {
          try {
            const g = await this.client.guilds.fetch(guild.id);
            const embed = new MessageEmbed()
              .setColor(guild.colour)
              .setTitle(`Ticket Closed`)
              .addField("ID", `${ticket.number} (${channel_name})`, true)
              .addField("Creator", `<@${ticket.creator}>`, true)
              .addField("Created (opened) at", `${ticketCreatedAt}`)
              .setTimestamp()
              .setFooter(guild.footer, g.iconURL());

            let transcript;

            if (ticket.topic) {
              embed.addField(
                "Topic",
                `\`${this.client.cryptr.decrypt(ticket.topic)}\``,
                true
              );
            }
            if (closer) {
              embed.addField("Closed by", `<@${ticket.closed_by}>`, true);]
            }
            if (ticket.closed_reason) {
              embed.addField(
                "Close reason",
                `\`${this.client.cryptr.decrypt(ticket.closed_reason)}\``,
                true
              );
            }

            const log_channel = await this.client.channels.fetch(
              this.config.channels[guild.id]
            );
            if (!log_channel) return;

            if (this.config.type && this.config.type == "attachment") {
              const attachment = new MessageAttachment(
                Buffer.from(lines.join("\n")),
                channel_name + ".txt"
              );
              embed.addField(
                "Transcript",
                "*Uploaded as attachment below*",
                true
              );
              transcript = { embeds: [embed], files: [attachment] };
            }
            if (this.config.type && this.config.type == "hastebin") {
              const haste = await uploadToHastebin(
                lines.join("\n"),
                this.config.hastebin_url
                  ? this.config.hastebin_url
                  : "https://hastebin.com",
                "txt"
              ).catch((err) => {
                this.client.log.warn(
                  "Failed to upload ticket transcript to Hastebin"
                );
                this.client.log.error(err);
              });
              embed.addField("Transcript", `*Hastebin* [here](${haste})`, true);
              transcript = { embeds: [embed] };
            }
            if (this.config.type && this.config.type == "pastebin") {
              if (!this.config.pastebin_api_key)
                return this.client.log.warn(
                  "You have not provided Pastebin API key so I can't upload ticket transcript to Pastebin"
                );
              const paste = await uploadToPastebin(
                lines.join("\n"),
                this.config.pastebin_api_key,
                "text",
                `Ticket Transcript #${ticket.number}`
              ).catch((err) => {
                this.client.log.warn(
                  "Failed to upload ticket transcript to Pastebin"
                );
                this.client.log.error(err);
              });
              embed.addField("Transcript", `*Pastebin* [here](${paste})`, true);
              transcript = { embeds: [embed] };
            }

            if (!transcript)
              return this.client.log.warn("Transcript object is missing");
            log_channel.send(transcript);
          } catch (error) {
            this.client.log.warn(
              "Failed to send ticket transcript to the guild's log channel"
            );
            this.client.log.error(error);
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
        }
      });
    }

    load() { }
  };

const uploadToHastebin = async (text, domain, format) => {
  let response = await axios
    .post(`${domain}/documents`, text, {
      headers: { "Content-Type": "text/plain" },
    })
    .catch(function(error) {
      if (error.response)
        throw new Error(
          `Could not POST to ${domain}/documents (status: ${error.response.status}) - ${error.response.data}`
        );
      throw new Error(
        `Could not POST to ${domain}/documents - ${error.message}`
      );
    });
  const { key } = await response.data;
  if (!key)
    throw new Error(
      `Key is missing in response object (status ${response.status})`
    );
  const parsedURL = `${domain}/${key}.${format ? format : "txt"}`;
  // this.client.log.info(`Uploaded transcript to hastebin server`, parsedURL)
  return parsedURL;
};

const uploadToPastebin = async (text, apikey, format, title) => {
  const params = new URLSearchParams();
  params.append("api_option", "paste");
  params.append("api_dev_key", apikey);
  params.append("api_paste_code", text);
  params.append("api_paste_private", 1);
  params.append("api_paste_name", title ? title : "Untitled Paste");
  params.append("api_paste_format", format);

  let response = await axios
    .post(`https://pastebin.com/api/api_post.php`, params, {})
    .catch(function(error) {
      if (error.response)
        throw new Error(
          `Could not POST to Pastebin (status: ${error.response.status}) - ${error.response.data}`
        );
      throw new Error(`Could not POST to Pastebin - ${error.message}`);
    });
  const key = await response.data;
  if (!key)
    throw new Error(`Response data is missing (status ${response.status})`);
  if (!isValidUrl(key))
    throw new Error(`Response data is not valid URL (${response.data})`);
  const parsedURL = key;
  // this.client.log.info(`Uploaded transcript to Pastebin`, parsedURL)
  return parsedURL;
};

const isValidUrl = (s, protocols) => {
  const { URL } = require("url");
  try {
    url = new URL(s);
    return protocols
      ? url.protocol
        ? protocols.map((x) => `${x.toLowerCase()}:`).includes(url.protocol)
        : false
      : true;
  } catch (err) {
    return false;
  }
};
