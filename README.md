
# Discord Tickets Transcripts

A simple plugin for Discord Tickets which adds ticket transcripts (with ticket close logging).
It's made for [Discord tickets bot](https://discordtickets.app/)

## Supported versions

This plugin has been tested on Discord Tickets versions:

- 3.1.x

It may not work on versions not listed above.

## Features

If `log_messages` is enabled, this plugin sends embed with ticket transcript to log channel and to ticket creator (optional).
Ticket transcrips can be sent as

### Commands

This plugin does not add any commands.

### Supported languages

Due to its simplicity, this plugin does not support localisation and is only available in a single language:

- English (Great Britain)

Feel free to fork it and translate it if you need.

## Installation

1. Run `npm i AnonDev-org/discord-tickets_transcripts --no-save`
2. Add `AnonDev-org.discord-tickets_transcripts` to the `plugins` array in your bot's config file (`./user/config.js`):
   ```js
   plugins: [
   	'AnonDev-org.discord-tickets_transcripts'
   ]
   ```
3. Add a new property to your config file:
   ```js
   module.exports = {
   	debug: false,
   	defaults: {
   		// ...
   	},
   	'AnonDev-org.discord-tickets_transcripts': {
   		channels: {
   			'<GUILD ID>': '<GUILD CHANNEL ID>'
   		},
   		type : "attachment", // attachment, hastebin or pastebin
   		send_to_user: false, // true or false
   	},
   	locale: 'en-GB',
   	// ...
   	update_notice: true
   };
   ```


## Config options

Check Installation for example how to configure the plugin, the available options are listed below.

| Name            | Instructions  | Type                                                                                                                                                                                     
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |  :-------------- |
| channels        | IDs of channels where do you want to send transcripts in the form of `'<GUILD ID>': '<GUILD CHANNEL ID>'`  |  Object, required |                                                                                 |
| type            | Type of transcripts, possible options are `attachment` (will upload it as attachment with the log embed), `hastebin` (will upload it to Hastebin server and add link in the log embed), `pastebin` (will upload it to Pastebin and add link in the log embed) | String, required |
| send_to_user    | Do you want to DM the user with the transcript (log embed) - `true` or `false`                                                                                                              | Boolean, required |
| disabled_servers        | Array of servers where you don't want to get and log transcripts, you can leave it blank - `[]` |Array, optional|
 hastebin_url | URL of your custom hastebin server (with protocol and without slash at the end), by default it's `https://hastebin.com`| String, optional |
 pastebin_api_key | Your Developer API key from https://pastebin.com/doc_api | String, required (when type is set to `pastebin`)|
 pastebin_raw_url | Return raw link of the paste uploaded to Pastebin (`true` by default) |  Boolean, optional |


## Updating plugin
It's really simple, just reinstall it using npm.

- Run `npm i AnonDev-org/discord-tickets_transcripts --no-save`


## Information

This is improved fork of [this](https://github.com/discord-tickets/text-transcripts) plugin.

Developed by [AnonDev](https://anon.is-a.dev)

If you need help you can open new modmail support thread on [Pinglik Support Server](https://go.anondev.ml/pinglik-support) and we will help you 😉

If you would like to support me:<br>

<a  href='https://ko-fi.com/J3J72WPRC'  target='__blank'><img  height='36'  style='border:0px;height:36px;'  src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2'  border='0'  alt='Buy Me a Coffee at ko-fi.com'  /></a>
