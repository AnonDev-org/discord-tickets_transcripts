# Discord Tickets: Text Transcripts

A simple plugin for Discord Tickets which adds basics text transcripts.

## Supported versions

This plugin has been tested on Discord Tickets versions:

- 3.0

It may not work on versions not listed above.

## Features

If `log_messages` is enabled, this plugin sends a text file to the ticket creator (and to a log channel if configured) when a ticket is closed.

### Commands

This plugin does not add any commands.

### Supported languages

Due to its simplicity, this plugin does not support localisation and is only available in a single language:

- English (Great Britain)

## Screenshots

![Screenshot of a text file](https://static.eartharoid.me/sharex/21/08/Code_7ZkF4zEEeA.png "Screenshot of a text file")

## Installation

1. Run `npm i github:discord-tickets/text-transcripts --no-save`
2. Add `dsctickets.text-transcripts` to the `plugins` array in your bot's config file (`./user/config.js`):
	```js
	plugins: [
		'dsctickets.text-transcripts'
	]
	``` 
3. Add a new property to your config file:
	```js
	module.exports = {
		debug: false,
		defaults: {
			// ...
		},
		'dsctickets.text-transcripts': {
			channels: {
				'<GUILD ID>': '<TEXT CHANNEL ID'
			}
		},
		locale: 'en-GB',
		// ...
		update_notice: true
	};
	```
## Configuration

## Support

This is an officially maintained plugin, so you can [get support here](https://github.com/discord-tickets/bot/#support).
