const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const oracledb = require('oracledb');

const app = express();
const port = 3000;

app.use(bodyParser.json());

function generateTransactionId(length, store_code) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result + store_code;
}

// API endpoint for inputting expired goods data
app.post("/api/detail-item", async (req, res) => {
  console.log("/api/detail-item", req.body);

  const pool = new Pool({
    host: "10.21.9.44",
    port: 5555,
    user: "itapps",
    password: "itapps123",
    database: "item_expired",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const {
    gondala_number,
    item_code,
    item_name,
    status_item,
    expired_date,
    item_amount,
    icone_plane,
    create_by,
    update_by,
    store_code,
  } = req.body;

  let id_transaction = generateTransactionId(10, req.body.store_code); // Generate transaction ID

  const sql = `INSERT INTO detail_item.bebas_expired(gondala_number, id_transaction, item_code, item_name, status_item, expired_date, item_amount, icone_plane, create_date, create_by, update_date, update_by, store_code) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9, now(), $10, $11)`;

  const values = [
    gondala_number,
    id_transaction,
    item_code,
    item_name,
    status_item,
    expired_date,
    item_amount,
    icone_plane,
    create_by,
    update_by,
    store_code,
  ];

  try {
    const dbPgQuery = await pool.connect();
    await dbPgQuery.query(sql, values);
    dbPgQuery.release();
  } catch (err) {
    console.log(`error on insert mst_member err =, err`);
    return res.status(500).send({
      status: err,
      message: "Whoops, looks like something went wrong.",
      data: null,
    });
  }

  return res.status(200).send({
    status: "success",
    message: "Post data success.",
    data: null,
  });
});

// API endpoint to retrieve barcode data
app.post("/apiMobile/master-item", function (req, res){

  const oracledb = require('oracledb');
  const dbConfig = {
  user: 'triitmd',
  password: 'triitmd',
  connectString: 'db146.id007.trid-corp.net:1521/PRODDB2', // e.g., "localhost:1521/xe" for a local Oracle XE database
  };

  async function run() {
  let connection;
  try {
      // Get a connection from the default connection pool
      const connection = await oracledb.getConnection(dbConfig);

      // Execute a query
      const barcode = req.body.barcode;
      const storecode = req.body.storecode; 

      const result = await connection.execute(
        `SELECT a.itbbarcd, b.ITMEDESC, c.ITTSITCD, d.SITEDESC 
        FROM trisg.ITMBAR a 
        LEFT JOIN ITMGNL b ON a.itbitmid = b.ITMITMID 
        LEFT JOIN itmsit c ON c.ITTITMID = b.ITMITMID 
        LEFT JOIN SITGNL d ON d.SITSITCD = c.ITTSITCD
        WHERE a.itbbarcd = :barcode AND c.ittsitcd = :storecode`,
      { barcode, storecode },
      {outFormat: oracledb.OBJECT}
      );
      if(result.rows.length > 0){
          hasil = {
          // resultnya : result.rows[0]
          barcode : result.rows[0].ITBBARCD,
          item_desc : result.rows[0].ITMEDESC,
          storecode : result.rows[0].ITTSITCD,
          storename : result.rows[0].SITEDESC
          // bindParams = {param1: id};
          };
          resultJsonString = JSON.stringify(hasil);
          console.log(JSON.parse(resultJsonString));
          res.send(JSON.parse(resultJsonString))
          //return;
      }else{
          console.log("gak ada datanya coy");
          res.status(404).json({ message: "Data tidak ditemukan." });
      }
      // Log the result
      //console.log(result.rows.length);
  } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  } finally {
      // Release the connection
      if (connection) {
      try {
          await connection.close();
      } catch (error) {
          console.error('Error closing connection:', error);
      }
      }
  }
  }
  // Call the run function to execute the query
   run();
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});