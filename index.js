const DTF = require("@eartharoid/dtf");
const dtf = new DTF();
const { MessageAttachment, MessageEmbed } = require("discord.js");
const axios = require("axios");
const url = require("url");
const moment = require("moment");

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
      checkUpdates(this.client)

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
        if (this.config.disabled_servers || [].contains(String(guild.id)))
          return this.client.log.warn(
            `Ignoring ticket #${ticket.number} close because transcripts are disabled for guild with ID ${guild.id}`
          );

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
        let tempMap = new Map();

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

        if (!this.config.disable_ascii) {
          lines.push(
            "  _____ _      _        _     _____                              _       _       \n |_   _(_) ___| | _____| |_  |_   _| __ __ _ _ __  ___  ___ _ __(_)_ __ | |_ ___ \n   | | | |/ __| |/ / _ \\ __|   | || '__/ _` | '_ \\/ __|/ __| '__| | '_ \\| __/ __|\n   | | | | (__|   <  __/ |_    | || | | (_| | | | \\__ \\ (__| |  | | |_) | |_\\__ \\\n   |_| |_|\\___|_|\\_\\___|\\__|   |_||_|  \\__,_|_| |_|___/\\___|_|  |_| .__/ \\__|___/\n                                                                  |_|            "
          );
        }

        lines.push(
          `Ticket Transcripts plugin v${
            require("./package.json").version
          } by AnonDev (https://anon.is-a.dev)\n-----------------------------------------------------------------------------------\nID: ${
            ticket.number
          } (#${channel_name})\nCategory: ${
            category.name || "?"
          }\nCreated (opened) by: ${this.client.cryptr.decrypt(
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
        let ticketClosedAt = dtf.fill(
          "DD.MM.YYYY HH:mm:ss",
          new Date(ticket.updatedAt),
          true
        );
        if (ticket.topic) {
          lines.push(`Topic: ${this.client.cryptr.decrypt(ticket.topic)}`);
        }
        lines.push(`Closed at: ${ticketClosedAt}`);
        if (closer) {
          lines.push(
            `Closed by: ${this.client.cryptr.decrypt(closer.username)}#${
              closer.discriminator
            } (${ticket.closed_by || "?"})`
          );
        }
        if (ticket.closed_reason) {
          lines.push(
            `Close reason: ${this.client.cryptr.decrypt(ticket.closed_reason)}`
          );
        }

        lines.push(
          `-----------------------------------------------------------------------------------`
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
          data.attachments?.forEach((a) => {
            content += "\n\t[attachment] " + a.url;
          });
          data.embeds?.forEach(() => {
            content += "\n\t[embedded content]";
          });
          lines.push(
            `${data.pinned ? "📌 " : ""}[${timestamp}] ${display_name} (${username}#${user.discriminator}): ${content} ${message.deleted ? "(deleted) " : ""}${message.edited ? "(edited) " : ""}`
          );
        }

        if (this.config.channels[guild.id]) {
          try {
            const g = await this.client.guilds.fetch(guild.id);
            const embed = new MessageEmbed()
              .setColor(guild.colour)
              .setTitle(`Ticket Closed`)
              .addField("ID", `\`${ticket.number}\` (#${channel_name})`, true)
              .addField("Category", `${category.name || "?"}`, true)
              .addField("Creator", `<@${ticket.creator}>`, true)
              .addField(
                "Created (opened) at",
                `<t:${moment(new Date(ticket.createdAt)).format("X")}:f>`,
                true
              )
              .setTimestamp()
              .setFooter(guild.footer, g.iconURL());


            if (ticket.topic) {
              embed.addField(
                "Topic",
                `\`${this.client.cryptr.decrypt(ticket.topic)}\``,
                true
              );
            }
            embed.addField(
              "Closed at",
              `<t:${moment(new Date(ticket.updatedAt)).format("X")}:f>`,
              true
            );

            if (closer) {
              embed.addField("Closed by", `<@${ticket.closed_by}>`, true);
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
            await tempMap.set("transcript2", { embeds: [embed] });

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
              tempMap.set("transcript", { embeds: [embed], files: [attachment] });
            }
            if (this.config.type && this.config.type == "hastebin") {
              const haste = await uploadToHastebin(
                lines.join("\n"),
                this.config.hastebin_url
                  ? this.config.hastebin_url
                  : "https://hastebin.com",
                "txt",
                this.config.transcript_raw_url || false
              ).catch((err) => {
                this.client.log.warn(
                  "Failed to upload ticket transcript to Hastebin"
                );
                this.client.log.error(err);
              });
              embed.addField(
                "Transcript",
                `*Uploaded to Hastebin* - [here](${haste})`,
                true
              );
               tempMap.set("transcript", { embeds: [embed] });
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
                `Ticket Transcript #${ticket.number}`,
                this.config.transcript_raw_url || false
              ).catch((err) => {
                this.client.log.warn(
                  "Failed to upload ticket transcript to Pastebin"
                );
                this.client.log.error(err);
              });
              embed.addField(
                "Transcript",
                `*Uploaded to Pastebin* [here](${paste})`,
                true
              );
               tempMap.set("transcript", { embeds: [embed] });
            }
            let transcript = tempMap.get("transcript") || null
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
              let transcript = tempMap.get("transcript") || null
              if (!transcript)
                return this.client.log.warn("Transcript object is missing in tempMap");
              if(!this.config.send_transcript_to_user || true) {
                let transcript2 = tempMap.get("transcript2")  || null
                if (!transcript2)
                return this.client.log.warn("Transcript2 (log embed without transcript) object is missing in tempMap");
                return user.send(transcript2);
              }
              return user.send(transcript);
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

    load() {}
  };

const uploadToHastebin = async (text, domain, format, raw_url) => {
  let response = await axios
    .post(`${domain}/documents`, text, {
      headers: { "Content-Type": "text/plain" },
    })
    .catch(function (error) {
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
  if (raw_url ? raw_url : null == true) return `${domain}/raw/${key}.${format ? format : "txt"}`;
  // this.client.log.info(`Uploaded transcript to hastebin server`, parsedURL)
  return parsedURL;
};

const uploadToPastebin = async (
  text,
  apikey,
  format,
  title,
  raw_url
) => {
  const params = new URLSearchParams();
  params.append("api_option", "paste");
  params.append("api_dev_key", apikey);
  params.append("api_paste_code", text);
  params.append("api_paste_private", 1);
  params.append("api_paste_name", title ? title : "Untitled Paste");
  params.append("api_paste_format", format);

  let response = await axios
    .post(`https://pastebin.com/api/api_post.php`, params, {})
    .catch(function (error) {
      if (error.response)
        throw new Error(
          `Could not POST to Pastebin (status: ${error.response.status}) - ${error.response.data}`
        );
      throw new Error(`Could not POST to Pastebin - ${error.message}`);
    });
  const key = await response.data;
  if (!key)
    throw new Error(`Response data is missing (status ${response.status})`);
  if (!key.includes("https://pastebin.com/"))
    throw new Error(
      `Response data is not valid Pastebin URL (${response.data})`
    );
  const parsedURL = key;
  // this.client.log.info(`Uploaded transcript to Pastebin`, parsedURL)
  if (raw_url ? raw_url : null == true)
    return `https://pastebin.com/raw/${parsedURL.split("/")[3]}`;
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


const checkUpdates = async (client) => {
  const boxen = require('boxen');
  const link = require('terminal-link');
  const semver = require('semver');
  const { format } = require('leekslazylogger');

  const json =  (await axios({
    method: "GET",
    url: 'https://api.github.com/repos/AnonDev-org/discord-tickets_transcripts/releases',
    responseType: "json"
  })).data;
  
  const { version: current } = require('./package.json');
	const update = json[0];
  const latest = semver.coerce(update.tag_name);
  if (!semver.valid(latest)) return;
  if (semver.lt(current, latest)) {
		client.log.notice(`There is an update available for Ticket Transcripts plugin by AnonDev (${current} -> ${update.tag_name})`);

		const lines = [
			`&k&6You are currently using &c${current}&6, the latest is &a${update.tag_name}&6.&r`,
			`&k&6Download "&f${update.name}&6" from&r`,
			link('&k&6the GitHub releases page.&r&6', 'https://github.com/AnonDev-org/discord-tickets_transcripts/releases/')
		];

		console.log(
			boxen(format(lines.join('\n')), {
				align: 'center',
				borderColor: 'yellow',
				borderStyle: 'round',
				margin: 1,
				padding: 1
			})
		);
	}

};


Array.prototype.contains = function (obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
};
