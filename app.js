const express = require("express");
const path = require("path");

const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
// Connecting the server and database
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is up and running");
    });
  } catch (e) {
    console.log(`Db error ${e}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStatesSnakeCaseToCamelCase = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//API-1
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT * FROM state;
    `;
  const allStates = await db.all(getStatesQuery);
  response.send(
    allStates.map((eachState) => convertStatesSnakeCaseToCamelCase(eachState))
  );
});

//API-2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id=${stateId}
  `;
  const stateDetails = await db.get(getStateQuery);
  response.send(convertStatesSnakeCaseToCamelCase(stateDetails));
});

//API-3
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `
        INSERT INTO 
        district (district_name,state_id,cases,cured,active,deaths)
        VALUES 
        ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
    `;
  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//API-4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailsQuery = `
        SELECT * FROM district WHERE district_id=${districtId}`;
  const district = await db.get(getDistrictDetailsQuery);
  response.send({
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  });
});

// API-5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
        DELETE FROM
        district
        WHERE
        district_id = ${districtId};
    `;
  await db.run(deleteQuery);
  response.send("District Removed");
});

//API-6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
        UPDATE 
            district
        SET 
            district_name='${districtName}',
            state_id=${stateId},
            cases=${cases},
            cured=${cured},
            active=${active},
            deaths=${deaths}
        WHERE 
            district_id=${districtId};
    `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

const getStateStatesResponse = (dbObject) => {
  return {
    totalCases: dbObject["SUM(cases)"],
    totalCured: dbObject["SUM(cured)"],
    totalActive: dbObject["SUM(active)"],
    totalDeaths: dbObject["SUM(deaths)"],
  };
};

//API-7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE 
            state_id=${stateId}
    `;
  const stateStats = await db.get(getStatsQuery);
  response.send(getStateStatesResponse(stateStats));
});

//API-8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictName = `
        SELECT
            state_name
        FROM
            district
        NATURAL JOIN
            state
        WHERE 
            district_id=${districtId};
    `;
  const stateName = await db.get(getDistrictName);
  response.send({
    stateName: stateName.state_name,
  });
});

module.exports = app;
