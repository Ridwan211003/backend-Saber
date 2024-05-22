const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const oracledb = require('oracledb');
// const multer = require('multer');
const fs = require('fs');
const path = require('path');
// const moment = require('moment');
const axios = require('axios');
const https = require('https');
const FormData = require('form-data');
const formidableMiddleware = require('express-formidable');

const app = express();
const port = 3000;

// Maksimum ukuran file dalam byte (2 MB)
const maxFileSize = 2 * 1024 * 1024;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(formidableMiddleware());

app.post('/apiMobile/login', async (req, res) => {

  const axiosInstance = axios.create({
    proxy: {
      host: '10.35.0.7',
      port: 8080,
      auth: {
        username: 'salman_afarisyi', // if authentication is required
        password: 'xjdZIvyU1', // if authentication is required
      }
    }
  });

  const pool = new Pool({
    host: '10.21.9.44',
    database: 'minitools',
    user: 'itapps',
    password: 'itapps123',
    port: 5555,
  });

  const data = new FormData();
  data.append('username', 'xxxxxxxxxxx');
  data.append('passwd', '12345678');

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://hrms.transretail.co.id/aso/checklogin.php',
    headers: {
      ...data.getHeaders()
    },
    data: data
  };

  // Menggabungkan data dari API eksternal dengan hasil query dari database
  // const combinedResponse = {
  // apiData: apiResponse.data,
  // dbData: dbResult.rows.map(row => ({
  //   usp_store: row.usp_store,
  //   ms_code: row.ms_code,
  //   ms_name: row.ms_name
  // }))
  // };

  async function makeRequest() {
    try {
      const response = await axiosInstance.request(config);

      // console.log(response.data);
      const nik = response.data.user.nik

      const dbQuery = `
      SELECT usp_store, ms.ms_code, ms.ms_name
      FROM mobile_apps.user_store_priv usp
      JOIN mobile_apps.mst_store ms ON usp.usp_store = ms.ms_code
      WHERE usp_user = '${nik}'
      `;

      const dbResult = await pool.query(dbQuery);

      // console.log("ini querynya", dbQuery);
      // console.log("ini hasilnya", dbResult.rows);

      const combinedResponse = {
        apiData: response.data,
        dbData: dbResult.rows.map(row => ({
          usp_store: row.usp_store,
          ms_code: row.ms_code,
          ms_name: row.ms_name
        }))
      };

      // console.log("ini gabungan", combinedResponse);
      res.send(combinedResponse);
    }
    catch (error) {
      console.log(error);
    }
  }

  makeRequest();

});

// API untuk menginput barang
app.post("/apiMobile/save-item", async (req, res) => {
  console.log("/apiMobile/save-item", req.body);

  const pool = new Pool({
    host: "10.21.9.44",
    port: 5555,
    user: "itapps",
    password: "itapps123",
    database: "minitools",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const {
    ie_store_code,
    ie_gondola_no,
    ie_barcode,
    ie_item_code,
    ie_item_name,
    ie_item_status,
    ie_expired_date,
    ie_qty,
    ie_action,
    ie_insert_user,
    ie_update_user,
  } = req.body;

  // Format tanggal dan waktu saat ini
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split('T')[0];
  const formattedTime = currentDate.toTimeString().split(' ')[0];

  // Buat ie_id dengan format yang sesuai
  let ie_id = req.body.ie_store_code + formattedDate.replace(/-/g, '') + formattedTime.replace(/:/g, '');

  const sql = `INSERT INTO mobile_apps.item_expired(ie_id, ie_store_code, ie_gondola_no, ie_barcode, ie_item_code, ie_item_name, ie_item_status, ie_expired_date, ie_qty, ie_action, ie_insert_user, ie_insert_date, ie_update_user, ie_update_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12, now())`;

  const values = [
    ie_id,
    ie_store_code,
    ie_gondola_no,
    ie_barcode,
    ie_item_code,
    ie_item_name,
    ie_item_status,
    ie_expired_date,
    ie_qty,
    ie_action,
    ie_insert_user,
    ie_update_user,
  ];

  try {
    const dbPgQuery = await pool.connect();
    await dbPgQuery.query(sql, values);
    dbPgQuery.release();
  } catch (err) {
    console.log("Error occurred while inserting data into bebas_expired table:", err);
    return res.status(500).send({
      status: "error",
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

// API untuk mengambil data barcode
app.post("/apiMobile/master-item", function (req, res) {

  const oracledb = require('oracledb');
  const dbConfig = {
    user: 'triitmd',
    password: 'triitmd',
    connectString: 'db146.id007.trid-corp.net:1521/PRODDB2',
  };

  async function run() {
    let connection;
    try {
      const connection = await oracledb.getConnection(dbConfig);

      const barcode = req.body.barcode;
      const storecode = req.body.storecode;

      const result = await connection.execute(
        `SELECT a.itbbarcd, b.ITMEDESC, c.ITTSITCD, d.SITEDESC, b.ITMITMCD AS ITEM_CODE , CASE WHEN b.ITMRETURN = '0' THEN 'N' ELSE 'Y' END AS REFUNABLE
        FROM trisg.ITMBAR a 
        LEFT JOIN ITMGNL b ON a.itbitmid = b.ITMITMID 
        LEFT JOIN itmsit c ON c.ITTITMID = b.ITMITMID 
        LEFT JOIN SITGNL d ON d.SITSITCD = c.ITTSITCD
        WHERE a.itbbarcd = :barcode AND c.ittsitcd = :storecode`,
        { barcode, storecode },
        { outFormat: oracledb.OBJECT }
      );
      if (result.rows.length > 0) {
        hasil = {
          // resultnya : result.rows[0]
          barcode: result.rows[0].ITBBARCD,
          item_code: result.rows[0].ITEM_CODE,
          item_desc: result.rows[0].ITMEDESC,
          storecode: result.rows[0].ITTSITCD,
          storename: result.rows[0].SITEDESC,
          refunable: result.rows[0].REFUNABLE
          // bindParams = {param1: id};
        };
        resultJsonString = JSON.stringify(hasil);
        console.log(JSON.parse(resultJsonString));
        res.send(JSON.parse(resultJsonString))
        //return;
      } else {
        console.log("gak ada datanya coy");
        res.status(404).json({ message: "Data tidak ditemukan." });
      }
      //console.log(result.rows.length);
    } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error('Error closing connection:', error);
        }
      }
    }
  }
  run();
});

// API untuk menampilkan data yang expired <= 3 bulan
app.get('/apiMobile/list-expired', async (req, res) => {

  const pool = new Pool({
    host: '10.21.9.44',
    user: 'itapps',
    password: 'itapps123',
    database: 'minitools',
    port: 5555,
  });

  try {
    const result = await pool.query(
      `SELECT age(ie_expired_date, current_date) as expiry_period, 
              a.*, 
              TO_CHAR(ie_expired_date, 'YYYY-MM-DD') as formatted_expired_date
      FROM mobile_apps.item_expired a
      WHERE ie_action = '1' 
      AND age(ie_expired_date, current_date) <= '3 mons'
      ORDER BY ie_expired_date ASC`
    );

    const expiredData = result.rows.map(row => {
      const expiryPeriod = row.expiry_period;
      const remainingDays = Math.floor((new Date(row.ie_expired_date) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        remaining_days: remainingDays,
        ie_id: row.ie_id,
        ie_store_code: row.ie_store_code,
        ie_gondola_no: row.ie_gondola_no,
        ie_barcode: row.ie_barcode,
        ie_item_code: row.ie_item_code,
        ie_item_name: row.ie_item_name,
        ie_item_status: row.ie_item_status,
        ie_expired_date: row.formatted_expired_date, // Using the formatted column
        ie_qty: row.ie_qty,
        ie_action: row.ie_action,
        ie_insert_user: row.ie_insert_user,
        ie_insert_date: row.ie_insert_date,
        ie_update_user: row.ie_update_user,
        ie_update_date: row.ie_update_date
      };
    });

    console.log('Data has been successfully retrieved :', expiredData);

    res.json(expiredData);
  } catch (error) {
    console.error('There is an error :', error);
    res.status(500).json({ error: 'An error occurred when retrieving data on goods that were nearing their expiration date' });
  }
});

// API untuk dashboard harian
app.get('/apiMobile/dashboard-didata', async (req, res) => {
  const pool = new Pool({
    host: '10.21.9.44',
    user: 'itapps',
    password: 'itapps123',
    database: 'minitools',
    port: 5555,
  });

  try {
    const listedTodayQuery = `
          SELECT COUNT(*) AS item_listed_today
          FROM mobile_apps.item_expired
          WHERE ie_action = '1'
          AND DATE(ie_insert_date) = CURRENT_DATE;
      `;
    const listedTotalQuery = `
          SELECT COUNT(*) AS total_items_listed
          FROM mobile_apps.item_expired
          WHERE ie_action = '1';
      `;
    const withdrawnTodayQuery = `
          SELECT COUNT(*) AS item_withdrawn_today
          FROM mobile_apps.item_expired
          WHERE ie_action = '2'
          AND DATE(ie_update_date) = CURRENT_DATE;
      `;
    const withdrwanTotalQuery = `
          SELECT COUNT(*) AS total_items_withdrawn
          FROM mobile_apps.item_expired
          WHERE ie_action = '2';
      `;

    const listedTodayResult = await pool.query(listedTodayQuery);
    const listedTotalResult = await pool.query(listedTotalQuery);
    const withdrawnTodayResult = await pool.query(withdrawnTodayQuery);
    const withdrawnTotalResult = await pool.query(withdrwanTotalQuery);

    const itemListedToday = listedTodayResult.rows[0].item_listed_today;
    const totalItemListed = listedTotalResult.rows[0].total_items_listed;
    const itemWithdrawnToday = withdrawnTodayResult.rows[0].item_withdrawn_today;
    const totalItemWithdrawn = withdrawnTotalResult.rows[0].total_items_withdrawn;

    const dashboardData = {
      data_listed: {
        item_listed_today: itemListedToday,
        total_items_listed: totalItemListed,
      },
      data_withdrawn: {
        item_withdrawn_today: itemWithdrawnToday,
        total_items_withdrawn: totalItemWithdrawn,
      },
    };

    console.log('Dashboard Data :', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API untuk dashboard data yang menuju expired <= 3 bulan
app.get('/apiMobile/dashboard-expiringSoon', async (req, res) => {
  const pool = new Pool({
    host: '10.21.9.44',
    user: 'itapps',
    password: 'itapps123',
    database: 'minitools',
    port: 5555,
  });

  try {
    const nearestExpirationQuery = `
          SELECT COUNT(*) AS total_item_nearing_expiration
          FROM mobile_apps.item_expired
          WHERE ie_action = '1'
          AND ie_expired_date <= CURRENT_DATE + INTERVAL '3 months';
      `;
    const closestItemsQuery = `
          SELECT *,
          ie_expired_date - CURRENT_DATE AS remaining_days,
          TO_CHAR(ie_expired_date, 'YYYY-MM-DD') AS closest_item_expired_date  -- Ganti alias menjadi closest_item_expired_date
          FROM mobile_apps.item_expired
          WHERE ie_action = '1'
          AND ie_expired_date <= CURRENT_DATE + INTERVAL '3 months'
          ORDER BY ie_expired_date  -- Menggunakan kolom tanpa alias
          LIMIT 10;
      `;
    const closestExpirationQuery = `
          SELECT TO_CHAR(ie_expired_date, 'YYYY-MM-DD') AS nearest_expiration_date
          FROM mobile_apps.item_expired
          WHERE ie_action = '1'
          AND ie_expired_date <= CURRENT_DATE + INTERVAL '3 months'
          ORDER BY ie_expired_date  -- Menggunakan kolom tanpa alias
          LIMIT 1;
      `;

    const nearestExpirationResult = await pool.query(nearestExpirationQuery);
    const totalItemNearingExpiration = nearestExpirationResult.rows[0].total_item_nearing_expiration;

    const closestItemsResult = await pool.query(closestItemsQuery);
    const closestItems = closestItemsResult.rows.map(item => {
      return {
        remaining_days: item.remaining_days,
        ...item,
      };
    });

    const closestExpirationResult = await pool.query(closestExpirationQuery);
    const nearestExpirationDate = closestExpirationResult.rows[0].nearest_expiration_date;

    const dashboardData = {
      total_item_nearing_expiration: totalItemNearingExpiration,
      nearest_expiration_date: nearestExpirationDate,
      closest_items: closestItems
    };

    console.log('Data dashboard for expiring soon :', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Terjadi kesalahan :', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API untuk mengupload foto item yang akan ditarik
app.post('/apiMobile/upload-photo', async (req, res) => {
  console.log('Incoming request body:', req.fields);
  console.log('Incoming files:', req.files);

  try {
    const { ie_id, ie_update_user, ie_qty_pull } = req.fields;

    const qtyPull = parseInt(ie_qty_pull);
    if (isNaN(qtyPull)) {
      return res.status(400).json({ message: 'Invalid ie_qty_pull value.' });
    }

    const file = req.files.image;
    
    if (file.size > maxFileSize) {
      return res.status(400).json({ message: 'File size exceeds the limit of 2 MB.' });
    }

    const extname = path.extname(file.name);
    const fileName = `${ie_id}${extname}`;
    const imagePath = `uploads/${fileName}`;

    fs.copyFileSync(file.path, imagePath);

    await simpanInformasiGambar(fileName, file.type, file.size, imagePath, ie_id, ie_update_user, qtyPull);

    return res.status(200).json({ message: 'File uploaded successfully.' });
  } catch (error) {
    console.error('Error while processing request:', error);
    return res.status(500).json({ message: 'An error occurred while processing the request.' });
  }
});

async function simpanInformasiGambar(imageUrl, mimetype, size, path, ie_id, ie_update_user, ie_qty_pull) {
  const pool = new Pool({
    host: '10.21.9.44',
    user: 'itapps',
    password: 'itapps123',
    database: 'minitools',
    port: 5555,
  });

  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE mobile_apps.item_expired SET ie_update_user = $1, ie_update_date = NOW(), ie_action = 2, ie_image_path = $2, ie_qty_pull = $3 WHERE ie_id = $4',
      [ie_update_user, path, ie_qty_pull, ie_id]
    );
    console.log('Query results:', result.rowCount, 'row updated.');
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});