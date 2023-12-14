const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Get Players API
app.get('/players/', async (request, response) => {
  const getPlayersQuery = `
        SELECT *
        FROM player_details;
    `
  const playersList = await db.all(getPlayersQuery)

  const dbResponse = playersList => {
    return {
      playerId: playersList.player_id,
      playerName: playersList.player_name,
    }
  }

  response.send(playersList.map(eachPlayer => dbResponse(eachPlayer)))
})

// Get Player API
app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT * 
    FROM player_details
    WHERE player_id = ${playerId};
  `

  const player = await db.get(getPlayerQuery)
  const dbResponse = {
    playerId: player.player_id,
    playerName: player.player_name,
  }

  response.send(dbResponse)
})

// Update Player API
app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const playerDetails = request.body

  const {playerName} = playerDetails
  const updatePlayerQuery = `
    UPDATE player_details
    SET player_name="${playerName}"
    WHERE player_id = ${playerId};
  `

  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

// Get Match API
app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `
    SELECT * 
    FROM match_details
    WHERE match_id = ${matchId};
  `

  const match = await db.get(getMatchQuery)
  const dbResponse = {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  }

  response.send(dbResponse)
})

//Get Player Matches API
app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getPlayerMatchQuery = `
    SELECT match_details.match_id AS matchId,
            match_details.match,
            match_details.year
    FROM player_match_score NATURAL JOIN match_details
    WHERE player_id = ${playerId};
  `

  const getPlayerMatchQueryResponse = await db.all(getPlayerMatchQuery)
  const playerMatch = getPlayerMatchQueryResponse => {
    return {
      matchId: getPlayerMatchQueryResponse.matchId,
      match: getPlayerMatchQueryResponse.match,
      year: getPlayerMatchQueryResponse.year,
    }
  }

  response.send(
    getPlayerMatchQueryResponse.map(eachMatch => playerMatch(eachMatch)),
  )
})

// Get Match Player API
app.get('/matches/:matchId/players/', async (request, response) => {
  const {matchId} = request.params
  const getMatchPlayerQuery = `
    SELECT player_details.player_id AS playerId,
            player_details.player_name AS playerName
    FROM player_match_score NATURAL JOIN player_details
    WHERE match_id = ${matchId};
  `

  const getMatchPlayerQueryResponse = await db.all(getMatchPlayerQuery)

  const matchPlayer = getMatchPlayerQueryResponse => {
    return {
      playerId: getMatchPlayerQueryResponse.playerId,
      playerName: getMatchPlayerQueryResponse.playerName,
    }
  }

  response.send(
    getMatchPlayerQueryResponse.map(eachPlayer => matchPlayer(eachPlayer)),
  )
})

// Get Player Scored API
app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getPlayerScored = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes
    FROM player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
  `

  const getPlayerScoredResponse = await db.get(getPlayerScored)
  const playerScored = {
    playerId: getPlayerScoredResponse.playerId,
    playerName: getPlayerScoredResponse.playerName,
    totalScore: getPlayerScoredResponse.totalScore,
    totalFours: getPlayerScoredResponse.totalFours,
    totalSixes: getPlayerScoredResponse.totalSixes,
  }

  response.send(playerScored)
})

module.exports = app
