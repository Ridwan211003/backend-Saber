// const express = require("express");
// const bodyParser = require("body-parser");
// const { Pool } = require("pg");
// const multer = require('multer');
// const path = require('path');
// const axios = require('axios');
// const FormData = require('form-data');
// const fs = require('fs');

// const app = express();
// const port = 3000;

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); // Menentukan lokasi penyimpanan file
//   },
//   filename: function (req, file, cb) {
//     const ie_id = req.body.ie_id;
//     const extname = path.extname(file.originalname);
//     const fileName = ie_id + extname;
//     cb(null, fileName);
//   }
// });

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 2 * 1024 * 1024 // Batasan ukuran file (2MB)
//   }
// }).single('image');

// app.use(bodyParser.json());

// // API untuk mengupload foto item yang akan ditarik
// app.post('/apiMobile/upload-photo', async (req, res) => {
//   try {
//     upload(req, res, async (err) => {
//       if (err) {
//         // Penanganan kesalahan upload
//         console.error('Error uploading file:', err);
//         if (err instanceof multer.MulterError) {
//           return res.status(400).json({ message: 'Ukuran file terlalu besar, maksimal 2MB.' });
//         } else {
//           return res.status(500).json({ message: 'Terjadi kesalahan saat mengunggah file.' });
//         }
//       } 
      
//       if (!req.file) {
//         // Penanganan jika file tidak ditemukan
//         return res.status(400).json({ message: 'File tidak ditemukan.' });
//       }

//       const { filename, mimetype, size } = req.file;
//       console.log('File uploaded successfully:', filename);

//       try {
//         const { ie_id, ie_store_code, ie_barcode, ie_update_user } = req.body;
//         const imagePath = 'uploads/' + ie_id + path.extname(filename); // Path berdasarkan ie_id
//         // Memanggil fungsi simpanInformasiGambar setelah pengunggahan berhasil
//         await simpanInformasiGambar(filename, mimetype, size, imagePath, ie_id, ie_store_code, ie_barcode, ie_update_user);
        
//         // Panggil fungsi untuk mengirim permintaan dengan form-data
//         await sendRequestWithFormData(ie_id, filename, ie_store_code, ie_barcode, ie_update_user); // Menggunakan ie_id untuk mengirim permintaan

//         return res.status(200).json({ message: 'File uploaded successfully.' });
//       } catch (error) {
//         console.error('Error while saving image information to database:', error);
//         return res.status(500).json({ message: 'An error occurred while saving image information to database.' });
//       }
//     });
//   } catch (err) {
//     console.error('Error:', err);
//     return res.status(500).json({ message: 'An error occurred while uploading file.' });
//   }
// });  

// async function simpanInformasiGambar(imageUrl, mimetype, size, path, ie_id, ie_store_code, ie_barcode, ie_update_user) {
//   const pool = new Pool({
//     host: '10.21.9.44',
//     user: 'itapps',
//     password: 'itapps123',
//     database: 'minitools',
//     port: 5555,
//   });

//   const client = await pool.connect();
//   try {
//     await client.query(
//       'UPDATE mobile_apps.item_expired SET ie_update_user = $1, ie_update_date = now(), ie_action = 2, ie_image_path = $2 WHERE ie_id = $3', 
//       [ie_update_user, path, ie_id]
//     );
//   } catch (error) {
//     console.error('Error executing query:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// // Fungsi untuk mengirim permintaan menggunakan axios dengan form-data
// async function sendRequestWithFormData(ie_id, filename, ie_store_code, ie_barcode, ie_update_user) {
//   let data = new FormData();
//   const imageStream = fs.createReadStream('uploads/' + filename);
//   data.append('image', imageStream);
//   data.append('ie_id', ie_id);
//   data.append('ie_store_code', ie_store_code);
//   data.append('ie_barcode', ie_barcode);
//   data.append('ie_update_user', ie_update_user);

//   try {
//     const response = await axios.post('http://10.21.9.44/apiMobile/upload-photo', data, {
//       headers: {
//         ...data.getHeaders(),
//       },
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity,
//     });
//     console.log(JSON.stringify(response.data));
//   } catch (error) {
//     console.error(error);
//   }
// }

// app.listen(port, () => {
//   console.log(`Server berjalan di http://localhost:${port}`);
// });

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Menentukan lokasi penyimpanan file
  },
  filename: function (req, file, cb) {
    const ie_id = req.body.ie_id;
    const extname = path.extname(file.originalname);
    const fileName = `${ie_id}${extname}`; // Format nama file: "ie_id".jpg
    cb(null, fileName);
    console.log("ie_id: ", ie_id);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // Batasan ukuran file (2MB)
  }
});

// Middleware untuk menghandle parsing body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API untuk mengupload foto item
app.post('/apiMobile/upload-photo', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      // Penanganan jika file tidak ditemukan
      return res.status(400).json({ message: 'File tidak ditemukan.' });
    }

    const { filename, mimetype, size } = req.file;
    console.log('File uploaded successfully:', filename);

    try {
      const { ie_id, ie_store_code, ie_barcode, ie_update_user } = req.body;
      const imagePath = 'uploads/' + ie_id + path.extname(filename); // Path berdasarkan ie_id

      // Memanggil fungsi untuk menyimpan informasi gambar ke database
      await simpanInformasiGambar(filename, mimetype, size, imagePath, ie_id, ie_store_code, ie_barcode, ie_update_user);

      return res.status(200).json({ message: 'File uploaded successfully.' });
    } catch (error) {
      console.error('Error while saving image information to database:', error);
      return res.status(500).json({ message: 'An error occurred while saving image information to database.' });
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    return res.status(500).json({ message: 'An error occurred while uploading file.' });
  }
});

async function simpanInformasiGambar(imageUrl, mimetype, size, path, ie_id, ie_store_code, ie_barcode, ie_update_user) {
  const pool = new Pool({
    host: '10.21.9.44',
    user: 'itapps',
    password: 'itapps123',
    database: 'minitools',
    port: 5555,
  });

  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE mobile_apps.item_expired SET ie_update_user = $1, ie_update_date = now(), ie_action = 2, ie_image_path = $2 WHERE ie_id = $3',
      [ie_update_user, path, ie_id]
    );
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    client.release();
  }
}

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
