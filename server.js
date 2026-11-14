/**
 * ============================================================
 *  Kasir RF Media — server.js untuk DEMO / GitHub (publik)
 * ============================================================
 *  - Trial 14 hari per instalasi (timer di SQLite lokal)
 *  - Secret & master key KHUSUS DEMO (bukan untuk toko produksi)
 *  - Jangan commit file: rf_media_database.sqlite (data asli)
 *
 *  Cara jalan:
 *    npm install express sqlite3 cors
 *    node server.js
 *    Buka http://localhost:3000
 *
 *  Generate kode demo (opsional):
 *    node server.js --gen-key DEMO-TOKO
 * ============================================================
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== KONFIGURASI DEMO (aman untuk repo publik) =====
const TRIAL_DAYS = 14;
// Secret DEMO — beda dari instalasi toko Anda. Boleh diganti di fork.
const LICENSE_SECRET = 'RF-MEDIA-DEMO-PUBLIC-NOT-FOR-PRODUCTION';
// Kode master DEMO saja (bukan kunci produksi toko).
// Pengguna demo tetap disarankan mencoba trial; aktivasi hanya untuk uji fitur full.
const MASTER_KEYS = ['RF-DEMO-MASTER'];

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname)));

const dbFile = path.join(__dirname, 'rf_media_database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error('Gagal koneksi database SQLite:', err.message);
    else console.log('📦 SQLite demo terhubung:', dbFile);
});

db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA busy_timeout = 5000');
    db.run(`CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
});

function dbGetAll() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM kv_store`, [], (err, rows) => {
            if (err) return reject(err);
            let dataObj = {};
            rows.forEach(row => {
                try { dataObj[row.key] = JSON.parse(row.value); }
                catch (e) { dataObj[row.key] = row.value; }
            });
            resolve(dataObj);
        });
    });
}

function dbSetKey(key, value) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)`,
            [key, JSON.stringify(value)],
            function (err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function mergeById(existingArr, incomingArr) {
    const map = new Map();
    (existingArr || []).forEach(item => {
        if (item && item.id != null) map.set(String(item.id), item);
        else map.set('__no_id_' + map.size, item);
    });
    (incomingArr || []).forEach(item => {
        if (item && item.id != null) map.set(String(item.id), item);
        else map.set('__no_id_' + map.size, item);
    });
    return Array.from(map.values());
}

const MERGE_ARRAY_KEYS = [
    'rf_riwayat_penjualan',
    'rf_daftar_pengeluaran'
];

const REPLACE_KEYS = [
    'rf_master_barang',
    'rf_daftar_user',
    'rf_config_toko',
    'rf_daftar_belanja',
    'rf_daftar_kategori',
    'rf_daftar_absensi',
    'rf_daftar_todolist'
];

function normalizeKey(key) {
    return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
}

function makeLicenseKey(shopCode) {
    const raw = LICENSE_SECRET + '|' + String(shopCode || 'LIFETIME').trim().toUpperCase();
    const hex = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 8).toUpperCase();
    return 'RF-' + hex;
}

function isValidLicenseKey(key, shopCode) {
    const k = normalizeKey(key);
    if (!k) return false;
    if (MASTER_KEYS.map(normalizeKey).includes(k)) return true;
    if (k === normalizeKey(makeLicenseKey('LIFETIME'))) return true;
    if (shopCode && k === normalizeKey(makeLicenseKey(shopCode))) return true;
    return false;
}

async function ensureLicenseRecord() {
    const all = await dbGetAll();
    let lic = all.rf_license;
    if (!lic || typeof lic !== 'object' || !lic.trialStartedAt) {
        lic = {
            trialStartedAt: Date.now(),
            licensed: false,
            licenseKey: null,
            shopCode: null,
            activatedAt: null
        };
        await dbSetKey('rf_license', lic);
    }
    return lic;
}

function buildLicenseStatus(lic) {
    if (lic && lic.licensed) {
        return {
            licensed: true,
            trial: false,
            expired: false,
            daysLeft: null,
            trialDays: TRIAL_DAYS,
            message: 'Lisensi aktif (demo)',
            activatedAt: lic.activatedAt || null,
            shopCode: lic.shopCode || null
        };
    }
    const started = (lic && lic.trialStartedAt) ? Number(lic.trialStartedAt) : Date.now();
    const msLeft = TRIAL_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - started);
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    const expired = msLeft <= 0;
    return {
        licensed: false,
        trial: true,
        expired,
        daysLeft,
        trialDays: TRIAL_DAYS,
        message: expired
            ? 'Masa trial demo berakhir. Aktivasi dengan kode demo atau hubungi penyedia.'
            : `Mode trial demo — sisa ${daysLeft} hari`,
        trialStartedAt: started
    };
}

async function getLicenseStatus() {
    const lic = await ensureLicenseRecord();
    return { lic, status: buildLicenseStatus(lic) };
}

app.get('/api/load-data', async (req, res) => {
    try {
        const dataObj = await dbGetAll();
        const { status } = await getLicenseStatus();
        dataObj._license = status;
        res.json(dataObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/license-status', async (req, res) => {
    try {
        const { status } = await getLicenseStatus();
        res.json({ success: true, ...status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/activate-license', async (req, res) => {
    try {
        const key = (req.body && req.body.key) || '';
        const shopCode = (req.body && req.body.shopCode) || '';
        if (!normalizeKey(key)) {
            return res.status(400).json({ success: false, error: 'Kode lisensi wajib diisi' });
        }
        if (!isValidLicenseKey(key, shopCode)) {
            return res.status(403).json({
                success: false,
                error: 'Kode lisensi tidak valid. Untuk demo: RF-DEMO-MASTER atau hubungi penyedia.'
            });
        }
        const prev = await ensureLicenseRecord();
        const lic = {
            trialStartedAt: prev.trialStartedAt,
            licensed: true,
            licenseKey: normalizeKey(key),
            shopCode: shopCode || null,
            activatedAt: Date.now()
        };
        await dbSetKey('rf_license', lic);
        const status = buildLicenseStatus(lic);
        res.json({ success: true, message: 'Lisensi demo berhasil diaktifkan', ...status });
    } catch (err) {
        console.error('activate-license error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/save-data', async (req, res) => {
    try {
        const { status } = await getLicenseStatus();
        if (status.expired && !status.licensed) {
            return res.status(403).json({
                success: false,
                error: 'TRIAL_EXPIRED',
                message: 'Masa trial demo berakhir. Data tidak disimpan ke server sampai lisensi diaktivasi.',
                _license: status
            });
        }

        const incoming = req.body || {};
        const existing = await dbGetAll();
        const merged = {};

        Object.keys(existing).forEach(k => { merged[k] = existing[k]; });

        for (const key of Object.keys(incoming)) {
            if (key === '_savedAt' || key === '_license' || key === 'rf_license') continue;

            if (MERGE_ARRAY_KEYS.includes(key)) {
                merged[key] = mergeById(existing[key] || [], incoming[key] || []);
            } else if (REPLACE_KEYS.includes(key)) {
                if (incoming[key] != null) merged[key] = incoming[key];
            } else {
                merged[key] = incoming[key];
            }
        }

        if (existing.rf_license) merged.rf_license = existing.rf_license;

        merged._savedAt = Date.now();

        for (const key of Object.keys(merged)) {
            await dbSetKey(key, merged[key]);
        }

        res.json({
            success: true,
            message: 'Data demo tersimpan',
            savedAt: merged._savedAt,
            _license: status,
            counts: {
                penjualan: (merged.rf_riwayat_penjualan || []).length,
                todo: (merged.rf_daftar_todolist || []).length,
                pengeluaran: (merged.rf_daftar_pengeluaran || []).length,
                absensi: (merged.rf_daftar_absensi || []).length,
                user: (merged.rf_daftar_user || []).length
            }
        });
    } catch (err) {
        console.error('save-data error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const { status } = await getLicenseStatus();
        res.json({
            ok: true,
            demo: true,
            time: new Date().toISOString(),
            license: status
        });
    } catch (err) {
        res.json({ ok: true, demo: true, time: new Date().toISOString() });
    }
});

if (process.argv[2] === '--gen-key') {
    const shop = process.argv[3] || 'LIFETIME';
    console.log('Kode lisensi DEMO untuk', shop, '=', makeLicenseKey(shop));
    console.log('Master key demo:', MASTER_KEYS[0] || '(tidak ada)');
    process.exit(0);
}

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Kasir RF Media DEMO — port', PORT);
    console.log('   Trial:', TRIAL_DAYS, 'hari | http://localhost:' + PORT);
    console.log('   Master key demo: RF-DEMO-MASTER');
    console.log('   Generate key: node server.js --gen-key NAMA-TOKO');
    console.log('   ⚠️  Jangan pakai file ini untuk toko produksi.');
});
