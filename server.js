let mongo = require("./src/mongo")
let funcs = require("./src/functions")
let Eris = require("eris");
let config = require("./config")
let bot = new Eris.CommandClient(config.botToken,{},{prefix: "!"});
let moment = require('moment');
let DBL = require("dblapi.js");
var fs = require('fs'); // only for avatar change
//const dbl = new DBL(config.erisToken,bot);

let players = []
let fishes = []
let longestFish;
let activePlayers = []

start()
async function start(){ //load all necessaries 
    try{
        await mongo.connect()
        let prefixes = await mongo.getGuildPrefixes()
        prefixes.forEach(server=>{
            bot.registerGuildPrefix(server.id,server.prefix)
        })
        players = await mongo.getPlayers() //insert into global array
        reactions = await funcs.getBuffers()
        fishes = await mongo.getFishes()
        let [lfsh] = fishes.sort((a,b)=> b.fishLength - a.fishLength)
        longestFish = lfsh;
        console.log('Loaded...')
    }catch(err){
        console.log(err)
        start()
    }
}

bot.registerCommand("prefix", async (message,parameter)=>{
    try{
        if(!parameter || parameter.length === 0 || parameter.length > 5){
            message.channel.createMessage("```New prefix not defined or its more then 5 characters long.```")
        }else{
            await mongo.setGuildPrefix(message.member.guild.id,parameter)
            bot.registerGuildPrefix(message.member.guild.id,parameter)
            message.channel.createMessage("```Prefix changed to " + parameter + "```")
        }
    }catch(err){
        console.log(err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(1,err)})
    }
},{caseInsensitive: true,guildOnly:true,requirements : {permissions:{"administrator": true}}});

bot.registerCommand("fish", async (message)=>{ //initialising fishing game
    try{    
        if(players.some(e=>e.id === message.author.id)){ //check if its new player
            if(activePlayers.some(e=>e.id === message.author.id)){ //check if its already fishing
                message.channel.createMessage("```You are already fishing!```")
            }else{ //when player starts fishing
                startFishing(message)
            }
        }else{ //new player in database
            let newPlayer = new funcs.Player(message.author.id,message.author.username)
            await mongo.setPlayer(newPlayer)
            players.push(newPlayer)
            startFishing(message)
        }
    }catch(err){
        console.log(err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(2,err)})
    }
},{caseInsensitive: true,aliases:['f']})

async function startFishing(message){ //small gray box with big emoji and 3 reactions
    try{
        let player = Object.assign({},players.find(e=>e.id === message.author.id))
        player.cooldown = new moment().add(config.secToReact,'s') // add cooldown end point
        activePlayers.push(player) // to prevent spamming !f
        let reactions = funcs.reactions()
        let embMSG = {embed:{title:'React with:',image:{url:"attachment://file.jpg"},thumbnail:{url:''}}}
        let reactionMSG = await message.channel.createMessage(embMSG,{file:reactions.correct.buffer,name:'file.jpg'})
        player.reactionMSG = reactionMSG;
        player.correctReaction = reactions.correct.emoji;
        await Promise.all(reactions.set.map(async reaction => { // react with all reactions
            await reactionMSG.addReaction(reaction.emoji).catch(console.log)
        }));
        activePlayers[activePlayers.find(e=>e.id === player.id)] = player //update player in array
    }catch(err){
        console.log(err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(3,err)})
    }
}

async function fish(activePlayer,channel){ //fishing
    try{
        let player = players[players.findIndex(e=>e.id === activePlayer.id)]
        let fishesInRange = fishes.filter(fish=> fish.fishLength >= ((0.8) * Math.floor(player.activeRod)) && fish.fishLength <= Math.floor(player.activeRod))
        let randomFish = fishesInRange[Math.floor(Math.random()*fishesInRange.length)]
        randomFish.fishLength = Math.floor(Math.random() * (randomFish.fishLength - randomFish.fishLength * 0.8)) + (randomFish.fishLength * 0.8) // set length to random length between 0.8 and max length
        player.trophy = player.trophy.fishLength >= randomFish.fishLength ? player.trophy : randomFish
        let reactions = funcs.reactions()
        let url = `https://www.fishbase.de/Summary/SpeciesSummary.php?genusname=${randomFish.name.split(' ')[0]}&speciesname=${randomFish.name.split(' ').slice(1).join('+')}`
        let embMSG = {embed:{title: randomFish.name,image:{url:randomFish.imgurl},thumbnail:{url:'attachment://file.jpg'}, color: '4780829',url, fields:[{
                        name:'__Length:__ ',
                        value: Math.floor(randomFish.fishLength*100)/100 + "cm",
                        inline:false
                    }],footer: { text: `Rod upgade: [${funcs.rodUpgradeBar(player.rod)}]` }
                }
            }
        if(!player.caught.includes(randomFish.id)){
            embMSG.embed.title += " (new)"
            player.caught.push(randomFish.id)
        }
        let reactionMSG = await channel.createMessage(embMSG,{file:reactions.correct.buffer,name:'file.jpg'})
        await Promise.all(reactions.set.map(async reaction => { // react with all reactions
            await reactionMSG.addReaction(reaction.emoji)
        }));
        activePlayer.reactionMSG = reactionMSG;
        activePlayer.correctReaction = reactions.correct.emoji;
        activePlayers[activePlayers.findIndex(e=>e.id === activePlayer.id)] = activePlayer
    }catch(err){
        let player = players[players.findIndex(e=>e.id === activePlayer.id)]
        let fishesInRange = fishes.filter(fish=> fish.fishLength >= ((0.8) * Math.floor(player.activeRod)) && fish.fishLength <= Math.floor(player.activeRod))
        console.log(err,'FIR',fishesInRange,'player',player)
        channel.createMessage("```Internal Error```").catch(err=>{console.log(4,err)})
    }
}

setInterval(()=>{ // for cooldowns
    let now = new moment()
    activePlayers.forEach(async (activePlayer)=>{
        try{
            if(activePlayer.cooldown.isBefore(now)){ // check if reaction time passed
                let reactArr = await activePlayer.reactionMSG.getReaction(activePlayer.correctReaction)
                let player = players[players.findIndex(e=>e.id === activePlayer.id)]
                if(reactArr.some(e=>e.id === activePlayer.id)){ // if correct answer by user
                    if(player.rod < Math.round(longestFish.fishLength)){ // didn't test
                        let upgradedRod = Number((player.rod + 0.1).toFixed(1))
                        player.activeRod = player.activeRod === player.rod ? upgradedRod : player.activeRod
                        player.rod = upgradedRod
                    }
                    activePlayers[activePlayers.indexOf(activePlayer)].cooldown = new moment().add(config.secToReact, 's')
                    activePlayer.reactionMSG.addReaction('✅')
                    fish(activePlayer,activePlayer.reactionMSG.channel)
                }else{
                    activePlayers.splice(activePlayers.indexOf(activePlayer),1) // remove from activePlayers array
                    mongo.setPlayer(player)
                    activePlayer.reactionMSG.addReaction('🚫')
                }
            }
        }catch(err){
            activePlayers.splice(activePlayers.indexOf(activePlayer),1)
            console.log(5,err)
        }
    })
},1000)

bot.registerCommand("setRod", async (message,parameter)=>{
    try{
        if(!parameter || parameter.length === 0 || !Number.isInteger(Number(parameter)) || parameter >= longestFish.fishLength || parameter <= 1){
            message.channel.createMessage("```Rod level not properly defined!```") 
        }
        else{
            let player = players[players.findIndex(e=>e.id === message.author.id)]
            if(player == null){
                message.channel.createMessage("```You are unactive player!```")
            }else{
                let param = Number(parseInt(parameter).toFixed(1))
                console.log(param)
                if(param <= player.rod){
                    player.activeRod = param
                    message.channel.createMessage("```Rod level changed.```")
                }else{
                    message.channel.createMessage("```Rod level is higher then your max!```")
                }
            }
        }
    }catch(err){
        console.log(err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(6,err)})
    }
},{caseInsensitive: true})

bot.registerCommand('profile', async (message)=>{
    try{
        let player = players[players.findIndex(e=>e.id === message.author.id)]
        if(player == null){
            message.channel.createMessage("```You are unactive player!```")
        }else{
            let embMSG = {embed:{title:message.author.username,thumbnail:{url:message.author.avatarURL},color:"16777215", fields: [
                {
                    name:'__Rod:__ ',
                    value: String('**Level**: ' + Math.floor(player.rod) + ' **active**: ' + Math.floor(player.activeRod)),
                    inline:false
                },
                {
                    name:'__Collection:__ ',
                    value: String('**Cought**: ' + player.caught.length + ' **of** ' + fishes.length),
                    inline:false
                },
                {
                    name:'__Trophy:__',
                    value:"**Name:** " + player.trophy.name +  " **Length**: " + Math.floor(player.trophy.fishLength*100)/100 + " cm",
                    inline:false
                }
            ],image:{url:player.trophy.imgurl}}}
            message.channel.createMessage(embMSG)
        }
    }catch(err){
        console.log(err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(7,err)})
    }
},{aliases:['p'],caseInsensitive: true})

bot.registerCommand("top", async (message,parameter)=>{
    try{
        if(parameter[0] !== undefined){
            if(parameter[0].toUpperCase() === "ROD"){
                let sorted = players.sort((a,b)=>b.rod - a.rod)
                let topRod = sorted.slice(0,10)
                let sstring = ""
                topRod.forEach((player,index)=>{
                    sstring += (index+1) + ". " + player.username + " : lvl " + Math.floor(player.rod) + "\n"
                })
                message.channel.createMessage("```css\n"+ sstring + "```")
            }else if(parameter[0].toUpperCase() === "COLLECTION"){
                let sorted = players.sort((a,b)=>b.caught.length - a.caught.length)
                let topCaught = sorted.slice(0,10)
                let sstring = ""
                topCaught.forEach((player,index)=>{
                    sstring += (index+1) + ". " + player.username + " : caught " + player.caught.length + "\n"
                })
                message.channel.createMessage("```css\n"+ sstring + "```")
            }else if(parameter[0].toUpperCase() === "TROPHY"){
                let sorted = players.sort((a,b)=>b.trophy.fishLength - a.trophy.fishLength)
                let topCaught = sorted.slice(0,10)
                let sstring = ""
                topCaught.forEach((player,index)=>{
                    sstring += (index+1) + ". " + player.username + " : name " + player.trophy.name + " length " + player.trophy.fishLength +  " cm \n"
                })
                message.channel.createMessage("```css\n"+ sstring + "```")
            }else{
                message.channel.createMessage('```Please specify lederboard (rod, collection) ex. !top rod```')
            }
        }else{
            message.channel.createMessage('```Please specify lederboard (rod, collection) ex. !top rod```')
        }
    }catch(err){
        console.log(81,err)
        message.channel.createMessage("```Internal Error```").catch(err=>{console.log(8,err)})
    }
},{caseInsensitive: true,aliases:['t']});

bot.unregisterCommand('help');
bot.registerCommand("help", (message)=>{
	message.channel.createMessage("```markdown\nReact on message to fish, rods are auto-upgraded\n" +
	"Compete with others for best collection\n" +
	"#______COMMANDS______#\n" + 
	"[!fish][to start fishing]\n" +
	"[!profile][player profile, rod level, collection]\n" +
    "[!top (rod,collection)][Leaderboards]\n" +
    "[!setrod (rod lvl)][change active rod lvl]\n" +
    "[!prefix][changing bot prefix for server(admins only)]\n" +
	"[!info][info and stats about bot]\n" +
    "[!invite][to invite bot to your discord server]\n" +
    "[!patreon][support developer <3]```").catch((err)=>{console.log(8,err)})
},{caseInsensitive: true});

bot.registerCommand("info", (message)=>{
	message.channel.createMessage("```css\n" +
	"\nFishes: " + fishes.length + 
	"\nLongest: " + longestFish.name + " (up to " + longestFish.fishLength +  "cm)" +
	"\nNumber of servers: " + bot.guilds.size + "```").catch((err)=>{console.log(9,err)})
},{caseInsensitive: true});

bot.registerCommand('invite', async (message)=>{
    message.channel.createMessage('https://discordapp.com/api/oauth2/authorize?client_id=342562300676407297&scope=bot&permissions=3072').catch(console.log)
},{caseInsensitive: true})

bot.registerCommand('patreon', async (message)=>{
    message.channel.createMessage('https://www.patreon.com/dedaDev').catch(console.log)
},{caseInsensitive: true})

bot.registerCommand('dedaloodak', async (message)=>{
    message.channel.createMessage(activePlayers.length).catch(console.log)
},{caseInsensitive: true})

bot.on("ready", () => {
    //var imageAsBase64 = fs.readFileSync('./avatar.png', 'base64');
    bot.editStatus('online',{name:'!help',type:3})
    //bot.editSelf({avatar : 'data:image/png;base64,' + imageAsBase64})
});
bot.on("error", (err) => {console.log('client on error:',err);});

bot.connect();