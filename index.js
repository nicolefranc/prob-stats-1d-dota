var axios = require('axios');
var converter = require('json-2-csv');
var fs = require('fs');
require('dotenv').config();

const url = 'https://api.opendota.com/api';
var config = {
  method: 'get',
  headers: { 
    'Authorization': `Bearer ${process.env.API_KEY}`, 
    'Cookie': '__cfduid=d9ce592503b0824fdf014b2f188b6550e1615347910'
  }
};

const getMatchIds = async () => {
    let matchIds = [];
    config.url = `${url}/parsedMatches`
    let response = await axios(config)
    let matches = response.data;
    matches.map(match => {
        matchIds = [...matchIds, match.match_id];
    })

    return matchIds;
}

const getGold = async (matchId) => {
    config.url = `${url}/matches/${matchId}`;
    let response = await axios(config)
    const duration = response.data.duration; // seconds
    const durationInMins = duration / 60;
    const players = response.data.players;
    const radiant = players.filter(player => player.isRadiant);
    const dire = players.filter(player => !player.isRadiant);
    let gold = {};

    // console.log(duration);
    let radiantNc = 0;
    let radiantTotal = 0;
    let direNc = 0;
    let direTotal = 0;
    let total = 0;

    radiant.map(rp => {
        if (rp.gold_reasons && rp.gold_reasons['14'])
            radiantNc += rp.gold_reasons['14'];
        let grValues = Object.values(rp.gold_reasons);
        grValues.map(goldReason => {
            radiantTotal += goldReason;
        })
    })

    dire.map(dp => {
        if (dp.gold_reasons && dp.gold_reasons['14'])
            direNc += dp.gold_reasons['14'];
        let grValues = Object.values(dp.gold_reasons);
        grValues.map(goldReason => {
            direTotal += goldReason;
        })
    })

    total = radiantTotal + direTotal;

    gold = {
        'Match ID': matchId,
        'Radiant\'s Total Gold from Neutral Camp': radiantNc,
        'Radiant\'s Total Gold': radiantTotal,
        'Dire\'s Total Gold from Neutral Camp': direNc,
        'Dire\'s Total Gold': direTotal,
        'Total Gold': total,
        'Duration in seconds': duration,
        'Duration in minutes': durationInMins,
        'Total Gold per minute': total / durationInMins,
        'Radiant\'s Gold per minute (Neutral Camp)': radiantNc / durationInMins,
        'Dire\'s Gold per minute (Neutral Camp)': direNc / durationInMins,
    }
    return gold;
}

const exportToJson = (data) => {
    fs.writeFileSync('./data.json', JSON.stringify(data));
}

const exportToCsv = (data) => {
    converter.json2csv(data, (err, csv) => {
        if (err) throw err;

        console.log(csv);
        fs.writeFileSync('dota.csv', csv);
    })
}

const main = async () => {
    let matchIds = await getMatchIds();

    let result = [];

    await Promise.all(
        matchIds.map(async (matchId) => {
            let gold = await getGold(matchId);
            result = [...result, gold];
            return result;
        })
    )

    console.log(result);
    // exportToJson(result);
    exportToCsv(result);
}

main();