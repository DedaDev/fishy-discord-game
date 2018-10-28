let axios = require('axios')

let reactions = [{'emoji':'🐬','url':'https://twemoji.maxcdn.com/36x36/1f42c.png'},{'emoji':'🐳','url':'https://twemoji.maxcdn.com/36x36/1f433.png'},{'emoji':'🐠','url':'https://twemoji.maxcdn.com/36x36/1f420.png'},{'emoji':'🐙','url':'https://twemoji.maxcdn.com/36x36/1f419.png'},{'emoji':'🐋','url':'https://twemoji.maxcdn.com/36x36/1f40b.png'},{'emoji':'🐉','url':'https://twemoji.maxcdn.com/36x36/1f409.png'},{'emoji':'🐡','url':'https://twemoji.maxcdn.com/36x36/1f421.png'}];
let fishes;
let fishLengths = [] //needed for rods
let rods = []

module.exports = {
    Player : function(id, username) { //constructor
        this.id = id
        this.username = username;
        this.coins = 0;
        this.rod = 1;
        this.net = 0;
        this.rods = [1];
        this.nets = [];
        this.caught = [];
    },
    getBuffers : async function(){
        return new Promise(async (resolve,reject)=>{
            try{
                await Promise.all(reactions.map(async reaction => {
                    let buffer = await axios.get(reaction.url,{responseType: 'arraybuffer'}).catch(console.log)
                    reactions[reactions.indexOf(reaction)].buffer = buffer.data
                }));
                resolve(reactions)
            }catch(err){
                module.exports.getBuffers()
                reject(err)
            }
        })
    },
    reactions : function(){
        let random = reactions[Math.floor(Math.random()*reactions.length)]
        let set = [random] //all reactions

        //let newRandom = reactions[Math.floor(Math.random()*reactions.length)]
        while(set.length < 3){
            let newRandom = reactions[Math.floor(Math.random()*reactions.length)]
            if(newRandom != random){
                set.push(newRandom)
            }else{
                newRandom = reactions[Math.floor(Math.random()*reactions.length)]
            }
        }
        return {correct:random,set:shuffle(set)}
    },
    generateRods : function(fishesProp){ //that name cause of global var with same name
        return new Promise((resolve,reject)=>{
            fishes = fishesProp
            fishes.sort((a,b)=>{
                 return a.length - b.length
            })
            console.log(fishes[0],fishes[fishes.length-1])
            resolve(rods)
        })
    }
}

function shuffle(a) { //for shuffling array
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function Rod(max){ //constructor
    this.max = max;
    this.min = max - (max*0.2)
}