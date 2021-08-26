const fse = require('fs-extra');
const { join } = require('path');

module.exports = Plugin => class DemoPlugin extends Plugin {
	constructor(client, id) {
		super(client, id, {
			commands: [],
			name: 'Text Transcripts'
		});
	}

	preload() {
		this.config =  this.client.config[this.id];

		const scan = (path, array) => {
			const files = fse.readdirSync(path);
			array = array || [];
			files.forEach(file => {
				if (fse.statSync(`${path}/${file}`).isDirectory()) {
					array = scan(`${path}/${file}`, array);
				} else if (file.endsWith('.js')) {
					array.push(`${path}/${file}`);
				}
			});
			return array;
		}; // get an array of all the listener files (searches subdirectories)

		// load all of the listeners
		const listeners = scan(join(__dirname, 'listeners'));
		for (let listener of listeners) {
			listener = require(listener);
			const exec = (...args) => listener.execute(this, ...args);
			switch (listener.emitter.toLowerCase()) {
			case 'client':
				this.client.on(listener.event, exec);
				break;
			case 'client.tickets':
				this.client.tickets.on(listener.event, exec);
				break;
			}
		}
	}

	load() {}
};