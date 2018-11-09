let config = require('../config')
let MongoClient = require('mongodb').MongoClient;

let url = config.mongoURL;

module.exports = {
    connect : function(){
        return new Promise(function(resolve,reject){
            MongoClient.connect(url,{ useNewUrlParser: true }, function(err, db) {
                if (err) reject(err);
                else{
                    let fishyDB = db.db("fishy");
                    prefixes = fishyDB.collection("prefixes");
                    players = fishyDB.collection("players");
                    fishes = fishyDB.collection("fishes");

                    fishes.find({}).toArray(function(err, res) {
                        if(err)reject(err)
                        else resolve(res)
                    });
                }
            });
        })
    },
    setGuildPrefix : function(id,prefix){
        return new Promise(function(resolve,reject){
            try{
                prefixes.updateOne({id}, {$set:{prefix}}, {upsert:true}, function(err,res){
                    if(err)reject(err)
                    else resolve(res)
                });
            }catch(err){console.log(err)}
        })
    },
    getGuildPrefixes : function(){
        return new Promise(function(resolve,reject){
            try{
                prefixes.find({},{projection: {_id: 0}}).toArray(function(err, res) {
                    if(err)reject(err)
                    else resolve(res)
                });
            }catch(err){console.log(err)}
        })
    },
    getFishes : function(){
        return new Promise(function(resolve,reject){
            try{
                fishes.find({},{projection: {_id: 0}}).toArray(function(err, res) {
                    if(err)reject(err)
                    else resolve(res)
                });
            }catch(err){console.log(err)}
        })
    },
    setPlayer : function(player){
        return new Promise(function(resolve,reject){
            try{
                players.updateOne({id:player.id}, {$set:player}, {upsert:true}, function(err,res){ //player is object
                    if(err)reject(err)
                    else resolve(res)
                });
            }catch(err){console.log(err)}
        })
    },
    setPlayers : function(players){ // expected array (not shure will it need us, not finished)
        return new Promise(function(resolve,reject){
            try{
                prefixes.update({_id : {$in: req.body[i].cars}}, 
                    {$set : {name : req.body[i].name}},
                    {multi : true});
            }catch(err){console.log(err)}
        })
    },
    getPlayers : function(){
        return new Promise(function(resolve,reject){
            try{
                players.find({},{projection: {_id: 0}}).toArray(function(err, res) {
                    if(err)reject(err)
                    else {
                        resolve(res)
                    }
                });
            }catch(err){console.log(err)}
        })
    }
}