let mongo = require("./src/mongo")
let funcs = require("./src/functions")
let Eris = require("eris");
let config = require("./config")
let bot = new Eris.CommandClient(config.botToken,{},{prefix: "!"});
let DBL = require("dblapi.js");
//const dbl = new DBL(config.erisToken,bot);

let players = {}
let fishes = []
let activePlayers = {}

start()
async function start(){ //load all necessaries 
    try{
        await mongo.connect()
        let prefixes = await mongo.getGuildPrefixes()
        prefixes.forEach(server=>{
            bot.registerGuildPrefix(server.id,server.prefix)
        })
        players = await mongo.getPlayers() //insert into global object
        reactions = await funcs.getBuffers()
        fishes = await mongo.getFishes()
        let rods = funcs.generateRods(fishes)
        console.log('Loaded.',rods)
    }catch(err){
        console.log(err)
    }
}
//loniii
bot.registerCommand("prefix", async (message,parameter)=>{
    try{
        if(!parameter || parameter === [])return "```New prefix not defined```"
        else{
            bot.registerGuildPrefix(message.member.guild.id,parameter)
            await mongo.setGuildPrefix(message.member.guild.id,parameter)
            return "```Prefix changed to " + parameter + "```"
        }
    }catch(err){console.log}
},{caseInsensitive: true,aliases:['p'],guildOnly:true,requirements : {permissions:{"administrator": true}}});

bot.registerCommand("fish", async (message)=>{ //initialising fishing game
    try{    
        if(message.author.id in players){ //check if its new player
            if(message.author.id in activePlayers){ //check if its already fishing
                return "```You are already fishing!```"
            }else{ //when player starts fishing
                startFishing(message)
            }
        }else{ //new player in database
            players[message.author.id] = new funcs.Player(message.author.id,message.author.username) //add to players obj
            await mongo.setPlayer(players[message.author.id])
            startFishing(message)
        }
    }catch(err){console.log}
},{caseInsensitive: true,aliases:['f']})

async function startFishing(message){ //small gray box with big emoji and 3 reactions
    activePlayers[message.author.id] = config.secToReact
    let reactions = funcs.reactions()
    let embMSG = {embed:{title:'React with:',image:{url:"attachment://file.jpg"},thumbnail:{url:''}}}
    let reactionMSG = await message.channel.createMessage(embMSG,{file:reactions.correct.buffer,name:'file.jpg'}).catch()
    await Promise.all(reactions.set.map(async reaction => { // react with all reactions
        await reactionMSG.addReaction(reaction.emoji).catch()
    }));
    setTimeout(async ()=>{
        let reactArr = await reactionMSG.getReaction(reactions.correct.emoji).catch()
        let index = reactArr.findIndex(element=>element.id === message.author.id)
        if(index === -1){
            await reactionMSG.addReaction('🚫')
        }else{
            await reactionMSG.addReaction('✅')
            fish(false,message)
        }
    },config.secToReact * 1000)
}

async function fish(autofish,message){ //fishing
    let player = players[message.author.id]
    let fish = getFish(player.rod)
    if(!autofish){
        console.log(players[message.author.id])
    }
}

function getFish(rodLvl){
    let fishesInRange = fishes.filter(fish=> fish.length > ((0.8) + level) && fish.length < )
}

setInterval(()=>{
    for(let player in activePlayers){
        if(activePlayers[player] <= 0){
            delete activePlayers[player]
        }else{
            activePlayers[player] = activePlayers[player] - 2
        }
    }
},2000)

bot.connect();


