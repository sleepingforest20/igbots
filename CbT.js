const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const S = require('string');
const inquirer = require('inquirer');
const request = require('request');
const Promise = require('bluebird');
const fs = require('fs');

const User = [
{
	type:'input',
	name:'username',
	message:' Username:',
	validate: function(value) {
		if(!value) return chalk`{bold.yellow Tidak boleh kosong!}`;
		return true;
	}
},
{
	type:'password',
	name:'password',
	message:' Password:',
	mask:'*',
	validate: function(value) {
		if(!value) return chalk`{bold.yellow Tidak boleh kosong!}`;
		return true;
	}
},
{
	type:'input',
	name:'sleep',
	message:' Delay(s):',
	validate: function(value) {
		value = value.match(/[0-9]/);
		if(value) return true;
		return chalk`{bold.yellow Hanya angka!}`;
	}
},
{
	type:'input',
	name:'mysyntx',
	message:' PostTime:',
	validate: function(value) {
		value = value.match(/[0-9]/);
		if(value) return true;
		return chalk`{bold.yellow Hanya angka!}`;
	}
},
{
	type:'input',
	name:'proxyUrl',
	message:' ProxyURL:'
}
]

const Login = async function(User) {
	const Device = new Client.Device(User.username);
	const Storage = new Client.CookieMemoryStorage();
	const session = new Client.Session(Device, Storage);
	try {
		await Client.Session.create(Device, Storage, User.username, User.password, User.proxyUrl)
		const account = await session.getAccount();
		return Promise.resolve({session, account});
	} catch(err) {
		return Promise.reject(err.name);
	}
}

const Target = async function(username) {
	const url = 'https://www.instagram.com/'+username+'/'
	const option = {
		url: url,
		method: 'GET'
	}
	try {
		const account = await rp(option);
		const data = S(account).between('<script type="text/javascript">window._sharedData = ', ';</script>').s
		const json = JSON.parse(data);
		if(json.entry_data.ProfilePage[0].graphql.user.is_private) {
			return Promise.reject('Target is private Account');
		} else {
			const id = json.entry_data.ProfilePage[0].graphql.user.id;
			const followers = json.entry_data.ProfilePage[0].graphql.user.edge_follow.count;
			return Promise.resolve({id, followers});
		}
	} catch(err) {
		// return Promise.reject(err.name);
		return console.log(err.name);
	}
}

async function ngeComment(session, id, text) {
	try {
		await Client.Comment.create(session, id, text);
		return true;
	} catch(e) {
		return false;
	}
}

async function ngeLike(session, id) {
	try {
		await Client.Like.create(session, id);
		return true;
	} catch(e) {
		return false;
	}
}

const Media = async function(session, id) {
	const Media = new Client.Feed.UserMedia(session, id);
	try {
		const Poto = [];
		var cursor;
		if(cursor) Media.setCursor(cursor);
		const getPoto = await Media.get();
		await Promise.all(getPoto.map(async(poto) => {
			Poto.push({
				ts:poto.taken_at,
				id:poto.id,
				link:poto.params.webLink,
				like:poto.params.hasLiked
			});
		}))
		cursor = await Media.getCursor()
		return Promise.resolve(Poto);
	} catch(err) {
		// return Promise.reject(err);
		return console.log(err.name);
	}
}

const CommentAndLike = async function(session, media, text) {
	try {
		if(media.like === true) {
			return chalk`{bold.blue Already Liked & Comment}`;
		}
		const task = [
			ngeComment(session, media.id, text),
			ngeLike(session, media.id)
		]
		const [Comment,Like] = await Promise.all(task);
		const printComment = Comment ? chalk`{green Comment}` : chalk`{red Comment}`;
		const printLike = Like ? chalk`{green Like}` : chalk`{red Like}`;
		return chalk`{bold.green ${printComment}, ${printLike} [${text}]}`;
	} catch(err) {
		return chalk`{bold.red Failed Like & Comment}`;
	}
}

const Excute = async function(User, Sleep, mysyntx) {
	var Uname = fs.readFileSync('uid.txt', 'utf8').split('|');
	try {
		console.log(chalk`\n{bold.cyan [•] Try to Login . . .}`);
		const doLogin = await Login(User);
		console.log(chalk`{bold.green [!] Login Succsess!}`);
		while(true) {
			for(let i = 0; i < Uname.length; i++) {
				var rUname = Uname[Math.floor(Math.random() * Uname.length)];
				console.log(chalk`{bold.blue \n[${i}] Try to get Media . . .}`);
				const getTarget = await Target(Uname[i]);
				var getMedia = await Media(doLogin.session, getTarget.id);
				console.log(chalk`{bold.green [${i}] Succsess to get Media from [${Uname[i]}] }`);
				getMedia = _.chunk(getMedia, 1);
				var timeNow = new Date();
				timeNow = `${timeNow.getHours()}:${timeNow.getMinutes()}:${timeNow.getSeconds()}`
				try {
				await Promise.all(getMedia[0].map(async(media) => {
					console.log(chalk`{yellow [${i}] {bold.cyan @${User.username}} Try to Comment ${media.id}.}`);
					var old = new Date(media.ts * 1000);
					var now = new Date();
					var diff = now - old;
					var detik = Math.round(diff / 1000);
					var menit = Math.round(detik / 60);
					if(menit < mysyntx) {
						var Text = fs.readFileSync("text.txt","utf-8").split("|");
						var ranText = Text[Math.floor(Math.random() * Text.length)];
						const ngeDo = await CommentAndLike(doLogin.session, media, ranText)
						console.log(chalk`[{magenta ${timeNow}}] {bold.green [>]} ${ngeDo}`);
					} else {
						console.log(chalk`{bold.yellow [!] Post more than ${mysyntx} minutes! }`);
					}
				}))
				} catch(e) {
					await delay(5000);
					console.log(chalk`{bold.red [!] Error. Please check your connection or instagram check point. }`);
				}
				await delay(1000);
			}
			console.log(chalk`{yellow \n[#][>] Delay for ${Sleep} Seconds [<][#]}`);
			await delay(Sleep * 1000);
		}
	} catch(err) {
		console.log(err.name);
	}
}

console.log(chalk`{bold.cyan
—————————————————— [{bold.magenta INSTA-TOOLS}] ————————————————————
[•] {bold.green Comment Target 'uid.txt'}
[•] {bold.green Require 'text.txt' to Comment}
—————————————————————————————————————————————————————
}`);

inquirer.prompt(User)
.then(answers => {
	Excute({
		username:answers.username,
		password:answers.password,
		proxyUrl:answers.proxyUrl
	},answers.sleep,answers.mysyntx);
})
