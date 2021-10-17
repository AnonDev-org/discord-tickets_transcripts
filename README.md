# Discord Tickets Transcripts

A simple plugin for Discord Tickets which adds ticket transcript and ticket close logging.
It's made for [Discord tickets bot](https://discordtickets.app/)

## Supported versions

This plugin has been tested on Discord Tickets versions:

- 3.1.x

It may not work on versions not listed above.

## Features

If `log_messages` is enabled, this plugin sends embed with ticket transcript to log channel and to ticket creator (optional).

### Commands

This plugin does not add any commands.

### Supported languages

Due to its simplicity, this plugin does not support localisation and is only available in a single language:

- English (Great Britain)

## Screenshots

![Screenshot of a text file](https://static.eartharoid.me/sharex/21/08/Code_7ZkF4zEEeA.png "Screenshot of a text file")

## Installation

1. Run `npm i AnonDev-org.discord-tickets_text-transcripts --no-save`
2. Add `dsctickets.text-transcripts` to the `plugins` array in your bot's config file (`./user/config.js`):
	```js
	plugins: [
		'AnonDev-org.discord-tickets_text-transcripts'
	]
	``` 
3. Add a new property to your config file:
	```js
	module.exports = {
		debug: false,
		defaults: {
			// ...
		},
		'AnonDev-org.discord-tickets_text-transcripts': {
			channels: {
				'<GUILD ID>': '<TEXT CHANNEL ID'
			},
			type : "hastebin", // attachment or hastebin
			send_to_user: false, // true or false
			disabled_servers: [] // array of servers where you don't want to log transcripts
			
		},
		locale: 'en-GB',
		// ...
		update_notice: true
	};
	```

### Information

Improved fork of [this](https://github.com/discord-tickets/text-transcripts) plugin.
Developed by [AnonDev](https://anon.is-a.dev)

If you need help you can open new modmail support thread on [Pinglik Support Server](https://go.anondev.ml/pinglik-support) and we will help you 😉


If you would like to support me:<br>

<a  href='https://ko-fi.com/J3J72WPRC'  target='__blank'><img  height='36'  style='border:0px;height:36px;'  src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2'  border='0'  alt='Buy Me a Coffee at ko-fi.com'  /></a>
